/**
 * DR-1 (Gap G-01) + DR-7 (Gap G-05), one shared test file per the sprint doc.
 *
 * DR-1: a scheduled invocation picks up any generation job whose updated_at
 * has gone stale and resumes it, writing exactly one telemetry row recording
 * the outcome — this is what lets a rising resume-failure rate be caught from
 * a query instead of by reading server logs (Decision 2, Session 146).
 *
 * DR-7: the resume only works if the already-approved-document lookup is
 * scoped to the application, not the job — /start mints a new job_id on every
 * retry, so a job_id-scoped lookup always sees zero approved docs on retry.
 */
import fs from 'fs';
import path from 'path';
import { isStaleForResume, resumeStaleJob, STALE_RESUME_MS } from '../generation-resume';

const mockRunGenerationPipeline = jest.fn();
jest.mock('../generation-engine', () => ({
  runGenerationPipeline: (...args: unknown[]) => mockRunGenerationPipeline(...args),
}));

jest.mock('../capture-error', () => ({
  captureApiError: jest.fn(),
}));

type CannedResponse = { data?: unknown; error?: unknown; count?: number | null };

function makeSupabaseMock(responsesByTable: Record<string, CannedResponse[]>) {
  const callIndex: Record<string, number> = {};
  const insertCalls: Record<string, unknown[]> = {};
  const updateCalls: Record<string, unknown[]> = {};

  const from = jest.fn((table: string) => {
    const queue = responsesByTable[table] ?? [];
    const idx = callIndex[table] ?? 0;
    callIndex[table] = idx + 1;
    const response: CannedResponse = queue[idx] ?? { data: null, error: null, count: null };

    const builder: Record<string, unknown> = {
      select: jest.fn(() => builder),
      insert: jest.fn((payload: unknown) => {
        (insertCalls[table] ??= []).push(payload);
        return Promise.resolve(response);
      }),
      update: jest.fn((payload: unknown) => {
        (updateCalls[table] ??= []).push(payload);
        return builder;
      }),
      eq: jest.fn(() => builder),
      in: jest.fn(() => builder),
      lt: jest.fn(() => builder),
      order: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      maybeSingle: jest.fn(() => Promise.resolve(response)),
      single: jest.fn(() => Promise.resolve(response)),
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject),
    };
    return builder;
  });

  return { from, insertCalls, updateCalls };
}

/** Flush the microtask queue so a fire-and-forget .then()/.catch() settles. */
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

const BASE_JOB = {
  id: 'job-1',
  application_id: 'app-1',
  user_id: 'user-1',
  status: 'running',
  updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
};

beforeEach(() => {
  mockRunGenerationPipeline.mockReset();
});

describe('isStaleForResume', () => {
  it('treats a running job untouched past the resume window as stale', () => {
    const staleAgo = new Date(Date.now() - (STALE_RESUME_MS + 60_000)).toISOString();
    expect(isStaleForResume('running', staleAgo)).toBe(true);
  });

  it('treats a queued job untouched past the resume window as stale', () => {
    const staleAgo = new Date(Date.now() - (STALE_RESUME_MS + 60_000)).toISOString();
    expect(isStaleForResume('queued', staleAgo)).toBe(true);
  });

  it('leaves a fresh running job alone', () => {
    const justNow = new Date(Date.now() - 30_000).toISOString();
    expect(isStaleForResume('running', justNow)).toBe(false);
  });

  it('never treats a terminal status as resumable, regardless of age', () => {
    const longAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(isStaleForResume('completed', longAgo)).toBe(false);
    expect(isStaleForResume('failed', longAgo)).toBe(false);
  });
});

describe('resumeStaleJob', () => {
  it('picks up a stale job, regenerates only the un-approved documents, and writes one resumed_to_completion row', async () => {
    const { from, insertCalls } = makeSupabaseMock({
      document_generation_jobs: [
        { data: { id: BASE_JOB.id }, error: null }, // claim succeeds
        { data: { status: 'completed' }, error: null }, // post-pipeline status check
      ],
      generated_documents: [
        { count: 12, error: null }, // approved at pickup
        { count: 20, error: null }, // total documents for the application
      ],
      generation_resume_log: [{ error: null }],
    });

    mockRunGenerationPipeline.mockResolvedValue(undefined);

    const result = await resumeStaleJob({ from } as never, BASE_JOB);
    expect(result.claimed).toBe(true);

    await flush();

    expect(mockRunGenerationPipeline).toHaveBeenCalledWith(
      BASE_JOB.application_id,
      BASE_JOB.user_id,
      BASE_JOB.id,
      expect.any(Function)
    );

    expect(insertCalls.generation_resume_log).toHaveLength(1);
    expect(insertCalls.generation_resume_log[0]).toMatchObject({
      job_id: BASE_JOB.id,
      application_id: BASE_JOB.application_id,
      approved_count: 12,
      regenerated_count: 8,
      outcome: 'resumed_to_completion',
    });
  });

  it('does not claim a job that another invocation already claimed (updated_at moved under it)', async () => {
    const { from } = makeSupabaseMock({
      document_generation_jobs: [
        { data: null, error: null }, // maybeSingle() returns null — claim lost the race
      ],
    });

    const result = await resumeStaleJob({ from } as never, BASE_JOB);

    expect(result.claimed).toBe(false);
    expect(mockRunGenerationPipeline).not.toHaveBeenCalled();
  });

  it('writes a resume_error telemetry row and marks the job failed when the pipeline throws', async () => {
    const { from, insertCalls, updateCalls } = makeSupabaseMock({
      document_generation_jobs: [
        { data: { id: BASE_JOB.id }, error: null }, // claim succeeds
        { data: null, error: null }, // the failed-status update
      ],
      generated_documents: [
        { count: 5, error: null },
        { count: 20, error: null },
      ],
      generation_resume_log: [{ error: null }],
    });

    mockRunGenerationPipeline.mockRejectedValue(new Error('Anthropic 529'));

    const result = await resumeStaleJob({ from } as never, BASE_JOB);
    expect(result.claimed).toBe(true);

    await flush();

    expect(mockRunGenerationPipeline).toHaveBeenCalledTimes(1);
    expect(insertCalls.generation_resume_log).toHaveLength(1);
    expect(insertCalls.generation_resume_log[0]).toMatchObject({
      outcome: 'resume_error',
      error_message: 'Anthropic 529',
    });
    expect(updateCalls.document_generation_jobs).toContainEqual(
      expect.objectContaining({ status: 'failed', error_message: 'Anthropic 529' })
    );
  });
});

describe('DR-7 — resume set scoped to application_id, not job_id', () => {
  function readEngineSource(): string {
    return fs.readFileSync(
      path.join(process.cwd(), 'src/lib/generation-engine.ts'),
      'utf8'
    );
  }

  it('scopes the already-approved-document lookup to application_id', () => {
    const src = readEngineSource();
    const match = src.match(
      /existingApproved[\s\S]{0,20}=\s*await supabase[\s\S]{0,300}/
    );
    expect(match).not.toBeNull();
    const snippet = match![0];
    expect(snippet).toMatch(/\.eq\(\s*['"]application_id['"]\s*,\s*applicationId\s*\)/);
    expect(snippet).not.toMatch(/\.eq\(\s*['"]job_id['"]\s*,\s*jobId\s*\)/);
  });
});
