/**
 * Case Intelligence Core — CIC-3.2: auto-seed FDD Intelligence from comprehension.
 *
 * When a client brings a Franchise Disclosure Document into the platform through
 * the Document Import Hub (the generic /api/apply/parse-document pipeline), it is
 * recognised as doc_type='fdd' and lightly extracted into `uploaded_documents`.
 * But the full FDD Intelligence product (50-field extraction, 5-dimension E-2
 * scoring, territory + profile match, questions, report) runs off its own
 * `fdd_analyses` table and re-extracts the source PDF — historically the client
 * had to RE-UPLOAD the same FDD into the separate FDD tool to light it up.
 *
 * This module closes that gap: when parse-document resolves an FDD, we persist
 * the PDF to the same `application-documents` bucket the dedicated /api/fdd/upload
 * route already uses, and seed a `pending` `fdd_analyses` row pointing at it. The
 * existing FDD pipeline (extract → score → territory → questions → report) then
 * runs unchanged — no re-upload, no duplicated extraction logic here.
 *
 * Scope boundaries (kept deliberately tight):
 *   - We only persist + seed FDDs. An FDD is the franchisor's disclosure document,
 *     not the client's sensitive personal/financial paperwork — consistent with
 *     the FDD product, which already stores FDDs in this bucket. We never store
 *     the client's other uploads (parse-document keeps file_path='' for those).
 *   - We seed extraction_status='pending' only. We do NOT auto-run the (paid,
 *     LLM-heavy) extraction — the client/owner triggers that from the FDD UI.
 *   - Idempotent: if an fdd_analyses row already exists for this application +
 *     filename, we skip (no duplicate rows, no duplicate storage objects).
 *
 * Server-only (service-role client + storage). Non-blocking: callers fire this
 * and swallow errors so the Import Hub response is never delayed or broken.
 */

import { createServiceClient } from '@/lib/supabase-service';
import { sanitizeFilename } from '@/lib/document-validation';

export interface SeedFddInput {
  applicationId: string;
  userId: string;
  fileName: string;
  buffer: Buffer;
  fileSizeBytes: number;
  /** Optional target market pulled from the application, so territory analysis is meaningful. */
  targetState?: string | null;
  targetCity?: string | null;
}

export type SeedFddResult =
  | { status: 'seeded'; fddId: string }
  | { status: 'skipped'; reason: 'already_seeded' }
  | { status: 'failed'; reason: string };

const STORAGE_BUCKET = 'application-documents';

/**
 * Persist an FDD PDF and seed a pending fdd_analyses row for it. Idempotent on
 * (application_id, original_filename). Returns a structured result; never throws.
 */
export async function seedFddAnalysisFromUpload(input: SeedFddInput): Promise<SeedFddResult> {
  const { applicationId, userId, fileName, buffer, fileSizeBytes, targetState, targetCity } = input;
  const service = createServiceClient();
  const safeName = sanitizeFilename(fileName);

  try {
    // Idempotency guard — the same FDD may already be seeded (re-import) or have
    // been uploaded through the dedicated FDD tool. Either way, don't duplicate.
    const { data: existing } = await service
      .from('fdd_analyses')
      .select('id')
      .eq('application_id', applicationId)
      .eq('original_filename', safeName)
      .limit(1)
      .maybeSingle();

    if (existing) return { status: 'skipped', reason: 'already_seeded' };

    // Persist the PDF to the same bucket the dedicated FDD upload route uses.
    const storagePath = `${userId}/fdd/${Date.now()}_${safeName}`;
    const { error: uploadError } = await service.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      return { status: 'failed', reason: `storage: ${uploadError.message}` };
    }

    const { data: row, error: insertError } = await service
      .from('fdd_analyses')
      .insert({
        user_id:           userId,
        application_id:    applicationId,
        storage_path:      storagePath,
        original_filename: safeName,
        file_size_bytes:   fileSizeBytes,
        transaction_type:  'new_unit',
        target_state:      targetState || null,
        target_city:       targetCity || null,
        extraction_status: 'pending',
        extraction_progress: 0,
      })
      .select('id')
      .single();

    if (insertError || !row) {
      // Roll back the orphaned storage object so we don't leak files on a failed seed.
      await service.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return { status: 'failed', reason: `db: ${insertError?.message ?? 'no row returned'}` };
    }

    return { status: 'seeded', fddId: row.id as string };
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown' };
  }
}
