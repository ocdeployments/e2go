import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId, userId } = body;

    if (!applicationId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Check if user has a completed payment for this application
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('application_id', applicationId)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .single();

    if (error || !payment) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: true,
      payment,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}
