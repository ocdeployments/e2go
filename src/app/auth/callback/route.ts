import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { extractGeo, COUNTRY_NAMES } from '@/lib/geo';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/case-profile';
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

  // Code missing or expired — send back with error flag
  return NextResponse.redirect(`${origin}/forgot-password?error=expired`);
}
