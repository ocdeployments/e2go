'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';

type DeleteStep = 'idle' | 'confirm1' | 'confirm2' | 'deleting' | 'done' | 'error';

export default function SettingsPage() {
  const router = useRouter();
  const [deleteStep, setDeleteStep] = useState<DeleteStep>('idle');
  const [confirmText, setConfirmText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const CONFIRM_PHRASE = 'delete my account';
  const confirmMatch = confirmText.trim().toLowerCase() === CONFIRM_PHRASE;

  async function handleDelete() {
    setDeleteStep('deleting');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Deletion failed. Please contact support@e2go.app.');
      }
      setDeleteStep('done');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
      setDeleteStep('error');
    }
  }

  // Post-deletion state — session is gone, show confirmation and redirect option
  if (deleteStep === 'done') {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '40px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '28px', color: '#f5f0e8', marginBottom: '12px' }}>
            Account deleted
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.7, marginBottom: '32px' }}>
            Your account and all associated data have been permanently deleted.
            A confirmation has been sent to your email address.
          </p>
          <button
            onClick={() => router.push('/')}
            style={{ padding: '12px 32px', background: '#C9A84C', color: '#0a0a0a', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Return to homepage
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 pb-16 px-4 min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-3xl mx-auto">
        <Breadcrumb items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]} />

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '36px', color: '#f5f0e8', marginBottom: '8px' }}>
          Account Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.72)', marginBottom: '48px' }}>
          Manage your account preferences and data.
        </p>

        {/* Account info section */}
        <section style={{ padding: '28px', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.02)', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '20px', color: '#f5f0e8', marginBottom: '16px' }}>
            Account
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.7 }}>
            To update your email address or password, please contact{' '}
            <a href="mailto:support@e2go.app" style={{ color: '#C9A84C', textDecoration: 'none' }}>support@e2go.app</a>.
          </p>
        </section>

        {/* Data export section — PIPEDA / GDPR right to portability */}
        <section style={{ padding: '28px', border: '1px solid rgba(201,168,76,0.12)', background: 'rgba(201,168,76,0.02)', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '20px', color: '#f5f0e8', marginBottom: '8px' }}>
            Download your data
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.7, marginBottom: '20px' }}>
            Download a copy of all personal data e2go holds about you — quiz results, case file answers,
            simulator sessions, consent records, and payment history. Provided as a JSON file.
          </p>
          <a
            href="/api/account/export"
            download
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              background: 'transparent',
              border: '1px solid rgba(201,168,76,0.35)',
              color: 'rgba(201,168,76,0.8)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: 'none',
            }}
          >
            Export my data
          </a>
        </section>

        {/* Data & privacy section */}
        <section style={{ padding: '28px', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.02)' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '20px', color: '#f5f0e8', marginBottom: '8px' }}>
            Delete account and all data
          </h2>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.7, marginBottom: '20px' }}>
            Permanently deletes your account and all associated data — quiz results, case file answers,
            uploaded documents, simulator sessions, and generated documents. This cannot be undone.
            You will receive a confirmation email listing what was deleted.
          </p>

          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)', marginBottom: '20px', lineHeight: 1.7 }}>
            Data deleted includes: quiz sessions · case file answers · uploaded documents ·
            simulator sessions · case profile · generated documents · payment records
          </div>

          {deleteStep === 'idle' && (
            <button
              onClick={() => setDeleteStep('confirm1')}
              style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'rgba(239,68,68,0.7)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Delete my account
            </button>
          )}

          {deleteStep === 'confirm1' && (
            <div style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.03)' }}>
              <p style={{ fontSize: '14px', color: '#f5f0e8', marginBottom: '16px', lineHeight: 1.6 }}>
                Are you sure? This will permanently delete all your data and cannot be reversed.
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setDeleteStep('confirm2')}
                  style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: 'rgba(239,68,68,0.8)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Yes, I understand — continue
                </button>
                <button
                  onClick={() => setDeleteStep('idle')}
                  style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(245,240,232,0.12)', color: 'rgba(245,240,232,0.74)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'confirm2' && (
            <div style={{ padding: '24px', border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.04)' }}>
              <p style={{ fontSize: '14px', color: '#f5f0e8', marginBottom: '8px' }}>
                Type <strong style={{ color: 'rgba(239,68,68,0.8)' }}>delete my account</strong> to confirm:
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="delete my account"
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'rgba(10,10,10,0.8)',
                  border: `1px solid ${confirmMatch ? 'rgba(239,68,68,0.5)' : 'rgba(245,240,232,0.12)'}`,
                  color: '#f5f0e8',
                  fontSize: '14px',
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: '16px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleDelete}
                  disabled={!confirmMatch}
                  style={{
                    padding: '10px 24px',
                    background: confirmMatch ? '#ef4444' : 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: confirmMatch ? '#fff' : 'rgba(239,68,68,0.35)',
                    fontSize: '13px',
                    cursor: confirmMatch ? 'pointer' : 'not-allowed',
                    fontFamily: "'DM Sans', sans-serif",
                    fontWeight: confirmMatch ? 500 : 400,
                    transition: 'all 0.15s ease',
                  }}
                >
                  Permanently delete everything
                </button>
                <button
                  onClick={() => { setDeleteStep('idle'); setConfirmText(''); }}
                  style={{ padding: '10px 20px', background: 'transparent', border: '1px solid rgba(245,240,232,0.12)', color: 'rgba(245,240,232,0.74)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'deleting' && (
            <div style={{ padding: '16px', fontSize: '13px', color: 'rgba(245,240,232,0.74)', letterSpacing: '0.04em' }}>
              Deleting your account and all data…
            </div>
          )}

          {deleteStep === 'error' && (
            <div style={{ padding: '16px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.04)' }}>
              <p style={{ fontSize: '13px', color: 'rgba(239,68,68,0.8)', marginBottom: '12px' }}>{errorMessage}</p>
              <button
                onClick={() => { setDeleteStep('idle'); setConfirmText(''); setErrorMessage(null); }}
                style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(245,240,232,0.15)', color: 'rgba(245,240,232,0.76)', fontSize: '13px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Try again
              </button>
            </div>
          )}
        </section>

        <div style={{ marginTop: '40px' }}>
          <Link
            href="/dashboard"
            style={{ fontSize: '13px', color: 'rgba(245,240,232,0.72)', textDecoration: 'none', letterSpacing: '0.02em' }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
