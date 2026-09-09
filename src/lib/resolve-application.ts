// Shared primary-application resolver — the single source of truth for
// "which application row is THE application" for a user.
//
// Why this exists: users accumulate multiple application rows (repeated
// /simulator/quick-start runs each create a 'simulator_standalone' row,
// re-quizzing can create another). Before this helper, different surfaces
// picked the row with four different rules (latest created / most answers /
// standalone-first / first in unspecified order), so the intake pages could
// build one case while the simulator interviewed against another.
//
// Canonical rule, applied everywhere:
//   1. Prefer real applications over 'simulator_standalone' rows.
//   2. Within that pool, prefer paid applications.
//   3. Within that, the most recently created row wins.
//
// For a user with a single application this is identical to the old
// "latest created" convention.

import type { SupabaseClient } from '@supabase/supabase-js';

interface ApplicationRankRow {
  id: string;
  source: string | null;
  payment_status: string | null;
  created_at: string;
}

export function rankApplications(apps: ApplicationRankRow[]): ApplicationRankRow | null {
  if (apps.length === 0) return null;
  const nonStandalone = apps.filter(a => a.source !== 'simulator_standalone');
  const pool = nonStandalone.length > 0 ? nonStandalone : apps;
  const paid = pool.filter(a => a.payment_status === 'paid');
  const candidates = paid.length > 0 ? paid : pool;
  return candidates.reduce((best, a) => (a.created_at > best.created_at ? a : best));
}

/**
 * Resolve the user's primary application id. Returns null when the user has
 * no applications at all. Works with both browser and server Supabase clients.
 */
export async function resolvePrimaryApplicationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('applications')
    .select('id, source, payment_status, created_at')
    .eq('user_id', userId);
  return rankApplications((data as ApplicationRankRow[] | null) ?? [])?.id ?? null;
}

/**
 * Resolve the primary application and fetch it with the caller's column
 * selection. Two queries: one to rank, one to fetch the chosen row.
 */
export async function resolvePrimaryApplication<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  userId: string,
  select = '*'
): Promise<T | null> {
  const id = await resolvePrimaryApplicationId(supabase, userId);
  if (!id) return null;
  const { data } = await supabase
    .from('applications')
    .select(select)
    .eq('id', id)
    .maybeSingle();
  return (data as T | null) ?? null;
}
