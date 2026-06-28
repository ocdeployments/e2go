import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutButton } from "@/components/checkout/CheckoutButton";

export const metadata: Metadata = {
  title: "Standalone Modules — FDD Analysis, Market Analysis, Business Plan | e2go",
  description: "Use e2go's intelligence modules à la carte — FDD Analysis, Market Analysis, and E-2 Business Plan available individually or as a bundle.",
};

const MODULES = [
  {
    id: "fdd",
    tag: "Franchise buyers",
    headline: "FDD Intelligence",
    price: "$495",
    priceNote: "one-time · per FDD",
    href: "/fdd",
    checkoutTierId: "fdd_intelligence",
    badge: "Unique to e2go",
    description:
      "Most franchise buyers receive a 200-page Franchise Disclosure Document and have no idea what an immigration officer will look for in it. Five dedicated engines extract, score, and cross-reference the items that matter — then inject those findings directly into your application documents.",
    engine: "5 engines: extraction (4-pass, 50-field schema) · scoring · territory · questions generator · report. Findings injected into 7 of your 15 application documents.",
    what: [
      "Item 7 — minimum investment validation vs. your committed capital",
      "Item 19 — unit economics, AUV, and break-even modelling",
      "Item 20 — territory density via Census ACS ZCTA + Google Places",
      "Item 21 — franchisor financial health flags",
      "Red-flag scoring: litigation history, termination rates, system defaults",
      "E-2 suitability verdict injected into Cover Letter + Visa Category Memo",
    ],
    forWhom: "You have received or are about to receive an FDD and want to know whether this franchise is a viable E-2 investment — before you sign anything.",
    notFor: "Applicants not pursuing a franchise path.",
  },
  {
    id: "market",
    tag: "All business types",
    headline: "Market Analysis",
    price: "$295",
    priceNote: "one-time · per business",
    href: "/market-analysis",
    checkoutTierId: undefined,
    badge: "Consulate-ready output",
    description:
      "A consular officer reading your Business Plan expects real market evidence. Generic claims about growing industries fail. The Market Analysis engine pulls real data for your exact sector and geography — then injects it directly into your Business Plan's market sections.",
    engine: "Census ACS 5-year + BLS employment statistics + competitive landscape data. Output embedded directly into Business Plan — not appended as an afterthought.",
    what: [
      "TAM/SAM sizing for your specific sector and geography",
      "Competitive landscape — local and regional competitors identified",
      "Census ACS 5-year demographic and economic data anchors",
      "BLS employment statistics for your NAICS category",
      "Industry growth benchmarks for employment projections",
      "Non-marginality narrative hook with data citations included",
    ],
    forWhom: "Anyone building an E-2 application who needs credible market data in their Business Plan — new concepts, acquisitions, and franchises all benefit.",
    notFor: null,
  },
  {
    id: "business-plan",
    tag: "All business types",
    headline: "E-2 Business Plan",
    price: "$695",
    priceNote: "one-time · standalone",
    href: "/results",
    checkoutTierId: undefined,
    badge: "Archetype-tailored",
    description:
      "The Business Plan is the most scrutinised document in an E-2 file. Attorneys charge $3,000–$5,000 for one. Ours is produced by claude-opus-4-8 in hours — with your gap analysis, investor archetype, and market data all loaded into a single structured prompt. Formatted to your consulate's confirmed page limits.",
    engine: "4 investor archetypes × consulate-specific formatting. Gap analysis context injected into every section. Market Analysis included. Page budgets tracked in real time.",
    what: [
      "Executive summary with investment thesis and archetype framing",
      "Business description — products, services, competitive advantage",
      "Market Analysis included: Census + BLS data, competitive landscape",
      "3-year financial projections with stated assumptions",
      "Employment creation plan — timeline, roles, salaries",
      "Develop-and-direct argument structured to your archetype",
      "Operational plan with pre-opening milestones",
      "Formatted to your consulate's confirmed page allocation",
    ],
    forWhom: "An investor who already has their source of funds and legal structure sorted and specifically needs a polished, consulate-ready Business Plan — without purchasing the full $1,495 package.",
    notFor: null,
  },
];

const BUNDLE = {
  headline: "All Three Modules",
  price: "$1,195",
  priceNote: "FDD + Market Analysis + Business Plan · save $290",
  href: "/results",
  items: ["FDD Intelligence ($495)", "Market Analysis ($295)", "E-2 Business Plan ($695)"],
};

export default function ModulesPage() {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>
            e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <Link href="/results" style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>Full Package</Link>
          <Link href="/quiz" style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 16px", border: "1px solid rgba(201,168,76,0.4)" }}>Start Free Assessment</Link>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "60px 40px" }}>

        {/* Header */}
        <div style={{ marginBottom: "52px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Standalone modules</div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, margin: "0 0 14px" }}>
            Intelligence tools.<br />Buy what you need.
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.6)", lineHeight: 1.7, maxWidth: "520px", margin: 0 }}>
            The full $1,495 package includes all three modules plus 12 additional documents and the Interview Simulator. If you only need a specific piece, you can purchase it here — individually or as a bundle.
          </p>
          <div style={{ marginTop: "16px", padding: "11px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", display: "inline-block", fontSize: "11px", color: "rgba(245,240,232,0.6)" }}>
            Already have the complete package? These modules are included — no additional purchase needed.
          </div>
        </div>

        {/* Module cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginBottom: "48px" }}>
          {MODULES.map((mod) => (
            <div key={mod.id} style={{ border: "1px solid rgba(201,168,76,0.3)", background: "rgba(201,168,76,0.012)" }}>
              <div style={{ padding: "28px 32px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "18px" }}>
                  <div>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.45)" }}>{mod.tag}</span>
                      <span style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#C9A84C", padding: "2px 6px", border: "1px solid rgba(201,168,76,0.35)" }}>{mod.badge}</span>
                    </div>
                    <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 300, color: "#f5f0e8", margin: 0 }}>{mod.headline}</h2>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{mod.price}</div>
                    <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.4)", marginTop: "3px" }}>{mod.priceNote}</div>
                  </div>
                </div>

                <p style={{ fontSize: "12px", color: "rgba(245,240,232,0.72)", lineHeight: 1.7, marginBottom: "14px" }}>{mod.description}</p>

                <div style={{ marginBottom: "18px", padding: "9px 12px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.14)", borderLeft: "2px solid rgba(201,168,76,0.45)", fontSize: "10px", color: "rgba(201,168,76,0.75)", lineHeight: 1.6 }}>
                  <span style={{ letterSpacing: "0.1em", textTransform: "uppercase", fontSize: "8px", color: "rgba(201,168,76,0.5)", display: "block", marginBottom: "3px" }}>Engine</span>
                  {mod.engine}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginBottom: "20px" }}>
                  {mod.what.map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(245,240,232,0.75)", lineHeight: 1.5 }}>
                      <span style={{ color: "#C9A84C", flexShrink: 0 }}>→</span><span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* For whom */}
              <div style={{ margin: "0 32px", padding: "14px 0", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.38)", marginBottom: "5px" }}>Right for you if</div>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6 }}>{mod.forWhom}</div>
                {mod.notFor && (
                  <div style={{ fontSize: "10.5px", color: "rgba(245,240,232,0.38)", marginTop: "5px" }}>Not applicable: {mod.notFor}</div>
                )}
              </div>

              {/* CTA row */}
              <div style={{ padding: "16px 32px 20px", display: "flex", gap: "14px", alignItems: "center" }}>
                {mod.checkoutTierId ? (
                  <CheckoutButton
                    tierId={mod.checkoutTierId}
                    label={`Get ${mod.headline}`}
                    redirectOnAuth="/modules"
                  />
                ) : (
                  <Link href={mod.href} style={{ display: "inline-block", padding: "13px 24px", background: "#C9A84C", color: "#0a0a0a", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
                    Get {mod.headline}
                  </Link>
                )}
                <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.35)" }}>or get all three for $1,195 →</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bundle card */}
        <div style={{ border: "1px solid rgba(201,168,76,0.6)", padding: "32px", background: "rgba(201,168,76,0.03)", marginBottom: "52px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "20px", marginBottom: "20px" }}>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.65)", marginBottom: "8px" }}>Best value</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", margin: 0 }}>{BUNDLE.headline}</h2>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "42px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{BUNDLE.price}</div>
              <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.45)", marginTop: "3px" }}>{BUNDLE.priceNote}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", marginBottom: "24px" }}>
            {BUNDLE.items.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(245,240,232,0.78)" }}>
                <span style={{ color: "#5DCAA5" }}>✓</span><span>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <Link href={BUNDLE.href} style={{ display: "inline-block", padding: "15px 30px", background: "#C9A84C", color: "#0a0a0a", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
              Get the Bundle
            </Link>
            <Link href="/results" style={{ fontSize: "12px", color: "rgba(201,168,76,0.8)", textDecoration: "none" }}>
              Or get everything (15 docs + simulator) for $1,495 →
            </Link>
          </div>
        </div>

        {/* Compare to full package */}
        <div style={{ padding: "28px 32px", border: "1px solid rgba(245,240,232,0.06)", background: "rgba(245,240,232,0.018)", marginBottom: "52px" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,240,232,0.38)", marginBottom: "12px" }}>Compare</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "rgba(245,240,232,0.55)", marginBottom: "10px" }}>Standalone modules</div>
              {["FDD Intelligence — $495", "Market Analysis — $295", "E-2 Business Plan — $695", "Bundle (all three) — $1,195"].map((item, i) => (
                <div key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.6)", marginBottom: "5px" }}>· {item}</div>
              ))}
            </div>
            <div style={{ borderLeft: "1px solid rgba(201,168,76,0.15)", paddingLeft: "24px" }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#C9A84C", marginBottom: "10px" }}>Complete package — $1,495</div>
              {[
                "FDD + Market Analysis + Business Plan included",
                "12 additional documents (cover letter, source of funds, qualifications, etc.)",
                "Gap Analysis — 6 evidence categories",
                "Interview Simulator — 3 sessions",
                "Consulate-specific formatting",
              ].map((item, i) => (
                <div key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.72)", marginBottom: "5px" }}>→ {item}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.35)", lineHeight: 1.7, borderTop: "1px solid rgba(245,240,232,0.06)", paddingTop: "24px" }}>
          e2go.app is a self-service preparation tool, not a law firm. Module outputs are drafted documents for your review — not legal advice. Consult a qualified U.S. immigration attorney before filing.
        </div>
      </div>
    </div>
  );
}
