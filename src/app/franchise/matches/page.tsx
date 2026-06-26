'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { scoreFranchiseProfile, type FranchiseMatchResult, type FranchiseProfileAnswers, type CategoryScore } from '@/lib/franchise-scoring-engine';
import { FRANCHISE_CATEGORIES } from '@/data/franchise-brands';

// ─── Answer key → profile field mapping ──────────────────────────────────────

const QFN_KEY_MAP: Record<string, keyof FranchiseProfileAnswers> = {
  'QFN-01': 'hoursPerWeek',
  'QFN-02': 'b2bOrB2c',
  'QFN-03': 'weekendOk',
  'QFN-04': 'locationPreference',
  'QFN-05': 'regulatedOk',
  'QFN-06': 'hourlyWorkersOk',
  'QFN-07': 'professionalBackground',
  'QFN-08': 'managementExperience',
  'QFN-09': 'salesVsSystems',
  'QFN-10': 'priorBusiness',
  'QFN-11': 'multiUnit',
  'QFN-12': 'urbanOrSuburban',
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, max = 100, color = '#C9A84C' }: { value: number; max?: number; color?: string }) {
  return (
    <div style={{ height: '4px', background: 'rgba(245,240,232,0.08)', borderRadius: 0, overflow: 'hidden' }}>
      <div style={{ height: '4px', width: `${Math.round((value / max) * 100)}%`, background: color, transition: 'width 0.6s ease' }} />
    </div>
  );
}

// ─── Dimension dot ────────────────────────────────────────────────────────────

function DimDot({ score }: { score: number }) {
  const color = score >= 75 ? 'rgba(34,197,94,0.8)' : score >= 55 ? '#C9A84C' : 'rgba(239,68,68,0.7)';
  return <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />;
}

// ─── Category match card (E-7-01: no brand names) ────────────────────────────
// Shows: industry label + compatibility score + investment range + description.
// Format: "Food & Beverage — Fast Casual · 94% match · $150K–$250K investment"

function CategoryMatchCard({ cs, rank }: { cs: CategoryScore; rank: number }) {
  const cat = FRANCHISE_CATEGORIES[cs.category];
  const isTop = rank <= 3;

  // Derive investment range from topBrands in this category (min across minimums, max across maximums)
  const investMins = cs.topBrands.map(b => b.investMin);
  const investMaxs = cs.topBrands.map(b => b.investMax);
  const rangeMin = investMins.length > 0 ? Math.min(...investMins) : null;
  const rangeMax = investMaxs.length > 0 ? Math.max(...investMaxs) : null;
  const investLabel = rangeMin !== null && rangeMax !== null
    ? `$${(rangeMin / 1000).toFixed(0)}K–$${(rangeMax / 1000).toFixed(0)}K investment`
    : null;

  const dimLabels: Array<[keyof CategoryScore, string]> = [
    ['capitalFit', 'Capital fit'],
    ['visaFit', 'Visa strength'],
    ['operatorFit', 'Operator fit'],
    ['marketFit', 'Market fit'],
    ['renewalFit', 'Renewal outlook'],
  ];

  return (
    <div
      style={{
        padding: '18px 20px',
        border: `1px solid ${isTop ? 'rgba(201,168,76,0.15)' : 'rgba(245,240,232,0.05)'}`,
        background: isTop ? 'rgba(201,168,76,0.02)' : 'rgba(245,240,232,0.01)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            {isTop && (
              <span style={{ fontSize: '10px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, minWidth: '20px', flexShrink: 0 }}>
                #{rank}
              </span>
            )}
            <span style={{ fontSize: '14px', color: isTop ? '#f5f0e8' : 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif", fontWeight: isTop ? 500 : 400 }}>
              {cat.label}
            </span>
          </div>
          {/* Subtitle line: tagline · investment range */}
          <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.52)', fontFamily: "'DM Sans', sans-serif", margin: 0, lineHeight: 1.5 }}>
            {cat.tagline}
            {investLabel && (
              <span style={{ color: 'rgba(201,168,76,0.6)' }}> · {investLabel}</span>
            )}
          </p>
        </div>
        <span style={{ fontSize: '22px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: isTop ? '#C9A84C' : 'rgba(245,240,232,0.68)', flexShrink: 0, marginLeft: '16px' }}>
          {cs.total}<span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.35)' }}>/100</span>
        </span>
      </div>

      <ScoreBar value={cs.total} color={isTop ? '#C9A84C' : 'rgba(245,240,232,0.25)'} />

      {isTop && (
        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
          {dimLabels.map(([dim, label]) => {
            const val = typeof cs[dim] === 'number' ? (cs[dim] as number) : 0;
            return (
              <div key={dim as string} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <DimDot score={val} />
                <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.72)', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Broker CTA card (E-7-02) ─────────────────────────────────────────────────

type BrokerState = 'idle' | 'loading' | 'confirmed' | 'dismissed';

function BrokerCtaCard({ topCategories }: { topCategories: CategoryScore[] }) {
  const [state, setState] = useState<BrokerState>('idle');

  const handleConnect = async () => {
    setState('loading');
    try {
      await fetch('/api/franchise/broker-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_categories: topCategories.slice(0, 3).map(cs => FRANCHISE_CATEGORIES[cs.category].label),
        }),
      });
    } catch {
      // Non-blocking — show confirmation regardless
    }
    setState('confirmed');
  };

  if (state === 'dismissed') return null;

  if (state === 'confirmed') {
    return (
      <div style={{ padding: '24px 24px', border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.04)', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', color: 'rgba(34,197,94,0.8)', flexShrink: 0 }}>✓</span>
          <div>
            <p style={{ fontSize: '14px', color: 'rgba(34,197,94,0.85)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, margin: '0 0 4px' }}>
              Request received
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.60)', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
              We&apos;ll be in touch within 1 business day.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 24px', border: '1px solid rgba(201,168,76,0.18)', background: 'rgba(201,168,76,0.025)', marginBottom: '48px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 400, color: '#f5f0e8', margin: '0 0 8px' }}>
        Would you like to speak with a franchise specialist?
      </h3>
      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.62)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: '0 0 20px' }}>
        We can connect you with a licensed franchise broker who specialises in E-2 visa-eligible franchises.
      </p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={handleConnect}
          disabled={state === 'loading'}
          style={{
            padding: '10px 22px',
            background: '#C9A84C',
            color: '#0a0a0a',
            border: 'none',
            cursor: state === 'loading' ? 'default' : 'pointer',
            fontSize: '12px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            opacity: state === 'loading' ? 0.7 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {state === 'loading' ? 'Sending…' : 'Yes, connect me'}
        </button>
        <button
          onClick={() => setState('dismissed')}
          disabled={state === 'loading'}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            color: 'rgba(245,240,232,0.55)',
            border: '1px solid rgba(245,240,232,0.12)',
            cursor: state === 'loading' ? 'default' : 'pointer',
            fontSize: '12px',
            letterSpacing: '0.04em',
            fontFamily: "'DM Sans', sans-serif",
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          Not right now
        </button>
      </div>
    </div>
  );
}

// ─── Readiness config ─────────────────────────────────────────────────────────

const READINESS_CONFIG: Record<string, { color: string; label: string }> = {
  READY_FOR_INTRO: { color: 'rgba(34,197,94,0.85)', label: 'Ready for broker introduction' },
  NEARLY_READY:   { color: '#C9A84C', label: 'Nearly ready' },
  REFINE_FIRST:   { color: 'rgba(245,240,232,0.72)', label: 'Refine your profile first' },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function FranchiseMatchesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FranchiseMatchResult | null>(null);
  const [profileAnswerCount, setProfileAnswerCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: apps } = await supabase
          .from('applications')
          .select('id, target_state')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        const appId = apps?.[0]?.id ?? null;
        const targetState = apps?.[0]?.target_state ?? undefined;

        const [{ data: quizSession }, { data: savedAnswers }] = await Promise.all([
          supabase
            .from('quiz_sessions')
            .select('result_json')
            .eq('user_id', user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single(),
          appId
            ? supabase
              .from('answers')
              .select('question_key, answer_value')
              .eq('application_id', appId)
              .or(`question_key.like.QFN-%,question_key.eq.M3-F-02`)
            : Promise.resolve({ data: [] }),
        ]);

        const quizAnswers = (quizSession?.result_json as { answers?: Record<string, string> } | null)?.answers ?? {};
        const savedMap: Record<string, string> = {};
        for (const a of (savedAnswers ?? [])) {
          if (a.answer_value && typeof a.answer_value === 'string') {
            savedMap[a.question_key] = a.answer_value;
          }
        }

        const profileAnswers: FranchiseProfileAnswers = {
          investmentRange: quizAnswers['Q0-07'],
          investmentAmount: savedMap['M3-F-02'] ? Number(savedMap['M3-F-02']) : undefined,
          citizenship: quizAnswers['Q0-01'],
          targetState: targetState as string | undefined,
        };

        let qfnCount = 0;
        for (const [answerKey, field] of Object.entries(QFN_KEY_MAP)) {
          const val = savedMap[answerKey];
          if (val) {
            (profileAnswers as Record<string, unknown>)[field] = val;
            qfnCount++;
          }
        }
        setProfileAnswerCount(qfnCount);

        const scored = scoreFranchiseProfile(profileAnswers);
        setResult(scored);
      } catch { /* show empty state */ }
      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Scoring your profile…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>Unable to load your match results.</p>
        <button onClick={() => router.push('/franchise/discover')} style={{ color: '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
          ← Back to profiler
        </button>
      </div>
    );
  }

  const readinessCfg = READINESS_CONFIG[result.readiness];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <a href="/franchise" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
            ← Franchise Navigator
          </a>
          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: 'block' }}>
            Your match report
          </span>
          <h1 style={{ fontSize: '30px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', margin: '10px 0 0' }}>
            Franchise category matches
          </h1>
          {profileAnswerCount < 12 && (
            <div style={{ marginTop: '16px', padding: '10px 14px', border: '1px solid rgba(245,240,232,0.08)', background: 'rgba(245,240,232,0.02)', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.72)', fontFamily: "'DM Sans', sans-serif" }}>
                {profileAnswerCount} of 12 profiler questions answered —
              </span>
              <a href="/franchise/discover" style={{ fontSize: '11px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
                complete your profile for better results →
              </a>
            </div>
          )}
        </div>

        {/* Readiness */}
        <div style={{ marginBottom: '48px', padding: '20px 22px', border: `1px solid ${readinessCfg.color}30`, background: `${readinessCfg.color}06` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: readinessCfg.color, flexShrink: 0, marginTop: '4px' }} />
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: readinessCfg.color, fontFamily: "'DM Sans', sans-serif" }}>
                {readinessCfg.label}
              </span>
              <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, margin: '6px 0 0', fontFamily: "'DM Sans', sans-serif" }}>
                {result.readinessReason}
              </p>
            </div>
          </div>
        </div>

        {/* Hours warning */}
        {result.hoursWarning && (
          <div style={{ marginBottom: '32px', padding: '14px 16px', border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(245,158,11,0.04)' }}>
            <p style={{ fontSize: '12px', color: 'rgba(245,158,11,0.85)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
              <strong>Hours per week note:</strong> E-2 regulations require you to actively direct the business.
              Most consular officers expect 40+ hours per week in the early stages. Your business plan should
              explain your operational role clearly.
            </p>
          </div>
        )}

        {/* Category scorecard (E-7-01: categories only, no brand names) */}
        <div style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '20px', fontWeight: 400 }}>
            Category match scores
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {result.categoryScores.map((cs, i) => (
              <CategoryMatchCard key={cs.category} cs={cs} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* Broker CTA (E-7-02) */}
        <BrokerCtaCard topCategories={result.topCategories} />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid rgba(245,240,232,0.06)' }}>
          <a
            href="/franchise/discover"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.72)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', cursor: 'pointer' }}
          >
            Update my answers
          </a>
          <a
            href="/dashboard"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', marginLeft: 'auto' }}
          >
            ← Dashboard
          </a>
        </div>

      </div>
    </div>
  );
}
