'use client';

import { useState } from 'react';
import Link from 'next/link';

const CATEGORIES = [
  { value: 'document', label: 'Document issue' },
  { value: 'billing', label: 'Billing or payment' },
  { value: 'account', label: 'Account access' },
  { value: 'bug', label: 'Bug report' },
  { value: 'general', label: 'General question' },
  { value: 'other', label: 'Other' },
];

export default function SupportPage() {
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (submitted) {
    return (
      <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '1.5px solid rgba(34,197,94,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'rgba(34,197,94,0.8)', fontSize: '18px' }}>
            ✓
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '26px', fontWeight: 300, color: '#f5f0e8', marginBottom: '12px' }}>
            Ticket submitted
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7, marginBottom: '32px' }}>
            We received your message and will respond within 1–2 business days.
            Urgent billing issues are typically resolved the same day.
          </p>
          <Link
            href="/dashboard"
            style={{ display: 'inline-block', padding: '11px 24px', background: '#C9A84C', color: '#0a0a0a', fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none' }}
          >
            Back to dashboard →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', padding: '80px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <Link href="/dashboard" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back to dashboard
        </Link>

        <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: 'block', marginBottom: '10px' }}>
          Support
        </span>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 300, color: '#f5f0e8', marginBottom: '8px' }}>
          Contact us
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7, marginBottom: '36px' }}>
          We typically respond within one business day. For urgent billing issues, use the Billing category — those are prioritized.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>
              Category
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid rgba(245,240,232,0.12)', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', appearance: 'none' }}
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              required
              maxLength={200}
              style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid rgba(245,240,232,0.12)', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', boxSizing: 'border-box' as const }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>
              Message
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Describe the issue in detail. Include any error messages you see."
              required
              rows={6}
              maxLength={4000}
              style={{ width: '100%', padding: '10px 14px', background: '#111', border: '1px solid rgba(245,240,232,0.12)', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' as const }}
            />
            <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.40)', fontFamily: "'DM Sans', sans-serif", marginTop: '4px', textAlign: 'right' as const }}>
              {message.length}/4000
            </p>
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              style={{ padding: '12px 28px', background: subject.trim() && message.trim() ? '#C9A84C' : 'rgba(201,168,76,0.2)', color: subject.trim() && message.trim() ? '#0a0a0a' : 'rgba(245,240,232,0.68)', border: 'none', cursor: submitting ? 'default' : 'pointer', fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
            >
              {submitting ? 'Sending…' : 'Send message →'}
            </button>
            <a
              href="mailto:support@e2go.app"
              style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
            >
              Or email directly
            </a>
          </div>

        </form>
      </div>
    </main>
  );
}
