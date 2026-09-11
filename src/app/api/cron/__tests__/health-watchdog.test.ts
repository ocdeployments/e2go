import { NextRequest } from 'next/server';

// DR-3 (Gap G-06): the watchdog moved from a daily 'running'-only sweep to a
// 10-minute cadence that also reaps stale 'queued' jobs (a job that never got
// its /run call is the same permanently-locked case, just missed by the old
// filter), and now raises a Sentry event — not a console.log — whenever the
// reaped job belongs to a paying client. These tests drive the GET handler
// directly (createClient and Sentry are mocked; there's no DI seam here).

const mockCaptureMessage = jest.fn();
jest.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  captureException: jest.fn(),
}));

const mockCreateClient = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

type Row = Record<string, unknown>;

function fakeSupabase(opts: {
  stuckJobs?: Row[];
  paidUserIds?: Set<string>;
}) {
  const jobUpdates: Array<{ id: string; status: string }> = [];
  const stuckQuery: { statuses?: string[] } = {};

  const client = {
    from(table: string) {
      if (table === 'cron_log') {
        return {
          insert: () => ({
            select: () => ({
              single: async () => ({ data: { id: 'log-1' }, error: null }),
            }),
          }),
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        };
      }
      if (table === 'document_generation_jobs') {
        return {
          select: () => ({
            in: (_col: string, statuses: string[]) => {
              stuckQuery.statuses = statuses;
              return {
                lt: async () => ({ data: opts.stuckJobs ?? [], error: null }),
              };
            },
          }),
          update: (fields: Row) => ({
            eq: async (_col: string, id: string) => {
              jobUpdates.push({ id, status: fields.status as string });
              return { error: null };
            },
          }),
        };
      }
      if (table === 'payments') {
        return {
          select: () => ({
            eq: (_col: string, userId: string) => ({
              eq: async () => ({
                count: opts.paidUserIds?.has(userId) ? 1 : 0,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`fakeSupabase: unexpected table "${table}"`);
    },
  };

  return { client, jobUpdates, stuckQuery };
}

function fakeRequest(): NextRequest {
  return {
    headers: { get: (name: string) => (name === 'authorization' ? 'Bearer cron-secret-test' : null) },
  } as unknown as NextRequest;
}

describe('health-watchdog GET (DR-3 / Gap G-06)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = 'cron-secret-test';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-dummy';
    delete process.env.RESEND_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
  });

  it('reaps a stale "running" job, marking it failed', async () => {
    const { GET } = await import('../health-watchdog/route');
    const { client, jobUpdates } = fakeSupabase({
      stuckJobs: [{ id: 'job-1', application_id: 'app-1', user_id: 'user-1', status: 'running' }],
    });
    mockCreateClient.mockReturnValue(client);

    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.stuck_jobs_failed).toBe(1);
    expect(jobUpdates).toEqual([{ id: 'job-1', status: 'failed' }]);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('reaps a stale "queued" job, marking it failed', async () => {
    const { GET } = await import('../health-watchdog/route');
    const { client, jobUpdates, stuckQuery } = fakeSupabase({
      stuckJobs: [{ id: 'job-2', application_id: 'app-2', user_id: 'user-2', status: 'queued' }],
    });
    mockCreateClient.mockReturnValue(client);

    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(body.stuck_jobs_failed).toBe(1);
    expect(jobUpdates).toEqual([{ id: 'job-2', status: 'failed' }]);
    // the reap set must cover both statuses — a queued job that never got
    // its /run call is the exact case a 'running'-only filter would miss.
    expect(stuckQuery.statuses).toEqual(['running', 'queued']);
  });

  it('leaves jobs untouched when the staleness query returns none', async () => {
    const { GET } = await import('../health-watchdog/route');
    const { client, jobUpdates } = fakeSupabase({ stuckJobs: [] });
    mockCreateClient.mockReturnValue(client);

    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(body.stuck_jobs_failed).toBe(0);
    expect(jobUpdates).toEqual([]);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('fires a Sentry capture naming the job and application when a paid client is reaped', async () => {
    const { GET } = await import('../health-watchdog/route');
    const { client } = fakeSupabase({
      stuckJobs: [{ id: 'job-3', application_id: 'app-3', user_id: 'user-3', status: 'queued' }],
      paidUserIds: new Set(['user-3']),
    });
    mockCreateClient.mockReturnValue(client);

    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(body.paid_client_reaps).toEqual(['job-3']);
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining("paid client's stuck generation job"),
      expect.objectContaining({
        level: 'warning',
        extra: { jobId: 'job-3', applicationId: 'app-3', wasStatus: 'queued' },
      })
    );
  });

  it('does not fire a Sentry capture when the reaped job belongs to an unpaid user', async () => {
    const { GET } = await import('../health-watchdog/route');
    const { client } = fakeSupabase({
      stuckJobs: [{ id: 'job-4', application_id: 'app-4', user_id: 'user-4', status: 'running' }],
      paidUserIds: new Set(['user-3']),
    });
    mockCreateClient.mockReturnValue(client);

    const res = await GET(fakeRequest());
    const body = await res.json();

    expect(body.paid_client_reaps).toEqual([]);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });
});
