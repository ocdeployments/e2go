'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  hasPurchased: boolean;
}

export default function RenewalEntryClient({ hasPurchased }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(hasPurchased);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already purchased but no intake yet, create one then redirect
  useEffect(() => {
    if (!hasPurchased) return;
    (async () => {
      try {
        const res = await fetch('/api/renewal/intake');
        if (res.ok) {
          router.push('/renewal/intake');
        } else {
          setError('Failed to load your renewal file. Please refresh.');
          setLoading(false);
        }
      } catch {
        setError('Network error — please check your connection and refresh.');
        setLoading(false);
      }
    })();
  }, [hasPurchased, router]);

  async function handlePurchase() {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'renewal',
          successUrl: `${window.location.origin}/renewal?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/renewal`,
        }),
      });
      if (!res.ok) throw new Error('Checkout failed');
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again or contact support@e2go.app.');
      setCheckoutLoading(false);
    }
  }

  if (loading) {
    return (
      <main style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '1px solid rgba(201,168,76,0.3)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px' }}>Opening your renewal file…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  return (
    <main style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid rgba(245,240,232,0.06)', padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/case-profile" style={{ color: 'rgba(245,240,232,0.5)', fontSize: '13px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          My case
        </Link>
        <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#C9A84C', fontSize: '16px', letterSpacing: '0.04em' }}>
          e2go
        </span>
        <div style={{ width: '80px' }} />
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '80px 40px 60px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', padding: '4px 10px', marginBottom: '20px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span style={{ color: '#C9A84C', fontSize: '11px', letterSpacing: '0.08em', fontWeight: 500 }}>E-2 RENEWAL MODULE</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '42px', color: '#f5f0e8', lineHeight: 1.15, marginBottom: '16px' }}>
            Renew your<br />E-2 visa status
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.7, maxWidth: '520px' }}>
            Prepare your E-2 renewal application with the same intelligence that built your original case — updated with your real business performance and current circumstances.
          </p>
        </div>

        {/* Two paths */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '48px' }}>
          <div style={{ background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '8px', padding: '24px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4l3 3" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', color: '#f5f0e8', fontWeight: 400, marginBottom: '8px' }}>Path A — Toronto Consulate</h3>
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.65 }}>
              5-year stamp renewal at the U.S. Consulate in Toronto. Most common path — full interview with consular officer.
            </p>
          </div>
          <div style={{ background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.08)', borderRadius: '8px', padding: '24px' }}>
            <div style={{ width: '32px', height: '32px', background: 'rgba(201,168,76,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            </div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', color: '#f5f0e8', fontWeight: 400, marginBottom: '8px' }}>Path B — USCIS Extension</h3>
            <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.65 }}>
              2-year I-94 extension via Form I-129. Filed with USCIS — no travel required. Best if you cannot leave the U.S.
            </p>
          </div>
        </div>

        {/* What you get */}
        <div style={{ borderTop: '1px solid rgba(245,240,232,0.06)', paddingTop: '40px', marginBottom: '48px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: '22px', color: '#f5f0e8', marginBottom: '20px' }}>
            What&apos;s included
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              'Business performance review — actual vs. projected (Template 6)',
              'Updated cover letter naming your current role and business achievements',
              'Condensed 5-page business plan update for renewal submission',
              'Current Canadian ties narrative — pre-populated where possible',
              'Path-specific checklist: consulate binder OR USCIS I-129 reference sheet',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <svg style={{ flexShrink: 0, marginTop: '3px' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: '14px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.6 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        {error && (
          <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '16px', padding: '12px 16px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '6px' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handlePurchase}
            disabled={checkoutLoading}
            style={{
              background: checkoutLoading ? 'rgba(201,168,76,0.5)' : '#C9A84C',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '6px',
              padding: '14px 28px',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: checkoutLoading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            {checkoutLoading ? 'Opening checkout…' : 'Get started — $497'}
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)' }}>
            One-time purchase · Instant access
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)', marginTop: '24px' }}>
          Already purchased?{' '}
          <button
            onClick={() => { setLoading(true); window.location.reload(); }}
            style={{ background: 'none', border: 'none', color: '#C9A84C', fontSize: '12px', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Refresh to continue
          </button>
        </p>
      </div>
    </main>
  );
}
