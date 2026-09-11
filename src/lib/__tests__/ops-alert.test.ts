/**
 * DR-4 follow-up (Session 146 cont.).
 *
 * sendOpsAlert() is the only *active* (not just Sentry-passive) human
 * notification mechanism in the codebase — extracted from health-watchdog's
 * private sendAlert() so the download route's per-document build-failure
 * alert (and any future route needing to page a human in real time) can
 * reuse it. global.fetch is mocked in every test: RESEND_API_KEY is set in
 * .env.local, which next/jest loads into the test environment, so an
 * unmocked call here would send a real email to OPS_ALERT_EMAIL.
 */
import { sendOpsAlert } from '../ops-alert';
import { captureApiError } from '../capture-error';

jest.mock('../capture-error');
const mockCaptureApiError = captureApiError as jest.MockedFunction<typeof captureApiError>;

describe('sendOpsAlert (DR-4 follow-up active alerting)', () => {
  const originalEnv = { ...process.env };
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSpy = jest.spyOn(global, 'fetch' as never) as unknown as jest.SpyInstance;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fetchSpy.mockRestore();
  });

  it('sends a real, awaited request to Resend when RESEND_API_KEY is configured', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.OPS_ALERT_EMAIL = 'ops-test@example.com';
    fetchSpy.mockResolvedValue({ ok: true } as Response);

    await sendOpsAlert('Test subject', 'Test body');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test-key');

    const body = JSON.parse(init.body);
    expect(body.to).toBe('ops-test@example.com');
    expect(body.subject).toBe('Test subject');
    expect(body.html).toContain('Test body');
  });

  it('falls back to console logging without sending when RESEND_API_KEY is unset — never silently drops the alert', async () => {
    delete process.env.RESEND_API_KEY;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await sendOpsAlert('Test subject', 'Test body');

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Test subject'));
    consoleSpy.mockRestore();
  });

  it('captures the error (for later debugging) when Resend responds with a non-ok status', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    fetchSpy.mockResolvedValue({ ok: false, status: 429 } as Response);

    await sendOpsAlert('Test subject', 'Test body');

    expect(mockCaptureApiError).toHaveBeenCalledTimes(1);
    expect(mockCaptureApiError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((mockCaptureApiError.mock.calls[0][0] as Error).message).toContain('429');
  });

  it('captures the error (for later debugging) when the Resend request throws', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    fetchSpy.mockRejectedValue(new Error('network unreachable'));

    await sendOpsAlert('Test subject', 'Test body');

    expect(mockCaptureApiError).toHaveBeenCalledTimes(1);
    expect((mockCaptureApiError.mock.calls[0][0] as Error).message).toBe('network unreachable');
  });
});
