'use client'

import Image from 'next/image'

// ComparisonSection.tsx v3
// Changes from v2:
// - Replaced the two-column cost/timeline comparison grid and the
//   "Everything included" feature grid with two static infographics
//   (E2go pathway + E2go pricing) per Romy's request 2026-09-17.
//   Source files: docs/E2goPath.png, docs/pricing plan.jpg
//   Copied into public/images/landing/ for serving.

export function ComparisonSection() {
  return (
    <section style={{
      background: '#0a0a0a',
      padding: '96px 24px',
      borderTop: '1px solid rgba(201,168,76,0.12)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Heading — centered to match the two infographics below, which are
            themselves centered, symmetrical compositions. */}
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#C9A84C',
            marginBottom: '20px',
          }}>
            Why E2go.app
          </p>
          <h2 style={{
            fontFamily: '"Cormorant Garamond", serif',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 300,
            color: '#f5f0e8',
            lineHeight: 1.15,
            margin: '0 0 24px',
          }}>
            One platform. The complete journey.
          </h2>
          <p style={{
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.78)',
            maxWidth: '680px',
            margin: '0 auto',
            lineHeight: 1.7,
          }}>
            The E-2 visa application isn&rsquo;t complicated — it&rsquo;s scattered. E2go.app
            pulls it into one place: your eligibility, your answers, your assessment,
            then 15+ documents drafted from your own words — each one gap-analysed,
            denial-risk checked, consulate-ordered. No months of meetings — first the
            consultant or broker, then the lawyer — to justify a $10&ndash;15,000
            invoice. Just the work that counts, faster and for far less.
          </p>
        </div>

        {/* Two infographics — replaces the former cost/timeline comparison
            grid and "Everything included" feature grid with the finished
            E2go pathway and pricing diagrams. */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}>
          <div style={{
            background: '#0a0a0a',
            border: '1px solid rgba(201,168,76,0.12)',
            padding: '24px',
          }}>
            <Image
              src="/images/landing/e2go-pathway.png"
              alt="One E-2 journey, two very different paths: the E2go.app path versus the traditional path, step by step"
              width={1024}
              height={1024}
              sizes="(max-width: 768px) 100vw, 1024px"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
          <div style={{
            background: '#0a0a0a',
            border: '1px solid rgba(201,168,76,0.12)',
            padding: '24px',
          }}>
            <Image
              src="/images/landing/e2go-pricing.jpg"
              alt="A clearer path, less time, lower cost: E2go.app platform cost and timeline versus the traditional path's professional fees and timeline"
              width={2048}
              height={1152}
              sizes="(max-width: 768px) 100vw, 1100px"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>

      </div>
    </section>
  )
}
