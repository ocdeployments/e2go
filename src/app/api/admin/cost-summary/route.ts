import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// FIXED 2026-06-23: route had no auth — exposed LLM cost data publicly (QA-SEC-01)
async function getRequestingAdmin(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin' ? user.id : null;
}

export async function GET() {
  const adminId = await getRequestingAdmin();
  if (!adminId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = getAdmin();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, monthRes, byModelRes, byRouteRes, topUsersRes] = await Promise.all([
    // Today's total
    admin
      .from('llm_cost_log')
      .select('cost_usd')
      .gte('created_at', todayStart),

    // This month's total
    admin
      .from('llm_cost_log')
      .select('cost_usd, created_at')
      .gte('created_at', monthStart),

    // By model this month
    admin
      .from('llm_cost_log')
      .select('model, cost_usd, tokens_in, tokens_out')
      .gte('created_at', monthStart),

    // By route this month
    admin
      .from('llm_cost_log')
      .select('route, cost_usd')
      .gte('created_at', monthStart)
      .not('route', 'is', null),

    // Top 5 users by cost this month
    admin
      .from('llm_cost_log')
      .select('user_id, cost_usd')
      .gte('created_at', monthStart)
      .not('user_id', 'is', null),
  ]);

  const todayCost  = (todayRes.data  ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0);
  const monthCost  = (monthRes.data  ?? []).reduce((s, r) => s + (r.cost_usd ?? 0), 0);

  // Projected month-end based on daily burn rate
  const daysElapsed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthEnd = daysElapsed > 0
    ? (monthCost / daysElapsed) * daysInMonth
    : 0;

  // Aggregate by model
  const modelMap: Record<string, { cost: number; tokensIn: number; tokensOut: number; calls: number }> = {};
  for (const r of byModelRes.data ?? []) {
    const key = r.model ?? '';
    if (!modelMap[key]) modelMap[key] = { cost: 0, tokensIn: 0, tokensOut: 0, calls: 0 };
    modelMap[key].cost     += r.cost_usd   ?? 0;
    modelMap[key].tokensIn  += r.tokens_in  ?? 0;
    modelMap[key].tokensOut += r.tokens_out ?? 0;
    modelMap[key].calls++;
  }

  // Aggregate by route
  const routeMap: Record<string, number> = {};
  for (const r of byRouteRes.data ?? []) {
    routeMap[r.route] = (routeMap[r.route] ?? 0) + (r.cost_usd ?? 0);
  }

  // Top users by cost
  const userCostMap: Record<string, number> = {};
  for (const r of topUsersRes.data ?? []) {
    userCostMap[r.user_id] = (userCostMap[r.user_id] ?? 0) + (r.cost_usd ?? 0);
  }
  const topUsers = Object.entries(userCostMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, cost]) => ({ userId, cost }));

  // Daily spend for last 30 days (for sparkline)
  const dailyMap: Record<string, number> = {};
  for (const r of monthRes.data ?? []) {
    const day = r.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + (r.cost_usd ?? 0);
  }

  return NextResponse.json({
    today_usd:           todayCost,
    month_usd:           monthCost,
    projected_month_usd: projectedMonthEnd,
    days_elapsed:        daysElapsed,
    days_in_month:       daysInMonth,
    by_model:  Object.entries(modelMap).map(([model, d]) => ({ model, ...d })).sort((a, b) => b.cost - a.cost),
    by_route:  Object.entries(routeMap).map(([route, cost]) => ({ route, cost })).sort((a, b) => b.cost - a.cost),
    top_users: topUsers,
    daily:     dailyMap,
  });
}
