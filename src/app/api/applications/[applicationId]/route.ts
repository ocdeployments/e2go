import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  _request: Request,
  { params }: { params: { applicationId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { applicationId } = params;

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, user_id, principal_name, business_name, investment_amount, target_state')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.user_id !== user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    return NextResponse.json({
      applicant_name: application.principal_name ?? null,
      business_name: application.business_name ?? null,
      investment_amount: application.investment_amount ?? null,
      state: application.target_state ?? null,
      city: null,
      consulate: null,
      nationality: null,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
