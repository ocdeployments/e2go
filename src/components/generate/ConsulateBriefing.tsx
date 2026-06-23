'use client';

import {
  getConsulateConfig,
  getDocumentManifest,
  getPageLimitDisplay,
  type ConsulateConfig,
} from '@/data/consulate-config';

interface Props {
  consulate: string | null | undefined;
  onContinue: () => void;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CompressionChip({ mode }: { mode: ConsulateConfig['compressionMode'] }) {
  const map: Record<typeof mode, { label: string; color: string; bg: string; border: string }> = {
    NONE: {
      label: 'Full-length documents',
      color: 'rgba(100,200,120,0.9)',
      bg: 'rgba(100,200,120,0.06)',
      border: 'rgba(100,200,120,0.25)',
    },
    STANDARD: {
      label: 'Standard format',
      color: 'rgba(201,168,76,0.9)',
      bg: 'rgba(201,168,76,0.06)',
      border: 'rgba(201,168,76,0.25)',
    },
    COMPRESSED: {
      label: 'Compressed format',
      color: 'rgba(220,140,50,0.9)',
      bg: 'rgba(220,140,50,0.06)',
      border: 'rgba(220,140,50,0.25)',
    },
    MAXIMUM: {
      label: 'Maximum compression',
      color: 'rgba(220,80,60,0.9)',
      bg: 'rgba(220,80,60,0.06)',
      border: 'rgba(220,80,60,0.25)',
    },
  };
  const s = map[mode];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        fontSize: '10px',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: s.color,
        background: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}

function PageLimitChip({ config }: { config: ConsulateConfig }) {
  const display = getPageLimitDisplay(config);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        fontSize: '10px',
        fontFamily: "'DM Sans', sans-serif",
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(201,168,76,0.85)',
        background: 'rgba(201,168,76,0.06)',
        border: '1px solid rgba(201,168,76,0.2)',
      }}
    >
      {display}
    </span>
  );
}

function PageBudgetBar({ config }: { config: ConsulateConfig }) {
  if (config.pageLimitType !== 'overall' || !config.pageLimit) return null;

  const docs = getDocumentManifest(config);
  const countedDocs = docs.filter((d) => d.countsTowardLimit);
  const minPages = countedDocs.reduce((s, d) => s + d.pagesMin, 0);
  const maxPages = countedDocs.reduce((s, d) => s + d.pagesMax, 0);
  const midPages = Math.round((minPages + maxPages) / 2);
  const pct = Math.min(98, Math.round((midPages / config.pageLimit) * 100));

  const barColor =
    pct > 90
      ? 'rgba(220,80,60,0.8)'
      : pct > 75
      ? 'rgba(220,140,50,0.8)'
      : 'rgba(201,168,76,0.75)';

  return (
    <div style={{ marginBottom: '28px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px',
          fontSize: '11px',
          fontFamily: "'DM Sans', sans-serif",
          color: 'rgba(245,240,232,0.45)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        <span>Page budget</span>
        <span>
          ~{minPages}–{maxPages} of {config.pageLimit} pages
        </span>
      </div>
      <div
        style={{
          height: '3px',
          background: 'rgba(255,255,255,0.07)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            background: barColor,
            transition: 'width 0.6s ease',
          }}
        />
        {/* Limit marker */}
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '-4px',
            width: '1px',
            height: '11px',
            background: 'rgba(255,255,255,0.2)',
          }}
        />
      </div>
      <p
        style={{
          marginTop: '6px',
          fontSize: '11px',
          fontFamily: "'DM Sans', sans-serif",
          color: 'rgba(245,240,232,0.35)',
        }}
      >
        Remaining budget for supporting documents you collect:{' '}
        {config.pageLimit - maxPages < 0 ? 0 : config.pageLimit - maxPages}–
        {config.pageLimit - minPages} pages
      </p>
    </div>
  );
}

function PerTabLimitsTable({ config }: { config: ConsulateConfig }) {
  if (config.pageLimitType !== 'per_tab' || config.tabLimits.length === 0) return null;

  return (
    <div style={{ marginBottom: '28px' }}>
      <div
        style={{
          fontSize: '10px',
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(201,168,76,0.7)',
          marginBottom: '10px',
        }}
      >
        Per-Tab Limits
      </div>
      <div style={{ border: '1px solid rgba(201,168,76,0.12)' }}>
        {config.tabLimits.map((tab, i) => (
          <div
            key={tab.tabId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 16px',
              borderBottom:
                i < config.tabLimits.length - 1
                  ? '1px solid rgba(201,168,76,0.08)'
                  : 'none',
              fontSize: '12px',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span style={{ color: 'rgba(245,240,232,0.65)' }}>{tab.label}</span>
            <span style={{ color: '#C9A84C' }}>{tab.maxPages} pages max</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConsulateBriefing({ consulate, onContinue }: Props) {
  const config = getConsulateConfig(consulate);
  const docs = getDocumentManifest(config);
  const generatedDocs = docs.filter((d) => d.exemptNote !== 'Reference guide — not submitted in binder');
  const referenceDocs = docs.filter((d) => d.exemptNote === 'Reference guide — not submitted in binder');

  const CLIENT_COLLECT_ITEMS = [
    'Passport(s) — biodata page for each applicant',
    'DS-156E form — principal applicant only (E-visa specific)',
    'DS-160 confirmation printout — all applicants',
    'MRV fee receipt and appointment confirmation',
    'Bank statements — 12 months minimum (24 months preferred)',
    'Wire transfer records showing investment funds moved to U.S.',
    'Signed lease agreement — key pages (parties, term, rent, signatures)',
    'Operating agreement — ownership and management pages',
    'EIN confirmation letter and entity formation documents',
    'Franchise agreement — signature page and fee schedule (if franchise)',
  ];

  const isUnknownConsulate = config.postId === 'unknown';

  return (
    <div
      style={{
        maxWidth: '680px',
        margin: '0 auto',
        padding: '40px 0',
      }}
    >
      {/* ── Header ── */}
      <div style={{ marginBottom: '36px' }}>
        <p
          style={{
            fontSize: '10px',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.35)',
            marginBottom: '10px',
          }}
        >
          Your application package
        </p>

        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '30px',
            fontWeight: 300,
            lineHeight: 1.15,
            color: '#f5f0e8',
            marginBottom: '16px',
          }}
        >
          {isUnknownConsulate
            ? 'Here is what we will generate for your application'
            : `Here is what we will generate for your ${config.city} application`}
        </h1>

        <p
          style={{
            fontSize: '13px',
            fontFamily: "'DM Sans', sans-serif",
            color: 'rgba(245,240,232,0.55)',
            lineHeight: 1.65,
            marginBottom: '16px',
          }}
        >
          {isUnknownConsulate
            ? 'Review the document list and page estimates below before we begin. You will have a chance to verify your investment figures on the next screen.'
            : `Different consulates have different page limits and formatting rules. Below is exactly what e2go will generate for your ${config.displayName} submission, and what you will need to collect separately.`}
        </p>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <PageLimitChip config={config} />
          <CompressionChip mode={config.compressionMode} />
          {config.submissionMethod === 'online_portal' && (
            <span
              style={{
                display: 'inline-block',
                padding: '3px 10px',
                fontSize: '10px',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(120,170,220,0.85)',
                background: 'rgba(120,170,220,0.06)',
                border: '1px solid rgba(120,170,220,0.2)',
              }}
            >
              Online portal submission
            </span>
          )}
        </div>
      </div>

      <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '32px' }} />

      {/* ── Maximum compression explanation ── */}
      {config.compressionMode === 'MAXIMUM' && (
        <div
          style={{
            padding: '16px 20px',
            marginBottom: '28px',
            border: '1px solid rgba(220,80,60,0.2)',
            background: 'rgba(220,80,60,0.04)',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              fontFamily: "'DM Sans', sans-serif",
              color: 'rgba(245,240,232,0.7)',
              lineHeight: 1.65,
              margin: 0,
            }}
          >
            <strong style={{ color: 'rgba(220,80,60,0.9)', fontWeight: 500 }}>
              Maximum compression active.
            </strong>{' '}
            {config.city} has a strict {config.pageLimit}-page limit. Your business plan will be
            written in condensed format — tables, bullet points, and key financials only, no extended
            narrative prose. Your cover letter and qualifications are exempt and will be written at
            full length. You can bring a complete narrative business plan to your interview.
          </p>
        </div>
      )}

      {/* ── Per-tab limits ── */}
      <PerTabLimitsTable config={config} />

      {/* ── Documents we generate ── */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '10px',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.7)',
            marginBottom: '12px',
          }}
        >
          ★ Documents e2go generates
        </div>

        <div style={{ border: '1px solid rgba(201,168,76,0.15)' }}>
          {generatedDocs.map((doc, i) => (
            <div
              key={doc.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom:
                  i < generatedDocs.length - 1
                    ? '1px solid rgba(201,168,76,0.08)'
                    : 'none',
                gap: '12px',
              }}
            >
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: doc.countsTowardLimit
                      ? 'rgba(245,240,232,0.75)'
                      : 'rgba(245,240,232,0.45)',
                  }}
                >
                  {doc.label}
                </span>
                {doc.exemptNote && (
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontFamily: "'DM Sans', sans-serif",
                      color: 'rgba(100,200,120,0.7)',
                      marginTop: '2px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {doc.exemptNote}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {doc.countsTowardLimit ? (
                  <span
                    style={{
                      fontSize: '12px',
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      color: '#C9A84C',
                    }}
                  >
                    {doc.pagesMin}–{doc.pagesMax} pages
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: "'DM Sans', sans-serif",
                      color: 'rgba(245,240,232,0.3)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    not counted
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Reference docs footnote */}
        {referenceDocs.length > 0 && (
          <p
            style={{
              marginTop: '10px',
              fontSize: '11px',
              fontFamily: "'DM Sans', sans-serif",
              color: 'rgba(245,240,232,0.3)',
              lineHeight: 1.5,
            }}
          >
            Also generated but not submitted in the binder:{' '}
            {referenceDocs.map((d) => d.label).join(', ')}
          </p>
        )}
      </div>

      {/* ── Page budget bar ── */}
      <PageBudgetBar config={config} />

      {/* ── Documents client collects ── */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            fontSize: '10px',
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'rgba(245,240,232,0.35)',
            marginBottom: '12px',
          }}
        >
          ○ Documents you collect and include
        </div>

        <div
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '4px 0',
          }}
        >
          {CLIENT_COLLECT_ITEMS.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '9px 16px',
                borderBottom:
                  i < CLIENT_COLLECT_ITEMS.length - 1
                    ? '1px solid rgba(255,255,255,0.04)'
                    : 'none',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  marginTop: '1px',
                  fontSize: '10px',
                  color: 'rgba(245,240,232,0.2)',
                }}
              >
                ○
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: 'rgba(245,240,232,0.5)',
                  lineHeight: 1.5,
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>

        {/* Exempt docs callout */}
        {config.exemptDocumentLabels.length > 0 && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(100,200,120,0.04)',
              border: '1px solid rgba(100,200,120,0.12)',
            }}
          >
            <p
              style={{
                margin: '0 0 6px',
                fontSize: '10px',
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'rgba(100,200,120,0.6)',
              }}
            >
              Exempt at {config.city} — do not count toward page limit
            </p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {config.exemptDocumentLabels.map((label) => (
                <li
                  key={label}
                  style={{
                    fontSize: '11px',
                    fontFamily: "'DM Sans', sans-serif",
                    color: 'rgba(245,240,232,0.4)',
                    lineHeight: 1.6,
                  }}
                >
                  · {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ── Consulate guidance quote ── */}
      {config.consulateGuidance && (
        <div
          style={{
            marginBottom: '28px',
            padding: '16px 20px',
            borderLeft: '2px solid rgba(201,168,76,0.3)',
            background: 'rgba(201,168,76,0.03)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              color: 'rgba(245,240,232,0.55)',
              lineHeight: 1.7,
            }}
          >
            {config.consulateGuidance}
          </p>
        </div>
      )}

      {/* ── Warnings ── */}
      {config.warnings.length > 0 && (
        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {config.warnings.map((warning, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px 16px',
                border: '1px solid rgba(201,168,76,0.2)',
                background: 'rgba(201,168,76,0.04)',
              }}
            >
              <span
                style={{
                  flexShrink: 0,
                  fontSize: '12px',
                  color: 'rgba(201,168,76,0.6)',
                  marginTop: '1px',
                }}
              >
                ⚠
              </span>
              <p
                style={{
                  margin: 0,
                  fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  color: 'rgba(245,240,232,0.55)',
                  lineHeight: 1.65,
                }}
              >
                {warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Verification date note ── */}
      <p
        style={{
          fontSize: '11px',
          fontFamily: "'DM Sans', sans-serif",
          color: 'rgba(245,240,232,0.25)',
          marginBottom: '32px',
          lineHeight: 1.5,
        }}
      >
        Requirements last verified: {config.lastVerified}. Consulate page limits change without
        notice — always confirm at{' '}
        <span style={{ color: 'rgba(201,168,76,0.45)' }}>{config.officialUrl}</span> before
        submitting.
      </p>

      <div style={{ height: '1px', background: 'rgba(201,168,76,0.15)', marginBottom: '32px' }} />

      {/* ── CTA ── */}
      <div>
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'rgba(201,168,76,0.15)',
            border: '1px solid rgba(201,168,76,0.4)',
            color: '#C9A84C',
            fontSize: '13px',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,168,76,0.15)';
          }}
        >
          Understood — confirm investment figures →
        </button>
        <p
          style={{
            marginTop: '10px',
            textAlign: 'center',
            fontSize: '11px',
            fontFamily: "'DM Sans', sans-serif",
            color: 'rgba(245,240,232,0.25)',
          }}
        >
          You will verify your investment amounts on the next screen before generation begins.
        </p>
      </div>
    </div>
  );
}
