// K-3 — Triage Intelligence (docs/ONE_ROOM_REDESIGN_PLAN.md). Ordering and
// recommendations computed from the quiz profile + card completion state,
// rather than the fixed registry-order arrays K-1/K-2 shipped with.
//
// Cold start (D-K4 — no application at all) is NOT handled here; the caller
// (/api/case/completion) keeps that special case (progressPct === 0 →
// hardcoded "Tell us your story") before ever calling rankCards.

import { CARD_DEFINITIONS, type CardId } from './field-registry';
import type { CardCompletion, NextBestAction } from '@/app/api/case/completion/route';
import type { DocTypeValue } from '@/components/apply/DocumentImportHub';

// Flag code → the card whose fields resolve it. Sourced from each code's
// `question_id` in src/data/flag_explanations.json, mapped to the M3-* field
// cluster that question feeds (see field-registry.ts card assignments).
const FLAG_CARD_MAP: Partial<Record<string, CardId>> = {
  'W-FAMILY-GIFT': 'investment_snapshot',
  'W-LOAN-FUNDED': 'investment_snapshot',
  'W-RRSP': 'investment_snapshot',
  'W-LOW-INVESTMENT': 'investment_snapshot',
  'W-BORDERLINE-INVESTMENT': 'investment_snapshot',
  'PR-LOW-INVESTMENT': 'investment_snapshot',
  'W-PARTNERSHIP-SPLIT': 'business_details',
  'W-NO-BIZ-IDENTIFIED': 'business_details',
  'W-MARGINALITY': 'business_details',
  'W-MARGINALITY-ACQUISITION': 'business_details',
  'PR-PASSIVE-INVEST': 'business_details',
  'PR-NONPROFIT': 'business_details',
  'W-OVER-21': 'family_dependents',
  'W-REFUSAL-RECENT': 'qualifications',
  'W-REFUSAL-OLD': 'qualifications',
  'W-REFUSAL-MULTIPLE': 'qualifications',
  'W-ENTRY-REFUSED': 'security_background',
  'W-DEPORTED': 'security_background',
  'W-CONVICTION-RECENT': 'security_background',
};

export interface QuizProfileSignals {
  franchiseInterest: boolean;
  /** Union of hard_stop_codes + attorney_flag_codes + risk_flag_codes. */
  flagCodes: string[];
  /** Raw Q0-08a answer text ("A franchise…", "An existing independent business I am acquiring", …). */
  businessTypeAnswer: string | null;
  /** Quiz country of citizenship/residence — used for the departure-tax heuristic. */
  country: string | null;
  /** Raw Q0-06 answer (funding sources), flattened to a lowercase string for keyword matching. */
  fundingSourcesText: string;
}

export interface ContextualOffer {
  id: 'franchise' | 'banking' | 'accountant';
  when: string;
  copy: string;
}

export interface RankResult {
  ordering: CardId[];
  nextBestAction: NextBestAction | null;
}

type CardDef = { id: CardId; order: number; label: string; kind: 'intake' | 'tool'; moduleHref: string };
const ALL_CARDS = Object.values(CARD_DEFINITIONS) as CardDef[];

// Tiers (higher = ranked first) keep the ordering's big picture stable —
// nothing in "within tier" scoring can push a card across a tier boundary.
// 5 = actionable intake card with an unresolved flag pointing at it
// 4 = actionable intake card
// 3 = actionable tool card
// 2 = already ready/generated
// 1 = locked
function tierOf(def: CardDef, card: CardCompletion | undefined, flaggedCardIds: Set<CardId>): number {
  if (!card) return 0;
  if (card.locked) return 1;
  if (card.state === 'ready' || card.state === 'generated') return 2;
  if (def.kind === 'tool') return 3;
  return flaggedCardIds.has(def.id) ? 5 : 4;
}

// Tie-breaker inside a tier: registry order first, then a small nudge for
// cards that are nearly done (quick win) or for FDD review when the case is
// franchise-interested.
function withinTierScore(def: CardDef, card: CardCompletion | undefined, franchiseInterest: boolean): number {
  let score = 1000 - def.order;
  if (card) score += Math.max(0, 10 - card.needed);
  if (def.id === 'fdd_review' && franchiseInterest) score += 50;
  return score;
}

// K-3.1 — next-best-action ranking.
export function rankCards(
  cards: Partial<Record<CardId, CardCompletion>>,
  profile: Pick<QuizProfileSignals, 'franchiseInterest' | 'flagCodes'>,
): RankResult {
  const flaggedCardIds = new Set(
    profile.flagCodes.map((code) => FLAG_CARD_MAP[code]).filter((id): id is CardId => Boolean(id)),
  );

  const ordering = [...ALL_CARDS]
    .sort((a, b) => {
      const tierDiff = tierOf(b, cards[b.id], flaggedCardIds) - tierOf(a, cards[a.id], flaggedCardIds);
      if (tierDiff !== 0) return tierDiff;
      return (
        withinTierScore(b, cards[b.id], profile.franchiseInterest) -
        withinTierScore(a, cards[a.id], profile.franchiseInterest)
      );
    })
    .map((d) => d.id);

  const actionableId = ordering.find((id) => {
    const c = cards[id];
    return c && !c.locked && c.state !== 'ready' && c.state !== 'generated';
  });

  if (!actionableId) return { ordering, nextBestAction: null };

  const def = CARD_DEFINITIONS[actionableId];
  const card = cards[actionableId]!;
  const reason = flaggedCardIds.has(actionableId)
    ? 'resolve-flag'
    : def.kind === 'tool'
      ? (def.id === 'fdd_review' && profile.franchiseInterest ? 'franchise-priority' : 'next-tool')
      : (card.needed > 0 && card.needed <= 2 ? 'quick-win' : 'incomplete-intake');

  return {
    ordering,
    nextBestAction: {
      cardId: actionableId,
      label: def.label,
      href: def.moduleHref,
      estimateMin: def.kind === 'intake' ? 8 : 15,
      reason,
    },
  };
}

// K-3.2 — doc-type suggestion ordering. Returns a short priority list; the
// consumer (DocumentImportHub) places these first and appends the remaining
// options in their existing order — the full 17-type list is never narrowed.
export function rankDocTypes(profile: Pick<QuizProfileSignals, 'franchiseInterest' | 'businessTypeAnswer'>): DocTypeValue[] {
  if (profile.franchiseInterest) {
    return ['fdd', 'franchise_agreement', 'investment_records', 'business_plan'];
  }
  const answer = (profile.businessTypeAnswer ?? '').toLowerCase();
  if (answer.includes('acquiring')) {
    return ['acquisition_financials', 'lease_agreement', 'investment_records', 'organizational_document'];
  }
  return ['business_plan', 'investment_records', 'financial_statement', 'lease_agreement'];
}

// K-3.3 — contextual referral rules. Computed only; no UI consumes this yet
// (plan doc: "UI is K-5/D-K5"). Reuses the category ids already defined in
// REFERRAL_CATEGORIES (src/app/apply/module1/page.tsx / onboarding/page.tsx)
// so a future UI can wire straight into the existing referral_consents table.
const DEPARTURE_TAX_COUNTRIES = new Set(['Canada', 'Australia', 'South Africa']);
const ASSET_FUNDING_SIGNALS = ['savings', 'property', 'business or investment', 'retirement'];

export function computeContextualOffers(
  profile: Pick<QuizProfileSignals, 'franchiseInterest' | 'country' | 'fundingSourcesText'>,
  fddCount: number,
): ContextualOffer[] {
  const offers: ContextualOffer[] = [];

  if (profile.franchiseInterest && fddCount === 0) {
    offers.push({
      id: 'franchise',
      when: 'franchise_interest && no FDD uploaded',
      copy: 'Connect with a franchise consultant to help you pick an E-2 compatible brand and get the FDD.',
    });
  }

  if (ASSET_FUNDING_SIGNALS.some((s) => profile.fundingSourcesText.includes(s))) {
    offers.push({
      id: 'banking',
      when: 'source-of-funds answers indicate an asset or account held abroad',
      copy: 'Cross-border banking specialists can help you open and fund a U.S. business account.',
    });
  }

  if (profile.country && DEPARTURE_TAX_COUNTRIES.has(profile.country)) {
    offers.push({
      id: 'accountant',
      when: 'home country has departure/exit-tax exposure',
      copy: 'A cross-border accountant can plan around departure tax before you relocate.',
    });
  }

  return offers;
}
