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

  // Fetch existing locked_passages to merge
  const { data: existing } = await supabase
    .from('generated_documents')
    .select('locked_passages')
    .eq('application_id', applicationId)
    .eq('document_type', documentType)
    .maybeSingle();

  const existingLocks = (existing?.locked_passages as string[] | null) ?? [];
  const newLocks = lockedPassages ?? [];
  const mergedLocks = Array.from(new Set([...existingLocks, ...newLocks]));

  const { error } = await supabase
    .from('generated_documents')
    .update({
      client_certified: true,
      certified_at: new Date().toISOString(),
      locked_passages: mergedLocks,
    })
    .eq('application_id', applicationId)
    .eq('document_type', documentType);

  if (error) {
    captureApiError(error, { route: 'dashboard/certify-document', userId: user.id, applicationId, documentType });
    return NextResponse.json({ error: 'Failed to certify document' }, { status: 500 });
  }

  return NextResponse.json({ certified: true, documentType, lockedPassages: mergedLocks });
}
