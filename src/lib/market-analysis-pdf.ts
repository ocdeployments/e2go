import { PDFDocument } from 'pdf-lib';
import { DocBuilder, buildCoverPage, insertToc, drawFootersAndFinalize, embedFonts, RED, AMBER, GREEN, INK_DIM } from './pdf-kit';
import type { TerritoryAnalysis, TerritoryRating } from './fdd-territory-engine';

function ratingColor(r: TerritoryRating) {
  if (r === 'WEAK') return RED;
  if (r === 'MARGINAL') return AMBER;
  return GREEN;
}

function pct(v: number | null): string {
  return v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`;
}

function num(v: number | null): string {
  return v === null ? 'n/a' : v.toLocaleString();
}

function money(v: number | null): string {
  return v === null ? 'n/a' : `$${v.toLocaleString()}`;
}

export async function buildMarketAnalysisPdf(a: TerritoryAnalysis): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Territory Market Analysis — ${a.target_zip}`);
  doc.setSubject('Franchise territory market analysis');
  doc.setProducer('e2go.app');

  const fonts = await embedFonts(doc);

  buildCoverPage(doc, fonts, {
    eyebrow: 'Territory Market Analysis',
    title: `ZIP ${a.target_zip}`,
    subtitle: `${a.franchise_category.replace(/_/g, ' ')} · ${a.target_state}`,
    metaRows: [
      ['Overall score', `${a.overall_score} / 100`],
      ['Overall rating', a.overall_rating.toUpperCase()],
      ['Radius analyzed', `${a.radius_miles} miles`],
      ['Data completeness', a.data_completeness],
    ],
    footerLines: [
      'Prepared for personal due-diligence use only — not legal or investment advice.',
      `Source: ${a.census_source}`,
    ],
  });

  const b = new DocBuilder(doc, fonts, `Territory ${a.target_zip}`);

  // 00 — Verdict
  b.startSection('00', 'Verdict', `Overall score ${a.overall_score}/100 — ${a.overall_rating.toUpperCase()}`);
  b.paragraph(a.narrative.VERDICT, { gap: 14 });
  b.label('Market overview');
  b.paragraph(a.narrative.MARKET_OVERVIEW, { size: 10.5, color: INK_DIM, gap: 12 });

  // 01 — Scoring Dimensions
  b.startSection('01', 'Scoring Dimensions', 'Five weighted dimensions behind the overall score');
  const dims: [string, typeof a.population_score][] = [
    ['Population', a.population_score],
    ['Income', a.income_score],
    ['Competition', a.competition_score],
    ['Demographic fit', a.demographic_fit_score],
    ['Labor market', a.labor_market_score],
  ];
  dims.forEach(([label, d]) => {
    b.paragraph(`${label} — ${d.score}/100`, { bold: true, gap: 2 });
    b.tag(d.rating.toUpperCase(), ratingColor(d.rating));
    b.y -= 4;
    b.paragraph(d.note, { size: 10, color: INK_DIM, gap: 12 });
    b.divider();
  });

  // 02 — Economic Strength
  b.startSection('02', 'Economic Strength', 'Household income, employment, and labor force');
  b.paragraph(a.narrative.ECONOMIC_STRENGTH, { gap: 14 });
  b.keyValueRow('Median household income', money(a.census.median_household_income));
  b.keyValueRow('Employment rate', pct(a.census.employment_rate));
  b.keyValueRow('Labor force', num(a.census.labor_force));
  b.keyValueRow('Owner-occupied housing', pct(a.census.owner_occupied_pct));

  // 03 — Demographic Fit
  b.startSection('03', 'Demographic Fit', 'Population composition relative to this category');
  b.paragraph(a.narrative.DEMOGRAPHIC_FIT, { gap: 14 });
  b.keyValueRow('Total population', num(a.census.total_population));
  b.keyValueRow('Total households', num(a.census.total_households));
  b.keyValueRow('Median age', a.census.median_age === null ? 'n/a' : String(a.census.median_age));
  b.keyValueRow('Population 65+', num(a.census.population_65_plus));
  b.keyValueRow('Population under 18', num(a.census.population_under_18));
  b.keyValueRow('Family households with children', num(a.census.family_households_with_children));

  // 04 — Competitive Landscape
  b.startSection('04', 'Competitive Landscape', `Within a ${a.radius_miles}-mile radius`);
  b.paragraph(a.narrative.COMPETITIVE_LANDSCAPE, { gap: 14 });
  b.keyValueRow('Nearby competitors', a.competitors.nearby_count === null ? 'Unavailable' : String(a.competitors.nearby_count));
  b.keyValueRow('Population per competitor', num(a.competitors.population_per_competitor));
  b.keyValueRow('Source', a.competitors.source === 'google_places' ? 'Google Places' : 'Unavailable');

  // 05 — Target Market Sizing
  const tm = a.target_market;
  b.startSection('05', 'Target Market Sizing', tm.segment_label);
  b.keyValueRow('Relevant segment', num(tm.relevant_segment));
  b.keyValueRow('Share of population', pct(tm.segment_pct_of_population));
  b.amountRow('Annual addressable revenue (TAM)', money(tm.annual_addressable_revenue));
  b.amountRow('Year 1 revenue target', money(tm.year1_revenue_target));
  b.amountRow('Year 3 revenue target', money(tm.year3_revenue_target));
  b.keyValueRow('Non-marginality check', tm.nonmarginality_check.toUpperCase());
  b.paragraph(tm.sizing_note, { size: 10.5, color: INK_DIM, gap: 10 });

  // 06 — Raw Census Data
  b.startSection('06', 'Census Data Snapshot', a.census_source);
  b.keyValueRow('ZIP code', a.target_zip);
  b.keyValueRow('State', a.target_state);
  Object.entries(a.census).forEach(([key, value]) => {
    const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const formatted = typeof value === 'number'
      ? (key.includes('pct') || key.includes('rate') ? pct(value) : num(value))
      : 'n/a';
    b.keyValueRow(label, formatted);
  });
  b.paragraph(`Source: ${a.census_source} — U.S. Census Bureau ACS 5-Year Estimates.`, { size: 9.5, color: INK_DIM, gap: 8 });

  insertToc(doc, fonts, `Territory ${a.target_zip}`, b.tocEntries);
  drawFootersAndFinalize(doc, fonts);

  return doc.save();
}
