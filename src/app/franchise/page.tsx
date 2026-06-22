'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { FRANCHISE_CATEGORIES } from '@/data/franchise-brands';

export default function FranchiseLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [investmentRange, setInvestmentRange] = useState<string | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const [{ data: profile }, { data: quizSession }] = await Promise.all([
          supabase.from('profiles').select('first_name').eq('id', user.id).single(),
          supabase
            .from('quiz_sessions')
            .select('result_json, completed_at')
            .eq('user_id', user.id)
            .order('id', { ascending: false })
            .limit(1)
            .single(),
        ]);

        if (profile?.first_name) setFirstName(profile.first_name);

        const answers = (quizSession?.result_json as { answers?: Record<string, string> } | null)?.answers ?? {};
        const range = answers['Q0-07'] ?? null;
        if (range) setInvestmentRange(range);
        setHasProfile(!!quizSession?.completed_at);
      } catch { /* not logged in or no quiz */ }
      setLoading(false);
    };
    load();
  }, []);

  const categoryList = Object.entries(FRANCHISE_CATEGORIES);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '820px', margin: '0 auto', padding: '64px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: '56px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
            E2go · Franchise Navigator
          </span>
          <h1 style={{ fontSize: '36px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', margin: '12px 0 16px', lineHeight: 1.2 }}>
            {firstName ? `${firstName}, find` : 'Find'} the right business<br />
            for your E-2 visa
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.8, maxWidth: '520px', fontFamily: "'DM Sans', sans-serif" }}>
            A structured advisor that reads your file, asks only what it doesn&rsquo;t already know, scores every category for your profile, and connects you with a specialist broker — only after you&rsquo;ve seen a clear rationale.
          </p>
          {investmentRange && (
            <div style={{ marginTop: '18px', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '7px 14px', border: '1px solid rgba(201,168,76,0.2)', background: 'rgba(201,168,76,0.03)' }}>
              <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif" }}>Investment range on file:</span>
              <span style={{ fontSize: '11px', color: '#C9A84C', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{investmentRange}</span>
            </div>
          )}
        </div>

        {/* How it works */}
        <div style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '24px', fontWeight: 400 }}>
            How it works
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2px' }}>
            {[
              { step: '01', label: 'Confirm your profile', desc: 'We pre-fill what we already know — investment range, citizenship, family. You confirm and fill any gaps.' },
              { step: '02', label: 'Answer 12 questions', desc: 'Background, operator style, hours per week, location. Only what we don\'t already have.' },
              { step: '03', label: 'See your match scores', desc: 'Every category scored across capital fit, visa strength, operator fit, market fit, and renewal outlook.' },
              { step: '04', label: 'Explore shortlisted brands', desc: 'Top 5–8 brands matched to your capital and profile. Item 19 financials where available.' },
            ].map(({ step, label, desc }) => (
              <div key={step} style={{ padding: '20px', background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.06)' }}>
                <div style={{ fontSize: '10px', letterSpacing: '0.1em', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '8px' }}>{step}</div>
                <div style={{ fontSize: '13px', color: '#f5f0e8', fontWeight: 500, fontFamily: "'DM Sans', sans-serif", marginBottom: '6px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', lineHeight: 1.6, fontFamily: "'DM Sans', sans-serif" }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories we cover */}
        <div style={{ marginBottom: '56px' }}>
          <h2 style={{ fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '24px', fontWeight: 400 }}>
            Categories we cover
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {categoryList.map(([key, cat]) => (
              <div
                key={key}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(245,240,232,0.02)', border: '1px solid rgba(245,240,232,0.06)', gap: '16px', flexWrap: 'wrap' }}
              >
                <div>
                  <span style={{ fontSize: '13px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{cat.label}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'rgba(245,240,232,0.4)', marginTop: '3px', fontFamily: "'DM Sans', sans-serif" }}>{cat.tagline}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '10px', color: 'rgba(245,240,232,0.25)', fontFamily: "'DM Sans', sans-serif", marginBottom: '3px' }}>E-2 strength</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {[...Array(5)].map((_, i) => (
                        <div
                          key={i}
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            background: i < Math.round(cat.visaFitScore / 20)
                              ? '#C9A84C'
                              : 'rgba(201,168,76,0.15)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* The broker model */}
        <div
          style={{
            marginBottom: '56px',
            padding: '20px 22px',
            border: '1px solid rgba(245,240,232,0.07)',
            background: 'rgba(245,240,232,0.01)',
          }}
        >
          <h3 style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", marginBottom: '12px', fontWeight: 400 }}>
            How this is free to you
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.55)', lineHeight: 1.8, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            Franchise consultants are paid a placement fee by franchisors when a deal closes — not by you.
            E2go does not charge you for the introduction and does not receive a commission.
            You will never be asked to pay a broker for a referral. If any broker asks you for upfront fees,
            contact us immediately.
          </p>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {hasProfile ? (
            <button
              onClick={() => router.push('/franchise/discover')}
              style={{
                padding: '14px 32px',
                background: '#C9A84C',
                color: '#0a0a0a',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
              }}
            >
              Start matching →
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push('/franchise/discover')}
                style={{
                  padding: '14px 32px',
                  background: '#C9A84C',
                  color: '#0a0a0a',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 500,
                }}
              >
                Start matching →
              </button>
              <a
                href="/quiz"
                style={{ fontSize: '12px', color: 'rgba(245,240,232,0.35)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
              >
                Complete eligibility quiz first for best results
              </a>
            </>
          )}
          <a
            href="/dashboard"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
          >
            ← Back to dashboard
          </a>
        </div>

      </div>
    </div>
  );
}
