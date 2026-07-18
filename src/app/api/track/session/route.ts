import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { extractGeo, COUNTRY_NAMES } from '@/lib/geo';
import { captureApiError } from '@/lib/capture-error';

// POST /api/track/session
// Called from the client after email/password login to record the login event with geo data.
// Auth is required — anon callers get 401.
export async function POST(request: NextRequest) {
  try {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user }, error } = await authSupabase.auth.getUser();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({})) as { login_type?: string };
    const geo = extractGeo(request.headers);

    const service = createServiceClient();
    await service.from('login_events').insert({
      user_id: user.id,
      country: geo.country,
      country_name: geo.country ? (COUNTRY_NAMES[geo.country] ?? geo.country) : null,
      city: geo.city,
      region: geo.region,
      login_type: body.login_type ?? 'password',
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureApiError(err, { route: 'track/session' });
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
