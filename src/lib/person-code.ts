import type { SupabaseClient } from '@supabase/supabase-js';

type ServiceClient = SupabaseClient;

const PERSON_LABELS: Record<string, string> = {
  P1: 'Principal',
  P2: 'Investor 2',
  P3: 'Investor 3',
  P4: 'Investor 4',
};

/**
 * Human-readable label for a person_code, matching the display strings
 * already used across generation-engine/partnership-analysis before this
 * scheme existed (P1 = principal/"Investor 1" context, P2 = "Investor 2").
 */
export function personLabel(code: string | null | undefined): string {
  if (!code || code === 'P1') return 'Investor 1';
  return PERSON_LABELS[code] ?? `Investor ${code.slice(1)}`;
}

/**
 * Resolves the person_code for a given family_member_id. `null` (principal,
 * the answers-table convention for "no family_member_id") resolves to 'P1'.
 */
export async function resolvePersonCode(
  svc: ServiceClient,
  userId: string,
  familyMemberId: string | null,
): Promise<string> {
  if (!familyMemberId) return 'P1';

  const { data } = await svc
    .from('family_members')
    .select('person_code')
    .eq('id', familyMemberId)
    .eq('user_id', userId)
    .maybeSingle();

  return data?.person_code ?? 'P1';
}

/**
 * Assigns the next unused person_code for a user (P2, P3, ...). Never
 * reuses a number freed by a delete — a deleted family member's documents
 * may already reference their code, so reuse would make old files ambiguous.
 */
export async function assignNextPersonCode(svc: ServiceClient, userId: string): Promise<string> {
  const { data } = await svc
    .from('family_members')
    .select('person_code')
    .eq('user_id', userId)
    .not('person_code', 'is', null);

  const maxN = (data ?? []).reduce((max, row) => {
    const n = parseInt((row as { person_code: string }).person_code.slice(1), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 1);

  return `P${maxN + 1}`;
}
