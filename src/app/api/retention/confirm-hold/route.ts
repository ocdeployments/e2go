import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyRetentionHoldToken } from '@/lib/emails/retention-hold-token';
import { captureApiError } from '@/lib/capture-error';

/**
 * Confirm-to-keep endpoint for the retention-reminder email (RS-10 / Gap G-19).
 *
 * POST only, for the same reason /api/email/unsubscribe is: a link scanner or
 * mail gateway fetches every URL in an incoming message before the recipient
 * sees it, and a GET that set the hold would place it on files the client
 * never chose to keep. The page at /retention/confirm-hold shows a button;
 * the button posts here.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let applicationId = url.searchParams.get('a') ?? '';
  let signature = url.searchParams.get('s') ?? '';

  if (!applicationId || !signature) {
    try {
      const body = await req.json();
      applicationId = body.a ?? applicationId;
      signature = body.s ?? signature;
    } catch {
      /* no JSON body — the query string was the only source */
    }
  }

  const verifiedId = verifyRetentionHoldToken(applicationId, signature);
  if (!verifiedId) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Only set the hold if it isn't already, so a second click or a resent
   * reminder doesn't push the recorded hold time forward each time.
   */
  const { data: application, error: fetchError } = await supabase
    .from('applications')
    .select('id, retention_hold_at')
    .eq('id', verifiedId)
    .maybeSingle();

  if (fetchError) {
    captureApiError(fetchError, { route: 'retention/confirm-hold', stage: 'fetch', applicationId: verifiedId });
    return NextResponse.json({ error: 'Something went wrong. Please email support@e2go.app.' }, { status: 500 });
  }
  if (!application) {
    return NextResponse.json({ error: 'This link is not valid.' }, { status: 400 });
  }

  if (!application.retention_hold_at) {
    const { error: updateError } = await supabase
      .from('applications')
      .update({ retention_hold_at: new Date().toISOString() })
      .eq('id', verifiedId);

    if (updateError) {
      captureApiError(updateError, { route: 'retention/confirm-hold', stage: 'update', applicationId: verifiedId });
      return NextResponse.json({ error: 'Something went wrong. Please email support@e2go.app.' }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
