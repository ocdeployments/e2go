import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from '@/lib/emails/unsubscribe';

/**
 * Unsubscribe endpoint.
 *
 * POST only, deliberately. Corporate mail gateways and link scanners fetch
 * every URL in an incoming message before the recipient ever sees it; a GET
 * that unsubscribed would silently opt people out of mail they still wanted.
 * The page at /unsubscribe therefore shows a button, and the button posts
 * here. RFC 8058 one-click, which mail clients invoke themselves, is also a
 * POST, so the same handler serves both.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  let encoded = url.searchParams.get('e') ?? '';
  let signature = url.searchParams.get('s') ?? '';

  // The page posts JSON; a mail client's one-click POST carries the token in
  // the query string with a form-encoded body we do not need to read.
  if (!encoded || !signature) {
    try {
      const body = await req.json();
      encoded = body.e ?? encoded;
      signature = body.s ?? signature;
    } catch {
      /* no JSON body — the query string was the only source */
    }
  }

  const email = verifyUnsubscribeToken(encoded, signature);
  if (!email) {
    return NextResponse.json({ error: 'This unsubscribe link is not valid.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Upsert rather than insert: a second click, or a one-click header fired
   * alongside the page button, must succeed rather than error. The recipient
   * only ever needs to see that they are unsubscribed.
   */
  const { error } = await supabase
    .from('email_suppressions')
    .upsert(
      { email: email.toLowerCase(), reason: 'unsubscribed', source: 'link' },
      { onConflict: 'email' }
    );

  if (error) {
    console.error('[unsubscribe] suppression write failed:', error);
    return NextResponse.json({ error: 'Something went wrong. Please email support@e2go.app.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, email });
}
