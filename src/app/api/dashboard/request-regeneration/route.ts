/**
 * POST /api/dashboard/request-regeneration
 *
 * Client requests regeneration of a document they've reviewed and found
 * lacking. An optional note is prepended to the next generation call's
 * case_theory_brief so the engine knows what to fix.
 *
 * Body: { applicationId, documentType, note?: string }
 *
 * On success:
 *   - Clears client_certified and certified_at on the document
 *   - Stores the client note on generated_documents.client_regen_note
 *   - Triggers the generation pipeline for the single document
 *     (same mechanism as the main generation route — single-doc mode)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DocumentType } from '@/types/generation';
import { captureApiError } from '@/lib/capture-error';

interface RegenBody {
  applicationId: string;
  documentType: DocumentType;
  note?: string;
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

  let body: RegenBody;
  try {
    body = await request.json() as RegenBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { applicationId, documentType, note } = body;
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

  // Clear certification and store the client note
  const { error: resetError } = await supabase
    .from('generated_documents')
    .update({
      client_certified: false,
      certified_at: null,
      client_regen_note: note ?? null,
    })
    .eq('application_id', applicationId)
    .eq('document_type', documentType);

  if (resetError) {
    captureApiError(resetError, { route: 'dashboard/request-regeneration', stage: 'reset', userId: user.id, applicationId, documentType });
    return NextResponse.json({ error: 'Failed to reset document' }, { status: 500 });
  }

  // Queue a new generation job for this single document
  const { error: jobError } = await supabase
    .from('document_generation_jobs')
    .insert({
      application_id: applicationId,
      user_id: user.id,
      status: 'queued',
      document_types: [documentType],
      client_regen_note: note ?? null,
      created_at: new Date().toISOString(),
    });

  if (jobError) {
    captureApiError(jobError, { route: 'dashboard/request-regeneration', stage: 'queue-job', userId: user.id, applicationId, documentType });
    return NextResponse.json({ error: 'Failed to queue regeneration' }, { status: 500 });
  }

  return NextResponse.json({
    queued: true,
    documentType,
    note: note ?? null,
    message: 'Regeneration queued. The document will be updated shortly.',
  });
}
