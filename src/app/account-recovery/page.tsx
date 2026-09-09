'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const supabase = createBrowserSupabaseClient();

export default function AccountRecoveryPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'deleted' | 'restored' | 'not-deleted' | 'error'>('loading');
  const [deletedAt, setDeletedAt] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch soft-delete status directly
      const { data: profile } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.deleted_at) {
        setDeletedAt(profile.deleted_at);
        setStatus('deleted');
      } else {
        setStatus('not-deleted');
      }
    }
    checkStatus();
  }, [router]);

  async function handleRestore() {
    setRestoring(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/account/restore', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Restoration failed. Please contact support@e2go.app.');
      }
      setStatus('restored');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setRestoring(false);
    }
  }

  const purgeDate = deletedAt
    ? new Date(new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  if (status === 'loading') {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '1px solid rgba(201,168,76,0.3)', borderTop: '1px solid #C9A84C', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </main>
    );
  }

  if (status === 'restored') {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '40px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '28px', color: '#f5f0e8', marginBottom: '12px' }}>
            Account restored
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.7, marginBottom: '32px' }}>
            Your account has been fully restored. All your visa preparation work is intact.
          </p>
          <button
            onClick={() => router.push('/case-profile')}
            style={{ padding: '12px 32px', background: '#C9A84C', color: '#0a0a0a', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Continue to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (status === 'not-deleted') {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '40px' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '28px', color: '#f5f0e8', marginBottom: '12px' }}>
            Nothing to recover
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.7, marginBottom: '32px' }}>
            Your account is active and not scheduled for deletion.
          </p>
          <button
            onClick={() => router.push('/case-profile')}
            style={{ padding: '12px 32px', background: '#C9A84C', color: '#0a0a0a', fontWeight: 500, fontSize: '14px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Go to dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '40px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <div style={{ fontSize: '17px', color: '#C9A84C', marginBottom: '48px', fontWeight: 300 }}>
          e2go<span style={{ color: '#f5f0e8' }}>.app</span>
        </div>

        <div style={{ width: '48px', height: '48px', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '32px', color: '#f5f0e8', marginBottom: '12px', lineHeight: 1.2 }}>
          Account scheduled for deletion
        </h1>

        <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.72)', lineHeight: 1.7, marginBottom: '8px' }}>
          Your account and all associated data will be permanently deleted on{' '}
          <strong style={{ color: '#f5f0e8' }}>{purgeDate}</strong>.
        </p>
        <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.7, marginBottom: '36px' }}>
          If you changed your mind, you can cancel the deletion now. All your visa preparation work will be fully restored.
        </p>

        {errorMessage && (
          <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '13px', marginBottom: '24px' }}>
            {errorMessage}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleRestore}
            disabled={restoring}
            style={{ flex: 1, minWidth: '160px', padding: '13px 24px', background: '#C9A84C', color: '#0a0a0a', fontWeight: 600, fontSize: '14px', border: 'none', cursor: restoring ? 'not-allowed' : 'pointer', opacity: restoring ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif' " }}
          >
            {restoring ? 'Restoring…' : 'Cancel deletion'}
          </button>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            style={{ flex: 1, minWidth: '160px', padding: '13px 24px', background: 'transparent', color: 'rgba(245,240,232,0.6)', fontSize: '14px', border: '1px solid rgba(245,240,232,0.12)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            Sign out
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', marginTop: '32px', lineHeight: 1.6 }}>
          Need help? Contact{' '}
          <a href="mailto:support@e2go.app" style={{ color: 'rgba(201,168,76,0.7)', textDecoration: 'none' }}>support@e2go.app</a>
        </p>
      </div>
    </main>
  );
}
