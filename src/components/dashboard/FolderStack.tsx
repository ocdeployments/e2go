"use client";
import { useState } from "react";
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
}

const CARDS = [
  {
    id: "application",
    label: "My Application",
    summary: "9-step case file checklist",
  },
  {
    id: "analysis",
    label: "My Analysis",
    summary: "Gap · FDD · Market scores",
  },
  {
    id: "preparation",
    label: "My Preparation",
    summary: "Interview kit · Simulator",
  },
  {
    id: "package",
    label: "My Package",
    summary: "Documents · Download",
  },
];

// Tab styles for the 3 visible folder tabs (front → back)
const TAB_STYLE = [
  {
    background: "#f0ece3",
    color: "#1a1208",
    fontWeight: 600,
    paddingTop: "10px",
    paddingBottom: "12px",
    paddingLeft: "18px",
    paddingRight: "24px",
    marginRight: "-16px",
    zIndex: 30,
    filter: "drop-shadow(3px 0 3px rgba(0,0,0,0.55))",
  },
  {
    background: "#8A6B35",
    color: "rgba(245,240,232,0.78)",
    fontWeight: 400,
    paddingTop: "7px",
    paddingBottom: "12px",
    paddingLeft: "24px",
    paddingRight: "24px",
    marginRight: "-16px",
    zIndex: 20,
    filter: "drop-shadow(2px 0 3px rgba(0,0,0,0.4))",
  },
  {
    background: "#4A3318",
    color: "rgba(245,240,232,0.38)",
    fontWeight: 400,
    paddingTop: "6px",
    paddingBottom: "12px",
    paddingLeft: "24px",
    paddingRight: "24px",
    marginRight: "0",
    zIndex: 10,
    filter: undefined,
  },
] as const;

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
}: FolderStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // 4 tabs: active + next 3 in order
  const tabOrder = [
    activeIndex,
    (activeIndex + 1) % 4,
    (activeIndex + 2) % 4,
    (activeIndex + 3) % 4,
  ];

  const module1Done = Boolean(lifecycle?.module1_completed_at);
  const module2Done = Boolean(lifecycle?.module2_completed_at);
  const module3Done = Boolean(lifecycle?.module3_completed_at);
  const module4Done = Boolean(lifecycle?.module4_completed_at);
  const module5Done = Boolean(lifecycle?.module5_completed_at);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Tab row — 3 visible overlapping tabs */}
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {tabOrder.slice(0, 3).map((cardIdx, position) => {
          const card = CARDS[cardIdx];
          const ts = TAB_STYLE[position];

          return (
            <button
              key={card.id}
              onClick={() => setActiveIndex(cardIdx)}
              style={{
                borderRadius: "8px 8px 0 0",
                position: "relative",
                cursor: "pointer",
                border: "none",
                background: ts.background,
                color: ts.color,
                fontWeight: ts.fontWeight,
                paddingTop: ts.paddingTop,
                paddingBottom: ts.paddingBottom,
                paddingLeft: ts.paddingLeft,
                paddingRight: ts.paddingRight,
                marginRight: ts.marginRight,
                zIndex: ts.zIndex,
                filter: ts.filter,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "11px",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                transition: "color 0.15s",
              }}
            >
              {card.label}
            </button>
          );
        })}
      </div>

      {/* Active card body */}
      <div
        style={{
          background: "#f0ece3",
          color: "#1a1208",
          border: "1px solid rgba(201,168,76,0.35)",
          borderTop: "none",
          position: "relative",
          zIndex: 25,
          minHeight: "280px",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: -4, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.99 }}
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
              <PackageCard generatedDocCount={generatedDocCount} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Peeking strips for the 3 inactive cards */}
      {tabOrder.slice(1).map((cardIdx, i) => {
        const card = CARDS[cardIdx];
        const opacity = i === 0 ? "0.18" : i === 1 ? "0.1" : "0.06";
        const labelOpacity = i === 0 ? "0.65" : i === 1 ? "0.35" : "0.2";
        const summaryOpacity = i === 0 ? "0.35" : i === 1 ? "0.18" : "0.1";
        const bg = i === 0 ? "#1C1408" : i === 1 ? "#110D07" : "#0D0A05";

        return (
          <button
            key={card.id}
            onClick={() => setActiveIndex(cardIdx)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "11px 22px",
              background: bg,
              border: `1px solid rgba(201,168,76,${opacity})`,
              borderTop: "none",
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: "14px",
                  color: `rgba(245,240,232,${labelOpacity})`,
                  fontWeight: 300,
                }}
              >
                {card.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: `rgba(245,240,232,${summaryOpacity})`,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.03em",
                }}
              >
                {card.summary}
              </span>
            </div>
            <span
              style={{
                color: `rgba(201,168,76,${i === 0 ? "0.45" : i === 1 ? "0.25" : "0.15"})`,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              ›
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Card contents ──────────────────────────────────────────────────────────────

const STEP_STATUS_COLORS = {
  done: { icon: "#2E7D5E", text: 0.6, label: "Complete", labelColor: "rgba(46,125,94,0.7)" },
  "in-progress": { icon: "#8A4A00", text: 1, label: "In Progress", labelColor: "rgba(138,74,0,0.8)" },
  upcoming: { icon: "rgba(26,18,8,0.25)", text: 0.38, label: "Not started", labelColor: "rgba(26,18,8,0.22)" },
};

function StepRow({
  number,
  title,
  href,
  status,
}: {
  number: string;
  title: string;
  href: string;
  status: "done" | "in-progress" | "upcoming";
}) {
  const s = STEP_STATUS_COLORS[status];
  const icon = status === "done" ? "✓" : status === "in-progress" ? "●" : "○";

  return (
    <Link
      href={href}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 0",
        borderBottom: "1px solid rgba(26,18,8,0.06)",
        textDecoration: "none",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
        <span
          style={{
            fontSize: "9px",
            color: "rgba(26,18,8,0.3)",
            fontFamily: "'DM Sans', sans-serif",
            width: "18px",
            flexShrink: 0,
            fontWeight: 500,
          }}
        >
          {number}
        </span>
        <span
          style={{
            fontSize: status === "done" ? "11px" : "9px",
            color: s.icon,
            width: "12px",
            textAlign: "center",
            flexShrink: 0,
            fontWeight: status === "done" ? 700 : 400,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            color: `rgba(26,18,8,${s.text})`,
            fontWeight: status === "in-progress" ? 500 : 400,
          }}
        >
          {title}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <span
          style={{
            fontSize: "9px",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: s.labelColor,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {s.label}
        </span>
        {status === "in-progress" && (
          <span style={{ color: "rgba(138,74,0,0.7)", fontSize: "12px" }}>→</span>
        )}
      </div>
    </Link>
  );
}

function cardHeader(title: string, badge: string, badgeGreen = false) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "18px",
          fontWeight: 300,
          color: "#1a1208",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: badgeGreen ? "#2E7D5E" : "#5A3B00",
          border: `1px solid ${badgeGreen ? "rgba(46,125,94,0.3)" : "rgba(90,59,0,0.25)"}`,
          background: badgeGreen ? "rgba(46,125,94,0.06)" : "rgba(90,59,0,0.06)",
          padding: "3px 8px",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {badge}
      </div>
    </div>
  );
}

function divider() {
  return (
    <div
      style={{
        height: "1px",
        background: "rgba(26,18,8,0.1)",
        marginBottom: "14px",
      }}
    />
  );
}

// ── Tab 1: My Application ──────────────────────────────────────────────────────
function ApplicationCard({
  quizCompleted,
  module1Done,
  module2Done,
  module3Done,
  module4Done,
  module5Done,
  sectionCompletionMap,
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

  const steps: { number: string; title: string; href: string; status: "done" | "in-progress" | "upcoming" }[] = [
    { number: "01", title: "Eligibility Quiz", href: "/quiz", status: quizCompleted ? "done" : "in-progress" },
    { number: "02", title: "Onboarding", href: "/apply/story", status: deriveStatus(module1Done, quizCompleted) },
    { number: "03", title: "Business Profile", href: "/apply/business", status: deriveStatus(module2Done, module1Done) },
    { number: "04", title: "Investment & Documents", href: "/apply/investment", status: deriveStatus(module3Done, module2Done) },
    { number: "05", title: "Your Qualifications", href: "/apply/qualifications", status: deriveStatus(sectionCompletionMap.qualifications, module3Done) },
    { number: "06", title: "Your Family", href: "/apply/family", status: deriveStatus(sectionCompletionMap.family, sectionCompletionMap.qualifications) },
    { number: "07", title: "Country Ties", href: "/apply/ties", status: deriveStatus(sectionCompletionMap.ties, sectionCompletionMap.family) },
    { number: "08", title: "Voice Profile", href: "/apply/module4", status: deriveStatus(module4Done, sectionCompletionMap.ties) },
    { number: "09", title: "Document Generation", href: "/apply/generate", status: deriveStatus(module5Done, module4Done) },
  ];

  const doneCount = steps.filter((s) => s.status === "done").length;
  const allDone = doneCount === steps.length;

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      {cardHeader("My Application", allDone ? "Complete" : `${doneCount} / ${steps.length}`, allDone)}
      {divider()}
      <div
        style={{
          fontSize: "8px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "rgba(26,18,8,0.45)",
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: "10px",
        }}
      >
        Case File Steps
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {steps.map((s) => (
          <StepRow key={s.number} {...s} />
        ))}
      </div>
    </div>
  );
}

// ── Tab 2: My Analysis ────────────────────────────────────────────────────────
function AnalysisCard({
  entitlements,
  isFranchisePath,
  gapScore,
  fddCount,
}: {
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
    ...(isFranchisePath
      ? [
          {
            label: "FDD Intelligence",
            description: "50-field FDD extraction + E-2 suitability scoring",
            href: "/fdd",
            cta: fddRan ? `${fddCount} analysis run · View →` : "Upload your FDD →",
            ctaGreen: fddRan,
            available: entitlements.hasFdd || entitlements.hasComplete,
          },
        ]
      : []),
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
      {cardHeader("My Analysis", `${tools.length} Tools`)}
      {divider()}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {tools.map((tool) => (
          <Link
            key={tool.label}
            href={tool.href}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid rgba(26,18,8,0.07)",
              textDecoration: "none",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1a1208",
                  fontWeight: 500,
                  marginBottom: "2px",
                }}
              >
                {tool.label}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "rgba(26,18,8,0.5)",
                  lineHeight: 1.4,
                }}
              >
                {tool.description}
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', sans-serif",
                color: tool.ctaGreen ? "#2E7D5E" : "#1a1208",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
                opacity: tool.ctaGreen ? 1 : 0.65,
                whiteSpace: "nowrap",
              }}
            >
              {tool.cta}
            </span>
          </Link>
        ))}
      </div>
      <div
        style={{
          marginTop: "14px",
          padding: "8px 10px",
          background: "rgba(26,18,8,0.05)",
          border: "1px solid rgba(26,18,8,0.08)",
          fontSize: "10px",
          color: "rgba(26,18,8,0.5)",
          fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.5,
        }}
      >
        Findings are injected directly into your 15 generated documents
      </div>
    </div>
  );
}

// ── Tab 3: My Preparation ─────────────────────────────────────────────────────
function PreparationCard({
  simulatorData,
  hasCoachingReport,
}: {
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
  hasCoachingReport: boolean;
}) {
  const sessionsRemaining = simulatorData
    ? Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0)
    : null;

  const items = [
    {
      label: "Interview Case Dossier",
      description: "Your personalised revision document — business, investment, denial risks, and the 9 interview questions with guidance tailored to your case.",
      href: "/simulator/prep-kit",
      cta: "Generate my dossier →",
      ctaGreen: false,
    },
    {
      label: "Interview Simulator",
      description:
        sessionsRemaining != null
          ? `${sessionsRemaining} session${sessionsRemaining !== 1 ? "s" : ""} remaining`
          : "3 sessions included with your package",
      href: "/simulator",
      cta: sessionsRemaining === 0 ? "Add sessions →" : "Practice now →",
      ctaGreen: false,
    },
    ...(hasCoachingReport
      ? [
          {
            label: "Coaching Report",
            description: "Your last session — what to focus on before the real interview.",
            href: "/simulator",
            cta: "View report →",
            ctaGreen: true,
          },
        ]
      : []),
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      {cardHeader("My Preparation", "Interview Ready")}
      {divider()}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid rgba(26,18,8,0.07)",
              textDecoration: "none",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1a1208",
                  fontWeight: 500,
                  marginBottom: "2px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "rgba(26,18,8,0.5)",
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', sans-serif",
                color: item.ctaGreen ? "#2E7D5E" : "#1a1208",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
                opacity: item.ctaGreen ? 1 : 0.65,
                whiteSpace: "nowrap",
              }}
            >
              {item.cta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Tab 4: My Package ─────────────────────────────────────────────────────────
function PackageCard({ generatedDocCount }: { generatedDocCount: number }) {
  const hasDocuments = generatedDocCount > 0;

  const items = [
    {
      label: "Document Package",
      description: hasDocuments
        ? `${generatedDocCount} of 15 documents ready`
        : "15 consulate-formatted documents across 11 tabs",
      href: "/apply/generate",
      cta: hasDocuments ? `${generatedDocCount} / 15 · Continue →` : "Generate your package →",
      ctaGreen: hasDocuments,
    },
    {
      label: "Download Package",
      description: hasDocuments
        ? "ZIP file — all tabs A–K ready to submit"
        : "Available once all documents are generated",
      href: "/apply/generate",
      cta: hasDocuments ? "Download ZIP →" : "Pending",
      ctaGreen: false,
    },
    {
      label: "Consulate Submission",
      description: "Assembly checklist + DS-160 reference + cover page",
      href: "/apply/submit",
      cta: "Prepare →",
      ctaGreen: false,
    },
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      {cardHeader(
        "My Package",
        hasDocuments ? `${generatedDocCount} / 15 Ready` : "Final Stage",
        hasDocuments
      )}
      {divider()}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 0",
              borderBottom: "1px solid rgba(26,18,8,0.07)",
              textDecoration: "none",
              gap: "12px",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: "12px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#1a1208",
                  fontWeight: 500,
                  marginBottom: "2px",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "rgba(26,18,8,0.5)",
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </div>
            </div>
            <span
              style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', sans-serif",
                color: item.ctaGreen ? "#2E7D5E" : "#1a1208",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
                opacity: item.ctaGreen ? 1 : 0.65,
                whiteSpace: "nowrap",
              }}
            >
              {item.cta}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

