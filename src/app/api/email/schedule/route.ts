import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkInactivityAndSendEmails, processScheduledEmails } from '@/lib/email-scheduler';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    // Verify authorization (could be from cron service or admin)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Also allow if there's a valid session
      const { data: { user } } = await getSupabase().auth.getUser();
      if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
    }

    const { action } = await req.json().catch(() => ({ action: 'all' }));

    let result;

    if (action === 'inactivity') {
      result = await checkInactivityAndSendEmails();
    } else if (action === 'scheduled') {
      result = await processScheduledEmails();
    } else {
      // Run both
      const inactivityResult = await checkInactivityAndSendEmails();
      const scheduledResult = await processScheduledEmails();

      result = {
        processed: inactivityResult.processed + scheduledResult.processed,
        emailsSent: inactivityResult.emailsSent + scheduledResult.emailsSent,
        errors: [...inactivityResult.errors, ...scheduledResult.errors]
      };
    }

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Email scheduler error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Health check for the scheduler
  return NextResponse.json({
    status: 'ok',
    message: 'Email scheduler is running. Use POST with { action: "inactivity" | "scheduled" | "all" }'
  });
}