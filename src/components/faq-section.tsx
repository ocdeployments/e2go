'use client';

import { useState } from 'react';

const faqs = [
  {
    question: "Is E2go a law firm or immigration service?",
    answer: "No. E2go is a document preparation tool. We help you organize your information and generate consulate-formatted application documents based on your answers. We do not provide legal advice, represent you before any government authority, or guarantee any outcome. For legal questions specific to your situation, we recommend consulting a licensed immigration attorney.",
    meta: "Legal"
  },
  {
    question: "How is this different from hiring an immigration attorney?",
    answer: "An immigration attorney provides legal advice, represents you, and can advocate on your behalf if issues arise. E2go prepares your documents at a fraction of the cost. Many applicants use E2go to prepare their documents and then have an attorney review them before submission.",
    meta: "Comparison"
  },
  {
    question: "What happens if my visa application is denied?",
    answer: "A denial cannot be appealed, but you may reapply at any time with new or improved documentation. Our confidence score identifies the weakest dimensions of your application before you submit, giving you the opportunity to strengthen them first.",
    meta: "Denial"
  },
  {
    question: "How does E2go know what documents I need?",
    answer: "Our question engine is built on the 9 FAM 402.9 Foreign Affairs Manual — the same document consular officers use to evaluate E-2 applications. Every question maps to a specific evaluation criterion. The documents we generate address each criterion directly using your exact answers.",
    meta: "Process"
  },
  {
    question: "Is my information secure?",
    answer: "We store only your answers — never your passport scans, bank statements, or physical documents. All answers are encrypted at rest. Documents are generated on demand and downloaded directly to your device. We never store your completed application documents on our servers.",
    meta: "Security"
  },
  {
    question: "Which countries are eligible for the E-2 visa?",
    answer: "The E-2 visa is available to nationals of countries that have a qualifying treaty with the United States. As of 2026, there are 82 treaty countries including Canada, the United Kingdom, Australia, Japan, Germany, and France. Our eligibility quiz checks your nationality in the first question.",
    meta: "Eligibility"
  }
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section
      style={{
        padding: '120px 24px',
        background: '#0a0a0a',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            maxWidth: '600px',
            marginBottom: '64px',
          }}
        >
          <span
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: '10px',
              color: '#C9A84C',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              marginBottom: '16px',
              display: 'block',
            }}
          >
            FAQ
          </span>
          <h2
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '42px',
              fontWeight: 300,
              color: '#f5f0e8',
              lineHeight: 1.1,
              marginBottom: '16px',
              margin: 0,
            }}
          >
            Common questions
          </h2>
          <p
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 300,
              fontSize: '18px',
              color: 'rgba(245,240,232,0.60)',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Everything you need to know about E2go and the E-2 visa process.
          </p>
        </div>

        <ul
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {faqs.map((faq, index) => (
            <li
              key={index}
              style={{
                border: '1px solid rgba(201,168,76,0.12)',
                background: openIndex === index ? 'rgba(201,168,76,0.04)' : 'rgba(201,168,76,0.02)',
                transition: 'background 300ms',
              }}
            >
              <button
                onClick={() => toggle(index)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '24px',
                  padding: '28px 32px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '1px solid rgba(201,168,76,0.20)',
                    background: 'rgba(201,168,76,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#C9A84C',
                    fontSize: '20px',
                    transition: 'transform 300ms',
                    transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                >
                  +
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: '#f5f0e8',
                        margin: 0,
                        lineHeight: 1.4,
                      }}
                    >
                      {faq.question}
                    </span>
                    <span
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 500,
                        fontSize: '10px',
                        color: 'rgba(245,240,232,0.40)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        border: '1px solid rgba(201,168,76,0.12)',
                        padding: '4px 10px',
                        borderRadius: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {faq.meta}
                    </span>
                  </div>
                  <div
                    style={{
                      maxHeight: openIndex === index ? '400px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 400ms ease',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'DM Sans, sans-serif',
                        fontWeight: 300,
                        fontSize: '15px',
                        color: 'rgba(245,240,232,0.60)',
                        lineHeight: 1.7,
                        margin: 0,
                        paddingRight: '16px',
                        paddingTop: openIndex === index ? '12px' : '0',
                      }}
                    >
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}