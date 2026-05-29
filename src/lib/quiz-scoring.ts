import scoringData from "../../public/data/module0_scoring_logic.json";

export interface QuizResult {
  outcome: "PROCEED" | "PROCEED_RISK" | "ATTORNEY_RECOMMENDED" | "DO_NOT_PROCEED";
  hard_stop_codes: string[];
  attorney_flag_codes: string[];
  risk_flag_codes: string[];
  application_type: "solo" | "partnership" | null;
  investment_amount?: number;
  investment_currency?: "USD" | "CAD";
}

export interface AnswerRecord {
  question_key: string;
  answer_value: string;
}

const hardStops = scoringData.hard_stops as Array<{
  code: string;
  question: string;
  trigger: string[];
}>;

const attorneyFlags = scoringData.attorney_flags as Array<{
  code: string;
  question: string;
  trigger: string[];
  level?: string;
}>;

const riskFlags = scoringData.risk_flags as Array<{
  code: string;
  question: string;
  trigger: string[];
  level?: string;
}>;

const investmentThresholds = scoringData.investment_thresholds_usd as {
  clean: { min_usd: number; flag: null };
  soft_advisory: { min_usd: number; max_usd: number; flag: string };
  strong_warning: { max_usd: number; flag: string };
};

const hardStopMessages: Record<string, string> = {
  "PR-01": "Principal applicant not a Canadian citizen",
  "PR-02": "Principal applicant in U.S. without valid status",
  "PR-03": "No investment funds currently available",
  "PR-04": "Loan secured by business assets",
  "PR-05": "Passive investor role",
  "PR-06": "More than two equal owners",
  "PR-07": "Passive real estate holding",
  "PR-08": "Cannabis-related business",
  "PR-09": "No active management role",
};

const flagMessages: Record<string, string> = {
  "W-01": "You may need a valid Canadian passport for travel",
  "W-02": "Your current U.S. status may need verification",
  "W-03": "Applying from outside Canada/US may have additional requirements",
  "W-04": "Having funds already committed strengthens your application",
  "W-05": "Investment below $150K may face additional scrutiny",
  "W-06": "Clear source of funds documentation is essential",
  "W-07": "Documenting the full path of your funds is recommended",
  "W-08": "Loan structure should be clearly documented",
  "W-09": "Your role in the business should be clearly defined",
  "W-10": "Ownership structure affects your application path",
  "W-11-OLD": "A past visa refusal must be disclosed on DS-160",
  "W-11-RECENT": "Recent visa refusal requires legal review before proceeding",
  "W-11-MULTIPLE": "Multiple refusals require legal review - consult an attorney",
  "W-12": "Prior entry issues must be disclosed",
  "W-13-OLD": "Past convictions should be disclosed on DS-160",
  "W-13-RECENT": "Recent convictions require legal review",
  "W-13-SERIOUS": "Serious convictions require legal consultation",
  "W-13-UNSURE": "Criminal history must be clarified before proceeding",
  "W-14": "Business partner nationality affects your application",
  "W-15": "Both partners should be actively involved in the business",
  "W-16": "Legal marriage documentation is required for spouse",
  "W-17": "All dependents need valid passports",
  "W-18": "Adult children may need separate applications",
  "W-19": "Dependent visa history must be disclosed",
  "W-PROP-SOFT": "Investment below $150K - consider this advisory",
  "W-PROP-STRONG": "Investment below $75K - strong advisory flag",
  "W-NI-01": "Canadian property ties should be documented",
  "W-NI-02": "Family ties to Canada are positive for 214(b)",
  "W-NI-03": "Maintaining Canadian financial accounts is positive",
  "W-NI-WEAK": "Limited Canadian ties may increase 214(b) risk",
  "W-NI-NONE": "Strong Canadian ties recommended - consult attorney",
};

export function evaluateAnswers(answers: Record<string, string | string[]>): QuizResult {
  const hardStopCodes: string[] = [];
  const attorneyFlagCodes: string[] = [];
  const riskFlagCodes: string[] = [];
  let applicationType: "solo" | "partnership" | null = null;
  let investmentAmount: number | undefined;
  let investmentCurrency: "USD" | "CAD" | undefined;

  // Check for hard stops first (priority 1)
  for (const stop of hardStops) {
    const answer = answers[stop.question];
    if (answer && stop.trigger.includes(answer as string)) {
      hardStopCodes.push(stop.code);
    }
  }

  // If hard stop, return immediately
  if (hardStopCodes.length > 0) {
    return {
      outcome: "DO_NOT_PROCEED",
      hard_stop_codes: hardStopCodes,
      attorney_flag_codes: [],
      risk_flag_codes: [],
      application_type: null,
    };
  }

  // Check attorney-recommended flags (priority 2)
  for (const flag of attorneyFlags) {
    // Check if this flag has a level specified (attorney recommended level)
    if (flag.level === "attorney_recommended" || flag.code.startsWith("W-11-") || flag.code.startsWith("W-13-")) {
      const answer = answers[flag.question];
      if (answer && flag.trigger.includes(answer as string)) {
        attorneyFlagCodes.push(flag.code);
      }
    }
  }

  // Check risk flags (priority 3)
  for (const flag of riskFlags) {
    // Skip attorney-level flags
    if (flag.level === "attorney_recommended") continue;

    const answer = answers[flag.question];
    if (answer && flag.trigger.includes(answer as string)) {
      riskFlagCodes.push(flag.code);
    }
  }

  // Check investment amount for proportionality flags
  const amountKey = Object.keys(answers).find((k) => k.startsWith("Q0-05"));
  if (amountKey) {
    const amount = parseFloat(answers[amountKey] as string);
    const currencyKey = `${amountKey}_currency`;
    investmentCurrency = (answers[currencyKey] as "USD" | "CAD") || "USD";

    // Convert to USD if CAD
    const amountUSD = investmentCurrency === "CAD" ? amount * 0.73 : amount;
    investmentAmount = amount;

    // Apply investment thresholds
    if (amountUSD >= investmentThresholds.clean.min_usd) {
      // Clean - no flag
    } else if (amountUSD >= investmentThresholds.soft_advisory.min_usd) {
      riskFlagCodes.push("W-PROP-SOFT");
    } else {
      riskFlagCodes.push("W-PROP-STRONG");
    }
  }

  // Determine application type from Q0-09
  const q009 = answers["Q0-09"];
  if (q009 === "Two equal 50/50 owners") {
    applicationType = "partnership";
  } else if (q009 === "Sole owner") {
    applicationType = "solo";
  }

  // Determine final outcome
  let outcome: QuizResult["outcome"];
  if (attorneyFlagCodes.length > 0) {
    outcome = "ATTORNEY_RECOMMENDED";
  } else if (riskFlagCodes.length > 0) {
    outcome = "PROCEED_RISK";
  } else {
    outcome = "PROCEED";
  }

  return {
    outcome,
    hard_stop_codes: hardStopCodes,
    attorney_flag_codes: attorneyFlagCodes,
    risk_flag_codes: riskFlagCodes,
    application_type: applicationType,
    investment_amount: investmentAmount,
    investment_currency: investmentCurrency,
  };
}

export function getStopMessage(code: string): string {
  return hardStopMessages[code] || "Application not eligible";
}

export function getWarningMessage(code: string): string {
  return flagMessages[code] || code;
}

export function getAllWarnings(result: QuizResult): string[] {
  const warnings: string[] = [];

  for (const code of result.attorney_flag_codes) {
    warnings.push(getWarningMessage(code));
  }

  for (const code of result.risk_flag_codes) {
    warnings.push(getWarningMessage(code));
  }

  return warnings;
}
