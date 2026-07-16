import { PDFDocument } from 'pdf-lib';
import { DocBuilder, buildCoverPage, insertToc, drawFootersAndFinalize, embedFonts, RED, AMBER, GREEN, INK_DIM } from './pdf-kit';
import type { FddProfessionalReport, RiskRating } from './fdd-report-engine';

function ratingColor(r: RiskRating) {
  if (r === 'CRITICAL' || r === 'HIGH') return RED;
  if (r === 'MODERATE') return AMBER;
  return GREEN;
}

export async function buildFddPdf(report: FddProfessionalReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`FDD Analysis — ${report.franchise_name}`);
  doc.setSubject('Franchise Disclosure Document investment analysis');
  doc.setProducer('e2go.app');

  const fonts = await embedFonts(doc);
  const es = report.executive_summary;

  buildCoverPage(doc, fonts, {
    eyebrow: 'FDD Investment Analysis',
    title: report.franchise_name,
    subtitle: es.recommendation.replace(/_/g, ' '),
    metaRows: [
      ['Investment range', es.key_metrics.investment_range],
      ['Item 19 AUV', es.key_metrics.item19_auv],
      ['E-2 score', es.key_metrics.e2_score],
      ['Generated', new Date(report.generated_at).toLocaleDateString()],
    ],
    footerLines: [
      'Prepared for personal due-diligence use only — not legal or investment advice.',
      'Confidential. For the named recipient’s use only.',
    ],
  });

  const b = new DocBuilder(doc, fonts, report.franchise_name);

  // 00 — Executive Summary
  b.startSection('00', 'Executive Summary', es.one_line_verdict);
  b.label('Recommendation');
  b.paragraph(es.recommendation.replace(/_/g, ' '), { bold: true, gap: 4 });
  b.paragraph(es.recommendation_rationale, { size: 10.5, color: INK_DIM, gap: 14 });
  if (es.strengths.length) {
    b.label('Strengths');
    es.strengths.forEach((s) => b.bullet(`${s.title} — ${s.evidence}`));
  }
  if (es.risks.length) {
    b.label('Key risks');
    es.risks.forEach((r) => b.bullet(`${r.title} — ${r.consequence}`));
  }
  if (es.conditions.length) {
    b.label('Conditions before proceeding');
    es.conditions.forEach((c) => b.bullet(c));
  }

  // 01 — Legal Risk
  const lr = report.legal_risk;
  b.startSection('01', 'Legal Risk', `Overall rating: ${lr.overall_rating}`);
  b.tag(lr.overall_rating, ratingColor(lr.overall_rating));
  b.y -= 4;
  b.keyValueRow('Active litigation', lr.litigation.total_active_suits === null ? 'Not disclosed' : String(lr.litigation.total_active_suits));
  b.paragraph(lr.litigation.pattern_assessment, { size: 10.5, color: INK_DIM, gap: 12 });
  if (lr.litigation.red_flags.length) {
    b.label('Litigation red flags');
    lr.litigation.red_flags.forEach((f) => b.bullet(f));
  }
  b.keyValueRow('Bankruptcy history', lr.bankruptcy.history_present ? 'Yes' : 'No');
  b.paragraph(lr.bankruptcy.assessment, { size: 10.5, color: INK_DIM, gap: 12 });
  if (lr.attorney_priority_items.length) {
    b.label('Attorney priority items');
    lr.attorney_priority_items.forEach((i) => b.bullet(i));
  }
  b.paragraph(lr.analyst_commentary, { size: 10.5, color: INK_DIM, gap: 8 });

  // 02 — Financial Performance
  const fp = report.financial_performance;
  b.startSection('02', 'Financial Performance', `Item 19 quality: ${fp.item19_quality_rating}`);
  b.keyValueRow('Item 19 present', fp.item19_present ? 'Yes' : 'No');
  b.keyValueRow('Payback period', fp.payback_period_years === null ? 'Unknown' : `${fp.payback_period_years} years`);
  b.keyValueRow('Non-marginality verdict', fp.non_marginality_verdict.replace(/_/g, ' '));
  b.paragraph(fp.non_marginality_explanation, { size: 10.5, color: INK_DIM, gap: 12 });
  b.label('ODE scenarios (annual owner discretionary earnings)');
  (['conservative', 'central', 'optimistic'] as const).forEach((k) => {
    const sc = fp.ode_scenarios[k];
    b.amountRow(`${k[0].toUpperCase()}${k.slice(1)} — ${sc.assumption}`, sc.ode === null ? 'n/a' : `$${sc.ode.toLocaleString()}`);
  });
  b.paragraph(fp.analyst_commentary, { size: 10.5, color: INK_DIM, gap: 8 });

  // 03 — Fee Structure
  const fs = report.fee_structure;
  b.startSection('03', 'Fee Structure', `Fee burden: ${fs.fee_burden_rating}`);
  fs.waterfall.forEach((line) => b.amountRow(`${line.label} (${line.pct_of_gross}% of gross)`, line.annual_on_auv === null ? 'n/a' : `$${line.annual_on_auv.toLocaleString()}/yr`));
  b.amountRow('Total franchisor take', `${fs.total_franchisor_take_pct}%`, { total: true });
  b.paragraph(`Franchisee gross profit: ${fs.franchisee_gross_profit_pct}%`, { size: 10.5, color: INK_DIM, gap: 12 });
  if (fs.hidden_cost_warnings.length) {
    b.label('Hidden cost warnings');
    fs.hidden_cost_warnings.forEach((w) => b.bullet(w));
  }
  b.paragraph(fs.analyst_commentary, { size: 10.5, color: INK_DIM, gap: 8 });

  // 04 — System Health
  const sh = report.system_health;
  b.startSection('04', 'System Health', `Overall rating: ${sh.overall_rating}`);
  b.keyValueRow('Net unit change (3yr)', sh.net_unit_change_3yr === null ? 'n/a' : String(sh.net_unit_change_3yr));
  b.keyValueRow('Annual churn rate', sh.churn_rate_annual === null ? 'n/a' : `${(sh.churn_rate_annual * 100).toFixed(1)}%`);
  b.keyValueRow('Openings (3yr)', sh.openings_3yr === null ? 'n/a' : String(sh.openings_3yr));
  b.keyValueRow('Closures (3yr)', sh.closures_3yr === null ? 'n/a' : String(sh.closures_3yr));
  b.paragraph(sh.churn_benchmark_note, { size: 10.5, color: INK_DIM, gap: 12 });
  if (sh.red_flags.length) {
    b.label('Red flags');
    sh.red_flags.forEach((f) => b.bullet(f));
  }
  b.paragraph(sh.analyst_commentary, { size: 10.5, color: INK_DIM, gap: 8 });

  // 05 — Franchisor Financial Health
  const fh = report.franchisor_financial_health;
  b.startSection('05', 'Franchisor Financial Health', `Overall rating: ${fh.overall_rating}`);
  b.paragraph(fh.revenue_trend, { size: 10.5, color: INK_DIM, gap: 10 });
  b.paragraph(fh.royalty_vs_fee_ratio.interpretation, { size: 10.5, color: INK_DIM, gap: 10 });
  b.keyValueRow('Insolvency risk', fh.insolvency_risk);
  b.paragraph(fh.support_capacity_assessment, { size: 10.5, color: INK_DIM, gap: 10 });
  b.paragraph(fh.analyst_commentary, { size: 10.5, color: INK_DIM, gap: 8 });

  // 06 — E-2 Compatibility
  const e2 = report.e2_compatibility;
  b.startSection('06', 'E-2 Compatibility', `Overall verdict: ${e2.overall_verdict}`);
  const dims = e2.dimensions;
  (['eligibility_gates', 'investment_substantiality', 'non_marginality', 'develop_and_direct'] as const).forEach((key) => {
    const d = dims[key];
    b.label(key.replace(/_/g, ' '));
    b.paragraph(`${d.verdict} — ${d.regulatory_basis}`, { bold: true, gap: 4 });
    b.paragraph(d.what_officer_looks_for, { size: 10, color: INK_DIM, gap: 10 });
  });
  if (e2.business_plan_requirements.length) {
    b.label('Business plan requirements for E-2');
    e2.business_plan_requirements.forEach((r) => b.bullet(r));
  }
  if (e2.consular_risk_factors.length) {
    b.label('Consular risk factors');
    e2.consular_risk_factors.forEach((r) => b.bullet(r));
  }
  if (e2.timing_warning) {
    b.label('Timing warning');
    b.paragraph(e2.timing_warning, { size: 10.5, color: RED, gap: 10 });
  }

  // 07 — Risk Matrix
  if (report.risk_matrix.length) {
    b.startSection('07', 'Risk Matrix', 'Every identified risk, its severity, and required mitigation');
    report.risk_matrix.forEach((item) => {
      b.paragraph(`${item.category} — ${item.risk}`, { bold: true, gap: 3 });
      b.tag(item.severity, ratingColor(item.severity));
      b.y -= 4;
      b.paragraph(`Consequence: ${item.specific_consequence}`, { size: 10, color: INK_DIM, gap: 4 });
      b.paragraph(`Mitigation: ${item.mitigation}`, { size: 10, color: INK_DIM, gap: 4 });
      b.paragraph(`FDD reference: ${item.fdd_item_reference}${item.pre_signing_action_required ? ' — action required before signing' : ''}`, { size: 9.5, color: INK_DIM, gap: 12 });
      b.divider();
    });
  }

  insertToc(doc, fonts, report.franchise_name, b.tocEntries);
  drawFootersAndFinalize(doc, fonts);

  return doc.save();
}
