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

function strVal(v: string | string[] | undefined): string {
  if (!v) return '';
  return Array.isArray(v) ? v.join(',') : v;
}

export function generatePreAppChecklist(quizData: QuizData | null): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  if (!quizData || !quizData.answers) {
    return getGenericChecklist();
  }

  const answers = quizData.answers;

  // Parse family composition
  const familyQ = answers["Q0-03"] as string;
  const hasSpouse = familyQ?.includes("spouse") || false;
  const hasChildren = familyQ?.includes("children") || false;
  const isMarried = familyQ?.includes("married") || false; // From sub-question or inferred
  const isPartnership = (answers["Q0-04"] as string)?.includes("partner") || false;
  const isCurrentlyInUS = (answers["Q0-05"] as string)?.includes("within the US") ||
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

  // ─── FINANCIAL EVIDENCE (Tab B) ──────────────────────────────────────────
  const fundSources = strVal(answers["M3-F-05"]).toLowerCase();
  const giftAnswer  = strVal(answers["M3-H-05"]).toLowerCase();
  const investType  = strVal(answers["M3-F-01"]).toLowerCase();
  const isGiftFunded = giftAnswer.includes("gift");
  const isFranchise  = investType === "franchise";

  // Always: bank statements
  items.push({
    id: "bank_statements",
    document: "Personal bank statements — 6 months minimum (all accounts used)",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B",
    warning: "Must show the full accumulation and movement of investment funds. Statements should be official (downloaded from online banking or issued by the branch) — not handwritten."
  });

  // Always: transfer records showing funds moved to U.S. entity
  items.push({
    id: "transfer_records",
    document: "Wire transfer records or bank confirmation showing investment funds wired to U.S. business account",
    condition: "always",
    source: "always",
    prefillNote: null,
    required: true,
    tabReference: "Tab B",
    warning: "Officers trace every dollar. If funds moved through multiple accounts or currencies, you need records for each leg of the transfer."
  });

  // RRSP / TFSA
  if (fundSources.includes("rrsp")) {
    items.push({
      id: "rrsp_withdrawal",
      document: "RRSP withdrawal confirmation and T4RSP tax slip",
      condition: "if_rrsp_used",
      source: "pre-filled",
      prefillNote: "RRSP was selected as a funding source in your case file.",
      required: true,
      tabReference: "Tab B"
    });
  }
  if (fundSources.includes("tfsa")) {
    items.push({
      id: "tfsa_withdrawal",
      document: "TFSA withdrawal confirmation statement",
      condition: "if_tfsa_used",
      source: "pre-filled",
      prefillNote: "TFSA was selected as a funding source in your case file.",
      required: true,
      tabReference: "Tab B"
    });
  }

  // Property sale
  if (fundSources.includes("property")) {
    items.push({
      id: "property_sale_statement",
      document: "Real estate closing statement (HUD-1 or Canadian equivalent) showing net sale proceeds",
      condition: "if_property_sale",
      source: "pre-filled",
      prefillNote: "Property sale was selected as a funding source in your case file.",
      required: true,
      tabReference: "Tab B",
      warning: "The closing statement must show the sale price, mortgage payoff, and net proceeds deposited. A realtor letter alone is not sufficient."
    });
  }

  // Loan funding
  if (fundSources.includes("loan")) {
    items.push({
      id: "loan_agreement",
      document: "Loan agreement and repayment schedule (signed by both parties)",
      condition: "if_loan_used",
      source: "pre-filled",
      prefillNote: "Loan was selected as a funding source in your case file.",
      required: true,
      tabReference: "Tab B",
      warning: "Officers must be able to confirm the loan is at-risk capital (your personal liability). Include any collateral documentation."
    });
  }

  // Gift / inheritance
  if (isGiftFunded) {
    items.push({
      id: "gift_letter",
      document: "Gift letter — signed and dated by donor (name, relationship, amount, irrevocability statement)",
      condition: "if_gift_funded",
      source: "pre-filled",
      prefillNote: "Gift or inheritance was indicated in your case file investment section.",
      required: true,
      tabReference: "Tab B",
      warning: "The gift letter must state the funds are a genuine gift with no expectation of repayment, and that they are available for E-2 investment. E2go generates this document for you."
    });
    items.push({
      id: "donor_source_docs",
      document: "Donor's source of funds documentation (bank statements, tax returns, or property sale records showing where gift originated)",
      condition: "if_gift_funded",
      source: "pre-filled",
      prefillNote: "Gift or inheritance was indicated in your case file investment section.",
      required: true,
      tabReference: "Tab B",
      warning: "The officer will trace the gift funds back to the donor's own source. A gift letter alone is never sufficient — you need the donor's paper trail too."
    });
  }

  // Franchise-specific financial evidence
  if (isFranchise) {
    items.push({
      id: "franchise_fee_invoice",
      document: "Franchise fee invoice and payment confirmation (from franchisor)",
      condition: "if_franchise",
      source: "pre-filled",
      prefillNote: "Franchise investment type was indicated in your case file.",
      required: true,
      tabReference: "Tab B",
      warning: "The initial franchise fee payment is key evidence that funds are irrevocably committed. Include the invoice and your bank's confirmation of the wire or payment."
    });
    items.push({
      id: "fdd_item7",
      document: "FDD Item 7 — Estimated Initial Investment schedule (from your Franchise Disclosure Document)",
      condition: "if_franchise",
      source: "pre-filled",
      prefillNote: "Franchise investment type was indicated in your case file.",
      required: true,
      tabReference: "Tab B",
      warning: "Item 7 of the FDD is the officer's benchmark for whether your investment amount is consistent with what the franchisor discloses for this business. A copy of the relevant FDD pages must be included."
    });
  }
  // ─────────────────────────────────────────────────────────────────────────

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
    {
      id: "bank_statements",
      document: "Personal bank statements — 6 months minimum (all accounts used)",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B",
      warning: "Must show the full accumulation and movement of investment funds."
    },
    {
      id: "transfer_records",
      document: "Wire transfer records showing investment funds wired to U.S. business account",
      condition: "always",
      source: "always",
      prefillNote: null,
      required: true,
      tabReference: "Tab B",
      warning: "Officers trace every dollar. If funds moved through multiple accounts, include records for each leg."
    },
  ];
}
