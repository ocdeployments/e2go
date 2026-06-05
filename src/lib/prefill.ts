export interface PreFillResult {
  value: string | string[] | null;
  source: "quiz" | "auth" | null;
  note: string | null;
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

export function getQuizAnswers(): Record<string, string | string[]> | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("e2go_quiz_result");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.answers) {
        return parsed.answers;
      }
    } catch (e) {
      console.error("Failed to parse quiz result from localStorage", e);
    }
  }

  return null;
}

export function getPreFill(questionId: string, userEmail?: string): PreFillResult {
  const answers = getQuizAnswers();

  // Map actual app keys (M3-A-*) and session plan keys (QA-*) to the same logic
  const isCitizenship = questionId === "M3-A-05" || questionId === "QA-05";
  const isDualCitizenship = questionId === "M3-A-06" || questionId === "QA-06";
  const isEmail = questionId === "M3-A-12" || questionId === "QA-08";
  const isPriorVisas = questionId === "M3-A-21" || questionId === "QA-23" || questionId === "QA-11";
  const isCriminal = questionId === "M3-A-39" || questionId === "QA-39";
  const isRemoval = questionId === "M3-A-46" || questionId === "QA-46";
  const isOverstay = questionId === "M3-A-47" || questionId === "QA-47";
  const isBundled = questionId === "M3-A-48" || questionId === "QA-48";

  switch (true) {
    case isCitizenship:
      if (answers?.["Q0-01"]) {
        return {
          value: answers["Q0-01"],
          source: "quiz",
          note: "From your eligibility check"
        };
      }
      break;

    case isDualCitizenship:
      if (answers?.["Q0-01"]) {
        return {
          value: "No",
          source: "quiz",
          note: "From your eligibility check"
        };
      }
      break;

    case isEmail:
      if (userEmail) {
        return {
          value: userEmail,
          source: "auth",
          note: "From your account"
        };
      }
      break;

    case questionId === "M3-F-02" || questionId === "QF-02":
      if (answers?.["Q0-05"]) {
        return {
          value: answers["Q0-05"],
          source: "quiz",
          note: "From your eligibility check — confirm or update if this has changed"
        };
      }
      break;

    case questionId === "M3-F-05" || questionId === "QF-05":
      if (answers?.["Q0-07"]) {
        const hasLoan = String(answers["Q0-07"]).toLowerCase().includes("loan");
        return {
          value: hasLoan ? "Loan" : "No",
          source: "quiz",
          note: hasLoan ? "A loan was indicated in your eligibility check" : null
        };
      }
      break;

    case isPriorVisas:
      if (answers?.["Q0-11"]) {
        return {
          value: answers["Q0-11"],
          source: "quiz",
          note: "From your eligibility check",
          requiresConfirmation: true,
          confirmationText: "I confirm this accurately reflects my complete U.S. visa application history."
        };
      }
      break;

    case isCriminal:
      if (answers?.["Q0-13"]) {
        return {
          value: answers["Q0-13"],
          source: "quiz",
          note: "Confirmed from your eligibility check",
          requiresConfirmation: true,
          confirmationText: "I confirm this answer is accurate, complete, and consistent with what I will declare at the consulate."
        };
      }
      break;

    case isRemoval:
      if (answers?.["Q0-12-removal"]) {
        return {
          value: answers["Q0-12-removal"],
          source: "quiz",
          note: "From your eligibility check",
          requiresConfirmation: true,
          confirmationText: "I confirm this accurately reflects my complete immigration history."
        };
      }
      break;

    case isOverstay:
      if (answers?.["Q0-12-overstay"]) {
        return {
          value: answers["Q0-12-overstay"],
          source: "quiz",
          note: "From your eligibility check",
          requiresConfirmation: true,
          confirmationText: "I confirm this accurately reflects my complete immigration history."
        };
      }
      break;

    case isBundled:
      if (answers?.["Q0-11"] || answers?.["Q0-12"]) {
        return {
          value: "Combined from eligibility check",
          source: "quiz",
          note: "This field combines your visa refusal and entry history from your eligibility check. Review carefully before confirming.",
          requiresConfirmation: true,
          confirmationText: "I confirm this accurately reflects my complete immigration history."
        };
      }
      break;

    case questionId === "M3-L-family" || questionId === "QL-family":
      if (answers?.["Q0-16"]) {
        return {
          value: answers["Q0-16"],
          source: "quiz",
          note: getFamilyNote(answers["Q0-16"])
        };
      }
      break;
  }

  return { value: null, source: null, note: null };
}

function getFamilyNote(value: string | string[]): string {
  const val = String(value).toLowerCase();
  if (val.includes("none") || val === "no") {
    return "No dependents indicated in your eligibility check.";
  }
  if (val.includes("spouse") && !val.includes("child") && !val.includes("children")) {
    return "One dependent (spouse) was indicated in your eligibility check.";
  }
  if (val.includes("child") || val.includes("children")) {
    return "Dependents were indicated in your eligibility check.";
  }
  return "From your eligibility check.";
}
