/**
 * DR-4 follow-up (Session 146 cont.): buildDocument()/Packer.toBuffer() run
 * against real per-case LLM content, and generate/download/[applicationId]/
 * route.ts is the only place in the app that ever calls them — a malformed
 * one used to throw straight through that route's per-tab loop into its
 * single top-level catch, which failed the ENTIRE ZIP (even the 25 other
 * documents that built fine) with a generic 500 and no indication of which
 * document or why. buildDocumentSafely isolates each document's build so
 * the rest of the package still reaches the client; alertDocumentBuildFailures
 * pages a human immediately via sendOpsAlert instead of relying on someone
 * checking Sentry.
 *
 * Lives outside route.ts (rather than as unexported helpers in the route
 * file, which is where this was first written) because Next's App Router
 * route-file type-checking only permits a fixed set of export names (GET,
 * runtime, maxDuration, etc.) — any other export fails `tsc` against the
 * generated .next/types route validator. Extracting to a plain lib module
 * also makes these directly unit-testable without exercising the route's
 * GET handler.
 */
import { Packer } from 'docx';
import { buildDocument } from './docx-builder';
import { DOC_DISPLAY_NAMES } from './docx-package-constants';
import { captureApiError } from './capture-error';
import { sendOpsAlert } from './ops-alert';
import type { DocumentType } from '@/types/generation';

export interface DocumentBuildFailure {
  documentType: DocumentType;
  label: string;
  error: string;
}

export async function buildDocumentSafely(args: {
  contentText: string;
  documentType: DocumentType;
  lastName: string;
  caseCode: string | undefined;
  personCode: string;
  applicationId: string;
}): Promise<{ ok: true; buffer: Buffer } | { ok: false; failure: DocumentBuildFailure }> {
  const { applicationId, ...buildArgs } = args;
  try {
    // DR-21 chaos drill 3 (download-time build isolation): CHAOS_DRILL_FAIL_BUILD_DOC_TYPE
    // must never be set in a deployed (Vercel) environment — it is a local-only
    // fault-injection switch for scripts/chaos-drills.mjs.
    if (process.env.CHAOS_DRILL_FAIL_BUILD_DOC_TYPE === buildArgs.documentType) {
      throw new Error(`Chaos drill: forced build failure injected for ${buildArgs.documentType}`);
    }

    const docx = buildDocument(buildArgs);
    const buffer = await Packer.toBuffer(docx);
    return { ok: true, buffer: Buffer.from(buffer) };
  } catch (err) {
    const label = DOC_DISPLAY_NAMES[buildArgs.documentType] ?? buildArgs.documentType;
    const message = err instanceof Error ? err.message : String(err);
    captureApiError(err, {
      route: 'generate/download',
      stage: 'build-document',
      applicationId,
      documentType: buildArgs.documentType,
    });
    return { ok: false, failure: { documentType: buildArgs.documentType, label, error: message } };
  }
}

/** Plain-text note bundled into the ZIP when one or more documents couldn't be built — read this and the .docx files can differ if we ever need to reason about what shipped. */
export function buildFailureNoteText(applicationId: string, failures: DocumentBuildFailure[]): string {
  return [
    'SOME DOCUMENTS COULD NOT BE INCLUDED IN THIS PACKAGE',
    '='.repeat(54),
    '',
    'The following document(s) could not be prepared for this download:',
    '',
    ...failures.map((f) => `  - ${f.label}`),
    '',
    "This is on our side, not something you did — everything else in this",
    'package generated successfully and is safe to use. Our team has been',
    'notified automatically and is looking into it.',
    '',
    'What to do next:',
    '  - Try downloading again in a little while; this is sometimes transient.',
    '  - If it still fails, contact support and reference this application ID:',
    `    ${applicationId}`,
    '',
    'E2go.app — document preparation tool, not a law firm.',
  ].join('\n');
}

export async function alertDocumentBuildFailures(
  applicationId: string,
  failures: DocumentBuildFailure[]
): Promise<void> {
  const subject = `[E2go.app OPS] ${failures.length} document(s) failed to build — application ${applicationId}`;
  const body = [
    `Application: ${applicationId}`,
    `Time: ${new Date().toISOString()}`,
    '',
    'Failed documents:',
    ...failures.map((f) => `  - ${f.label} (${f.documentType}): ${f.error}`),
    '',
    'The client received a partial package (or a clear error, if every document failed).',
    'Check generated_documents.content_text for these document types on this application to diagnose.',
  ].join('\n');
  await sendOpsAlert(subject, body);
}
