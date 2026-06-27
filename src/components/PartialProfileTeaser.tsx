'use client';

import Link from 'next/link';

// Shown to simulator-only buyers post-session — previews what a full CaseProfile unlocks.
// All values are illustrative; the component is a conversion driver, not a data display.

const LOCKED_SECTIONS = [
  {
    label: 'Applicant Archetype',
    preview: 'Business Buyer',
    description: 'Buyer, Builder, Investor, or Career Switcher — your archetype shapes every weight in the gap analysis.',
  },
  {
    label: 'Source of Funds Score',
    preview: '62 / 100',
    bar: 62,
    description: 'How well your documented funding trail satisfies the USCIS substantiality standard.',
  },
  {
    label: 'Management & Control Score',
    preview: '48 / 100',
    bar: 48,
    description: 'Whether your role qualifies as supervisory or executive under consular scrutiny.',
  },
  {
    label: 'Business Plan Score',
    preview: '71 / 100',
    bar: 71,
    description: 'How the viability and detail of your plan holds up against 15 denial factors.',
  },
];

export function PartialProfileTeaser() {
  return (
    <section
      style={{
        padding: '32px',
        background: 'rgba(201,168,76,0.02)',
        border: '1px solid rgba(201,168,76,0.15)',
        borderRadius: 0,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'rgba(201,168,76,0.6)', letterSpacing: '0.12em' }}>
          Profile Intelligence
        </p>
        <h2
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            fontSize: '22px',
            color: '#f5f0e8',
            marginBottom: '6px',
          }}
        >
          Your E-2 Intelligence Profile
        </h2>
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.74)', lineHeight: 1.6 }}>
          A complete case file unlocks your personalised risk scores, archetype classification,
          and 15-factor denial analysis. Preview below.
        </p>
      </div>

      {/* Locked cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {LOCKED_SECTIONS.map((section) => (
          <div
            key={section.label}
            style={{
              padding: '20px',
              border: '1px solid rgba(201,168,76,0.12)',
              background: 'rgba(10,10,10,0.6)',
              position: 'relative',
            }}
          >
            {/* Blurred preview */}
            <div style={{ filter: 'blur(4px)', userSelect: 'none', pointerEvents: 'none' }}>
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(201,168,76,0.82)', letterSpacing: '0.1em' }}>
                {section.label}
              </p>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontWeight: 300,
                  fontSize: '20px',
                  color: '#f5f0e8',
                  marginBottom: section.bar !== undefined ? '10px' : '8px',
                }}
              >
                {section.preview}
              </p>
              {section.bar !== undefined && (
                <div style={{ height: '4px', background: 'rgba(245,240,232,0.08)', borderRadius: 0, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${section.bar}%`,
                      background: '#C9A84C',
                    }}
                  />
                </div>
              )}
              <p className="text-xs mt-2" style={{ color: 'rgba(245,240,232,0.72)', lineHeight: 1.5 }}>
                {section.description}
              </p>
            </div>

            {/* Lock overlay */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(10,10,10,0.45)',
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(201,168,76,0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: 'block', margin: '0 auto 6px' }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <p className="text-xs" style={{ color: 'rgba(201,168,76,0.6)' }}>Locked</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade CTA */}
      <div
        style={{
          padding: '24px',
          border: '1px solid rgba(201,168,76,0.25)',
          background: 'rgba(201,168,76,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
        className="md:flex-row md:items-center md:justify-between"
      >
        <div>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: '18px',
              color: '#f5f0e8',
              marginBottom: '4px',
            }}
          >
            Unlock your full E-2 profile
          </p>
          <p className="text-sm" style={{ color: 'rgba(245,240,232,0.76)', lineHeight: 1.6 }}>
            Complete your case file to activate archetype scoring, dimension risk scores,
            and a personalised 15-factor denial analysis.
          </p>
        </div>
        <Link
          href="/quiz"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#C9A84C',
            color: '#0a0a0a',
            fontWeight: 500,
            fontSize: '14px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            textDecoration: 'none',
          }}
        >
          Start your case file →
        </Link>
      </div>
    </section>
  );
}
