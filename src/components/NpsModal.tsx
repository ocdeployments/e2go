'use client';

import { useState } from 'react';

interface NpsModalProps {
  triggerEvent?: string;
  onClose: () => void;
}

const COOLDOWN_KEY = 'nps_last_shown';
const COOLDOWN_MS  = 7 * 24 * 3600 * 1000;

export function shouldShowNps(): boolean {
  try {
    const last = localStorage.getItem(COOLDOWN_KEY);
    if (!last) return true;
    return Date.now() - parseInt(last, 10) > COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markNpsShown(): void {
  try {
    localStorage.setItem(COOLDOWN_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

export default function NpsModal({ triggerEvent = 'post_download', onClose }: NpsModalProps) {
  const [score, setScore]       = useState<number | null>(null);
  const [comment, setComment]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit() {
    if (score === null) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment.trim() || undefined, trigger_event: triggerEvent }),
      });
      if (res.ok) {
        markNpsShown();
        setSubmitted(true);
        setTimeout(onClose, 1800);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === 'already_submitted') {
          markNpsShown();
          onClose();
        } else {
          setError('Something went wrong. Please try again.');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDismiss() {
    markNpsShown();
    onClose();
  }

  const LABELS: Record<number, string> = {
    0: 'Not at all likely', 1: '', 2: '', 3: '', 4: '', 5: '', 6: '',
    7: 'Somewhat likely', 8: '', 9: '', 10: 'Extremely likely',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
    >
      <div
        className="w-full sm:max-w-md mx-4 mb-4 sm:mb-0"
        style={{
          background: '#111',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: 0,
          padding: '28px 24px',
        }}
      >
        {submitted ? (
          <div className="text-center py-4">
            <p style={{ color: '#C9A84C', fontSize: '18px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Thank you for your feedback.
            </p>
            <p className="text-sm mt-2" style={{ color: 'rgba(245,240,232,0.76)' }}>
              We read every response.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#C9A84C' }}>
                  Quick question
                </p>
                <p style={{ color: '#f5f0e8', fontSize: '15px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, lineHeight: 1.5 }}>
                  How likely are you to recommend E2go to a friend or colleague?
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="ml-4 text-xs"
                style={{ color: 'rgba(245,240,232,0.68)', flexShrink: 0, marginTop: 2 }}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Score buttons */}
            <div className="grid grid-cols-11 gap-1 mb-3">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setScore(i)}
                  className="py-2 text-xs font-medium transition-colors"
                  style={{
                    background: score === i ? '#C9A84C' : 'rgba(201,168,76,0.06)',
                    border: `1px solid ${score === i ? '#C9A84C' : 'rgba(201,168,76,0.15)'}`,
                    color: score === i ? '#0a0a0a' : 'rgba(245,240,232,0.7)',
                    borderRadius: 0,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="flex justify-between mb-5">
              <span className="text-xs" style={{ color: 'rgba(245,240,232,0.70)' }}>Not likely</span>
              <span className="text-xs" style={{ color: 'rgba(245,240,232,0.70)' }}>Extremely likely</span>
            </div>

            {score !== null && (
              <>
                <p className="text-xs mb-2" style={{ color: 'rgba(245,240,232,0.76)' }}>
                  {LABELS[score] || 'What could we do better?'} (optional)
                </p>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any feedback for us..."
                  rows={2}
                  className="w-full text-sm resize-none bg-transparent mb-4"
                  style={{
                    border: '1px solid rgba(201,168,76,0.2)',
                    padding: '8px 10px',
                    color: '#f5f0e8',
                    outline: 'none',
                    borderRadius: 0,
                  }}
                />
              </>
            )}

            {error && (
              <p className="text-xs mb-3" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={score === null || submitting}
                className="flex-1 py-2 text-sm font-medium transition-colors"
                style={{
                  background: score !== null ? '#C9A84C' : 'rgba(201,168,76,0.15)',
                  color: score !== null ? '#0a0a0a' : 'rgba(245,240,232,0.68)',
                  borderRadius: 0,
                  cursor: score !== null ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 text-xs"
                style={{ color: 'rgba(245,240,232,0.72)', border: '1px solid rgba(201,168,76,0.12)', borderRadius: 0 }}
              >
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
