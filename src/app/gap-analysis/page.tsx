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
  const [hasAIAnalysis, setHasAIAnalysis] = useState<boolean | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [enrichments, setEnrichments] = useState<Record<string, string>>({});
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const [semanticResults, setSemanticResults] = useState<Record<string, { rating: string; finding: string; risk: string } | null> | null>(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [liveUpdated, setLiveUpdated] = useState(false);

  // Rebuild case profile then re-score — used by the Recalculate button
  const recalculate = async () => {
    setRebuilding(true);
    try {
      await fetch('/api/case-profile/build', { method: 'POST' });
      // Small delay to let the DB write settle before re-fetching
      await new Promise(r => setTimeout(r, 800));
      setLastRefreshed(new Date());
      // Re-trigger the load effect by forcing a state bump
      setLoading(true);
      setResult(null);
      setEnrichments({});
      setSemanticResults(null);
    } catch {
      // Non-fatal
    } finally {
      setRebuilding(false);
    }
  };

  // Supabase realtime subscription — auto-refresh when case_profiles row updates
  useEffect(() => {
    let userId: string | null = null;

    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      userId = data.user?.id ?? null;
      if (!userId) return;

      const channel = supabase
        .channel(`case_profiles:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'case_profiles',
            filter: `user_id=eq.${userId}`,
          },
          () => {
            setLastRefreshed(new Date());
            setLiveUpdated(true);
            setLoading(true);
            setResult(null);
            setEnrichments({});
            setSemanticResults(null);
            // Clear the "live updated" badge after 5s
            setTimeout(() => setLiveUpdated(false), 5000);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          { data: profile },
        ] = await Promise.all([
          supabase
            .from('applications')
            .select('business_name, principal_name, simulator_sessions_used')
            .eq('id', resolvedId).eq('user_id', user.id).single(),
          supabase.from('answers').select('question_key, answer_value').eq('application_id', resolvedId),
          supabase.from('application_documents').select('detected_document_type, user_selected_document_type').eq('application_id', resolvedId),
          supabase.from('case_briefs').select('substantiality_score').eq('application_id', resolvedId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('applications').select('simulator_sessions_used').eq('id', resolvedId).single(),
          supabase.from('simulator_sessions').select('inconsistency_count').eq('application_id', resolvedId).order('started_at', { ascending: false }).limit(1),
          supabase.from('case_profiles').select('archetype').eq('user_id', user.id).maybeSingle(),
        ]);

        if (!app) { setError('Application not found or access denied.'); setLoading(false); return; }
        setBusinessName(app.business_name || 'Your Business');

        setHasAIAnalysis(brief?.substantiality_score != null);

        const resolvedArchetype = profile?.archetype ?? null;

        const simData = {
          sessionsUsed: simApp?.simulator_sessions_used ?? 0,
          latestInconsistencyCount: simSessions?.[0]?.inconsistency_count ?? 0,
        };

        const scored = scoreCase(app, answers || [], docs || [], brief || undefined, simData, resolvedArchetype);
        setResult(scored);

        // Fire LLM enrichment for weak categories (score < 70) — async, non-blocking
        const weakCategories = scored.categories.filter(c => c.score < 70);
        if (weakCategories.length > 0) {
          setEnrichingIds(new Set(weakCategories.map(c => c.id)));
          Promise.all(
            weakCategories.map(async (cat) => {
              try {
                const res = await fetch('/api/gap-analysis/enrich', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    categoryId: cat.id,
                    categoryName: cat.name,
                    gaps: cat.gaps || [],
                    evidence: cat.evidence || [],
                    score: cat.score,
                    businessName: app.business_name,
                    businessCategory: app.business_category,
                    operationalStatus: app.operational_status,
                  }),
                });
                if (res.ok) {
                  const { categoryId, enrichment } = await res.json();
                  if (enrichment) {
                    setEnrichments(prev => ({ ...prev, [categoryId]: enrichment }));
                  }
                }
              } catch {
                // Non-fatal — enrichment failure doesn't break the page
              } finally {
                setEnrichingIds(prev => { const next = new Set(prev); next.delete(cat.id); return next; });
              }
            })
          );
        }

        // Fire semantic eval for 3 critical fields — async, non-blocking
        fetch('/api/gap-analysis/semantic-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ applicationId: resolvedId }),
        })
          .then(r => r.ok ? r.json() : null)
          .then(data => { if (data?.results) setSemanticResults(data.results); })
          .catch(() => {});

      } catch (err: any) {
        setError(err.message || 'Failed to load gap analysis');
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams, lastRefreshed]);

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

  async function runAIAnalysis() {
    if (!appId || analysisRunning) return;
    setAnalysisRunning(true);
    setAnalysisError(null);
    try {
      const res = await fetch(`/api/analysis/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Analysis failed (${res.status})`);
      }
      // Reload the page to pick up the new case brief
      window.location.reload();
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
      setAnalysisRunning(false);
    }
  }

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
        <div style={{ marginBottom: '40px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' as const }}>
          <Link href="/dashboard" style={styles.navLink}>← Dashboard</Link>
          {appId && (
            <>
              <span style={{ color: 'rgba(245,240,232,0.15)' }}>·</span>
              <Link href={`/simulator?applicationId=${appId}`} style={styles.navLink}>Simulator →</Link>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {liveUpdated && (
              <span style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: '#5DCAA5', padding: '3px 8px', border: '1px solid rgba(93,202,165,0.35)', background: 'rgba(93,202,165,0.06)' }}>
                ● Live update
              </span>
            )}
            {lastRefreshed && !liveUpdated && (
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.35)' }}>
                Updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={recalculate}
              disabled={rebuilding}
              style={{
                padding: '7px 16px', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                background: rebuilding ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.3)',
                color: rebuilding ? 'rgba(201,168,76,0.4)' : '#C9A84C',
                cursor: rebuilding ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {rebuilding ? 'Recalculating…' : '↻ Recalculate'}
            </button>
          </div>
        </div>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={styles.eyebrow}>E-2 GAP ANALYSIS</div>
          <h1 style={styles.title}>{businessName || 'Your Case'}</h1>
          <p style={styles.subtitle}>
            Scored against 6 evidence categories and 15 real E-2 denial risk factors.
          </p>
        </div>

        {/* AI analysis banner — shown when no case brief exists yet */}
        {hasAIAnalysis === false && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '20px',
            padding: '18px 24px',
            background: 'rgba(201,168,76,0.07)',
            border: '1px solid rgba(201,168,76,0.25)',
            marginBottom: '32px',
            flexWrap: 'wrap' as const,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#C9A84C', marginBottom: '4px' }}>
                AI CASE ANALYSIS AVAILABLE
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.5 }}>
                Run a full AI analysis to unlock D-code risk scores, investment substantiality assessment, and a personalized denial risk briefing for your case.
              </div>
              {analysisError && (
                <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{analysisError}</div>
              )}
            </div>
            <button
              onClick={runAIAnalysis}
              disabled={analysisRunning}
              style={{
                padding: '10px 20px',
                background: analysisRunning ? 'rgba(201,168,76,0.2)' : '#C9A84C',
                color: analysisRunning ? '#C9A84C' : '#0a0a0a',
                border: '1px solid rgba(201,168,76,0.4)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: analysisRunning ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap' as const,
                transition: 'opacity 0.2s',
              }}
            >
              {analysisRunning ? 'Running analysis…' : 'Run AI analysis →'}
            </button>
          </div>
        )}

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

        {/* ── CRITICAL FIELD SEMANTIC EVALUATION ─────────────────────────── */}
        {semanticResults && Object.keys(semanticResults).length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ ...styles.sectionTitle, marginBottom: '6px' }}>Critical field review</h2>
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)', marginBottom: '16px' }}>
              Three fields that officers scrutinise most closely — assessed against what they need to see.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
              {Object.entries(semanticResults).map(([fieldId, sem]) => {
                if (!sem) return null;
                const FIELD_LABELS: Record<string, { label: string; href: string }> = {
                  projection_basis:    { label: 'Revenue projection basis', href: '/apply/investment' },
                  management_activities: { label: 'Management activities',  href: '/apply/story' },
                  source_of_funds:     { label: 'Source of funds narrative', href: '/apply/investment' },
                };
                const def = FIELD_LABELS[fieldId];
                if (!def) return null;
                const riskColor = sem.risk === 'high' ? '#ef4444' : sem.risk === 'moderate' ? '#f59e0b' : '#22c55e';
                return (
                  <div key={fieldId} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '14px 18px', border: `1px solid ${riskColor}18`, background: `${riskColor}04` }}>
                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riskColor }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#f5f0e8' }}>{def.label}</span>
                        <span style={{ fontSize: '10px', color: riskColor, letterSpacing: '0.08em' }}>{sem.rating.replace('_', ' ').toUpperCase()}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.5)', lineHeight: 1.5, margin: '0 0 6px' }}>{sem.finding}</p>
                      {sem.risk !== 'low' && (
                        <a href={def.href} style={{ fontSize: '11px', color: 'rgba(201,168,76,0.7)', textDecoration: 'none' }}>Update this field →</a>
                      )}
                    </div>
                  </div>
                );
              })}
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
              <CategoryCard
                key={cat.id}
                category={cat}
                factors={result.denialFactors}
                enrichment={enrichments[cat.id] || null}
                enriching={enrichingIds.has(cat.id)}
              />
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

// Maps each D-code to the most relevant case file section to fix it
const D_CODE_FIX_LINKS: Record<string, { label: string; href: string }> = {
  'D-01': { label: 'Investment overview',     href: '/apply/investment#investment-overview' },
  'D-02': { label: 'Investment paper trail',  href: '/apply/investment#paper-trail' },
  'D-03': { label: 'Source of funds',         href: '/apply/investment#source-of-funds' },
  'D-04': { label: 'Business financials',     href: '/apply/investment#projections' },
  'D-05': { label: 'Business plan',           href: '/apply/business#market' },
  'D-06': { label: 'Revenue projections',     href: '/apply/investment#projections' },
  'D-07': { label: 'Hiring plan',             href: '/apply/business#operations' },
  'D-08': { label: 'Practice interview',      href: '/simulator' },
  'D-09': { label: 'Practice interview',      href: '/simulator' },
  'D-10': { label: 'Business operations',     href: '/apply/business#operations' },
  'D-11': { label: 'Your role',               href: '/apply/qualifications#role' },
  'D-12': { label: 'Investment source',       href: '/apply/investment#source-of-funds' },
  'D-13': { label: 'Business entity',         href: '/apply/business#entity' },
  'D-14': { label: 'Business type',           href: '/apply/business' },
  'D-15': { label: 'Ties to home country',    href: '/apply/ties' },
};

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
                      marginBottom: '10px',
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)', marginBottom: '6px' }}>
                        WHAT TO DO
                      </div>
                      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.55, margin: 0 }}>
                        {f.mitigation}
                      </p>
                    </div>
                  )}
                  {D_CODE_FIX_LINKS[f.code] && (
                    <a
                      href={D_CODE_FIX_LINKS[f.code].href}
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-block',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: cfg.color,
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                        borderBottom: `1px solid ${cfg.color}50`,
                        paddingBottom: '1px',
                      }}
                    >
                      Fix this → {D_CODE_FIX_LINKS[f.code].label}
                    </a>
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

function CategoryCard({ category, factors, enrichment, enriching }: { category: GapCategory; factors: DenialRiskFactor[]; enrichment: string | null; enriching: boolean }) {
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

          {/* LLM enrichment — personalized advisory for needs_work categories */}
          {(enriching || enrichment) && (
            <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderLeft: '3px solid rgba(201,168,76,0.4)' }}>
              <div style={styles.subLabel('rgba(201,168,76,0.5)')}>E2go Advisor</div>
              {enriching && !enrichment ? (
                <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)', fontStyle: 'italic' }}>Generating personalised guidance…</div>
              ) : (
                <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6, margin: 0 }}>{enrichment}</p>
              )}
            </div>
          )}

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
