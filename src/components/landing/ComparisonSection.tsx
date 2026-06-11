'use client'

// ComparisonSection.tsx v2
// Changes from v1:
// - Added business formation step (LLC, EIN, US banking) to both columns
// - Added time savings callout alongside cost totals
// - Updated attorney disclaimer — neutral, no fee claims
// - Added "already further along?" callout at bottom

export function ComparisonSection() {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .comparison-grid { grid-template-columns: 1fr !important; }
          .comparison-disclaimers { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <section style={{
      background: '#0a0a0a',
      padding: '96px 24px',
      borderTop: '1px solid rgba(201,168,76,0.12)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '16px',
          }}>
            Why E2go
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
            color: 'rgba(245,240,232,0.55)',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            Most people spend months asking the wrong people the wrong questions.
            E2go puts everything in one place — in the right order, from day one.
          </p>
        </div>

        {/* Two-column grid */}
        <div className="comparison-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: '2px',
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.12)',
        }}>

          {/* === E2GO COLUMN === */}
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
                The E2go path
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
                color: 'rgba(245,240,232,0.45)',
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
                    color: 'rgba(245,240,232,0.5)',
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
                  color: 'rgba(245,240,232,0.4)',
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
                  color: 'rgba(245,240,232,0.4)',
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
                color: 'rgba(245,240,232,0.3)',
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
                color: 'rgba(245,240,232,0.3)',
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
                color: 'rgba(245,240,232,0.55)',
                margin: '0 0 8px',
                lineHeight: 1.3,
              }}>
                Fragmented. Expensive. Slow.
              </h3>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.3)',
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
                    color: 'rgba(245,240,232,0.3)',
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
                    color: 'rgba(245,240,232,0.35)',
                    lineHeight: 1.6,
                    marginBottom: '6px',
                  }}>
                    {step.description}
                  </div>
                  <span style={{
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(245,240,232,0.3)',
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
                  color: 'rgba(245,240,232,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Professional fees
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.3)',
                  textDecoration: 'line-through',
                  textDecorationColor: 'rgba(245,240,232,0.1)',
                }}>
                  $13,000–$28,000+
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
                  color: 'rgba(245,240,232,0.25)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  Typical timeline
                </span>
                <span style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontSize: '28px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.3)',
                }}>
                  9–14 months
                </span>
              </div>
              <p style={{
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.2)',
                margin: '10px 0 0',
                lineHeight: 1.6,
              }}>
                Each fee billed separately. Consultant, broker, lawyer, and
                formation specialist do not share information or coordinate.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom row — disclaimers + already further along callout */}
        <div className="comparison-disclaimers" style={{
          marginTop: '2px',
          background: 'rgba(201,168,76,0.03)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderTop: 'none',
          padding: '28px 32px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '24px',
          alignItems: 'start',
        }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.4)',
            margin: 0,
            lineHeight: 1.7,
            borderLeft: '2px solid rgba(201,168,76,0.25)',
            paddingLeft: '14px',
          }}>
            E2go is a document preparation platform — not a law firm.
            We do not provide legal advice. All documents are drafts
            you must review before submission. If you would like an
            attorney recommendation, we can point you in the right
            direction — that decision is entirely yours.
          </p>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.4)',
            margin: 0,
            lineHeight: 1.7,
            borderLeft: '2px solid rgba(201,168,76,0.25)',
            paddingLeft: '14px',
          }}>
            Franchise brokers in the E2go network are compensated by
            the franchisor — not you. There is no client fee for a
            broker introduction.
          </p>
          <div style={{
            borderLeft: '2px solid rgba(201,168,76,0.5)',
            paddingLeft: '14px',
          }}>
            <p style={{
              fontFamily: '"Cormorant Garamond", serif',
              fontSize: '15px',
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
              fontSize: '12px',
              fontWeight: 300,
              color: 'rgba(245,240,232,0.45)',
              margin: 0,
              lineHeight: 1.7,
            }}>
              Business identified, LLC formed, or documents already
              started — your timeline is shorter than the numbers above.
              Check your eligibility to see exactly where you stand.
            </p>
          </div>
        </div>

      </div>
    </section>
    </>
  )
}

// ─── E2GO STEPS (7 steps — added business formation as step 3) ───────────────

const e2goSteps = [
  {
    title: 'Clarity from day one',
    description: 'The eligibility quiz replaces weeks of research. The built-in knowledge base answers any question based on real E-2 rules — not forums, not friends of friends. You know where you stand before spending a dollar.',
    cost: 'Free — no account required',
  },
  {
    title: 'Franchise introduction within 24 hours',
    description: 'Connected to a broker who works specifically with E-2 investors. Brokers in our network are compensated by the franchisor — not you. Most people spend weeks searching, or thousands of dollars to access one.',
    cost: 'No client fee — ever',
  },
  {
    title: 'Business formation — guided and parallel',
    description: 'LLC formation, EIN, and US business banking handled through specialist referrals. Each specialist is pre-briefed on your situation. Steps run in parallel where possible — 2–3 weeks instead of 4–6.',
    cost: 'Specialist referrals included',
  },
  {
    title: 'Your entire application in one place',
    description: 'Every document, every answer, every piece of supporting information — organised, saved, and accessible. Nothing lost. Nothing repeated. Your case file builds as you go.',
    cost: 'Included in platform',
  },
  {
    title: 'AI-generated documents, quality-gated',
    description: 'Cover letter, source of funds, business plan, qualifications — built from your answers. Every document passes a 15-step pipeline: gap analysis, consistency checks, AI detection audit, and humanization before you see it.',
    cost: 'Included in platform',
  },
  {
    title: 'Interview preparation',
    description: 'Simulated consular officer session with questions drawn from your specific case. Real-time feedback on strong answers, inconsistencies, and what to address before you walk in.',
    cost: 'Included in platform',
  },
  {
    title: 'Submission-ready or attorney-ready',
    description: 'Download a complete, organised package. Submit directly or hand to an attorney for final review. When documents are already prepared, the attorney reviews rather than rebuilds — significantly reducing their scope and fee.',
    cost: 'Attorney review optional',
  },
]

// ─── TRADITIONAL STEPS (7 steps — matching structure) ─────────────────────────

const traditionalSteps = [
  {
    title: 'Weeks of confused research',
    description: 'Google, Reddit, Facebook groups, friends of friends. Conflicting information, outdated posts, no single source of truth. The research phase alone takes 2–4 weeks before most people know where to start.',
    cost: '2–4 weeks',
  },
  {
    title: 'Franchise broker — if you can find one',
    description: 'Some brokers charge consulting fees just to begin. Others take weeks to respond. No advance briefing on your E-2 budget or eligibility requirements. Repeated conversations to cover the same ground.',
    cost: '$0–$5,000 depending on broker',
  },
  {
    title: 'Business formation — coordinated alone',
    description: 'LLC formation, EIN, US business banking — three separate processes with three separate professionals. No one connects the dots. Typical timeline: 4–6 weeks of back-and-forth coordination.',
    cost: '$1,500–$4,000 in formation fees',
  },
  {
    title: 'Immigration consultant — separate fee',
    description: 'A regulated consultant coordinates the process but cannot give legal advice or represent you at appeals. Charged per engagement. The immigration lawyer is an additional cost on top.',
    cost: '$3,000–$8,000 CAD — lawyer not included',
  },
  {
    title: 'Document gathering — on your own',
    description: 'Each professional gives you a checklist. You gather documents separately for each. No system connects them. The same information is provided multiple times to people who do not coordinate.',
    cost: '4–6 weeks of coordination',
  },
  {
    title: 'No structured interview preparation',
    description: 'Typically a single attorney prep session if included at all. No question bank tied to your specific case. No feedback scoring. No way to know how ready you actually are.',
    cost: 'Often not included',
  },
  {
    title: 'Immigration attorney — full preparation',
    description: 'Drafts all documents from scratch. Without any prior preparation, the full scope of work falls entirely to the attorney — billed at their full rate for every hour.',
    cost: '$8,000–$15,000+ USD',
  },
]
