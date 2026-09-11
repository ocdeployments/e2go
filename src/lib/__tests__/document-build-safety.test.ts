/**
 * DR-4 follow-up (Session 146 cont.).
 *
 * generate/download/[applicationId]/route.ts used to let a single malformed
 * document throw straight through the tab loop into the route's one
 * top-level catch, failing the ENTIRE ZIP with a generic 500 and no
 * indication of which document or why — and the only notification was
 * Sentry, which nobody watches live. This file exercises the fix directly:
 * buildDocumentSafely() (the isolation boundary — each document's
 * buildDocument()+Packer.toBuffer() call is now wrapped so one failure
 * can't take down the rest of the package), buildFailureNoteText() (the
 * honest in-ZIP explanation), and alertDocumentBuildFailures() (the active
 * paging mechanism, as opposed to Sentry-only capture).
 *
 * alertDocumentBuildFailures() calls sendOpsAlert(), which — when
 * RESEND_API_KEY is set (it is, in .env.local, which next/jest loads into
 * the test environment) — sends a REAL email via Resend. @/lib/ops-alert is
 * mocked in every test here so no test ever fires a real send.
 */
import {
  buildDocumentSafely,
  buildFailureNoteText,
  alertDocumentBuildFailures,
  type DocumentBuildFailure,
} from '../document-build-safety';
import { buildDocument } from '@/lib/docx-builder';
import { Packer } from 'docx';
import { sendOpsAlert } from '@/lib/ops-alert';
import { captureApiError } from '@/lib/capture-error';

jest.mock('@/lib/docx-builder');
jest.mock('@/lib/ops-alert');
jest.mock('@/lib/capture-error');

const mockBuildDocument = buildDocument as jest.MockedFunction<typeof buildDocument>;
const mockSendOpsAlert = sendOpsAlert as jest.MockedFunction<typeof sendOpsAlert>;
const mockCaptureApiError = captureApiError as jest.MockedFunction<typeof captureApiError>;

describe('buildDocumentSafely (DR-4 follow-up isolation boundary)', () => {
  const baseArgs = {
    contentText: 'Representative generated content.',
    lastName: 'Applicant',
    caseCode: 'TEST-0001',
    personCode: 'P1',
    applicationId: 'app-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ok:true with a real buffer when build succeeds', async () => {
    mockBuildDocument.mockReturnValue({} as ReturnType<typeof buildDocument>);
    const toBufferSpy = jest
      .spyOn(Packer, 'toBuffer')
      .mockResolvedValueOnce(Buffer.from([1, 2, 3]));

    const result = await buildDocumentSafely({ ...baseArgs, documentType: 'cover_letter' });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    }
    expect(mockCaptureApiError).not.toHaveBeenCalled();
    toBufferSpy.mockRestore();
  });

  it('catches a synchronous throw from buildDocument() instead of letting it propagate', async () => {
    mockBuildDocument.mockImplementation(() => {
      throw new Error('malformed content_text: unterminated bracket');
    });

    const result = await buildDocumentSafely({ ...baseArgs, documentType: 'business_plan' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.documentType).toBe('business_plan');
      expect(result.failure.error).toContain('unterminated bracket');
      expect(result.failure.label).toBeTruthy();
    }
    expect(mockCaptureApiError).toHaveBeenCalledTimes(1);
    expect(mockCaptureApiError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ route: 'generate/download', stage: 'build-document', documentType: 'business_plan' })
    );
  });

  it('catches an async rejection from Packer.toBuffer() — the bug caught and fixed during implementation', async () => {
    // buildDocument() succeeds (no synchronous throw); the failure comes
    // from the async Packer.toBuffer() call. An earlier draft of
    // buildDocumentSafely was non-async and only caught synchronous
    // throws, so a rejection here would have become an unhandled
    // rejection instead of a clean ok:false result.
    mockBuildDocument.mockReturnValue({} as ReturnType<typeof buildDocument>);
    const toBufferSpy = jest
      .spyOn(Packer, 'toBuffer')
      .mockRejectedValueOnce(new Error('docx packer: corrupt run'));

    const result = await buildDocumentSafely({ ...baseArgs, documentType: 'declaration_principal' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.error).toContain('corrupt run');
    }
    toBufferSpy.mockRestore();
  });

  it('isolates failures — one failing document does not affect a sibling call that succeeds', async () => {
    mockBuildDocument.mockImplementation((args) => {
      if (args.documentType === 'business_plan') {
        throw new Error('simulated build failure');
      }
      return {} as ReturnType<typeof buildDocument>;
    });
    const toBufferSpy = jest
      .spyOn(Packer, 'toBuffer')
      .mockResolvedValueOnce(Buffer.from([1, 2, 3]));

    const [failing, succeeding] = await Promise.all([
      buildDocumentSafely({ ...baseArgs, documentType: 'business_plan' }),
      buildDocumentSafely({ ...baseArgs, documentType: 'cover_letter' }),
    ]);

    expect(failing.ok).toBe(false);
    expect(succeeding.ok).toBe(true);
    toBufferSpy.mockRestore();
  });
});

describe('buildFailureNoteText (DR-4 follow-up client-facing explanation)', () => {
  it('names the failed document(s) and the application ID, without exposing the raw error', () => {
    const failures: DocumentBuildFailure[] = [
      { documentType: 'business_plan', label: 'Business Plan', error: 'TypeError: cannot read property of undefined' },
    ];

    const note = buildFailureNoteText('app-123', failures);

    expect(note).toContain('Business Plan');
    expect(note).toContain('app-123');
    expect(note).not.toContain('TypeError');
    expect(note).toContain('E2go.app');
  });
});

describe('alertDocumentBuildFailures (DR-4 follow-up active paging)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pages ops with the application, the failed document(s), and the underlying error', async () => {
    const failures: DocumentBuildFailure[] = [
      { documentType: 'business_plan', label: 'Business Plan', error: 'malformed content_text' },
    ];

    await alertDocumentBuildFailures('app-456', failures);

    expect(mockSendOpsAlert).toHaveBeenCalledTimes(1);
    const [subject, body] = mockSendOpsAlert.mock.calls[0];
    expect(subject).toContain('app-456');
    expect(subject).toContain('1 document');
    expect(body).toContain('Business Plan');
    expect(body).toContain('malformed content_text');
  });
});
