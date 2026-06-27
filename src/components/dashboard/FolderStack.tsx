"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

interface FolderStackProps {
  lifecycle: Record<string, string | null> | null;
  entitlements: { hasComplete: boolean; hasFdd: boolean };
  isFranchisePath: boolean;
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
}

const SECTION_CARDS = [
  { number: "01", title: "Your Story", href: "/apply/story", lifecycleKey: null },
  { number: "02", title: "Your Business", href: "/apply/business", lifecycleKey: "module2_completed_at" },
  { number: "03", title: "Your Investment", href: "/apply/investment", lifecycleKey: "module3_completed_at" },
  { number: "04", title: "Your Qualifications", href: "/apply/qualifications", lifecycleKey: null },
  { number: "05", title: "Your Family", href: "/apply/family", lifecycleKey: null },
  { number: "06", title: "Your Ties", href: "/apply/ties", lifecycleKey: null },
];

const CARDS = [
  {
    id: "build",
    label: "Build Your Case",
    summary: "Application sections · documents",
  },
  {
    id: "strengthen",
    label: "Strengthen Your Case",
    summary: "Gap · FDD · Market analysis",
  },
  {
    id: "file",
    label: "File Your Application",
    summary: "Docs · Simulator · Submit",
  },
];

// Tab styles by visual position (0=front, 1=middle, 2=back)
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
}: FolderStackProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Visual tab order: [active, next, previous]
  const tabOrder = [
    activeIndex,
    (activeIndex + 1) % 3,
    (activeIndex + 2) % 3,
  ];

  const module1Done = Boolean(lifecycle?.module1_completed_at);
  const module2Done = Boolean(lifecycle?.module2_completed_at);
  const module3Done = Boolean(lifecycle?.module3_completed_at);

  // First incomplete section href
  const firstIncompleteHref =
    !module1Done
      ? "/apply/story"
      : !module2Done
      ? "/apply/business"
      : !module3Done
      ? "/apply/investment"
      : "/apply/generate";

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Tab row */}
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {tabOrder.map((cardIdx, position) => {
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
            {activeIndex === 0 && (
              <BuildCard
                lifecycle={lifecycle}
                module1Done={module1Done}
                module2Done={module2Done}
                module3Done={module3Done}
                firstIncompleteHref={firstIncompleteHref}
              />
            )}
            {activeIndex === 1 && (
              <StrengthenCard
                entitlements={entitlements}
                isFranchisePath={isFranchisePath}
              />
            )}
            {activeIndex === 2 && (
              <FileCard simulatorData={simulatorData} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Peeking strips for inactive cards */}
      {tabOrder.slice(1).map((cardIdx, i) => {
        const card = CARDS[cardIdx];
        const isFirst = i === 0;

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
              background: isFirst ? "#1C1408" : "#110D07",
              border: `1px solid rgba(201,168,76,${isFirst ? "0.18" : "0.1"})`,
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
                  color: `rgba(245,240,232,${isFirst ? "0.65" : "0.35"})`,
                  fontWeight: 300,
                }}
              >
                {card.label}
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: `rgba(245,240,232,${isFirst ? "0.35" : "0.18"})`,
                  fontFamily: "'DM Sans', sans-serif",
                  letterSpacing: "0.03em",
                }}
              >
                {card.summary}
              </span>
            </div>
            <span
              style={{
                color: `rgba(201,168,76,${isFirst ? "0.45" : "0.25"})`,
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

function BuildCard({
  lifecycle,
  module1Done,
  module2Done,
  module3Done,
  firstIncompleteHref,
}: {
  lifecycle: Record<string, string | null> | null;
  module1Done: boolean;
  module2Done: boolean;
  module3Done: boolean;
  firstIncompleteHref: string;
}) {
  const allDone = module1Done && module2Done && module3Done;

  const sectionStatuses = SECTION_CARDS.map((s, i) => {
    let status: "done" | "in-progress" | "upcoming";
    if (i === 0) status = module1Done ? "done" : "in-progress";
    else if (i === 1) status = module2Done ? "done" : module1Done ? "in-progress" : "upcoming";
    else if (i === 2) status = module3Done ? "done" : module2Done ? "in-progress" : "upcoming";
    else status = "upcoming";
    return { ...s, status };
  });

  void lifecycle; // lifecycle available if needed for deeper checks

  return (
    <div style={{ padding: "20px 22px 22px" }}>
      {/* Header row */}
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
          Build Your Case
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: allDone ? "#2E7D5E" : "#8A4A00",
            border: `1px solid ${allDone ? "rgba(46,125,94,0.35)" : "rgba(138,74,0,0.35)"}`,
            background: allDone
              ? "rgba(46,125,94,0.08)"
              : "rgba(138,74,0,0.08)",
            padding: "3px 8px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {allDone ? "Complete" : "In Progress"}
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          background: "rgba(26,18,8,0.1)",
          marginBottom: "14px",
        }}
      />

      {/* Section eyebrow */}
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
        Application Sections
      </div>

      {/* Section rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        {sectionStatuses.map((s) => {
          const icon =
            s.status === "done"
              ? "✓"
              : s.status === "in-progress"
              ? "●"
              : "○";
          const iconColor =
            s.status === "done"
              ? "#2E7D5E"
              : s.status === "in-progress"
              ? "#8A4A00"
              : "rgba(26,18,8,0.25)";
          const textOpacity =
            s.status === "done"
              ? 0.6
              : s.status === "in-progress"
              ? 1
              : 0.38;

          return (
            <Link
              key={s.number}
              href={s.href}
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontSize: s.status === "done" ? "11px" : "9px",
                    color: iconColor,
                    width: "14px",
                    textAlign: "center",
                    flexShrink: 0,
                    fontWeight: s.status === "done" ? 700 : 400,
                  }}
                >
                  {icon}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "'DM Sans', sans-serif",
                    color: `rgba(26,18,8,${textOpacity})`,
                    fontWeight: s.status === "in-progress" ? 500 : 400,
                  }}
                >
                  {s.title}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color:
                      s.status === "done"
                        ? "rgba(46,125,94,0.7)"
                        : s.status === "in-progress"
                        ? "rgba(138,74,0,0.8)"
                        : "rgba(26,18,8,0.22)",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {s.status === "done"
                    ? "Complete"
                    : s.status === "in-progress"
                    ? "In Progress"
                    : "Not started"}
                </span>
                {s.status === "in-progress" && (
                  <span style={{ color: "rgba(138,74,0,0.7)", fontSize: "12px" }}>
                    →
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div style={{ marginTop: "16px" }}>
        <Link
          href={firstIncompleteHref}
          style={{
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            color: "#1a1208",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textDecoration: "none",
            opacity: 0.7,
          }}
        >
          Continue building my case file →
        </Link>
      </div>
    </div>
  );
}

function StrengthenCard({
  entitlements,
  isFranchisePath,
}: {
  entitlements: { hasComplete: boolean; hasFdd: boolean };
  isFranchisePath: boolean;
}) {
  const tools = [
    {
      label: "Gap Analysis",
      description: "Identify weaknesses before your consulate does",
      href: "/gap-analysis",
      cta: "Run analysis →",
      available: entitlements.hasComplete,
    },
    ...(isFranchisePath
      ? [
          {
            label: "FDD Intelligence",
            description: "50-field FDD extraction + E-2 suitability scoring",
            href: "/fdd",
            cta: "Analyse FDD →",
            available: entitlements.hasFdd || entitlements.hasComplete,
          },
        ]
      : []),
    {
      label: "Market Analysis",
      description: "Real Census + BLS data injected into your Business Plan",
      href: "/market-analysis",
      cta: "Run analysis →",
      available: entitlements.hasComplete,
    },
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
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
          Strengthen Your Case
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#5A3B00",
            border: "1px solid rgba(90,59,0,0.25)",
            padding: "3px 8px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {tools.length} Tools
        </div>
      </div>

      <div
        style={{
          height: "1px",
          background: "rgba(26,18,8,0.1)",
          marginBottom: "14px",
        }}
      />

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
                color: "#1a1208",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
                opacity: 0.65,
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

function FileCard({
  simulatorData,
}: {
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
}) {
  const sessionsRemaining = simulatorData
    ? Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0)
    : null;

  const items = [
    {
      label: "Document Generation",
      description: "15 consulate-formatted documents",
      href: "/apply/generate",
      cta: "Generate →",
    },
    {
      label: "Interview Simulator",
      description:
        sessionsRemaining != null
          ? `${sessionsRemaining} session${sessionsRemaining !== 1 ? "s" : ""} remaining`
          : "3 sessions included",
      href: "/simulator",
      cta: "Start →",
    },
    {
      label: "Consulate Submission",
      description: "Submission package assembly",
      href: "/apply/submit",
      cta: "Prepare →",
    },
  ];

  return (
    <div style={{ padding: "20px 22px 22px" }}>
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
          File Your Application
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#3A2800",
            border: "1px solid rgba(58,40,0,0.2)",
            padding: "3px 8px",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Final Stage
        </div>
      </div>

      <div
        style={{
          height: "1px",
          background: "rgba(26,18,8,0.1)",
          marginBottom: "14px",
        }}
      />

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
                color: "#1a1208",
                fontWeight: 600,
                letterSpacing: "0.04em",
                flexShrink: 0,
                opacity: 0.65,
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
