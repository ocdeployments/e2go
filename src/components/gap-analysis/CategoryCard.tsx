'use client';

import { useState } from 'react';
import type { GapCategory, DenialRiskFactor } from '@/lib/gap-analysis-engine';

interface CategoryCardProps {
  category: GapCategory;
  factors: DenialRiskFactor[];
  enrichment: string | null;
  enriching: boolean;
}

const priorityCfg: Record<GapCategory['priority'], { color: string; label: string }> = {
  strong:     { color: '#22c55e', label: 'STRONG' },
  good:       { color: '#86efac', label: 'GOOD' },
  needs_work: { color: '#f59e0b', label: 'NEEDS WORK' },
  critical:   { color: '#ef4444', label: 'CRITICAL GAP' },
};

export default function CategoryCard({ category, factors, enrichment, enriching }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { color, label } = priorityCfg[category.priority];
  const relevantFactors = factors.filter(f => category.dCodes.includes(f.code));

  return (
    <div style={{ border: `1px solid ${color}18`, background: `${color}04` }}>

      {/* Header row — clickable */}
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '16px',
          padding: '18px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
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
          <div style={{ height: '2px', background: 'rgba(245,240,232,0.06)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${category.score}%`, background: color, transition: 'width 0.5s ease' }} />
          </div>
          {/* D-code chips */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
            {relevantFactors.map(f => {
              const rColor = f.risk === 'high' ? '#ef4444' : f.risk === 'moderate' ? '#f59e0b' : '#22c55e';
              return (
                <span key={f.code} style={{
                  fontSize: '9px', fontFamily: 'monospace', fontWeight: 700,
                  padding: '1px 5px', color: rColor, border: `1px solid ${rColor}30`, letterSpacing: '0.05em',
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

          {/* LLM enrichment */}
          {(enriching || enrichment) && (
            <div style={{ marginBottom: '16px', padding: '14px 16px', background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderLeft: '3px solid rgba(201,168,76,0.4)' }}>
              <div style={subLabel('rgba(201,168,76,0.5)')}>E2go Advisor</div>
              {enriching && !enrichment ? (
                <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)', fontStyle: 'italic' }}>Generating personalised guidance…</div>
              ) : (
                <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.65)', lineHeight: 1.6, margin: 0 }}>{enrichment}</p>
              )}
            </div>
          )}

          {category.evidence.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={subLabel('rgba(34,197,94,0.6)')}>EVIDENCE FOUND</div>
              <ul style={ul}>
                {category.evidence.map((e, i) => (
                  <li key={i} style={li}>
                    <span style={{ color: '#22c55e', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.5 }}>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category.gaps.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={subLabel(`${color}90`)}>GAPS IDENTIFIED</div>
              <ul style={ul}>
                {category.gaps.map((g, i) => (
                  <li key={i} style={li}>
                    <span style={{ color, fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>!</span>
                    <span style={{ fontSize: '13px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.5 }}>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {category.actions.length > 0 && (
            <div style={{ padding: '14px 16px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.12)' }}>
              <div style={subLabel('rgba(201,168,76,0.6)')}>WHAT TO DO</div>
              <ul style={ul}>
                {category.actions.map((a, i) => (
                  <li key={i} style={li}>
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

const ul: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' };
const li: React.CSSProperties = { display: 'flex', gap: '10px', alignItems: 'flex-start' };
const subLabel = (color: string): React.CSSProperties => ({
  fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color, marginBottom: '10px',
});
