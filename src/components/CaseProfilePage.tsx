"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CaseProfileResponse } from "@/app/api/dashboard/case-profile/route";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD    = "#C9A84C";
const CREAM   = "#f5f0e8";
const GREEN   = "#5DCAA5";
const CARD_BG = "#111007";
const BORDER  = "rgba(201,168,76,0.13)";
const INNER   = "rgba(201,168,76,0.07)";

// ── Field status ───────────────────────────────────────────────────────────────
type Status = "have" | "module" | "needed" | "optional";

interface FieldDef {
  label: string;
  value?: string | null;
  status: Status;
  note: string;
  href?: string;
}

// ── Outcome vocabulary ─────────────────────────────────────────────────────────
const OUTCOME_MAP: Record<string, { label: string; color: string }> = {
  strong:               { label: "Strong — Eligible",                         color: GREEN },
  proceed:              { label: "Strong — Eligible",                         color: GREEN },
  borderline:           { label: "Borderline — Strengthen before filing",     color: GOLD },
  proceed_risk:         { label: "Eligible — strengthen key areas",           color: GOLD },
  caution:              { label: "Caution — Address concerns before filing",  color: "#fbbf24" },
  attorney_recommended: { label: "Complex — Legal guidance recommended",      color: "#fbbf24" },
  ineligible:           { label: "Ineligible — Consult an attorney",          color: "#f87171" },
};

const ARCHETYPE_LABEL: Record<string, string> = {
  buyer:          "Franchise Buyer",
  builder:        "Business Builder",
  career_switcher:"Career Switcher",
  investor:       "Capital Investor",
};

// ── Sidebar nav sections ───────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "progress",    num: "01", label: "Application Progress" },
  { id: "investor",    num: "02", label: "The Investor" },
  { id: "business",    num: "03", label: "The Business" },
  { id: "investment",  num: "04", label: "The Investment" },
  { id: "intelligence",num: "05", label: "Case Intelligence" },
  { id: "interview",   num: "06", label: "Interview Readiness" },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  return (
    <nav style={{
      position: "sticky",
      top: "88px",
      width: "160px",
      flexShrink: 0,
      alignSelf: "flex-start",
    }}>
      {/* Title */}
      <div style={{
        fontSize: "7px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.3)",
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: "16px",
        paddingLeft: "12px",
      }}>
        Case Sections
      </div>

      {NAV_SECTIONS.map(({ id, num, label }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            style={{
              display: "block",
              textDecoration: "none",
              padding: "9px 12px",
              borderLeft: `2px solid ${isActive ? "rgba(201,168,76,0.6)" : "rgba(245,240,232,0.05)"}`,
              marginBottom: "1px",
              background: isActive ? "rgba(201,168,76,0.04)" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.14em",
              color: isActive ? "rgba(201,168,76,0.7)" : "rgba(245,240,232,0.2)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "2px",
              transition: "color 0.15s",
            }}>
              {num}
            </div>
            <div style={{
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              color: isActive ? CREAM : "rgba(245,240,232,0.32)",
              fontWeight: isActive ? 500 : 400,
              lineHeight: 1.35,
              transition: "color 0.15s",
            }}>
              {label}
            </div>
          </a>
        );
      })}

      {/* Divider + back link */}
      <div style={{
        height: "1px",
        background: INNER,
        margin: "16px 0 12px",
      }} />
      <Link href="/dashboard" style={{
        display: "block",
        padding: "8px 12px",
        fontSize: "10px",
        fontFamily: "'DM Sans', sans-serif",
        color: "rgba(201,168,76,0.35)",
        textDecoration: "none",
        letterSpacing: "0.04em",
      }}>
        ← Dashboard
      </Link>
    </nav>
  );
}

// ── Dot indicator ──────────────────────────────────────────────────────────────
function Dot({ status }: { status: Status }) {
  const cfg: Record<Status, { fill: string; border: string }> = {
    have:     { fill: GREEN,            border: GREEN },
    module:   { fill: "transparent",    border: "rgba(201,168,76,0.5)" },
    needed:   { fill: "transparent",    border: "rgba(248,113,113,0.6)" },
    optional: { fill: "transparent",    border: "rgba(245,240,232,0.2)" },
  };
  const { fill, border } = cfg[status];
  return (
    <span style={{
      display: "inline-block",
      width: "5px", height: "5px",
      borderRadius: "50%",
      background: fill,
      border: `1.5px solid ${border}`,
      flexShrink: 0,
      marginTop: "5px",
    }} />
  );
}

// ── Field row ──────────────────────────────────────────────────────────────────
function FieldRow({ label, value, status, note, href }: FieldDef) {
  const textColor: Record<Status, string> = {
    have:     CREAM,
    module:   "rgba(245,240,232,0.28)",
    needed:   "rgba(248,113,113,0.5)",
    optional: "rgba(245,240,232,0.2)",
  };
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "7px 0",
      borderBottom: `1px solid ${INNER}`,
    }}>
      <Dot status={status} />
      <span style={{
        fontSize: "11px",
        fontFamily: "'DM Sans', sans-serif",
        color: "rgba(245,240,232,0.38)",
        minWidth: "148px",
        flexShrink: 0,
        lineHeight: 1.6,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif",
        color: textColor[status],
        fontStyle: (status === "have" || !note) ? "normal" : "italic",
        flex: 1,
        lineHeight: 1.6,
      }}>
        {status === "have" && value ? value : note}
        {status === "module" && href && (
          <Link href={href} style={{
            marginLeft: "8px",
            color: "rgba(201,168,76,0.38)",
            fontSize: "10px",
            fontStyle: "normal",
            textDecoration: "none",
          }}>→</Link>
        )}
      </span>
      {status === "needed" && (
        <span style={{
          fontSize: "7px",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.12em",
          color: "rgba(248,113,113,0.55)",
          border: "1px solid rgba(248,113,113,0.2)",
          padding: "2px 5px",
          flexShrink: 0,
          alignSelf: "center",
        }}>
          REQUIRED
        </span>
      )}
    </div>
  );
}

// ── Subsection ─────────────────────────────────────────────────────────────────
function Sub({ title, fields }: { title: string; fields: FieldDef[] }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "8px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.38)",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        marginBottom: "4px",
        paddingBottom: "4px",
        borderBottom: `1px solid ${INNER}`,
      }}>
        {title}
      </div>
      {fields.map((f, i) => <FieldRow key={i} {...f} />)}
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({
  id,
  number,
  title,
  description,
  haveCount,
  totalCount,
  ctaLabel,
  ctaHref,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  haveCount: number;
  totalCount: number;
  ctaLabel?: string;
  ctaHref?: string;
  children: React.ReactNode;
}) {
  const pct = totalCount > 0 ? Math.round((haveCount / totalCount) * 100) : 0;
  const barColor = pct >= 75 ? GREEN : pct >= 30 ? GOLD : "rgba(248,113,113,0.6)";

  return (
    <div id={id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, marginBottom: "12px" }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "8px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.4)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: "4px",
          }}>
            {number}
          </div>
          <div style={{
            fontSize: "20px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            color: CREAM,
            letterSpacing: "0.01em",
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.32)",
            marginTop: "4px",
          }}>
            {description}
          </div>
        </div>

        {/* Completion counter */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: "18px",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            color: haveCount > 0 ? GOLD : "rgba(245,240,232,0.2)",
          }}>
            {haveCount}<span style={{ fontSize: "12px", color: "rgba(245,240,232,0.25)" }}>/{totalCount}</span>
          </div>
          <div style={{
            width: "60px",
            height: "2px",
            background: "rgba(245,240,232,0.06)",
            marginTop: "4px",
            marginLeft: "auto",
          }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width 0.5s ease" }} />
          </div>
          <div style={{
            fontSize: "9px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.2)",
            marginTop: "3px",
          }}>
            fields collected
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 4px" }}>
        {children}
      </div>

      {/* CTA footer */}
      {ctaLabel && ctaHref && (
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${INNER}` }}>
          <Link href={ctaHref} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            border: `1px solid rgba(201,168,76,0.55)`,
            background: "rgba(201,168,76,0.05)",
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: GOLD,
            textDecoration: "none",
          }}>
            {ctaLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────────
function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const color = score == null ? "rgba(245,240,232,0.1)"
    : score >= 75 ? GREEN
    : score >= 50 ? GOLD
    : "#f87171";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.45)" }}>{label}</span>
        <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color, fontWeight: 600 }}>
          {score != null ? `${score}%` : "—"}
        </span>
      </div>
      <div style={{ height: "2px", background: "rgba(245,240,232,0.06)" }}>
        <div style={{ height: "100%", width: `${score ?? 0}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Milestone ──────────────────────────────────────────────────────────────────
function Milestone({ label, done, active, href }: { label: string; done: boolean; active?: boolean; href: string }) {
  return (
    <Link href={done ? "#" : href} style={{ textDecoration: "none", pointerEvents: done ? "none" : "auto" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        opacity: done ? 0.5 : active ? 1 : 0.42,
      }}>
        <div style={{
          width: "10px", height: "10px",
          borderRadius: "50%",
          background: done ? GREEN : active ? GOLD : "rgba(245,240,232,0.12)",
          border: done ? "none" : active ? `2px solid ${GOLD}` : "1.5px solid rgba(245,240,232,0.2)",
          boxShadow: active ? "0 0 8px rgba(201,168,76,0.5)" : "none",
        }} />
        <span style={{
          fontSize: "9px",
          fontFamily: "'DM Sans', sans-serif",
          color: done ? "rgba(93,202,165,0.7)" : active ? CREAM : "rgba(245,240,232,0.35)",
          textAlign: "center",
          textDecoration: done ? "line-through" : "none",
          maxWidth: "76px",
          lineHeight: 1.4,
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// ── Main page component ────────────────────────────────────────────────────────

export default function CaseProfilePage() {
  const [data, setData]         = useState<CaseProfileResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeSection, setActiveSection] = useState("investor");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/case-profile")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!data) return;
    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [data]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(201,168,76,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          Loading case file…
        </span>
      </div>
    );
  }

  if (!data) return null;

  // ── Derived state ────────────────────────────────────────────────────────────
  const quizDone      = Boolean(data.quizCompletedAt);
  const m1Done        = Boolean(data.module1CompletedAt);
  const m2Done        = Boolean(data.module2CompletedAt);
  const m3Done        = Boolean(data.module3CompletedAt);
  const m4Done        = Boolean(data.module4CompletedAt);
  const m5Done        = Boolean(data.module5CompletedAt);
  const gapDone       = data.completenessScore != null;
  const simDone       = Boolean(data.lastSimSessionNumber);
  const isFranchise   = /franchise|franchis/i.test(data.businessType ?? "");
  const fullName      = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
  const archetypeLabel = data.archetype ? (ARCHETYPE_LABEL[data.archetype] ?? data.archetype) : null;
  const outcome       = data.quizOutcome ? (OUTCOME_MAP[data.quizOutcome.toLowerCase()] ?? null) : null;
  const quizAnswers   = data.quizAnswers ?? {};

  const eyebrow: React.CSSProperties = {
    fontSize: "8px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(201,168,76,0.4)",
    fontFamily: "'DM Sans', sans-serif",
  };

  // ── SECTION 1: THE INVESTOR ──────────────────────────────────────────────────

  const identityFields: FieldDef[] = [
    {
      label: "Full Name",
      value: fullName,
      status: fullName ? "have" : "module",
      note: "Collected at account creation",
    },
    {
      label: "Treaty Nationality",
      value: data.treatyCountry,
      status: data.treatyCountry ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Investor Archetype",
      value: archetypeLabel,
      status: archetypeLabel ? "have" : "module",
      note: "Derived after onboarding is complete",
      href: "/apply/story",
    },
    {
      label: "Date of Birth",
      value: null,
      status: "needed",
      note: "Required on DS-160 visa application form — not yet collected",
    },
    {
      label: "Passport Number",
      value: null,
      status: "needed",
      note: "Required for visa application — not yet collected",
    },
    {
      label: "Passport Expiry",
      value: null,
      status: "needed",
      note: "Must be valid at interview date — not yet collected",
    },
  ];

  const backgroundFields: FieldDef[] = [
    {
      label: "Education Level",
      value: null,
      status: "module",
      note: "Collects from Onboarding — Section 2",
      href: "/apply/story",
    },
    {
      label: "Field of Study",
      value: null,
      status: "module",
      note: "Collects from Onboarding — Section 2",
      href: "/apply/story",
    },
    {
      label: "Years of Relevant Experience",
      value: null,
      status: "module",
      note: "Collects from Onboarding — work history section",
      href: "/apply/story",
    },
    {
      label: "Prior U.S. Visa History",
      value: null,
      status: "module",
      note: "Collects from Onboarding — travel history",
      href: "/apply/story",
    },
    {
      label: "Prior Visa Denials",
      value: null,
      status: "module",
      note: "Collects from Onboarding — consulate asks this at interview",
      href: "/apply/story",
    },
    {
      label: "Criminal History Declaration",
      value: null,
      status: "needed",
      note: "Required self-declaration — not yet a field in our schema",
    },
  ];

  const intentFields: FieldDef[] = [
    {
      label: "Business Path",
      value: isFranchise ? "Franchise purchase" : data.businessType ? "Own business" : null,
      status: data.businessType ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Dependents Applying",
      value: quizAnswers["Q0-dependents"] ?? null,
      status: quizAnswers["Q0-dependents"] ? "have" : "module",
      note: "Collects from Onboarding — affects derivative E-2 applications",
      href: "/apply/story",
    },
    {
      label: "Current Country of Residence",
      value: null,
      status: "module",
      note: "Collects from Onboarding — needed for consulate assignment",
      href: "/apply/story",
    },
    {
      label: "Intended U.S. State / City",
      value: null,
      status: "module",
      note: "Collects from Onboarding — shows intent to direct business",
      href: "/apply/story",
    },
  ];

  const s1Have  = [...identityFields, ...backgroundFields, ...intentFields].filter(f => f.status === "have").length;
  const s1Total = identityFields.length + backgroundFields.length + intentFields.length;

  // ── SECTION 2: APPLICATION PROGRESS (milestones) ─────────────────────────────

  const milestones = [
    { label: "Eligibility Quiz",       done: quizDone, href: "/quiz" },
    { label: "Onboarding",             done: m1Done,   href: "/apply/story" },
    { label: "Business Profile",       done: m2Done,   href: "/apply/business" },
    { label: "Investment & Documents", done: m3Done,   href: "/apply/investment" },
    { label: "Gap Analysis",           done: m4Done,   href: "/gap-analysis" },
    { label: "Document Generation",    done: m5Done,   href: "/apply/generate" },
    { label: "Interview Preparation",  done: simDone,  href: "/simulator" },
  ];

  const milestoneDone = milestones.filter(m => m.done).length;
  const activeIndex   = milestones.findIndex(m => !m.done);

  // ── SECTION 3: THE BUSINESS ──────────────────────────────────────────────────

  const entityFields: FieldDef[] = [
    {
      label: "Business Legal Name",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "Entity Type",
      value: null,
      status: "module",
      note: "LLC / S-Corp / C-Corp — Module 2",
      href: "/apply/business",
    },
    {
      label: "EIN (Tax ID)",
      value: null,
      status: "needed",
      note: "Employer Identification Number — required for business plan docs, not yet in schema",
    },
    {
      label: "U.S. Business Address",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "State of Incorporation",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "Industry / NAICS Code",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
  ];

  const roleFields: FieldDef[] = [
    {
      label: "Investor's Job Title",
      value: null,
      status: "module",
      note: "Collects from Business Profile — the role you will manage day-to-day",
      href: "/apply/business",
    },
    {
      label: "Day-to-Day Duties",
      value: null,
      status: "module",
      note: "Collects from Business Profile — critical: E-2 requires active management",
      href: "/apply/business",
    },
    {
      label: "Qualifications for Role",
      value: null,
      status: "module",
      note: "Collects from Qualifications section — ties your experience to the business role",
      href: "/apply/qualifications",
    },
    {
      label: "Year 1 U.S. Employee Count",
      value: null,
      status: "module",
      note: "Collects from Business Profile — job creation is a key E-2 requirement",
      href: "/apply/business",
    },
    {
      label: "Non-Marginality Evidence",
      value: null,
      status: "needed",
      note: "Business must generate more than minimal living — narrative not yet in schema",
    },
    {
      label: "Organizational Chart",
      value: null,
      status: "needed",
      note: "Shows management structure to consulate — document upload not yet built",
    },
  ];

  const franchiseFields: FieldDef[] = isFranchise ? [
    {
      label: "Franchise Brand",
      value: null,
      status: "module",
      note: "Collects from FDD upload — or enter in Business Profile",
      href: "/fdd",
    },
    {
      label: "Franchisor Name",
      value: null,
      status: "module",
      note: "Collects from FDD analysis — Module 2",
      href: "/fdd",
    },
    {
      label: "FDD Analyses Run",
      value: data.fddCount > 0 ? `${data.fddCount} FDD ${data.fddCount === 1 ? "analysis" : "analyses"} complete` : null,
      status: data.fddCount > 0 ? "have" : "module",
      note: "Upload your Franchise Disclosure Document to unlock intelligence scoring",
      href: "/fdd",
    },
    {
      label: "Territory / Location",
      value: null,
      status: "module",
      note: "Collects from Market Analysis — territory viability analysis",
      href: "/market-analysis",
    },
    {
      label: "Franchise Agreement Date",
      value: null,
      status: "module",
      note: "Collects from Investment & Documents — Module 3",
      href: "/apply/investment",
    },
    {
      label: "Royalty & Fee Structure",
      value: null,
      status: "module",
      note: "Extracted from FDD during analysis",
      href: "/fdd",
    },
  ] : [
    {
      label: "Business Description",
      value: null,
      status: "module",
      note: "Collects from Business Profile — what you sell, to whom",
      href: "/apply/business",
    },
    {
      label: "Products / Services",
      value: null,
      status: "module",
      note: "Collects from Business Profile — used in business plan generation",
      href: "/apply/business",
    },
    {
      label: "Target Customer Profile",
      value: null,
      status: "module",
      note: "Collects from Business Profile — essential for market analysis",
      href: "/apply/business",
    },
    {
      label: "Market Territory",
      value: null,
      status: "module",
      note: "Collects from Market Analysis — ZIP / city / metro area",
      href: "/market-analysis",
    },
    {
      label: "Revenue Projections (Y1–Y3)",
      value: null,
      status: "needed",
      note: "Required for business plan — not yet a structured field in schema",
    },
    {
      label: "Competitive Positioning",
      value: null,
      status: "optional",
      note: "Strengthens non-marginality argument — pulls from Market Analysis",
    },
  ];

  const s3Have  = [...entityFields, ...roleFields, ...franchiseFields].filter(f => f.status === "have").length;
  const s3Total = entityFields.length + roleFields.length + franchiseFields.length;

  // ── SECTION 4: THE INVESTMENT ────────────────────────────────────────────────

  const capitalFields: FieldDef[] = [
    {
      label: "Investment Range",
      value: data.investmentRange,
      status: data.investmentRange ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Precise Investment Amount",
      value: null,
      status: "module",
      note: "Collects from Investment & Documents — Module 3",
      href: "/apply/investment",
    },
    {
      label: "At-Risk Declaration",
      value: null,
      status: "module",
      note: "Collects from Module 3 — funds must be irrevocably committed to the business",
      href: "/apply/investment",
    },
    {
      label: "Investment Committed Date",
      value: null,
      status: "module",
      note: "Collects from Module 3 — date investment was placed in the business",
      href: "/apply/investment",
    },
  ];

  const breakdownFields: FieldDef[] = [
    {
      label: "Franchise Fee / Purchase Price",
      value: null,
      status: "module",
      note: "Collects from Module 3 — largest single investment line item",
      href: "/apply/investment",
    },
    {
      label: "Equipment & Fixtures",
      value: null,
      status: "module",
      note: "Collects from Module 3 — physical business assets",
      href: "/apply/investment",
    },
    {
      label: "Working Capital",
      value: null,
      status: "module",
      note: "Collects from Module 3 — operating cash reserves for 3–6 months",
      href: "/apply/investment",
    },
    {
      label: "Lease Deposits",
      value: null,
      status: "module",
      note: "Collects from Module 3 — first/last month rent, security deposit",
      href: "/apply/investment",
    },
    {
      label: "Inventory",
      value: null,
      status: "module",
      note: "Collects from Module 3 — initial stock for operations",
      href: "/apply/investment",
    },
    {
      label: "Professional & Legal Fees",
      value: null,
      status: "module",
      note: "Collects from Module 3 — attorney, CPA, franchise consultant fees",
      href: "/apply/investment",
    },
  ];

  const sourceFields: FieldDef[] = [
    {
      label: "Source of Funds Type",
      value: null,
      status: "module",
      note: "Collects from Module 3 — savings / sale of property / gift / loan / inheritance",
      href: "/apply/investment",
    },
    {
      label: "Origin Country of Funds",
      value: null,
      status: "module",
      note: "Collects from Module 3 — required for anti-money-laundering compliance",
      href: "/apply/investment",
    },
    {
      label: "Funds in U.S. Account",
      value: null,
      status: "module",
      note: "Collects from Module 3 — confirms funds are accessible",
      href: "/apply/investment",
    },
    {
      label: "Source Narrative",
      value: null,
      status: "needed",
      note: "Written explanation of funds origin — structured narrative field not yet in schema",
    },
  ];

  const docsFields: FieldDef[] = [
    {
      label: "Bank Statements (6 months)",
      value: null,
      status: "module",
      note: "Upload in Module 3 — primary evidence of funds availability",
      href: "/apply/investment",
    },
    {
      label: "Wire Transfer Confirmations",
      value: null,
      status: "module",
      note: "Upload in Module 3 — proves capital movement into the business",
      href: "/apply/investment",
    },
    {
      label: "Purchase Agreement / LOI",
      value: null,
      status: "module",
      note: "Upload in Module 3 — franchise agreement or business purchase contract",
      href: "/apply/investment",
    },
    {
      label: "Business Appraisal",
      value: null,
      status: "optional",
      note: "Strengthens substantiality argument for existing business acquisition",
    },
    {
      label: "Gift Letter",
      value: null,
      status: "optional",
      note: "Required if source of funds includes a gift from a third party",
    },
  ];

  const s4Have  = [...capitalFields, ...breakdownFields, ...sourceFields, ...docsFields].filter(f => f.status === "have").length;
  const s4Total = capitalFields.length + breakdownFields.length + sourceFields.length + docsFields.length;

  // ── SECTION 5: CASE INTELLIGENCE ────────────────────────────────────────────

  const gapFields: FieldDef[] = [
    {
      label: "Overall Case Readiness",
      value: data.completenessScore != null ? `${data.completenessScore}%` : null,
      status: data.completenessScore != null ? "have" : "module",
      note: "Computed after Gap Analysis — scores your case across 3 dimensions",
      href: "/gap-analysis",
    },
    {
      label: "Source of Funds Score",
      value: data.sourceOfFundsScore != null ? `${data.sourceOfFundsScore}%` : null,
      status: data.sourceOfFundsScore != null ? "have" : "module",
      note: "Measures quality and documentation of funds",
      href: "/gap-analysis",
    },
    {
      label: "Management Role Score",
      value: data.managementRoleScore != null ? `${data.managementRoleScore}%` : null,
      status: data.managementRoleScore != null ? "have" : "module",
      note: "Measures evidence of your day-to-day operational role",
      href: "/gap-analysis",
    },
    {
      label: "Business Plan Score",
      value: data.businessPlanScore != null ? `${data.businessPlanScore}%` : null,
      status: data.businessPlanScore != null ? "have" : "module",
      note: "Scores coherence, viability, and substantiality of business plan",
      href: "/gap-analysis",
    },
    {
      label: "Top Priority Evidence Gap",
      value: null,
      status: gapDone ? "module" : "module",
      note: "Surfaces after Gap Analysis — your single most impactful gap to close",
      href: "/gap-analysis",
    },
    {
      label: "Non-Marginality Assessment",
      value: null,
      status: "needed",
      note: "Structured score for business viability beyond minimal living — not yet in gap engine",
    },
  ];

  // FDD-specific fields — franchise users only
  const fddIntelFields: FieldDef[] = isFranchise ? [
    {
      label: "FDD Item 19 Performance",
      value: data.fddCount > 0 ? "Extracted from FDD" : null,
      status: data.fddCount > 0 ? "have" : "module",
      note: "Financial performance representations from the disclosure document",
      href: "/fdd",
    },
    {
      label: "E-2 Suitability Rating",
      value: null,
      status: "module",
      note: "Computed by FDD analysis engine — rates franchise for E-2 suitability",
      href: "/fdd",
    },
  ] : [];

  // Market analysis fields — all users
  const marketHasData = data.marketScore != null;
  const marketFields: FieldDef[] = [
    {
      label: "Territory Score",
      value: data.marketScore != null ? `${data.marketScore}/100 — ${data.marketRating ?? ""}`.trim() : null,
      status: data.marketScore != null ? "have" : "module",
      note: "Overall viability of your target market for E-2 investment purposes",
      href: "/market-analysis",
    },
    {
      label: "Target ZIP / State",
      value: data.marketZip && data.marketState ? `${data.marketZip}, ${data.marketState}` : (data.marketZip ?? null),
      status: data.marketZip != null ? "have" : "module",
      note: "Geographic target area for your business location",
      href: "/market-analysis",
    },
    {
      label: "Competitor Count (nearby)",
      value: data.marketCompetitorCount != null ? `${data.marketCompetitorCount} in area` : null,
      status: data.marketCompetitorCount != null ? "have" : "module",
      note: "Supports non-marginality argument — number of comparable businesses in your target zone",
      href: "/market-analysis",
    },
    {
      label: "Market Verdict",
      value: marketHasData ? (data.marketVerdict ?? "Analysis complete") : null,
      status: marketHasData ? "have" : "module",
      note: "Plain-language summary of territory viability from the analysis engine",
      href: "/market-analysis",
    },
    {
      label: "Industry Benchmark",
      value: null,
      status: "module",
      note: "Investment comparison against comparable businesses in your market",
      href: "/market-analysis",
    },
    {
      label: "Business Valuation Benchmark",
      value: null,
      status: "optional",
      note: "Comparative valuation strengthens the substantiality of investment argument",
    },
  ];

  const s5Have  = [...gapFields, ...fddIntelFields, ...marketFields].filter(f => f.status === "have").length;
  const s5Total = gapFields.length + fddIntelFields.length + marketFields.length;

  // ── SECTION 6: INTERVIEW READINESS ──────────────────────────────────────────

  const simFields: FieldDef[] = [
    {
      label: "Sessions Completed",
      value: data.lastSimSessionNumber != null ? `${data.lastSimSessionNumber} sessions` : null,
      status: data.lastSimSessionNumber != null ? "have" : "module",
      note: "Start a simulator session — available any time, no case file required",
      href: "/simulator",
    },
    {
      label: "Interview Readiness",
      value: data.simReadiness
        ? data.simReadiness === "ready" ? "Interview ready"
          : data.simReadiness === "nearly_ready" ? "Nearly ready"
          : "Needs more practice"
        : null,
      status: data.simReadiness ? "have" : "module",
      note: "Computed after first simulator session",
      href: "/simulator",
    },
    {
      label: "Primary Coaching Focus",
      value: data.simCoachingNotes ? "See coaching notes below" : null,
      status: data.simCoachingNotes ? "have" : "module",
      note: "Top coaching note surfaces after simulator session",
      href: "/simulator",
    },
    {
      label: "Strong Answer Areas",
      value: null,
      status: "module",
      note: "Identified after 2+ sessions — shows where your case is solid",
      href: "/simulator",
    },
  ];

  const dossierFields: FieldDef[] = [
    {
      label: "Interview Dossier",
      value: data.prepKitId
        ? `Generated ${data.prepKitCreatedAt ? new Date(data.prepKitCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}`
        : null,
      status: data.prepKitId ? "have" : "module",
      note: "Requires at least 1 simulator session to generate",
      href: "/simulator/prep-kit",
    },
    {
      label: "Personalised Q&A Set",
      value: null,
      status: data.prepKitId ? "have" : "module",
      note: "Case-specific questions and coached answers — generated with dossier",
      href: "/simulator/prep-kit",
    },
    {
      label: "Red Flag Alert Areas",
      value: null,
      status: "module",
      note: "Case-specific risks the consulate is likely to probe — from your case data",
      href: "/simulator",
    },
  ];

  const s6Have  = [...simFields, ...dossierFields].filter(f => f.status === "have").length;
  const s6Total = simFields.length + dossierFields.length;

  // ── Overview totals ──────────────────────────────────────────────────────────

  const overview = [
    { label: "Progress",     have: milestoneDone, total: milestones.length },
    { label: "Investor",     have: s1Have,        total: s1Total },
    { label: "Business",     have: s3Have,        total: s3Total },
    { label: "Investment",   have: s4Have,        total: s4Total },
    { label: "Intelligence", have: s5Have,        total: s5Total },
    { label: "Interview",    have: s6Have,        total: s6Total },
  ];

  const totalHave  = overview.reduce((a, b) => a + b.have, 0);
  const totalTotal = overview.reduce((a, b) => a + b.total, 0);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: "80px" }}>

      {/* Top nav bar */}
      <div style={{
        borderBottom: `1px solid ${INNER}`,
        padding: "14px 32px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        background: "rgba(17,16,7,0.8)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{
          fontSize: "10px",
          letterSpacing: "0.08em",
          color: "rgba(201,168,76,0.4)",
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: "none",
        }}>
          ← Dashboard
        </Link>
        <span style={{ color: "rgba(245,240,232,0.08)", fontSize: "10px" }}>|</span>
        <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.18)", fontFamily: "'DM Sans', sans-serif" }}>
          My E-2 Case Record
        </span>
      </div>

      {/* Full-width header area */}
      <div style={{ maxWidth: "1060px", margin: "0 auto", padding: "40px 32px 0" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ ...eyebrow, marginBottom: "8px" }}>E-2 Investor Case File</div>
          <div style={{
            fontSize: "36px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            color: CREAM,
            lineHeight: 1.15,
            marginBottom: "8px",
          }}>
            {fullName ?? "My Case Profile"}
          </div>
          <div style={{
            fontSize: "13px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.38)",
            marginBottom: "12px",
          }}>
            {[
              data.treatyCountry,
              archetypeLabel,
              data.investmentRange && `Investing ${data.investmentRange}`,
              isFranchise ? "Franchise path" : data.businessType ? "Own business" : null,
            ].filter(Boolean).join("  ·  ")}
          </div>
          {outcome && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              border: `1px solid ${outcome.color}28`,
              background: `${outcome.color}0D`,
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: outcome.color, display: "inline-block" }} />
              <span style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: outcome.color, fontWeight: 600, letterSpacing: "0.04em" }}>
                {outcome.label}
              </span>
            </div>
          )}
        </div>

        {/* Completeness overview strip */}
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          gap: "0",
          alignItems: "stretch",
        }}>
          <div style={{ flex: 1, paddingRight: "20px", borderRight: `1px solid ${INNER}`, marginRight: "20px" }}>
            <div style={{ ...eyebrow, marginBottom: "4px" }}>Case Completeness</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
              <span style={{ fontSize: "28px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: GOLD }}>
                {totalHave}
              </span>
              <span style={{ fontSize: "13px", color: "rgba(245,240,232,0.25)", fontFamily: "'DM Sans', sans-serif" }}>
                / {totalTotal} fields
              </span>
            </div>
            <div style={{ height: "2px", background: "rgba(245,240,232,0.05)", marginTop: "6px" }}>
              <div style={{ height: "100%", width: `${Math.round((totalHave / totalTotal) * 100)}%`, background: GOLD }} />
            </div>
          </div>
          <div style={{
            flex: 3,
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: "8px",
            alignItems: "center",
          }}>
            {overview.map(({ label, have, total }) => {
              const pct = total > 0 ? Math.round((have / total) * 100) : 0;
              const col = pct >= 70 ? GREEN : pct >= 25 ? GOLD : "rgba(248,113,113,0.55)";
              return (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.25)", fontFamily: "'DM Sans', sans-serif", marginBottom: "5px" }}>
                    {label}
                  </div>
                  <div style={{ height: "3px", background: "rgba(245,240,232,0.05)", marginBottom: "4px" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: col }} />
                  </div>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: have > 0 ? col : "rgba(245,240,232,0.15)", fontWeight: 600 }}>
                    {have}/{total}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "28px", flexWrap: "wrap" }}>
          {[
            { fill: GREEN,           border: GREEN,                      label: "We have this" },
            { fill: "transparent",   border: "rgba(201,168,76,0.5)",     label: "Collects from a step" },
            { fill: "transparent",   border: "rgba(248,113,113,0.6)",    label: "Required — not yet in schema" },
            { fill: "transparent",   border: "rgba(245,240,232,0.18)",   label: "Optional / strengthens case" },
          ].map(({ fill, border, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: fill, border: `1.5px solid ${border}`, display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.32)" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Sidebar + content layout ─────────────────────────────────── */}
        <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

          {/* Sidebar */}
          <Sidebar active={activeSection} />

          {/* Section content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── 01 APPLICATION PROGRESS ─────────────────────────────── */}
            <div id="progress" style={{ background: CARD_BG, border: `1px solid ${BORDER}`, marginBottom: "12px" }}>
              <div style={{
                padding: "18px 24px 14px",
                borderBottom: `1px solid ${BORDER}`,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
              }}>
                <div>
                  <div style={{ ...eyebrow, marginBottom: "4px" }}>01</div>
                  <div style={{ fontSize: "20px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: CREAM }}>
                    Application Progress
                  </div>
                  <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.32)", marginTop: "4px" }}>
                    Seven-step build sequence — from eligibility quiz to submission-ready
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "18px", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300, color: milestoneDone > 0 ? GOLD : "rgba(245,240,232,0.2)" }}>
                    {milestoneDone}<span style={{ fontSize: "12px", color: "rgba(245,240,232,0.25)" }}>/{milestones.length}</span>
                  </div>
                  <div style={{ width: "60px", height: "2px", background: "rgba(245,240,232,0.06)", marginTop: "4px", marginLeft: "auto" }}>
                    <div style={{ height: "100%", width: `${Math.round((milestoneDone / milestones.length) * 100)}%`, background: GOLD }} />
                  </div>
                  <div style={{ fontSize: "9px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.2)", marginTop: "3px" }}>steps complete</div>
                </div>
              </div>

              <div style={{ padding: "24px 24px 20px" }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    position: "absolute",
                    top: "5px",
                    left: "40px",
                    right: "40px",
                    height: "1px",
                    background: "rgba(245,240,232,0.05)",
                  }} />
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${milestones.length}, 1fr)`, gap: "4px" }}>
                    {milestones.map((m, i) => (
                      <Milestone
                        key={m.label}
                        label={m.label}
                        done={m.done}
                        active={i === activeIndex}
                        href={m.href}
                      />
                    ))}
                  </div>
                </div>

                {activeIndex >= 0 && (
                  <div style={{
                    marginTop: "20px",
                    padding: "12px 16px",
                    background: "rgba(201,168,76,0.04)",
                    borderLeft: "2px solid rgba(201,168,76,0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: "8px", letterSpacing: "0.12em", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "2px" }}>
                        NEXT STEP
                      </div>
                      <div style={{ fontSize: "13px", fontFamily: "'DM Sans', sans-serif", color: CREAM }}>
                        {milestones[activeIndex].label}
                      </div>
                    </div>
                    <Link href={milestones[activeIndex].href} style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 20px",
                      background: GOLD,
                      color: "#0a0a0a",
                      fontSize: "11px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "0.09em",
                      textTransform: "uppercase",
                      textDecoration: "none",
                      flexShrink: 0,
                    }}>
                      {milestones[activeIndex].label} →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ── 02 THE INVESTOR ─────────────────────────────────────── */}
            <SectionCard
              id="investor"
              number="02"
              title="The Investor"
              description="Personal identity, treaty eligibility, background, and U.S. intent"
              haveCount={s1Have}
              totalCount={s1Total}
              ctaLabel={m1Done ? "View Onboarding" : "Complete Onboarding"}
              ctaHref="/apply/story"
            >
              <Sub title="Identity & Nationality" fields={identityFields} />
              <Sub title="Professional Background" fields={backgroundFields} />
              <Sub title="Business Path & U.S. Intent" fields={intentFields} />
            </SectionCard>

            {/* ── 03 THE BUSINESS ─────────────────────────────────────── */}
            <SectionCard
              id="business"
              number="03"
              title="The Business"
              description={isFranchise
                ? "Franchise entity, investor role, and FDD intelligence"
                : "Business entity, investor role, and market position"}
              haveCount={s3Have}
              totalCount={s3Total}
              ctaLabel={m2Done ? "View Business Profile" : "Complete Business Profile"}
              ctaHref={isFranchise ? "/fdd" : "/apply/business"}
            >
              <Sub title="Entity Overview" fields={entityFields} />
              <Sub title="The Investor's Role" fields={roleFields} />
              <Sub title={isFranchise ? "Franchise Intelligence" : "Business Intelligence"} fields={franchiseFields} />
            </SectionCard>

            {/* ── 04 THE INVESTMENT ───────────────────────────────────── */}
            <SectionCard
              id="investment"
              number="04"
              title="The Investment"
              description="Capital committed, breakdown by category, source of funds, and supporting documentation"
              haveCount={s4Have}
              totalCount={s4Total}
              ctaLabel={m3Done ? "View Investment Details" : "Add Investment Details"}
              ctaHref="/apply/investment"
            >
              <Sub title="Capital Summary" fields={capitalFields} />
              <Sub title="Investment Breakdown" fields={breakdownFields} />
              <Sub title="Source of Funds" fields={sourceFields} />
              <Sub title="Supporting Documentation" fields={docsFields} />
            </SectionCard>

            {/* ── 05 CASE INTELLIGENCE ────────────────────────────────── */}
            <SectionCard
              id="intelligence"
              number="05"
              title="Case Intelligence"
              description="Gap analysis scores, FDD findings, market analysis, and evidence priority map"
              haveCount={s5Have}
              totalCount={s5Total}
              ctaLabel={m4Done ? "View Gap Analysis" : "Run Gap Analysis"}
              ctaHref="/gap-analysis"
            >
              {data.completenessScore != null && (
                <div style={{ marginBottom: "20px", padding: "16px", background: "rgba(0,0,0,0.3)", border: `1px solid ${INNER}` }}>
                  <div style={{ ...eyebrow, marginBottom: "12px" }}>Gap Analysis Results</div>
                  <ScoreBar label="Overall Case Readiness" score={data.completenessScore} />
                  <ScoreBar label="Source of Funds"        score={data.sourceOfFundsScore} />
                  <ScoreBar label="Management Role"        score={data.managementRoleScore} />
                  <ScoreBar label="Business Plan"          score={data.businessPlanScore} />
                </div>
              )}
              <Sub title="Gap Analysis" fields={gapFields} />
              {isFranchise && fddIntelFields.length > 0 && (
                <Sub title="FDD Intelligence" fields={fddIntelFields} />
              )}
              <Sub title="Market Analysis" fields={marketFields} />
            </SectionCard>

            {/* ── 06 INTERVIEW READINESS ──────────────────────────────── */}
            <SectionCard
              id="interview"
              number="06"
              title="Interview Readiness"
              description="AI simulator sessions, coaching notes, and personalised interview dossier"
              haveCount={s6Have}
              totalCount={s6Total}
              ctaLabel="Open Simulator"
              ctaHref="/simulator"
            >
              {data.simCoachingNotes && (
                <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: `1px solid ${INNER}`, marginBottom: "16px" }}>
                  <div style={{ ...eyebrow, marginBottom: "6px" }}>Latest Coaching Note</div>
                  <p style={{ fontSize: "12px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.5)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                    {data.simCoachingNotes}
                  </p>
                </div>
              )}
              <Sub title="Simulator" fields={simFields} />
              <Sub title="Interview Dossier" fields={dossierFields} />
            </SectionCard>

            {/* Footer note */}
            <div style={{ textAlign: "center", padding: "24px 0", borderTop: `1px solid ${INNER}`, marginTop: "8px" }}>
              <p style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.18)", lineHeight: 1.7, margin: "0 0 12px" }}>
                Fields marked <span style={{ color: "rgba(248,113,113,0.45)", fontStyle: "italic" }}>Required</span> represent schema gaps — future modules will collect them.{" "}
                Fields marked <span style={{ color: "rgba(201,168,76,0.38)", fontStyle: "italic" }}>Collects from step</span> populate automatically as you complete each module.
              </p>
              <Link href="/dashboard" style={{ fontSize: "10px", letterSpacing: "0.1em", color: "rgba(201,168,76,0.45)", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                ← Back to Dashboard
              </Link>
            </div>

          </div>{/* end content */}
        </div>{/* end sidebar + content */}
      </div>{/* end max-width wrapper */}
    </div>
  );
}
