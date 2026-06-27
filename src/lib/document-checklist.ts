/**
 * Generates a customized interview day document checklist
 * based on the applicant's case profile.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  detail?: string;
  tab?: string;
  critical: boolean;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface CaseFlags {
  applicationType: string;           // solo, solo_spouse, partnership_*, etc.
  hasSpouseApplying: boolean;
  dependentChildCount: number;
  isFranchise: boolean;
  investmentSources: string[];       // 'rrsp_withdrawal', 'property_sale', 'gift', 'loan', etc.
  priorVisaDenial: boolean;
  operationalStatus: string;         // 'operational', 'pre_start', 'not_yet_formed'
  businessCategory: string;
  hasDocumentUploads: boolean;
  hasPartner: boolean;
}

export function buildDocumentChecklist(flags: CaseFlags): ChecklistSection[] {
  const sections: ChecklistSection[] = [];

  // -----------------------------------------------------------------------
  // Section 1 — Personal Documents (always required)
  // -----------------------------------------------------------------------
  sections.push({
    id: 'personal',
    title: 'Personal Documents',
    items: [
      {
        id: 'passport',
        label: 'Valid passport',
        detail: 'Must have at least 6 months of validity beyond your intended period of stay in the U.S. Bring the original — not a copy.',
        critical: true,
      },
      {
        id: 'ds160',
        label: 'DS-160 confirmation page (printed)',
        detail: 'The confirmation page with the barcode. Officers will not admit you without it.',
        tab: 'Tab A',
        critical: true,
      },
      {
        id: 'appointment',
        label: 'Interview appointment confirmation (printed)',
        detail: 'Your CGI Federal or AIS appointment confirmation email, printed.',
        critical: true,
      },
      {
        id: 'mrv_receipt',
        label: 'MRV fee payment receipt',
        detail: 'Proof that the $315 USD visa application fee has been paid.',
        critical: true,
      },
      {
        id: 'photo',
        label: 'Passport-style photograph (if not yet submitted)',
        detail: 'Standard 2"×2" photo on white background. Not always required if already uploaded with DS-160.',
        critical: false,
      },
    ],
  });

  // -----------------------------------------------------------------------
  // Section 2 — Application Binder (always required)
  // -----------------------------------------------------------------------
  const binderItems: ChecklistItem[] = [
    {
      id: 'cover_letter',
      label: 'Cover letter (Tab B)',
      detail: 'The single most important document. Should answer all five of the officer\'s core questions within the first two pages.',
      tab: 'Tab B',
      critical: true,
    },
    {
      id: 'ds156e',
      label: 'DS-156E Nonimmigrant Treaty Trader/Investor Application (Tab A)',
      detail: 'The E-visa specific form, distinct from DS-160. Must be complete and signed.',
      tab: 'Tab A',
      critical: true,
    },
    {
      id: 'business_plan',
      label: 'Business plan (Tab K)',
      detail: 'Includes financial projections for Year 1, 3, and 5, market analysis, and hiring plan.',
      tab: 'Tab K',
      critical: true,
    },
    {
      id: 'source_of_funds',
      label: 'Source of funds chronology (Tab H)',
      detail: 'The complete paper trail from the origin of your funds to the U.S. business account. No gaps.',
      tab: 'Tab H',
      critical: true,
    },
    {
      id: 'investment_evidence',
      label: 'Investment evidence — wire transfers, receipts, contracts (Tab F)',
      detail: 'Wire transfer confirmations, franchise fee payment receipts, lease agreements, equipment purchase orders.',
      tab: 'Tab F',
      critical: true,
    },
    {
      id: 'entity_docs',
      label: 'U.S. entity documentation — LLC/Corp formation, EIN, bank account (Tab C)',
      detail: 'Articles of organization/incorporation, EIN letter from IRS, U.S. business bank account statement.',
      tab: 'Tab C',
      critical: true,
    },
    {
      id: 'investor_bio',
      label: 'Investor biography / qualifications (Tab J)',
      detail: 'Your professional background, education, and management experience. Connects your qualifications to this specific business.',
      tab: 'Tab J',
      critical: true,
    },
    {
      id: 'operating_agreement',
      label: 'Operating agreement (Tab C)',
      detail: 'Showing ownership structure and investor control over the business.',
      tab: 'Tab C',
      critical: true,
    },
    {
      id: 'projections',
      label: 'Financial projections with supporting assumptions (Tab I)',
      detail: 'Year 1–5 revenue, net income, and employment projections — with the evidence base for each number.',
      tab: 'Tab I',
      critical: true,
    },
  ];
  sections.push({
    id: 'binder',
    title: 'Application Binder — Required Tabs',
    items: binderItems,
  });

  // -----------------------------------------------------------------------
  // Section 3 — Case-specific additions
  // -----------------------------------------------------------------------
  const caseSpecificItems: ChecklistItem[] = [];

  // Franchise
  if (flags.isFranchise || flags.businessCategory.toLowerCase().includes('franchise')) {
    caseSpecificItems.push({
      id: 'fdd',
      label: 'Franchise Disclosure Document (FDD) — original',
      detail: 'Bring the full FDD. Officers may ask to see Item 19 (Financial Performance Representation) or Item 21 (Financial Statements) on the spot.',
      tab: 'Tab G',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'franchise_agreement',
      label: 'Signed Franchise Agreement',
      detail: 'The executed contract between you and the franchisor. Shows commitment and investment terms.',
      tab: 'Tab G',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'franchisor_support_letter',
      label: 'Franchisor support letter (if provided)',
      detail: 'Many franchisors provide a letter confirming the franchisee\'s investment, territory, and training plan.',
      tab: 'Tab G',
      critical: false,
    });
  }

  // RRSP source of funds
  if (flags.investmentSources.includes('rrsp_withdrawal')) {
    caseSpecificItems.push({
      id: 'rrsp',
      label: 'RRSP redemption statement',
      detail: 'The official statement from your financial institution showing the RRSP balance, withdrawal amount, and date. Must show the origin of the funds within the RRSP.',
      tab: 'Tab H',
      critical: true,
    });
  }

  // Property sale source of funds
  if (flags.investmentSources.includes('property_sale')) {
    caseSpecificItems.push({
      id: 'property_sale',
      label: 'Property sale documentation',
      detail: 'Agreement of purchase and sale, statement of adjustments from the real estate lawyer showing net proceeds, and bank statement showing deposit.',
      tab: 'Tab H',
      critical: true,
    });
  }

  // Gift source of funds
  if (flags.investmentSources.includes('gift')) {
    caseSpecificItems.push({
      id: 'gift_letter',
      label: 'Gift letter and donor\'s bank statement',
      detail: 'A signed gift letter on the donor\'s letterhead confirming the gift is unconditional, plus the donor\'s bank statement showing the funds existed before the gift.',
      tab: 'Tab H',
      critical: true,
    });
  }

  // Loan source of funds
  if (flags.investmentSources.includes('loan')) {
    caseSpecificItems.push({
      id: 'loan_agreement',
      label: 'Loan agreement and lender documentation',
      detail: 'The executed loan agreement showing terms, the lender\'s ability to make the loan, and evidence of funds transfer to the business.',
      tab: 'Tab H',
      critical: true,
    });
  }

  // Prior denial
  if (flags.priorVisaDenial) {
    caseSpecificItems.push({
      id: 'prior_denial_docs',
      label: 'Prior visa denial documentation',
      detail: 'Any documentation relating to your previous visa denial, including the original application, refusal notice, and your attorney\'s explanation of what has materially changed.',
      tab: 'Tab L',
      critical: true,
    });
  }

  // Spouse applying
  if (flags.hasSpouseApplying) {
    caseSpecificItems.push({
      id: 'marriage_cert',
      label: 'Marriage certificate (original + certified copy)',
      detail: 'Required for the E-2S (spouse) dependent visa application.',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'spouse_passport',
      label: 'Spouse\'s valid passport',
      detail: 'Spouse attends their own interview appointment. Each applicant needs their own DS-160 and documentation.',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'spouse_ds160',
      label: 'Spouse\'s DS-160 confirmation page (printed)',
      detail: 'A separate DS-160 must be completed for the spouse. Each family member has their own form.',
      critical: true,
    });
  }

  // Children applying
  if (flags.dependentChildCount > 0) {
    caseSpecificItems.push({
      id: 'birth_certificates',
      label: `Birth certificate(s) for ${flags.dependentChildCount} dependent child${flags.dependentChildCount > 1 ? 'ren' : ''} (originals)`,
      detail: 'Required to establish the parent-child relationship for E-2 dependent visas. Each child who is applying needs their own DS-160.',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'children_passports',
      label: `Passport(s) for ${flags.dependentChildCount} applying child${flags.dependentChildCount > 1 ? 'ren' : ''}`,
      detail: 'Each applying child needs a valid passport. Children under 14 do not require a separate interview appointment at most posts.',
      critical: true,
    });
  }

  // Business partner
  if (flags.hasPartner) {
    caseSpecificItems.push({
      id: 'partnership_agreement',
      label: 'Partnership agreement / operating agreement showing ownership split',
      detail: 'Must clearly show that the treaty-country national(s) own at least 50% of the enterprise.',
      tab: 'Tab C',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'partner_nationality',
      label: 'Partner\'s nationality documentation (if not also applying for E-2)',
      detail: 'If your business partner holds the same treaty nationality but is not applying for a visa, documentation of their nationality may be required.',
      tab: 'Tab C',
      critical: false,
    });
  }

  // Pre-operational business
  if (flags.operationalStatus === 'pre_start' || flags.operationalStatus === 'not_yet_formed') {
    caseSpecificItems.push({
      id: 'lease_agreement',
      label: 'Signed lease agreement for business premises',
      detail: 'An executed lease shows the business location is committed and investment is real. A letter of intent is significantly weaker.',
      tab: 'Tab F',
      critical: true,
    });
    caseSpecificItems.push({
      id: 'vendor_contracts',
      label: 'Vendor contracts, equipment purchase orders, or supplier agreements',
      detail: 'Any binding commitment that shows funds are irrevocably at risk and the business is real.',
      tab: 'Tab F',
      critical: false,
    });
  }

  if (caseSpecificItems.length > 0) {
    sections.push({
      id: 'case_specific',
      title: 'Additional Documents — Based on Your Case',
      items: caseSpecificItems,
    });
  }

  // -----------------------------------------------------------------------
  // Section 4 — What NOT to bring (always shown)
  // -----------------------------------------------------------------------
  sections.push({
    id: 'do_not_bring',
    title: 'Do Not Bring',
    items: [
      {
        id: 'no_phone',
        label: 'Cell phone or smartphone',
        detail: 'Not permitted inside the consulate building under any circumstances.',
        critical: true,
      },
      {
        id: 'no_electronics',
        label: 'Laptop, tablet, smartwatch, or any other electronic device',
        detail: 'All electronic devices must be left in your vehicle or at the security desk outside.',
        critical: true,
      },
      {
        id: 'no_large_bags',
        label: 'Large backpacks or laptop bags',
        detail: 'Security may turn away oversized bags. Bring only what is necessary — a slim briefcase or folder is ideal.',
        critical: false,
      },
      {
        id: 'no_non_applicants',
        label: 'Non-applying companions (friends, support people)',
        detail: 'Only visa applicants are admitted. If your spouse or children are applying, they have their own appointments. Non-applying family members wait outside.',
        critical: false,
      },
      {
        id: 'no_food_drinks',
        label: 'Food or open beverages',
        detail: 'Not permitted past security at most posts.',
        critical: false,
      },
    ],
  });

  return sections;
}

/**
 * Count total critical items across all sections
 */
export function countCriticalItems(sections: ChecklistSection[]): number {
  return sections.flatMap((s) => s.items).filter((i) => i.critical).length;
}

/**
 * Flatten all items across sections for a printable list
 */
export function flattenChecklist(sections: ChecklistSection[]): ChecklistItem[] {
  return sections.flatMap((s) => s.items);
}
