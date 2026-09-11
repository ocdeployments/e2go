/**
 * DR-6 (Gap G-04) / Decision 3, resolved September 10, 2026 (Session 146):
 * release-with-flag. Before this fix, any per-document generation failure
 * (a thrown error from the LLM/verifier loop, or a validateContext miss)
 * called the whole-pipeline-aborting fail() and returned — so one bad
 * document took down the other 15-25 documents already generated or still
 * in progress. The fix quarantines only the failing document (status:
 * 'failed' + quality_gate_passed: false, which is the same gate
 * buildPackageManifest() already treats as 'blocked' and the
 * Acknowledgment Gate already turns into job status 'partial') and lets
 * the outer per-document loop continue to the next document.
 *
 * runGenerationPipeline() is not practically mockable end-to-end here — it
 * makes live Anthropic/Supabase calls throughout a single 400+ line
 * function with no DI seam (see DR-7's test in generation-resume.test.ts
 * for the same constraint). These tests instead verify the structural
 * properties of the fix directly against the source, the same pattern
 * already established for DR-7.
 */
import fs from 'fs';
import path from 'path';

function readEngineSource(): string {
  return fs.readFileSync(
    path.join(process.cwd(), 'src/lib/generation-engine.ts'),
    'utf8'
  );
}

function getCatchBlock(src: string): string {
  // Anchor on the DR-6 comment rather than "} catch (err) {" alone — the
  // per-document while loop has several earlier try/catch blocks (LLM call
  // retries, verifier logic), so a lazy match from the first "catch (err)"
  // would swallow everything up to this one.
  const anchor = src.indexOf('// DR-6 (Gap G-04) / Decision 3');
  expect(anchor).toBeGreaterThan(-1);
  const end = src.indexOf('documentFailed = true;', anchor);
  expect(end).toBeGreaterThan(-1);
  const closeBrace = src.indexOf('}', src.indexOf('break;', end));
  return src.slice(anchor, closeBrace + 1);
}

describe('DR-6 — per-document quarantine instead of whole-pipeline abort', () => {
  it('defines DocumentQuarantineError with both reason codes', () => {
    const src = readEngineSource();
    expect(src).toMatch(/class DocumentQuarantineError extends Error/);
    expect(src).toMatch(/'system_fault'\s*\|\s*'needs_information'/);
  });

  it('throws DocumentQuarantineError on a validateContext miss instead of calling fail() and returning', () => {
    const src = readEngineSource();
    const match = src.match(/if \(!validation\.valid\) \{[\s\S]*?\n\s*\}/);
    expect(match).not.toBeNull();
    const block = match![0];

    expect(block).toMatch(/throw new DocumentQuarantineError\(errorMsg, 'needs_information'\)/);
    expect(block).not.toMatch(/fail\(/);
    expect(block).not.toMatch(/return;/);
  });

  it('quarantines the failing document in the catch block without calling fail() or returning', () => {
    const block = getCatchBlock(readEngineSource());

    expect(block).toMatch(/status:\s*'failed'/);
    expect(block).toMatch(/quality_gate_passed:\s*false/);
    expect(block).toMatch(/documentFailed = true/);
    expect(block).toMatch(/break;/);

    // The defect being fixed: the old catch block called fail(...) (an
    // abort of document_generation_jobs.status for the WHOLE pipeline)
    // and returned out of runGenerationPipeline entirely.
    expect(block).not.toMatch(/await fail\(/);
    expect(block).not.toMatch(/return;/);
  });

  it('derives the reason code from DocumentQuarantineError, defaulting to system_fault for any other error', () => {
    const block = getCatchBlock(readEngineSource());
    expect(block).toMatch(
      /err instanceof DocumentQuarantineError \? err\.reasonCode : 'system_fault'/
    );
  });

  it('reports the quarantine to Sentry with job/application/document context', () => {
    const block = getCatchBlock(readEngineSource());
    expect(block).toMatch(/Sentry\.captureException\(/);
    expect(block).toMatch(/jobId,\s*applicationId,\s*docType,\s*reasonCode/);
  });

  it('closes the catch block inside the revision while-loop, not the outer per-document for-loop', () => {
    const src = readEngineSource();
    // The outer for-loop over DOCUMENT_TYPES must still run its
    // "Resume job for next document" step after a quarantine — i.e. the
    // break only escapes the inner while loop, and execution falls
    // through to the rest of the per-document iteration rather than
    // returning out of runGenerationPipeline.
    const afterCatch = src.slice(src.indexOf('documentFailed = true;'));
    const nextFewLines = afterCatch.slice(0, 1200);
    expect(nextFewLines).toMatch(/Resume job for next document/);
    expect(nextFewLines).not.toMatch(/^\s*return;/m);
  });
});
