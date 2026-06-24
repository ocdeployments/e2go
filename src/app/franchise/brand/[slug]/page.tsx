'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getBrandBySlug, FRANCHISE_CATEGORIES } from '@/data/franchise-brands';

export default function FranchiseBrandPage() {
  const { slug } = useParams<{ slug: string }>();
  const brand = getBrandBySlug(slug);

  if (!brand) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <p style={{ color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }}>Brand not found.</p>
        <Link href="/franchise/matches" style={{ color: '#C9A84C', fontSize: '13px', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
          ← Back to matches
        </Link>
      </div>
    );
  }

  const cat = FRANCHISE_CATEGORIES[brand.category];
  const investRange = `$${(brand.investMin / 1000).toFixed(0)}K – $${(brand.investMax / 1000).toFixed(0)}K`;
  const liquidRange = `$${(brand.liquidMin / 1000).toFixed(0)}K minimum liquid`;

  const e2Config = {
    A: { color: 'rgba(34,197,94,0.85)', label: 'Strong E-2 compatibility', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.2)' },
    B: { color: '#C9A84C', label: 'Good E-2 compatibility', bg: 'rgba(201,168,76,0.06)', border: 'rgba(201,168,76,0.2)' },
    C: { color: 'rgba(239,68,68,0.8)', label: 'Moderate E-2 compatibility', bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.2)' },
  }[brand.e2CompatScore];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#f5f0e8' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '56px 24px 80px' }}>

        <Link href="/franchise/matches" style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none', display: 'inline-block', marginBottom: '40px' }}>
          ← Back to matches
        </Link>

        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.70)', fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: '8px' }}>
            {cat.label}
          </span>
          <h1 style={{ fontSize: '32px', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: '#f5f0e8', margin: '0 0 16px' }}>
            {brand.name}
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(245,240,232,0.6)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", maxWidth: '540px' }}>
            {brand.description}
          </p>
        </div>

        {/* E-2 compatibility */}
        <div style={{ marginBottom: '36px', padding: '18px 20px', border: `1px solid ${e2Config.border}`, background: e2Config.bg }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', color: e2Config.color, fontFamily: "'DM Sans', sans-serif" }}>
              E-2 RATING: {brand.e2CompatScore}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif" }}>—</span>
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif" }}>{e2Config.label}</span>
          </div>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            {brand.e2Notes}
          </p>
        </div>

        {/* Key facts */}
        <div style={{ marginBottom: '36px' }}>
          <h2 style={{ fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '16px', fontWeight: 400 }}>
            Key figures
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px' }}>
            {[
              { label: 'Total investment range', value: investRange },
              { label: 'Liquid capital required', value: liquidRange },
              { label: 'Staff at 12 months', value: `${brand.staffingAt12Months.min}–${brand.staffingAt12Months.max} people` },
              { label: 'Item 19 financials', value: brand.item19Present ? 'Available in FDD' : 'Not disclosed' },
              { label: 'Home-based operation', value: brand.homeBased ? 'Yes (note: E-2 risk — document carefully)' : 'No — commercial premises required' },
              { label: 'Renewal strength', value: `${brand.renewalStrengthScore}/100` },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '14px 16px', border: '1px solid rgba(245,240,232,0.06)', background: 'rgba(245,240,232,0.015)' }}>
                <span style={{ fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: '5px' }}>
                  {label}
                </span>
                <span style={{ fontSize: '13px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category context */}
        <div style={{ marginBottom: '40px', padding: '18px 20px', border: '1px solid rgba(245,240,232,0.07)', background: 'rgba(245,240,232,0.01)' }}>
          <h3 style={{ fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", marginBottom: '10px', fontWeight: 400 }}>
            Category: {cat.label}
          </h3>
          <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.76)', lineHeight: 1.7, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
            {cat.tagline}. E-2 visa strength for this category: {cat.visaFitScore}/100.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link
            href="/franchise/connect"
            style={{ display: 'inline-block', padding: '11px 22px', background: '#C9A84C', color: '#0a0a0a', fontSize: '12px', letterSpacing: '0.07em', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none' }}
          >
            Request introduction →
          </Link>
          <Link
            href="/franchise/matches"
            style={{ fontSize: '12px', color: 'rgba(245,240,232,0.70)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'underline' }}
          >
            ← Back to all matches
          </Link>
        </div>

      </div>
    </div>
  );
}
