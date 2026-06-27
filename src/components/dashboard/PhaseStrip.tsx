"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import type { CSSProperties } from "react";

export interface PhaseData {
  id: string;
  number: string;
  title: string;
  contentType:
    | "eligibility"
    | "onboarding"
    | "business"
    | "investment"
    | "gap"
    | "generation"
    | "interview";
  contentData: Record<string, string | number | null | boolean>;
  isCurrentPhase: boolean;
}

interface PhaseStripProps {
  phases: PhaseData[];
}

export default function PhaseStrip({ phases }: PhaseStripProps) {
  const initialOpen = phases.find((p) => p.isCurrentPhase)?.id ?? null;
  const [expandedId, setExpandedId] = useState<string | null>(initialOpen);

  return (
    <div
      style={{
        marginTop: "32px",
        border: "1px solid rgba(201,168,76,0.2)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {phases.map((phase, i) => {
          const isOdd = i % 2 === 0;
          const isExpanded = expandedId === phase.id;
          const bg = isOdd ? "#DDD1B0" : "#7A5C28";
          const textColor = isOdd ? "#2B1A07" : "#EDE4CF";
          const dimColor = isOdd
            ? "rgba(43,26,7,0.55)"
            : "rgba(237,228,207,0.55)";
          const dividerColor = isOdd
            ? "rgba(43,26,7,0.12)"
            : "rgba(237,228,207,0.12)";
          const borderRight =
            i % 4 !== 3
              ? `1px solid ${isOdd ? "rgba(43,26,7,0.18)" : "rgba(237,228,207,0.18)"}`
              : "none";

          const isDone = Boolean(phase.contentData.done);
          const isActive = phase.isCurrentPhase && !isDone;

          return (
            <div
              key={phase.id}
              style={{
                background: bg,
                borderRight,
                borderBottom: `1px solid ${isOdd ? "rgba(43,26,7,0.12)" : "rgba(237,228,207,0.12)"}`,
              }}
            >
              <button
                onClick={() =>
                  setExpandedId(isExpanded ? null : phase.id)
                }
                style={{
                  width: "100%",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "16px 18px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  gap: "8px",
                }}
                aria-expanded={isExpanded}
              >
                <div style={{ minWidth: 0 }}>
                  {/* Number + status chip row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      marginBottom: "4px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "11px",
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 700,
                        color: textColor,
                        opacity: 0.45,
                        letterSpacing: "0.1em",
                      }}
                    >
                      {phase.number}
                    </div>
                    {isDone && (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#5DCAA5",
                          fontWeight: 700,
                          lineHeight: 1,
                        }}
                      >
                        ✓
                      </span>
                    )}
                    {isActive && (
                      <span
                        style={{
                          width: "5px",
                          height: "5px",
                          borderRadius: "50%",
                          background: "#C9A84C",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontFamily: "'DM Sans', sans-serif",
                      fontWeight: 500,
                      color: textColor,
                      lineHeight: 1.2,
                    }}
                  >
                    {phase.title}
                  </div>
                </div>
                <motion.span
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  style={{
                    color: textColor,
                    fontSize: "16px",
                    lineHeight: 1,
                    flexShrink: 0,
                    marginTop: "2px",
                    display: "inline-block",
                  }}
                >
                  ›
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 250,
                      damping: 30,
                    }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      style={{
                        padding: "14px 18px 18px",
                        borderTop: `1px solid ${dividerColor}`,
                      }}
                    >
                      <PhaseContentBlock
                        content={phase}
                        textColor={textColor}
                        dimColor={dimColor}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhaseContentBlock({
  content,
  textColor,
  dimColor,
}: {
  content: PhaseData;
  textColor: string;
  dimColor: string;
}) {
  const d = content.contentData;

  const label: CSSProperties = {
    fontSize: "8px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: dimColor,
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "3px",
    marginTop: "10px",
  };

  const value: CSSProperties = {
    fontSize: "12px",
    color: textColor,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    lineHeight: 1.3,
  };

  const linkStyle: CSSProperties = {
    display: "inline-block",
    marginTop: "12px",
    fontSize: "10px",
    color: textColor,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    letterSpacing: "0.06em",
    textDecoration: "none",
    opacity: 0.8,
  };

  const statusStyle: CSSProperties = {
    ...value,
    opacity: d.done ? 1 : 0.5,
    marginTop: "8px",
  };

  if (content.contentType === "eligibility") {
    return (
      <div>
        {d.outcome ? (
          <>
            <div style={label}>Outcome</div>
            <div style={value}>
              {String(d.outcome).replace(/_/g, " ")}
            </div>
          </>
        ) : (
          <div style={statusStyle}>Not taken</div>
        )}
        <Link href="/results" style={linkStyle}>
          View your results →
        </Link>
      </div>
    );
  }

  if (content.contentType === "onboarding") {
    return (
      <div>
        <div style={statusStyle}>{d.done ? "Complete" : "In progress"}</div>
        <Link href="/apply/module1" style={linkStyle}>
          Continue →
        </Link>
      </div>
    );
  }

  if (content.contentType === "business") {
    return (
      <div>
        {d.archetype ? (
          <>
            <div style={label}>Investor archetype</div>
            <div style={value}>
              {String(d.archetype).replace(/_/g, " ")}
            </div>
          </>
        ) : null}
        <div style={statusStyle}>{d.done ? "Complete" : "In progress"}</div>
        <Link href="/apply/business" style={linkStyle}>
          Continue →
        </Link>
      </div>
    );
  }

  if (content.contentType === "investment") {
    return (
      <div>
        {d.investmentRange ? (
          <>
            <div style={label}>Investment range</div>
            <div style={value}>{String(d.investmentRange)}</div>
          </>
        ) : null}
        <div style={statusStyle}>{d.done ? "Complete" : "In progress"}</div>
        <Link href="/apply/investment" style={linkStyle}>
          Continue →
        </Link>
      </div>
    );
  }

  if (content.contentType === "gap") {
    return (
      <div>
        {d.completenessScore != null ? (
          <>
            <div style={label}>Completeness</div>
            <div style={value}>{String(d.completenessScore)}%</div>
          </>
        ) : (
          <div style={statusStyle}>Not yet run</div>
        )}
        <Link href="/gap-analysis" style={linkStyle}>
          Run gap analysis →
        </Link>
      </div>
    );
  }

  if (content.contentType === "generation") {
    const docCount = d.docCount != null ? Number(d.docCount) : 0;
    return (
      <div>
        {docCount > 0 ? (
          <>
            <div style={label}>Documents ready</div>
            <div style={value}>{docCount} of 15</div>
          </>
        ) : (
          <div style={statusStyle}>Not started</div>
        )}
        <Link href="/apply/generate" style={linkStyle}>
          Generate documents →
        </Link>
      </div>
    );
  }

  if (content.contentType === "interview") {
    return (
      <div>
        {d.sessionsUsed != null ? (
          <>
            <div style={label}>Sessions used</div>
            <div style={value}>
              {String(d.sessionsUsed)} of {String(d.sessionsPurchased ?? 3)}
            </div>
          </>
        ) : (
          <div style={statusStyle}>Not started</div>
        )}
        <Link href="/simulator" style={linkStyle}>
          Start simulator →
        </Link>
      </div>
    );
  }

  return null;
}
