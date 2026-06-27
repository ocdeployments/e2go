export function deriveStrengthBadges(
  outcome: string,
  warnings: string[],
  answers: Record<string, string>,
  investmentRange: string | null
): string[] {
  const strengths: string[] = [];

  if (outcome === "PROCEED") {
    strengths.push("Strong E-2 eligibility profile");
  } else if (outcome === "PROCEED_RISK") {
    strengths.push("Viable E-2 candidate");
  }

  if (investmentRange) {
    const amount = investmentRange.toLowerCase();
    if (
      amount.includes("500") ||
      amount.includes("750") ||
      amount.includes("$1") ||
      amount.includes("1m")
    ) {
      strengths.push("Substantial investment amount");
    } else if (
      amount.includes("200") ||
      amount.includes("300") ||
      amount.includes("400")
    ) {
      strengths.push("Investment meets proportionality threshold");
    }
  }

  const hasRefusal = warnings.some(
    (w) =>
      w === "W-REFUSAL-RECENT" ||
      w === "W-E2-PRIOR-DENIAL" ||
      w === "W-REFUSAL-MULTIPLE"
  );
  if (!hasRefusal) {
    strengths.push("Clean visa history");
  }

  const hasUnclearSource = warnings.some((w) => w === "W-SOURCE-UNCLEAR");
  if (!hasUnclearSource) {
    strengths.push("Clear source of funds");
  }

  const businessQ = answers["Q0-08"] ?? "";
  if (
    businessQ.includes("specific business") ||
    businessQ.includes("identified")
  ) {
    strengths.push("Business target already identified");
  }

  const noExpWeakness = !warnings.some(
    (w) => w === "W-EXPERIENCE-WEAK" || w === "W-EXPERIENCE-CRITICAL"
  );
  if (noExpWeakness) {
    strengths.push("Relevant professional background");
  }

  return strengths.slice(0, 5);
}
