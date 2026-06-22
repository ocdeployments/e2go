/**
 * Canonical list of E-2 treaty countries as of 2025.
 * Extracted from quiz page to be shared across the app.
 * Source: U.S. Department of State treaty investor country list.
 */
export const TREATY_COUNTRIES: readonly string[] = [
  "Albania", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahrain", "Bangladesh", "Belgium", "Bolivia", "Bosnia and Herzegovina",
  "Bulgaria", "Cameroon", "Canada", "Chile", "Colombia", "Congo",
  "Costa Rica", "Croatia", "Czech Republic", "Denmark", "Ecuador",
  "Egypt", "Estonia", "Ethiopia", "Finland", "France", "Georgia",
  "Germany", "Greece", "Grenada", "Honduras", "Ireland", "Israel",
  "Italy", "Japan", "Jordan", "Kazakhstan", "South Korea", "Kosovo",
  "Kyrgyzstan", "Latvia", "Liberia", "Lithuania", "Luxembourg",
  "Macedonia", "Mexico", "Moldova", "Mongolia", "Montenegro", "Morocco",
  "Netherlands", "New Zealand", "Norway", "Oman", "Pakistan", "Panama",
  "Paraguay", "Philippines", "Poland", "Romania", "Senegal", "Serbia",
  "Singapore", "Slovak Republic", "Slovenia", "Spain", "Sri Lanka",
  "Suriname", "Sweden", "Switzerland", "Thailand", "Togo",
  "Trinidad and Tobago", "Tunisia", "Turkey", "Ukraine",
  "United Kingdom", "Yugoslavia",
];

/**
 * Case-insensitive check against the treaty country list.
 * Returns false for null/undefined/empty.
 */
export function isTreatyNational(nationality: string | null | undefined): boolean {
  if (!nationality) return false;
  const normalized = nationality.trim().toLowerCase();
  return TREATY_COUNTRIES.some((c) => c.toLowerCase() === normalized);
}
