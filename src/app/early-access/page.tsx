'use client';

import { useState } from 'react';
import FaqWidget from '@/components/landing/FaqWidget';
import { searchTreatyCountries, TREATY_COUNTRIES } from '@/lib/treaty-countries';

const TIMELINES = [
  { value: 'asap', label: 'As soon as possible' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: '6_12_months', label: '6–12 months' },
  { value: 'exploring', label: 'Just exploring for now' },
];

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: '#111',
  border: '1px solid rgba(245,240,232,0.12)',
  color: '#f5f0e8',
  fontFamily: "'DM Sans', sans-serif",
  fontSize: '13px',
  boxSizing: 'border-box' as const,
};

const labelStyle = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: 'rgba(245,240,232,0.68)',
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: '8px',
};

export default function EarlyAccessPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryHighlight, setCountryHighlight] = useState(-1);
  const [filingTimeline, setFilingTimeline] = useState('');
  const [company, setCompany] = useState(''); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() && name.trim() && TREATY_COUNTRIES.includes(country) && filingTimeline;

  const filteredCountries = countrySearch.trim()
    ? searchTreatyCountries(countrySearch, 8)
    : TREATY_COUNTRIES;

  function selectCountry(c: string) {
    setCountry(c);
    setCountrySearch(c);
    setCountryOpen(false);
    setCountryHighlight(-1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, country, filingTimeline, company }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Submission failed');
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
            You&apos;re on the list
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7 }}>
            Thanks for your interest in E2go.app. We&apos;ll reach out to {email} as early access opens up.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', padding: '80px 24px' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto' }}>

        <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, display: 'block', marginBottom: '10px' }}>
          Early access
        </span>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', fontWeight: 300, color: '#f5f0e8', marginBottom: '8px' }}>
          Get early access to E2go.app
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.68)', lineHeight: 1.7, marginBottom: '36px' }}>
          Leave your details and we&apos;ll let you know as soon as you can start building your E-2 visa application with E2go.app.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div>
            <label style={labelStyle}>Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your full name"
              required
              maxLength={200}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              maxLength={320}
              style={inputStyle}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>Country of residence</label>
            <input
              type="text"
              value={countrySearch}
              onChange={e => {
                setCountrySearch(e.target.value);
                setCountry('');
                setCountryOpen(true);
                setCountryHighlight(-1);
              }}
              onFocus={() => setCountryOpen(true)}
              onBlur={() => setTimeout(() => setCountryOpen(false), 120)}
              onKeyDown={e => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setCountryOpen(true);
                  setCountryHighlight(prev => Math.min(prev + 1, filteredCountries.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setCountryHighlight(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter' && countryOpen && countryHighlight >= 0) {
                  e.preventDefault();
                  selectCountry(filteredCountries[countryHighlight]);
                } else if (e.key === 'Escape') {
                  setCountryOpen(false);
                }
              }}
              placeholder="Search your country of residence…"
              autoComplete="off"
              required
              maxLength={100}
              style={inputStyle}
            />
            {countryOpen && filteredCountries.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: '4px', maxHeight: '220px', overflowY: 'auto', background: '#111', border: '1px solid rgba(245,240,232,0.12)' }}>
                {filteredCountries.map((c, idx) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => selectCountry(c)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      font: 'inherit',
                      border: 'none',
                      padding: '9px 14px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '13px',
                      color: '#f5f0e8',
                      cursor: 'pointer',
                      background: idx === countryHighlight ? 'rgba(201,168,76,0.15)' : country === c ? 'rgba(201,168,76,0.08)' : 'transparent',
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {countryOpen && countrySearch.trim() && filteredCountries.length === 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: '4px', padding: '10px 14px', background: '#111', border: '1px solid rgba(245,240,232,0.12)', fontSize: '12px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                No match in the E-2 treaty country list — early access is limited to treaty countries.
              </div>
            )}
          </div>

          <div>
            <label style={labelStyle}>How soon are you looking to file your E-2?</label>
            <select
              value={filingTimeline}
              onChange={e => setFilingTimeline(e.target.value)}
              required
              style={{ ...inputStyle, appearance: 'none' }}
            >
              <option value="" disabled>Select a timeline</option>
              {TIMELINES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Honeypot — hidden from real users, bots that fill every field trip it */}
          <div style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
            <label htmlFor="company">Company</label>
            <input
              id="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={e => setCompany(e.target.value)}
            />
          </div>

          {error && (
            <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', fontFamily: "'DM Sans', sans-serif" }}>{error}</p>
          )}

          <div>
            <button
              type="submit"
              disabled={submitting || !canSubmit}
              style={{ padding: '12px 28px', background: canSubmit ? '#C9A84C' : 'rgba(201,168,76,0.2)', color: canSubmit ? '#0a0a0a' : 'rgba(245,240,232,0.68)', border: 'none', cursor: submitting ? 'default' : 'pointer', fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}
            >
              {submitting ? 'Submitting…' : 'Join early access →'}
            </button>
          </div>

        </form>
      </div>

      <div style={{ maxWidth: '672px', margin: '32px auto 0', borderTop: '1px solid rgba(201,168,76,0.12)' }}>
        <FaqWidget />
      </div>
    </main>
  );
}
