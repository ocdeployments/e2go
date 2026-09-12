/**
 * POST /api/dashboard/certify-document
 *
 * Client certifies a generated document — marks it as approved and ready
 * for inclusion in the final submission package.
 *
 * Clients can also lock specific passages (inline edits they've made that
 * should survive any future regeneration) by providing locked_passages.
 *
 * Body: { applicationId, documentType, lockedPassages?: string[] }
 *
 * On success, updates generated_documents:
 *   client_certified = true
 *   certified_at = now()
 *   locked_passages = [...] (merged with any existing locks)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/types/generation';
import { captureApiError } from '@/lib/capture-error';
import { selectLatestDocumentRows, type DedupableDocumentRow } from '@/lib/document-dedupe';

interface CertifyBody {
  applicationId: string;
  documentType: DocumentType;
  lockedPassages?: string[];
}

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return new NextResponse('Unauthorized', { status: 401 });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 });

  let body: CertifyBody;
  try {
    body = await request.json() as CertifyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { applicationId, documentType, lockedPassages } = body;
  if (!applicationId || !documentType) {
    return NextResponse.json({ error: 'applicationId and documentType required' }, { status: 400 });
  }

  // Verify ownership
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single();

  if (!app) return new NextResponse('Not found', { status: 404 });

  // Fetch existing locked_passages to merge, plus the quality-gate verdict.
  // A retried application can have more than one generated_documents row for
  // this document_type (see document-dedupe.ts) — dedupe here the same way
  // cic-package-manifest.ts and the download route do, so this route acts on
  // the row that actually reflects the current run, not an abandoned retry.
  type CertifyDocRow = DedupableDocumentRow & {
    id: string;
    locked_passages: string[] | null;
    quality_gate_passed: boolean | null;
    quality_gate_notes: string[] | null;
  };
  const { data: candidates, error: existingError } = await supabase
    .from('generated_documents')
    .select('id, status, created_at, locked_passages, quality_gate_passed, quality_gate_notes')
    .eq('application_id', applicationId)
    .eq('document_type', documentType);

  if (existingError) {
    captureApiError(existingError, { route: 'dashboard/certify-document', userId: user.id, applicationId, documentType });
    return NextResponse.json({ error: 'Failed to load document' }, { status: 500 });
  }

  const existing = selectLatestDocumentRows(
    (candidates ?? []).map((row) => ({ ...row, document_type: documentType })) as CertifyDocRow[]
  ).get(documentType);

  // Gap 3 — a document that failed the legal-boundary quality gate is held for
  // e2go review and cannot be certified by the client. Detect-and-block, not
  // detect-and-flag: this is the last gate before the doc reaches a package.
  if (existing?.quality_gate_passed === false) {
    const notes = (existing.quality_gate_notes as string[] | null) ?? [];
    const reason =
      notes.find(n => /forbidden legal conclusion/i.test(n)) ?? notes[0] ?? 'quality gate not passed';
    return NextResponse.json(
      {
        error: 'This document is held for E2go.app review and cannot be certified yet.',
        reason,
        held: true,
      },
      { status: 409 }
    );
  }

  if (!existing) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const existingLocks = existing.locked_passages ?? [];
  const newLocks = lockedPassages ?? [];
  const mergedLocks = Array.from(new Set([...existingLocks, ...newLocks]));

  const { error } = await supabase
    .from('generated_documents')
    .update({
      client_certified: true,
      certified_at: new Date().toISOString(),
      locked_passages: mergedLocks,
    })
    .eq('id', existing.id);

  if (error) {
    captureApiError(error, { route: 'dashboard/certify-document', userId: user.id, applicationId, documentType });
    return NextResponse.json({ error: 'Failed to certify document' }, { status: 500 });
  }

  return NextResponse.json({ certified: true, documentType, lockedPassages: mergedLocks });
}
