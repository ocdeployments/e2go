'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Documents {
  cover_letter: string;
  bp_update: string;
  template6: string;
  checklist: string;
  path: string;
  generated_at: string;
}

interface IntakeData {
  id: string;
  status: string;
  path: string | null;
  documents: Documents | null;
}

type TabKey = 'cover_letter' | 'bp_update' | 'template6' | 'checklist';

const TAB_LABELS: Record<TabKey, string> = {
  cover_letter: 'Cover Letter',
  bp_update:    'Business Plan Update',
  template6:    'Template 6',
  checklist:    'Submission Checklist',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={copy}
      style={{
        background: copied ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.08)',
        border: '1px solid rgba(201,168,76,0.25)',
        color: '#C9A84C',
        borderRadius: '5px',
        padding: '7px 14px',
        fontSize: '12px',
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        letterSpacing: '0.03em',
        transition: 'background 0.15s',
      }}
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function DownloadButton({ text, filename }: { text: string; filename: string }) {
  function download() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      style={{
        background: 'rgba(245,240,232,0.04)',
        border: '1px solid rgba(245,240,232,0.12)',
        color: 'rgba(245,240,232,0.7)',
        borderRadius: '5px',
        padding: '7px 14px',
        fontSize: '12px',
        fontFamily: "'DM Sans', sans-serif",
        cursor: 'pointer',
        letterSpacing: '0.03em',
      }}
    >
      Download .txt
    </button>
  );
}

export default function RenewalDocumentsPage() {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('cover_letter');

  const loadIntake = useCallback(async () => {
    try {
      const res = await fetch('/api/renewal/intake');
      if (!res.ok) {
        if (res.status === 401) { router.push('/login'); return; }
        if (res.status === 403) { router.push('/renewal'); return; }
        throw new Error('Failed to load intake');
      }
      const data = await res.json() as IntakeData;
      setIntake(data);

      // If still generating, poll every 3s
      if (data.status === 'generating') {
        setTimeout(() => loadIntake(), 3000);
      }
    } catch {
      setError('Failed to load your renewal documents. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadIntake(); }, [loadIntake]);

  async function handleGenerate() {
    if (!intake) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/renewal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intakeId: intake.id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? 'Generation failed');
      }
      // Refresh intake to show generated docs
      await loadIntake();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed — please try again.');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px' }}>Loading your renewal documents…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  const docs = intake?.documents;
  const isGenerating = intake?.status === 'generating' || generating;

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(245,240,232,0.06)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <Link href="/renewal/intake" style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          Back to intake
        </Link>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#C9A84C', fontSize: '16px', letterSpacing: '0.04em' }}>e2go</span>
        <Link href="/case-profile" style={{ color: 'rgba(245,240,232,0.4)', fontSize: '12px', textDecoration: 'none' }}>My case</Link>
      </nav>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '56px 40px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '10px' }}>
            Renewal Package · {intake?.path === 'uscis' ? 'Path B — USCIS I-129' : 'Path A — Toronto Consulate'}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '36px', color: '#f5f0e8', lineHeight: 1.2, marginBottom: '12px' }}>
            Your renewal documents
          </h1>
          {docs?.generated_at && (
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)' }}>
              Generated {new Date(docs.generated_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px', padding: '14px 16px', marginBottom: '24px' }}>
            <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* No docs yet — CTA to generate */}
        {!docs && !isGenerating && (
          <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', color: '#f5f0e8', marginBottom: '12px', fontWeight: 400 }}>
              Ready to generate
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.7, maxWidth: '420px', margin: '0 auto 28px' }}>
              Your intake is complete. Click below to generate your renewal document package — cover letter, business plan update, Template 6, and checklist.
            </p>
            {intake?.status !== 'complete' && (
              <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.7)', marginBottom: '20px' }}>
                Your intake isn&apos;t marked complete yet.{' '}
                <Link href="/renewal/intake" style={{ color: '#C9A84C' }}>Return to intake</Link> to finish.
              </p>
            )}
            <button
              onClick={handleGenerate}
              disabled={intake?.status !== 'complete' && intake?.status !== 'generated'}
              style={{
                background: '#C9A84C',
                color: '#0a0a0a',
                border: 'none',
                borderRadius: '6px',
                padding: '13px 28px',
                fontSize: '14px',
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                opacity: (intake?.status !== 'complete' && intake?.status !== 'generated') ? 0.5 : 1,
              }}
            >
              Generate documents
            </button>
          </div>
        )}

        {/* Generating spinner */}
        {isGenerating && (
          <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '8px', padding: '48px', textAlign: 'center' }}>
            <div style={{ width: '36px', height: '36px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', color: '#f5f0e8', marginBottom: '8px' }}>Generating your documents…</div>
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.45)' }}>This usually takes 20–40 seconds. Do not close this page.</p>
          </div>
        )}

        {/* Documents tabs */}
        {docs && !isGenerating && (
          <>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '2px', marginBottom: '28px', borderBottom: '1px solid rgba(245,240,232,0.07)', paddingBottom: '0' }}>
              {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab ? '2px solid #C9A84C' : '2px solid transparent',
                    color: activeTab === tab ? '#C9A84C' : 'rgba(245,240,232,0.45)',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    marginBottom: '-1px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Active tab content */}
            <div style={{ background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.07)', borderRadius: '8px', overflow: 'hidden' }}>
              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid rgba(245,240,232,0.06)' }}>
                <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {TAB_LABELS[activeTab]}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CopyButton text={docs[activeTab]} />
                  <DownloadButton
                    text={docs[activeTab]}
                    filename={`e2go-renewal-${activeTab.replace(/_/g, '-')}.txt`}
                  />
                </div>
              </div>

              {/* Document text */}
              <pre style={{
                margin: 0,
                padding: '28px',
                fontFamily: "'DM Sans', Georgia, sans-serif",
                fontSize: '13.5px',
                lineHeight: 1.8,
                color: 'rgba(245,240,232,0.82)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '640px',
                overflowY: 'auto',
              }}>
                {docs[activeTab] || '—'}
              </pre>
            </div>

            {/* Download all */}
            <div style={{ marginTop: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.5)', marginBottom: '4px' }}>
                  These documents are a starting point — review and personalise before submission.
                </p>
                <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.25)' }}>
                  e2go is not a law firm. For legal advice, consult a licensed immigration attorney.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating}
                style={{
                  background: 'none',
                  border: '1px solid rgba(245,240,232,0.12)',
                  color: 'rgba(245,240,232,0.45)',
                  borderRadius: '6px',
                  padding: '10px 18px',
                  fontSize: '12px',
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                }}
              >
                Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
