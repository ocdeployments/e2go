/**
 * Canonical list of E-2 treaty investor countries.
 *
 * Source: U.S. Department of State, "Treaty Countries"
 * https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/fees/treaty.html
 * Verified against that table on 4 September 2026.
 *
 * This list is E-2 ONLY. The State Department table also carries E-1 (treaty
 * trader), E-3 (Australian specialty occupation) and E-2 CNMI rows. A country
 * that appears there with an E-1 row and no E-2 row does NOT belong here —
 * Greece and Brunei are the two that catch people out.
 *
 * Names below are the ones a user would type into the quiz's country search,
 * not always the State Department's own spelling. ALIASES maps the official
 * spellings and common variants back onto them.
 */
export const TREATY_COUNTRIES: readonly string[] = [
  "Albania", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belgium", "Bolivia", "Bosnia and Herzegovina",
  "Bulgaria", "Cameroon", "Canada", "Chile", "Colombia",
  "Congo (Brazzaville)", "Congo (Kinshasa)", "Costa Rica", "Croatia",
  "Czech Republic", "Denmark", "Ecuador", "Egypt", "Estonia", "Ethiopia",
  "Finland", "France", "Georgia", "Germany", "Grenada", "Honduras",
  "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kosovo", "Kyrgyzstan", "Latvia", "Liberia", "Lithuania", "Luxembourg",
  "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco", "Netherlands",
  "New Zealand", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama",
  "Paraguay", "Philippines", "Poland", "Portugal", "Romania", "Senegal",
  "Serbia", "Singapore", "Slovak Republic", "Slovenia", "South Korea",
  "Spain", "Sri Lanka", "Suriname", "Sweden", "Switzerland", "Taiwan",
  "Thailand", "Togo", "Trinidad and Tobago", "Tunisia", "Turkey", "Ukraine",
  "United Kingdom", "Yugoslavia",
];

/**
 * Alternate spellings mapped to the canonical entry above. Keys are lowercase.
 * These exist so that a nationality captured as free text elsewhere in the app
 * — an uploaded passport, a partner's profile, the State Department's own
 * wording — still resolves. They are deliberately NOT part of the quiz
 * dropdown, which shows one name per country.
 */
const ALIASES: Record<string, string> = {
  "macedonia": "North Macedonia",
  "republic of north macedonia": "North Macedonia",
  "korea (south)": "South Korea",
  "republic of korea": "South Korea",
  "korea, south": "South Korea",
  "china (taiwan)": "Taiwan",
  "chinese taipei": "Taiwan",
  "republic of china": "Taiwan",
  "congo": "Congo (Brazzaville)",
  "republic of the congo": "Congo (Brazzaville)",
  "republic of congo": "Congo (Brazzaville)",
  "democratic republic of the congo": "Congo (Kinshasa)",
  "democratic republic of congo": "Congo (Kinshasa)",
  "dr congo": "Congo (Kinshasa)",
  "drc": "Congo (Kinshasa)",
  "czechia": "Czech Republic",
  "slovakia": "Slovak Republic",
  "trinidad & tobago": "Trinidad and Tobago",
  "bosnia": "Bosnia and Herzegovina",
  "bosnia & herzegovina": "Bosnia and Herzegovina",
  "great britain": "United Kingdom",
  "uk": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",
  "holland": "Netherlands",
  "türkiye": "Turkey",
  "turkiye": "Turkey",
};

/**
 * Treaty countries whose E-2 eligibility is real but heavily qualified. The
 * treaty is in force, so these stay in TREATY_COUNTRIES, but a national of one
 * of them cannot assume a new investment qualifies. Nothing reads this yet —
 * it is here so the caveat lives beside the list rather than in someone's head.
 */
export const RESTRICTED_TREATY_COUNTRIES: Record<string, string> = {
  "Bolivia":
    "E-2 is limited to investments established or acquired before 10 June 2012. " +
    "The transition period for those investors ended on 10 June 2022, so new " +
    "Bolivian investments do not qualify.",
  "Ecuador":
    "E-2 is limited to investments established or acquired before 18 May 2018. " +
    "Those investors remain eligible until 18 May 2028; new Ecuadorian " +
    "investments do not qualify.",
  "United Kingdom":
    "The applicant must be a UK national and the treaty reaches only British " +
    "territory in Europe. Commonwealth nationality does not qualify.",
  "Yugoslavia":
    "The SFRY has dissolved. Its successor states — Bosnia and Herzegovina, " +
    "Croatia, North Macedonia, Slovenia, Montenegro, Serbia and Kosovo — are " +
    "each listed separately and are the entries an applicant should use.",
};

/**
 * Case-insensitive check against the treaty country list, including aliases.
 * Returns false for null/undefined/empty.
 */
export function isTreatyNational(nationality: string | null | undefined): boolean {
  return resolveTreatyCountry(nationality) !== null;
}

/**
 * Resolve free-text nationality to its canonical TREATY_COUNTRIES entry, or
 * null if it is not an E-2 treaty country.
 */
export function resolveTreatyCountry(
  nationality: string | null | undefined,
): string | null {
  if (!nationality) return null;
  const normalized = nationality.trim().toLowerCase();
  if (!normalized) return null;
  const exact = TREATY_COUNTRIES.find((c) => c.toLowerCase() === normalized);
  if (exact) return exact;
  return ALIASES[normalized] ?? null;
}
