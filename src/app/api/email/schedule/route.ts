import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { checkInactivityAndSendEmails, processScheduledEmails } from '@/lib/email-scheduler';
import { captureApiError } from '@/lib/capture-error';

// Vercel Cron invokes cron paths with GET + an Authorization: Bearer CRON_SECRET header.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkInactivityAndSendEmails();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    captureApiError(error, { route: 'email/schedule', stage: 'cron-inactivity' });
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

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
    captureApiError(error, { route: 'email/schedule' });
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

