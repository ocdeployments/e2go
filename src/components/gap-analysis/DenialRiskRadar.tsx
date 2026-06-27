'use client';

import { useState } from 'react';
import {
  type DenialRiskFactor,
  D_CODE_REMEDIATION,
} from '@/lib/gap-analysis-engine';
import RemediationPanel from './RemediationPanel';

interface DocRow {
  detected_document_type?: string | null;
  user_selected_document_type?: string | null;
}

interface DenialRiskRadarProps {
  factors: DenialRiskFactor[];
  localAnswers: Map<string, string>;
  localDocs: DocRow[];
  appId: string;
  onAnswerChange: (key: string, value: string) => void;
  onDocUploaded: (docType: string) => void;
}

const D_CODE_FIX_LINKS: Record<string, { label: string; href: string }> = {
  'D-01': { label: 'Investment overview',   href: '/apply/investment#investment-overview' },
  'D-02': { label: 'Investment paper trail', href: '/apply/investment#paper-trail' },
  'D-03': { label: 'Source of funds',       href: '/apply/investment#source-of-funds' },
  'D-04': { label: 'Business financials',   href: '/apply/investment#projections' },
  'D-05': { label: 'Business plan (Tab K)', href: '/apply/module3/k' },
  'D-06': { label: 'Revenue projections',   href: '/apply/investment#projections' },
  'D-07': { label: 'Hiring plan',           href: '/apply/business#operations' },
  'D-08': { label: 'Practice interview',    href: '/simulator' },
  'D-09': { label: 'Practice interview',    href: '/simulator' },
  'D-10': { label: 'Business operations',   href: '/apply/business#operations' },
  'D-11': { label: 'Your role',             href: '/apply/qualifications#role' },
  'D-12': { label: 'Investment source',     href: '/apply/investment#source-of-funds' },
  'D-13': { label: 'Business entity',       href: '/apply/business#entity' },
  'D-14': { label: 'Business type',         href: '/apply/business' },
  'D-15': { label: 'Ties to home country',  href: '/apply/ties' },
};

const remediationMap = new Map(D_CODE_REMEDIATION.map(r => [r.code, r]));

const riskConfig = {
  high:     { label: 'HIGH RISK', color: '#ef4444', bg: '#ef444410', border: '#ef444430' },
  moderate: { label: 'MODERATE',  color: '#f59e0b', bg: '#f59e0b10', border: '#f59e0b30' },
  low:      { label: 'LOW RISK',  color: '#22c55e', bg: '#22c55e10', border: '#22c55e25' },
};

export default function DenialRiskRadar({
  factors,
  localAnswers,
  localDocs,
  appId,
  onAnswerChange,
  onDocUploaded,
}: DenialRiskRadarProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const highCount = factors.filter(f => f.risk === 'high').length;
  const moderateCount = factors.filter(f => f.risk === 'moderate').length;
  const lowCount = factors.filter(f => f.risk === 'low').length;

  return (
    <div style={{ marginBottom: '48px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '8px' }}>
        <h2 style={sectionTitle}>Denial risk radar</h2>
        <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)' }}>
          D-01 to D-15 · click any factor to fix it
        </span>
      </div>

      {/* Risk count summary */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px' }}>
        {[
          { count: highCount,     label: 'Critical', color: '#ef4444' },
          { count: moderateCount, label: 'Moderate', color: '#f59e0b' },
          { count: lowCount,      label: 'Low risk', color: '#22c55e' },
        ].map(({ count, label, color }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', background: color }} />
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.76)' }}>
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
          const remediation = remediationMap.get(f.code);

          return (
            <div key={f.code} style={{
              padding: '14px 16px',
              border: `1px solid ${isOpen ? cfg.color + '60' : cfg.border}`,
              background: isOpen ? cfg.bg : 'transparent',
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              {/* Clickable header — toggles expand */}
              <div
                onClick={() => setExpanded(isOpen ? null : f.code)}
                style={{ cursor: 'pointer' }}
              >
                {/* Code + risk badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', color: cfg.color, letterSpacing: '0.06em' }}>
                    {f.code}
                  </span>
                  <span style={{
                    fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', color: cfg.color,
                    padding: '2px 6px', border: `1px solid ${cfg.color}40`, marginLeft: 'auto',
                  }}>
                    {cfg.label}
                  </span>
                </div>

                {/* Factor name */}
                <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.4, marginBottom: '6px' }}>
                  {f.name}
                </div>

                {/* Frequency + expand hint */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.65)', letterSpacing: '0.04em' }}>
                    {f.frequency}
                  </span>
                  {!isOpen && f.risk !== 'low' && (
                    <span style={{ fontSize: '10px', color: `${cfg.color}80`, letterSpacing: '0.04em' }}>
                      Fix →
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded panel — clicks inside do NOT collapse the card */}
              {isOpen && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${cfg.color}20` }}>
                  <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6, margin: '0 0 10px' }}>
                    {f.finding}
                  </p>
                  {remediation ? (
                    <RemediationPanel
                      factor={f}
                      remediation={remediation}
                      localAnswers={localAnswers}
                      localDocs={localDocs}
                      appId={appId}
                      onAnswerChange={onAnswerChange}
                      onDocUploaded={onDocUploaded}
                      riskColor={cfg.color}
                    />
                  ) : (
                    <>
                      {f.mitigation && (
                        <div style={{ padding: '10px 12px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', marginBottom: '10px' }}>
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
                          style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, color: cfg.color, textDecoration: 'none', letterSpacing: '0.04em', borderBottom: `1px solid ${cfg.color}50`, paddingBottom: '1px' }}
                        >
                          Fix this → {D_CODE_FIX_LINKS[f.code].label}
                        </a>
                      )}
                    </>
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

const sectionTitle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
  color: 'rgba(245,240,232,0.70)', textTransform: 'uppercase',
  marginBottom: 0,
};
