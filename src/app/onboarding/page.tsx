'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useApplicationGate } from '@/hooks/useApplicationGate';
import ApplicationNotReadyScreen from '@/components/apply/ApplicationNotReadyScreen';
import AddFamilyMemberForm, { type NewFamilyMemberInput } from '@/components/onboarding/AddFamilyMemberForm';
import TriageSectionRow from '@/components/onboarding/TriageSectionRow';
import DocumentImportHub from '@/components/apply/DocumentImportHub';
import CaseHeader from '@/components/casefile/CaseHeader';
import { CARD_DEFINITIONS, type CardId } from '@/lib/field-registry';
import type { FamilyMember } from '@/app/api/profile/family-members/route';
import type { CaseCompletionResponse } from '@/app/api/case/completion/route';
import type { ContextualOffer } from '@/lib/case-ranking';
import {
  SECURITY_HEALTH_QUESTIONS,
  SECURITY_CRIMINAL_QUESTIONS,
  SECURITY_MORAL_QUESTIONS,
  SECURITY_IMMIGRATION_QUESTIONS,
  SECURITY_SEVERE_QUESTIONS,
  US_POC_QUESTIONS,
  TRAVEL_COMPANIONS_QUESTIONS,
} from '@/lib/ds160-question-sets';

const SECURITY_KEYS = [
  ...SECURITY_HEALTH_QUESTIONS,
  ...SECURITY_CRIMINAL_QUESTIONS,
  ...SECURITY_MORAL_QUESTIONS,
  ...SECURITY_IMMIGRATION_QUESTIONS,
  ...SECURITY_SEVERE_QUESTIONS,
].map((q) => q.key);

const DEPENDENT_EXTRA_KEYS = [...US_POC_QUESTIONS, ...TRAVEL_COMPANIONS_QUESTIONS].map((q) => q.key);

// K-4.4: stamps an application_lifecycle timestamp column the first time only —
// arrival, doc-upload, and completion events must not get overwritten on repeat visits,
// or the funnel durations computed from them (arrival→handoff, upload rate) go to zero.
async function stampLifecycleOnce(
  supabase: ReturnType<typeof createBrowserSupabaseClient>,
  userId: string,
  column: 'first_entry' | 'onboarding_doc_uploaded_at' | 'onboarding_completed_at',
) {
  const { data: existing } = await supabase
    .from('application_lifecycle')
    .select(column)
    .eq('user_id', userId)
    .maybeSingle();
  if (existing && (existing as Record<string, unknown>)[column]) return;
  await supabase
    .from('application_lifecycle')
    .upsert({ user_id: userId, [column]: new Date().toISOString() }, { onConflict: 'user_id' });
}

// K-5.2: title/help copy for the 3 contextual-offer ids computeContextualOffers()
// can emit. Keyed narrowly to those ids — the other 2 REFERRAL_CATEGORIES from the
// pre-K-5 step-1 checkbox block (immigration, business_formation) have no
// contextual trigger yet and are intentionally not offered anywhere in onboarding.
const OFFER_TITLES: Record<ContextualOffer['id'], string> = {
  franchise: 'Franchise Consultant',
  banking: 'Cross-border Banking',
  accountant: 'Cross-border Accountant',
};

// K-5.4: onboarding's step-5 triage list is registry-driven — every intake
// card in CARD_DEFINITIONS with category 'case_file', ordered by
// /api/case/completion's ordering (never a separately hand-maintained list).
const CARD_DESCRIPTIONS: Record<CardId, string> = {
  investor_profile: 'Identity, contact details, and travel history',
  story: 'Background, motivation, and career narrative',
  business_details: 'Entity structure, operations, and business plan',
  investment_snapshot: 'Investment amount, source of funds, financials',
  qualifications: 'Education, work history, relevant experience',
  family_dependents: 'Spouse and dependents joining your application',
  ties: 'Travel history and ties to your home country',
  security_background: 'Health, criminal history, immigration, and security questions',
  gap_analysis: 'Where your case is strong and where it needs work',
  market_analysis: 'Territory and market data for your business',
  fdd_review: 'Franchise Disclosure Document analysis',
  simulator: 'Practice your consular interview',
  prep_kit: 'Your interview preparation materials',
  document_vault: 'All uploaded and generated documents',
  generate_package: 'Generate your application package',
};

function cardHref(cardId: CardId): string {
  if (cardId === 'security_background') return '/apply/security/principal';
  return CARD_DEFINITIONS[cardId].moduleHref;
}

function cardProgressPct(card: { state: string; have: number; needed: number } | undefined): number {
  if (!card) return 0;
  if (card.state === 'ready' || card.state === 'generated') return 100;
  const total = card.have + card.needed;
  if (total <= 0) return 0;
  return Math.round((card.have / total) * 100);
}

function cardStatus(card: { state: string } | undefined): 'none' | 'partial' | 'complete' {
  if (!card) return 'none';
  if (card.state === 'not_started' || card.state === 'locked') return 'none';
  if (card.state === 'ready' || card.state === 'generated') return 'complete';
  return 'partial';
}

function ContextualOfferCard({
  offer,
  response,
  onRespond,
}: {
  offer: ContextualOffer;
  response: boolean | undefined;
  onRespond: (consentGiven: boolean) => void;
}) {
  if (response !== undefined) {
    return (
      <div className="border border-[rgba(201,168,76,0.2)] p-4 text-[13px] text-[#f5f0e8]/50">
        {response ? `We'll pass your details to a ${OFFER_TITLES[offer.id].toLowerCase()}.` : 'No thanks — noted.'}
      </div>
    );
  }
  return (
    <div className="border border-[rgba(201,168,76,0.2)] p-5">
      <div className="text-[13px] font-medium text-[#f5f0e8] mb-1">{OFFER_TITLES[offer.id]}</div>
      <div className="text-[13px] text-[#f5f0e8]/60 mb-4">{offer.copy}</div>
      <div className="flex gap-3">
        <button onClick={() => onRespond(true)} className="px-4 py-2 bg-[#C9A84C] text-[#0a0a0a] text-[12px] font-medium uppercase tracking-[0.1em] hover:bg-[#D4BC6A] transition-colors">
          Connect me
        </button>
        <button onClick={() => onRespond(false)} className="px-4 py-2 border border-[rgba(201,168,76,0.3)] text-[#f5f0e8]/60 text-[12px] uppercase tracking-[0.1em] hover:border-[rgba(201,168,76,0.5)] transition-colors">
          No thanks
        </button>
      </div>
    </div>
  );
}

interface QuizSessionRow {
  application_type: 'solo' | 'partnership' | null;
}

type Step = 1 | 2 | 3 | 4 | 5;

export default function OnboardingPage() {
  const router = useRouter();
  const { status, applicationId, retry } = useApplicationGate();
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>(1);

  const [quizSession, setQuizSession] = useState<QuizSessionRow | null>(null);
  const [fullName, setFullName] = useState('');
  const [module1Complete, setModule1Complete] = useState(false);

  // Consent step state
  const [tosAccepted, setTosAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [caslConsent, setCaslConsent] = useState<boolean | null>(null);
  const [savingConsent, setSavingConsent] = useState(false);

  // Family setup state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [addFormType, setAddFormType] = useState<'co_investor' | 'spouse' | 'child' | null>(null);

  // Completion state
  const [answeredKeys, setAnsweredKeys] = useState<Record<string, Set<string>>>({});
  const [caseCompletion, setCaseCompletion] = useState<CaseCompletionResponse | null>(null);
  const [importAppliedNotice, setImportAppliedNotice] = useState<string | null>(null);

  // K-5.2: contextual referral offers — id -> the consent value the user picked, so
  // an offer's buttons disable after a response instead of re-firing the upsert.
  const [offerResponses, setOfferResponses] = useState<Record<string, boolean>>({});

  const loadAll = useCallback(async (appId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [quizRes, profileRes, appRes, membersRes, answersRes, completionRes] = await Promise.all([
      supabase.from('quiz_sessions').select('application_type')
        .eq('user_id', user.id).order('id', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle(),
      supabase.from('applications').select('module_1_complete').eq('id', appId).maybeSingle(),
      fetch('/api/profile/family-members').then((r) => r.json()),
      supabase.from('answers').select('question_key, answer_value, family_member_id')
        .eq('application_id', appId).not('answer_value', 'is', null).neq('answer_value', ''),
      fetch('/api/case/completion').then((r) => r.json()),
    ]);

    if (quizRes.data) setQuizSession(quizRes.data);
    if (profileRes.data) {
      setFullName(`${profileRes.data.first_name || ''} ${profileRes.data.last_name || ''}`.trim());
    }
    const isModule1Complete = !!appRes.data?.module_1_complete;
    setModule1Complete(isModule1Complete);
    setFamilyMembers(membersRes.members ?? []);
    setCaseCompletion(completionRes);

    const bucket: Record<string, Set<string>> = { principal: new Set() };
    for (const row of (answersRes.data ?? [])) {
      const bucketKey = row.family_member_id ?? 'principal';
      if (!bucket[bucketKey]) bucket[bucketKey] = new Set();
      bucket[bucketKey].add(row.question_key);
    }
    setAnsweredKeys(bucket);

    setStep(isModule1Complete ? 2 : 1);
    setLoading(false);
  }, [supabase]);

  const handleFieldsApplied = useCallback(async (count: number) => {
    const completionRes: CaseCompletionResponse = await fetch('/api/case/completion').then((r) => r.json());
    setCaseCompletion(completionRes);
    const qualificationsPct = cardProgressPct(completionRes.cards.qualifications);
    setImportAppliedNotice(
      `Résumé applied — ${count} field${count === 1 ? '' : 's'} filled · Qualifications now ${qualificationsPct}%`,
    );
    setTimeout(() => setImportAppliedNotice(null), 5000);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) stampLifecycleOnce(supabase, user.id, 'onboarding_doc_uploaded_at');
  }, [supabase]);

  const handleOfferResponse = async (offerId: string, consentGiven: boolean) => {
    setOfferResponses((prev) => ({ ...prev, [offerId]: consentGiven }));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('referral_consents').upsert(
      { user_id: user.id, category: offerId, consent_given: consentGiven },
      { onConflict: 'user_id,category' },
    );
  };

  useEffect(() => {
    if (status === 'ready' && applicationId) {
      loadAll(applicationId);
    }
  }, [status, applicationId, loadAll]);

  useEffect(() => {
    if (status !== 'ready' || !applicationId) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) stampLifecycleOnce(supabase, user.id, 'first_entry');
    })();
    // Fires once per arrival at /onboarding, independent of consent completion —
    // see stampLifecycleOnce above for why this must be a true arrival mark.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, applicationId]);

  useEffect(() => {
    if (status === 'no-user') router.push('/login?next=/onboarding');
  }, [status, router]);

  const handleSaveConsent = async () => {
    setSavingConsent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !applicationId) return;

      if (tosAccepted) {
        await fetch('/api/consent/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent_type: 'tos', consent_given: true }),
        });
      }
      if (privacyAccepted) {
        await fetch('/api/consent/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consent_type: 'privacy', consent_given: true }),
        });
      }
      if (caslConsent !== null) {
        // Checked, because this write failed silently for months: the column
        // did not exist, supabase-js returned the error rather than throwing,
        // and nothing looked at it. Consent is not something to lose quietly.
        const { error: consentError } = await supabase
          .from('profiles')
          .update({
            casl_marketing_consent: caslConsent,
            casl_marketing_consent_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (consentError) {
          console.error('[onboarding] failed to record marketing consent:', consentError);
        }
      }

      const derivedType = quizSession?.application_type === 'partnership' ? 'partnership' : 'solo';
      await supabase.from('applications').update({
        application_type: derivedType,
        processing_path: derivedType,
        module_1_complete: true,
      }).eq('id', applicationId);

      await supabase.from('application_lifecycle').upsert({
        user_id: user.id,
        module1_completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      setModule1Complete(true);
      setStep(2);
    } finally {
      setSavingConsent(false);
    }
  };

  const handleReachStep5 = async () => {
    setStep(5);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) stampLifecycleOnce(supabase, user.id, 'onboarding_completed_at');
  };

  const handleAddFamilyMember = async (input: NewFamilyMemberInput) => {
    const res = await fetch('/api/profile/family-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const { member } = await res.json();
      setFamilyMembers((prev) => [...prev, member]);
      setAddFormType(null);
    }
  };

  const securityStatus = (bucketKey: string, isDependent: boolean): 'none' | 'partial' | 'complete' => {
    const answered = answeredKeys[bucketKey] ?? new Set<string>();
    const relevantKeys = isDependent ? [...SECURITY_KEYS, ...DEPENDENT_EXTRA_KEYS] : SECURITY_KEYS;
    const have = relevantKeys.filter((k) => answered.has(k)).length;
    if (have === 0) return 'none';
    if (have >= relevantKeys.length) return 'complete';
    return 'partial';
  };

  const isConsentValid = tosAccepted && privacyAccepted && caslConsent !== null;

  if (status === 'loading' || (status === 'ready' && loading)) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#C9A84C] font-[DM_Sans] text-sm tracking-widest uppercase">Loading…</div>
      </div>
    );
  }

  if (status === 'no-user') {
    return null;
  }

  if (status === 'not-ready') {
    return <ApplicationNotReadyScreen onRetry={retry} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
      <header className="fixed top-16 left-0 right-0 z-20 bg-[#0a0a0a] border-b border-[rgba(201,168,76,0.2)]">
        <div className="flex items-center justify-center gap-8 h-14 px-6 max-w-4xl mx-auto">
          {(['Consent', 'Family', 'DS-160', 'Documents', 'Next steps'] as const).map((label, idx) => {
            const s = (idx + 1) as Step;
            const isActive = step === s;
            const isDisabled = s > 1 && !module1Complete;
            return (
              <button
                key={label}
                onClick={() => !isDisabled && setStep(s)}
                disabled={isDisabled}
                className={`text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  isActive ? 'text-[#C9A84C]' : isDisabled ? 'text-[#f5f0e8]/20 cursor-not-allowed' : 'text-[#f5f0e8]/50 hover:text-[#f5f0e8]/80'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="relative z-10 pt-32 pb-16 px-6 md:px-12 max-w-4xl mx-auto">
        {caseCompletion && (
          <div className="mb-8">
            <CaseHeader
              caseCode={caseCompletion.caseCode}
              packageLabel={caseCompletion.applicationType === 'partnership' ? 'Partnership' : caseCompletion.applicationType === 'solo' ? 'Solo' : null}
              people={caseCompletion.people}
              progressPct={caseCompletion.progressPct}
              nextBestAction={caseCompletion.nextBestAction}
            />
          </div>
        )}

        {step === 1 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4ADE80]" />
              <span className="text-[11px] uppercase tracking-[0.1em] text-[#4ADE80]">Payment received</span>
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Welcome</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Your case file is open{fullName ? `, ${fullName}` : ''}
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Before we set up your case file, please review a few consents.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {[
                { n: 1, label: 'Add your people', help: 'Family, co-investors, security background' },
                { n: 2, label: 'Upload documents', help: 'We pre-fill fields automatically' },
                { n: 3, label: 'Open your case file', help: "See what's left to build your package" },
              ].map((s) => (
                <div key={s.n} className="border border-[rgba(201,168,76,0.2)] p-4">
                  <div className="text-[11px] uppercase tracking-[0.1em] text-[#C9A84C] mb-1">Step {s.n}</div>
                  <div className="text-[14px] font-medium text-[#f5f0e8] mb-1">{s.label}</div>
                  <div className="text-[12px] text-[#f5f0e8]/50">{s.help}</div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#f5f0e8]/40 mb-8">About 10–15 minutes total, based on the average time filers spend per section.</p>

            <div className="border-l-[3px] border-[#C9A84C] bg-[rgba(201,168,76,0.04)] p-6 mb-8">
              <p className="text-[14px] text-[#f5f0e8]/80 leading-relaxed">
                <span className="text-[#C9A84C] font-medium">Data Retention Notice:</span> Your application data is retained until 90 days after your visa outcome is confirmed, then permanently deleted. You can download your complete record at any time.
              </p>
            </div>

            <div className="space-y-5 mb-10">
              <label className="flex items-start gap-4 cursor-pointer group">
                <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-[#C9A84C]" />
                <span className="text-[14px] text-[#f5f0e8]/80 group-hover:text-[#f5f0e8] transition-colors">
                  I have read and agree to the <Link href="/terms" target="_blank" className="text-[#C9A84C] underline">Terms of Service</Link>
                </span>
              </label>
              <label className="flex items-start gap-4 cursor-pointer group">
                <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 w-4 h-4 accent-[#C9A84C]" />
                <span className="text-[14px] text-[#f5f0e8]/80 group-hover:text-[#f5f0e8] transition-colors">
                  I have read and agree to the <Link href="/privacy" target="_blank" className="text-[#C9A84C] underline">Privacy Policy</Link>
                </span>
              </label>
            </div>

            <div className="mb-10">
              <label className="block text-[12px] font-medium uppercase tracking-[0.12em] text-[#f5f0e8]/60 mb-4">
                Stay informed on E-2 processing times and preparation tips?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button onClick={() => setCaslConsent(true)} className={`text-left p-5 border transition-all duration-200 ${caslConsent === true ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.06)]' : 'border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]'}`}>
                  <div className="text-[15px] font-medium mb-1">Yes, keep me informed</div>
                  <div className="text-[13px] text-[#f5f0e8]/50">Unsubscribe anytime.</div>
                </button>
                <button onClick={() => setCaslConsent(false)} className={`text-left p-5 border transition-all duration-200 ${caslConsent === false ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.06)]' : 'border-[rgba(201,168,76,0.2)] hover:border-[rgba(201,168,76,0.4)]'}`}>
                  <div className="text-[15px] font-medium mb-1">No thanks</div>
                  <div className="text-[13px] text-[#f5f0e8]/50">Just essential updates.</div>
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-12">
              <button
                onClick={handleSaveConsent}
                disabled={!isConsentValid || savingConsent}
                className={`px-8 py-4 text-[14px] font-medium uppercase tracking-[0.12em] transition-all duration-200 ${
                  isConsentValid && !savingConsent ? 'bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A]' : 'bg-[rgba(201,168,76,0.2)] text-[#f5f0e8]/20 cursor-not-allowed'
                }`}
              >
                {savingConsent ? 'Saving…' : 'Continue →'}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Family & Co-Investors</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Who else is on this application?
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Add your spouse, children, or a co-investor. We&apos;ll build a separate DS-160-style intake for each person you add.
            </p>

            <div className="space-y-3 mb-6">
              {familyMembers.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-4 border border-[rgba(201,168,76,0.2)]">
                  <div>
                    <div className="text-[15px] text-[#f5f0e8] flex items-center gap-2">
                      {m.first_name} {m.last_name}
                      {m.person_code && (
                        <span className="text-[10px] uppercase tracking-[0.08em] text-[#C9A84C] border border-[rgba(201,168,76,0.4)] px-1.5 py-0.5">
                          {m.person_code}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#f5f0e8]/50 capitalize">{m.member_type === 'co_investor' ? `Co-investor${m.role ? ` — ${m.role}` : ''}` : m.member_type}</div>
                  </div>
                </div>
              ))}
              {familyMembers.length === 0 && !addFormType && (
                <p className="text-[13px] text-[#f5f0e8]/40 italic">No one added yet.</p>
              )}
            </div>

            {addFormType ? (
              <AddFamilyMemberForm
                defaultType={addFormType}
                initialFirstName=""
                initialLastName=""
                onCancel={() => setAddFormType(null)}
                onSubmit={handleAddFamilyMember}
              />
            ) : (
              <button
                onClick={() => setAddFormType('spouse')}
                className="px-6 py-3 border border-[rgba(201,168,76,0.4)] text-[#C9A84C] text-[13px] uppercase tracking-[0.1em] hover:bg-[rgba(201,168,76,0.06)] transition-colors"
              >
                + Add a family member or co-investor
              </button>
            )}

            <div className="flex justify-end mt-12">
              <button onClick={() => setStep(3)} className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors">
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Security & Background</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              DS-160-style questions, per person
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Every filer — including dependents — answers these individually.
            </p>

            <div className="space-y-3 mb-8">
              <TriageSectionRow
                label={fullName || 'Principal applicant'}
                description="Health, criminal history, immigration, and security questions"
                href="/apply/security/principal"
                status={securityStatus('principal', false)}
              />
              {familyMembers.map((m) => (
                <TriageSectionRow
                  key={m.id}
                  label={`${m.first_name} ${m.last_name}`}
                  description="Security & background, plus point-of-contact and travel companion details"
                  href={`/apply/security/${m.id}`}
                  status={securityStatus(m.id, true)}
                  badge={m.person_code ?? undefined}
                />
              ))}
            </div>

            <div className="flex justify-end mt-12">
              <button onClick={() => setStep(4)} className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors">
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Documents</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Speed things up with a few uploads
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Upload a passport, resume, FDD, or birth certificate — for you or anyone you added — and we&apos;ll pre-fill fields across your application automatically. Optional: skip this and upload later from your case file.
            </p>

            <DocumentImportHub
              applicationId={applicationId}
              onFieldsApplied={handleFieldsApplied}
              suggestedDocOrder={caseCompletion?.docTypeOrdering}
              defaultOpen
            />

            {importAppliedNotice && (
              <div className="mt-4 px-4 py-3 border border-[rgba(74,222,128,0.3)] bg-[rgba(74,222,128,0.08)] text-[#4ADE80] text-[13px] font-['DM_Sans']">
                {importAppliedNotice}
              </div>
            )}

            {caseCompletion?.contextualOffers.filter((o) => o.id === 'franchise').map((offer) => (
              <div key={offer.id} className="mt-6">
                <ContextualOfferCard offer={offer} response={offerResponses[offer.id]} onRespond={(v) => handleOfferResponse(offer.id, v)} />
              </div>
            ))}

            <div className="flex justify-end mt-12">
              <button onClick={handleReachStep5} className="px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[#D4BC6A] transition-colors">
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="border border-[rgba(201,168,76,0.2)] bg-[#0a0a0a] p-8 md:p-12">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#C9A84C] mb-4">Next Steps</div>
            <h1 className="font-['Cormorant_Garamond'] text-[32px] md:text-[42px] font-light leading-tight mb-6">
              Your case file
            </h1>
            <p className="text-[#f5f0e8]/60 text-[16px] leading-relaxed mb-8 max-w-2xl">
              Here&apos;s what&apos;s left to build your application package.
            </p>

            <div className="space-y-3 mb-8">
              {(caseCompletion?.ordering ?? [])
                .filter((id) => CARD_DEFINITIONS[id].kind === 'intake')
                .map((id) => {
                  const card = caseCompletion?.cards[id];
                  const def = CARD_DEFINITIONS[id];
                  return (
                    <TriageSectionRow
                      key={id}
                      label={def.label}
                      description={CARD_DESCRIPTIONS[id]}
                      href={cardHref(id)}
                      status={cardStatus(card)}
                      progressPct={cardProgressPct(card)}
                      sourceChip={card?.note ?? undefined}
                      badge={caseCompletion?.nextBestAction?.cardId === id ? 'Start here' : undefined}
                    />
                  );
                })}
            </div>

            {caseCompletion?.contextualOffers.filter((o) => o.id === 'banking' || o.id === 'accountant').map((offer) => (
              <div key={offer.id} className="mb-4">
                <ContextualOfferCard offer={offer} response={offerResponses[offer.id]} onRespond={(v) => handleOfferResponse(offer.id, v)} />
              </div>
            ))}

            <div className="flex justify-end mt-12">
              <Link href="/case-profile" className="px-8 py-4 border border-[rgba(201,168,76,0.4)] text-[#C9A84C] text-[14px] font-medium uppercase tracking-[0.12em] hover:bg-[rgba(201,168,76,0.06)] transition-colors">
                Open your case file{caseCompletion?.caseCode ? ` — ${caseCompletion.caseCode}` : ''} →
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
