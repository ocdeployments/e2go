'use client';

import { useState } from 'react';
import type { PathwayAnalysisResult, PathwayRecommendation, FamilyVisaCoverage } from '@/lib/pathway-engine';

// =============================================================================
// Category + Impact labels
// =============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  family_restructure:    'Family Structure',
  investment_restructure: 'Investment',
  business_model:        'Business Model',
  nationality:           'Nationality',
};

const IMPACT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  transformative: { bg: 'rgba(201,168,76,0.08)', text: '#C9A84C', border: 'rgba(201,168,76,0.25)' },
  significant:    { bg: 'rgba(99,179,237,0.08)', text: '#63b3ed', border: 'rgba(99,179,237,0.2)' },
  moderate:       { bg: 'rgba(245,240,232,0.04)', text: 'rgba(245,240,232,0.45)', border: 'rgba(245,240,232,0.1)' },
};

const IMPACT_LABELS: Record<string, string> = {
  transformative: 'Transformative',
  significant:    'Significant',
  moderate:       'Moderate',
};

// =============================================================================
// PathwayCard
// =============================================================================

function PathwayCard({ pathway }: { pathway: PathwayRecommendation }) {
  const [expanded, setExpanded] = useState(false);
  const impact = IMPACT_COLORS[pathway.impact] ?? IMPACT_COLORS.moderate;

  return (
    <div style={{
      border: `1px solid ${impact.border}`,
      background: impact.bg,
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
          cursor: 'pointer', padding: '20px 24px', display: 'block',
        }}
      >
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            color: 'rgba(245,240,232,0.70)', textTransform: 'uppercase',
            background: 'rgba(245,240,232,0.06)', padding: '3px 8px', borderRadius: '2px',
          }}>
            {CATEGORY_LABELS[pathway.category] ?? pathway.category}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em',
            color: impact.text, textTransform: 'uppercase',
            background: impact.bg, border: `1px solid ${impact.border}`,
            padding: '3px 8px', borderRadius: '2px',
          }}>
            {IMPACT_LABELS[pathway.impact]}
          </span>
          {pathway.requiresAttorney && (
            <span style={{
              fontSize: '10px', color: 'rgba(251,191,36,0.7)', letterSpacing: '0.05em',
              padding: '3px 8px', background: 'rgba(251,191,36,0.08)',
              border: '1px solid rgba(251,191,36,0.15)', borderRadius: '2px',
            }}>
              Attorney review recommended
            </span>
          )}
          <span style={{ marginLeft: 'auto', color: 'rgba(245,240,232,0.68)', fontSize: '14px' }}>
            {expanded ? '▴' : '▾'}
          </span>
        </div>

        <div style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: '18px', fontWeight: 400, color: '#f5f0e8', lineHeight: 1.4,
        }}>
          {pathway.title}
        </div>
        <div style={{
          fontSize: '13px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.6, marginTop: '6px',
        }}>
          {pathway.headline}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: `1px solid ${impact.border}`,
          padding: '24px',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px',
          background: 'rgba(10,10,10,0.4)',
        }}
          className="pathway-detail"
        >
          <style>{`
            @media (max-width: 600px) { .pathway-detail { grid-template-columns: 1fr !important; } }
          `}</style>

          {/* Left column */}
          <div>
            <SectionLabel>Why this applies</SectionLabel>
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, marginBottom: '20px' }}>
              {pathway.rationale}
            </p>

            <SectionLabel>How it works</SectionLabel>
            <ol style={{ margin: 0, padding: '0 0 0 16px', color: 'rgba(245,240,232,0.7)', fontSize: '13px', lineHeight: 1.8 }}>
              {pathway.mechanism.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>

          {/* Right column */}
          <div>
            <SectionLabel>Requirements</SectionLabel>
            <ul style={{ margin: '0 0 20px 0', padding: '0 0 0 16px', color: 'rgba(245,240,232,0.65)', fontSize: '13px', lineHeight: 1.8 }}>
              {pathway.requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>

            <SectionLabel>Trade-offs</SectionLabel>
            <ul style={{ margin: '0 0 16px 0', padding: '0 0 0 16px', color: 'rgba(245,240,232,0.76)', fontSize: '13px', lineHeight: 1.8 }}>
              {pathway.tradeoffs.map((t, i) => <li key={i}>{t}</li>)}
            </ul>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.70)', letterSpacing: '0.08em' }}>
                TIMELINE
              </span>
              <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.65)' }}>{pathway.timeline}</span>
            </div>

            {pathway.requiredDataMissing.length > 0 && (
              <div style={{
                marginTop: '16px', padding: '12px 14px',
                border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)',
                borderRadius: '2px',
              }}>
                <div style={{ fontSize: '10px', color: 'rgba(251,191,36,0.7)', letterSpacing: '0.1em', marginBottom: '6px' }}>
                  TO CONFIRM THIS PATHWAY
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 14px', fontSize: '12px', color: 'rgba(251,191,36,0.6)', lineHeight: 1.7 }}>
                  {pathway.requiredDataMissing.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
      color: 'rgba(245,240,232,0.68)', textTransform: 'uppercase',
      marginBottom: '8px',
    }}>
      {children}
    </div>
  );
}

// =============================================================================
// Family Visa Coverage Table
// =============================================================================

function FamilyCoverageTable({ coverage }: { coverage: FamilyVisaCoverage[] }) {
  if (coverage.length === 0) return null;

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em',
        color: 'rgba(245,240,232,0.68)', textTransform: 'uppercase', marginBottom: '12px',
      }}>
        Proposed Visa Coverage — Your Family
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%', borderCollapse: 'collapse' as const,
          fontSize: '12px', color: 'rgba(245,240,232,0.7)',
        }}>
          <thead>
            <tr>
              {['Family member', 'Proposed visa', 'Work authorization', 'Notes'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid rgba(245,240,232,0.08)',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                  color: 'rgba(245,240,232,0.68)', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coverage.map((row, i) => (
              <tr key={i} style={{
                borderBottom: '1px solid rgba(245,240,232,0.05)',
                background: i % 2 === 0 ? 'transparent' : 'rgba(245,240,232,0.015)',
              }}>
                <td style={{ padding: '10px 12px', color: '#f5f0e8', fontWeight: 500 }}>{row.label}</td>
                <td style={{ padding: '10px 12px' }}>{row.proposedVisa}</td>
                <td style={{ padding: '10px 12px', color: row.workAuthorization.includes('Full') ? '#86efac' : undefined }}>
                  {row.workAuthorization}
                </td>
                <td style={{ padding: '10px 12px', color: 'rgba(245,240,232,0.72)', fontSize: '11px' }}>{row.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =============================================================================
// Attorney Banner
// =============================================================================

function AttorneyBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div style={{
      marginTop: '24px', padding: '16px 20px',
      border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.04)',
      display: 'flex', alignItems: 'flex-start', gap: '12px', justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(251,191,36,0.85)', marginBottom: '4px' }}>
          Attorney consultation recommended
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.6 }}>
          One or more pathways above involve non-standard structures. We recommend reviewing with a
          qualified U.S. immigration attorney before proceeding. These pathways are grounded in
          established law — an attorney helps with structuring and documentation.
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(245,240,232,0.68)', fontSize: '16px', padding: '0', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  );
}

// =============================================================================
// Main export: PathwaySection
// =============================================================================

interface PathwaySectionProps {
  pathwayResult: PathwayAnalysisResult;
}

export default function PathwaySection({ pathwayResult }: PathwaySectionProps) {
  const { pathways, familyCoverage } = pathwayResult;

  if (pathways.length === 0) return null;

  const hasAttorneyRequired = pathways.some(p => p.requiresAttorney);
  const transformativeCount = pathways.filter(p => p.impact === 'transformative').length;

  return (
    <div style={{ marginBottom: '48px' }}>

      {/* Section header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{
          fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
          color: 'rgba(245,240,232,0.70)', textTransform: 'uppercase', margin: 0,
        }}>
          Alternative Pathways
        </h2>
        <span style={{
          fontSize: '11px', color: '#C9A84C', background: 'rgba(201,168,76,0.1)',
          border: '1px solid rgba(201,168,76,0.2)', padding: '2px 8px', borderRadius: '2px',
        }}>
          {pathways.length} identified
          {transformativeCount > 0 ? ` · ${transformativeCount} transformative` : ''}
        </span>
      </div>

      {/* Intro */}
      <p style={{
        fontSize: '13px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.7, marginBottom: '24px',
        maxWidth: '640px',
      }}>
        Based on your family composition and case profile, these restructuring options may open
        pathways to E-2 eligibility or bring additional family members into the U.S. — all within
        established immigration law.
      </p>

      {/* Pathway cards */}
      {pathways.map(p => <PathwayCard key={p.id} pathway={p} />)}

      {/* Family visa coverage table */}
      <FamilyCoverageTable coverage={familyCoverage} />

      {/* Attorney banner */}
      {hasAttorneyRequired && <AttorneyBanner />}

      {/* Legal disclaimer */}
      <p style={{
        fontSize: '11px', color: 'rgba(245,240,232,0.62)', lineHeight: 1.6,
        marginTop: '20px', borderTop: '1px solid rgba(245,240,232,0.06)', paddingTop: '16px',
      }}>
        These pathways are grounded in U.S. E-2 treaty investor regulations and Toronto
        consulate practice. This is not legal advice. Immigration outcomes depend on the specific
        facts of your case and consular officer discretion. Consult a qualified U.S. immigration
        attorney before proceeding with any non-standard application structure.
      </p>
    </div>
  );
}
