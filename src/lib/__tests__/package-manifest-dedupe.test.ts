/**
 * DR-8 (Gap G-05), September 11, 2026 (Session 146).
 *
 * generate/start/route.ts inserts a fresh generated_documents row per
 * document type on every job, including retries — there is no unique
 * constraint on (application_id, document_type) in the live schema (checked
 * against the cached PostgREST spec; no <pk/> or composite-unique marker
 * exists beyond the id primary key). Both cic-package-manifest.ts and the
 * download route used to read these rows filtered only by application_id
 * with no ordering, so an abandoned retry's empty 'queued' row could
 * silently shadow the row from the job that actually finished.
 *
 * selectLatestDocumentRows() (src/lib/document-dedupe.ts) is the one
 * ordering rule both callers now use. These tests exercise it directly —
 * both call sites are thin Supabase-backed wiring around it (no DI seam for
 * a live end-to-end run, the same constraint noted in
 * generation-quarantine.test.ts / generation-resume.test.ts).
 */
import { selectLatestDocumentRows, type DedupableDocumentRow } from '../document-dedupe';

interface Row extends DedupableDocumentRow {
  content_text: string;
}

function row(overrides: Partial<Row>): Row {
  return {
    document_type: 'cover_letter',
    status: 'queued',
    created_at: '2026-01-01T00:00:00Z',
    content_text: '',
    ...overrides,
  };
}

describe('selectLatestDocumentRows — one winning row per document_type (DR-8)', () => {
  it('an abandoned retry\'s empty queued row never shadows the completed run\'s row, regardless of order', () => {
    const completed = row({
      status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
      content_text: 'The real, finished cover letter.',
    });
    const abandonedRetryStub = row({
      status: 'queued',
      created_at: '2026-01-02T00:00:00Z', // newer job, never actually ran
      content_text: '',
    });

    const forward = selectLatestDocumentRows([completed, abandonedRetryStub]);
    expect(forward.get('cover_letter')).toBe(completed);

    // Order must not matter — this is what "deterministic" means here.
    const backward = selectLatestDocumentRows([abandonedRetryStub, completed]);
    expect(backward.get('cover_letter')).toBe(completed);
  });

  it('a genuinely newer completed run wins over an older completed run for the same document type', () => {
    const older = row({
      status: 'approved',
      created_at: '2026-01-01T00:00:00Z',
      content_text: 'First attempt.',
    });
    const newer = row({
      status: 'certified',
      created_at: '2026-01-05T00:00:00Z',
      content_text: 'Retried and improved.',
    });

    expect(selectLatestDocumentRows([older, newer]).get('cover_letter')).toBe(newer);
    expect(selectLatestDocumentRows([newer, older]).get('cover_letter')).toBe(newer);
  });

  it('when every row for a document type is still queued, the most recent queued row wins', () => {
    const olderQueued = row({ created_at: '2026-01-01T00:00:00Z' });
    const newerQueued = row({ created_at: '2026-01-03T00:00:00Z' });

    expect(selectLatestDocumentRows([olderQueued, newerQueued]).get('cover_letter')).toBe(newerQueued);
  });

  it('a job stuck mid-pipeline (generating) outranks an abandoned queued placeholder from a later job', () => {
    const inProgress = row({
      status: 'generating',
      created_at: '2026-01-01T00:00:00Z',
      content_text: '',
    });
    const laterAbandoned = row({
      status: 'queued',
      created_at: '2026-01-02T00:00:00Z',
      content_text: '',
    });

    expect(selectLatestDocumentRows([inProgress, laterAbandoned]).get('cover_letter')).toBe(inProgress);
  });

  it('resolves independently per document_type across a full duplicated package', () => {
    const rows: Row[] = [
      row({ document_type: 'cover_letter', status: 'approved', created_at: '2026-01-01T00:00:00Z', content_text: 'A' }),
      row({ document_type: 'cover_letter', status: 'queued', created_at: '2026-01-02T00:00:00Z', content_text: '' }),
      row({ document_type: 'source_of_funds', status: 'queued', created_at: '2026-01-01T00:00:00Z', content_text: '' }),
      row({ document_type: 'source_of_funds', status: 'approved', created_at: '2026-01-02T00:00:00Z', content_text: 'B' }),
    ];

    const winners = selectLatestDocumentRows(rows);
    expect(winners.size).toBe(2);
    expect(winners.get('cover_letter')?.content_text).toBe('A');
    expect(winners.get('source_of_funds')?.content_text).toBe('B');
  });

  it('a single row per document type (the common, non-retried case) passes through unchanged', () => {
    const onlyRow = row({ status: 'approved', content_text: 'Only attempt.' });
    const winners = selectLatestDocumentRows([onlyRow]);
    expect(winners.get('cover_letter')).toBe(onlyRow);
  });

  it('no rows for a document type means no entry in the map, not a placeholder', () => {
    const winners = selectLatestDocumentRows<Row>([]);
    expect(winners.has('cover_letter')).toBe(false);
    expect(winners.size).toBe(0);
  });
});
