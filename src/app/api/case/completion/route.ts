import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';
import {
  CARD_DEFINITIONS,
  INTAKE_CARD_IDS,
  getFieldsForCard,
  type CardId,
} from '@/lib/field-registry';

// The one quiz→field overlay the product has actually shipped (D-K1's exception
// clause): investment/page.tsx's own M3-F-02 midpoint prefill. D-K1's general
// "quiz values overlaid virtually" mechanism has no other producer yet, so no
// other field synthesizes a quiz-overlay row — an absent row here is accurate,
// not a gap.
const QUIZ_MIDPOINTS: Record<string, number> = {
  'Over $150,000': 175000,
  '$100,000 – $150,000': 125000,
  '$75,000 – $100,000': 87500,
  '$50,000 – $75,000': 62500,
  'Under $50,000': 35000,
};

// Registry-driven completion engine — the "one completion engine both pages
// read" from docs/ONE_ROOM_REDESIGN_PLAN.md (K-1.3). Extends, rather than
// replaces, src/app/api/apply/section-completion/route.ts's prefix-count
// logic: that route keeps running unchanged for its one existing consumer
// (onboarding step 5) during the transition.

export type CardState = 'locked' | 'not_started' | 'in_progress' | 'ready' | 'generated';

export interface CardCompletion {
  state: CardState;
  have: number;
  needed: number;
  note: string | null;
  locked?: boolean;
}

export interface PersonSummary {
  id: string;
  name: string;
  role: 'principal' | 'co_investor' | 'spouse' | 'child';
  personCode: string | null;
}

export interface NextBestAction {
  cardId: CardId;
  label: string;
  href: string;
  estimateMin: number;
  reason: string;
}

export interface CaseCompletionResponse {
  caseCode: string | null;
  applicationType: string | null;
  progressPct: number;
  people: PersonSummary[];
  cards: Partial<Record<CardId, CardCompletion>>;
  nextBestAction: NextBestAction | null;
  ordering: CardId[];
}

export type FieldSource = 'manual' | `document:${string}` | 'quiz-overlay' | 'quiz_confirmed';
export type FieldStatus = 'filled' | 'needed' | 'suggested';

export interface CardFieldDetail {
  key: string;
  label: string;
  value: string | null;
  status: FieldStatus;
  source: FieldSource | null;
  confidence: 'high' | 'medium' | 'low' | null;
  href: string;
}

export interface CardDetailResponse {
  fields: CardFieldDetail[];
}

// M3-AC-* (Application Contact) is defined in ds160-question-sets.ts but has
// no live route (see field-registry.ts). Counting its `required: true` fields
// would make security_background permanently stuck below 'ready' for every
// applicant. Excluded from completion math until it's wired to a page.
const UNWIRED_KEY_PREFIX = /^M3-AC-/;

function emptyResponse(): CaseCompletionResponse {
  return {
    caseCode: null,
    applicationType: null,
    progressPct: 0,
    people: [],
    cards: {},
    nextBestAction: {
      cardId: 'story',
      label: 'Tell us your story',
      href: CARD_DEFINITIONS.story.moduleHref,
      estimateMin: 10,
      reason: 'cold-start',
    },
    ordering: (Object.values(CARD_DEFINITIONS) as { id: CardId; order: number }[])
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id),
  };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const requestedAppId = url.searchParams.get('applicationId');
    const primaryAppId = await resolvePrimaryApplicationId(supabase, user.id);
    const applicationId = requestedAppId ?? primaryAppId;

    const cardParam = url.searchParams.get('card');

    if (!applicationId) {
      if (cardParam) {
        return NextResponse.json({ fields: [] } as CardDetailResponse, { headers: { 'Cache-Control': 'private, max-age=15' } });
      }
      return NextResponse.json(emptyResponse(), { headers: { 'Cache-Control': 'private, max-age=15' } });
    }

    if (cardParam) {
      return await buildCardDetail(supabase, applicationId, user.id, cardParam, url.searchParams.get('personId'));
    }

    const [
      { data: app },
      { data: profileRaw },
      { data: familyMembersRaw },
      { data: answersRaw },
      { data: uploadedDocsRaw },
      { count: fddCount },
      { data: simRaw },
      { data: prepKitRaw },
      { data: generatedDocsRaw },
    ] = await Promise.all([
      supabase
        .from('applications')
        .select('id, application_type, case_code, user_id')
        .eq('id', applicationId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('family_members')
        .select('id, member_type, first_name, last_name, person_code')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('answers')
        .select('question_key, answer_value, family_member_id')
        .eq('application_id', applicationId)
        .not('answer_value', 'is', null)
        .neq('answer_value', ''),
      supabase
        .from('uploaded_documents')
        .select('id', { count: 'exact', head: true })
        .eq('application_id', applicationId),
      supabase
        .from('fdd_analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),
      supabase
        .from('simulator_sessions')
        .select('session_number, completed_at')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('session_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('interview_prep_kits')
        .select('id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('generated_documents')
        .select('id', { count: 'exact', head: true })
        .eq('application_id', applicationId),
    ]);

    if (!app) {
      return NextResponse.json(emptyResponse(), { headers: { 'Cache-Control': 'private, max-age=15' } });
    }

    const familyMembers = (familyMembersRaw ?? []) as {
      id: string;
      member_type: 'co_investor' | 'spouse' | 'child';
      first_name: string | null;
      last_name: string | null;
      person_code: string | null;
    }[];

    const answers = (answersRaw ?? []) as { question_key: string; answer_value: string; family_member_id: string | null }[];

    const profile = profileRaw as { first_name: string | null; last_name: string | null } | null;
    const metaFirst = (user.user_metadata?.first_name as string | null) ?? null;
    const metaLast = (user.user_metadata?.last_name as string | null) ?? null;
    const principalName = [profile?.first_name ?? metaFirst, profile?.last_name ?? metaLast]
      .filter(Boolean)
      .join(' ') || 'You';

    const people: PersonSummary[] = [
      { id: 'principal', name: principalName, role: 'principal', personCode: app.case_code ?? null },
      ...familyMembers.map((m) => ({
        id: m.id,
        name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Family member',
        role: m.member_type,
        personCode: m.person_code,
      })),
    ];

    // Answers keyed for O(1) lookup: `${familyMemberId ?? 'principal'}::${questionKey}`
    const answerIndex = new Set(answers.map((a) => `${a.family_member_id ?? 'principal'}::${a.question_key}`));
    const hasAnswer = (personId: string, questionKey: string) =>
      answerIndex.has(`${personId === 'principal' ? 'principal' : personId}::${questionKey}`);

    const cards: Partial<Record<CardId, CardCompletion>> = {};

    // --- Principal-scoped intake cards (everything except security_background) ---
    const principalCardIds = INTAKE_CARD_IDS.filter((id) => id !== 'security_background');
    for (const cardId of principalCardIds) {
      const cardFields = getFieldsForCard(cardId).filter((f) => !UNWIRED_KEY_PREFIX.test(f.questionKey));
      const requiredFields = cardFields.filter((f) => f.required);
      const have = cardFields.filter((f) => hasAnswer('principal', f.questionKey)).length;
      const requiredHave = requiredFields.filter((f) => hasAnswer('principal', f.questionKey)).length;
      const needed = requiredFields.length - requiredHave;

      let state: CardState = 'not_started';
      if (requiredFields.length > 0 && requiredHave >= requiredFields.length) state = 'ready';
      else if (have > 0) state = 'in_progress';

      cards[cardId] = { state, have, needed, note: null };
    }

    // --- security_background: per-person, rolled up into one card ---
    {
      const cardFields = getFieldsForCard('security_background').filter((f) => !UNWIRED_KEY_PREFIX.test(f.questionKey));
      const requiredFields = cardFields.filter((f) => f.required);
      let totalHave = 0;
      let totalRequiredHave = 0;
      const perPersonNotes: string[] = [];

      for (const person of people) {
        const have = cardFields.filter((f) => hasAnswer(person.id, f.questionKey)).length;
        const requiredHave = requiredFields.filter((f) => hasAnswer(person.id, f.questionKey)).length;
        totalHave += have;
        totalRequiredHave += requiredHave;
        if (people.length > 1) {
          perPersonNotes.push(`${person.name}: ${requiredHave}/${requiredFields.length}`);
        }
      }

      const totalRequired = requiredFields.length * people.length;
      const needed = totalRequired - totalRequiredHave;
      let state: CardState = 'not_started';
      if (totalRequired > 0 && totalRequiredHave >= totalRequired) state = 'ready';
      else if (totalHave > 0) state = 'in_progress';

      cards.security_background = {
        state,
        have: totalHave,
        needed,
        note: perPersonNotes.length > 0 ? perPersonNotes.join(' · ') : null,
      };
    }

    // --- Tool cards: derived from their own tables, not the answers registry ---
    const intakeReady = principalCardIds.every((id) => cards[id]?.state === 'ready')
      && cards.security_background?.state === 'ready';

    cards.gap_analysis = {
      state: intakeReady ? 'not_started' : 'locked',
      have: 0,
      needed: 1,
      note: intakeReady ? null : 'Complete your intake first',
      locked: !intakeReady,
    };
    cards.market_analysis = { state: 'not_started', have: 0, needed: 1, note: null };
    cards.fdd_review = {
      state: (fddCount ?? 0) > 0 ? 'generated' : 'not_started',
      have: fddCount ?? 0,
      needed: (fddCount ?? 0) > 0 ? 0 : 1,
      note: null,
    };
    cards.simulator = {
      state: simRaw ? 'generated' : (intakeReady ? 'not_started' : 'locked'),
      have: simRaw ? 1 : 0,
      needed: simRaw ? 0 : 1,
      note: intakeReady ? null : 'Complete your intake first',
      locked: !simRaw && !intakeReady,
    };
    cards.prep_kit = {
      state: prepKitRaw ? 'generated' : 'not_started',
      have: prepKitRaw ? 1 : 0,
      needed: prepKitRaw ? 0 : 1,
      note: null,
    };
    cards.document_vault = {
      state: (uploadedDocsRaw ? 1 : 0) > 0 ? 'in_progress' : 'not_started',
      have: 0,
      needed: 0,
      note: null,
    };
    cards.generate_package = {
      state: (generatedDocsRaw ? 1 : 0) > 0 ? 'generated' : (intakeReady ? 'not_started' : 'locked'),
      have: 0,
      needed: intakeReady ? 1 : 0,
      note: intakeReady ? null : 'Complete your intake first',
      locked: !intakeReady,
    };

    // --- Overall progress: required-field completion across intake cards only ---
    let totalRequired = 0;
    let totalRequiredHave = 0;
    for (const cardId of INTAKE_CARD_IDS) {
      const card = cards[cardId];
      if (!card) continue;
      const requiredForCard = getFieldsForCard(cardId).filter((f) => f.required && !UNWIRED_KEY_PREFIX.test(f.questionKey));
      const multiplier = cardId === 'security_background' ? people.length : 1;
      totalRequired += requiredForCard.length * multiplier;
      totalRequiredHave += (requiredForCard.length * multiplier) - card.needed;
    }
    const progressPct = totalRequired > 0 ? Math.round((totalRequiredHave / totalRequired) * 100) : 0;

    // --- Next best action: simple ordinal rule for K-1; superseded by K-3's ranking ---
    const orderedCardIds = (Object.values(CARD_DEFINITIONS) as { id: CardId; order: number }[])
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);

    let nextBestAction: NextBestAction | null = null;
    if (progressPct === 0) {
      nextBestAction = {
        cardId: 'story',
        label: 'Tell us your story',
        href: CARD_DEFINITIONS.story.moduleHref,
        estimateMin: 10,
        reason: 'cold-start',
      };
    } else {
      const nextIncomplete = orderedCardIds.find((id) => {
        const card = cards[id];
        return card && (card.state === 'not_started' || card.state === 'in_progress');
      });
      if (nextIncomplete) {
        const def = CARD_DEFINITIONS[nextIncomplete];
        nextBestAction = {
          cardId: nextIncomplete,
          label: def.label,
          href: def.moduleHref,
          estimateMin: def.kind === 'intake' ? 8 : 15,
          reason: def.kind === 'intake' ? 'incomplete-intake' : 'next-tool',
        };
      }
    }

    const response: CaseCompletionResponse = {
      caseCode: app.case_code ?? null,
      applicationType: app.application_type ?? null,
      progressPct,
      people,
      cards,
      nextBestAction,
      ordering: orderedCardIds,
    };

    return NextResponse.json(response, { headers: { 'Cache-Control': 'private, max-age=15' } });
  } catch (err) {
    console.error('[case/completion]', err);
    return NextResponse.json(emptyResponse(), { headers: { 'Cache-Control': 'private, max-age=15' } });
  }
}

// K-1.4: GET /api/case/completion?applicationId=…&card=investment_snapshot[&personId=…]
async function buildCardDetail(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  applicationId: string,
  userId: string,
  cardParam: string,
  personIdParam: string | null,
): Promise<NextResponse> {
  const cacheHeaders = { 'Cache-Control': 'private, max-age=15' };

  if (!(cardParam in CARD_DEFINITIONS)) {
    return NextResponse.json({ error: 'Unknown card' }, { status: 400 });
  }
  const cardId = cardParam as CardId;

  // Ownership check: a client-supplied applicationId must belong to this user.
  const { data: app } = await supabase
    .from('applications')
    .select('id')
    .eq('id', applicationId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!app) {
    return NextResponse.json({ fields: [] } as CardDetailResponse, { headers: cacheHeaders });
  }

  const personId = personIdParam ?? 'principal';
  if (personId !== 'principal') {
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('id', personId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: 'Unknown person' }, { status: 400 });
    }
  }

  const familyMemberFilter = personId === 'principal' ? null : personId;

  const [{ data: answersRaw }, { data: quizSessionRaw }] = await Promise.all([
    supabase
      .from('answers')
      .select('question_key, answer_value, source_document_type, confidence, family_member_id')
      .eq('application_id', applicationId)
      .not('answer_value', 'is', null)
      .neq('answer_value', ''),
    supabase
      .from('quiz_sessions')
      .select('result_json')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const answers = (answersRaw ?? []) as {
    question_key: string;
    answer_value: string;
    source_document_type: string | null;
    confidence: 'high' | 'medium' | 'low' | null;
    family_member_id: string | null;
  }[];

  const answerByKey = new Map(
    answers
      .filter((a) => (a.family_member_id ?? 'principal') === (familyMemberFilter ?? 'principal'))
      .map((a) => [a.question_key, a]),
  );

  const quizResult = (quizSessionRaw?.result_json ?? null) as Record<string, unknown> | null;
  const investmentRange = quizResult?.investment_range as string | undefined;
  const quizMidpoint = investmentRange ? QUIZ_MIDPOINTS[investmentRange] : undefined;

  const cardFields = getFieldsForCard(cardId).filter((f) => !UNWIRED_KEY_PREFIX.test(f.questionKey));

  const fields: CardFieldDetail[] = cardFields.map((field) => {
    const answer = answerByKey.get(field.questionKey);

    if (answer) {
      const docType = answer.source_document_type;
      const source: FieldSource = !docType || docType === 'manual' ? 'manual' : `document:${docType}`;
      return {
        key: field.questionKey,
        label: field.clientLabel,
        value: answer.answer_value,
        status: 'filled',
        source,
        confidence: answer.confidence ?? null,
        href: field.moduleHref,
      };
    }

    // D-K1 exception: the one shipped quiz-overlay value (see QUIZ_MIDPOINTS above).
    if (field.questionKey === 'M3-F-02' && personId === 'principal' && quizMidpoint) {
      return {
        key: field.questionKey,
        label: field.clientLabel,
        value: String(quizMidpoint),
        status: 'filled',
        source: 'quiz-overlay',
        confidence: null,
        href: field.moduleHref,
      };
    }

    return {
      key: field.questionKey,
      label: field.clientLabel,
      value: null,
      status: 'needed',
      source: null,
      confidence: null,
      href: field.moduleHref,
    };
  });

  return NextResponse.json({ fields } as CardDetailResponse, { headers: cacheHeaders });
}
