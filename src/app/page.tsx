"use client";

import Link from "next/link";

// Inline styles for glassmorphism (no Tailwind per task requirements)
const styles = {
  page: {
    position: "relative" as const,
    zIndex: 1,
    minHeight: "100vh",
  },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "24px 48px",
    borderBottom: "1px solid var(--glass-border)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    background: "rgba(6,13,31,0.6)",
    position: "sticky" as const,
    top: "3px",
    zIndex: 100,
  },
  navLogo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    fontWeight: 600,
    color: "var(--white)",
    letterSpacing: "-0.02em",
    textDecoration: "none",
  },
  navLogoSpan: {
    color: "var(--teal)",
  },
  navLinks: {
    display: "flex",
    gap: "32px",
    listStyle: "none",
  },
  navLink: {
    color: "var(--white-dim)",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: 400,
    transition: "color 0.2s",
  },
  navCta: {
    background: "var(--teal)",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "10px 22px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s",
    textDecoration: "none",
  },
  hero: {
    padding: "100px 48px 80px",
    maxWidth: "1100px",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "64px",
    alignItems: "center",
  },
  heroEyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "var(--teal)",
    marginBottom: "24px",
  },
  heroEyebrowLine: {
    display: "block",
    width: "28px",
    height: "1px",
    background: "var(--teal)",
  },
  heroHeadline: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "52px",
    fontWeight: 600,
    lineHeight: 1.1,
    color: "var(--white)",
    marginBottom: "12px",
    letterSpacing: "-0.02em",
  },
  heroHeadlineEm: {
    fontStyle: "italic",
    color: "var(--teal)",
  },
  heroSub: {
    fontSize: "16px",
    lineHeight: 1.7,
    color: "var(--white-dim)",
    marginBottom: "40px",
    maxWidth: "440px",
  },
  heroActions: {
    display: "flex",
    gap: "14px",
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  btnPrimary: {
    background: "var(--teal)",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "15px 30px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s, transform 0.15s, box-shadow 0.2s",
    boxShadow: "0 0 30px rgba(13,148,136,0.25)",
    textDecoration: "none",
    display: "inline-block",
  },
  btnGhost: {
    background: "transparent",
    color: "var(--white-dim)",
    border: "1px solid var(--glass-border)",
    borderRadius: "8px",
    padding: "14px 24px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "14px",
    fontWeight: 400,
    cursor: "pointer",
    transition: "border-color 0.2s, color 0.2s",
    textDecoration: "none",
    display: "inline-block",
  },
  glass: {
    background: "var(--glass-bg)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--glass-border)",
    borderRadius: "16px",
  },
  heroCard: {
    padding: "32px",
    transition: "transform 0.3s",
  },
  heroCardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "20px",
    fontWeight: 600,
    color: "var(--white)",
    marginBottom: "16px",
  },
  heroCardStat: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 0",
    borderBottom: "1px solid var(--glass-border)",
  },
  heroCardStatLast: {
    borderBottom: "none",
  },
  heroCardStatIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    background: "var(--teal-dim)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--teal)",
    fontSize: "16px",
  },
  heroCardStatLabel: {
    fontSize: "13px",
    color: "var(--white-dim)",
  },
  heroCardStatValue: {
    fontSize: "13px",
    color: "var(--white)",
    fontWeight: 500,
  },
  section: {
    padding: "80px 48px",
    maxWidth: "1100px",
    margin: "0 auto",
  },
  sectionEyebrow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "11px",
    fontWeight: 500,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "var(--teal)",
    marginBottom: "16px",
  },
  sectionEyebrowLine: {
    display: "block",
    width: "28px",
    height: "1px",
    background: "var(--teal)",
  },
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "36px",
    fontWeight: 600,
    color: "var(--white)",
    marginBottom: "48px",
    letterSpacing: "-0.02em",
  },
  trustBar: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "24px",
    marginBottom: "80px",
  },
  trustItem: {
    textAlign: "center" as const,
    padding: "24px",
    borderRadius: "12px",
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
  },
  trustIcon: {
    fontSize: "24px",
    marginBottom: "12px",
    color: "var(--teal)",
  },
  trustLabel: {
    fontSize: "13px",
    color: "var(--white-dim)",
    lineHeight: 1.5,
  },
  howGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "24px",
  },
  stepCard: {
    padding: "32px",
    borderRadius: "16px",
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
    transition: "transform 0.3s, background 0.3s",
    cursor: "default",
  },
  stepNumber: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "48px",
    fontWeight: 600,
    color: "var(--teal)",
    opacity: 0.3,
    marginBottom: "16px",
    lineHeight: 1,
  },
  stepTitle: {
    fontSize: "18px",
    fontWeight: 500,
    color: "var(--white)",
    marginBottom: "8px",
  },
  stepDesc: {
    fontSize: "14px",
    color: "var(--white-dim)",
    lineHeight: 1.6,
  },
  docsSection: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  docCard: {
    padding: "32px",
    borderRadius: "16px",
    background: "var(--glass-bg)",
    border: "1px solid var(--glass-border)",
  },
  docCardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "22px",
    fontWeight: 600,
    color: "var(--white)",
    marginBottom: "12px",
  },
  docCardDesc: {
    fontSize: "14px",
    color: "var(--white-dim)",
    lineHeight: 1.6,
    marginBottom: "20px",
  },
  docList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  docListItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    fontSize: "13px",
    color: "var(--white)",
    padding: "8px 0",
    borderBottom: "1px solid var(--glass-border)",
  },
  docListItemLast: {
    borderBottom: "none",
  },
  pricingSection: {
    textAlign: "center" as const,
    padding: "80px 48px",
  },
  pricingCard: {
    display: "inline-block",
    padding: "40px 48px",
    borderRadius: "16px",
    background: "rgba(13,148,136,0.1)",
    border: "1px solid var(--teal-border)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  },
  pricingLabel: {
    fontSize: "12px",
    fontWeight: 500,
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--teal)",
    marginBottom: "8px",
  },
  pricingAmount: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "56px",
    fontWeight: 600,
    color: "var(--white)",
    marginBottom: "8px",
  },
  pricingCompare: {
    fontSize: "14px",
    color: "var(--white-dim)",
    marginBottom: "24px",
  },
  pricingFeatures: {
    display: "flex",
    gap: "24px",
    justifyContent: "center",
    marginBottom: "32px",
  },
  pricingFeature: {
    fontSize: "13px",
    color: "var(--white-dim)",
  },
  footer: {
    padding: "48px",
    borderTop: "1px solid var(--glass-border)",
  },
  footerInner: {
    maxWidth: "1100px",
    margin: "0 auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLogo: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "18px",
    fontWeight: 600,
    color: "var(--white)",
  },
  footerLogoSpan: {
    color: "var(--teal)",
  },
  footerLinks: {
    display: "flex",
    gap: "24px",
    listStyle: "none",
  },
  footerLink: {
    color: "var(--white-dim)",
    textDecoration: "none",
    fontSize: "13px",
    transition: "color 0.2s",
  },
  footerCopy: {
    fontSize: "12px",
    color: "var(--white-dim)",
    opacity: 0.6,
  },
  statueOverlay: {
    position: "fixed" as const,
    right: "-60px",
    bottom: "-40px",
    zIndex: 0,
    opacity: 0.045,
    width: "580px",
  },
};

// Statue of Liberty SVG component
function StatueOfLiberty() {
  return (
    <svg className="statue-overlay" style={styles.statueOverlay} viewBox="0 0 200 300" fill="none">
      <path d="M100 10 L120 30 L120 80 L130 80 L130 100 L140 100 L140 290 L60 290 L60 100 L70 100 L70 80 L80 80 L80 30 Z" fill="#f0ede6" />
      <path d="M100 10 L100 5" stroke="#f0ede6" strokeWidth="2" />
      <circle cx="100" cy="0" r="3" fill="#f0ede6" />
      <path d="M90 35 L110 35 L105 50 L95 50 Z" fill="#f0ede6" />
    </svg>
  );
}

// 50-star pattern (simplified)
function StarsPattern() {
  return (
    <svg
      className="stars-overlay"
      style={{
        position: "fixed",
        top: "100px",
        left: "50px",
        zIndex: 0,
        opacity: 0.06,
      }}
      width="200"
      height="200"
      viewBox="0 0 100 100"
    >
      {[...Array(25)].map((_, i) => (
        <text
          key={i}
          x={((i % 5) * 20) + 5}
          y={Math.floor(i / 5) * 20 + 10}
          fontSize="8"
          fill="#f0ede6"
        >
          ★
        </text>
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <div style={styles.page}>
      <StatueOfLiberty />
      <StarsPattern />

      {/* Navigation */}
      <nav style={styles.nav}>
        <Link href="/" style={styles.navLogo}>
          e2go<span style={styles.navLogoSpan}>.app</span>
        </Link>
        <ul style={styles.navLinks}>
          <li>
            <Link href="/quiz" style={styles.navLink}>
              Quiz
            </Link>
          </li>
          <li>
            <Link href="/pricing" style={styles.navLink}>
              Pricing
            </Link>
          </li>
        </ul>
        <Link href="/login" style={styles.navCta}>
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section style={styles.hero}>
        <div>
          <div style={styles.heroEyebrow}>
            <span style={styles.heroEyebrowLine} />
            E-2 Visa Preparation
          </div>
          <h1 style={styles.heroHeadline}>
            Your visa package,<br />
            <em style={styles.heroHeadlineEm}>built right.</em>
          </h1>
          <p style={styles.heroSub}>
            Answer the questions. We build every document your consulate needs — formatted, cross-checked, and ready to submit.
          </p>
          <div style={styles.heroActions}>
            <Link href="/quiz" style={styles.btnPrimary}>
              Take the free eligibility quiz →
            </Link>
            <Link href="#how-it-works" style={styles.btnGhost}>
              See what we build
            </Link>
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass" style={{ ...styles.glass, ...styles.heroCard }}>
          <h3 style={styles.heroCardTitle}>By the numbers</h3>
          <div style={{ ...styles.heroCardStat, ...styles.heroCardStatLast }}>
            <div style={styles.heroCardStatIcon}>📄</div>
            <div>
              <div style={styles.heroCardStatLabel}>Documents generated</div>
              <div style={styles.heroCardStatValue}>17 per application</div>
            </div>
          </div>
          <div style={styles.heroCardStat}>
            <div style={styles.heroCardStatIcon}>🌍</div>
            <div>
              <div style={styles.heroCardStatLabel}>Treaty countries supported</div>
              <div style={styles.heroCardStatValue}>82 nations</div>
            </div>
          </div>
          <div style={styles.heroCardStat}>
            <div style={styles.heroCardStatIcon}>📏</div>
            <div>
              <div style={styles.heroCardStatLabel}>Page limit enforced</div>
              <div style={styles.heroCardStatValue}>50 pages</div>
            </div>
          </div>
          <div style={{ ...styles.heroCardStat, ...styles.heroCardStatLast }}>
            <div style={styles.heroCardStatIcon}>💰</div>
            <div>
              <div style={styles.heroCardStatLabel}>vs. average attorney</div>
              <div style={styles.heroCardStatValue}>$297 vs $13,000</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section style={{ ...styles.section, paddingTop: 0 }}>
        <div style={styles.trustBar}>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>✓</div>
            <div style={styles.trustLabel}>Official U.S. government sources</div>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>⚡</div>
            <div style={styles.trustLabel}>15-minute eligibility quiz</div>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>🔒</div>
            <div style={styles.trustLabel}>Auto-save every answer</div>
          </div>
          <div style={styles.trustItem}>
            <div style={styles.trustIcon}>🛡️</div>
            <div style={styles.trustLabel}>Risk flags before they trip you up</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={styles.section} id="how-it-works">
        <div style={styles.sectionEyebrow}>
          <span style={styles.sectionEyebrowLine} />
          How it works
        </div>
        <h2 style={styles.sectionTitle}>From eligibility to submission</h2>
        <div style={styles.howGrid}>
          <div className="glass" style={styles.stepCard}>
            <div style={styles.stepNumber}>01</div>
            <h3 style={styles.stepTitle}>Take the quiz</h3>
            <p style={styles.stepDesc}>
              26 questions. One at a time. We adapt based on your answers to surface exactly what matters for your case.
            </p>
          </div>
          <div className="glass" style={styles.stepCard}>
            <div style={styles.stepNumber}>02</div>
            <h3 style={styles.stepTitle}>See your profile</h3>
            <p style={styles.stepDesc}>
              Get a clear eligibility result with any risk flags explained in plain English — before you pay a cent.
            </p>
          </div>
          <div className="glass" style={styles.stepCard}>
            <div style={styles.stepNumber}>03</div>
            <h3 style={styles.stepTitle}>Build your package</h3>
            <p style={styles.stepDesc}>
              Answer guided questions. We generate consulate-formatted documents. Pay only when you&apos;re ready to proceed.
            </p>
          </div>
        </div>
      </section>

      {/* Documents Section */}
      <section style={styles.section}>
        <div style={styles.sectionEyebrow}>
          <span style={styles.sectionEyebrowLine} />
          What we build
        </div>
        <h2 style={styles.sectionTitle}>Every document your application needs</h2>
        <div style={styles.docsSection}>
          <div className="glass" style={styles.docCard}>
            <h3 style={styles.docCardTitle}>Batch 1 — Immediate</h3>
            <p style={styles.docCardDesc}>
              Generated immediately once you unlock the application
            </p>
            <ul style={styles.docList}>
              <li style={{ ...styles.docListItem, ...styles.docListItemLast }}>✓ Cover Letter</li>
              <li style={styles.docListItem}>✓ Business Plan Executive Summary</li>
              <li style={styles.docListItem}>✓ Investment Memorandum</li>
              <li style={styles.docListItem}>✓ Source of Funds Statement</li>
            </ul>
          </div>
          <div className="glass" style={styles.docCard}>
            <h3 style={styles.docCardTitle}>Batch 2 — Prerequisites</h3>
            <p style={styles.docCardDesc}>
              Generated as you complete prerequisite questions
            </p>
            <ul style={styles.docList}>
              <li style={styles.docListItem}>✓ Treaty Nationality Evidence</li>
              <li style={styles.docListItem}>✓ Business Structure Overview</li>
              <li style={styles.docListItem}>✓ Market Analysis</li>
              <li style={{ ...styles.docListItem, ...styles.docListItemLast }}>✓ + 10 more documents</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Band */}
      <section style={styles.pricingSection}>
        <div style={styles.pricingCard}>
          <div style={styles.pricingLabel}>Founding Member Pricing</div>
          <div style={styles.pricingAmount}>$297</div>
          <div style={styles.pricingCompare}>vs. $13,000 average attorney fee</div>
          <div style={styles.pricingFeatures}>
            <span style={styles.pricingFeature}>One-time</span>
            <span style={styles.pricingFeature}>•</span>
            <span style={styles.pricingFeature}>Lifetime access</span>
            <span style={styles.pricingFeature}>•</span>
            <span style={styles.pricingFeature}>No subscription</span>
          </div>
          <Link href="/pricing" style={styles.btnPrimary}>
            View all pricing tiers →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div style={styles.footerLogo}>
            e2go<span style={styles.footerLogoSpan}>.app</span>
          </div>
          <ul style={styles.footerLinks}>
            <li>
              <Link href="/quiz" style={styles.footerLink}>
                Quiz
              </Link>
            </li>
            <li>
              <Link href="/pricing" style={styles.footerLink}>
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/login" style={styles.footerLink}>
                Sign In
              </Link>
            </li>
          </ul>
          <div style={styles.footerCopy}>
            Not a law firm. For preparation only.
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes statueDrift {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        .glass:hover {
          background: var(--glass-hover);
          transform: translateY(-4px);
        }
        .statue-overlay {
          animation: statueDrift 30s ease-in-out infinite;
          pointer-events: none;
        }
        .stars-overlay {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
