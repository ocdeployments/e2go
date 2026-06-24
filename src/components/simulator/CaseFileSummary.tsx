'use client';

import { useState, useEffect } from 'react';

interface CaseField {
  key: string;
  label: string;
  value: string;
}

interface CaseSection {
  key: string;
  label: string;
  fields: CaseField[];
}

interface CaseDocument {
  id: string;
  filename: string;
  detectedType: string | null;
  detectedTypeLabel: string;
  fieldsExtracted: number;
  summary: string | null;
  status: string;
}

interface CaseSummary {
  application: {
    principalName: string | null;
    businessName: string | null;
    operatingName: string | null;
    applicationType: string | null;
    tier: string | null;
    targetState: string | null;
    businessCategory: string | null;
    investmentAmount: string | null;
  };
  sections: CaseSection[];
  documents: CaseDocument[];
  totalFields: number;
}

interface CaseFileSummaryProps {
  applicationId: string;
  continueLabel: string;
  onContinue: () => void;
  secondaryAction?: { label: string; href: string };
  headerContent?: React.ReactNode;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const EXHIBIT_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const TIER_LABELS: Record<string, string> = {
  solo: 'Solo applicant',
  partnership: 'Partnership',
};

export default function CaseFileSummary({ applicationId, continueLabel, onContinue, secondaryAction, headerContent }: CaseFileSummaryProps) {
  const [summary, setSummary] = useState<CaseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/simulator/case-summary?applicationId=${applicationId}`);
        if (!res.ok) throw new Error('Failed to load case summary');
        const data = await res.json();
        if (!cancelled) setSummary(data);
      } catch {
        if (!cancelled) setError('We could not load your case file. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [applicationId]);

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>
          Loading your case file…
        </p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: 'center' as const }}>
          <p style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', marginBottom: '20px' }}>
            {error || 'No case file available.'}
          </p>
          <button onClick={onContinue} style={styles.linkButton}>Continue →</button>
        </div>
      </div>
    );
  }

  const { application, sections, documents, totalFields } = summary;
  const name = application.principalName;
  const fileRef = applicationId.replace(/-/g, '').slice(0, 8).toUpperCase();

  const businessLine = application.operatingName && application.operatingName !== application.businessName
    ? `${application.businessName || 'Unnamed entity'} — operating as "${application.operatingName}"`
    : application.businessName || 'Unnamed entity';

  const classification: Array<{ label: string; value: string }> = [];
  if (application.tier) classification.push({ label: 'Filing type', value: TIER_LABELS[application.tier] || application.tier });
  if (application.businessCategory) {
    let catDisplay = application.businessCategory;
    try {
      const parsed = JSON.parse(application.businessCategory);
      if (Array.isArray(parsed)) catDisplay = parsed.join(', ');
    } catch { /* not JSON — use as-is */ }
    classification.push({ label: 'Business category', value: catDisplay });
  }
  if (application.targetState) classification.push({ label: 'Target state', value: application.targetState });
  if (application.investmentAmount) classification.push({ label: 'Investment amount', value: application.investmentAmount });

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {headerContent}

        {/* Cover */}
        <div style={styles.cover}>
          <div style={styles.coverTopRow}>
            <div style={styles.eyebrow}>E-2 CASE FILE</div>
            <div style={styles.fileRef}>REF. {fileRef}</div>
          </div>

          <h1 style={styles.title}>
            {name ? name : 'Your Case File'}
          </h1>
          <p style={styles.businessLine}>{businessLine}</p>

          {classification.length > 0 && (
            <div style={styles.classificationGrid}>
              {classification.map(item => (
                <div key={item.label} style={styles.classificationItem}>
                  <div style={styles.classificationLabel}>{item.label}</div>
                  <div style={styles.classificationValue}>{item.value}</div>
                </div>
              ))}
            </div>
          )}

          <p style={styles.subtitle}>
            This dossier reflects everything the app currently knows about your case —
            drawn from the documents you uploaded and the details you&rsquo;ve confirmed.
            Your practice interview will be conducted exactly as a consular officer would
            conduct it: by probing this file for consistency, depth, and credibility.
          </p>

          <div style={styles.statRow}>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{documents.length}</div>
              <div style={styles.statLabel}>Exhibit{documents.length !== 1 ? 's' : ''} on file</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{totalFields}</div>
              <div style={styles.statLabel}>Detail{totalFields !== 1 ? 's' : ''} on record</div>
            </div>
          </div>
        </div>

        {/* Documents processed — "Exhibits" */}
        {documents.length > 0 && (
          <div style={styles.block}>
            <h2 style={styles.sectionHeading}>Exhibits — Documents on file</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc, i) => (
                <div key={doc.id} style={styles.docCard}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={styles.exhibitBadge}>{EXHIBIT_LETTERS[i] || '•'}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <p style={styles.docName}>{doc.filename}</p>
                          <p style={styles.docMeta}>
                            {doc.detectedTypeLabel}
                            {doc.fieldsExtracted > 0 && (
                              <span> &middot; {doc.fieldsExtracted} detail{doc.fieldsExtracted !== 1 ? 's' : ''} extracted</span>
                            )}
                          </p>
                        </div>
                        {doc.status === 'completed' && (
                          <span style={styles.docBadge}>Read</span>
                        )}
                      </div>
                      {doc.summary && (
                        <p style={styles.docSummary}>{doc.summary}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted information by section */}
        {sections.length > 0 ? (
          sections.map((section, i) => (
            <div key={section.key} style={styles.block}>
              <h2 style={styles.sectionHeading}>
                <span style={styles.sectionNumber}>{ROMAN[i] || i + 1}.</span> {section.label}
              </h2>
              <div style={styles.sectionCard}>
                <div style={styles.fieldGrid}>
                  {section.fields.map(field => {
                    let displayValue = field.value;
                    try {
                      const parsed = JSON.parse(field.value);
                      if (Array.isArray(parsed)) displayValue = parsed.join(', ');
                    } catch { /* not JSON — use as-is */ }
                    return (
                      <div key={field.key} style={styles.fieldRow}>
                        <p style={styles.fieldLabel}>{field.label}</p>
                        <p style={styles.fieldValue}>{displayValue}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={styles.block}>
            <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
              We could not find structured details in your documents yet. You can still
              start a practice session — the simulator will ask general E-2 questions.
            </p>
          </div>
        )}

        {/* CTA */}
        <div style={styles.ctaBox}>
          <div style={styles.ctaEyebrow}>Ready when you are</div>
          <p style={styles.ctaText}>
            Your practice interview will probe this file for consistency and depth —
            just as a consular officer would.
          </p>
          <button onClick={onContinue} style={styles.ctaButton}>
            {continueLabel}
          </button>
          {secondaryAction && (
            <a href={secondaryAction.href} style={styles.secondaryLink}>
              {secondaryAction.label}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STYLES — Obsidian Gold
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
    paddingTop: '64px',
    paddingBottom: '80px',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0a',
  },
  container: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '0 24px',
  },
  cover: {
    border: '1px solid rgba(201,168,76,0.25)',
    background: 'linear-gradient(180deg, rgba(201,168,76,0.05) 0%, rgba(201,168,76,0.015) 100%)',
    padding: '36px 32px',
    marginBottom: '40px',
  },
  coverTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  eyebrow: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
  },
  fileRef: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    color: 'rgba(245,240,232,0.35)',
    fontFamily: "'DM Sans', sans-serif",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '40px',
    fontWeight: 300,
    color: '#f5f0e8',
    lineHeight: 1.15,
    marginBottom: '8px',
  },
  businessLine: {
    fontSize: '14px',
    fontWeight: 400,
    color: 'rgba(201,168,76,0.85)',
    marginBottom: '24px',
  },
  classificationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '16px',
    padding: '20px 0',
    borderTop: '1px solid rgba(201,168,76,0.12)',
    borderBottom: '1px solid rgba(201,168,76,0.12)',
    marginBottom: '24px',
  },
  classificationItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  classificationLabel: {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    color: 'rgba(245,240,232,0.35)',
  },
  classificationValue: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#f5f0e8',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 300,
    color: 'rgba(245,240,232,0.6)',
    lineHeight: 1.7,
    marginBottom: '24px',
  },
  statRow: {
    display: 'flex',
    gap: '16px',
  },
  statBox: {
    padding: '16px 24px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.15)',
  },
  statNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 400,
    color: '#C9A84C',
    lineHeight: 1,
    marginBottom: '4px',
  },
  statLabel: {
    fontSize: '11px',
    color: 'rgba(245,240,232,0.4)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  block: {
    marginBottom: '36px',
  },
  sectionHeading: {
    fontSize: '11px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: 'rgba(245,240,232,0.4)',
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(201,168,76,0.12)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '15px',
    color: '#C9A84C',
    fontWeight: 500,
  },
  sectionCard: {
    border: '1px solid rgba(245,240,232,0.06)',
    background: 'rgba(255,255,255,0.012)',
  },
  fieldGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },
  fieldRow: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gap: '24px',
    padding: '14px 20px',
    borderBottom: '1px solid rgba(245,240,232,0.05)',
  },
  fieldLabel: {
    fontSize: '12px',
    color: 'rgba(245,240,232,0.4)',
    fontWeight: 400,
  },
  fieldValue: {
    fontSize: '14px',
    color: '#f5f0e8',
    fontWeight: 300,
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap' as const,
  },
  docCard: {
    padding: '16px 20px',
    border: '1px solid rgba(201,168,76,0.08)',
    background: 'rgba(201,168,76,0.012)',
  },
  exhibitBadge: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(201,168,76,0.3)',
    color: '#C9A84C',
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '15px',
    fontWeight: 500,
  },
  docName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#f5f0e8',
    marginBottom: '4px',
  },
  docMeta: {
    fontSize: '11px',
    color: 'rgba(245,240,232,0.35)',
  },
  docBadge: {
    fontSize: '10px',
    color: '#C9A84C',
    border: '1px solid rgba(201,168,76,0.25)',
    padding: '3px 8px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  docSummary: {
    marginTop: '10px',
    fontSize: '12px',
    color: 'rgba(245,240,232,0.4)',
    lineHeight: 1.6,
    fontStyle: 'italic' as const,
  },
  ctaBox: {
    marginTop: '24px',
    padding: '36px 32px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.18)',
    textAlign: 'center' as const,
  },
  ctaEyebrow: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    marginBottom: '12px',
  },
  ctaText: {
    fontSize: '13px',
    color: 'rgba(245,240,232,0.6)',
    lineHeight: 1.6,
    marginBottom: '20px',
    maxWidth: '460px',
    margin: '0 auto 20px',
  },
  ctaButton: {
    display: 'inline-block',
    padding: '16px 36px',
    background: '#C9A84C',
    color: '#0a0a0a',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: '16px',
  },
  secondaryLink: {
    display: 'block',
    fontSize: '12px',
    color: 'rgba(201,168,76,0.6)',
    textDecoration: 'underline',
  },
  linkButton: {
    color: '#C9A84C',
    fontSize: '13px',
    textDecoration: 'underline',
    fontFamily: "'DM Sans', sans-serif",
    background: 'none',
    border: 'none',
    cursor: 'pointer',
  },
};
