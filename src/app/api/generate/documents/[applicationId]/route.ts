import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DocumentListResponse } from '@/types/generation';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getUserIdFromAuth(authHeader: string): string | null {
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return authHeader;
}

export async function GET(
  request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = getSupabase();
    const { applicationId } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = getUserIdFromAuth(authHeader);

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
    if (application.user_id !== userId) {
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
    const { applicationId } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = getUserIdFromAuth(authHeader);

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
    if (application.user_id !== userId) {
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
    const { applicationId } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userId = getUserIdFromAuth(authHeader);
    const body = await request.json();
    const { documentId, status } = body;

    if (!documentId || !status) {
      return NextResponse.json(
        { error: 'documentId and status are required' },
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
    if (application.user_id !== userId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If approving, set approved_at timestamp
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
    }

    const { data: updatedDoc, error: updateError } = await supabase
      .from('generated_documents')
      .update(updateData)
      .eq('id', documentId)
      .eq('application_id', applicationId)
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