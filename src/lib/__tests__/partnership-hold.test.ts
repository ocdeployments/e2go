import {
  isPartnershipApplicationType,
  isPackageTier,
  resolvePartnershipHold,
  PACKAGE_TIER_IDS,
} from '../partnership-hold';
import type { SupabaseClient } from '@supabase/supabase-js';

type TableResult = { data: { application_type: string | null } | null; error: { message: string } | null };

/**
 * Minimal chainable stand-in for the query builder. resolvePartnershipHold
 * only ever ends a chain with .maybeSingle(), so every intermediate call
 * returns the same object and maybeSingle() resolves the canned result.
 */
function fakeSupabase(results: Record<string, TableResult>): SupabaseClient {
  const client = {
    from(table: string) {
      const result = results[table] ?? { data: null, error: null };
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: async () => result,
      };
      return chain;
    },
  };
  return client as unknown as SupabaseClient;
}

describe('isPartnershipApplicationType', () => {
  it('matches the two values the quiz actually writes', () => {
    expect(isPartnershipApplicationType('partnership')).toBe(true);
    expect(isPartnershipApplicationType('spousal_partnership')).toBe(true);
  });

  it('does not match solo, null or the legacy payment_type', () => {
    expect(isPartnershipApplicationType('solo')).toBe(false);
    expect(isPartnershipApplicationType(null)).toBe(false);
    expect(isPartnershipApplicationType(undefined)).toBe(false);
    expect(isPartnershipApplicationType('complete_partnership')).toBe(false);
  });
});

describe('isPackageTier', () => {
  it('covers every tier that produces a document package', () => {
    for (const tier of PACKAGE_TIER_IDS) {
      expect(isPackageTier(tier)).toBe(true);
    }
  });

  it('leaves add-ons and renewal outside the hold', () => {
    expect(isPackageTier('fdd_analysis_addon')).toBe(false);
    expect(isPackageTier('market_analysis_addon')).toBe(false);
    expect(isPackageTier('simulator_3pack')).toBe(false);
    expect(isPackageTier('renewal')).toBe(false);
  });
});

describe('resolvePartnershipHold', () => {
  it('holds when the quiz session classifies the case as a partnership', async () => {
    const supabase = fakeSupabase({
      quiz_sessions: { data: { application_type: 'partnership' }, error: null },
    });
    const result = await resolvePartnershipHold(supabase, 'user-1');
    expect(result.onHold).toBe(true);
    expect(result.applicationType).toBe('partnership');
    expect(result.lookupError).toBeNull();
  });

  it('holds a spousal partnership recorded only on the application', async () => {
    const supabase = fakeSupabase({
      quiz_sessions: { data: { application_type: 'solo' }, error: null },
      applications: { data: { application_type: 'spousal_partnership' }, error: null },
    });
    const result = await resolvePartnershipHold(supabase, 'user-2');
    expect(result.onHold).toBe(true);
    expect(result.applicationType).toBe('spousal_partnership');
  });

  it('lets a solo applicant through', async () => {
    const supabase = fakeSupabase({
      quiz_sessions: { data: { application_type: 'solo' }, error: null },
      applications: { data: { application_type: 'solo' }, error: null },
    });
    const result = await resolvePartnershipHold(supabase, 'user-3');
    expect(result.onHold).toBe(false);
    expect(result.lookupError).toBeNull();
  });

  it('lets a user with no quiz session and no application through', async () => {
    const supabase = fakeSupabase({});
    const result = await resolvePartnershipHold(supabase, 'user-4');
    expect(result.onHold).toBe(false);
  });

  it('fails open but reports the error when both lookups fail', async () => {
    const supabase = fakeSupabase({
      quiz_sessions: { data: null, error: { message: 'connection reset' } },
      applications: { data: null, error: { message: 'connection reset' } },
    });
    const result = await resolvePartnershipHold(supabase, 'user-5');
    expect(result.onHold).toBe(false);
    expect(result.lookupError).toContain('quiz_sessions: connection reset');
    expect(result.lookupError).toContain('applications: connection reset');
  });

  it('still holds when the quiz lookup fails but the application says partnership', async () => {
    const supabase = fakeSupabase({
      quiz_sessions: { data: null, error: { message: 'timeout' } },
      applications: { data: { application_type: 'partnership' }, error: null },
    });
    const result = await resolvePartnershipHold(supabase, 'user-6');
    expect(result.onHold).toBe(true);
  });
});
