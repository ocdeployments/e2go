export type CompressionMode = 'NONE' | 'STANDARD' | 'COMPRESSED' | 'MAXIMUM';
export type PageLimitType = 'overall' | 'per_tab' | 'file_size_only';

export interface TabLimit {
  tabId: string;
  label: string;
  maxPages: number;
}

export interface ConsulateConfig {
  postId: string;
  country: string;
  city: string;
  displayName: string;
  pageLimitType: PageLimitType;
  pageLimit: number | null;
  tabLimits: TabLimit[];
  fileSizeLimitMb: number | null;
  renewalsExempt: boolean;
  coverLetterExempt: boolean;
  cvExempt: boolean;
  exemptDocumentLabels: string[];
  submissionMethod: 'email' | 'online_portal' | 'mail';
  compressionMode: CompressionMode;
  businessPlanPagesMin: number;
  businessPlanPagesMax: number;
  tcnScore: 1 | 2 | 3;
  warnings: string[];
  consulateGuidance?: string;
  officialUrl: string;
  lastVerified: string;
}

export interface DocManifestEntry {
  key: string;
  label: string;
  pagesMin: number;
  pagesMax: number;
  countsTowardLimit: boolean;
  exemptNote?: string;
}

// ---------------------------------------------------------------------------
// Consulate database — sourced from U.S. Embassy websites and confirmed
// submission requirements as of the lastVerified date per entry.
// IMPORTANT: Limits change without notice. Always verify before submission.
// ---------------------------------------------------------------------------

const CONSULATE_MAP: Record<string, ConsulateConfig> = {
  toronto: {
    postId: 'toronto',
    country: 'Canada',
    city: 'Toronto',
    displayName: 'Toronto, Canada',
    pageLimitType: 'overall',
    pageLimit: 50,
    tabLimits: [],
    fileSizeLimitMb: 20,
    renewalsExempt: true,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'Marriage certificate',
      'Birth certificates',
      'Tab dividers / index pages',
    ],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 10,
    businessPlanPagesMax: 13,
    tcnScore: 3,
    warnings: [
      'Toronto reduced its page limit from 70 to 50 pages in mid-2024 with no advance notice. Renewals are exempt from the page limit — new cases are not.',
      'Verify the current limit at ca.usembassy.gov before submitting your final package.',
    ],
    officialUrl: 'https://ca.usembassy.gov/treaty-trader-and-investor-visas/',
    lastVerified: '2026-06',
  },

  frankfurt: {
    postId: 'frankfurt',
    country: 'Germany',
    city: 'Frankfurt',
    displayName: 'Frankfurt, Germany',
    pageLimitType: 'overall',
    pageLimit: 30,
    tabLimits: [],
    fileSizeLimitMb: 20,
    renewalsExempt: false,
    coverLetterExempt: true,
    cvExempt: true,
    exemptDocumentLabels: [
      'Cover letter (unlimited — does not count toward 30 pages)',
      'Applicant resume and qualifications letters (exempt)',
      'DS-160 confirmation page',
      'DS-156E form',
    ],
    submissionMethod: 'email',
    compressionMode: 'MAXIMUM',
    businessPlanPagesMin: 6,
    businessPlanPagesMax: 8,
    tcnScore: 2,
    warnings: [
      'Frankfurt reduced its limit from 90 to 30 pages. Your business plan will be in condensed format — tables and key figures only, no extended narrative.',
      'Your cover letter and qualifications are EXEMPT and do not count toward the 30 pages. Write them at full length.',
    ],
    officialUrl: 'https://de.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  london: {
    postId: 'london',
    country: 'United Kingdom',
    city: 'London',
    displayName: 'London, United Kingdom',
    pageLimitType: 'file_size_only',
    pageLimit: null,
    tabLimits: [],
    fileSizeLimitMb: 20,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'MRV fee receipt',
    ],
    submissionMethod: 'online_portal',
    compressionMode: 'NONE',
    businessPlanPagesMin: 16,
    businessPlanPagesMax: 22,
    tcnScore: 2,
    warnings: [
      'London has no page limit, but a 20 MB total file size cap. All scanned documents must be compressed before upload.',
      'London uses an online portal — not email. The embassy sends the portal link after you book your interview appointment.',
    ],
    officialUrl: 'https://uk.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  paris: {
    postId: 'paris',
    country: 'France',
    city: 'Paris',
    displayName: 'Paris, France',
    pageLimitType: 'overall',
    pageLimit: 50,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: true,
    cvExempt: true,
    exemptDocumentLabels: [
      'Tabs A–C (administrative documents, forms, company structure) — fully exempt from page count',
      'DS-160, DS-156E, and G-28',
    ],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 10,
    businessPlanPagesMax: 13,
    tcnScore: 2,
    warnings: [
      'At Paris, Tabs A–C are fully exempt from the 50-page count — your cover letter and company structure documents are free pages.',
    ],
    officialUrl: 'https://fr.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  amsterdam: {
    postId: 'amsterdam',
    country: 'Netherlands',
    city: 'Amsterdam',
    displayName: 'Amsterdam, Netherlands',
    pageLimitType: 'per_tab',
    pageLimit: null,
    tabLimits: [
      { tabId: 'tab_e', label: 'Tab E — Investment', maxPages: 40 },
      { tabId: 'tab_f', label: 'Tab F — Business Operations', maxPages: 20 },
      { tabId: 'tab_g', label: 'Tab G — Non-Marginality', maxPages: 20 },
    ],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'G-28',
    ],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 8,
    businessPlanPagesMax: 12,
    tcnScore: 2,
    warnings: [
      'Amsterdam uses per-tab limits, not an overall page cap: Tab E (Investment) = 40p, Tab F (Business Operations) = 20p, Tab G (Non-Marginality) = 20p.',
      'At Amsterdam, your cover letter goes in Tab E (Investment), not Tab A. Tab A contains only a Table of Contents.',
    ],
    consulateGuidance:
      '"Do not include brochures or business plans that contribute little or nothing to the value of your case. Please think lean, and demonstrate your business prowess." — U.S. Consulate General Amsterdam',
    officialUrl: 'https://nl.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  sydney: {
    postId: 'sydney',
    country: 'Australia',
    city: 'Sydney',
    displayName: 'Sydney, Australia',
    pageLimitType: 'file_size_only',
    pageLimit: null,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
    submissionMethod: 'email',
    compressionMode: 'NONE',
    businessPlanPagesMin: 16,
    businessPlanPagesMax: 22,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://au.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  melbourne: {
    postId: 'melbourne',
    country: 'Australia',
    city: 'Melbourne',
    displayName: 'Melbourne, Australia',
    pageLimitType: 'file_size_only',
    pageLimit: null,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
    submissionMethod: 'email',
    compressionMode: 'NONE',
    businessPlanPagesMin: 16,
    businessPlanPagesMax: 22,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://au.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  auckland: {
    postId: 'auckland',
    country: 'New Zealand',
    city: 'Auckland',
    displayName: 'Auckland, New Zealand',
    pageLimitType: 'file_size_only',
    pageLimit: null,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
    submissionMethod: 'email',
    compressionMode: 'NONE',
    businessPlanPagesMin: 16,
    businessPlanPagesMax: 22,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://nz.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  tel_aviv: {
    postId: 'tel_aviv',
    country: 'Israel',
    city: 'Tel Aviv',
    displayName: 'Tel Aviv, Israel',
    pageLimitType: 'overall',
    pageLimit: 150,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: true,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'G-28',
      'Resume / CV',
      'Marriage and birth certificates',
      'All Hebrew-to-English certified translations',
    ],
    submissionMethod: 'mail',
    compressionMode: 'NONE',
    businessPlanPagesMin: 20,
    businessPlanPagesMax: 25,
    tcnScore: 2,
    warnings: [
      'Israel has a 150-page limit. All certified translations are exempt from the count.',
      'Tel Aviv requires physical mail submission — not email or online portal.',
    ],
    officialUrl: 'https://il.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  mexico_city: {
    postId: 'mexico_city',
    country: 'Mexico',
    city: 'Mexico City',
    displayName: 'Mexico City, Mexico',
    pageLimitType: 'overall',
    pageLimit: 100,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'G-28',
      'Civil documents (birth certificate, marriage certificate)',
    ],
    submissionMethod: 'email',
    compressionMode: 'NONE',
    businessPlanPagesMin: 20,
    businessPlanPagesMax: 25,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://mx.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  madrid: {
    postId: 'madrid',
    country: 'Spain',
    city: 'Madrid',
    displayName: 'Madrid, Spain',
    pageLimitType: 'overall',
    pageLimit: 50,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'G-28',
      'Civil documents',
      'Passport copies',
    ],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 10,
    businessPlanPagesMax: 13,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://es.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  lisbon: {
    postId: 'lisbon',
    country: 'Portugal',
    city: 'Lisbon',
    displayName: 'Lisbon, Portugal',
    pageLimitType: 'overall',
    pageLimit: 50,
    tabLimits: [],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 10,
    businessPlanPagesMax: 13,
    tcnScore: 2,
    warnings: ["Lisbon's 50-page limit is calculated as 25 double-sided sheets."],
    officialUrl: 'https://pt.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  rome: {
    postId: 'rome',
    country: 'Italy',
    city: 'Rome',
    displayName: 'Rome, Italy',
    pageLimitType: 'per_tab',
    pageLimit: null,
    tabLimits: [
      { tabId: 'tab_e', label: 'Tab E — Investment', maxPages: 40 },
      { tabId: 'tab_f', label: 'Tab F — Business Operations', maxPages: 20 },
      { tabId: 'tab_g', label: 'Tab G — Non-Marginality', maxPages: 20 },
    ],
    fileSizeLimitMb: null,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
    submissionMethod: 'email',
    compressionMode: 'STANDARD',
    businessPlanPagesMin: 8,
    businessPlanPagesMax: 12,
    tcnScore: 2,
    warnings: [
      'Rome uses per-tab limits: Tab E (Investment) = 40p, Tab F (Business Operations) = 20p, Tab G (Non-Marginality) = 20p.',
    ],
    officialUrl: 'https://it.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },

  asuncion: {
    postId: 'asuncion',
    country: 'Paraguay',
    city: 'Asunción',
    displayName: 'Asunción, Paraguay',
    pageLimitType: 'overall',
    pageLimit: 70,
    tabLimits: [],
    fileSizeLimitMb: 20,
    renewalsExempt: false,
    coverLetterExempt: false,
    cvExempt: false,
    exemptDocumentLabels: [
      'DS-160 confirmation page',
      'DS-156E form',
      'G-28',
      'Civil documents',
      'Passport copies',
    ],
    submissionMethod: 'email',
    compressionMode: 'COMPRESSED',
    businessPlanPagesMin: 14,
    businessPlanPagesMax: 18,
    tcnScore: 2,
    warnings: [],
    officialUrl: 'https://py.usembassy.gov/visas/',
    lastVerified: '2026-06',
  },
};

// Aliases — common variants of the same post
const ALIASES: Record<string, string> = {
  'new_zealand': 'auckland',
  'australia': 'sydney',
  'uk': 'london',
  'united_kingdom': 'london',
  'germany': 'frankfurt',
  'canada': 'toronto',
  'france': 'paris',
  'netherlands': 'amsterdam',
  'holland': 'amsterdam',
  'israel': 'tel_aviv',
  'mexico': 'mexico_city',
  'spain': 'madrid',
  'portugal': 'lisbon',
  'italy': 'rome',
  'paraguay': 'asuncion',
};

const DEFAULT_CONFIG: ConsulateConfig = {
  postId: 'unknown',
  country: 'Unknown',
  city: 'Unknown',
  displayName: 'Your Consulate',
  pageLimitType: 'overall',
  pageLimit: 50,
  tabLimits: [],
  fileSizeLimitMb: null,
  renewalsExempt: false,
  coverLetterExempt: false,
  cvExempt: false,
  exemptDocumentLabels: ['DS-160 confirmation page', 'DS-156E form', 'G-28'],
  submissionMethod: 'email',
  compressionMode: 'STANDARD',
  businessPlanPagesMin: 10,
  businessPlanPagesMax: 13,
  tcnScore: 1,
  warnings: [
    "Your consulate's specific requirements have not been loaded. We're using a standard 50-page model as a conservative default.",
    'Verify your consulate\'s current page limit before submitting your final package.',
  ],
  officialUrl: 'https://www.usembassy.gov/',
  lastVerified: '2026-06',
};

function normalizeConsulateKey(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\s+consulate\s*/g, '')
    .replace(/,.*$/, '')
    .trim()
    .replace(/[\s\-]+/g, '_');
}

export function getConsulateConfig(postId: string | null | undefined): ConsulateConfig {
  if (!postId) return DEFAULT_CONFIG;
  const key = normalizeConsulateKey(postId);
  return CONSULATE_MAP[key] ?? CONSULATE_MAP[ALIASES[key] ?? ''] ?? DEFAULT_CONFIG;
}

export function getPageLimitDisplay(config: ConsulateConfig): string {
  if (config.pageLimitType === 'file_size_only') {
    return config.fileSizeLimitMb
      ? `${config.fileSizeLimitMb} MB file limit — no page cap`
      : 'No page limit';
  }
  if (config.pageLimitType === 'per_tab') {
    const parts = config.tabLimits.map((t) => `${t.label}: ${t.maxPages}p`);
    return parts.join(' / ');
  }
  return config.pageLimit ? `${config.pageLimit} pages` : 'No limit';
}

export function getCompressionLabel(mode: CompressionMode): string {
  switch (mode) {
    case 'NONE':
      return 'No compression needed';
    case 'STANDARD':
      return 'Standard compression';
    case 'COMPRESSED':
      return 'Compressed format';
    case 'MAXIMUM':
      return 'Maximum compression';
  }
}

export function getDocumentManifest(config: ConsulateConfig): DocManifestEntry[] {
  const { coverLetterExempt, cvExempt, businessPlanPagesMin, businessPlanPagesMax } = config;

  return [
    {
      key: 'cover_letter',
      label: 'Cover Letter',
      pagesMin: 3,
      pagesMax: 5,
      countsTowardLimit: !coverLetterExempt,
      exemptNote: coverLetterExempt ? 'Exempt — unlimited length' : undefined,
    },
    {
      key: 'business_plan',
      label: 'Business Plan',
      pagesMin: businessPlanPagesMin,
      pagesMax: businessPlanPagesMax,
      countsTowardLimit: true,
    },
    {
      key: 'source_of_funds',
      label: 'Source & Application of Funds',
      pagesMin: 2,
      pagesMax: 3,
      countsTowardLimit: true,
    },
    {
      key: 'investment_proof',
      label: 'Investment Proof',
      pagesMin: 2,
      pagesMax: 3,
      countsTowardLimit: true,
    },
    {
      key: 'qualifications',
      label: 'Qualifications Summary',
      pagesMin: 1,
      pagesMax: 2,
      countsTowardLimit: !cvExempt,
      exemptNote: cvExempt ? 'Exempt — unlimited length' : undefined,
    },
    {
      key: 'nonimmigrant_intent',
      label: 'Non-immigrant Intent',
      pagesMin: 1,
      pagesMax: 2,
      countsTowardLimit: true,
    },
    {
      key: 'ds160_reference',
      label: 'DS-160 Reference Guide',
      pagesMin: 4,
      pagesMax: 5,
      countsTowardLimit: false,
      exemptNote: 'Reference guide — not submitted in binder',
    },
    {
      key: 'visa_category',
      label: 'E-2 Category Analysis',
      pagesMin: 3,
      pagesMax: 4,
      countsTowardLimit: true,
    },
  ];
}
