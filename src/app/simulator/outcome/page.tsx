'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const OUTCOME_OPTIONS = [
  { value: 'approved', label: 'Approved', desc: 'Visa approved at interview', color: '#22c55e' },
  { value: 'denied', label: 'Denied', desc: 'Visa denied at interview', color: '#ef4444' },
  { value: 'pending', label: 'Administrative Processing', desc: 'Case placed in administrative processing (221g)', color: '#f59e0b' },
  { value: 'rescheduled', label: 'Rescheduled', desc: 'Interview postponed or rescheduled', color: 'rgba(201,168,76,0.7)' },
  { value: 'cancelled', label: 'Cancelled', desc: 'Interview cancelled before it happened', color: 'rgba(245,240,232,0.4)' },
];

const DENIAL_REASONS = [
  'Investment amount — not considered substantial',
  'Source of funds — documentation insufficient',
  'Non-marginality — business not likely to generate more than living wage',
  'Management control — role not clearly supervisory/executive',
  'Treaty nationality — question about qualifying citizenship',
  'At-risk capital — funds not fully committed',
  'Prior visa issues',
  'Other / reason not stated',
];

export default function OutcomePage() {
  const router = useRouter();
  const [outcome, setOutcome] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [consulate, setConsulate] = useState('');
  const [denialReason, setDenialReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/simulator/outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          interviewDate: interviewDate || undefined,
          consulate: consulate || undefined,
          denialReason: outcome === 'denied' ? denialReason || undefined : undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  const selectedOutcome = OUTCOME_OPTIONS.find(o => o.value === outcome);

  if (saved) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', color: selectedOutcome?.color || '#C9A84C', marginBottom: '16px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300 }}>
            {outcome === 'approved' ? 'Congratulations.' : 'Thank you for sharing your outcome.'}
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.5)', lineHeight: 1.7, marginBottom: '32px' }}>
            {outcome === 'approved'
              ? 'Your E-2 visa was approved. Your outcome has been recorded — this helps us improve preparation guidance for future applicants.'
              : outcome === 'denied'
              ? 'A denial is not the end. Many E-2 applications succeed on a second attempt with a stronger case file. Your outcome has been recorded.'
              : 'Your outcome has been recorded. We\'ll be here when you\'re ready to continue.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '12px 24px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C', fontSize: '13px', cursor: 'pointer' }}>
              Dashboard
            </button>
            {outcome === 'denied' && (
              <button onClick={() => router.push('/gap-analysis')} style={{ padding: '12px 24px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', color: '#C9A84C', fontSize: '13px', cursor: 'pointer' }}>
                Review gap analysis →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '60px 24px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', marginBottom: '12px' }}>Interview outcome</div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '32px', fontWeight: 300, color: '#f5f0e8', marginBottom: '8px' }}>
          How did your interview go?
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.4)', lineHeight: 1.6, marginBottom: '40px' }}>
          Recording your outcome helps track preparation effectiveness. This takes about 2 minutes.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Outcome selection */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)', marginBottom: '12px', textTransform: 'uppercase' }}>What was the result?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {OUTCOME_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setOutcome(opt.value)}
                  style={{
                    padding: '14px 18px',
                    border: `1px solid ${outcome === opt.value ? opt.color : 'rgba(245,240,232,0.08)'}`,
                    background: outcome === opt.value ? `${opt.color}0a` : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: outcome === opt.value ? opt.color : 'rgba(245,240,232,0.15)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: outcome === opt.value ? opt.color : 'rgba(245,240,232,0.7)' }}>{opt.label}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.35)' }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {outcome && (
            <>
              {/* Interview date */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>Interview date (optional)</label>
                <input
                  type="date"
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(201,168,76,0.02)', border: '1px solid rgba(201,168,76,0.15)', color: '#f5f0e8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Consulate */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>Consulate location (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. US Consulate Toronto, US Embassy Ottawa"
                  value={consulate}
                  onChange={e => setConsulate(e.target.value)}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(201,168,76,0.02)', border: '1px solid rgba(201,168,76,0.15)', color: '#f5f0e8', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </div>

              {/* Denial reason — only when denied */}
              {outcome === 'denied' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>Primary reason for denial (if stated)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {DENIAL_REASONS.map(reason => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setDenialReason(reason)}
                        style={{
                          padding: '10px 14px',
                          border: `1px solid ${denialReason === reason ? 'rgba(239,68,68,0.4)' : 'rgba(245,240,232,0.06)'}`,
                          background: denialReason === reason ? 'rgba(239,68,68,0.06)' : 'transparent',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: '12px',
                          color: denialReason === reason ? 'rgba(252,165,165,0.9)' : 'rgba(245,240,232,0.5)',
                        }}
                      >{reason}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '32px' }}>
                <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.1em', color: 'rgba(245,240,232,0.4)', marginBottom: '8px', textTransform: 'uppercase' }}>Additional notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="What surprised you? What questions were asked? What would you do differently?"
                  rows={4}
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(201,168,76,0.02)', border: '1px solid rgba(201,168,76,0.15)', color: '#f5f0e8', fontSize: '13px', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {error && (
                <div style={{ padding: '12px 16px', border: '1px solid rgba(239,68,68,0.3)', color: 'rgba(252,165,165,0.9)', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
              )}

              <button
                type="submit"
                disabled={saving}
                style={{
                  width: '100%', padding: '14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)',
                  color: '#C9A84C', fontSize: '13px', letterSpacing: '0.06em', cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Save outcome'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
