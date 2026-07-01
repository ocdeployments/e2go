'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

interface P2Answers {
  'P2-NAME'?:        string;
  'P2-NATIONALITY'?: string;
  'P2-SHARES'?:      string;
  'P2-INVEST'?:      string;
  'P2-ROLE'?:        string;
  'P2-SOF'?:         string;
  'P2-QUALS'?:       string;
  'P2-INTENT'?:      string;
}

const QUESTIONS: Array<{
  key: keyof P2Answers;
  label: string;
  placeholder: string;
  type: 'text' | 'textarea' | 'number';
  helper?: string;
}> = [
  {
    key: 'P2-NAME',
    label: 'Investor 2 — Full legal name',
    placeholder: 'Full name exactly as it appears on passport',
    type: 'text',
    helper: 'Must match the passport used for the visa application.',
  },
  {
    key: 'P2-NATIONALITY',
    label: 'Nationality / Treaty country',
    placeholder: 'e.g. Canadian',
    type: 'text',
    helper: 'Investor 2 must be a citizen of a country with an E-2 treaty with the United States.',
  },
  {
    key: 'P2-SHARES',
    label: 'Ownership percentage',
    placeholder: 'e.g. 50',
    type: 'text',
    helper: 'Both investors must together own at least 50% of the enterprise. Example: 50% + 50%, or 51% + 49%.',
  },
  {
    key: 'P2-INVEST',
    label: 'Investor 2 personal investment (USD)',
    placeholder: 'e.g. 150000',
    type: 'text',
    helper: 'Amount personally committed by Investor 2 from their own funds. Must be at-risk in the enterprise.',
  },
  {
    key: 'P2-ROLE',
    label: 'Day-to-day management role',
    placeholder: 'Describe Investor 2\'s specific duties, decisions they control, hours per week, title…',
    type: 'textarea',
    helper: 'Both investors must have a develop-and-direct role. Describe concretely — what does Investor 2 do each week?',
  },
  {
    key: 'P2-SOF',
    label: 'Source of investment funds',
    placeholder: 'Describe how Investor 2 accumulated the funds invested…',
    type: 'textarea',
    helper: 'Explain the origin of the funds — savings from employment, business sale, inheritance, gift, etc. Include approximate timeline.',
  },
  {
    key: 'P2-QUALS',
    label: 'Professional background and qualifications',
    placeholder: 'Summarise Investor 2\'s work history, education, industry experience relevant to this business…',
    type: 'textarea',
    helper: 'Consulate officers assess whether the investor has the expertise to direct the business.',
  },
  {
    key: 'P2-INTENT',
    label: 'Home country ties / non-immigrant intent',
    placeholder: 'Describe Investor 2\'s ties to Canada — property, family, accounts, professional licences, other assets…',
    type: 'textarea',
    helper: 'Evidence that Investor 2 intends to return to Canada when the E-2 status ends.',
  },
];

function Partner2IntakeForm({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<P2Answers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/partner2/intake?applicationId=${applicationId}`);
        if (res.status === 401) { router.push('/login'); return; }
        if (res.status === 403) { router.push('/pricing'); return; }
        if (res.ok) {
          const data = await res.json() as { answers: P2Answers };
          setAnswers(data.answers ?? {});
        }
      } catch {
        setError('Failed to load. Please refresh.');
      } finally {
        setLoading(false);
      }
    })();
  }, [applicationId, router]);

  const saveAnswers = useCallback(async (updates: Partial<P2Answers>) => {
    setSaving(true);
    try {
      await fetch('/api/partner2/intake', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, answers: updates }),
      });
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }, [applicationId]);

  function handleChange(key: keyof P2Answers, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveAnswers({ [key]: value });
    }, 800);
  }

  const answeredCount = QUESTIONS.filter(q => (answers[q.key] ?? '').trim().length > 0).length;
  const isComplete = answeredCount === QUESTIONS.length;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: '28px', height: '28px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: '48px' }}>
        <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '10px' }}>
          Partnership Application · Investor 2 Intake
        </div>
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '36px', color: '#f5f0e8', lineHeight: 1.2, marginBottom: '12px' }}>
          Partner 2 information
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, maxWidth: '560px' }}>
          Each investor requires their own E-2 documents. Provide Investor 2&apos;s details below — the generation engine will build a separate document package for them.
        </p>
      </div>

      {error && (
        <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', padding: '12px 16px', marginBottom: '24px' }}>
          <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {QUESTIONS.map((q) => (
          <div key={q.key}>
            <label style={{ display: 'block', fontSize: '13px', color: 'rgba(245,240,232,0.8)', marginBottom: '6px', fontWeight: 500 }}>
              {q.label}
            </label>
            {q.helper && (
              <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)', marginBottom: '8px', lineHeight: 1.5 }}>{q.helper}</p>
            )}
            {q.type === 'textarea' ? (
              <textarea
                value={answers[q.key] ?? ''}
                onChange={e => handleChange(q.key, e.target.value)}
                placeholder={q.placeholder}
                rows={4}
                style={{
                  width: '100%',
                  background: 'rgba(245,240,232,0.03)',
                  border: `1px solid ${(answers[q.key] ?? '').trim() ? 'rgba(201,168,76,0.3)' : 'rgba(245,240,232,0.1)'}`,
                  borderRadius: '6px',
                  padding: '12px 14px',
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.6,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <input
                type="text"
                value={answers[q.key] ?? ''}
                onChange={e => handleChange(q.key, e.target.value)}
                placeholder={q.placeholder}
                style={{
                  width: '100%',
                  background: 'rgba(245,240,232,0.03)',
                  border: `1px solid ${(answers[q.key] ?? '').trim() ? 'rgba(201,168,76,0.3)' : 'rgba(245,240,232,0.1)'}`,
                  borderRadius: '6px',
                  padding: '12px 14px',
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(245,240,232,0.06)', paddingTop: '32px', marginTop: '48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>
          {saving ? 'Saving…' : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : `${answeredCount} / ${QUESTIONS.length} answered`}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href="/case-profile"
            style={{ fontSize: '13px', color: 'rgba(245,240,232,0.45)', textDecoration: 'none' }}
          >
            Back to case
          </Link>
          <button
            disabled={!isComplete}
            style={{
              background: isComplete ? '#C9A84C' : 'rgba(201,168,76,0.3)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: isComplete ? 'pointer' : 'not-allowed',
              letterSpacing: '0.01em',
            }}
            onClick={() => {
              if (isComplete) router.push('/case-profile');
            }}
          >
            {isComplete ? 'Save & return to case' : `Complete all ${QUESTIONS.length} fields to continue`}
          </button>
        </div>
      </div>
    </>
  );
}

function Partner2PageInner() {
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');

  if (!applicationId) {
    return (
      <div style={{ padding: '80px 40px', textAlign: 'center', color: 'rgba(245,240,232,0.5)', fontSize: '14px' }}>
        No application ID provided.{' '}
        <Link href="/case-profile" style={{ color: '#C9A84C' }}>Return to case</Link>
      </div>
    );
  }

  return <Partner2IntakeForm applicationId={applicationId} />;
}

export default function Partner2Page() {
  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(245,240,232,0.06)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <Link href="/case-profile" style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          My case
        </Link>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#C9A84C', fontSize: '16px', letterSpacing: '0.04em' }}>e2go</span>
        <div style={{ width: '80px' }} />
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 40px 80px' }}>
        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{ width: '28px', height: '28px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          </div>
        }>
          <Partner2PageInner />
        </Suspense>
      </div>
    </main>
  );
}
