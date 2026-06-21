'use client';

import { useRef, useCallback } from 'react';

// ============================================================================
// Per-flag supplementary remediation config
// These are NOT re-answers to the original question — they are additional
// context entries that address what an officer needs to see beyond the raw
// quiz answer. The answerKey uses the QR- prefix (Q-style, passes validator).
// ============================================================================

export interface FlagRemediation {
  heading: string;
  question: string;
  answerKey: string;
  placeholder: string;
  doneWhen: string;
  minWords: number;
}

export const FLAG_REMEDIATION: Record<string, FlagRemediation> = {
  'W-REFUSAL-RECENT': {
    heading: 'Officers need to see what has changed since the refusal.',
    question: 'Describe the circumstances of the refusal: what visa, the reason given, and what specifically has changed since then.',
    answerKey: 'QR-REFUSAL-DETAIL',
    placeholder: 'e.g. I was refused a B-1/B-2 visitor visa in 2022 because I did not demonstrate strong ties to Canada. Since then, I have purchased a home and my spouse and children remain in Canada.',
    doneWhen: 'Refusal circumstances + changed circumstances both described (aim for 50+ words)',
    minWords: 20,
  },
  'W-REFUSAL-OLD': {
    heading: 'Older refusals still require disclosure and a brief explanation.',
    question: 'Briefly describe the refusal and confirm the circumstances have been resolved.',
    answerKey: 'QR-REFUSAL-DETAIL',
    placeholder: 'e.g. I was refused a tourist visa in 2015 because I had recently changed jobs. I now have stable employment with 12 years of tenure and own property in Canada.',
    doneWhen: 'Refusal acknowledged with a brief explanation of changed circumstances',
    minWords: 10,
  },
  'W-REFUSAL-MULTIPLE': {
    heading: 'Multiple refusals create a pattern that needs a strong cumulative response.',
    question: 'Describe each refusal briefly and explain the cumulative evidence that your situation has now changed.',
    answerKey: 'QR-REFUSAL-DETAIL',
    placeholder: 'e.g. First refusal: 2018, B-1/B-2, reason [X]. Second refusal: 2021, F-1, reason [Y]. Since then I have: purchased property, secured long-term employment, my family remains in Canada.',
    doneWhen: 'Each refusal addressed individually with changed circumstances documented',
    minWords: 40,
  },
  'W-FAMILY-GIFT': {
    heading: 'Gift-funded investments require documentary evidence of the gift.',
    question: 'Describe the gift: who gave it, your relationship, when, and what documentation you have (gift letter, donor bank statement, transfer record).',
    answerKey: 'QR-GIFT-DETAIL',
    placeholder: 'e.g. My father gifted CAD $180,000 to me in March 2025. He is a retired engineer with documented savings. I have a signed gift letter, his bank statement showing the transfer, and a notarized statutory declaration.',
    doneWhen: 'Donor identified, amount and date specified, documentation described',
    minWords: 20,
  },
  'W-LOAN-FUNDED': {
    heading: 'Loans used for E-2 investment must be secured by personal assets only.',
    question: 'How is the loan secured? Describe the collateral used (must be personal assets — not the business being purchased).',
    answerKey: 'QR-LOAN-SECURED',
    placeholder: 'e.g. The loan is a home equity line of credit secured by my primary residence in Ottawa, appraised at $850,000 with $400,000 in equity. The business is not used as collateral.',
    doneWhen: 'Collateral confirmed as personal assets (property, savings, etc.) — not business equipment or receivables',
    minWords: 10,
  },
  'W-WEAK-TIES': {
    heading: 'Non-immigrant intent is demonstrated through specific, documented home-country ties.',
    question: 'List your specific ties to your home country — be concrete (property address, family names and relationship, employment title, financial institution and account type).',
    answerKey: 'QR-HOME-TIES-DETAIL',
    placeholder: 'e.g. Property: 3-bed home at [address], owned outright, appraised at $650K. Family: spouse [name] and two children (ages 10, 14) remain in Canada. Employment: retained advisory role at [company name]. RRSP and TFSA at TD Bank totalling $280K.',
    doneWhen: 'At least 3 specific ties listed with concrete details (names, addresses, institutions)',
    minWords: 25,
  },
  'W-ENTRY-REFUSED': {
    heading: 'Border refusals are serious and require a complete account.',
    question: 'Describe the border refusal: the date, port of entry, grounds given by the officer, and how the situation has since been resolved.',
    answerKey: 'QR-ENTRY-DETAIL',
    placeholder: 'e.g. I was refused entry at Detroit-Windsor crossing in January 2019 on grounds of suspected intent to work without authorization. I was returning from a client meeting. Since then I have obtained a formal legal opinion confirming the visit was lawful.',
    doneWhen: 'Incident date, port of entry, grounds, and resolution all documented',
    minWords: 20,
  },
  'W-CONVICTION-RECENT': {
    heading: 'Recent or serious convictions require full disclosure and admissibility analysis.',
    question: 'Describe the conviction: offense, jurisdiction, date, sentence, and current status. Note: you will need an attorney to assess admissibility before filing.',
    answerKey: 'QR-CONVICTION-DETAIL',
    placeholder: 'e.g. DUI conviction in Ontario, Canada, September 2016. Fine of CAD $1,500 and 6-month license suspension. Sentence fully served. No criminal record since. I have a Certificate of Completion and my license was reinstated in March 2017.',
    doneWhen: 'Offense, jurisdiction, date, sentence, and resolution all documented',
    minWords: 20,
  },
  'W-CONVICTION-OLD': {
    heading: 'Minor older convictions still require disclosure and evidence of resolution.',
    question: 'Briefly describe the conviction and confirm it has been fully resolved.',
    answerKey: 'QR-CONVICTION-DETAIL',
    placeholder: 'e.g. Minor shoplifting charge, age 19, Ontario 2003. Community service order completed. Conditional discharge — no criminal record. Pardoned under the Criminal Records Act in 2006.',
    doneWhen: 'Offense described with evidence of resolution (discharge, pardon, or completion of sentence)',
    minWords: 10,
  },
  'W-PARTNERSHIP-SPLIT': {
    heading: 'Each E-2 investor must meet requirements independently — and both must be active.',
    question: "Confirm the ownership split and describe each partner's active management role.",
    answerKey: 'QR-PARTNERSHIP-DETAIL',
    placeholder: 'e.g. Partner A (me): 60% owner — day-to-day operations, hiring, and vendor relationships. Partner B: 40% owner — marketing, sales strategy, and client development. Both partners are Canadian nationals. Both will file separate E-2 visa applications.',
    doneWhen: "Ownership percentages confirmed and each partner's active management role described",
    minWords: 15,
  },
  'W-NO-BIZ-IDENTIFIED': {
    heading: 'A business must be identified before filing — but you can begin preparation now.',
    question: 'Describe the type of business or franchise you are actively considering and your search timeline.',
    answerKey: 'QR-BIZ-TYPE',
    placeholder: 'e.g. I am evaluating service-based franchises in the $150K–$300K investment range, specifically in home services and pet care. I have scheduled calls with 3 franchise consultants and plan to select a franchise by September 2025.',
    doneWhen: 'Business type described and a rough search/selection timeline given',
    minWords: 10,
  },
};

// ============================================================================
// Quality check
// ============================================================================

function wordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

export function isFlagAddressed(code: string, answer: string): boolean {
  const r = FLAG_REMEDIATION[code];
  if (!r) return false;
  return wordCount(answer) >= r.minWords;
}

// ============================================================================
// Props
// ============================================================================

export interface FlagCardProps {
  code: string;
  info: { question_id: string; plain_language: string; why_it_matters: string; edit_label: string };
  isAttorney: boolean;
  currentAnswer: string | undefined;
  personalizedExplanation: string | undefined;
  flagAnswer: string;
  isExpanded: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onFlagAnswerChange: (answerKey: string, value: string) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  onRedirectToQuiz: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function FlagCard({
  code,
  info,
  isAttorney,
  currentAnswer,
  personalizedExplanation,
  flagAnswer,
  isExpanded,
  canEdit,
  onToggle,
  onFlagAnswerChange,
  saveStatus,
  onRedirectToQuiz,
}: FlagCardProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remediation = FLAG_REMEDIATION[code];
  const addressed = remediation ? isFlagAddressed(code, flagAnswer) : false;

  const borderColor = addressed
    ? 'rgba(34,197,94,0.3)'
    : isAttorney
    ? 'rgba(239,100,100,0.25)'
    : 'rgba(239,159,39,0.25)';

  const bgColor = addressed
    ? 'rgba(34,197,94,0.04)'
    : isAttorney
    ? 'rgba(239,100,100,0.04)'
    : 'rgba(239,159,39,0.04)';

  const accentColor = isAttorney ? 'rgba(239,100,100,0.8)' : 'rgba(239,159,39,0.8)';
  const headlineColor = isAttorney ? 'rgba(239,100,100,0.95)' : 'rgba(239,159,39,0.95)';

  const handleTextChange = useCallback((value: string) => {
    if (!remediation) return;
    onFlagAnswerChange(remediation.answerKey, value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // The parent handles debounced DB save via its own ref
  }, [remediation, onFlagAnswerChange]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(245,240,232,0.04)',
    border: '1px solid rgba(245,240,232,0.12)',
    color: '#f5f0e8',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
    padding: '9px 11px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    lineHeight: 1.6,
    borderRadius: 0,
  };

  return (
    <div
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        transition: 'border-color 0.3s ease, background 0.3s ease',
      }}
    >
      {/* ── Card header (always visible) ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', padding: '14px 16px' }}>
        <div style={{ fontSize: '16px', color: addressed ? '#22c55e' : accentColor, flexShrink: 0, marginTop: '1px' }}>
          {addressed ? '✓' : isAttorney ? '⚖' : '!'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: addressed ? '#22c55e' : headlineColor, marginBottom: '3px' }}>
            {info.plain_language}
            {addressed && (
              <span style={{ marginLeft: '8px', fontSize: '10px', fontWeight: 400, letterSpacing: '0.1em', color: 'rgba(34,197,94,0.7)', textTransform: 'uppercase' }}>
                Addressed
              </span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6, marginBottom: currentAnswer ? '6px' : '0' }}>
            {personalizedExplanation || info.why_it_matters}
          </div>
          {currentAnswer && (
            <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.3)', marginBottom: '0' }}>
              Your answer: &ldquo;{currentAnswer}&rdquo;
            </div>
          )}

          {/* ── Action row ───────────────────────────────────────────────── */}
          <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {canEdit && remediation ? (
              <button
                onClick={onToggle}
                style={{
                  fontSize: '11px',
                  color: addressed ? 'rgba(34,197,94,0.7)' : '#C9A84C',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {addressed
                  ? (isExpanded ? 'Hide detail ↑' : 'View detail ↓')
                  : (isExpanded ? 'Close ↑' : 'Address this ↓')}
              </button>
            ) : (
              <button
                onClick={onRedirectToQuiz}
                style={{
                  fontSize: '11px',
                  color: '#C9A84C',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {info.edit_label} →
              </button>
            )}
            {canEdit && !remediation && (
              <button
                onClick={onRedirectToQuiz}
                style={{
                  fontSize: '11px',
                  color: 'rgba(245,240,232,0.35)',
                  textDecoration: 'underline',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
              >
                {info.edit_label} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded remediation panel ──────────────────────────────────── */}
      {isExpanded && remediation && canEdit && (
        <div
          style={{
            borderTop: `1px solid ${borderColor}`,
            padding: '16px',
            background: 'rgba(0,0,0,0.15)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Heading */}
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.3)', textTransform: 'uppercase', marginBottom: '6px' }}>
            What to add
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.6, marginBottom: '12px' }}>
            {remediation.heading}
          </div>

          {/* Question label */}
          <label style={{ display: 'block', fontSize: '11px', color: 'rgba(245,240,232,0.5)', marginBottom: '6px', lineHeight: 1.5 }}>
            {remediation.question}
          </label>

          {/* Textarea */}
          <textarea
            value={flagAnswer}
            onChange={e => handleTextChange(e.target.value)}
            placeholder={remediation.placeholder}
            rows={4}
            style={inputStyle}
          />

          {/* Word count progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: addressed ? 'rgba(34,197,94,0.7)' : 'rgba(245,240,232,0.25)' }}>
              {addressed
                ? '✓ Sufficient detail added'
                : `${wordCount(flagAnswer)} of ~${remediation.minWords} words — ${remediation.doneWhen}`}
            </div>
            {saveStatus !== 'idle' && (
              <div style={{ fontSize: '10px', letterSpacing: '0.06em', color: saveStatus === 'saved' ? '#22c55e' : 'rgba(245,240,232,0.3)' }}>
                {saveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </div>
            )}
          </div>

          {/* All done state */}
          {addressed && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              fontSize: '12px',
              color: 'rgba(34,197,94,0.8)',
              lineHeight: 1.5,
            }}>
              ✓ This detail has been added to your case file and will be used in your application documents.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
