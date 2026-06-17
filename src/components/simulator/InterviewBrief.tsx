'use client';

import { useState, useEffect } from 'react';
import type { InterviewBriefData } from '@/app/api/simulator/interview-prep/route';

interface InterviewBriefProps {
  applicationId: string;
  businessName?: string | null;
}

const LIKELIHOOD_LABEL: Record<string, string> = {
  high: 'Will ask',
  medium: 'Likely',
  low: 'Possible',
};

const LIKELIHOOD_COLOR: Record<string, string> = {
  high: '#C9A84C',
  medium: 'rgba(245,240,232,0.5)',
  low: 'rgba(245,240,232,0.28)',
};

export default function InterviewBrief({ applicationId, businessName }: InterviewBriefProps) {
  const [brief, setBrief] = useState<InterviewBriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const cacheKey = `ib-${applicationId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setBrief(JSON.parse(cached));
        setLoading(false);
        return;
      } catch { /* stale cache — fall through */ }
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

  if (loading) {
    return (
      <div style={s.briefBlock}>
        <div style={s.briefHeader}>
          <span style={s.eyebrow}>INTERVIEW PREPARATION BRIEF</span>
          <span style={s.generating}>Generating your brief…</span>
        </div>
        <div style={s.loadingBody}>
          <div style={s.pulse} />
          <div style={{ ...s.pulse, width: '75%', marginTop: '10px' }} />
          <div style={{ ...s.pulse, width: '55%', marginTop: '10px' }} />
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)', marginTop: '20px', fontFamily: "'DM Sans', sans-serif" }}>
            Analysing your case and generating preparation notes…
          </p>
        </div>
      </div>
    );
  }

  if (failed || !brief) return null;

  return (
    <div style={s.briefBlock}>
      {/* Header */}
      <div style={s.briefHeader}>
        <div>
          <span style={s.eyebrow}>INTERVIEW PREPARATION BRIEF</span>
          {businessName && (
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.4)', marginTop: '4px', fontFamily: "'DM Sans', sans-serif" }}>
              {businessName}
            </p>
          )}
        </div>
        <span style={s.aiTag}>AI GENERATED</span>
      </div>

      {/* Application summary */}
      <div style={s.summaryBox}>
        <p style={s.summaryText}>{brief.applicationSummary}</p>
      </div>

      <div style={s.twoCol}>
        {/* Highlights */}
        <div style={s.panel}>
          <div style={s.panelHeading}>Key strengths</div>
          <ul style={s.bulletList}>
            {brief.highlights.map((h, i) => (
              <li key={i} style={s.bulletItem}>
                <span style={s.bullet}>&#10003;</span>
                <span style={s.bulletText}>{h}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Lead with these */}
        <div style={s.panel}>
          <div style={s.panelHeading}>Open with these</div>
          <ul style={s.bulletList}>
            {brief.leadWithThese.map((l, i) => (
              <li key={i} style={s.bulletItem}>
                <span style={{ ...s.bullet, color: '#C9A84C' }}>&#9670;</span>
                <span style={s.bulletText}>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interview topics */}
      <div style={{ marginBottom: '28px' }}>
        <div style={s.subHeading}>What the officer will ask</div>
        <div>
          {brief.interviewTopics.map((t, i) => (
            <div key={i} style={s.topicRow}>
              <div style={s.topicLeft}>
                <span style={{ ...s.likelihoodBadge, color: LIKELIHOOD_COLOR[t.likelihood] }}>
                  {LIKELIHOOD_LABEL[t.likelihood] || t.likelihood}
                </span>
                <span style={s.topicName}>{t.topic}</span>
              </div>
              <p style={s.topicNote}>{t.coachNote}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Business tips + pressure points */}
      <div style={s.twoCol}>
        <div style={s.panel}>
          <div style={s.panelHeading}>Business-specific prep</div>
          <ul style={s.bulletList}>
            {brief.businessTips.map((t, i) => (
              <li key={i} style={s.bulletItem}>
                <span style={{ ...s.bullet, color: 'rgba(201,168,76,0.5)' }}>→</span>
                <span style={s.bulletText}>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div style={{ ...s.panel, background: 'rgba(200,80,80,0.04)', borderColor: 'rgba(200,80,80,0.12)' }}>
          <div style={{ ...s.panelHeading, color: 'rgba(200,120,120,0.7)' }}>Watch out for</div>
          <ul style={s.bulletList}>
            {brief.pressurePoints.map((p, i) => (
              <li key={i} style={s.bulletItem}>
                <span style={{ ...s.bullet, color: 'rgba(200,120,120,0.6)' }}>!</span>
                <span style={{ ...s.bulletText, color: 'rgba(245,240,232,0.55)' }}>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p style={s.disclaimer}>
        This brief is AI-generated from your application details. Review it with your attorney before your interview.
      </p>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const s: Record<string, React.CSSProperties> = {
  briefBlock: {
    border: '1px solid rgba(201,168,76,0.2)',
    background: 'linear-gradient(180deg, rgba(201,168,76,0.04) 0%, rgba(201,168,76,0.01) 100%)',
    padding: '32px',
    marginBottom: '40px',
  },
  briefHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  eyebrow: {
    display: 'block',
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    fontFamily: "'DM Sans', sans-serif",
  },
  generating: {
    fontSize: '11px',
    color: 'rgba(201,168,76,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    fontStyle: 'italic' as const,
  },
  aiTag: {
    fontSize: '9px',
    letterSpacing: '0.12em',
    color: 'rgba(245,240,232,0.25)',
    fontFamily: "'DM Sans', sans-serif",
    padding: '3px 8px',
    border: '1px solid rgba(245,240,232,0.08)',
  },
  loadingBody: {
    padding: '20px 0',
  },
  pulse: {
    height: '12px',
    width: '90%',
    background: 'rgba(201,168,76,0.08)',
    borderRadius: '2px',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  summaryBox: {
    padding: '16px 20px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.1)',
    marginBottom: '24px',
  },
  summaryText: {
    fontSize: '14px',
    color: 'rgba(245,240,232,0.75)',
    lineHeight: 1.7,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 300,
    margin: 0,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '28px',
  },
  panel: {
    padding: '18px 20px',
    background: 'rgba(255,255,255,0.015)',
    border: '1px solid rgba(201,168,76,0.08)',
  },
  panelHeading: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(201,168,76,0.6)',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(201,168,76,0.08)',
  },
  bulletList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  bulletItem: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px',
  },
  bullet: {
    flexShrink: 0,
    fontSize: '12px',
    color: 'rgba(34,197,94,0.6)',
    marginTop: '1px',
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
  },
  bulletText: {
    fontSize: '13px',
    color: 'rgba(245,240,232,0.65)',
    lineHeight: 1.6,
    fontFamily: "'DM Sans', sans-serif",
  },
  subHeading: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,240,232,0.35)',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
  },
  topicRow: {
    padding: '14px 0',
    borderBottom: '1px solid rgba(245,240,232,0.04)',
  },
  topicLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '6px',
  },
  likelihoodBadge: {
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontFamily: "'DM Sans', sans-serif",
    flexShrink: 0,
    width: '60px',
  },
  topicName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
  },
  topicNote: {
    fontSize: '12px',
    color: 'rgba(245,240,232,0.45)',
    lineHeight: 1.65,
    margin: '0 0 0 70px',
    fontFamily: "'DM Sans', sans-serif",
  },
  disclaimer: {
    fontSize: '11px',
    color: 'rgba(245,240,232,0.2)',
    lineHeight: 1.5,
    fontFamily: "'DM Sans', sans-serif",
    marginTop: '8px',
    fontStyle: 'italic' as const,
  },
};
