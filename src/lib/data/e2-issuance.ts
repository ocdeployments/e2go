/**
 * E-2 visa issuance figures published by the U.S. Department of State.
 *
 * Source: "Nonimmigrant Visa Issuances by Visa Class and by Nationality",
 * FY 2024 detail table (1 October 2023 – 30 September 2024). This is the most
 * recent complete annual dataset.
 *
 * WHAT THESE NUMBERS ARE, PRECISELY — the copy that uses them has to stay
 * inside these limits or it becomes a claim we cannot defend:
 *
 *   - They count VISAS ISSUED at consulates abroad. Not investors, not
 *     businesses, not applications, not approvals.
 *   - A single investor can appear several times: principal investors,
 *     essential employees, derivative spouses and children, and renewals are
 *     all in the total.
 *   - They exclude USCIS change-of-status and extension decisions made inside
 *     the United States.
 *
 * So the honest sentence is "N E-2 visas were issued to nationals of X", and
 * never "N people from X got an E-2".
 *
 * There is no annual cap on E-2. Any scarcity framing — running out, closing,
 * limited slots — would be false, and is forbidden in the nurture copy.
 *
 * Keys match TREATY_COUNTRIES in src/lib/treaty-countries.ts exactly, because
 * the quiz stores the citizenship answer as one of those strings.
 */

/** Worldwide E-2 visas issued, FY 2024. */
export const E2_WORLDWIDE_FY2024 = 55_324;

/** The fiscal year every figure in this module describes. */
export const E2_FISCAL_YEAR = 2024;

/** Countries with a published FY 2024 figure, ranked by issuance. */
const FY2024_BY_COUNTRY: Readonly<Record<string, number>> = {
  Japan: 15_521,
  'South Korea': 6_778,
  Canada: 6_747,
  Germany: 3_902,
  France: 3_574,
  'United Kingdom': 2_720,
  Italy: 1_531,
  Spain: 1_438,
};

/**
 * Rank among all treaty-country nationalities, FY 2024. Taiwan sits at #6 with
 * 2,921 issuances but is absent from TREATY_COUNTRIES, so a Taiwanese national
 * cannot currently reach this code path — the ranks below skip it deliberately
 * rather than renumbering around a gap we may later close.
 */
const FY2024_RANK: Readonly<Record<string, number>> = {
  Japan: 1,
  'South Korea': 2,
  Canada: 3,
  Germany: 4,
  France: 5,
  'United Kingdom': 7,
  Italy: 8,
  Spain: 9,
};

export interface IssuanceFact {
  /** The country as the applicant answered it. */
  country: string;
  /** E-2 visas issued to that nationality in FY 2024, when published. */
  issued: number | null;
  /** Worldwide rank, when the country is in the published top nine. */
  rank: number | null;
  /**
   * One sentence, already inside the limits documented above. Falls back to
   * the worldwide total when we have no country figure, so every applicant
   * gets a true statement rather than a blank.
   */
  sentence: string;
}

const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth'];

/**
 * Build the market-perspective line for one applicant.
 *
 * `country` is the raw quiz answer, so it may be missing or oddly cased.
 */
export function getIssuanceFact(country: string | null | undefined): IssuanceFact {
  const worldwide = E2_WORLDWIDE_FY2024.toLocaleString('en-US');
  const name = (country ?? '').trim();

  const matched = Object.keys(FY2024_BY_COUNTRY).find(
    (c) => c.toLowerCase() === name.toLowerCase(),
  );

  if (!matched) {
    return {
      country: name,
      issued: null,
      rank: null,
      sentence: `In the 2024 U.S. fiscal year, ${worldwide} E-2 visas were issued worldwide. It is an established route, not an obscure one.`,
    };
  }

  const issued = FY2024_BY_COUNTRY[matched];
  const rank = FY2024_RANK[matched] ?? null;
  const rankClause =
    rank && rank <= 9
      ? ` That was the ${ORDINAL[rank]}-largest total of any treaty nationality.`
      : '';

  return {
    country: matched,
    issued,
    rank,
    sentence: `In the 2024 U.S. fiscal year, ${issued.toLocaleString('en-US')} E-2 visas were issued to nationals of ${matched}, out of ${worldwide} worldwide.${rankClause}`,
  };
}
