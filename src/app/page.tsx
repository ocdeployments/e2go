"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import ComparisonSection from "@/components/landing/ComparisonSection";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [statsAnimated, setStatsAnimated] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsAnimated(true);
        }
      },
      { threshold: 0.5 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const docTabs = [
    { letter: "A", name: "DS-160 Reference", desc: "Personal and travel history", badge: "Ready immediately" },
    { letter: "B", name: "Document Checklist", desc: "Every required document itemized", badge: "Ready immediately" },
    { letter: "C", name: "Visa Category Letter", desc: "Treaty eligibility confirmation", badge: "Ready immediately" },
    { letter: "D", name: "Cover Letter", desc: "Your personal investor narrative", badge: "Ready immediately" },
    { letter: "E", name: "Proof of Nationality", desc: "Treaty country eligibility", badge: "Ready immediately" },
    { letter: "F", name: "Investment Proof", desc: "Funds deployed and at risk", badge: "After LLC formation" },
    { letter: "G", name: "Business Evidence", desc: "Real and operating enterprise", badge: "After LLC formation" },
    { letter: "H", name: "Source of Funds", desc: "Complete paper trail narrative", badge: "After LLC formation" },
    { letter: "I", name: "Non-Marginality Evidence", desc: "Job creation and viability", badge: "After LLC formation" },
    { letter: "J", name: "Investor Qualifications", desc: "Experience and org chart", badge: "Ready immediately" },
    { letter: "K", name: "Business Plan", desc: "Complete operational and financial plan", badge: "After LLC formation" },
    { letter: "L", name: "Family Dependents", desc: "Spouse and children information", badge: "Ready immediately" },
  ];

  const pricingCards = [
    { price: "$297", name: "Solo", desc: "One investor", features: ["Complete application package", "All 11 tabs generated", "Confidence score", "2 interview simulator sessions"] },
    { price: "$347", name: "Solo + Spouse", desc: "Investor + spouse", popular: true, features: ["Complete application package", "All 11 tabs generated", "Confidence score", "2 interview simulator sessions", "Spouse dependent documents"] },
    { price: "$397", name: "Family", desc: "Investor + spouse + up to 2 children", features: ["Complete application package", "All 11 tabs generated", "Confidence score", "2 interview simulator sessions", "Spouse dependent documents", "Children dependent documents"] },
  ];

  return (
    <main style={{ background: "#0a0a0a", minHeight: "100vh", position: "relative" }}>
      {/* Noise + Gold Pulse */}
      <div className="noise-overlay" />
      <div className="gold-pulse" />

      {/* Navigation */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: scrolled ? "16px 48px" : "24px 48px",
          background: scrolled ? "rgba(10,10,10,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(201,168,76,0.15)" : "none",
          transition: "all 0.3s ease",
        }}
      >
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C" }}>e2go</span>
        </Link>
        <ul style={{ display: "flex", gap: "32px", listStyle: "none", margin: 0, padding: 0 }} className="mobile-hidden">
          {["How It Works", "What You Get", "Pricing", "Learn"].map((link) => (
            <li key={link}>
              <Link href={`#${link.toLowerCase().replace(/ /g, "-")}`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 400, color: "rgba(245,240,232,0.70)", textDecoration: "none", transition: "color 0.2s ease" }}>
                {link}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/quiz" style={{ background: "#C9A84C", color: "#0a0a0a", padding: "10px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, textDecoration: "none", transition: "all 0.2s ease" }}>
          Check My Eligibility →
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display: "none", background: "none", border: "none", color: "#C9A84C", fontSize: "24px", cursor: "pointer" }}
          className="mobile-menu-btn"
        >
          ☰
        </button>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div style={{ position: "fixed", inset: 0, background: "#0a0a0a", zIndex: 99, padding: "100px 24px 24px" }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "24px" }}>
            {["How It Works", "What You Get", "Pricing", "Learn"].map((link) => (
              <li key={link}>
                <Link href={`#${link.toLowerCase().replace(/ /g, "-")}`} onClick={() => setMobileMenuOpen(false)} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", color: "#f5f0e8", textDecoration: "none" }}>
                  {link}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hero Section */}
      <section style={{ padding: "140px 48px 80px", maxWidth: "1100px", margin: "0 auto" }}>
        <h1 className="hero-headline" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "72px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "16px" }}>
          Your E-2 Visa Application.<br />
          <em style={{ fontStyle: "italic", color: "#C9A84C" }}>Built to Pass.</em>
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "20px", fontWeight: 300, color: "rgba(245,240,232,0.70)", maxWidth: "600px", lineHeight: 1.6, marginBottom: "32px" }}>
          Answer our questions. We analyze your case, identify every gap, and generate a complete consulate-formatted application package — without the $15,000 attorney fee.
        </p>
        <div style={{ display: "flex", gap: "16px", marginBottom: "32px", flexWrap: "wrap" }}>
          <Link href="/quiz" className="btn-gold-animate" style={{ background: "#C9A84C", color: "#0a0a0a", padding: "14px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
            Check My Eligibility — Free
          </Link>
          <Link href="#what-you-get" style={{ border: "1px solid rgba(201,168,76,0.50)", color: "#C9A84C", padding: "14px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 400, textDecoration: "none", display: "inline-block" }}>
            See What&apos;s Included
          </Link>
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 300, color: "rgba(245,240,232,0.45)" }}>
          82 treaty countries · Toronto consulate specialists · 15 denial risks checked automatically
        </p>
      </section>

      {/* Stat Strip */}
      <section ref={statsRef} style={{ borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.03)", padding: "48px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px" }}>
          {[
            { number: "82", label: "TREATY COUNTRIES" },
            { number: "11", label: "APPLICATION TABS COVERED" },
            { number: "15", label: "DENIAL RISKS CHECKED" },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "48px", fontWeight: 300, fontStyle: "italic", color: "#C9A84C", opacity: statsAnimated ? 1 : 0, transform: statsAnimated ? "translateY(0)" : "translateY(10px)", transition: "all 0.6s ease", transitionDelay: `${i * 0.15}s` }}>
                {stat.number}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 300, color: "rgba(245,240,232,0.50)", textTransform: "uppercase", letterSpacing: "0.15em", marginTop: "8px" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Problem Contrast */}
      <section style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px" }}>
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, fontStyle: "italic", color: "rgba(245,240,232,0.40)", marginBottom: "32px" }}>The traditional path</h3>
            {[
              { left: "$6,500–$15,000 in attorney fees" },
              { left: "Weeks of back-and-forth emails" },
              { left: "You never see what goes in your documents" },
              { left: "No way to know if you're prepared" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid rgba(201,168,76,0.12)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.35)", textDecoration: "line-through" }}>
                {item.left}
              </div>
            ))}
          </div>
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, fontStyle: "italic", color: "#C9A84C", marginBottom: "32px" }}>With e2go</h3>
            {[
              { right: "✓ From $297 — founding member pricing" },
              { right: "✓ Complete in your own time, at your pace" },
              { right: "✓ Every document traces to your exact answers" },
              { right: "✓ Confidence score across 8 dimensions" },
            ].map((item, i) => (
              <div key={i} style={{ padding: "16px 0", borderBottom: "1px solid rgba(201,168,76,0.12)", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 400, color: "#f5f0e8" }}>
                <span className="gold-check" style={{ marginRight: "12px" }}>✓</span>
                {item.right.replace("✓ ", "")}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 500, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px" }}>THE PROCESS</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 300, color: "#f5f0e8", marginBottom: "48px" }}>
          From your first answer to your completed binder.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {[
            { num: "01", title: "Answer", desc: "Tell us about your investment, your business, and your background. Takes 20–40 minutes." },
            { num: "02", title: "We Analyze", desc: "Our engine checks your answers against 15 real denial patterns and scores your case across 8 dimensions." },
            { num: "03", title: "Download", desc: "Your complete, consulate-formatted application binder. Every tab. Every document. Ready to print." },
          ].map((step, i) => (
            <div key={i} className="card" style={{ padding: "32px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "56px", fontWeight: 300, fontStyle: "italic", color: "#C9A84C", opacity: 0.4, lineHeight: 1, marginBottom: "16px" }}>{step.num}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 500, color: "#f5f0e8", marginBottom: "8px" }}>{step.title}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Section */}
      <ComparisonSection />

      {/* Document Binder */}
      <section id="what-you-get" style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 500, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px" }}>WHAT&apos;S INCLUDED</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 300, color: "#f5f0e8", marginBottom: "16px" }}>
          A complete, consulate-formatted application package.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", marginBottom: "48px" }}>
          Every document your officer expects to see. In the right order. At the right length.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {docTabs.map((tab, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px", borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 300, fontStyle: "italic", color: "#C9A84C", minWidth: "24px" }}>{tab.letter}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 500, color: "#f5f0e8", marginBottom: "4px" }}>{tab.name}</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 300, color: "rgba(245,240,232,0.50)" }}>{tab.desc}</div>
              </div>
              <span style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "12px", border: tab.badge === "Ready immediately" ? "1px solid #C9A84C" : "1px solid rgba(245,240,232,0.25)", color: tab.badge === "Ready immediately" ? "#C9A84C" : "rgba(245,240,232,0.35)", fontFamily: "'DM Sans', sans-serif", fontWeight: 400 }}>
                {tab.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Confidence Score */}
      <section style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "48px", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 500, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px" }}>MODULE 4</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", marginBottom: "24px" }}>
              Know your application&apos;s strength before you walk in.
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6, marginBottom: "16px" }}>
              After you complete your application materials, our engine scores your case across 8 dimensions — the same criteria a consular officer evaluates.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", lineHeight: 1.6, marginBottom: "24px" }}>
              See exactly where you&apos;re strong and where you need more work — before it costs you an appointment.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 300, fontStyle: "italic", color: "rgba(245,240,232,0.35)" }}>
              This reflects preparation completeness — not a legal determination of E-2 eligibility.
            </p>
          </div>
          <div className="card" style={{ padding: "32px", textAlign: "center", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "64px", fontWeight: 300, fontStyle: "italic", color: "#C9A84C" }}>74<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "24px", fontWeight: 300, color: "rgba(245,240,232,0.30)" }}>/100</span></div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(245,240,232,0.50)", marginBottom: "24px" }}>Application Readiness</div>
            <div style={{ textAlign: "left" }}>
              {["Substantiality", "Fund Source", "Non-Marginality", "Active Direction", "Business Plan", "Qualifications", "Real Enterprise", "Intent"].map((dim, i) => (
                <div key={i} style={{ marginBottom: "8px" }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(245,240,232,0.50)", marginBottom: "4px" }}>{dim}</div>
                  <div style={{ height: "4px", background: "rgba(201,168,76,0.12)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${60 + Math.random() * 35}%`, background: "#C9A84C", borderRadius: "2px" }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 300, color: "rgba(245,240,232,0.30)", marginTop: "16px" }}>Example score — your results will vary</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "10px", fontWeight: 500, color: "#C9A84C", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "16px" }}>FOUNDING MEMBER PRICING</div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "42px", fontWeight: 300, color: "#f5f0e8", marginBottom: "16px" }}>
            Simple, transparent pricing.
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 300, color: "rgba(245,240,232,0.60)", marginBottom: "16px" }}>
            14-day money-back guarantee for the first 50 members.
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, color: "#C9A84C", marginBottom: "48px" }}>[ 47 ] founding member spots remaining</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "900px", margin: "0 auto" }}>
          {pricingCards.map((card, i) => (
            <div key={i} className="card" style={{ padding: "32px", textAlign: "center", border: card.popular ? "1px solid rgba(201,168,76,0.50)" : "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)", position: "relative" }}>
              {card.popular && (
                <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", background: "#0a0a0a", border: "1px solid #C9A84C", color: "#C9A84C", padding: "4px 12px", fontFamily: "'DM Sans', sans-serif", fontSize: "11px", fontWeight: 500 }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "48px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>{card.price}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 500, color: "#f5f0e8", marginBottom: "4px" }}>{card.name}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 300, color: "rgba(245,240,232,0.50)", marginBottom: "24px" }}>{card.desc}</div>
              <div style={{ textAlign: "left", marginBottom: "24px" }}>
                {card.features.map((feat, j) => (
                  <div key={j} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", fontWeight: 400, color: "#f5f0e8", marginBottom: "8px" }}>
                    <span style={{ color: "#C9A84C", marginRight: "8px" }}>✓</span>
                    {feat}
                  </div>
                ))}
              </div>
              <Link href="/quiz" style={{ background: "#C9A84C", color: "#0a0a0a", padding: "12px 24px", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, textDecoration: "none", display: "block" }}>
                Get Started →
              </Link>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 300, color: "rgba(245,240,232,0.45)", textAlign: "center", marginTop: "24px" }}>
          Partnership applications from $497. Additional dependents $25 each.
        </p>
      </section>

      {/* Trust Signals */}
      <section style={{ padding: "80px 48px", maxWidth: "1100px", margin: "0 auto", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "48px" }}>
          {[
            { title: "Preparation tool. Not a law firm.", body: "Every sentence in every document traces directly to an answer you provided. We never infer, invent, or make legal conclusions on your behalf." },
            { title: "Your data stays yours.", body: "We store your answers — never your actual documents, passport scans, or bank statements. Documents are generated fresh and downloaded directly." },
            { title: "14-day money-back guarantee.", body: "For founding members. Start and decide it&apos;s not right within 14 days, before generating documents, we refund in full." },
          ].map((trust, i) => (
            <div key={i} style={{ position: "relative", padding: "24px" }}>
              <div style={{ position: "absolute", top: 0, left: 0, width: "24px", height: "24px", borderTop: "2px solid #C9A84C", borderLeft: "2px solid #C9A84C" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "24px", height: "24px", borderBottom: "2px solid #C9A84C", borderRight: "2px solid #C9A84C" }} />
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, color: "#f5f0e8", marginBottom: "12px" }}>{trust.title}</h3>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "15px", fontWeight: 300, color: "rgba(245,240,232,0.65)", lineHeight: 1.6 }}>{trust.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "80px 48px", textAlign: "center", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div style={{ width: "40%", height: "1px", background: "rgba(201,168,76,0.30)", margin: "0 auto 48px" }} />
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "56px", fontWeight: 300, color: "#f5f0e8", maxWidth: "700px", margin: "0 auto 24px", lineHeight: 1.2 }}>
          Your consulate interview is closer than you think.
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "18px", fontWeight: 300, color: "rgba(245,240,232,0.60)", maxWidth: "500px", margin: "0 auto 32px" }}>
          The eligibility check takes 10 minutes. It&apos;s free. No account required to start. You&apos;ll know exactly where you stand.
        </p>
        <BorderRotate
          animationSpeed={6}
          borderWidth={1}
          borderRadius={0}
          animationMode="rotate-on-hover"
          className="inline-block"
        >
          <Link href="/quiz" className="btn-gold-animate" style={{ background: "#C9A84C", color: "#0a0a0a", padding: "18px 40px", fontFamily: "'DM Sans', sans-serif", fontSize: "16px", fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
            Check My Eligibility →
          </Link>
        </BorderRotate>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(245,240,232,0.30)", marginTop: "16px" }}>
          No credit card required · Takes 10 minutes
        </p>
        <div style={{ width: "40%", height: "1px", background: "rgba(201,168,76,0.30)", margin: "48px auto 0" }} />
      </section>

      {/* Footer */}
      <footer style={{ padding: "48px 48px 32px", borderTop: "1px solid rgba(201,168,76,0.12)", background: "#0a0a0a" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "32px" }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 300, color: "#C9A84C" }}>e2go</span>
          </div>
          <div style={{ display: "flex", gap: "48px" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {["How It Works", "What You Get", "Pricing"].map((link) => (
                <li key={link}>
                  <Link href={`#${link.toLowerCase().replace(/ /g, "-")}`} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(245,240,232,0.50)", textDecoration: "none" }}>{link}</Link>
                </li>
              ))}
            </ul>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { label: "Learn", href: "/learn" },
                { label: "Quiz", href: "/quiz" },
                { label: "Login", href: "/login" },
                { label: "Sign Up", href: "/signup" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "13px", color: "rgba(245,240,232,0.50)", textDecoration: "none" }}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div style={{ maxWidth: "280px" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(245,240,232,0.30)", lineHeight: 1.5 }}>
              e2go is a document preparation tool — not a law firm and not a licensed immigration consultant.
            </p>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "32px", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "12px", fontWeight: 300, color: "rgba(245,240,232,0.25)" }}>
            © 2026 e2go.app — All rights reserved
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          .mobile-hidden { display: none !important; }
        }
      `}</style>
    </main>
  );
}
