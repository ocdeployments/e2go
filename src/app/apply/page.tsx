'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import CaseFileHeader from '@/components/apply/CaseFileHeader';
import SectionCard from '@/components/apply/SectionCard';
import GenerateStrip from '@/components/apply/GenerateStrip';
import DocumentUploadCard from '@/components/apply/DocumentUploadCard';
import type { PreparationStatus } from '@/types/document-upload';

interface SectionManifest {
  number: string;
  title: string;
  subtitle: string;
  documents: { label: string; primary: boolean }[];
  prefillCount: number;
  completionPct: number;
  status: 'complete' | 'active' | 'not_started' | 'waiting';
  href: string;
  badge?: string;
}

const SOLO_SECTIONS = [
  {
    number: '01',
    title: 'Your Story',
    subtitle: 'Cover letter narrative and personal background',
    documents: [
      { label: 'Cover Letter', primary: true },
      { label: 'Investor Bio', primary: false },
    ],
    route: 'story',
    // M3-S1- = narrative questions; M3-A- = administrative/personal; QA-/QD- = document extraction keys
    questionPrefixes: ['M3-S1-', 'M3-A-', 'QA-', 'QD-'],
  },
  {
    number: '02',
    title: 'Your Business',
    subtitle: 'Entity details, operations, and market',
    documents: [
      { label: 'Business Plan', primary: true },
      { label: 'Visa Category', primary: false },
    ],
    route: 'business',
    // QE- = entity type; QK- = business description — document extraction aliases
    questionPrefixes: ['M3-E-', 'M3-G-', 'M3-K-', 'QE-', 'QK-'],
  },
  {
    number: '03',
    title: 'Your Investment',
    subtitle: 'Funding source, paper trail, and projections',
    documents: [
      { label: 'Source of Funds', primary: true },
      { label: 'Investment Proof', primary: false },
    ],
    route: 'investment',
    // M3-I- = projection questions (revenue/employees); QF-/QH-/QI- = document extraction aliases
    questionPrefixes: ['M3-F-', 'M3-H-', 'M3-I-', 'QF-', 'QH-', 'QI-'],
  },
  {
    number: '04',
    title: 'Your Qualifications',
    subtitle: 'Experience, education, and organisational structure',
    documents: [
      { label: 'Qualifications', primary: true },
    ],
    route: 'qualifications',
    // M3-Q- = qualifications; M3-V- = visa history; QJ- = document extraction alias
    questionPrefixes: ['M3-Q-', 'M3-V-', 'QJ-'],
  },
  {
    number: '05',
    title: 'Your Family',
    subtitle: 'Dependents and family documentation',
    documents: [
      { label: 'Family Docs', primary: true },
    ],
    route: 'family',
    questionPrefixes: ['M3-L-'],
    conditional: true,
  },
  {
    number: '06',
    title: 'Your Ties',
    subtitle: 'Home country ties and non-marginality',
    documents: [
      { label: 'Non-Marginality', primary: true },
    ],
    route: 'ties',
    // M3-T- = ties/non-marginality questions (was wrongly set to M3-I- before)
    questionPrefixes: ['M3-T-'],
  },
];

const TOTAL_QUESTIONS_PER_SECTION = [8, 12, 10, 6, 6, 6];

export default function ApplyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [applicantName, setApplicantName] = useState<string | null>(null);
  const [nationality, setNationality] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [targetCity, setTargetCity] = useState<string | null>(null);
  const [investmentAmount, setInvestmentAmount] = useState<string | null>(null);
  const [applicationType, setApplicationType] = useState<'solo' | 'partnership' | 'cos'>('solo');
  const [lastActiveSection, setLastActiveSection] = useState<string | null>(null);
  const [lastActiveCluster, setLastActiveCluster] = useState<number | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const [hasDependents, setHasDependents] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [preparationStatus, setPreparationStatus] = useState<PreparationStatus>('scratch');

  const [answerCounts, setAnswerCounts] = useState<Record<string, number>>({});
  const [prefillCounts] = useState<Record<string, number>>({});
  const [priorityDismissed, setPriorityDismissed] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserSupabaseClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Load profile (table has first_name + last_name, not full_name)
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        if (profile?.first_name) {
          const full = [profile.first_name, profile.last_name].filter(Boolean).join(' ');
          setApplicantName(full);
        }

        // Load latest application
        const { data: apps } = await supabase
          .from('applications')
          .select('id, application_type, status, last_active_section, last_active_cluster, preparation_status')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (apps && apps.length > 0) {
          const app = apps[0];
          if (app.application_type) {
            setApplicationType(app.application_type as 'solo' | 'partnership' | 'cos');
          }
          if (app.last_active_section) {
            setLastActiveSection(app.last_active_section as string);
            setIsReturning(true);
          }
          if (app.last_active_cluster) {
            setLastActiveCluster(app.last_active_cluster as number);
          }
          if (app.preparation_status) {
            setPreparationStatus(app.preparation_status as PreparationStatus);
          }

          // Load answers for this application
          const { data: answers } = await supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', app.id);

          if (answers) {
            const counts: Record<string, number> = {};

            answers.forEach((row: { question_key: string; answer_value: string | string[] | number | null }) => {
              if (row.answer_value !== null && row.answer_value !== '' && row.answer_value !== undefined) {
                for (const section of SOLO_SECTIONS) {
                  const matches = section.questionPrefixes.some(p => row.question_key.startsWith(p));
                  if (matches) {
                    counts[section.route] = (counts[section.route] || 0) + 1;
                    break;
                  }
                }
              }
            });

            setAnswerCounts(counts);
          }

          // Try to get business name, city, and investment from answers
          const appId = app.id;

          const { data: bizAnswers } = await supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', appId)
            .eq('question_key', 'M3-E-01')
            .limit(1);

          if (bizAnswers && bizAnswers.length > 0 && bizAnswers[0].answer_value) {
            setBusinessName(String(bizAnswers[0].answer_value));
          }

          const { data: cityAnswers } = await supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', appId)
            .eq('question_key', 'M3-A-52')
            .limit(1);

          if (cityAnswers && cityAnswers.length > 0 && cityAnswers[0].answer_value) {
            setTargetCity(String(cityAnswers[0].answer_value));
          }

          const { data: investAnswers } = await supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', appId)
            .eq('question_key', 'M3-F-02')
            .limit(1);

          if (investAnswers && investAnswers.length > 0 && investAnswers[0].answer_value) {
            const amt = Number(investAnswers[0].answer_value);
            if (!isNaN(amt) && amt > 0) {
              setInvestmentAmount(`$${amt.toLocaleString()} USD`);
            }
          }
        }

        // Load quiz session for nationality, dependents, and completion state
        // quiz_sessions has no `created_at` column — order by id instead
        const { data: quizSession } = await supabase
          .from('quiz_sessions')
          .select('result_json, completed_at')
          .eq('user_id', user.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();

        if (quizSession) {
          setQuizCompleted(!!quizSession.completed_at);

          const resultJson = quizSession.result_json as { answers?: Record<string, string> } | null;
          const quizAnswers = resultJson?.answers ?? null;
          if (quizAnswers) {
            if (quizAnswers['Q0-01'] && !nationality) {
              setNationality(quizAnswers['Q0-01']);
            }
            if (quizAnswers['Q0-03']) {
              const familyVal = String(quizAnswers['Q0-03']).toLowerCase();
              setHasDependents(
                !familyVal.includes('none') && familyVal !== 'no' && familyVal !== ''
              );
            }
          }
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buildSections = useCallback((): SectionManifest[] => {
    return SOLO_SECTIONS
      .filter((s) => !s.conditional || (s.conditional && hasDependents))
      .map((s, idx) => {
        const answered = answerCounts[s.route] || 0;
        const total = TOTAL_QUESTIONS_PER_SECTION[idx] || 6;
        const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
        const prefillCount = prefillCounts[s.route] || 0;

        let status: SectionManifest['status'] = 'not_started';
        if (pct >= 100) status = 'complete';
        else if (answered > 0) status = 'active';

        return {
          number: s.number,
          title: s.title,
          subtitle: s.subtitle,
          documents: s.documents,
          prefillCount,
          completionPct: pct,
          status,
          href: `/apply/${s.route}`,
        };
      });
  }, [answerCounts, prefillCounts, hasDependents]);

  const sections = buildSections();
  const allComplete = sections.every((s) => s.status === 'complete');
  const completedCount = sections.filter((s) => s.status === 'complete').length;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      router.push('/apply/module4');
    } catch {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading your case file...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        {/* Header */}
        <CaseFileHeader
          name={applicantName}
          nationality={nationality}
          businessName={businessName}
          targetCity={targetCity}
          investmentAmount={investmentAmount}
          applicationType={applicationType}
          lastActiveSection={lastActiveSection}
          lastActiveCluster={lastActiveCluster}
          isReturning={isReturning}
        />

        {/* Privacy trust notice — shown once on first visit (no answers yet) */}
        {!applicantName && !quizCompleted && (
          <div
            style={{
              marginBottom: '24px',
              padding: '14px 16px',
              border: '1px solid rgba(201,168,76,0.12)',
              background: 'rgba(201,168,76,0.02)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.7 }}>
              <span style={{ color: 'rgba(201,168,76,0.65)', fontWeight: 500 }}>Your answers stay private.</span>{' '}
              Everything you enter here is used only to prepare your E-2 application — never to train AI models,
              never sold, never shared with third parties. You can delete your account and all data at any time
              from <a href="/settings" style={{ color: 'rgba(201,168,76,0.55)', textDecoration: 'none' }}>Settings</a>.
            </p>
          </div>
        )}

        {/* Quiz banner for no-data state */}
        {!quizCompleted && !applicantName && (
          <div
            className="mb-8 border p-6"
            style={{ borderColor: 'rgba(201,168,76,0.12)' }}
          >
            <h3
              className="mb-2 text-sm font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
            >
              Complete your eligibility check first
            </h3>
            <p
              className="mb-4 text-[11px] leading-relaxed"
              style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}
            >
              The eligibility check pre-fills your case file with known information
              so you do not have to re-enter it. It also confirms your E-2
              eligibility before you invest time in the full application.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="/quiz"
                className="inline-flex items-center justify-center border px-6 py-2.5 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(201,168,76,0.06)]"
                style={{
                  borderColor: '#C9A84C',
                  color: '#C9A84C',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Start eligibility check
              </a>
              <button
                onClick={() => setQuizCompleted(true)}
                className="inline-flex items-center justify-center border px-6 py-2.5 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(245,240,232,0.03)]"
                style={{
                  borderColor: 'rgba(245,240,232,0.08)',
                  color: 'rgba(245,240,232,0.28)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Continue anyway
              </button>
            </div>
          </div>
        )}

        {/* Document upload card */}
        <DocumentUploadCard preparationStatus={preparationStatus} />

        {/* Case-type field prioritization banner */}
        {!priorityDismissed && !allComplete && (() => {
          const IMPORTANCE_ORDER: Record<string, string[]> = {
            solo: ['story', 'investment', 'business', 'qualifications', 'ties', 'family'],
            partnership: ['story', 'investment', 'business', 'qualifications', 'ties', 'family'],
            cos: ['ties', 'story', 'investment', 'business', 'qualifications', 'family'],
          };
          const order = IMPORTANCE_ORDER[applicationType] || IMPORTANCE_ORDER.solo;
          const topPriority = order
            .map(route => sections.find(s => s.href === `/apply/${route}`))
            .filter((s): s is SectionManifest => !!s && s.status !== 'complete')
            .slice(0, 3);
          if (topPriority.length === 0) return null;
          const typeLabel: Record<string, string> = {
            solo: 'Solo E-2 investor',
            partnership: 'Partnership application',
            cos: 'Change of Status',
          };
          return (
            <div className="mb-6 border p-5" style={{ borderColor: 'rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.02)' }}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)', fontFamily: "'DM Sans', sans-serif" }}>
                    {typeLabel[applicationType] || 'E-2 application'} · Focus here first
                  </span>
                </div>
                <button
                  onClick={() => setPriorityDismissed(true)}
                  style={{ color: 'rgba(245,240,232,0.2)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', flexShrink: 0, lineHeight: 1 }}
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {topPriority.map((s, i) => (
                  <a
                    key={s.href}
                    href={s.href}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', padding: '10px 12px', border: '1px solid rgba(245,240,232,0.05)', background: 'rgba(245,240,232,0.01)' }}
                  >
                    <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.4)', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, width: '14px' }}>
                      {i + 1}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.75)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                        {s.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginLeft: '8px' }}>
                        {s.completionPct}% complete
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.45)', fontFamily: "'DM Sans', sans-serif" }}>→</span>
                  </a>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Section grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sections.map((section) => (
            <SectionCard
              key={section.number}
              number={section.number}
              title={section.title}
              subtitle={section.subtitle}
              documents={section.documents}
              prefillCount={section.prefillCount}
              completionPct={section.completionPct}
              status={section.status}
              href={section.href}
              badge={section.badge}
            />
          ))}
        </div>

        {/* Generate strip */}
        <GenerateStrip
          isUnlocked={allComplete}
          completedCount={completedCount}
          totalCount={sections.length}
          onGenerate={handleGenerate}
          generating={generating}
        />
      </div>
    </div>
  );
}
