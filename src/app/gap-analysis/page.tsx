/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import {
  scoreCase,
  type GapAnalysisResult,
  type SimulatorData,
} from '@/lib/gap-analysis-engine';
import DenialRiskRadar from '@/components/gap-analysis/DenialRiskRadar';
import CategoryCard from '@/components/gap-analysis/CategoryCard';

const supabase = createBrowserSupabaseClient();

type DocRow = { detected_document_type?: string | null; user_selected_document_type?: string | null };
type AppRow = { business_name?: string | null; business_category?: string | null; operational_status?: string | null; target_state?: string | null; principal_name?: string | null; simulator_sessions_used?: number | null };
type BriefRow = { substantiality_score?: number | null; marginality_score?: number | null };

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
// INNER — data fetch + live rescore + render
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

  // Live rescore state — updated optimistically as user fills in answers
  const [localAnswers, setLocalAnswers] = useState<Map<string, string>>(new Map());
  const [localDocs, setLocalDocs] = useState<DocRow[]>([]);
  const [liveResult, setLiveResult] = useState<GapAnalysisResult | null>(null);
  const [cachedApp, setCachedApp] = useState<AppRow | null>(null);
  const [cachedBrief, setCachedBrief] = useState<BriefRow | undefined>(undefined);
  const [cachedSim, setCachedSim] = useState<SimulatorData>({ sessionsUsed: 0, latestInconsistencyCount: 0 });
  const [cachedArchetype, setCachedArchetype] = useState<string | null>(null);

  // Diff tracking — captures baseline risk levels on first load, computes improvements live
  const initialRisksRef = useRef<Map<string, string>>(new Map());
  const changedKeysRef = useRef<Set<string>>(new Set());
  const [showReanalysisPrompt, setShowReanalysisPrompt] = useState(false);
  const [resolvedCodes, setResolvedCodes] = useState<{ code: string; from: string; to: string }[]>([]);

  // Rebuild case profile then re-score
  const recalculate = async () => {
    setRebuilding(true);
    try {
      await fetch('/api/case-profile/build', { method: 'POST' });
      await new Promise(r => setTimeout(r, 800));
      setLastRefreshed(new Date());
      setLoading(true);
      setResult(null);
      setLiveResult(null);
      setEnrichments({});
      setSemanticResults(null);
    } catch {
      // Non-fatal
    } finally {
      setRebuilding(false);
    }
  };

  // Realtime subscription — auto-refresh when case_profiles row updates
  useEffect(() => {
    let userId: string | null = null;
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      userId = data.user?.id ?? null;
      if (!userId) return;

      const channel = supabase
        .channel(`case_profiles:${userId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'case_profiles', filter: `user_id=eq.${userId}` }, () => {
          setLastRefreshed(new Date());
          setLiveUpdated(true);
          setLoading(true);
          setResult(null);
          setLiveResult(null);
          setEnrichments({});
          setSemanticResults(null);
          setTimeout(() => setLiveUpdated(false), 5000);
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Main data load
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

        const [
          { data: app },
          { data: answers },
          { data: docs },
          { data: brief },
          { data: simApp },
          { data: simSessions },
          { data: profile },
        ] = await Promise.all([
          supabase.from('applications').select('business_name, principal_name, simulator_sessions_used').eq('id', resolvedId).eq('user_id', user.id).single(),
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
        const simData: SimulatorData = {
          sessionsUsed: simApp?.simulator_sessions_used ?? 0,
          latestInconsistencyCount: simSessions?.[0]?.inconsistency_count ?? 0,
        };

        const scored = scoreCase(app, answers || [], docs || [], brief || undefined, simData, resolvedArchetype);
        setResult(scored);

        // Capture baseline risk levels for session-diff tracking
        const riskMap = new Map<string, string>();
        for (const f of scored.denialFactors) riskMap.set(f.code, f.risk);
        initialRisksRef.current = riskMap;
        changedKeysRef.current = new Set();
        setShowReanalysisPrompt(false);
        setResolvedCodes([]);

        // Initialise live rescore state
        const initialAnswerMap = new Map<string, string>();
        for (const a of (answers || [])) {
          if (a.answer_value) initialAnswerMap.set(a.question_key, a.answer_value);
        }
        setLocalAnswers(initialAnswerMap);
        setLocalDocs(docs || []);
        setLiveResult(scored);
        setCachedApp(app);
        setCachedBrief(brief || undefined);
        setCachedSim(simData);
        setCachedArchetype(resolvedArchetype);

        // Fire LLM enrichment for weak categories — async, non-blocking
        const weakCategories = scored.categories.filter(c => c.score < 70);
        if (weakCategories.length > 0) {
          setEnrichingIds(new Set(weakCategories.map(c => c.id)));
          Promise.all(weakCategories.map(async (cat) => {
            try {
              const res = await fetch('/api/gap-analysis/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  categoryId: cat.id, categoryName: cat.name,
                  gaps: cat.gaps || [], evidence: cat.evidence || [],
                  score: cat.score, businessName: app.business_name,
                  businessCategory: (app as any).business_category,
                  operationalStatus: (app as any).operational_status,
                }),
              });
              if (res.ok) {
                const { categoryId, enrichment } = await res.json();
                if (enrichment) setEnrichments(prev => ({ ...prev, [categoryId]: enrichment }));
              }
            } catch { /* Non-fatal */ } finally {
              setEnrichingIds(prev => { const next = new Set(prev); next.delete(cat.id); return next; });
            }
          }));
        }

        // Fire semantic eval — async, non-blocking
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

  // Live rescore — runs synchronously whenever local answers/docs change
  useEffect(() => {
    if (!cachedApp) return;
    const answerRows = Array.from(localAnswers.entries()).map(([question_key, answer_value]) => ({ question_key, answer_value }));
    const rescored = scoreCase(cachedApp, answerRows, localDocs, cachedBrief, cachedSim, cachedArchetype);
    setLiveResult(rescored);

    // Compute which D-codes improved vs. the initial load baseline
    const riskOrder: Record<string, number> = { low: 0, moderate: 1, high: 2 };
    const improvements: { code: string; from: string; to: string }[] = [];
    for (const f of rescored.denialFactors) {
      const initial = initialRisksRef.current.get(f.code);
      if (initial && (riskOrder[f.risk] ?? 3) < (riskOrder[initial] ?? 3)) {
        improvements.push({ code: f.code, from: initial, to: f.risk });
      }
    }
    setResolvedCodes(improvements);
  }, [localAnswers, localDocs, cachedApp, cachedBrief, cachedSim, cachedArchetype]);

  // Handlers passed down to DenialRiskRadar → RemediationPanel
  const handleAnswerChange = useCallback((key: string, value: string) => {
    changedKeysRef.current.add(key);
    if (changedKeysRef.current.size >= 3) setShowReanalysisPrompt(true);
    setLocalAnswers(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  }, []);

  const handleDocUploaded = useCallback((docType: string) => {
    setLocalDocs(prev => [...prev, { user_selected_document_type: docType }]);
  }, []);

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
        throw new Error((body as any).error || `Analysis failed (${res.status})`);
      }
      window.location.reload();
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed. Please try again.');
      setAnalysisRunning(false);
    }
  }

  // Use liveResult for all display — falls back to initial result during first load
  const display = liveResult ?? result;

  const readinessCfg = {
    strong:     { label: 'Strong case',                 color: '#22c55e', bg: '#22c55e14' },
    moderate:   { label: 'Moderate — gaps to address',  color: '#f59e0b', bg: '#f59e0b14' },
    needs_work: { label: 'Significant gaps identified', color: '#ef4444', bg: '#ef444414' },
  }[display.readiness];

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
            Scored against 6 evidence categories and 15 real E-2 denial risk factors. Click any risk card to fill the gap.
          </p>
        </div>

        {/* AI analysis banner */}
        {hasAIAnalysis === false && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '18px 24px', background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.25)', marginBottom: '32px', flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: '#C9A84C', marginBottom: '4px' }}>
                AI CASE ANALYSIS AVAILABLE
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.5 }}>
                Run a full AI analysis to unlock D-code risk scores, investment substantiality assessment, and a personalized denial risk briefing.
              </div>
              {analysisError && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '6px' }}>{analysisError}</div>}
            </div>
            <button
              onClick={runAIAnalysis}
              disabled={analysisRunning}
              style={{
                padding: '10px 20px',
                background: analysisRunning ? 'rgba(201,168,76,0.2)' : '#C9A84C',
                color: analysisRunning ? '#C9A84C' : '#0a0a0a',
                border: '1px solid rgba(201,168,76,0.4)',
                fontSize: '13px', fontWeight: 600,
                cursor: analysisRunning ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
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
              {display.highRiskCount > 0 && (
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 500 }}>
                  {display.highRiskCount} critical risk{display.highRiskCount > 1 ? 's' : ''}
                </span>
              )}
              {display.moderateRiskCount > 0 && (
                <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
                  {display.moderateRiskCount} moderate risk{display.moderateRiskCount > 1 ? 's' : ''}
                </span>
              )}
              {display.highRiskCount === 0 && display.moderateRiskCount === 0 && (
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>No critical risks</span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '56px', fontWeight: 300, color: readinessCfg.color, lineHeight: 1 }}>
              {display.overallScore}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em' }}>/ 100 WEIGHTED</div>
          </div>
        </div>

        {/* Top priorities */}
        {display.topPriorities.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <h2 style={styles.sectionTitle}>Immediate priorities</h2>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0' }}>
              {display.topPriorities.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', padding: '14px 0', borderBottom: '1px solid rgba(245,240,232,0.05)' }}>
                  <span style={{ width: '22px', height: '22px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.6 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Critical field semantic evaluation */}
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
                  projection_basis:      { label: 'Revenue projection basis',   href: '/apply/investment' },
                  management_activities: { label: 'Management activities',       href: '/apply/story' },
                  source_of_funds:       { label: 'Source of funds narrative',   href: '/apply/investment' },
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

        {/* Denial risk radar — now with inline remediation */}
        <DenialRiskRadar
          factors={display.denialFactors}
          localAnswers={localAnswers}
          localDocs={localDocs}
          appId={appId ?? ''}
          onAnswerChange={handleAnswerChange}
          onDocUploaded={handleDocUploaded}
        />

        {/* Re-analysis prompt — appears after 3+ distinct fields updated */}
        {showReanalysisPrompt && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px',
            padding: '14px 18px', marginTop: '12px',
            background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)',
            flexWrap: 'wrap' as const,
          }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#C9A84C' }}>
                FIELDS UPDATED
              </span>
              <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)', margin: '3px 0 0', lineHeight: 1.5 }}>
                You&apos;ve updated {changedKeysRef.current.size} fields this session. Re-run AI analysis to refresh your substantiality scores and denial risk briefing.
              </p>
            </div>
            <button
              onClick={() => { setShowReanalysisPrompt(false); runAIAnalysis(); }}
              disabled={analysisRunning}
              style={{
                padding: '8px 16px', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.06em', background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)', color: '#C9A84C',
                cursor: analysisRunning ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' as const,
              }}
            >
              {analysisRunning ? 'Running…' : 'Re-run AI analysis →'}
            </button>
            <button
              onClick={() => setShowReanalysisPrompt(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(245,240,232,0.25)', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Resolution summary — shows which D-codes improved this session */}
        {resolvedCodes.length > 0 && (
          <div style={{
            padding: '16px 20px', marginTop: '12px',
            background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.18)',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(34,197,94,0.8)', marginBottom: '10px' }}>
              PROGRESS THIS SESSION — {resolvedCodes.length} RISK{resolvedCodes.length > 1 ? 'S' : ''} REDUCED
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              {resolvedCodes.map(r => {
                const fromColor = r.from === 'high' ? '#ef4444' : '#f59e0b';
                const toColor = r.to === 'low' ? '#22c55e' : '#f59e0b';
                return (
                  <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'rgba(245,240,232,0.55)', minWidth: '36px' }}>{r.code}</span>
                    <span style={{ color: fromColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>{r.from.toUpperCase()}</span>
                    <span style={{ color: 'rgba(245,240,232,0.25)' }}>→</span>
                    <span style={{ color: toColor, fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>{r.to.toUpperCase()}</span>
                    <span style={{ color: 'rgba(245,240,232,0.3)', fontSize: '11px' }}>· live score updated</span>
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', margin: '10px 0 0', lineHeight: 1.5 }}>
              These changes are reflected in your score above. Re-run AI analysis to update your full case briefing.
            </p>
          </div>
        )}

        {/* 6 evidence categories */}
        <div style={{ marginBottom: '48px' }}>
          <h2 style={{ ...styles.sectionTitle, marginBottom: '20px' }}>Evidence categories</h2>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
            {display.categories.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                factors={display.denialFactors}
                enrichment={enrichments[cat.id] || null}
                enriching={enrichingIds.has(cat.id)}
              />
            ))}
          </div>
        </div>

        {/* Footer CTA */}
        <div style={{ padding: '28px 32px', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.02)', textAlign: 'center' as const }}>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.5)', marginBottom: '16px', lineHeight: 1.6 }}>
            Practice answering officer questions about the gaps identified above.
          </p>
          {appId && (
            <Link href={`/simulator?applicationId=${appId}`} style={{ display: 'inline-block', padding: '12px 28px', background: '#C9A84C', color: '#0a0a0a', fontSize: '14px', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
              Practice in the Simulator
            </Link>
          )}
        </div>

      </div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = {
  page: {
    minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif", padding: '40px 24px 80px',
  } as React.CSSProperties,
  inner: { maxWidth: '760px', margin: '0 auto' } as React.CSSProperties,
  spinner: {
    width: '32px', height: '32px',
    border: '2px solid rgba(201,168,76,0.25)', borderTop: '2px solid #C9A84C',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  } as React.CSSProperties,
  eyebrow: { fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: '#C9A84C', marginBottom: '12px' } as React.CSSProperties,
  title: { fontFamily: "'Cormorant Garamond', serif", fontSize: '40px', fontWeight: 300, color: '#f5f0e8', lineHeight: 1.1, marginBottom: '10px' } as React.CSSProperties,
  subtitle: { fontSize: '15px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6 } as React.CSSProperties,
  sectionTitle: { fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.35)', textTransform: 'uppercase' as const, marginBottom: '16px' } as React.CSSProperties,
  navLink: { color: 'rgba(201,168,76,0.55)', fontSize: '12px', textDecoration: 'none', letterSpacing: '0.03em' } as React.CSSProperties,
};
