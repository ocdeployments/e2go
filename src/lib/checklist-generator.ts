export interface ChecklistItem {
  id: string;
  document: string;
  condition: string;
  source: "always" | "pre-filled" | "quiz-derived";
  prefillNote: string | null;
  required: boolean;
  tabReference: string;
  sharedTabs?: string[];
  crossTabNote?: string;
  warning?: string;
}

interface QuizData {
  answers?: Record<string, string | string[]>;
}

export function generatePreAppChecklist(quizData: QuizData | null): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (!quizData || !quizData.answers) {
    return getGenericChecklist();
  }

  const answers = quizData.answers;

  // Parse family composition
  const familyQ = answers["Q0-16"] as string;
  const hasSpouse = familyQ?.includes("spouse") || false;
  const hasChildren = familyQ?.includes("children") || false;
  const isMarried = familyQ?.includes("married") || false; // From sub-question or inferred
  const isPartnership = (answers["Q0-09"] as string)?.includes("partner") || false;
  const isCurrentlyInUS = (answers["Q0-03"] as string)?.includes("United States") ||
                          (answers["processing_path"] as string)?.toLowerCase() === "change of status";

  // ALWAYS include
  items.push({
    id: "passport",
    document: "Valid Canadian passport",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B"
  });

  if (isMarried || hasSpouse) {
    items.push({
      id: "marriage_cert",
      document: "Marriage certificate (certified/notarized copy)",
      condition: "if_married",
      source: "pre-filled",
      prefillNote: "We know you are married from your eligibility check. One certified copy of your marriage certificate is required.",
      required: true,
      tabReference: "Tab B",
      sharedTabs: ["Tab B", "Tab L"],
      crossTabNote: "One certified copy covers both your personal binder (Tab B) and your dependent section (Tab L)."
    });
  }

  if (hasSpouse) {
    items.push({
      id: "spouse_passport",
      document: "Spouse's passport biographical page (copy)",
      condition: "if_spouse",
      source: "pre-filled",
      prefillNote: "Your spouse is listed as a dependent in your eligibility check.",
      required: true,
      tabReference: "Tab L",
      sharedTabs: ["Tab B", "Tab L"],
      crossTabNote: "One copy covers both Tab B and Tab L."
    });
    items.push({
      id: "spouse_birth_cert",
      document: "Spouse's birth certificate (certified copy)",
      condition: "if_spouse",
      source: "pre-filled",
      prefillNote: "Your spouse is listed as a dependent in your eligibility check.",
      required: true,
      tabReference: "Tab L",
      sharedTabs: ["Tab B", "Tab L"],
      crossTabNote: "One certified copy covers both Tab B and Tab L."
    });
  }

  if (hasChildren) {
    items.push({
      id: "child_passport",
      document: "Child's passport biographical page (copy)",
      condition: "if_children",
      source: "pre-filled",
      prefillNote: "Dependent children were indicated in your eligibility check.",
      required: true,
      tabReference: "Tab L",
      sharedTabs: ["Tab B", "Tab L"],
      crossTabNote: "One copy per child covers both Tab B and Tab L."
    });
    items.push({
      id: "child_birth_cert",
      document: "Child's birth certificate (certified copy)",
      condition: "if_children",
      source: "pre-filled",
      prefillNote: "Dependent children were indicated in your eligibility check.",
      required: true,
      tabReference: "Tab L",
      sharedTabs: ["Tab B", "Tab L"],
      crossTabNote: "One certified copy per child covers both Tab B and Tab L."
    });
  }

  if (isPartnership) {
    items.push({
      id: "partner_passport",
      document: "Business partner's passport biographical page",
      condition: "if_partnership",
      source: "pre-filled",
      prefillNote: "A business partner was indicated in your eligibility check.",
      required: true,
      tabReference: "Tab B"
    });
  }

  if (isCurrentlyInUS) {
    items.push({
      id: "i94",
      document: "I-94 record (print from i94.cbp.dhs.gov)",
      condition: "if_in_us",
      source: "pre-filled",
      prefillNote: "You indicated you are currently in the United States. Your checklist reflects a Change of Status application.",
      required: true,
      tabReference: "Tab B"
    });
    items.push({
      id: "us_status",
      document: "Current U.S. visa status documentation",
      condition: "if_in_us",
      source: "pre-filled",
      prefillNote: "You indicated you are currently in the United States. Your checklist reflects a Change of Status application.",
      required: true,
      tabReference: "Tab B"
    });
  } else {
    items.push({
      id: "mrv_receipt",
      document: "MRV fee receipt",
      condition: "if_consular",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    });
    items.push({
      id: "appt_letter",
      document: "Appointment confirmation letter",
      condition: "if_consular",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    });
  }

  // Base documents
  items.push({
    id: "photos",
    document: "Two passport-style photographs",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B"
  });
  items.push({
    id: "birth_cert",
    document: "Canadian birth certificate (certified copy)",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B"
  });
  items.push({
    id: "ds160",
    document: "DS-160 confirmation page",
    condition: "always",
    source: "always",
    prefillNote: "Generated after your DS-160 submission.",
    required: true,
    tabReference: "Tab B"
  });
  items.push({
    id: "ds156e",
    document: "DS-156E form (principal applicant)",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B",
    warning: "Required at some consulates — check your specific post's requirements. Toronto does not require the DS-156E, but other posts may."
  });

  return items;
}

function getGenericChecklist(): ChecklistItem[] {
  return [
    {
      id: "passport",
      document: "Valid Canadian passport",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "photos",
      document: "Two passport-style photographs",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "birth_cert",
      document: "Canadian birth certificate (certified copy)",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "ds160",
      document: "DS-160 confirmation page",
      condition: "always",
      source: "always",
      prefillNote: "Generated after your DS-160 submission.",
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "ds156e",
      document: "DS-156E form (principal applicant)",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "mrv_receipt",
      document: "MRV fee receipt",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
    {
      id: "appt_letter",
      document: "Appointment confirmation letter",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B"
    },
  ];
}
