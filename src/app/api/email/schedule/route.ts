import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { checkInactivityAndSendEmails, processScheduledEmails } from '@/lib/email-scheduler';

export async function POST(req: Request) {
  try {
    // Require CRON_SECRET bearer token OR admin session — never open to regular users
    const authHeader = req.headers.get('Authorization');
    const cronSecret = process.env.CRON_SECRET;

    const hasCronSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!hasCronSecret) {
      // Fall back to admin session check
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return new NextResponse('Unauthorized', { status: 401 });
      }
      const service = createServiceClient();
      const { data: profile } = await service.from('profiles').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') {
        return new NextResponse('Forbidden', { status: 403 });
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
      { success: false, error: 'An error occurred. Please try again.' },
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