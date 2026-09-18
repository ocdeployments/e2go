/**
 * POST /api/auth/set-session
 *
 * Companion to /auth/callback for the implicit-grant flow: Supabase's
 * verify/generateLink endpoint returns access_token/refresh_token in the
 * URL *fragment* (`#access_token=...`), which never reaches the server on
 * a normal navigation. /auth/callback's client-side shim reads the
 * fragment and POSTs the tokens here (body, not URL) so we can call
 * setSession() through the @supabase/ssr cookie adapter and land a real
 * session cookie on the response.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

export async function POST(request: NextRequest) {
  try {
    const { access_token, refresh_token } = await request.json();

    if (!access_token || !refresh_token) {
      return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    captureApiError(error, { route: 'auth/set-session' });
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
