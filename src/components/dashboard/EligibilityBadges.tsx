"use client";
import { deriveStrengthBadges } from "@/lib/strength-badges";

interface EligibilityBadgesProps {
  outcome: string;
  warnings: string[];
  answers: Record<string, string>;
  investmentRange: string | null;
}

export default function EligibilityBadges({
  outcome,
  warnings,
  answers,
  investmentRange,
}: EligibilityBadgesProps) {
  const strengths = deriveStrengthBadges(outcome, warnings, answers, investmentRange);

  if (strengths.length === 0) return null;

  return (
    <div
      style={{
        padding: "14px 20px",
        background: "#111111",
        border: "1px solid rgba(201,168,76,0.12)",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.5)",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 600,
          marginBottom: "10px",
        }}
      >
        Case Strengths
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {strengths.map((s, i) => (
          <div
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "4px 10px",
              border: "1px solid rgba(201,168,76,0.3)",
              background: "rgba(201,168,76,0.04)",
            }}
          >
            <span style={{ color: "#C9A84C", fontSize: "10px", lineHeight: 1 }}>✓</span>
            <span
              style={{
                fontSize: "11px",
                color: "rgba(245,240,232,0.82)",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 400,
                letterSpacing: "0.02em",
              }}
            >
              {s}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
