/**
 * DR-8 (Gap G-05), September 11, 2026 (Session 146).
 *
 * generate/start/route.ts inserts a fresh generated_documents row per
 * document type on every job, including retries — there is no unique
 * constraint on (application_id, document_type), so a retried application
 * ends up with two or more rows per document type. cic-package-manifest.ts
 * and the download route each read these rows filtered only by
 * application_id, with no ordering, so whichever row the database happened
 * to return last silently won — possibly an abandoned retry's empty
 * 'queued' placeholder shadowing the row that actually finished.
 *
 * This is the one ordering rule both callers use, so there is nothing left
 * to drift between them (the same shape of bug DR-16 closed for the
 * document-plan list). A 'queued' row has never been touched by a pipeline
 * run and carries no content — it must never outrank a row that has, no
 * matter which one is newer. Among rows that have both been touched (or
 * both still queued), the most recently created one wins, mirroring the
 * recency rule already used for uploaded_documents in cic-package-manifest.ts.
 */

export interface DedupableDocumentRow {
  document_type: string;
  status: string;
  created_at: string;
}

/**
 * Reduces possibly-duplicate generated_documents rows (one application can
 * have several rows per document_type after a retry) to a single winning
 * row per document_type.
 */
export function selectLatestDocumentRows<T extends DedupableDocumentRow>(
  rows: T[]
): Map<string, T> {
  const winners = new Map<string, T>();

  for (const row of rows) {
    const existing = winners.get(row.document_type);
    if (!existing) {
      winners.set(row.document_type, row);
      continue;
    }

    const existingIsPlaceholder = existing.status === 'queued';
    const rowIsPlaceholder = row.status === 'queued';

    if (existingIsPlaceholder && !rowIsPlaceholder) {
      winners.set(row.document_type, row);
    } else if (!existingIsPlaceholder && rowIsPlaceholder) {
      // existing has already been through the pipeline — a queued
      // placeholder from a different job must not shadow it.
      continue;
    } else if (row.created_at > existing.created_at) {
      winners.set(row.document_type, row);
    }
  }

  return winners;
}
