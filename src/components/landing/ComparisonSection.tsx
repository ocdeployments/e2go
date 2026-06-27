'use client'

// ComparisonSection.tsx v2
// Changes from v1:
// - Added business formation step (LLC, EIN, US banking) to both columns
// - Added time savings callout alongside cost totals
// - Updated attorney disclaimer — neutral, no fee claims
// - Added "already further along?" callout at bottom

export function ComparisonSection() {
  return (
    <section style={{
      background: '#0a0a0a',
      padding: '96px 24px',
      borderTop: '1px solid rgba(201,168,76,0.12)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Heading */}
        <div style={{ textAlign: 'left', marginBottom: '64px' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '16px',
          }}>
            Why e2go
          </p>
          <h2 style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(28px, 4vw, 42px)',
            fontWeight: 300,
            color: '#f5f0e8',
            lineHeight: 1.2,
            margin: '0 0 20px',
          }}>
            One platform. The complete journey.
          </h2>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.78)',
            maxWidth: '620px',
            margin: 0,
            lineHeight: 1.7,
          }}>
            Most people spend months asking the wrong people the wrong questions.
            e2go puts everything in one place — in the right order, from day one.
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '2px',
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.12)',
        }}>

          {/* === e2go COLUMN === */}
          <div style={{ background: '#0a0a0a', padding: '40px' }}>
            <div style={{ marginBottom: '32px' }}>
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#C9A84C',
                background: 'rgba(201,168,76,0.08)',
                border: '1px solid rgba(201,168,76,0.2)',
                padding: '4px 12px',
                display: 'inline-block',
                marginBottom: '16px',
              }}>
                The e2go path
              </span>
              <h3 style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '24px',
                fontWeight: 300,
                color: '#f5f0e8',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                Structured. Clear. Complete.
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.74)',
                margin: 0,
                lineHeight: 1.6,
              }}>
                From first question to submission-ready package.
              </p>
            </div>

            {e2goSteps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '16px',
                paddingBottom: '24px',
                marginBottom: '24px',
                borderBottom: i < e2goSteps.length - 1
                  ? '1px solid rgba(201,168,76,0.08)'
                  : 'none',
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  flexShrink: 0,
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                }}>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#C9A84C',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#f5f0e8',
                    marginBottom: '4px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 300,
                    color: 'rgba(245,240,232,0.76)',
                    lineHeight: 1.6,
                    marginBottom: '6px',
                  }}>
                    {step.description}
                  </div>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#C9A84C',
                    letterSpacing: '0.06em',
                  }}>
                    {step.cost}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals — cost + time */}
            <div style={{
              borderTop: '1px solid rgba(201,168,76,0.2)',
              paddingTop: '24px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '10px',
              }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.72)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Platform cost
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: '#C9A84C',
                }}>
                  From $550
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.72)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Typical timeline
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: '#C9A84C',
                }}>
                  4–6 months
                </span>
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.68)',
                margin: '10px 0 0',
                lineHeight: 1.6,
              }}>
                Attorney review optional — typically reduced to $1,500–$3,000
                since documents are already prepared.
              </p>
            </div>
          </div>

          {/* === TRADITIONAL COLUMN === */}
          <div style={{
            background: 'rgba(201,168,76,0.015)',
            padding: '40px',
          }}>
            <div style={{ marginBottom: '32px' }}>
              <span style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.68)',
                background: 'rgba(245,240,232,0.04)',
                border: '1px solid rgba(245,240,232,0.08)',
                padding: '4px 12px',
                display: 'inline-block',
                marginBottom: '16px',
              }}>
                The traditional path
              </span>
              <h3 style={{
                fontFamily: '"Cormorant Garamond", serif',
                fontSize: '24px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.78)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                Fragmented. Expensive. Slow.
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.68)',
                margin: 0,
                lineHeight: 1.6,
              }}>
                Multiple professionals. Overlapping fees. Nobody owns the full picture.
              </p>
            </div>

            {traditionalSteps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '16px',
                paddingBottom: '24px',
                marginBottom: '24px',
                borderBottom: i < traditionalSteps.length - 1
                  ? '1px solid rgba(245,240,232,0.05)'
                  : 'none',
                opacity: 0.7,
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  flexShrink: 0,
                  border: '1px solid rgba(245,240,232,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '2px',
                }}>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'rgba(245,240,232,0.68)',
                  }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(245,240,232,0.6)',
                    marginBottom: '4px',
                  }}>
                    {step.title}
                  </div>
                  <div style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: 300,
                    color: 'rgba(245,240,232,0.70)',
                    lineHeight: 1.6,
                    marginBottom: '6px',
                  }}>
                    {step.description}
                  </div>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(245,240,232,0.68)',
                    letterSpacing: '0.06em',
                  }}>
                    {step.cost}
                  </span>
                </div>
              </div>
            ))}

            {/* Totals — cost + time */}
            <div style={{
              borderTop: '1px solid rgba(245,240,232,0.08)',
              paddingTop: '24px',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: '10px',
              }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Professional fees
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.68)',
                  textDecoration: 'line-through',
                  textDecorationColor: 'rgba(245,240,232,0.1)',
                }}>
                  $8,000–$15,000+
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}>
                <span style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.65)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Typical timeline
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.68)',
                }}>
                  9–14 months
                </span>
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.62)',
                margin: '10px 0 0',
                lineHeight: 1.6,
              }}>
                Each fee billed separately. Consultant, broker, lawyer, and
                formation specialist do not share information or coordinate.
              </p>
            </div>
          </div>
        </div>

        {/* Everything included — every feature named once, grouped to stay
            scannable. This is what makes the "one platform / complete journey"
            promise concrete: the comparison above tells the story, this lists
            the receipts. */}
        <div style={{
          marginTop: '2px',
          background: '#0a0a0a',
          border: '1px solid rgba(201,168,76,0.12)',
          borderTop: 'none',
          padding: '40px',
        }}>
          <span style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            fontWeight: 500,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            background: 'rgba(201,168,76,0.08)',
            border: '1px solid rgba(201,168,76,0.2)',
            padding: '4px 12px',
            display: 'inline-block',
            marginBottom: '28px',
          }}>
            Everything included
          </span>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '36px',
          }}>
            {featureGroups.map((group) => (
              <div key={group.heading}>
                <div style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: '11px',
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(201,168,76,0.7)',
                  paddingBottom: '14px',
                  marginBottom: '18px',
                  borderBottom: '1px solid rgba(201,168,76,0.12)',
                }}>
                  {group.heading}
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {group.items.map((item) => (
                    <li key={item.name} style={{
                      display: 'flex',
                      gap: '12px',
                      marginBottom: '14px',
                    }}>
                      <span aria-hidden="true" style={{
                        width: '5px',
                        height: '5px',
                        flexShrink: 0,
                        marginTop: '7px',
                        background: '#C9A84C',
                      }} />
                      <span style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'rgba(245,240,232,0.76)',
                        lineHeight: 1.5,
                      }}>
                        <span style={{ fontWeight: 500, color: '#f5f0e8' }}>{item.name}</span>
                        {item.note ? ` — ${item.note}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row — "already further along?" callout. The legal disclaimers
            that used to live here now sit in the page footer, so they read as
            the final word instead of interrupting the comparison. */}
        <div style={{
          marginTop: '2px',
          background: 'rgba(201,168,76,0.03)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderTop: 'none',
          borderLeft: '2px solid rgba(201,168,76,0.5)',
          padding: '28px 32px',
        }}>
          <p style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: '18px',
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#C9A84C',
            margin: '0 0 6px',
            lineHeight: 1.4,
          }}>
            Already further along?
          </p>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.76)',
            margin: 0,
            maxWidth: '640px',
            lineHeight: 1.7,
          }}>
            Business identified, LLC formed, or documents already started — your
            timeline is shorter than the numbers above. Check your eligibility to
            see exactly where you stand.
          </p>
        </div>

      </div>
    </section>
  )
}

// ─── e2go STEPS (7 steps — added business formation as step 3) ───────────────

const e2goSteps = [
  {
    title: 'Clarity from day one',
    description: 'A free quiz and built-in knowledge base replace weeks of research — you know where you stand before spending a dollar.',
    cost: 'Free — no account required',
  },
  {
    title: 'Franchise introduction within 24 hours',
    description: 'Matched to an E-2 broker paid by the franchisor, not you — within a day, not weeks of searching.',
    cost: 'No client fee — ever',
  },
  {
    title: 'Business formation — guided and parallel',
    description: 'LLC, EIN, and US banking through pre-briefed specialists, run in parallel — 2–3 weeks instead of 4–6.',
    cost: 'Specialist referrals included',
  },
  {
    title: 'Your entire application in one place',
    description: 'Every answer and document in one organised case file that builds as you go. Nothing lost, nothing repeated.',
    cost: 'Included in platform',
  },
  {
    title: 'AI-generated documents, quality-gated',
    description: 'Cover letter, source of funds, business plan and more — built from your answers, gap-analysed and quality-checked before you see them.',
    cost: 'Included in platform',
  },
  {
    title: 'Interview preparation',
    description: 'A simulated consular session on your specific case, with feedback and notes on what to fix before you go.',
    cost: 'Included in platform',
  },
  {
    title: 'Submission-ready or attorney-ready',
    description: 'Download a complete package — submit it directly, or hand a lawyer finished work to review rather than rebuild.',
    cost: 'Attorney review optional',
  },
]

// ─── TRADITIONAL STEPS (7 steps — matching structure) ─────────────────────────

const traditionalSteps = [
  {
    title: 'Weeks of confused research',
    description: 'Google, Reddit, and conflicting advice with no single source of truth — 2–4 weeks before you even know where to start.',
    cost: '2–4 weeks',
  },
  {
    title: 'Franchise broker — if you can find one',
    description: 'Some charge just to begin; others take weeks to reply — with no briefing on your budget or eligibility.',
    cost: '$0–$5,000 depending on broker',
  },
  {
    title: 'Business formation — coordinated alone',
    description: 'LLC, EIN, and banking as three separate processes nobody connects — 4–6 weeks of back-and-forth.',
    cost: '$1,500–$4,000 in formation fees',
  },
  {
    title: 'Immigration consultant — separate fee',
    description: 'Coordinates the process but cannot give legal advice or represent you — the immigration lawyer is extra.',
    cost: '$3,000–$8,000 CAD — lawyer not included',
  },
  {
    title: 'Document gathering — on your own',
    description: 'A separate checklist from each professional, the same information gathered and repeated over and over.',
    cost: '4–6 weeks of coordination',
  },
  {
    title: 'No structured interview preparation',
    description: 'At most one attorney prep session — no question bank, no feedback, no way to know if you are ready.',
    cost: 'Often not included',
  },
  {
    title: 'Immigration attorney — full preparation',
    description: 'Drafts everything from scratch at full hourly rate, because nothing was prepared in advance.',
    cost: '$8,000–$15,000+ USD',
  },
]

// ─── EVERYTHING INCLUDED — every feature, named once, grouped for scanning ────
// Spells out the full platform (the owner's "spell out each and every feature")
// in a compact, skimmable grid rather than more prose.

interface FeatureItem {
  name: string
  note?: string
}

interface FeatureGroup {
  heading: string
  items: FeatureItem[]
}

const featureGroups: FeatureGroup[] = [
  {
    heading: 'Assess — free',
    items: [
      { name: 'Eligibility quiz', note: 'score out of 100' },
      { name: 'Risk flags + timeline estimate' },
      { name: 'Denial-risk engine', note: '15 factors across 6 categories' },
      { name: 'Ask e2go knowledge base', note: 'instant answers from real E-2 rules' },
    ],
  },
  {
    heading: 'Build',
    items: [
      { name: 'Franchise introduction', note: 'no client fee' },
      { name: 'Business formation', note: 'LLC, EIN, US banking' },
      { name: 'Unified case file', note: 'saved as you go' },
      { name: 'AI documents', note: 'cover letter, source of funds, business plan, qualifications' },
      { name: 'Written in your voice', note: 'matched to your own writing' },
      { name: 'Gap analysis + 15-step quality pipeline' },
    ],
  },
  {
    heading: 'Prepare & submit',
    items: [
      { name: 'Interview simulator', note: 'consular session on your case' },
      { name: 'Prep kit + notes', note: 'what to fix before you go' },
      { name: 'Submission-ready package', note: 'every tab in order' },
      { name: 'Attorney-ready', note: 'hand a lawyer finished work' },
    ],
  },
]
