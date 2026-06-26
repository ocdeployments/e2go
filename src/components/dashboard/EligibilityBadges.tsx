"use client";

interface EligibilityBadgesProps {
  outcome: string;
  warnings: string[];
  answers: Record<string, string>;
  investmentRange: string | null;
}

/**
 * Derives eligibility strength badges from quiz outcome + answers.
 * The quiz result_json has no explicit "strengths" field, so we derive
 * them from the outcome + absence of specific risk warnings + answer values.
 */
function deriveStrengths(
  outcome: string,
  warnings: string[],
  answers: Record<string, string>,
  investmentRange: string | null
): string[] {
  const strengths: string[] = [];

  // Positive outcome
  if (outcome === "PROCEED") {
    strengths.push("Strong E-2 eligibility profile");
  } else if (outcome === "PROCEED_RISK") {
    strengths.push("Viable E-2 candidate");
  }

  // Investment strength
  if (investmentRange) {
    const amount = investmentRange.toLowerCase();
    if (
      amount.includes("500") ||
      amount.includes("750") ||
      amount.includes("$1") ||
      amount.includes("1m")
    ) {
      strengths.push("Substantial investment amount");
    } else if (amount.includes("200") || amount.includes("300") || amount.includes("400")) {
      strengths.push("Investment meets proportionality threshold");
    }
  }

  // No prior refusal / no E-2 denial
  const hasRefusal = warnings.some(
    (w) => w === "W-REFUSAL-RECENT" || w === "W-E2-PRIOR-DENIAL" || w === "W-REFUSAL-MULTIPLE"
  );
  if (!hasRefusal) {
    strengths.push("Clean visa history");
  }

  // Source of funds — no unclear source warning
  const hasUnclearSource = warnings.some((w) => w === "W-SOURCE-UNCLEAR");
  if (!hasUnclearSource) {
    strengths.push("Clear source of funds");
  }

  // Has a specific business identified
  const businessQ = (answers["Q0-08"] as string | undefined) ?? "";
  if (businessQ.includes("specific business") || businessQ.includes("identified")) {
    strengths.push("Business target already identified");
  }

  // Relevant professional background — no experience weakness
  const noExpWeakness = !warnings.some(
    (w) => w === "W-EXPERIENCE-WEAK" || w === "W-EXPERIENCE-CRITICAL"
  );
  if (noExpWeakness) {
    strengths.push("Relevant professional background");
  }

  return strengths.slice(0, 5);
}

export default function EligibilityBadges({
  outcome,
  warnings,
  answers,
  investmentRange,
}: EligibilityBadgesProps) {
  const strengths = deriveStrengths(outcome, warnings, answers, investmentRange);

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
