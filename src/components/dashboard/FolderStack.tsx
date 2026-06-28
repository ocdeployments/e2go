"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

interface FolderStackProps {
  lifecycle: Record<string, string | null> | null;
  entitlements: { hasComplete: boolean; hasFdd: boolean };
  isFranchisePath: boolean;
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
  sectionCompletionMap: { qualifications: boolean; family: boolean; ties: boolean };
  gapScore: number | null;
  fddCount: number;
  generatedDocCount: number;
  quizCompleted: boolean;
  hasCoachingReport: boolean;
  applicationId: string | null;
}

const CARDS = [
  { id: "application",   label: "My Application",  summary: "9-step case file checklist" },
  { id: "analysis",      label: "My Analysis",     summary: "Gap · FDD · Market scores" },
  { id: "preparation",   label: "My Prep",         summary: "Interview kit · Simulator" },
  { id: "package",       label: "My Package",      summary: "Documents · Download" },
];

// Design tokens
const GOLD = "#C9A84C";
const GOLD_DIM = "rgba(201,168,76,0.55)";
const CREAM = "#f5f0e8";
const CARD_BG = "#111007";
const BORDER = "rgba(201,168,76,0.15)";
const CARD_MIN_HEIGHT = 420;

export default function FolderStack({
  lifecycle,
  entitlements,
  isFranchisePath,
  simulatorData,
  sectionCompletionMap,
  gapScore,
  fddCount,
  generatedDocCount,
  quizCompleted,
  hasCoachingReport,
  applicationId,
}: FolderStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("dashboard_active_tab");
    if (saved) {
      const idx = CARDS.findIndex((c) => c.id === saved);
      if (idx !== -1) setActiveIndex(idx);
    }
  }, []);

  function handleTabChange(idx: number) {
    setActiveIndex(idx);
    localStorage.setItem("dashboard_active_tab", CARDS[idx].id);
  }

  const module1Done = Boolean(lifecycle?.module1_completed_at);
  const module2Done = Boolean(lifecycle?.module2_completed_at);
  const module3Done = Boolean(lifecycle?.module3_completed_at);
  const module4Done = Boolean(lifecycle?.module4_completed_at);
  const module5Done = Boolean(lifecycle?.module5_completed_at);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Tab row — 5 tabs */}
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {CARDS.map((card, cardIdx) => {
          const isActive = cardIdx === activeIndex;
          return (
            <button
              key={card.id}
              onClick={() => handleTabChange(cardIdx)}
              style={{
                flex: 1,
                borderRadius: "6px 6px 0 0",
                cursor: "pointer",
                border: `1px solid ${isActive ? GOLD : BORDER}`,
                borderBottom: "none",
                background: isActive ? GOLD : cardIdx < activeIndex ? "#1C1408" : "#160F05",
                paddingTop: isActive ? "11px" : "8px",
                paddingBottom: "13px",
                paddingLeft: "6px",
                paddingRight: "6px",
                zIndex: isActive ? 30 : 10,
                position: "relative",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "9px",
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                transition: "background 0.15s, padding-top 0.1s",
              }}
            >
              <span style={{ color: isActive ? "#0a0a0a" : GOLD_DIM, fontWeight: isActive ? 700 : 400 }}>
                {card.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active card body */}
      <div
        style={{
          background: CARD_BG,
          border: `1px solid ${GOLD}`,
          borderTop: "none",
          position: "relative",
          zIndex: 25,
          minHeight: `${CARD_MIN_HEIGHT}px`,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
          >
            {CARDS[activeIndex].id === "application" && (
              <ApplicationCard
                quizCompleted={quizCompleted}
                module1Done={module1Done}
                module2Done={module2Done}
                module3Done={module3Done}
                module4Done={module4Done}
                module5Done={module5Done}
                sectionCompletionMap={sectionCompletionMap}
              />
            )}
            {CARDS[activeIndex].id === "analysis" && (
              <AnalysisCard
                entitlements={entitlements}
                isFranchisePath={isFranchisePath}
                gapScore={gapScore}
                fddCount={fddCount}
              />
            )}
            {CARDS[activeIndex].id === "preparation" && (
              <PreparationCard
                simulatorData={simulatorData}
                hasCoachingReport={hasCoachingReport}
              />
            )}
            {CARDS[activeIndex].id === "package" && (
              <PackageCard generatedDocCount={generatedDocCount} applicationId={applicationId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function CardHeader({ title, badge, badgeGreen = false }: {
  title: string;
  badge: string;
  badgeGreen?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        fontSize: "18px",
        fontWeight: 300,
        color: CREAM,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: badgeGreen ? "#5DCAA5" : GOLD_DIM,
        border: `1px solid ${badgeGreen ? "rgba(93,202,165,0.3)" : BORDER}`,
        background: badgeGreen ? "rgba(93,202,165,0.06)" : "rgba(201,168,76,0.04)",
        padding: "3px 8px",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        {badge}
      </div>
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: BORDER, marginBottom: "14px" }} />;
}

function RowLink({ href, label, description, cta, ctaGreen }: {
  href: string;
  label: string;
  description: string;
  cta: string;
  ctaGreen: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 0",
        borderBottom: `1px solid ${BORDER}`,
        textDecoration: "none",
        gap: "12px",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: "12px",
          fontFamily: "'DM Sans', sans-serif",
          color: CREAM,
          fontWeight: 500,
          marginBottom: "2px",
        }}>
          {label}
        </div>
        <div style={{
          fontSize: "10px",
          fontFamily: "'DM Sans', sans-serif",
          color: "rgba(245,240,232,0.42)",
          lineHeight: 1.4,
        }}>
          {description}
        </div>
      </div>
      <span style={{
        fontSize: "10px",
        fontFamily: "'DM Sans', sans-serif",
        color: ctaGreen ? "#5DCAA5" : GOLD_DIM,
        fontWeight: 600,
        letterSpacing: "0.04em",
        flexShrink: 0,
        whiteSpace: "nowrap",
      }}>
        {cta}
      </span>
    </Link>
  );
}

// ── Three-tier step row ────────────────────────────────────────────────────────
function StepRow({ number, title, href, status, upcomingIndex = 0 }: {
  number: string;
  title: string;
  href: string;
  status: "done" | "in-progress" | "upcoming";
  upcomingIndex?: number;
}) {
  if (status === "done") {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 0",
        borderBottom: `1px solid ${BORDER}`,
        opacity: 0.4,
      }}>
        <span style={{ fontSize: "9px", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", width: "18px", flexShrink: 0, fontWeight: 500 }}>
          {number}
        </span>
        <span style={{ fontSize: "11px", color: "#5DCAA5", width: "12px", textAlign: "center", fontWeight: 700 }}>✓</span>
        <span style={{ fontSize: "12px", fontFamily: "'DM Sans', sans-serif", color: CREAM, textDecoration: "line-through" }}>
          {title}
        </span>
      </div>
    );
  }

  if (status === "in-progress") {
    return (
      <Link
        href={href}
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "11px 12px",
          marginLeft: "-12px",
          marginRight: "-12px",
          borderBottom: `1px solid ${BORDER}`,
          borderLeft: `2px solid ${GOLD}`,
          background: "rgba(201,168,76,0.04)",
          textDecoration: "none",
          gap: "4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "9px", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", width: "18px" }}>{number}</span>
            <span style={{ fontSize: "9px", color: GOLD, width: "12px", textAlign: "center" }}>●</span>
            <span style={{ fontSize: "13px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 600 }}>{title}</span>
          </div>
          <span style={{ fontSize: "10px", color: GOLD, fontFamily: "'DM Sans', sans-serif", fontWeight: 700, flexShrink: 0, letterSpacing: "0.04em" }}>
            Continue →
          </span>
        </div>
        <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)", fontFamily: "'DM Sans', sans-serif", paddingLeft: "38px" }}>
          In progress — click to continue
        </div>
      </Link>
    );
  }

  // Upcoming — progressively fading
  const opacity = Math.max(0.12, 0.5 - upcomingIndex * 0.09);
  return (
    <Link
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 0",
        borderBottom: `1px solid rgba(201,168,76,0.06)`,
        opacity,
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: "9px", color: "rgba(245,240,232,0.2)", fontFamily: "'DM Sans', sans-serif", width: "18px", flexShrink: 0, fontWeight: 500 }}>
        {number}
      </span>
      <span style={{ fontSize: "9px", color: "rgba(245,240,232,0.18)", width: "12px", textAlign: "center" }}>○</span>
      <span style={{ fontSize: "12px", fontFamily: "'DM Sans', sans-serif", color: CREAM }}>
        {title}
      </span>
    </Link>
  );
}

// ── Tab 1: My Application (3-tier step list) ──────────────────────────────────
function ApplicationCard({
  quizCompleted, module1Done, module2Done, module3Done, module4Done, module5Done, sectionCompletionMap,
}: {
  quizCompleted: boolean;
  module1Done: boolean;
  module2Done: boolean;
  module3Done: boolean;
  module4Done: boolean;
  module5Done: boolean;
  sectionCompletionMap: { qualifications: boolean; family: boolean; ties: boolean };
}) {
  function deriveStatus(done: boolean, prevDone: boolean): "done" | "in-progress" | "upcoming" {
    if (done) return "done";
    if (prevDone) return "in-progress";
    return "upcoming";
  }

  const steps = [
    { number: "01", title: "Eligibility Quiz",       href: quizCompleted ? "/quiz/review" : "/quiz",  status: quizCompleted ? "done" as const : "in-progress" as const },
    { number: "02", title: "Onboarding",             href: "/apply/story",          status: deriveStatus(module1Done, quizCompleted) },
    { number: "03", title: "Business Profile",       href: "/apply/business",       status: deriveStatus(module2Done, module1Done) },
    { number: "04", title: "Investment & Documents", href: "/apply/investment",     status: deriveStatus(module3Done, module2Done) },
    { number: "05", title: "Qualifications",         href: "/apply/qualifications", status: deriveStatus(sectionCompletionMap.qualifications, module3Done) },
    { number: "06", title: "Family",                 href: "/apply/family",         status: deriveStatus(sectionCompletionMap.family, sectionCompletionMap.qualifications) },
    { number: "07", title: "Country Ties",           href: "/apply/ties",           status: deriveStatus(sectionCompletionMap.ties, sectionCompletionMap.family) },
    { number: "08", title: "Voice Profile",          href: "/apply/module4",        status: deriveStatus(module4Done, sectionCompletionMap.ties) },
    { number: "09", title: "Document Generation",    href: "/apply/generate",       status: deriveStatus(module5Done, module4Done) },
  ];

  const doneCount = steps.filter((s) => s.status === "done").length;
  const allDone = doneCount === steps.length;

  // Compute upcomingIndex for progressive fading
  let upcomingCounter = 0;
  const stepsWithIndex = steps.map((s) => ({
    ...s,
    upcomingIndex: s.status === "upcoming" ? upcomingCounter++ : 0,
  }));

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      <CardHeader title="My Application" badge={allDone ? "Complete" : `${doneCount} / ${steps.length}`} badgeGreen={allDone} />
      <Divider />
      <div style={{
        fontSize: "8px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.45)",
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: "10px",
      }}>
        Case File Steps
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {stepsWithIndex.map((s) => (
          <StepRow key={s.number} {...s} />
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: My Analysis ────────────────────────────────────────────────────────
function AnalysisCard({ entitlements, isFranchisePath, gapScore, fddCount }: {
  entitlements: { hasComplete: boolean; hasFdd: boolean };
  isFranchisePath: boolean;
  gapScore: number | null;
  fddCount: number;
}) {
  const gapRan = gapScore != null && gapScore > 0;
  const fddRan = fddCount > 0;

  const tools = [
    {
      label: "Gap Analysis",
      description: "Identify evidence weaknesses before your consulate does",
      href: "/gap-analysis",
      cta: gapRan ? `${gapScore}% readiness · Run again →` : "Not yet run → Start now",
      ctaGreen: gapRan,
      available: entitlements.hasComplete,
    },
    ...(isFranchisePath ? [{
      label: "FDD Intelligence",
      description: "50-field FDD extraction + E-2 suitability scoring",
      href: "/fdd",
      cta: fddRan ? `${fddCount} analysis run · View →` : "Upload your FDD →",
      ctaGreen: fddRan,
      available: entitlements.hasFdd || entitlements.hasComplete,
    }] : []),
    {
      label: "Market Analysis",
      description: "Real Census + BLS data injected into your Business Plan",
      href: "/market-analysis",
      cta: "Run analysis →",
      ctaGreen: false,
      available: entitlements.hasComplete,
    },
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      <CardHeader title="My Analysis" badge={`${tools.length} Tools`} />
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {tools.map((tool) => (
          <RowLink key={tool.label} href={tool.href} label={tool.label} description={tool.description} cta={tool.cta} ctaGreen={tool.ctaGreen} />
        ))}
      </div>
      <div style={{
        marginTop: "14px",
        padding: "8px 10px",
        background: "rgba(201,168,76,0.04)",
        border: `1px solid ${BORDER}`,
        fontSize: "10px",
        color: "rgba(245,240,232,0.38)",
        fontFamily: "'DM Sans', sans-serif",
        lineHeight: 1.5,
      }}>
        Findings are injected directly into your 15 generated documents
      </div>
    </div>
  );
}

// ── Tab 3: My Prep ────────────────────────────────────────────────────────────
function PreparationCard({ simulatorData, hasCoachingReport }: {
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
  hasCoachingReport: boolean;
}) {
  const sessionsRemaining = simulatorData
    ? Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0)
    : null;

  const items = [
    {
      label: "Interview Case Dossier",
      description: "Your personalised revision document — business, investment, denial risks, and the 9 interview questions tailored to your case.",
      href: "/simulator/prep-kit",
      cta: "Generate my dossier →",
      ctaGreen: false,
    },
    {
      label: "Interview Simulator",
      description: sessionsRemaining != null
        ? `${sessionsRemaining} session${sessionsRemaining !== 1 ? "s" : ""} remaining`
        : "3 sessions included with your package",
      href: "/simulator",
      cta: sessionsRemaining === 0 ? "Add sessions →" : "Practice now →",
      ctaGreen: false,
    },
    ...(hasCoachingReport ? [{
      label: "Coaching Report",
      description: "Your last session — what to focus on before the real interview.",
      href: "/simulator",
      cta: "View report →",
      ctaGreen: true,
    }] : []),
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      <CardHeader title="My Preparation" badge="Interview Ready" />
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map((item) => (
          <RowLink key={item.label} href={item.href} label={item.label} description={item.description} cta={item.cta} ctaGreen={item.ctaGreen} />
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: My Package ─────────────────────────────────────────────────────────
function PackageCard({ generatedDocCount, applicationId }: { generatedDocCount: number; applicationId: string | null }) {
  const hasDocuments = generatedDocCount > 0;
  const generateHref = applicationId ? `/generate/${applicationId}` : "/apply/checklist";

  const items = [
    {
      label: "Document Package",
      description: hasDocuments ? `${generatedDocCount} of 15 documents ready` : "15 consulate-formatted documents across 11 tabs",
      href: generateHref,
      cta: hasDocuments ? `${generatedDocCount} / 15 · Continue →` : "Generate your package →",
      ctaGreen: hasDocuments,
    },
    {
      label: "Download Package",
      description: hasDocuments ? "ZIP file — all tabs A–K ready to submit" : "Available once all documents are generated",
      href: generateHref,
      cta: hasDocuments ? "Download ZIP →" : "Pending",
      ctaGreen: false,
    },
    {
      label: "Consulate Submission",
      description: "Assembly checklist + DS-160 reference + cover page",
      href: "/apply/checklist",
      cta: "Prepare →",
      ctaGreen: false,
    },
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      <CardHeader title="My Package" badge={hasDocuments ? `${generatedDocCount} / 15 Ready` : "Final Stage"} badgeGreen={hasDocuments} />
      <Divider />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map((item) => (
          <RowLink key={item.label} href={item.href} label={item.label} description={item.description} cta={item.cta} ctaGreen={item.ctaGreen} />
        ))}
      </div>
    </div>
  );
}
