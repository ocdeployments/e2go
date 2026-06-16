/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import {
  scoreCase,
  type GapAnalysisResult,
  type GapCategory,
  type DenialRiskFactor,
} from '@/lib/gap-analysis-engine';

const supabase = createBrowserSupabaseClient();

// =============================================================================
// ROOT — Suspense wrapper required for useSearchParams in Next.js 14
// =============================================================================

export default function GapAnalysisPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GapAnalysisInner />
    </Suspense>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={styles.spinner} />
    </div>
  );
}

// =============================================================================
// INNER — data fetch + render
// =============================================================================

function GapAnalysisInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { router.push('/login?next=/gap-analysis'); return; }

      try {
        let resolvedId = searchParams.get('applicationId');
        if (!resolvedId) {
          const { data: apps } = await supabase
            .from('applications')
            .select('id, business_name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!apps?.length) { setError('No application found. Create a case file first.'); setLoading(false); return; }
          resolvedId = apps[0].id;
        }
        setAppId(resolvedId);

        // Fetch all data in parallel
        const [
          { data: app },
          { data: answers },
          { data: docs },
          { data: brief },
          { data: simApp },
          { data: simSessions },
        ] = await Promise.all([
          supabase
            .from('applications')
            .select('business_name, business_category, operational_status, target_state, principal_name, simulator_sessions_used')
            .eq('id', resolvedId).eq('user_id', user.id).single(),
          supabase.from('answers').select('question_key, answer_value').eq('application_id', resolvedId),
          supabase.from('application_documents').select('detected_document_type, user_selected_document_type').eq('application_id', resolvedId),
          supabase.from('case_briefs').select('substantiality_score, marginality_score').eq('application_id', resolvedId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('applications').select('simulator_sessions_used').eq('id', resolvedId).single(),
          supabase.from('simulator_sessions').select('inconsistency_count').eq('application_id', resolvedId).order('started_at', { ascending: false }).limit(1),
        ]);

        if (!app) { setError('Application not found or access denied.'); setLoading(false); return; }
        setBusinessName(app.business_name || 'Your Business');

        const simData = {
          sessionsUsed: simApp?.simulator_sessions_used ?? 0,
          latestInconsistencyCount: simSessions?.[0]?.inconsistency_count ?? 0,
        };

        setResult(scoreCase(app, answers || [], docs || [], brief || undefined, simData));
      } catch (err: any) {
        setError(err.message || 'Failed to load gap analysis');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router, searchParams]);

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '560px', textAlign: 'center' as const }}>
          <div style={{ padding: '20px 24px', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)', fontSize: '14px', marginBottom: '24px' }}>
            {error}
          </div>
          <Link href="/dashboard" style={{ color: '#C9A84C', fontSize: '14px' }}>← Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // ── Readiness config ───────────────────────────────────────────────────────

  const readinessCfg = {
    strong:    { label: 'Strong case',                  color: '#22c55e', bg: '#22c55e14' },
    moderate:  { label: 'Moderate — gaps to address',   color: '#f59e0b', bg: '#f59e0b14' },
    needs_work:{ label: 'Significant gaps identified',  color: '#ef4444', bg: '#ef444414' },
  }[result.readiness];

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={styles.inner}>

        {/* Nav */}
        <div style={{ marginBottom: '40px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/dashboard" style={styles.navLink}>← Dashboard</Link>
          {appId && (
            <>
              <span style={{ color: 'rgba(245,240,232,0.15)' }}>·</span>
              <Link href={`/simulator?applicationId=${appId}`} style={styles.navLink}>Simulator →</Link>
            </>
          )}
        </div>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={styles.eyebrow}>E-2 GAP ANALYSIS</div>
          <h1 style={styles.title}>{businessName || 'Your Case'}</h1>
          <p style={styles.subtitle}>
            Scored against 6 evidence categories and 15 real E-2 denial risk factors.
          </p>
        </div>

        {/* Overall readiness */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '24px',
          padding: '24px 28px',
          background: readinessCfg.bg,
          border: `1px solid ${readinessCfg.color}30`,
          marginBottom: '48px',
          flexWrap: 'wrap' as const,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: readinessCfg.color, marginBottom: '6px' }}>
              OVERALL READINESS
            </div>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#f5f0e8' }}>
              {readinessCfg.label}
            </div>
            <div style={{ marginTop: '10px', display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
              {result.highRiskCount > 0 && (
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                  {result.highRiskCount} critical risk{result.highRiskCount > 1 ? 's' : ''}
                </span>
              )}
              {result.moderateRiskCount > 0 && (
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
                  {result.moderateRiskCount} moderate risk{result.moderateRiskCount > 1 ? 's' : ''}
                </span>
              )}
              {result.highRiskCount === 0 && result.moderateRiskCount === 0 && (
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>No critical risks</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '56px',
              fontWeight: 300,
              color: readinessCfg.color,
              lineHeight: 1,
            }}>
              {result.overallScore}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em' }}>
              / 100 WEIGHTED
            </div>
          </div>
        </div>

        {/* Top priorities */}
        {result.topPriorities.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={styles.sectionTitle}>Immediate priorities</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0' }}>
              {result.topPriorities.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', gap: '16px', alignItems: 'flex-start',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(245,240,232,0.05)',
                }}>
                  <span style={{
                    width: '22px', height: '22px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    fontSize: '11px', fontWeight: 700, color: '#ef4444',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DENIAL RISK RADAR ──────────────────────────────────────────── */}
        <DenialRiskRadar factors={result.denialFactors} />

        {/* ── 6 EVIDENCE CATEGORIES ─────────────────────────────────────── */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: '20px' }}>Evidence categories</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            {result.categories.map(cat => (
              <CategoryCard key={cat.id} category={cat} factors={result.denialFactors} />
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: '28px 32px',
          border: '1px solid rgba(201,168,76,0.12)',
          background: 'rgba(201,168,76,0.02)',
          textAlign: 'center' as const,
        }}>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.5)', marginBottom: '16px', lineHeight: 1.6 }}>
            Practice answering officer questions about the gaps identified above.
          </p>
          {appId && (
            <Link href={`/simulator?applicationId=${appId}`} style={{
              display: 'inline-block', padding: '12px 28px',
              background: '#C9A84C', color: '#0a0a0a',
              fontSize: '14px', fontWeight: 500,
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'none',
            }}>
              Practice in the Simulator
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

// =============================================================================
// DENIAL RISK RADAR — all 15 D-codes in a grid
// =============================================================================

function DenialRiskRadar({ factors }: { factors: DenialRiskFactor[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const riskConfig = {
    high:     { label: 'HIGH RISK',     color: '#ef4444', bg: '#ef444410', border: '#ef444430' },
    moderate: { label: 'MODERATE',      color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b30' },
    low:      { label: 'LOW RISK',      color: '#22c55e', bg: '#22c55e10', border: '#22c55e25' },
  };

  const highCount = factors.filter(f => f.risk === 'high').length;
  const moderateCount = factors.filter(f => f.risk === 'moderate').length;
  const lowCount = factors.filter(f => f.risk === 'low').length;

  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>Denial risk radar</h2>
        <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>
          D-01 to D-15 · click any factor for detail
        </span>
      </div>

      {/* Risk count summary */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
        {[
          { count: highCount,     label: 'Critical',  color: '#ef4444' },
          { count: moderateCount, label: 'Moderate',  color: '#f59e0b' },
          { count: lowCount,      label: 'Low risk',  color: '#22c55e' },
        ].map(({ count, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', background: color }} />
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.5)' }}>
              <span style={{ color, fontWeight: 600 }}>{count}</span> {label}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '8px' }}>
        {factors.map(f => {
          const cfg = riskConfig[f.risk];
          const isOpen = expanded === f.code;

          return (
            <div
              key={f.code}
              onClick={() => setExpanded(isOpen ? null : f.code)}
              style={{
                padding: '14px 16px',
                border: `1px solid ${isOpen ? cfg.color + '60' : cfg.border}`,
                background: isOpen ? cfg.bg : 'transparent',
                cursor: 'pointer',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Code + risk badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
                  color: cfg.color, letterSpacing: '0.06em',
                }}>
                  {f.code}
                </span>
                <span style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
                  color: cfg.color,
                  padding: '2px 6px',
                  border: `1px solid ${cfg.color}40`,
                  marginLeft: 'auto',
                }}>
                  {cfg.label}
                </span>
              </div>

              {/* Factor name */}
              <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.4, marginBottom: '6px' }}>
                {f.name}
              </div>

              {/* Frequency badge */}
              <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.25)', letterSpacing: '0.04em' }}>
                {f.frequency}
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${cfg.color}20` }}>
                  <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6, margin: '0 0 10px' }}>
                    {f.finding}
                  </p>
                  {f.mitigation && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'rgba(201,168,76,0.06)',
                      border: '1px solid rgba(201,168,76,0.15)',
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)', marginBottom: '6px' }}>
                        WHAT TO DO
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.55, margin: 0 }}>
                        {f.mitigation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// CATEGORY CARD
// =============================================================================

function CategoryCard({ category, factors }: { category: GapCategory; factors: DenialRiskFactor[] }) {
  const [expanded, setExpanded] = useState(false);

  const priorityCfg: Record<GapCategory['priority'], { color: string; label: string }> = {
    strong:     { color: '#22c55e', label: 'STRONG' },
    good:       { color: '#86efac', label: 'GOOD' },
    needs_work: { color: '#f59e0b', label: 'NEEDS WORK' },
    critical:   { color: '#ef4444', label: 'CRITICAL GAP' },
  };
  const { color, label } = priorityCfg[category.priority];

  // Relevant D-codes for this category
  const relevantFactors = factors.filter(f => category.dCodes.includes(f.code));

  return (
    <div style={{ border: `1px solid ${color}18`, background: `${color}04` }}>

      {/* Header row — clickable */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
          padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#f5f0e8' }}>{category.name}</span>
            <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.25)', fontWeight: 600, letterSpacing: '0.06em' }}>
              {category.weight}% WEIGHT
            </span>
            <span style={{ fontSize: '10px', color, fontWeight: 700, letterSpacing: '0.1em', marginLeft: 'auto' }}>
              {label}
            </span>
          </div>
          {/* Score bar */}
          <div style={{ height: '2px', background: 'rgba(245,240,232,0.06)', position: 'relative' as const }}>
            <div style={{ position: 'absolute' as const, top: 0, left: 0, height: '100%', width: `${category.score}%`, background: color, transition: 'width 0.5s ease' }} />
          </div>
          {/* D-code chips */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' as const }}>
            {relevantFactors.map(f => {
              const rColor = f.risk === 'high' ? '#ef4444' : f.risk === 'moderate' ? '#f59e0b' : '#22c55e';
              return (
                <span key={f.code} style={{
                  fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
                  padding: '1px 5px',
                  color: rColor,
                  border: `1px solid ${rColor}30`,
                  letterSpacing: '0.05em',
                }}>
                  {f.code}
                </span>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color, fontWeight: 300 }}>
            {category.score}
          </span>
          <span style={{
            fontSize: '16px', color: 'rgba(245,240,232,0.2)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>↓</span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          {category.evidence.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={styles.subLabel('rgba(34,197,94,0.6)')}>EVIDENCE FOUND</div>
              <ul style={styles.ul}>
                {category.evidence.map((e, i) => (
                  <li key={i} style={styles.li}>
                    <span style={{ color: '#22c55e', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.5 }}>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category.gaps.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={styles.subLabel(`${color}90`)}>GAPS IDENTIFIED</div>
              <ul style={styles.ul}>
                {category.gaps.map((g, i) => (
                  <li key={i} style={styles.li}>
                    <span style={{ color, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>!</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.5 }}>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category.actions.length > 0 && (
            <div style={{ padding: '14px 16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <div style={styles.subLabel('rgba(201,168,76,0.6)')}>WHAT TO DO</div>
              <ul style={styles.ul}>
                {category.actions.map((a, i) => (
                  <li key={i} style={styles.li}>
                    <span style={{ color: '#C9A84C', fontSize: '10px', flexShrink: 0, marginTop: '3px' }}>→</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.5 }}>{a}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
    padding: '40px 24px 80px',
  } as React.CSSProperties,
  inner: {
    maxWidth: '760px',
    margin: '0 auto',
  } as React.CSSProperties,
  spinner: {
    width: '32px', height: '32px',
    border: '2px solid rgba(201,168,76,0.25)',
    borderTop: '2px solid #C9A84C',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
  eyebrow: {
    fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em',
    color: '#C9A84C', marginBottom: '12px',
  } as React.CSSProperties,
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '40px', fontWeight: 300,
    color: '#f5f0e8', lineHeight: 1.1, marginBottom: '10px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '15px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6,
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
    color: 'rgba(245,240,232,0.35)', textTransform: 'uppercase' as const,
    marginBottom: '16px',
  } as React.CSSProperties,
  navLink: {
    color: 'rgba(201,168,76,0.55)', fontSize: '12px',
    textDecoration: 'none', letterSpacing: '0.03em',
  } as React.CSSProperties,
  ul: {
    listStyle: 'none', padding: 0, margin: 0,
    display: 'flex', flexDirection: 'column' as const, gap: '6px',
  } as React.CSSProperties,
  li: {
    display: 'flex', gap: '10px', alignItems: 'flex-start',
  } as React.CSSProperties,
  subLabel: (color: string): React.CSSProperties => ({
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
    color, marginBottom: '10px',
  }),
};
