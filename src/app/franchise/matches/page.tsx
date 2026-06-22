'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { scoreFranchiseProfile, type FranchiseMatchResult, type FranchiseProfileAnswers } from '@/lib/franchise-scoring-engine';
import { FRANCHISE_CATEGORIES, type FranchiseBrand } from '@/data/franchise-brands';

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

// ─── E-2 compat badge ─────────────────────────────────────────────────────────

function E2Badge({ score }: { score: 'A' | 'B' | 'C' }) {
  const config = {
    A: { color: 'rgba(34,197,94,0.85)', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
    B: { color: '#C9A84C', bg: 'rgba(201,168,76,0.08)', border: 'rgba(201,168,76,0.2)' },
    C: { color: 'rgba(239,68,68,0.8)', bg: 'rgba(239,68,68,0.06)', border: 'rgba(239,68,68,0.2)' },
  }[score];
  return (
    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: config.color, background: config.bg, border: `1px solid ${config.border}`, padding: '2px 7px', fontFamily: "'DM Sans', sans-serif" }}>
      E-2: {score}
    </span>
  );
}

// ─── Brand card ───────────────────────────────────────────────────────────────

function BrandCard({ brand }: { brand: FranchiseBrand }) {
  const catLabel = FRANCHISE_CATEGORIES[brand.category].label;
  const investRange = `$${(brand.investMin / 1000).toFixed(0)}K – $${(brand.investMax / 1000).toFixed(0)}K`;

  return (
    <Link
      href={`/franchise/brand/${brand.slug}`}
      style={{
        display: 'block',
        padding: '18px 20px',
        border: '1px solid rgba(245,240,232,0.08)',
        background: 'rgba(245,240,232,0.015)',
        textDecoration: 'none',
        transition: 'border-color 0.15s, background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
        <div>
          <span style={{ fontSize: '14px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: 'block', marginBottom: '4px' }}>
            {brand.name}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.35)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {catLabel}
          </span>
        </div>
        <E2Badge score={brand.e2CompatScore} />
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif", marginBottom: '12px' }}>
        {brand.description}
      </p>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.25)', fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: '2px' }}>Investment</span>
          <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', fontFamily: "'DM Sans', sans-serif" }}>{investRange}</span>
        </div>
        <div>
          <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.25)', fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: '2px' }}>Staff at 12 months</span>
          <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', fontFamily: "'DM Sans', sans-serif" }}>{brand.staffingAt12Months.min}–{brand.staffingAt12Months.max} people</span>
        </div>
        {brand.item19Present && (
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '10px', color: 'rgba(34,197,94,0.6)', fontFamily: "'DM Sans', sans-serif" }}>✓ Item 19 available</span>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Readiness config ─────────────────────────────────────────────────────────

const READINESS_CONFIG: Record<string, { color: string; label: string }> = {
  READY_FOR_INTRO: { color: 'rgba(34,197,94,0.85)', label: 'Ready for broker introduction' },
  NEARLY_READY:   { color: '#C9A84C', label: 'Nearly ready' },
  REFINE_FIRST:   { color: 'rgba(245,240,232,0.4)', label: 'Refine your profile first' },
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

        // Load quiz answers + application answers in parallel
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

        // Build profile answers object
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
        <p style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Scoring your profile…</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>Unable to load your match results.</p>
        <button onClick={() => router.push('/franchise/discover')} style={{ color: '#C9A84C', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
          ← Back to profiler
        </button>
      </div>
    );
  }

  const readinessCfg = READINESS_CONFIG[result.readiness];
  const dimLabels: Record<string, string> = {
    capitalFit: 'Capital fit',
    visaFit: 'Visa strength',
    operatorFit: 'Operator fit',
    marketFit: 'Market fit',
    renewalFit: 'Renewal outlook',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '56px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <a href="/franchise" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '32px' }}>
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
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
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
              {result.readiness === 'READY_FOR_INTRO' && (
                <Link
                  href="/franchise/connect"
                  style={{ display: 'inline-block', marginTop: '14px', padding: '9px 20px', background: '#C9A84C', color: '#0a0a0a', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none' }}
                >
                  Request broker introduction →
                </Link>
              )}
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

        {/* Category scorecard */}
        <div style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '20px', fontWeight: 400 }}>
            Category match scores
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {result.categoryScores.map((cs, i) => {
              const cat = FRANCHISE_CATEGORIES[cs.category];
              const isTop = i < 3;
              return (
                <div
                  key={cs.category}
                  style={{
                    padding: '18px 20px',
                    border: `1px solid ${isTop ? 'rgba(201,168,76,0.15)' : 'rgba(245,240,232,0.05)'}`,
                    background: isTop ? 'rgba(201,168,76,0.02)' : 'rgba(245,240,232,0.01)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isTop && (
                        <span style={{ fontSize: '10px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", fontWeight: 700, minWidth: '20px' }}>
                          #{i + 1}
                        </span>
                      )}
                      <span style={{ fontSize: '14px', color: isTop ? '#f5f0e8' : 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", fontWeight: isTop ? 500 : 400 }}>
                        {cat.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '22px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: isTop ? '#C9A84C' : 'rgba(245,240,232,0.3)' }}>
                      {cs.total}
                    </span>
                  </div>
                  <ScoreBar value={cs.total} color={isTop ? '#C9A84C' : 'rgba(245,240,232,0.15)'} />
                  {isTop && (
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {(Object.entries(dimLabels) as [keyof typeof cs, string][]).map(([dim, label]) => {
                        const val = typeof cs[dim] === 'number' ? (cs[dim] as number) : 0;
                        return (
                          <div key={dim as string} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <DimDot score={val} />
                            <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Brand shortlist */}
        {result.topBrands.length > 0 && (
          <div style={{ marginBottom: '56px' }}>
            <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '20px', fontWeight: 400 }}>
              Matched brands
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '10px' }}>
              {result.topBrands.map(brand => (
                <BrandCard key={brand.slug} brand={brand} />
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '24px', borderTop: '1px solid rgba(245,240,232,0.06)' }}>
          <a
            href="/franchise/discover"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline', cursor: 'pointer' }}
          >
            Update my answers
          </a>
          {result.readiness === 'READY_FOR_INTRO' && (
            <Link
              href="/franchise/connect"
              style={{ fontSize: '12px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
            >
              Request broker introduction →
            </Link>
          )}
          <a
            href="/dashboard"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.25)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', marginLeft: 'auto' }}
          >
            ← Dashboard
          </a>
        </div>

      </div>
    </div>
  );
}
