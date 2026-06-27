'use client';

import { useState, useEffect } from 'react';
import GenerationProgress from '@/components/ui/GenerationProgress';
import type {
  InterviewBriefData,
  CategoryScore,
  DenialRisk,
  GapAction,
} from '@/app/api/simulator/interview-prep/route';

// Steps cycled in the interview prep loading state
const PREP_STEPS = [
  'Running 15-factor denial risk assessment…',
  'Scoring source of funds evidence…',
  'Checking investment substantiality…',
  'Evaluating management role depth…',
  'Analysing employment creation plan…',
  'Reviewing business plan viability…',
  'Building your personalised coaching brief…',
];

interface InterviewBriefProps {
  applicationId: string;
  businessName?: string | null;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const LIKELIHOOD_LABEL: Record<string, string> = { high: 'Will ask', medium: 'Likely', low: 'Possible' };
const LIKELIHOOD_COLOR: Record<string, string> = {
  high: '#C9A84C',
  medium: 'rgba(245,240,232,0.5)',
  low: 'rgba(245,240,232,0.28)',
};
const PRIORITY_COLOR: Record<string, string> = {
  strong: '#22c55e',
  good: '#C9A84C',
  needs_work: '#f97316',
  critical: '#ef4444',
};
const PRIORITY_BG: Record<string, string> = {
  strong: 'rgba(34,197,94,0.08)',
  good: 'rgba(201,168,76,0.08)',
  needs_work: 'rgba(249,115,22,0.08)',
  critical: 'rgba(239,68,68,0.08)',
};
const PRIORITY_LABEL: Record<string, string> = {
  strong: 'STRONG',
  good: 'GOOD',
  needs_work: 'NEEDS WORK',
  critical: 'CRITICAL',
};
const RISK_COLOR: Record<string, string> = {
  high: '#ef4444',
  moderate: '#f97316',
  low: '#22c55e',
};
const RISK_BG: Record<string, string> = {
  high: 'rgba(239,68,68,0.06)',
  moderate: 'rgba(249,115,22,0.05)',
  low: 'rgba(34,197,94,0.05)',
};
const URGENCY_COLOR: Record<string, string> = {
  critical: '#ef4444',
  important: '#f97316',
  recommended: '#C9A84C',
};
const URGENCY_LABEL: Record<string, string> = {
  critical: 'CRITICAL',
  important: 'IMPORTANT',
  recommended: 'RECOMMENDED',
};
const READINESS_COLOR: Record<string, string> = {
  strong: '#22c55e',
  moderate: '#C9A84C',
  needs_work: '#ef4444',
};
const READINESS_LABEL: Record<string, string> = {
  strong: 'INTERVIEW READY',
  moderate: 'MODERATE READINESS',
  needs_work: 'PREPARATION NEEDED',
};

// =============================================================================
// SCORE GAUGE
// =============================================================================

function ScoreGauge({ score, readiness }: { score: number; readiness: 'strong' | 'moderate' | 'needs_work' }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const fill = circ * Math.min(score, 100) / 100;
  const color = READINESS_COLOR[readiness];
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }}>
      <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="7" />
      <circle
        cx="55" cy="55" r={r} fill="none"
        stroke={color} strokeWidth="7"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 55 55)"
        style={{ opacity: 0.85 }}
      />
      <text x="55" y="50" textAnchor="middle" fill="#f5f0e8" fontSize="26" fontWeight="700"
        fontFamily="'Cormorant Garamond', serif">{score}</text>
      <text x="55" y="66" textAnchor="middle" fill="rgba(245,240,232,0.3)" fontSize="9"
        fontFamily="'DM Sans', sans-serif">/ 100</text>
    </svg>
  );
}

// =============================================================================
// SECTION DIVIDER
// =============================================================================

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', marginTop: '36px' }}>
      <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.12)' }} />
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.18em',
        textTransform: 'uppercase' as const, color: 'rgba(201,168,76,0.82)',
        fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' as const,
      }}>{children}</span>
      <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.12)' }} />
    </div>
  );
}

// =============================================================================
// CATEGORY CARD
// =============================================================================

function CategoryCard({ cat }: { cat: CategoryScore }) {
  const color = PRIORITY_COLOR[cat.priority];
  const bg = PRIORITY_BG[cat.priority];
  return (
    <div style={{
      padding: '16px 18px',
      border: `1px solid ${color}22`,
      background: bg,
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(245,240,232,0.75)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.3 }}>
          {cat.name}
        </span>
        <span style={{
          fontSize: '8px', fontWeight: 700, letterSpacing: '0.1em',
          color, padding: '2px 6px', border: `1px solid ${color}44`,
          background: `${color}11`, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' as const,
        }}>
          {PRIORITY_LABEL[cat.priority]}
        </span>
      </div>
      {/* Progress bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
          <div style={{ width: `${cat.score}%`, height: '100%', background: color, borderRadius: '2px', opacity: 0.8 }} />
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, color, fontFamily: "'DM Sans', sans-serif", width: '32px', textAlign: 'right' as const }}>
          {cat.score}
        </span>
      </div>
      {/* Weight badge */}
      <span style={{ fontSize: '9px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
        {cat.weight}% of overall score
      </span>
      {/* Top gaps */}
      {cat.gaps.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {cat.gaps.slice(0, 2).map((gap, i) => (
            <li key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
              <span style={{ color: '#f97316', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>!</span>
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.74)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{gap}</span>
            </li>
          ))}
        </ul>
      )}
      {cat.gaps.length === 0 && cat.evidence.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
          <span style={{ color: '#22c55e', fontSize: '10px', flexShrink: 0, marginTop: '1px' }}>✓</span>
          <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.72)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
            {cat.evidence[0].substring(0, 80)}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// DENIAL RISK CARD
// =============================================================================

function DenialRiskCard({ risk }: { risk: DenialRisk }) {
  const [expanded, setExpanded] = useState(risk.risk === 'high');
  const color = RISK_COLOR[risk.risk];
  const bg = RISK_BG[risk.risk];
  return (
    <div style={{
      border: `1px solid ${color}28`,
      background: bg,
      marginBottom: '8px',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', textAlign: 'left' as const, background: 'none', border: 'none',
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <span style={{
          fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em',
          color, padding: '2px 7px', border: `1px solid ${color}55`,
          background: `${color}15`, fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
        }}>
          {risk.risk.toUpperCase()}
        </span>
        <span style={{
          fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em',
          color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", flexShrink: 0,
        }}>
          {risk.code}
        </span>
        <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', fontFamily: "'DM Sans', sans-serif", flex: 1, lineHeight: 1.4 }}>
          {risk.name}
        </span>
        <span style={{ color: 'rgba(245,240,232,0.62)', fontSize: '12px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.65, margin: '0 0 10px', fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ color: 'rgba(245,240,232,0.70)', fontWeight: 600, marginRight: '6px' }}>FINDING:</span>
            {risk.finding}
          </p>
          {risk.mitigation && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.025)', borderLeft: `2px solid ${color}55` }}>
              <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: color, fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: '5px' }}>
                HOW TO ADDRESS THIS
              </span>
              <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
                {risk.mitigation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ACTION ITEM
// =============================================================================

function ActionItem({ action, index }: { action: GapAction; index: number }) {
  const color = URGENCY_COLOR[action.urgency];
  return (
    <div style={{
      display: 'flex', gap: '14px', padding: '14px 16px',
      borderBottom: '1px solid rgba(245,240,232,0.04)',
      alignItems: 'flex-start',
    }}>
      <span style={{
        fontSize: '11px', fontWeight: 700, color: 'rgba(245,240,232,0.62)',
        fontFamily: "'DM Sans', sans-serif", flexShrink: 0, width: '18px',
        paddingTop: '1px',
      }}>{index}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' as const }}>
          <span style={{
            fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em',
            color, padding: '2px 6px', border: `1px solid ${color}44`,
            background: `${color}12`, fontFamily: "'DM Sans', sans-serif",
          }}>
            {URGENCY_LABEL[action.urgency]}
          </span>
          <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif" }}>
            {action.gap}
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6, margin: 0, fontFamily: "'DM Sans', sans-serif" }}>
          {action.action}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// LOADING STATE
// =============================================================================

function LoadingState() {
  return (
    <div style={s.root}>
      <div style={s.header}>
        <span style={s.eyebrow}>INTERVIEW PREPARATION REPORT</span>
        <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.82)', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' as const }}>
          Analysing your case…
        </span>
      </div>
      <div style={{ padding: '28px 0 24px' }}>
        <GenerationProgress
          isActive={true}
          estimatedSeconds={90}
          steps={PREP_STEPS}
          showEstimate={true}
        />
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InterviewBrief({ applicationId, businessName }: InterviewBriefProps) {
  const [brief, setBrief] = useState<InterviewBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // v2 cache key — forces refresh after the engine upgrade
    const cacheKey = `ib2-${applicationId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as InterviewBriefData;
        if (parsed.overallScore !== undefined) {
          setBrief(parsed);
          setLoading(false);
          return;
        }
      } catch { /* stale — fall through */ }
    }

    const load = async () => {
      try {
        const res = await fetch(`/api/simulator/interview-prep?applicationId=${applicationId}`);
        if (!res.ok) throw new Error('Failed');
        const data: InterviewBriefData = await res.json();
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
        setBrief(data);
      } catch {
        setFailed(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [applicationId]);

  if (loading) return <LoadingState />;
  if (failed || !brief) return null;

  const readinessColor = READINESS_COLOR[brief.readiness];
  const highRisks = brief.denialRisks.filter(r => r.risk === 'high');
  const modRisks = brief.denialRisks.filter(r => r.risk === 'moderate');

  return (
    <div style={s.root}>
      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <span style={s.eyebrow}>INTERVIEW PREPARATION REPORT</span>
          {businessName && (
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)', marginTop: '4px', fontFamily: "'DM Sans', sans-serif" }}>
              {businessName}
            </p>
          )}
        </div>
        <span style={s.aiTag}>AI-POWERED · ENGINE-SCORED</span>
      </div>

      {/* ── SCORE ROW ── */}
      <div style={s.scoreRow}>
        <ScoreGauge score={brief.overallScore} readiness={brief.readiness} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 12px', border: `1px solid ${readinessColor}44`,
            background: `${readinessColor}10`, alignSelf: 'flex-start' as const,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: readinessColor, flexShrink: 0 }} />
            <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.16em', color: readinessColor, fontFamily: "'DM Sans', sans-serif" }}>
              {READINESS_LABEL[brief.readiness]}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            {brief.highRiskCount > 0 && (
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#ef4444', padding: '3px 8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', fontFamily: "'DM Sans', sans-serif" }}>
                {brief.highRiskCount} HIGH RISK
              </span>
            )}
            {brief.moderateRiskCount > 0 && (
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#f97316', padding: '3px 8px', border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.07)', fontFamily: "'DM Sans', sans-serif" }}>
                {brief.moderateRiskCount} MODERATE
              </span>
            )}
            {brief.highRiskCount === 0 && brief.moderateRiskCount === 0 && (
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#22c55e', padding: '3px 8px', border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.07)', fontFamily: "'DM Sans', sans-serif" }}>
                NO HIGH-RISK FACTORS
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.65, margin: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            {brief.applicationSummary}
          </p>
        </div>
      </div>

      {/* ── HIGHLIGHTS + LEAD WITH ── */}
      <SectionLabel>Case Strengths & Opening Strategy</SectionLabel>
      <div style={s.twoCol}>
        <div style={s.panel}>
          <div style={s.panelHeading}>Key strengths</div>
          <ul style={s.bulletList}>
            {brief.highlights.map((h, i) => (
              <li key={i} style={s.bulletRow}>
                <span style={{ ...s.bulletDot, color: '#22c55e' }}>✓</span>
                <span style={s.bulletText}>{h}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={s.panel}>
          <div style={s.panelHeading}>Open your interview with</div>
          <ul style={s.bulletList}>
            {brief.leadWithThese.map((l, i) => (
              <li key={i} style={s.bulletRow}>
                <span style={{ ...s.bulletDot, color: '#C9A84C' }}>◆</span>
                <span style={s.bulletText}>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── CATEGORY SCORES ── */}
      <SectionLabel>Evidence Category Scores</SectionLabel>
      <div style={s.categoryGrid}>
        {brief.categoryScores.map(cat => <CategoryCard key={cat.id} cat={cat} />)}
      </div>

      {/* ── DENIAL RISK ASSESSMENT ── */}
      {brief.denialRisks.length > 0 && (
        <>
          <SectionLabel>
            {`Denial Risk Assessment — ${highRisks.length} High · ${modRisks.length} Moderate`}
          </SectionLabel>
          <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px', fontStyle: 'italic' as const }}>
            Risk factors are derived from 15 documented denial grounds in 9 FAM 402.9 and real Toronto interview data. Click any factor to expand.
          </p>
          {highRisks.map(r => <DenialRiskCard key={r.code} risk={r} />)}
          {modRisks.map(r => <DenialRiskCard key={r.code} risk={r} />)}
        </>
      )}

      {/* ── WHAT THE OFFICER WILL ASK ── */}
      <SectionLabel>What the Officer Will Ask</SectionLabel>
      <div>
        {brief.interviewTopics.map((t, i) => (
          <div key={i} style={s.topicRow}>
            <div style={s.topicHeader}>
              <span style={{ ...s.likelihoodBadge, color: LIKELIHOOD_COLOR[t.likelihood] }}>
                {LIKELIHOOD_LABEL[t.likelihood] || t.likelihood}
              </span>
              <span style={s.topicName}>{t.topic}</span>
            </div>
            {t.officerTests && (
              <p style={s.officerTest}>
                <span style={{ color: 'rgba(201,168,76,0.80)', fontWeight: 600, marginRight: '4px' }}>Tests:</span>
                {t.officerTests}
              </p>
            )}
            <p style={s.coachNote}>{t.coachNote}</p>
          </div>
        ))}
      </div>

      {/* ── PRIORITY ACTION PLAN ── */}
      {brief.gapActions.length > 0 && (
        <>
          <SectionLabel>Priority Action Plan</SectionLabel>
          <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px', fontStyle: 'italic' as const }}>
            Complete these actions before your interview. Critical items must be resolved; important items should be addressed; recommended items strengthen your case.
          </p>
          <div style={{ border: '1px solid rgba(201,168,76,0.1)' }}>
            {brief.gapActions.map((action, i) => (
              <ActionItem key={i} action={action} index={i + 1} />
            ))}
          </div>
        </>
      )}

      {/* ── BUSINESS TIPS + PRESSURE POINTS ── */}
      <SectionLabel>Business-Specific Coaching</SectionLabel>
      <div style={s.twoCol}>
        <div style={s.panel}>
          <div style={s.panelHeading}>Prepare for your business type</div>
          <ul style={s.bulletList}>
            {brief.businessTips.map((t, i) => (
              <li key={i} style={s.bulletRow}>
                <span style={{ ...s.bulletDot, color: 'rgba(201,168,76,0.82)' }}>→</span>
                <span style={s.bulletText}>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ ...s.panel, background: 'rgba(200,60,60,0.03)', borderColor: 'rgba(200,80,80,0.12)' }}>
          <div style={{ ...s.panelHeading, color: 'rgba(200,120,120,0.65)' }}>Watch out for</div>
          <ul style={s.bulletList}>
            {brief.pressurePoints.map((p, i) => (
              <li key={i} style={s.bulletRow}>
                <span style={{ ...s.bulletDot, color: 'rgba(200,100,100,0.6)' }}>!</span>
                <span style={{ ...s.bulletText, color: 'rgba(245,240,232,0.76)' }}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p style={s.disclaimer}>
        This report is generated by the e2go intelligence engine using your application data and 15 documented denial-risk factors. It is not legal advice. Review with your attorney before your interview.
      </p>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const s: Record<string, React.CSSProperties> = {
  root: {
    border: '1px solid rgba(201,168,76,0.2)',
    background: 'linear-gradient(180deg, rgba(201,168,76,0.04) 0%, rgba(10,10,10,0) 100%)',
    padding: '32px',
    marginBottom: '40px',
  },
  header: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: '24px', flexWrap: 'wrap' as const, gap: '8px',
  },
  eyebrow: {
    display: 'block', fontSize: '10px', fontWeight: 700,
    letterSpacing: '0.18em', textTransform: 'uppercase' as const,
    color: '#C9A84C', fontFamily: "'DM Sans', sans-serif",
  },
  aiTag: {
    fontSize: '8px', letterSpacing: '0.12em', color: 'rgba(245,240,232,0.62)',
    fontFamily: "'DM Sans', sans-serif", padding: '3px 8px',
    border: '1px solid rgba(245,240,232,0.07)',
  },
  scoreRow: {
    display: 'flex', gap: '24px', alignItems: 'flex-start',
    padding: '20px 24px', background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(201,168,76,0.08)', marginBottom: '4px',
    flexWrap: 'wrap' as const,
  },
  twoCol: {
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '4px',
  },
  panel: {
    padding: '18px 20px', background: 'rgba(255,255,255,0.015)',
    border: '1px solid rgba(201,168,76,0.08)',
  },
  panelHeading: {
    fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em',
    textTransform: 'uppercase' as const, color: 'rgba(201,168,76,0.85)',
    fontFamily: "'DM Sans', sans-serif", marginBottom: '14px',
    paddingBottom: '10px', borderBottom: '1px solid rgba(201,168,76,0.07)',
  },
  bulletList: { listStyle: 'none', padding: 0, margin: 0 },
  bulletRow: { display: 'flex', gap: '9px', marginBottom: '10px', alignItems: 'flex-start' },
  bulletDot: { fontSize: '11px', flexShrink: 0, marginTop: '2px', lineHeight: 1.4 },
  bulletText: {
    fontSize: '13px', color: 'rgba(245,240,232,0.65)',
    lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif",
  },
  categoryGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '4px',
  },
  topicRow: {
    padding: '16px 0', borderBottom: '1px solid rgba(245,240,232,0.04)',
  },
  topicHeader: {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px',
  },
  likelihoodBadge: {
    fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
    textTransform: 'uppercase' as const, fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0, width: '60px',
  },
  topicName: {
    fontSize: '13px', fontWeight: 600, color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
  },
  officerTest: {
    fontSize: '11px', color: 'rgba(245,240,232,0.70)', lineHeight: 1.6,
    margin: '0 0 6px 70px', fontFamily: "'DM Sans', sans-serif", fontStyle: 'italic' as const,
  },
  coachNote: {
    fontSize: '12px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.65,
    margin: '0 0 0 70px', fontFamily: "'DM Sans', sans-serif",
  },
  disclaimer: {
    fontSize: '10px', color: 'rgba(245,240,232,0.62)', lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif", marginTop: '28px',
    fontStyle: 'italic' as const, borderTop: '1px solid rgba(245,240,232,0.04)',
    paddingTop: '16px',
  },
};
