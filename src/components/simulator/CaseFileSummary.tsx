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
    applicationType: string | null;
    tier: string | null;
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
}

export default function CaseFileSummary({ applicationId, continueLabel, onContinue, secondaryAction }: CaseFileSummaryProps) {
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

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={styles.eyebrow}>YOUR CASE FILE</div>
          <h1 style={styles.title}>
            Here&rsquo;s what we know{name ? `, ${name.split(' ')[0]}` : ''}.
          </h1>
          <p style={styles.subtitle}>
            We read your documents and pulled out the details below — this is the
            information your practice interview will draw on, and the kind of
            picture a consular officer will form of your case. Review it now so
            you walk into the interview knowing exactly what the app has on file.
          </p>

          <div style={styles.statRow}>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{documents.length}</div>
              <div style={styles.statLabel}>Document{documents.length !== 1 ? 's' : ''} processed</div>
            </div>
            <div style={styles.statBox}>
              <div style={styles.statNumber}>{totalFields}</div>
              <div style={styles.statLabel}>Detail{totalFields !== 1 ? 's' : ''} extracted</div>
            </div>
          </div>
        </div>

        {/* Documents processed */}
        {documents.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={styles.sectionHeading}>Documents processed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map(doc => (
                <div key={doc.id} style={styles.docCard}>
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
                      <span style={styles.docBadge}>✓ Read</span>
                    )}
                  </div>
                  {doc.summary && (
                    <p style={styles.docSummary}>{doc.summary}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted information by section */}
        {sections.length > 0 ? (
          sections.map(section => (
            <div key={section.key} style={{ marginBottom: '40px' }}>
              <h2 style={styles.sectionHeading}>{section.label}</h2>
              <div style={styles.fieldGrid}>
                {section.fields.map(field => (
                  <div key={field.key} style={styles.fieldRow}>
                    <p style={styles.fieldLabel}>{field.label}</p>
                    <p style={styles.fieldValue}>{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ marginBottom: '40px' }}>
            <p style={{ color: 'rgba(245,240,232,0.4)', fontSize: '13px', fontFamily: "'DM Sans', sans-serif" }}>
              We could not find structured details in your documents yet. You can still
              start a practice session — the simulator will ask general E-2 questions.
            </p>
          </div>
        )}

        {/* CTA */}
        <div style={styles.ctaBox}>
          <p style={styles.ctaText}>
            Ready to put this to the test? Your practice interview will probe these
            details for consistency and depth — just like a consular officer would.
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
    maxWidth: '720px',
    margin: '0 auto',
    padding: '0 24px',
  },
  eyebrow: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    marginBottom: '16px',
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '36px',
    fontWeight: 300,
    color: '#f5f0e8',
    lineHeight: 1.2,
    marginBottom: '16px',
  },
  subtitle: {
    fontSize: '14px',
    fontWeight: 300,
    color: 'rgba(245,240,232,0.6)',
    lineHeight: 1.7,
    maxWidth: '600px',
    marginBottom: '28px',
  },
  statRow: {
    display: 'flex',
    gap: '16px',
  },
  statBox: {
    padding: '16px 24px',
    background: 'rgba(201,168,76,0.03)',
    border: '1px solid rgba(201,168,76,0.12)',
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
  sectionHeading: {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: 'rgba(245,240,232,0.35)',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
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
    padding: '14px 0',
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
    background: 'rgba(201,168,76,0.01)',
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
    padding: '32px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.18)',
    textAlign: 'center' as const,
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
