'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FranchiseProfileAnswers } from '@/lib/franchise-scoring-engine';

// ─── Net-new questions ────────────────────────────────────────────────────────

interface QFNQuestion {
  key: keyof FranchiseProfileAnswers;
  answerKey: string;
  label: string;
  helper?: string;
  options: string[];
}

const QFN_QUESTIONS: QFNQuestion[] = [
  {
    key: 'hoursPerWeek',
    answerKey: 'QFN-01',
    label: 'How many hours per week do you want to spend on the business once it is running?',
    helper: 'E-2 visa regulations require active management. Consular officers typically expect 40+ hours per week in the early stages.',
    options: ['Under 20 hours', '20–30 hours', '30–40 hours', '40+ hours — full time'],
  },
  {
    key: 'b2bOrB2c',
    answerKey: 'QFN-02',
    label: 'Do you prefer serving individual consumers (B2C) or businesses as clients (B2B)?',
    options: ['Consumers (B2C)', 'Businesses (B2B)', 'No preference'],
  },
  {
    key: 'weekendOk',
    answerKey: 'QFN-03',
    label: 'Are you comfortable operating on evenings and weekends?',
    options: ['Weekdays only', 'Some weekends are fine', 'Fully flexible'],
  },
  {
    key: 'locationPreference',
    answerKey: 'QFN-04',
    label: 'Do you prefer a business with a physical storefront, or one you can run from an office or vehicle?',
    options: ['Storefront / retail location', 'Office-based', 'Field / van-based', 'No preference'],
  },
  {
    key: 'regulatedOk',
    answerKey: 'QFN-05',
    label: 'Are you comfortable operating in a regulated industry such as senior care or childcare?',
    helper: 'Regulated industries (licensed, inspected) often produce stronger E-2 cases — the compliance trail documents a real enterprise.',
    options: ["Yes — I'm open to it", 'Yes — I prefer it', "I'd rather avoid regulated industries"],
  },
  {
    key: 'hourlyWorkersOk',
    answerKey: 'QFN-06',
    label: 'How comfortable are you managing hourly workers such as caregivers, service technicians, or instructors?',
    options: ["Very comfortable — I've done this", 'Comfortable — I can learn', 'Prefer not to', 'No experience with this'],
  },
  {
    key: 'professionalBackground',
    answerKey: 'QFN-07',
    label: 'What industry has most of your professional career been in?',
    options: ['Healthcare', 'Finance', 'Engineering', 'Education', 'Sales & Marketing', 'Operations', 'Food & Hospitality', 'Real Estate', 'Technology', 'Other'],
  },
  {
    key: 'managementExperience',
    answerKey: 'QFN-08',
    label: 'Have you managed a team of 5 or more people?',
    options: ['Yes, regularly', 'Yes, occasionally', "No, but I'm comfortable with it", 'No — I would want the franchise to train me'],
  },
  {
    key: 'salesVsSystems',
    answerKey: 'QFN-09',
    label: 'Would you describe yourself as more sales-driven or systems-and-operations-driven?',
    options: ['I love selling — client acquisition energises me', 'I love systems — I want to build great operations', 'Equal mix'],
  },
  {
    key: 'priorBusiness',
    answerKey: 'QFN-10',
    label: 'Have you owned or operated a business before?',
    options: ['Yes, successfully', 'Yes — it was a learning experience', 'No, this is my first business'],
  },
  {
    key: 'multiUnit',
    answerKey: 'QFN-11',
    label: 'Is your goal to operate a single location, or do you want to scale to multiple units over time?',
    options: ['One location is the goal', 'Maybe more one day', 'I want to build a portfolio'],
  },
  {
    key: 'urbanOrSuburban',
    answerKey: 'QFN-12',
    label: 'Do you prefer an urban, suburban, or rural market?',
    options: ['Urban — city center', 'Suburban — residential areas', 'Rural', 'Flexible — no preference'],
  },
];

// ─── Pre-fill mapping ─────────────────────────────────────────────────────────

interface PrefillField {
  label: string;
  sourceKey: string;
  displayMap?: Record<string, string>;
}

const PREFILL_FIELDS: PrefillField[] = [
  { label: 'Investment range', sourceKey: 'Q0-07' },
  { label: 'Citizenship', sourceKey: 'Q0-01' },
  { label: 'Applying from', sourceKey: 'Q0-05' },
  { label: 'Family moving with you', sourceKey: 'Q0-03' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PrefillValues {
  [key: string]: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FranchiseDiscoverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<PrefillValues>({});
  const [existingAnswers, setExistingAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'confirm' | 'questions' | 'submitting'>('confirm');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); router.push('/login'); return; }

        // Get quiz answers for pre-fill
        const { data: quizSession } = await supabase
          .from('quiz_sessions')
          .select('result_json')
          .eq('user_id', user.id)
          .order('id', { ascending: false })
          .limit(1)
          .single();

        const quizAnswers = (quizSession?.result_json as { answers?: Record<string, string> } | null)?.answers ?? {};
        const prefillValues: PrefillValues = {};
        for (const f of PREFILL_FIELDS) {
          if (quizAnswers[f.sourceKey]) {
            prefillValues[f.sourceKey] = quizAnswers[f.sourceKey];
          }
        }
        setPrefill(prefillValues);

        // Get latest application to save answers to
        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (apps && apps.length > 0) {
          setApplicationId(apps[0].id);

          // Load any existing QFN- answers
          const { data: savedAnswers } = await supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', apps[0].id)
            .like('question_key', 'QFN-%');

          if (savedAnswers) {
            const existing: Record<string, string> = {};
            for (const a of savedAnswers) {
              if (a.answer_value && typeof a.answer_value === 'string') {
                existing[a.question_key] = a.answer_value;
              }
            }
            setExistingAnswers(existing);
            // Pre-fill answers from saved QFN answers
            const preAnswers: Record<string, string> = {};
            for (const q of QFN_QUESTIONS) {
              const saved = existing[q.answerKey];
              if (saved) preAnswers[q.answerKey] = saved;
            }
            setAnswers(preAnswers);
          }
        }
      } catch { /* continue as guest */ }
      setLoading(false);
    };
    load();
  }, [router]);

  const saveAnswer = useCallback(async (key: string, value: string) => {
    if (!applicationId) return;
    try {
      await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_key: key, answer_value: value, application_id: applicationId }),
      });
    } catch { /* non-critical */ }
  }, [applicationId]);

  const selectOption = useCallback(async (answerKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [answerKey]: value }));
    setSaving(true);
    await saveAnswer(answerKey, value);
    setSaving(false);
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < QFN_QUESTIONS.length - 1) {
        setCurrentQ(q => q + 1);
      } else {
        router.push('/franchise/matches');
      }
    }, 350);
  }, [currentQ, saveAnswer, router]);

  const handleFinish = useCallback(async () => {
    setStep('submitting');
    router.push('/franchise/matches');
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Loading your profile…</p>
      </div>
    );
  }

  // ── Step 1: Confirm pre-fill ──────────────────────────────────────────────

  if (step === 'confirm') {
    const hasPrefill = Object.keys(prefill).length > 0;
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
        <div style={{ maxWidth: '620px', margin: '0 auto', padding: '64px 24px 80px' }}>

          <a href="/franchise" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
            ← Franchise Navigator
          </a>

          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            Step 1 of 2
          </span>
          <h1 style={{ fontSize: '28px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', margin: '10px 0 16px' }}>
            Confirm your profile
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.7, marginBottom: '32px', fontFamily: "'DM Sans', sans-serif" }}>
            {hasPrefill
              ? "We've pulled this from your eligibility quiz. Confirm it's correct, then we'll ask only what we don't already know."
              : "Complete your eligibility quiz first to pre-fill this section. Or continue — we'll ask everything we need."}
          </p>

          {hasPrefill && (
            <div style={{ marginBottom: '32px', border: '1px solid rgba(245,240,232,0.08)', background: 'rgba(245,240,232,0.015)' }}>
              {PREFILL_FIELDS.filter(f => prefill[f.sourceKey]).map((f, i, arr) => (
                <div
                  key={f.sourceKey}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderBottom: i < arr.length - 1 ? '1px solid rgba(245,240,232,0.05)' : 'none',
                    gap: '24px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.70)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em', flexShrink: 0, minWidth: '130px' }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: '12px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", textAlign: 'right' }}>
                    {prefill[f.sourceKey]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {hasPrefill && (
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '28px', lineHeight: 1.6 }}>
              Need to change something?{' '}
              <a href="/quiz" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'underline' }}>Update your eligibility quiz</a>
              {' '}— changes sync here automatically.
            </p>
          )}

          <button
            onClick={() => setStep('questions')}
            style={{
              padding: '13px 28px',
              background: '#C9A84C',
              color: '#0a0a0a',
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            {hasPrefill ? 'Looks right — continue →' : 'Continue →'}
          </button>

        </div>
      </div>
    );
  }

  // ── Step 2: 12 net-new questions ──────────────────────────────────────────

  const q = QFN_QUESTIONS[currentQ];
  const answeredCount = QFN_QUESTIONS.filter(q => answers[q.answerKey]).length;
  const progressPct = Math.round((answeredCount / QFN_QUESTIONS.length) * 100);
  const allAnswered = answeredCount === QFN_QUESTIONS.length;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Progress */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif" }}>
              Step 2 of 2 — Profiler
            </span>
            <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif" }}>
              {answeredCount} / {QFN_QUESTIONS.length} answered
            </span>
          </div>
          <div style={{ height: '2px', background: 'rgba(245,240,232,0.08)', borderRadius: 0 }}>
            <div style={{ height: '2px', width: `${progressPct}%`, background: '#C9A84C', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Current question */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
            Question {currentQ + 1} of {QFN_QUESTIONS.length}
          </div>
          <h2 style={{ fontSize: '20px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: '#f5f0e8', lineHeight: 1.4, marginBottom: q.helper ? '12px' : '0' }}>
            {q.label}
          </h2>
          {q.helper && (
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.70)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginTop: '8px' }}>
              {q.helper}
            </p>
          )}
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
          {q.options.map(option => {
            const selected = answers[q.answerKey] === option;
            return (
              <button
                key={option}
                onClick={() => selectOption(q.answerKey, option)}
                disabled={saving}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  border: selected ? '1px solid #C9A84C' : '1px solid rgba(245,240,232,0.1)',
                  background: selected ? 'rgba(201,168,76,0.08)' : 'rgba(245,240,232,0.015)',
                  color: selected ? '#C9A84C' : 'rgba(245,240,232,0.75)',
                  cursor: saving ? 'default' : 'pointer',
                  fontSize: '13px',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.15s, background 0.15s, color 0.15s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: selected ? '4px solid #C9A84C' : '1.5px solid rgba(245,240,232,0.2)',
                    flexShrink: 0,
                    display: 'inline-block',
                    transition: 'border 0.15s',
                  }} />
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {currentQ > 0 && (
              <button
                onClick={() => setCurrentQ(q => q - 1)}
                style={{ fontSize: '12px', color: 'rgba(245,240,232,0.70)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif' ", padding: 0 }}
              >
                ← Previous
              </button>
            )}
            {currentQ < QFN_QUESTIONS.length - 1 && (
              <button
                onClick={() => setCurrentQ(q => q + 1)}
                style={{ fontSize: '12px', color: 'rgba(245,240,232,0.70)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
              >
                Skip →
              </button>
            )}
          </div>

          {/* Question nav dots */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {QFN_QUESTIONS.map((qItem, i) => (
              <button
                key={qItem.answerKey}
                onClick={() => setCurrentQ(i)}
                style={{
                  width: answers[qItem.answerKey] ? '8px' : '6px',
                  height: answers[qItem.answerKey] ? '8px' : '6px',
                  borderRadius: '50%',
                  background: i === currentQ
                    ? '#C9A84C'
                    : answers[qItem.answerKey]
                    ? 'rgba(201,168,76,0.5)'
                    : 'rgba(245,240,232,0.12)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s',
                }}
                aria-label={`Go to question ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* See results CTA when enough answered */}
        {allAnswered && (
          <div style={{ marginTop: '36px', paddingTop: '28px', borderTop: '1px solid rgba(245,240,232,0.06)' }}>
            <button
              onClick={handleFinish}
              style={{
                padding: '13px 28px',
                background: '#C9A84C',
                color: '#0a0a0a',
                border: 'none',
                cursor: 'pointer',
                fontSize: '12px',
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              See my matches →
            </button>
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginTop: '10px' }}>
              All {QFN_QUESTIONS.length} questions answered
            </p>
          </div>
        )}

        {!allAnswered && answeredCount >= 6 && (
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid rgba(245,240,232,0.06)' }}>
            <button
              onClick={() => router.push('/franchise/matches')}
              style={{ fontSize: '12px', color: 'rgba(245,240,232,0.70)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
            >
              See partial results with {answeredCount} answers →
            </button>
          </div>
        )}

        {error && (
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(239,68,68,0.8)', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        )}
        {/* suppress unused var lint */}
        {void existingAnswers}

      </div>
    </div>
  );
}
