'use client';

import { useState, useEffect } from 'react';

interface GapFieldOption {
  value: string;
  label: string;
}

interface GapField {
  key: string;
  label: string;
  helpText?: string;
  type: 'text' | 'number' | 'select';
  options?: GapFieldOption[];
  currentValue: string;
  missing: boolean;
}

interface CaseGapsFormProps {
  applicationId: string;
  onComplete: () => void;
}

export default function CaseGapsForm({ applicationId, onComplete }: CaseGapsFormProps) {
  const [fields, setFields] = useState<GapField[] | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/simulator/case-gaps?applicationId=${applicationId}`);
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();

        if (cancelled) return;

        if (!data.hasGaps) {
          onComplete();
          return;
        }

        setFields(data.fields);
        const initial: Record<string, string> = {};
        for (const f of data.fields as GapField[]) {
          initial[f.key] = f.currentValue;
        }
        setValues(initial);
      } catch {
        if (!cancelled) setError('We could not check your case file for missing details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [applicationId, onComplete]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const missingFields = (fields || []).filter(f => f.missing);
  const confirmFields = (fields || []).filter(f => !f.missing);

  const canSubmit = missingFields.every(f => values[f.key]?.trim());

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/simulator/case-gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, values }),
      });
      if (!res.ok) throw new Error('Save failed');
      onComplete();
    } catch {
      setError('We could not save your details. Please try again.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: 'rgba(245,240,232,0.72)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>
          Checking your case file…
        </p>
      </div>
    );
  }

  if (error && !fields) {
    return (
      <div style={styles.center}>
        <div style={{ textAlign: 'center' as const }}>
          <p style={{ color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', marginBottom: '20px' }}>
            {error}
          </p>
          <button onClick={onComplete} style={styles.linkButton}>Continue anyway →</button>
        </div>
      </div>
    );
  }

  if (!fields) return null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={{ marginBottom: '32px' }}>
          <div style={styles.eyebrow}>BEFORE WE BEGIN</div>
          <h1 style={styles.title}>A few details to confirm.</h1>
          <p style={styles.subtitle}>
            Your practice interview is built from this case file — just like a
            consular officer would review your filed application. A few details
            are missing or unclear, so the questions and feedback can&rsquo;t yet
            reflect your true situation. Fill these in so the interview is accurate.
          </p>
        </div>

        {missingFields.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={styles.sectionHeading}>Needed before we start</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {missingFields.map(field => (
                <FieldInput key={field.key} field={field} value={values[field.key] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>
        )}

        {confirmFields.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={styles.sectionHeading}>Confirm or update</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {confirmFields.map(field => (
                <FieldInput key={field.key} field={field} value={values[field.key] || ''} onChange={handleChange} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: '#C9745C', fontSize: '12px', marginBottom: '16px', fontFamily: "'DM Sans', sans-serif" }}>
            {error}
          </p>
        )}

        <div style={styles.ctaBox}>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
            style={{
              ...styles.ctaButton,
              opacity: !canSubmit || saving ? 0.5 : 1,
              cursor: !canSubmit || saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Save & continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: GapField; value: string; onChange: (key: string, value: string) => void }) {
  return (
    <div>
      <label style={styles.fieldLabel}>
        {field.label}
        {field.missing && <span style={styles.requiredMark}> *</span>}
      </label>
      {field.helpText && <p style={styles.helpText}>{field.helpText}</p>}
      {field.type === 'select' ? (
        <select
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          style={styles.input}
        >
          <option value="">Select…</option>
          {field.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={e => onChange(field.key, e.target.value)}
          style={styles.input}
          placeholder={field.missing ? 'Required' : 'Optional'}
        />
      )}
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
    maxWidth: '640px',
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
    maxWidth: '560px',
  },
  sectionHeading: {
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.14em',
    color: 'rgba(245,240,232,0.70)',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '13px',
    color: 'rgba(245,240,232,0.8)',
    fontWeight: 400,
    marginBottom: '8px',
  },
  requiredMark: {
    color: '#C9A84C',
  },
  helpText: {
    fontSize: '12px',
    color: 'rgba(245,240,232,0.72)',
    marginBottom: '8px',
    lineHeight: 1.5,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(245,240,232,0.03)',
    border: '1px solid rgba(201,168,76,0.18)',
    color: '#f5f0e8',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  ctaBox: {
    marginTop: '8px',
    padding: '32px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.18)',
    textAlign: 'center' as const,
  },
  ctaButton: {
    display: 'inline-block',
    padding: '16px 36px',
    background: '#C9A84C',
    color: '#0a0a0a',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    fontFamily: "'DM Sans', sans-serif",
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
