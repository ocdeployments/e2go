'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { resolvePrimaryApplication, resolvePrimaryApplicationId } from '@/lib/resolve-application';

const CONSENT_TEXT = `I consent to e2go sharing my investment range, target business category, citizenship, target state, and contact information with a specialist E-2 franchise consultant. I understand this service is free — the consultant is paid by franchisors, not by me. I can withdraw this consent at any time by contacting support@e2go.app.`;

interface ProfileSummary {
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  investmentRange: string | null;
  citizenship: string | null;
  targetState: string | null;
  topCategory: string | null;
}

export default function FranchiseConnectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileSummary>({
    firstName: null,
    lastName: null,
    email: null,
    investmentRange: null,
    citizenship: null,
    targetState: null,
    topCategory: null,
  });
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const [{ data: profileData }, { data: quizSession }, primaryApp] = await Promise.all([
          supabase.from('profiles').select('first_name, last_name').eq('id', user.id).single(),
          supabase
            .from('quiz_sessions')
            .select('result_json')
            .eq('user_id', user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single(),
          resolvePrimaryApplication<{ id: string; target_state: string | null }>(supabase, user.id, 'id, target_state'),
        ]);

        const quizAnswers = (quizSession?.result_json as { answers?: Record<string, string> } | null)?.answers ?? {};

        setProfile({
          firstName: profileData?.first_name ?? null,
          lastName: profileData?.last_name ?? null,
          email: user.email ?? null,
          investmentRange: quizAnswers['Q0-07'] ?? null,
          citizenship: quizAnswers['Q0-01'] ?? null,
          targetState: primaryApp?.target_state ?? null,
          topCategory: null, // TODO: derive from matches when franchise_profiles table exists
        });
      } catch { /* continue */ }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!consent) return;
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get latest application id
      const appsId = await resolvePrimaryApplicationId(supabase, user.id);
      const apps = appsId ? [{ id: appsId }] : [];

      const appId = apps?.[0]?.id ?? null;

      // Store the referral record
      const packet = {
        name: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
        email: profile.email,
        investmentRange: profile.investmentRange,
        citizenship: profile.citizenship,
        targetState: profile.targetState,
        consentAt: new Date().toISOString(),
      };

      await supabase.from('broker_referrals').insert({
        user_id: user.id,
        application_id: appId,
        packet,
        consent_text: CONSENT_TEXT,
        consent_at: new Date().toISOString(),
        status: 'sent',
      });

      // Save franchise interest as an answer for ERP visibility
      if (appId) {
        await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_key: 'QFN-CONNECT',
            answer_value: 'yes',
            application_id: appId,
          }),
        });
      }

      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again or contact support.');
    }
    setSubmitting(false);
  }, [consent, profile]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Loading…</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', border: '2px solid rgba(34,197,94,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'rgba(34,197,94,0.8)', fontSize: '20px' }}>
            ✓
          </div>
          <h1 style={{ fontSize: '26px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', marginBottom: '16px' }}>
            Introduction requested
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>
            A specialist franchise consultant will review your profile and reach out within 1–2 business days.
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: '32px' }}>
            They will contact you at{' '}
            <span style={{ color: 'rgba(245,240,232,0.76)' }}>{profile.email ?? 'your registered email'}</span>.
            Remember: this consultation is free — the broker is paid by the franchisor, not by you.
          </p>
          <Link
            href="/dashboard"
            style={{ display: 'inline-block', padding: '11px 24px', background: '#C9A84C', color: '#0a0a0a', fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none' }}
          >
            Back to dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '56px 24px 80px' }}>

        <Link href="/franchise/matches" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back to matches
        </Link>

        <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: 'block', marginBottom: '10px' }}>
          Broker introduction
        </span>
        <h1 style={{ fontSize: '28px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', margin: '0 0 16px' }}>
          Request a specialist introduction
        </h1>
        <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", marginBottom: '40px' }}>
          We will share a structured profile with a vetted E-2 franchise consultant so they can reach out with
          availability and territory information for your matched categories.
        </p>

        {/* What we share */}
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '16px', fontWeight: 400 }}>
            What we share with the broker
          </h2>
          <div style={{ border: '1px solid rgba(245,240,232,0.62)', background: 'rgba(245,240,232,0.01)' }}>
            {[
              { label: 'Your name', value: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'From your profile' },
              { label: 'Contact email', value: profile.email ?? 'Your registered email' },
              { label: 'Investment range', value: profile.investmentRange ?? 'From your quiz' },
              { label: 'Citizenship', value: profile.citizenship ?? 'From your quiz' },
              { label: 'Target state', value: profile.targetState ?? 'Not yet specified' },
              { label: 'Matched categories', value: 'Top matches from your Franchise Navigator results' },
            ].map(({ label, value }, i, arr) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '13px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid rgba(245,240,232,0.05)' : 'none',
                  gap: '20px',
                }}
              >
                <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.70)', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, minWidth: '130px' }}>
                  {label}
                </span>
                <span style={{ fontSize: '12px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", textAlign: 'right' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif", marginTop: '10px', lineHeight: 1.6 }}>
            We do not share your full case file, immigration history, or financial documents.
            The broker receives only what is listed above.
          </p>
        </div>

        {/* Fee reminder */}
        <div style={{ marginBottom: '32px', padding: '14px 16px', border: '1px solid rgba(34,197,94,0.15)', background: 'rgba(34,197,94,0.04)' }}>
          <p style={{ fontSize: '12px', color: 'rgba(34,197,94,0.8)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            <strong>This consultation is free to you.</strong> Franchise consultants are paid by franchisors
            when a deal closes — not by you and not by e2go. If any consultant asks you for upfront fees
            or retainers, contact us at support@e2go.app immediately.
          </p>
        </div>

        {/* Consent checkbox */}
        <label
          style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', cursor: 'pointer', marginBottom: '32px' }}
        >
          <button
            role="checkbox"
            aria-checked={consent}
            onClick={() => setConsent(c => !c)}
            style={{
              width: '18px',
              height: '18px',
              flexShrink: 0,
              border: `1.5px solid ${consent ? '#C9A84C' : 'rgba(245,240,232,0.62)'}`,
              background: consent ? 'rgba(201,168,76,0.15)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#C9A84C',
              fontSize: '11px',
              marginTop: '1px',
            }}
          >
            {consent ? '✓' : ''}
          </button>
          <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif" }}>
            {CONSENT_TEXT}
          </span>
        </label>

        {/* Submit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSubmit}
            disabled={!consent || submitting}
            style={{
              padding: '13px 28px',
              background: consent ? '#C9A84C' : 'rgba(201,168,76,0.2)',
              color: consent ? '#0a0a0a' : 'rgba(245,240,232,0.68)',
              border: 'none',
              cursor: consent && !submitting ? 'pointer' : 'default',
              fontSize: '12px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {submitting ? 'Sending…' : 'Send introduction request →'}
          </button>
          <Link
            href="/franchise/matches"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
          >
            Cancel
          </Link>
        </div>

        {error && (
          <p style={{ marginTop: '16px', fontSize: '12px', color: 'rgba(239,68,68,0.8)', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
        )}

      </div>
    </div>
  );
}
