
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { BorderRotate } from "@/components/ui/animated-gradient-border";

const SZ = {
  xs: { display: "block" as const, width: "12px", height: "12px", minWidth: "12px", flexShrink: 0 },
  sm: { display: "block" as const, width: "16px", height: "16px", minWidth: "16px", flexShrink: 0 },
  md: { display: "block" as const, width: "20px", height: "20px", minWidth: "20px", flexShrink: 0 },
  lg: { display: "block" as const, width: "24px", height: "24px", minWidth: "24px", flexShrink: 0 },
};

export default function PricingPage() {
  const handleSelect = () => {
    alert("Coming soon! Stripe integration to be added.");
  };

  const [applicationCount, setApplicationCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      const supabase = createBrowserSupabaseClient();
      const { count } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true });
      setApplicationCount(count || 0);
      setLoading(false);
    };
    fetchCount();
  }, []);

  const spotsRemaining = Math.max(0, 500 - applicationCount);

  const tiers = [
    {
      name: "Solo Individual",
      price: 247,
      description: "Full case builder for single applicant",
      features: [
        "Full Case Builder",
        "Business Plan Generator",
        "6-Pillar Analysis",
        "PDF Package Export",
      ],
      recommended: true,
    },
    {
      name: "Solo Couple",
      price: 297,
      description: "Everything in Individual + spouse",
      features: [
        "Everything in Individual",
        "Spouse EAD application prep",
      ],
      recommended: false,
    },
    {
      name: "Solo Family",
      price: 347,
      description: "Everything in Couple + children",
      features: [
        "Everything in Couple",
        "Minor children dependency forms",
      ],
      recommended: false,
    },
    {
      name: "Solo Extended",
      price: 397,
      description: "Everything in Family + partner",
      features: [
        "Everything in Family",
        "Additional business partner inclusion",
      ],
      recommended: false,
    },
  ];

  const stats = [
    { value: "54,364", label: "E-2 visas issued FY2024" },
    { value: "90%", label: "Global approval rate FY2024" },
    { value: "3–6 weeks", label: "Typical Toronto processing" },
    { value: "$0", label: "Hidden fees" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              e2go<span style={{ color: "#f5f0e8" }}>.app</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden md:block text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
              Sign In
            </Link>
            <Link
              href="/quiz"
              className="text-sm font-medium px-4 py-2"
              style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm mb-6" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 0 }}>
              <svg style={{ ...SZ.sm, color: "#C9A84C" }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#C9A84C" }}>U.S. E-2 VISA SPECIALIST</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Choose Your Solo Path
            </h1>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "rgba(245,240,232,0.6)" }}>
              Unlock your professional visa application package. One-time fee, lifetime access.
            </p>
          </div>

          {/* Founding Member Counter */}
          {!loading && (
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 0 }}>
                <svg style={{ ...SZ.md, color: "#f59e0b" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                <span className="text-sm font-medium" style={{ color: "#f59e0b" }}>
                  {spotsRemaining} of 500 founding spots remaining
                </span>
              </div>
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto mb-12">
            {tiers.map((tier) => {
              const card = (
                <div
                  className="relative p-6 transition-all"
                  style={{
                    background: "rgba(201,168,76,0.02)",
                    border: tier.recommended ? "1px solid transparent" : "1px solid rgba(201,168,76,0.12)",
                    borderRadius: 0,
                  }}
                >
                  {/* Founding Member Badge */}
                  <div className="absolute -top-3 left-6 text-xs font-semibold px-3 py-1 flex items-center gap-1" style={{ background: "#C9A84C", color: "#0a0a0a" }}>
                    <svg style={SZ.xs} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    FOUNDING MEMBER PRICING
                  </div>

                  {tier.recommended && (
                    <div className="absolute -top-3 right-6 text-xs font-semibold px-3 py-1 flex items-center gap-1" style={{ background: "#C9A84C", color: "#0a0a0a" }}>
                      <svg style={SZ.xs} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      MOST POPULAR
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex-1 pt-2">
                      <h3 className="text-xl font-semibold mb-1" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>{tier.name}</h3>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold" style={{ color: tier.recommended ? "#C9A84C" : "#f5f0e8" }}>
                          ${tier.price}
                        </span>
                        <span className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>USD</span>
                      </div>
                    </div>

                    <div className="flex-1">
                      <ul className="space-y-2 mb-4">
                        {tier.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                            <svg style={{ ...SZ.sm, color: "#C9A84C" }} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={handleSelect}
                        className="w-full font-medium py-3 transition-colors"
                        style={tier.recommended
                          ? { background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }
                          : { border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: 0 }}
                      >
                        {tier.recommended ? "Get Started" : `Select ${tier.name}`}
                      </button>
                    </div>
                  </div>
                </div>
              );

              if (tier.recommended) {
                return (
                  <BorderRotate
                    key={tier.name}
                    animationSpeed={10}
                    borderWidth={1}
                    borderRadius={0}
                    className="flex-1 flex flex-col"
                  >
                    {card}
                  </BorderRotate>
                );
              }

              return <div key={tier.name}>{card}</div>;
            })}
          </div>

          {/* Guarantee Section */}
          <div className="mb-12" style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center" style={{ width: "48px", height: "48px", minWidth: "48px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <svg style={{ ...SZ.lg, color: "#22c55e" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  Founding Member Guarantee
                </h3>
                <p className="text-sm mb-4" style={{ color: "rgba(245,240,232,0.6)" }}>
                  If you are not satisfied within 14 days of purchase, we will refund your payment
                  in full minus payment processing fees.
                </p>
                <div className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                  <p className="mb-2"><strong>To qualify:</strong> Request within 14 days of purchase, Module 1 started but no documents generated.</p>
                  <p>Email <a href="mailto:support@e2go.app" style={{ color: "#C9A84C", textDecoration: "underline" }}>support@e2go.app</a> — we respond within 2 business days. No forms. No arguments.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 max-w-2xl mx-auto" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg style={{ ...SZ.sm, color: "#C9A84C" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                Secure payment via Stripe
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg style={{ ...SZ.sm, color: "#C9A84C" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                </svg>
                256-bit encryption
              </div>
              <div className="flex items-center gap-2 text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                <svg style={{ ...SZ.sm, color: "#C9A84C" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                100% money-back guarantee
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Section */}
      <section className="py-12 px-4" style={{ borderTop: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((stat, i) => (
            <div key={i}>
              <p className="text-2xl md:text-3xl font-bold mb-1" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>{stat.value}</p>
              <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4" style={{ background: "#0a0a0a", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm and does not provide legal representation or immigration
            services. For legal advice, consult a qualified U.S. immigration attorney.
          </p>
        </div>
      </footer>
    </div>
  );
}
