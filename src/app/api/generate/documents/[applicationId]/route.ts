import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { DocumentListResponse } from '@/types/generation';

function getSupabase() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    const { applicationId } = params;

    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // RLS: Ensure user can only access their own documents
    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { data: documents, error: docError } = await supabase
      .from('generated_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    if (docError) {
      throw docError;
    }

    const { data: credits } = await supabase
      .from('revision_credits')
      .select('*')
      .eq('application_id', applicationId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    const response: DocumentListResponse = {
      applicationId,
      documents: (documents || []) as DocumentListResponse['documents'],
      credits: credits as DocumentListResponse['credits'],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get documents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    const { applicationId } = params;

    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // RLS: Ensure user can only trigger generation for their own application
    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Trigger document generation by creating generation jobs
    // This delegates to the generation pipeline (handled by /api/generate/start)
    return NextResponse.json({
      message: 'Use /api/generate/start to initiate document generation',
      applicationId,
    });
  } catch (error) {
    console.error('Start generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start generation' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }
    const { applicationId } = params;

    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { documentId, documentType, action } = body;

    // Support both old format (documentId + status) and new format (documentType + action)
    if (!documentId && !documentType) {
      return NextResponse.json(
        { error: 'documentId or documentType is required' },
        { status: 400 }
      );
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // RLS: Ensure user can only update their own documents
    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find the document to update
    let targetDocument;
    if (documentId) {
      const { data: doc } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('id', documentId)
        .eq('application_id', applicationId)
        .single();
      targetDocument = doc;
    } else if (documentType) {
      // Get the most recent document of this type for the application
      const { data: doc } = await supabase
        .from('generated_documents')
        .select('*')
        .eq('application_id', applicationId)
        .eq('document_type', documentType)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      targetDocument = doc;
    }

    if (!targetDocument) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Handle the action
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === 'approve') {
      updateData.status = 'approved';
      updateData.approved_at = new Date().toISOString();
    } else if (action === 'revise') {
      updateData.status = 'revision_requested';
    } else if (body.status) {
      // Backward compatibility: use explicit status if provided
      updateData.status = body.status;
      if (body.status === 'approved') {
        updateData.approved_at = new Date().toISOString();
      }
    }

    const { data: updatedDoc, error: updateError } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', targetDocument.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, document: updatedDoc });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    );
  }
}