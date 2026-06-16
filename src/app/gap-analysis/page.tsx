/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import Link from 'next/link';
import { scoreCase, type GapAnalysisResult, type GapCategory } from '@/lib/gap-analysis-engine';

const supabase = createBrowserSupabaseClient();

export default function GapAnalysisPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '2px solid rgba(201,168,76,0.3)', borderTop: '2px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <GapAnalysisInner />
    </Suspense>
  );
}

// =============================================================================
// INNER — uses useSearchParams (must be inside Suspense)
// =============================================================================

function GapAnalysisInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);
  const [applicationName, setApplicationName] = useState<string | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login?next=/gap-analysis');
        return;
      }

      try {
        // Resolve application
        let appId = searchParams.get('applicationId');

        if (!appId) {
          const { data: apps } = await supabase
            .from('applications')
            .select('id, business_name')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!apps || apps.length === 0) {
            setError('No application found. Please create a case file first.');
            setLoading(false);
            return;
          }
          appId = apps[0].id;
        }

        setApplicationId(appId);

        // Fetch all needed data in parallel
        const [
          { data: app },
          { data: answers },
          { data: docs },
          { data: brief },
        ] = await Promise.all([
          supabase
            .from('applications')
            .select('business_name, business_category, operational_status, target_state, principal_name')
            .eq('id', appId)
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('answers')
            .select('question_key, answer_value')
            .eq('application_id', appId),
          supabase
            .from('application_documents')
            .select('detected_document_type, user_selected_document_type')
            .eq('application_id', appId),
          supabase
            .from('case_briefs')
            .select('substantiality_score, marginality_score')
            .eq('application_id', appId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (!app) {
          setError('Application not found or access denied.');
          setLoading(false);
          return;
        }

        setApplicationName(app.business_name || 'Your Business');

        const scored = scoreCase(
          app,
          answers || [],
          docs || [],
          brief || undefined
        );
        setResult(scored);
      } catch (err: any) {
        setError(err.message || 'Failed to load gap analysis');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router, searchParams]);

  // ===========================================================================
  // LOADING
  // ===========================================================================

  if (loading) {
    return (
      <div style={pageStyles.root}>
        <div style={{ textAlign: 'center' as const, padding: '80px 24px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '2px solid rgba(201,168,76,0.3)',
            borderTop: '2px solid #C9A84C',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: '13px' }}>
            Analysing your case file...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyles.root}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' as const }}>
          <div style={{
            padding: '24px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.06)',
            color: 'rgba(200,120,120,0.9)',
            fontSize: '14px',
            marginBottom: '24px',
          }}>
            {error}
          </div>
          <Link href="/dashboard" style={{ color: '#C9A84C', fontSize: '14px' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  // ===========================================================================
  // RENDER
  // ===========================================================================

  const readinessConfig = {
    strong: { label: 'Strong case', color: '#22c55e', bg: '#22c55e20' },
    moderate: { label: 'Moderate — gaps to address', color: '#f59e0b', bg: '#f59e0b20' },
    needs_work: { label: 'Significant gaps identified', color: '#ef4444', bg: '#ef444420' },
  }[result.readiness];

  return (
    <div style={pageStyles.root}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fillBar { from { width: 0%; } to { width: var(--target-width); } }
      `}</style>

      <div style={pageStyles.inner}>
        {/* Navigation */}
        <div style={{ marginBottom: '40px' }}>
          <Link href="/dashboard" style={{ color: 'rgba(201,168,76,0.6)', fontSize: '12px', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
          {applicationId && (
            <>
              <span style={{ color: 'rgba(245,240,232,0.2)', margin: '0 8px' }}>·</span>
              <Link
                href={`/simulator?applicationId=${applicationId}`}
                style={{ color: 'rgba(201,168,76,0.6)', fontSize: '12px', textDecoration: 'none' }}
              >
                Go to simulator →
              </Link>
            </>
          )}
        </div>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={pageStyles.eyebrow}>E-2 GAP ANALYSIS</div>
          <h1 style={pageStyles.title}>
            {applicationName || 'Your Case'}
          </h1>
          <p style={pageStyles.subtitle}>
            Scored against the 6 evidence categories E-2 officers evaluate at interview.
          </p>
        </div>

        {/* Readiness badge + overall score */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          padding: '24px 28px',
          background: readinessConfig.bg,
          border: `1px solid ${readinessConfig.color}30`,
          marginBottom: '40px',
          flexWrap: 'wrap' as const,
        }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', color: readinessConfig.color, marginBottom: '4px' }}>
              OVERALL READINESS
            </div>
            <div style={{ fontSize: '15px', color: '#f5f0e8', fontWeight: 500 }}>
              {readinessConfig.label}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
            <div style={{ fontSize: '48px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: readinessConfig.color, lineHeight: 1 }}>
              {result.overallScore}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.06em' }}>
              / 100 WEIGHTED
            </div>
          </div>
        </div>

        {/* Top priorities */}
        {result.topPriorities.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={pageStyles.sectionTitle}>Top priorities</h2>
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {result.topPriorities.map((p, i) => (
                <li key={i} style={{
                  display: 'flex',
                  gap: '16px',
                  alignItems: 'flex-start',
                  padding: '14px 0',
                  borderBottom: i < result.topPriorities.length - 1 ? '1px solid rgba(245,240,232,0.05)' : 'none',
                }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid rgba(201,168,76,0.25)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#C9A84C',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: '14px', color: 'rgba(245,240,232,0.8)', lineHeight: 1.55 }}>
                    {p}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Category cards */}
        <h2 style={{ ...pageStyles.sectionTitle, marginBottom: '20px' }}>Evidence categories</h2>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '16px', marginBottom: '48px' }}>
          {result.categories.map(cat => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>

        {/* Footer CTA */}
        <div style={{
          padding: '28px 32px',
          border: '1px solid rgba(201,168,76,0.12)',
          background: 'rgba(201,168,76,0.02)',
          textAlign: 'center' as const,
        }}>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.6)', marginBottom: '16px', lineHeight: 1.6 }}>
            Practice answering gap-related questions in the Interview Simulator.
          </p>
          {applicationId && (
            <Link
              href={`/simulator?applicationId=${applicationId}`}
              style={{
                display: 'inline-block',
                padding: '12px 28px',
                background: '#C9A84C',
                color: '#0a0a0a',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none',
              }}
            >
              Practice in the Simulator
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CATEGORY CARD
// =============================================================================

function CategoryCard({ category }: { category: GapCategory }) {
  const [expanded, setExpanded] = useState(false);

  const priorityConfig: Record<GapCategory['priority'], { color: string; label: string }> = {
    strong: { color: '#22c55e', label: 'STRONG' },
    good: { color: '#86efac', label: 'GOOD' },
    needs_work: { color: '#f59e0b', label: 'NEEDS WORK' },
    critical: { color: '#ef4444', label: 'CRITICAL GAP' },
  };

  const { color, label } = priorityConfig[category.priority];

  return (
    <div style={{
      border: `1px solid ${color}20`,
      background: `${color}04`,
    }}>
      {/* Header row */}
      <button
        onClick={() => setExpanded(prev => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '20px 24px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left' as const,
        }}
      >
        {/* Category name + weight */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#f5f0e8' }}>
              {category.name}
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              color: 'rgba(245,240,232,0.3)',
            }}>
              {category.weight}% WEIGHT
            </span>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color,
              marginLeft: 'auto',
            }}>
              {label}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'relative' as const, height: '3px', background: 'rgba(245,240,232,0.06)' }}>
            <div style={{
              position: 'absolute' as const,
              top: 0,
              left: 0,
              height: '100%',
              width: `${category.score}%`,
              background: color,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Score + expand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <span style={{ fontSize: '20px', fontFamily: "'Cormorant Garamond', serif", color, fontWeight: 300 }}>
            {category.score}
          </span>
          <span style={{
            fontSize: '18px',
            color: 'rgba(245,240,232,0.2)',
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>
            ↓
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ padding: '0 24px 24px' }}>
          {/* Evidence found */}
          {category.evidence.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(34,197,94,0.6)', marginBottom: '10px' }}>
                EVIDENCE FOUND
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                {category.evidence.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px', fontSize: '12px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.5 }}>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {category.gaps.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: `${color}90`, marginBottom: '10px' }}>
                GAPS IDENTIFIED
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                {category.gaps.map((g, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color, flexShrink: 0, marginTop: '1px', fontSize: '12px' }}>!</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.5 }}>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          {category.actions.length > 0 && (
            <div style={{
              padding: '14px 16px',
              background: 'rgba(201,168,76,0.04)',
              border: '1px solid rgba(201,168,76,0.12)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(201,168,76,0.6)', marginBottom: '10px' }}>
                WHAT TO DO
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                {category.actions.map((a, i) => (
                  <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ color: '#C9A84C', flexShrink: 0, marginTop: '2px', fontSize: '10px' }}>→</span>
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

const pageStyles = {
  root: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
    padding: '40px 24px 80px',
  },
  inner: {
    maxWidth: '720px',
    margin: '0 auto',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    color: '#C9A84C',
    marginBottom: '12px',
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '40px',
    fontWeight: 300,
    color: '#f5f0e8',
    lineHeight: 1.1,
    marginBottom: '10px',
  },
  subtitle: {
    fontSize: '15px',
    color: 'rgba(245,240,232,0.5)',
    lineHeight: 1.6,
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    letterSpacing: '0.06em',
    color: 'rgba(245,240,232,0.5)',
    textTransform: 'uppercase' as const,
    marginBottom: '16px',
  },
};
