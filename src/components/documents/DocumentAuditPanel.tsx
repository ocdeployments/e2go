'use client';

import { useState } from 'react';
import type { GeneratedDocument, DocumentType } from '@/types/generation';

// ============================================================================
// Finding types
// ============================================================================

type Severity = 'critical' | 'warning' | 'suggestion';

interface AuditFinding {
  severity: Severity;
  code: string;
  title: string;
  detail: string;
  revisionPrompt: string;
}

// ============================================================================
// Per-document-type quality config
// ============================================================================

interface RequiredTerm {
  phrase: string;
  code: string;
  title: string;
  detail: string;
  revisionPrompt: string;
}

interface DocQualityConfig {
  minWords: number;
  expansionHint: string;
  requiredTerms: RequiredTerm[];
}

const DOC_QUALITY_CONFIG: Partial<Record<DocumentType, DocQualityConfig>> = {
  cover_letter: {
    minWords: 800,
    expansionHint: 'detailed narrative about your investment, management role, business description, and non-marginality',
    requiredTerms: [
      {
        phrase: 'at risk',
        code: 'AT-RISK',
        title: 'Missing "at risk" language',
        detail: 'E-2 cover letters must include explicit language confirming the investment funds are "at risk" in the commercial sense.',
        revisionPrompt: 'Please add a paragraph to the cover letter explicitly confirming that the investment funds are fully at risk in the commercial sense — i.e. subject to loss if the business fails.',
      },
      {
        phrase: 'direct and develop',
        code: 'DIRECT-DEVELOP',
        title: 'Missing "direct and develop" role language',
        detail: 'USCIS regulations require the investor to demonstrate they will "direct and develop" the enterprise. This phrase should appear explicitly.',
        revisionPrompt: 'Please add language to the cover letter describing the investor\'s role in directing and developing the enterprise on a day-to-day basis.',
      },
    ],
  },
  source_of_funds: {
    minWords: 350,
    expansionHint: 'the complete chain of custody from the original source to the US business account',
    requiredTerms: [
      {
        phrase: 'irrevocab',
        code: 'IRREVOCABLE',
        title: 'Missing "irrevocably committed" language',
        detail: 'Source of funds statements must confirm that funds are irrevocably committed to the investment — this is a USCIS requirement.',
        revisionPrompt: 'Please add language confirming that the funds are irrevocably committed to the E-2 investment and cannot be recovered by the investor.',
      },
    ],
  },
  investment_proof: {
    minWords: 300,
    expansionHint: 'itemized breakdown of all investment expenditures with documentary references and running total',
    requiredTerms: [],
  },
  business_plan: {
    minWords: 1500,
    expansionHint: 'market analysis, operational plan, hiring timeline, Year 1–3 financial projections, and non-marginality evidence',
    requiredTerms: [
      {
        phrase: 'employ',
        code: 'EMPLOYEES',
        title: 'Hiring plan may be insufficient',
        detail: 'Business plans must clearly address U.S. employee hiring — this is central to the non-marginality requirement.',
        revisionPrompt: 'Please ensure the business plan includes a detailed hiring plan: specific roles, full-time vs part-time status, hiring timeline, and how many U.S. workers will be employed by Years 1, 2, and 3.',
      },
      {
        phrase: 'revenue',
        code: 'REVENUE',
        title: 'Revenue projections may be missing',
        detail: 'Business plans must include financial projections. Officers expect Year 1–3 revenue and profit forecasts.',
        revisionPrompt: 'Please ensure the business plan includes Year 1, Year 2, and Year 3 revenue and profit projections, including the basis for those projections.',
      },
    ],
  },
  qualifications: {
    minWords: 500,
    expansionHint: 'professional history, transferable skills, connection to the specific business type, and management experience',
    requiredTerms: [],
  },
  ds160_reference: {
    minWords: 200,
    expansionHint: 'DS-160 field-by-field guidance and reference answers',
    requiredTerms: [],
  },
  visa_category: {
    minWords: 400,
    expansionHint: 'total enterprise cost breakdown, investment proportionality ratio, 9 FAM 402.9-6(D) tier analysis, committed vs. reserved split, and FDD Item 7 benchmark if franchise',
    requiredTerms: [
      {
        phrase: 'proportionality',
        code: 'PROPORTIONALITY',
        title: 'Proportionality analysis may be missing',
        detail: 'The Substantiality Memorandum must calculate the investment as a percentage of total enterprise cost and compare it to the applicable 9 FAM 402.9-6(D) threshold.',
        revisionPrompt: 'Please ensure the memorandum calculates the exact proportionality ratio (investment ÷ total enterprise cost) and identifies which 9 FAM 402.9-6(D) tier applies to this enterprise cost level.',
      },
    ],
  },
  nonimmigrant_intent: {
    minWords: 300,
    expansionHint: 'specific home-country ties, concrete evidence of non-immigrant intent, and post-E2 return plan',
    requiredTerms: [
      {
        phrase: 'return',
        code: 'RETURN-INTENT',
        title: 'Return intent language may be missing',
        detail: 'Non-immigrant intent statements must address the investor\'s intent to return to their home country after the E-2 period.',
        revisionPrompt: 'Please add a paragraph to the non-immigrant intent statement explicitly stating the investor\'s intent to return to their home country when the E-2 visa period concludes, and listing specific ties that support that intent.',
      },
    ],
  },
};

// ============================================================================
// Analysis engine (pure — no side effects)
// ============================================================================

function analyzeDocument(doc: GeneratedDocument): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const text = doc.content_text ?? '';
  const lowerText = text.toLowerCase();
  const config = DOC_QUALITY_CONFIG[doc.document_type as DocumentType];

  // 1. Quality gate notes from the generation engine
  if (doc.quality_gate_notes && doc.quality_gate_notes.length > 0) {
    for (const note of doc.quality_gate_notes) {
      if (!note.trim()) continue;
      findings.push({
        severity: 'warning',
        code: 'QG-NOTE',
        title: 'Generation engine flagged an issue',
        detail: note,
        revisionPrompt: `The quality gate flagged the following issue — please correct it: "${note}"`,
      });
    }
  }

  // 2. Unfilled placeholders in content_text
  if (text) {
    const placeholderRegex = /\[([A-Z][A-Z\s/'"-]{2,})\]/g;
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = placeholderRegex.exec(text)) !== null) {
      found.add(m[0]);
    }
    if (found.size > 0) {
      const list = [...found].slice(0, 6).join(', ');
      findings.push({
        severity: 'critical',
        code: 'PLACEHOLDER',
        title: `${found.size} unfilled placeholder${found.size > 1 ? 's' : ''} found`,
        detail: `These markers were not replaced with real content: ${list}${found.size > 6 ? ' and more' : ''}.`,
        revisionPrompt: `Please replace the following unfilled placeholders with the correct information from my case file: ${list}`,
      });
    }
  }

  // 3. Word count minimum
  if (config && doc.word_count !== null) {
    const min = config.minWords;
    if (doc.word_count < min) {
      const shortfall = min - doc.word_count;
      const ratio = doc.word_count / min;
      findings.push({
        severity: ratio < 0.6 ? 'critical' : 'warning',
        code: 'LOW-WORDCOUNT',
        title: `Document may be too brief (${doc.word_count.toLocaleString()} words, minimum ~${min.toLocaleString()})`,
        detail: `This document is approximately ${shortfall.toLocaleString()} words short of the recommended minimum. Brief documents leave officers without sufficient detail to assess your application.`,
        revisionPrompt: `This document is ${shortfall} words shorter than recommended. Please expand it by focusing on: ${config.expansionHint}.`,
      });
    }
  }

  // 4. Required legal phrases per doc type
  if (config?.requiredTerms && text) {
    for (const term of config.requiredTerms) {
      if (!lowerText.includes(term.phrase)) {
        findings.push({
          severity: 'warning',
          code: term.code,
          title: term.title,
          detail: term.detail,
          revisionPrompt: term.revisionPrompt,
        });
      }
    }
  }

  // 5. AI detection
  if (doc.ai_detection_passed === false && doc.ai_detection_score !== null && doc.ai_detection_score > 70) {
    findings.push({
      severity: 'suggestion',
      code: 'AI-DETECTION',
      title: `AI detection score high (${doc.ai_detection_score}%)`,
      detail: 'Documents with high AI detection scores may receive additional scrutiny. Humanizing the language — adding personal details and natural variation — reduces this score.',
      revisionPrompt: 'Please humanize the language in this document: replace generic phrasing with specific personal details, vary sentence length, and use more natural transitions. Do not change any facts.',
    });
  }

  return findings;
}

// ============================================================================
// Severity config
// ============================================================================

const SEV: Record<Severity, { icon: string; color: string; bg: string; border: string; label: string }> = {
  critical: {
    icon: '✕',
    color: 'rgba(239,68,68,0.9)',
    bg: 'rgba(239,68,68,0.05)',
    border: 'rgba(239,68,68,0.2)',
    label: 'CRITICAL',
  },
  warning: {
    icon: '!',
    color: 'rgba(245,158,11,0.9)',
    bg: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.2)',
    label: 'WARNING',
  },
  suggestion: {
    icon: '→',
    color: 'rgba(148,163,184,0.8)',
    bg: 'rgba(148,163,184,0.04)',
    border: 'rgba(148,163,184,0.15)',
    label: 'SUGGESTION',
  },
};

// ============================================================================
// Props
// ============================================================================

interface DocumentAuditPanelProps {
  doc: GeneratedDocument;
  onRequestRevision: (description: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export default function DocumentAuditPanel({ doc, onRequestRevision }: DocumentAuditPanelProps) {
  const findings = analyzeDocument(doc);
  const [open, setOpen] = useState(findings.length > 0);

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const clean = findings.length === 0;

  const summaryColor = clean
    ? '#22c55e'
    : criticalCount > 0
    ? 'rgba(239,68,68,0.85)'
    : 'rgba(245,158,11,0.85)';

  const summaryLabel = clean
    ? '✓ Quality audit passed'
    : `${findings.length} issue${findings.length > 1 ? 's' : ''} found${criticalCount > 0 ? ` (${criticalCount} critical)` : ''}`;

  return (
    <div
      style={{
        borderTop: '1px solid rgba(245,240,232,0.06)',
        background: 'rgba(0,0,0,0.15)',
      }}
    >
      {/* ── Summary bar (always visible) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '11px', color: summaryColor, fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.02em' }}>
          {summaryLabel}
        </span>
        {!clean && (
          <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif" }}>
            {open ? 'Hide ↑' : 'Show ↓'}
          </span>
        )}
      </button>

      {/* ── Finding cards ── */}
      {open && !clean && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {findings.map((finding, i) => {
              const s = SEV[finding.severity];
              return (
                <div
                  key={`${finding.code}-${i}`}
                  style={{
                    border: `1px solid ${s.border}`,
                    background: s.bg,
                    padding: '12px 14px',
                  }}
                >
                  {/* Finding header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '10px', color: s.color, flexShrink: 0, marginTop: '1px', fontWeight: 700 }}>
                      {s.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: s.color }}>
                        {s.label}
                      </span>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(245,240,232,0.8)', marginTop: '2px', lineHeight: 1.4 }}>
                        {finding.title}
                      </div>
                    </div>
                  </div>

                  {/* Detail */}
                  <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.6, marginBottom: '10px', paddingLeft: '20px' }}>
                    {finding.detail}
                  </div>

                  {/* Fix action */}
                  <div style={{ paddingLeft: '20px' }}>
                    <button
                      onClick={() => onRequestRevision(finding.revisionPrompt)}
                      style={{
                        fontSize: '10px',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#C9A84C',
                        border: '1px solid rgba(201,168,76,0.3)',
                        background: 'transparent',
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      Fix with revision →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
