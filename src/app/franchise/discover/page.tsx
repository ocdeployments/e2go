'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FranchiseProfileAnswers } from '@/lib/franchise-scoring-engine';

// ─── Industry categories (E-7-05) ────────────────────────────────────────────

const INDUSTRY_CATEGORIES: string[] = [
  'Food & Beverage (fast casual, restaurant, café)',
  'Retail',
  'Health & Wellness / Medical / Dental',
  'Home Services (cleaning, maid service, housekeeping)',
  'Renovation / Home Improvement / Contracting',
  'Fitness / Gym / Martial Arts',
  'Education & Tutoring / Childcare',
  'Pet Services (grooming, boarding, daycare)',
  'Automotive (repair, detailing, rental)',
  'Technology / IT Services',
  'Consulting / Professional Services / Staffing',
  'Senior Care / Home Health',
  'Beauty / Hair / Nail Salon',
  'Open to broker recommendation (I\'m flexible)',
];

const INDUSTRY_ANSWER_KEY = 'QFN-13';

// ─── Single-select questions ──────────────────────────────────────────────────

interface QFNQuestion {
  key: keyof FranchiseProfileAnswers;
  answerKey: string;
  label: string;
  helper?: string;
  options: string[];
}

// QFN-10 (priorBusiness) removed — duplicate of Module 3 question M3J-01
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

// Total question count: 1 industry multi-select + N single-select
const TOTAL_QUESTIONS = 1 + QFN_QUESTIONS.length;

// ─── Pre-fill mapping ─────────────────────────────────────────────────────────

interface PrefillField {
  label: string;
  sourceKey: string;
}

const PREFILL_FIELDS: PrefillField[] = [
  { label: 'Investment range', sourceKey: 'Q0-07' },
  { label: 'Citizenship', sourceKey: 'Q0-01' },
  { label: 'Applying from', sourceKey: 'Q0-05' },
  { label: 'Family moving with you', sourceKey: 'Q0-03' },
];

interface PrefillValues {
  [key: string]: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FranchiseDiscoverPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<PrefillValues>({});
  const [step, setStep] = useState<'confirm' | 'questions' | 'submitting'>('confirm');

  // Question cursor: 0 = industry multi-select, 1+ = QFN_QUESTIONS[cursor-1]
  const [currentQ, setCurrentQ] = useState(0);

  // Single-select answers (keyed by answerKey)
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Multi-select state for QFN-13 industry categories
  const [industrySelected, setIndustrySelected] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

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
            const preAnswers: Record<string, string> = {};
            for (const a of savedAnswers) {
              if (!a.answer_value || typeof a.answer_value !== 'string') continue;
              if (a.question_key === INDUSTRY_ANSWER_KEY) {
                // Stored as JSON array
                try {
                  const parsed = JSON.parse(a.answer_value) as string[];
                  if (Array.isArray(parsed)) setIndustrySelected(parsed);
                } catch { /* ignore malformed */ }
              } else {
                preAnswers[a.question_key] = a.answer_value;
              }
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

  // Toggle industry category selection (multi-select)
  const toggleIndustry = useCallback(async (cat: string) => {
    setIndustrySelected(prev => {
      const next = prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat];
      // Persist as JSON array
      saveAnswer(INDUSTRY_ANSWER_KEY, JSON.stringify(next));
      return next;
    });
  }, [saveAnswer]);

  const selectOption = useCallback(async (answerKey: string, value: string) => {
    setAnswers(prev => ({ ...prev, [answerKey]: value }));
    setSaving(true);
    await saveAnswer(answerKey, value);
    setSaving(false);
    // Auto-advance after short delay
    setTimeout(() => {
      if (currentQ < TOTAL_QUESTIONS - 1) {
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

  // Answered count: industry (counts if ≥1 selected) + single-select
  const singleAnsweredCount = QFN_QUESTIONS.filter(q => answers[q.answerKey]).length;
  const industryAnswered = industrySelected.length > 0;
  const answeredCount = (industryAnswered ? 1 : 0) + singleAnsweredCount;
  const progressPct = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

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
              {/* E-7-03: deep-link directly to the investment question */}
              <a href="/quiz?step=investment" style={{ color: 'rgba(201,168,76,0.6)', textDecoration: 'underline' }}>Update your eligibility quiz</a>
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

  // ── Step 2: Profiler questions ────────────────────────────────────────────

  // currentQ === 0 → industry multi-select
  // currentQ >= 1  → QFN_QUESTIONS[currentQ - 1]
  const isIndustryStep = currentQ === 0;
  const singleQ = !isIndustryStep ? QFN_QUESTIONS[currentQ - 1] : null;

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
              {answeredCount} / {TOTAL_QUESTIONS} answered
            </span>
          </div>
          <div style={{ height: '2px', background: 'rgba(245,240,232,0.08)', borderRadius: 0 }}>
            <div style={{ height: '2px', width: `${progressPct}%`, background: '#C9A84C', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* ── Industry multi-select (Question 1 of N) ── */}
        {isIndustryStep && (
          <>
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
                Question 1 of {TOTAL_QUESTIONS}
              </div>
              <h2 style={{ fontSize: '20px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: '#f5f0e8', lineHeight: 1.4, marginBottom: '8px' }}>
                Which types of business interest you most?
              </h2>
              <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                Select all that apply — we&apos;ll weight your matches accordingly.
              </p>
            </div>

            {/* Multi-select checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '32px' }}>
              {INDUSTRY_CATEGORIES.map(cat => {
                const selected = industrySelected.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleIndustry(cat)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      border: selected ? '1px solid #C9A84C' : '1px solid rgba(245,240,232,0.08)',
                      background: selected ? 'rgba(201,168,76,0.06)' : 'rgba(245,240,232,0.012)',
                      color: selected ? '#f5f0e8' : 'rgba(245,240,232,0.72)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'border-color 0.12s, background 0.12s',
                    }}
                  >
                    {/* Checkbox visual */}
                    <span
                      style={{
                        width: '16px',
                        height: '16px',
                        border: selected ? '2px solid #C9A84C' : '1.5px solid rgba(245,240,232,0.22)',
                        background: selected ? '#C9A84C' : 'transparent',
                        borderRadius: '2px',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.12s',
                      }}
                    >
                      {selected && (
                        <span style={{ color: '#0a0a0a', fontSize: '10px', lineHeight: 1, fontWeight: 700 }}>✓</span>
                      )}
                    </span>
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Continue from industry step */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => setCurrentQ(1)}
                style={{
                  padding: '11px 24px',
                  background: industrySelected.length > 0 ? '#C9A84C' : 'rgba(245,240,232,0.08)',
                  color: industrySelected.length > 0 ? '#0a0a0a' : 'rgba(245,240,232,0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {industrySelected.length > 0 ? `Continue (${industrySelected.length} selected) →` : 'Skip →'}
              </button>

              {/* Nav dots */}
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                {/* Dot for industry question */}
                <button
                  onClick={() => setCurrentQ(0)}
                  style={{
                    width: industryAnswered ? '8px' : '6px',
                    height: industryAnswered ? '8px' : '6px',
                    borderRadius: '50%',
                    background: currentQ === 0 ? '#C9A84C' : industryAnswered ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.15s',
                  }}
                  aria-label="Go to question 1"
                />
                {QFN_QUESTIONS.map((qItem, i) => (
                  <button
                    key={qItem.answerKey}
                    onClick={() => setCurrentQ(i + 1)}
                    style={{
                      width: answers[qItem.answerKey] ? '8px' : '6px',
                      height: answers[qItem.answerKey] ? '8px' : '6px',
                      borderRadius: '50%',
                      background: (i + 1) === currentQ
                        ? '#C9A84C'
                        : answers[qItem.answerKey]
                        ? 'rgba(201,168,76,0.5)'
                        : 'rgba(245,240,232,0.12)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.15s',
                    }}
                    aria-label={`Go to question ${i + 2}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Single-select questions (currentQ >= 1) ── */}
        {!isIndustryStep && singleQ && (
          <>
            <div style={{ marginBottom: '32px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
                Question {currentQ + 1} of {TOTAL_QUESTIONS}
              </div>
              <h2 style={{ fontSize: '20px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: '#f5f0e8', lineHeight: 1.4, marginBottom: singleQ.helper ? '12px' : '0' }}>
                {singleQ.label}
              </h2>
              {singleQ.helper && (
                <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.70)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginTop: '8px' }}>
                  {singleQ.helper}
                </p>
              )}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
              {singleQ.options.map(option => {
                const selected = answers[singleQ.answerKey] === option;
                return (
                  <button
                    key={option}
                    onClick={() => selectOption(singleQ.answerKey, option)}
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
                <button
                  onClick={() => setCurrentQ(q => q - 1)}
                  style={{ fontSize: '12px', color: 'rgba(245,240,232,0.70)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: 0 }}
                >
                  ← Previous
                </button>
                {currentQ < TOTAL_QUESTIONS - 1 && (
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
                <button
                  onClick={() => setCurrentQ(0)}
                  style={{
                    width: industryAnswered ? '8px' : '6px',
                    height: industryAnswered ? '8px' : '6px',
                    borderRadius: '50%',
                    background: currentQ === 0 ? '#C9A84C' : industryAnswered ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.12)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'all 0.15s',
                  }}
                  aria-label="Go to question 1"
                />
                {QFN_QUESTIONS.map((qItem, i) => (
                  <button
                    key={qItem.answerKey}
                    onClick={() => setCurrentQ(i + 1)}
                    style={{
                      width: answers[qItem.answerKey] ? '8px' : '6px',
                      height: answers[qItem.answerKey] ? '8px' : '6px',
                      borderRadius: '50%',
                      background: (i + 1) === currentQ
                        ? '#C9A84C'
                        : answers[qItem.answerKey]
                        ? 'rgba(201,168,76,0.5)'
                        : 'rgba(245,240,232,0.12)',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      transition: 'all 0.15s',
                    }}
                    aria-label={`Go to question ${i + 2}`}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* See results CTA when all answered */}
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
              All {TOTAL_QUESTIONS} questions answered
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

      </div>
    </div>
  );
}
