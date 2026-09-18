import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { extractGeo, COUNTRY_NAMES } from '@/lib/geo';
import { safeRedirect } from '@/lib/safe-redirect';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = safeRedirect(requestUrl.searchParams.get('next'), '/case-profile');
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: session, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const userId = session.user?.id;
      if (userId) {
        const geo = extractGeo(request.headers);
        const service = createServiceClient();
        void (async () => {
          await service.from('login_events').insert({
            user_id: userId,
            country: geo.country,
            country_name: geo.country ? (COUNTRY_NAMES[geo.country] ?? geo.country) : null,
            city: geo.city,
            region: geo.region,
            login_type: 'oauth',
          });
        })();
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // No `code` query param — Supabase may still have handed us tokens in the
  // URL fragment (implicit-grant style), which the server never sees. Ship a
  // tiny client-side shim to check for that before giving up as expired.
  const fallback = `${origin}/forgot-password?error=expired`;
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<script>
(function () {
  var hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
  var params = new URLSearchParams(hash);
  var accessToken = params.get('access_token');
  var refreshToken = params.get('refresh_token');
  var next = ${JSON.stringify(next)};
  var origin = ${JSON.stringify(origin)};
  var fallback = ${JSON.stringify(fallback)};

  if (!accessToken || !refreshToken) {
    window.location.replace(fallback);
    return;
  }

  fetch('/api/auth/set-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: accessToken, refresh_token: refreshToken }),
  })
    .then(function (res) {
      window.location.replace(res.ok ? origin + next : fallback);
    })
    .catch(function () {
      window.location.replace(fallback);
    });
})();
</script>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
}
