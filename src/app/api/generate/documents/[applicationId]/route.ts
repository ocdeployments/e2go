import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { DocumentListResponse } from '@/types/generation';

function getSupabase() {
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
    const { applicationId } = params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
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