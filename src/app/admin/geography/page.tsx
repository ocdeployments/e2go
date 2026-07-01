import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CA_REGIONS, GB_REGIONS, COUNTRY_NAMES } from '@/lib/geo';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function requireAdmin() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const svc = getAdmin();
  const { data: profile } = await svc.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') notFound();
}

interface LoginEvent {
  user_id: string;
  country: string | null;
  country_name: string | null;
  city: string | null;
  region: string | null;
  login_type: string | null;
  created_at: string;
}

interface ProfileRow { id: string; created_at: string }

function bar(count: number, max: number, color = 'bg-[#C9A84C]/60') {
  const pct = max > 0 ? Math.max(4, (count / max) * 100) : 4;
  return <div className={`h-2 rounded ${color}`} style={{ width: `${pct}%` }} />;
}

export default async function AdminGeographyPage() {
  await requireAdmin();

  const admin = getAdmin();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();

  const [
    { data: loginEvents },
    { data: allProfiles },
    { data: recentLogins },
  ] = await Promise.all([
    admin.from('login_events').select('user_id, country, country_name, city, region, login_type, created_at').order('created_at', { ascending: false }).limit(2000),
    admin.from('profiles').select('id, created_at').order('created_at', { ascending: false }).limit(500),
    admin.from('login_events').select('user_id, country, country_name, city, region, created_at').gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }),
  ]);

  const events     = (loginEvents ?? []) as LoginEvent[];
  const profiles   = (allProfiles ?? []) as ProfileRow[];
  const recent30   = (recentLogins ?? []) as LoginEvent[];

  // ── Country breakdown (all time) ─────────────────────────────────────────────
  const byCountry: Record<string, { name: string; total: number; recent30: number; uniqueUsers: Set<string> }> = {};
  for (const e of events) {
    const code = e.country ?? 'Unknown';
    const name = e.country_name ?? COUNTRY_NAMES[code] ?? code;
    if (!byCountry[code]) byCountry[code] = { name, total: 0, recent30: 0, uniqueUsers: new Set() };
    byCountry[code].total++;
    byCountry[code].uniqueUsers.add(e.user_id);
  }
  for (const e of recent30) {
    const code = e.country ?? 'Unknown';
    if (byCountry[code]) byCountry[code].recent30++;
  }
  const topCountries = Object.entries(byCountry)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 20);
  const maxCountryLogins = topCountries[0]?.[1].total ?? 1;

  // ── Canadian cities ──────────────────────────────────────────────────────────
  const caEvents = events.filter(e => e.country === 'CA');
  const caByCity: Record<string, number> = {};
  const caByRegion: Record<string, number> = {};
  for (const e of caEvents) {
    const city = e.city ?? 'Unknown';
    caByCity[city] = (caByCity[city] ?? 0) + 1;
    const region = e.region ? (CA_REGIONS[e.region] ?? e.region) : 'Unknown';
    caByRegion[region] = (caByRegion[region] ?? 0) + 1;
  }
  const topCaCities = Object.entries(caByCity).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topCaRegions = Object.entries(caByRegion).sort((a, b) => b[1] - a[1]);

  // ── UK cities ────────────────────────────────────────────────────────────────
  const gbEvents = events.filter(e => e.country === 'GB');
  const gbByCity: Record<string, number> = {};
  const gbByRegion: Record<string, number> = {};
  for (const e of gbEvents) {
    const city = e.city ?? 'Unknown';
    gbByCity[city] = (gbByCity[city] ?? 0) + 1;
    const region = e.region ? (GB_REGIONS[e.region] ?? e.region) : 'Unknown';
    gbByRegion[region] = (gbByRegion[region] ?? 0) + 1;
  }
  const topGbCities  = Object.entries(gbByCity).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topGbRegions = Object.entries(gbByRegion).sort((a, b) => b[1] - a[1]);

  // ── All cities (global top) ───────────────────────────────────────────────────
  const allCities: Record<string, { country: string; count: number }> = {};
  for (const e of events) {
    if (!e.city) continue;
    const key = `${e.city}::${e.country ?? ''}`;
    if (!allCities[key]) allCities[key] = { country: e.country ?? '', count: 0 };
    allCities[key].count++;
  }
  const topCities = Object.entries(allCities)
    .map(([key, v]) => ({ city: key.split('::')[0], ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
  const maxCityCount = topCities[0]?.count ?? 1;

  // ── Signups by country (using profiles.created_at — no geo on signup yet) ────
  const totalSignups = profiles.length;
  const noGeoLogins  = events.filter(e => !e.country).length;
  const geoCapture   = events.length > 0 ? ((events.length - noGeoLogins) / events.length * 100).toFixed(0) : '0';

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-10 max-w-6xl mx-auto">
      <div className="flex items-baseline gap-4 mb-8">
        <Link href="/admin" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Admin
        </Link>
        <h1 className="text-2xl font-semibold text-[#C9A84C]">Geographic Intelligence</h1>
        <span className="text-zinc-500 text-sm">Where users log in from</span>
      </div>

      {events.length === 0 && (
        <div className="p-6 border border-zinc-800 text-zinc-500 text-sm rounded-lg mb-8">
          No login events with geo data yet. Geo tracking starts capturing on next login after the migration is applied.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {[
          { label: 'Total logins tracked', value: String(events.length) },
          { label: 'Unique countries', value: String(Object.keys(byCountry).filter(c => c !== 'Unknown').length) },
          { label: 'Logins (last 30d)', value: String(recent30.length) },
          { label: 'Geo capture rate', value: `${geoCapture}%` },
        ].map(({ label, value }) => (
          <div key={label} className="border border-zinc-800 bg-zinc-900/40 px-5 py-4 rounded-lg">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-semibold text-[#C9A84C]">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-14">

        {/* Top countries */}
        <section>
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Top countries — all time</h2>
          {topCountries.length === 0 ? (
            <p className="text-zinc-600 text-sm">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {topCountries.map(([code, { name, total, recent30: r30, uniqueUsers }]) => (
                <div key={code}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{name}</span>
                      <span className="text-xs text-zinc-600">{code}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-zinc-400">{total} logins</span>
                      <span className="text-zinc-600">{uniqueUsers.size} users</span>
                      {r30 > 0 && <span className="text-[#C9A84C]">+{r30} (30d)</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                    {bar(total, maxCountryLogins)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top cities globally */}
        <section>
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">Top cities — global</h2>
          {topCities.length === 0 ? (
            <p className="text-zinc-600 text-sm">No city data yet.</p>
          ) : (
            <div className="space-y-3">
              {topCities.map(({ city, country, count }) => (
                <div key={`${city}-${country}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-200">{city}</span>
                      <span className="text-xs text-zinc-600">{COUNTRY_NAMES[country] ?? country}</span>
                    </div>
                    <span className="text-xs text-zinc-400">{count}</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded overflow-hidden">
                    {bar(count, maxCityCount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Canada detail */}
      {caEvents.length > 0 && (
        <section className="mb-14">
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">
            Canada — {caEvents.length} logins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">By city</p>
              <div className="space-y-2.5">
                {topCaCities.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-300 w-32 truncate">{city}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-[#C9A84C]/60 rounded" style={{ width: `${(count / (topCaCities[0]?.[1] ?? 1)) * 100}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">By province</p>
              <div className="space-y-2.5">
                {topCaRegions.map(([region, count]) => (
                  <div key={region} className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-300 w-36 truncate">{region}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-[#C9A84C]/40 rounded" style={{ width: `${(count / (topCaRegions[0]?.[1] ?? 1)) * 100}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* UK detail */}
      {gbEvents.length > 0 && (
        <section className="mb-14">
          <h2 className="text-lg font-medium text-white mb-4 pb-2 border-b border-zinc-800">
            United Kingdom — {gbEvents.length} logins
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">By city</p>
              <div className="space-y-2.5">
                {topGbCities.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-300 w-32 truncate">{city}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-[#C9A84C]/60 rounded" style={{ width: `${(count / (topGbCities[0]?.[1] ?? 1)) * 100}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">By region</p>
              <div className="space-y-2.5">
                {topGbRegions.map(([region, count]) => (
                  <div key={region} className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-300 w-36 truncate">{region}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-[#C9A84C]/40 rounded" style={{ width: `${(count / (topGbRegions[0]?.[1] ?? 1)) * 100}%` }} />
                    </div>
                    <span className="text-zinc-500 text-xs w-6 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="p-4 border border-zinc-800 rounded-lg text-sm text-zinc-500">
        <p className="mb-1">
          Geo data is derived from <strong className="text-zinc-300">Vercel edge headers</strong> injected on every server request.
          No external API or billing required.
        </p>
        <p>
          <strong className="text-zinc-300">{totalSignups}</strong> total signups registered.
          City-level data captures OAuth and magic-link logins via <code className="text-xs">/auth/callback</code>;
          password logins via <code className="text-xs">/api/track/session</code>.
        </p>
      </div>
    </main>
  );
}
