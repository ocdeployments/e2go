import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

function hashIp(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const salt = process.env.IP_HASH_SALT || 'e2go-consent-log';
  return createHash('sha256').update(`${ip}:${salt}`).digest('hex');
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { consent_type, consent_given } = await req.json();
  if (typeof consent_type !== 'string' || typeof consent_given !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase.from('consent_log').insert({
    user_id: user.id,
    consent_type,
    consent_given,
    ip_hash: hashIp(req),
  });

  if (error) {
    captureApiError(error, { route: 'consent/log', userId: user.id });
    return NextResponse.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
