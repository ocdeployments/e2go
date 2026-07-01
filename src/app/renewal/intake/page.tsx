'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface RenewalIntake {
  id: string;
  path: string | null;
  answers: Record<string, string>;
  status: string;
  application_id: string | null;
}

interface ProjectionRow {
  year: number;
  revenue: string;
  netIncome: string;
  employees: string;
}

export const dynamic = 'force-dynamic';

const PATH_QUESTIONS: Array<{
  key: string;
  label: string;
  helperText?: string;
  type: 'text' | 'textarea' | 'single';
  options?: { value: string; label: string }[];
  pathOnly?: 'toronto' | 'uscis';
}> = [
  // Group R1 — Business Performance (all paths)
  { key: 'RQ-01-Y1', type: 'text', label: 'Actual revenue — Year 1 (USD)', helperText: 'Enter your actual revenue for the first 12 months of operation.' },
  { key: 'RQ-01-Y2', type: 'text', label: 'Actual revenue — Year 2 (USD)' },
  { key: 'RQ-01-Y3', type: 'text', label: 'Actual revenue — Year 3 (USD)', helperText: 'Enter 0 or leave blank if you have not yet completed Year 3.' },
  { key: 'RQ-01-NI-Y1', type: 'text', label: 'Net income — Year 1 (USD)', helperText: 'After all operating expenses, before personal draws.' },
  { key: 'RQ-01-NI-Y2', type: 'text', label: 'Net income — Year 2 (USD)' },
  { key: 'RQ-01-NI-Y3', type: 'text', label: 'Net income — Year 3 (USD)' },
  { key: 'RQ-02', type: 'text', label: 'Current full-time U.S. employees (headcount)', helperText: 'Count only W-2 employees, not contractors or owners.' },
  { key: 'RQ-03', type: 'text', label: 'Current part-time U.S. employees (headcount)' },
  { key: 'RQ-04', type: 'textarea', label: 'Describe how the business has grown or changed since your original E-2 application', helperText: 'Include new products/services, location changes, equipment, client base growth, or strategic pivots.' },
  { key: 'RQ-05', type: 'textarea', label: 'Has the business experienced significant challenges since your original application, and how were they addressed?', helperText: 'If none, write "No significant challenges. Business has operated within expected parameters."' },
  { key: 'RQ-06', type: 'text', label: 'Additional investment made in the business since your original application (USD)', helperText: 'Include equipment, leasehold improvements, additional working capital, or inventory.' },
  { key: 'RQ-07', type: 'single', label: 'Is the business currently profitable?', options: [
    { value: 'yes', label: 'Yes — consistently profitable' },
    { value: 'yes-recently', label: 'Yes — reached profitability recently' },
    { value: 'breakeven', label: 'Breaking even' },
    { value: 'not-yet', label: 'Not yet — still in growth phase' },
    { value: 'loss', label: 'Operating at a loss' },
  ]},
  { key: 'RQ-08', type: 'single', label: 'Have there been any changes to the ownership structure since your original application?', options: [
    { value: 'no', label: 'No — ownership is unchanged' },
    { value: 'yes-added', label: 'Yes — added a partner or co-investor' },
    { value: 'yes-removed', label: 'Yes — a partner exited' },
    { value: 'yes-pct', label: 'Yes — ownership percentage changed' },
  ]},
  { key: 'RQ-08-detail', type: 'textarea', label: 'Describe the ownership change', helperText: 'Include who was added/removed and the resulting ownership percentages.' },
  { key: 'RQ-09', type: 'textarea', label: 'Describe your current role in the business', helperText: 'Do not write "same as before" — describe your current day-to-day management activities. Officers, hiring decisions, vendor relationships, strategy.' },
  { key: 'RQ-10', type: 'single', label: 'Have you met, exceeded, or fallen short of your original hiring plan?', options: [
    { value: 'exceeded', label: 'Exceeded — hired more than projected' },
    { value: 'met', label: 'Met — hired roughly as projected' },
    { value: 'short', label: 'Short — hired fewer than projected' },
    { value: 'na', label: 'N/A — hiring not projected in original plan' },
  ]},

  // Group R2 — Personal Information (all paths)
  { key: 'RQ-11', type: 'single', label: 'Has your passport changed since your original application?', options: [
    { value: 'no', label: 'No — same passport' },
    { value: 'yes-renewed', label: 'Yes — renewed (same nationality)' },
    { value: 'yes-new', label: 'Yes — new passport (different number)' },
  ]},
  { key: 'RQ-12', type: 'textarea', label: 'Have there been any changes to your family composition?', helperText: 'New dependants, children aging out of status, spouse changes. Write "No changes" if unchanged.' },
  { key: 'RQ-13', type: 'textarea', label: 'Describe your current Canadian ties', helperText: 'Property owned, bank accounts, family members remaining in Canada, professional memberships, tax residency. Be specific.' },
  { key: 'RQ-14', type: 'single', label: 'Have you maintained Canadian bank accounts?', options: [
    { value: 'yes-active', label: 'Yes — actively used' },
    { value: 'yes-dormant', label: 'Yes — open but dormant' },
    { value: 'no', label: 'No — closed all Canadian accounts' },
  ]},
  { key: 'RQ-15', type: 'single', label: 'Have you had any U.S. immigration issues since your original E-2 was granted?', options: [
    { value: 'no', label: 'No immigration issues' },
    { value: 'yes-status', label: 'Yes — status gap or overstay' },
    { value: 'yes-other', label: 'Yes — other issue (explain below)' },
  ]},
  { key: 'RQ-15-detail', type: 'textarea', label: 'Describe the immigration issue and how it was resolved' },

  // Path B specific
  { key: 'RQ-B01', type: 'single', pathOnly: 'uscis', label: 'Are you currently in valid E-2 status?', options: [
    { value: 'yes', label: 'Yes — I-94 is current and valid' },
    { value: 'no', label: 'No — my status has lapsed' },
  ]},
  { key: 'RQ-B02', type: 'single', pathOnly: 'uscis', label: 'Do you have any international travel planned before USCIS adjudicates your I-129?', options: [
    { value: 'no', label: 'No international travel planned' },
    { value: 'yes', label: 'Yes — international travel planned (may require Advance Parole)' },
  ]},
  { key: 'RQ-B03', type: 'single', pathOnly: 'uscis', label: 'Is your business address the same as when your original E-2 was granted?', options: [
    { value: 'yes', label: 'Yes — same address' },
    { value: 'no', label: 'No — address has changed' },
  ]},
];

// Questions that only show conditionally
const CONDITIONAL_SHOW: Record<string, { key: string; values: string[] }> = {
  'RQ-08-detail': { key: 'RQ-08', values: ['yes-added', 'yes-removed', 'yes-pct'] },
  'RQ-15-detail': { key: 'RQ-15', values: ['yes-status', 'yes-other'] },
};

export default function RenewalIntakePage() {
  const [intake, setIntake] = useState<RenewalIntake | null>(null);
  const [projections, setProjections] = useState<ProjectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load intake + baseline projections from original application
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/renewal/intake');
        if (res.status === 403) {
          setError('Renewal not purchased. Please purchase the renewal package to continue.');
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error('Failed to load');
        const { intake: loaded } = await res.json();
        setIntake(loaded);

        // Pull baseline projections from original application
        if (loaded.application_id) {
          try {
            const ansRes = await fetch(`/api/renewal/baseline?applicationId=${loaded.application_id}`);
            if (ansRes.ok) {
              const { projections: baseProj } = await ansRes.json();
              if (Array.isArray(baseProj) && baseProj.length > 0) {
                setProjections(baseProj);
              }
            }
          } catch { /* baseline is optional */ }
        }
      } catch {
        setError('Failed to load your renewal file. Please refresh.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveChanges = useCallback(async (updates: Partial<RenewalIntake>) => {
    if (!intake) return;
    setSaving(true);
    try {
      await fetch('/api/renewal/intake', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intakeId: intake.id,
          ...updates,
        }),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [intake]);

  function setAnswer(key: string, value: string) {
    if (!intake) return;
    const updated = { ...intake, answers: { ...intake.answers, [key]: value } };
    setIntake(updated);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveChanges({ answers: { [key]: value } });
    }, 800);
  }

  function setPath(path: string) {
    if (!intake) return;
    const updated = { ...intake, path };
    setIntake(updated);
    saveChanges({ path });
  }

  const shouldShow = (key: string): boolean => {
    const cond = CONDITIONAL_SHOW[key];
    if (!cond || !intake) return true;
    return cond.values.includes(intake.answers[cond.key] ?? '');
  };

  const filteredQuestions = PATH_QUESTIONS.filter(q => {
    if (q.pathOnly && intake?.path !== q.pathOnly) return false;
    if (!shouldShow(q.key)) return false;
    return true;
  });

  const answeredCount = filteredQuestions.filter(q => {
    const v = intake?.answers[q.key];
    return v && v.trim().length > 0;
  }).length;

  if (loading) {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px' }}>Loading your renewal file…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (error || !intake) {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '40px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px' }}>
          <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>{error || 'Something went wrong.'}</p>
          <Link href="/renewal" style={{ color: '#C9A84C', fontSize: '13px' }}>← Back to renewal</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea, input[type="text"] {
          width: 100%;
          background: rgba(245,240,232,0.04);
          border: 1px solid rgba(245,240,232,0.1);
          border-radius: 6px;
          color: #f5f0e8;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          padding: 10px 14px;
          outline: none;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        textarea:focus, input[type="text"]:focus {
          border-color: rgba(201,168,76,0.5);
        }
        textarea::placeholder, input[type="text"]::placeholder {
          color: rgba(245,240,232,0.25);
        }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(245,240,232,0.06)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', zIndex: 50 }}>
        <Link href="/case-profile" style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          My case
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {saving && <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>Saving…</span>}
          {!saving && savedAt && <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>Saved</span>}
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#C9A84C', fontSize: '16px', letterSpacing: '0.04em' }}>e2go</span>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '60px 40px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '34px', color: '#f5f0e8', margin: 0 }}>
              Renewal Intake
            </h1>
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)', background: 'rgba(245,240,232,0.04)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '4px', padding: '3px 10px' }}>
              {answeredCount} / {filteredQuestions.length} answered
            </span>
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', margin: 0 }}>
            Your answers auto-save as you type. Take your time — you can return to this page anytime.
          </p>
        </div>

        {/* Path selection */}
        <section style={{ marginBottom: '48px', padding: '28px', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: '20px', color: '#f5f0e8', marginBottom: '6px' }}>
            Which renewal path are you taking?
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.5)', marginBottom: '20px', lineHeight: 1.6 }}>
            This determines which documents are generated. You can change this at any time.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { value: 'toronto', label: 'Path A — Toronto Consulate', sub: '5-year stamp · requires travel · interview required' },
              { value: 'uscis', label: 'Path B — USCIS I-129', sub: '2-year extension · no travel · filed by mail' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPath(opt.value)}
                style={{
                  background: intake.path === opt.value ? 'rgba(201,168,76,0.12)' : 'rgba(245,240,232,0.03)',
                  border: `1px solid ${intake.path === opt.value ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.08)'}`,
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: '14px', color: intake.path === opt.value ? '#C9A84C' : '#f5f0e8', fontWeight: 500, marginBottom: '4px' }}>{opt.label}</div>
                <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.45)' }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Baseline table (only if projections exist) */}
        {projections.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, fontSize: '20px', color: '#f5f0e8', marginBottom: '4px' }}>
              Template 6 — Performance baseline
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.5)', marginBottom: '20px' }}>
              Original projections from your application (read-only). Enter your actual figures in the questions below.
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(245,240,232,0.1)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', color: 'rgba(245,240,232,0.4)', fontWeight: 400 }}>Year</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'rgba(245,240,232,0.4)', fontWeight: 400 }}>Projected revenue</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'rgba(245,240,232,0.4)', fontWeight: 400 }}>Projected net income</th>
                    <th style={{ textAlign: 'right', padding: '8px 0 8px 12px', color: 'rgba(245,240,232,0.4)', fontWeight: 400 }}>Projected employees</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map(row => (
                    <tr key={row.year} style={{ borderBottom: '1px solid rgba(245,240,232,0.05)' }}>
                      <td style={{ padding: '10px 12px 10px 0', color: '#f5f0e8' }}>Year {row.year}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(245,240,232,0.7)', textAlign: 'right' }}>{row.revenue ? `$${row.revenue}` : '—'}</td>
                      <td style={{ padding: '10px 12px', color: 'rgba(245,240,232,0.7)', textAlign: 'right' }}>{row.netIncome ? `$${row.netIncome}` : '—'}</td>
                      <td style={{ padding: '10px 0 10px 12px', color: 'rgba(245,240,232,0.7)', textAlign: 'right' }}>{row.employees || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
          {filteredQuestions.map((q, idx) => (
            <div key={q.key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '14px', color: '#f5f0e8', fontWeight: 500, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'rgba(245,240,232,0.25)', fontSize: '12px', minWidth: '20px', paddingTop: '2px' }}>{idx + 1}</span>
                <span>{q.label}</span>
              </label>
              {q.helperText && (
                <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', marginLeft: '28px', marginTop: '-2px', lineHeight: 1.6 }}>{q.helperText}</p>
              )}

              {q.type === 'single' && q.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '28px' }}>
                  {q.options.map(opt => {
                    const selected = intake.answers[q.key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setAnswer(q.key, opt.value)}
                        style={{
                          background: selected ? 'rgba(201,168,76,0.1)' : 'rgba(245,240,232,0.03)',
                          border: `1px solid ${selected ? 'rgba(201,168,76,0.45)' : 'rgba(245,240,232,0.08)'}`,
                          borderRadius: '6px',
                          padding: '10px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: selected ? '#C9A84C' : 'rgba(245,240,232,0.75)',
                          fontSize: '13px',
                          fontFamily: "'DM Sans', sans-serif",
                          transition: 'all 0.12s',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {q.type === 'text' && (
                <div style={{ marginLeft: '28px' }}>
                  <input
                    type="text"
                    value={intake.answers[q.key] ?? ''}
                    onChange={e => setAnswer(q.key, e.target.value)}
                    placeholder="Enter your answer"
                  />
                </div>
              )}

              {q.type === 'textarea' && (
                <div style={{ marginLeft: '28px' }}>
                  <textarea
                    rows={4}
                    value={intake.answers[q.key] ?? ''}
                    onChange={e => setAnswer(q.key, e.target.value)}
                    placeholder="Enter your answer"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ borderTop: '1px solid rgba(245,240,232,0.06)', paddingTop: '40px', marginTop: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.4)' }}>
            {answeredCount} of {filteredQuestions.length} questions answered
            {!intake.path && <span style={{ color: '#f59e0b', marginLeft: '12px' }}>⚠ Select a renewal path above</span>}
          </p>
          <button
            onClick={() => saveChanges({ status: 'complete' })}
            disabled={!intake.path || answeredCount < filteredQuestions.length * 0.7}
            style={{
              background: (!intake.path || answeredCount < filteredQuestions.length * 0.7) ? 'rgba(201,168,76,0.3)' : '#C9A84C',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: (!intake.path || answeredCount < filteredQuestions.length * 0.7) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Mark complete
          </button>
        </div>
      </div>
    </main>
  );
}
