import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';

// Mirrors the PrepKit shape produced by /api/simulator/prep-kit and rendered
// on-screen in src/app/simulator/prep-kit/page.tsx. Duplicated here (rather
// than imported) because that file is a client component and this module
// runs server-side only.
interface KitFact { label: string; value: string }
interface Strength { heading: string; detail: string }
interface OfficerConcern {
  code: string;
  name: string;
  concern: string;
  factsToKnow: string[];
  bestShortAnswer: string;
  expandedAnswer: string;
  avoidSaying: string;
  risk: 'high' | 'moderate';
}
interface Breakdown { item: string; amount: string }
interface KeyDate { event: string; date: string }
interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  shortAnswer?: string;
  answerFramework: string;
  keyNumbers: string[];
  pitfalls: string;
}
interface WpProbe { id: string; trigger: string; question: string; answerFramework: string }
interface MockRound { name: string; focus: string; sampleQuestions: string[] }

export interface PrepKit {
  clientName: string;
  businessName: string;
  generatedDate: string;
  persona?: {
    title: string; subtitle: string; name: string; roleSummary: string;
    backgroundSummary: string; caseTheorySummary: string; interviewStyleNotes: string[];
  };
  section1: { title: string; subtitle: string; facts: KitFact[] };
  section2: { title: string; subtitle: string; strengths: Strength[] };
  section3: { title: string; subtitle: string; highRisk: OfficerConcern[]; moderateRisk: OfficerConcern[]; noIssues: string[] };
  section4: { title: string; subtitle: string; businessOverview: string; managementRole: string; staffingPlan: string; marketPosition: string };
  section5: { title: string; subtitle: string; totalInvested: string; breakdown: Breakdown[]; sourceChronology: string[]; committedAmount: string; fddNote?: string };
  section6: { title: string; subtitle: string; keyDates: KeyDate[]; simulatorFeedback: string; documentsToCarry: string[]; whatMayHaveChanged: string[]; materialUpdates?: string[] };
  section7: { title: string; subtitle: string; questions: InterviewQuestion[]; applicableProbes: WpProbe[] };
  section8?: { title: string; subtitle: string; rules: string[] };
  section9?: { title: string; subtitle: string; rounds: MockRound[] };
  section10?: { title: string; subtitle: string; checklist: string[] };
  criticalGaps?: { title: string; subtitle: string; actions: { action: string; why: string }[] };
}

// ── Layout constants ─────────────────────────────────────────────────────
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN_X = 56;
const CONTENT_TOP = 720;
const CONTENT_BOTTOM = 80;
const LINE_GAP = 1.5;

const PAPER: RGB = rgb(0.984, 0.98, 0.968);
const INK: RGB = rgb(0.11, 0.102, 0.086);
const INK_DIM: RGB = rgb(0.353, 0.337, 0.3);
const INK_MUTE: RGB = rgb(0.58, 0.565, 0.498);
const GOLD: RGB = rgb(0.612, 0.502, 0.204);
const RULE: RGB = rgb(0.894, 0.878, 0.831);
const RED: RGB = rgb(0.541, 0.231, 0.231);
const AMBER: RGB = rgb(0.541, 0.353, 0.141);

interface Fonts {
  serif: PDFFont;
  serifItalic: PDFFont;
  body: PDFFont;
  bodyBold: PDFFont;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class DossierBuilder {
  doc: PDFDocument;
  fonts: Fonts;
  clientName: string;
  contentPages: PDFPage[] = [];
  contentMeta: { header: string }[] = [];
  tocEntries: { title: string; subtitle: string; contentPageIndex: number }[] = [];
  page: PDFPage | null = null;
  y = 0;
  currentSectionTitle = '';

  constructor(doc: PDFDocument, fonts: Fonts, clientName: string) {
    this.doc = doc;
    this.fonts = fonts;
    this.clientName = clientName;
  }

  private fillBg(page: PDFPage) {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  }

  newContentPage(sectionTitle: string, isNewSection: boolean) {
    const page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.fillBg(page);
    this.contentPages.push(page);
    this.contentMeta.push({ header: `${this.clientName} · ${sectionTitle}` });
    page.drawText(`${this.clientName} · ${sectionTitle}`, {
      x: MARGIN_X, y: 750, size: 9, font: this.fonts.body, color: INK_MUTE,
    });
    page.drawLine({ start: { x: MARGIN_X, y: 742 }, end: { x: PAGE_W - MARGIN_X, y: 742 }, thickness: 0.75, color: RULE });
    this.page = page;
    this.y = CONTENT_TOP;
    this.currentSectionTitle = sectionTitle;
    if (isNewSection) {
      this.tocEntries.push({ title: sectionTitle, subtitle: '', contentPageIndex: this.contentPages.length - 1 });
    }
  }

  ensureSpace(height: number) {
    if (!this.page || this.y - height < CONTENT_BOTTOM) {
      this.newContentPage(this.currentSectionTitle, false);
    }
  }

  startSection(number: string, title: string, subtitle: string) {
    this.newContentPage(title, true);
    if (this.tocEntries.length) this.tocEntries[this.tocEntries.length - 1].subtitle = subtitle;
    this.page!.drawText(number, { x: MARGIN_X, y: this.y, size: 10.5, font: this.fonts.bodyBold, color: GOLD });
    this.y -= 26;
    this.page!.drawText(title, { x: MARGIN_X, y: this.y, size: 24, font: this.fonts.serif, color: INK });
    this.y -= 20;
    for (const line of wrapText(subtitle, this.fonts.body, 11.5, PAGE_W - MARGIN_X * 2)) {
      this.page!.drawText(line, { x: MARGIN_X, y: this.y, size: 11.5, font: this.fonts.body, color: INK_DIM });
      this.y -= 15;
    }
    this.y -= 4;
    this.page!.drawLine({ start: { x: MARGIN_X, y: this.y }, end: { x: PAGE_W - MARGIN_X, y: this.y }, thickness: 1, color: GOLD, opacity: 0.5 });
    this.y -= 24;
  }

  label(text: string) {
    this.ensureSpace(16);
    this.page!.drawText(text.toUpperCase(), { x: MARGIN_X, y: this.y, size: 8.5, font: this.fonts.bodyBold, color: INK_MUTE });
    this.y -= 14;
  }

  paragraph(text: string, opts: { size?: number; color?: RGB; bold?: boolean; gap?: number } = {}) {
    const size = opts.size ?? 11;
    const color = opts.color ?? rgb(0.169, 0.157, 0.125);
    const font = opts.bold ? this.fonts.bodyBold : this.fonts.body;
    const lines = wrapText(text, font, size, PAGE_W - MARGIN_X * 2);
    for (const line of lines) {
      this.ensureSpace(size * LINE_GAP);
      this.page!.drawText(line, { x: MARGIN_X, y: this.y, size, font, color });
      this.y -= size * LINE_GAP;
    }
    this.y -= opts.gap ?? 8;
  }

  divider() {
    this.ensureSpace(14);
    this.page!.drawLine({ start: { x: MARGIN_X, y: this.y }, end: { x: PAGE_W - MARGIN_X, y: this.y }, thickness: 0.75, color: RULE });
    this.y -= 16;
  }

  keyValueRow(label: string, value: string) {
    const size = 10.5;
    const labelW = 200;
    const valueLines = wrapText(value, this.fonts.body, size, PAGE_W - MARGIN_X * 2 - labelW);
    this.ensureSpace(size * LINE_GAP * valueLines.length + 10);
    this.page!.drawText(label, { x: MARGIN_X, y: this.y, size, font: this.fonts.bodyBold, color: INK });
    for (let i = 0; i < valueLines.length; i++) {
      this.page!.drawText(valueLines[i], { x: MARGIN_X + labelW, y: this.y, size, font: this.fonts.body, color: rgb(0.169, 0.157, 0.125) });
      this.y -= size * LINE_GAP;
    }
    this.y -= 6;
    this.page!.drawLine({ start: { x: MARGIN_X, y: this.y + 4 }, end: { x: PAGE_W - MARGIN_X, y: this.y + 4 }, thickness: 0.5, color: RULE });
    this.y -= 6;
  }

  amountRow(item: string, amount: string, opts: { total?: boolean } = {}) {
    const size = 11;
    const font = opts.total ? this.fonts.bodyBold : this.fonts.body;
    this.ensureSpace(size * LINE_GAP + 8);
    if (opts.total) {
      this.page!.drawLine({ start: { x: MARGIN_X, y: this.y + 12 }, end: { x: PAGE_W - MARGIN_X, y: this.y + 12 }, thickness: 1.25, color: INK });
      this.y -= 4;
    }
    this.page!.drawText(item, { x: MARGIN_X, y: this.y, size, font, color: INK });
    const w = font.widthOfTextAtSize(amount, size);
    this.page!.drawText(amount, { x: PAGE_W - MARGIN_X - w, y: this.y, size, font, color: INK });
    this.y -= size * LINE_GAP;
    if (!opts.total) {
      this.page!.drawLine({ start: { x: MARGIN_X, y: this.y + 4 }, end: { x: PAGE_W - MARGIN_X, y: this.y + 4 }, thickness: 0.5, color: RULE });
    }
    this.y -= 6;
  }

  pullquote(text: string) {
    const size = 12.5;
    const maxWidth = PAGE_W - MARGIN_X * 2 - 24;
    const lines = wrapText(text, this.fonts.serifItalic, size, maxWidth);
    this.ensureSpace(lines.length * size * LINE_GAP + 20);
    const startY = this.y;
    for (const line of lines) {
      this.page!.drawText(line, { x: MARGIN_X + 16, y: this.y, size, font: this.fonts.serifItalic, color: INK });
      this.y -= size * LINE_GAP;
    }
    this.page!.drawLine({ start: { x: MARGIN_X, y: this.y + 6 }, end: { x: MARGIN_X, y: startY + size }, thickness: 1.5, color: GOLD });
    this.y -= 14;
  }

  bullet(text: string) {
    const size = 10.5;
    const maxWidth = PAGE_W - MARGIN_X * 2 - 16;
    const lines = wrapText(text, this.fonts.body, size, maxWidth);
    this.ensureSpace(lines.length * size * LINE_GAP + 4);
    this.page!.drawText('–', { x: MARGIN_X, y: this.y, size, font: this.fonts.bodyBold, color: GOLD });
    for (let i = 0; i < lines.length; i++) {
      this.page!.drawText(lines[i], { x: MARGIN_X + 14, y: this.y, size, font: this.fonts.body, color: rgb(0.169, 0.157, 0.125) });
      this.y -= size * LINE_GAP;
    }
    this.y -= 4;
  }

  riskTag(level: 'high' | 'moderate') {
    const color = level === 'high' ? RED : AMBER;
    const text = level.toUpperCase();
    const size = 8;
    const w = this.fonts.bodyBold.widthOfTextAtSize(text, size);
    const x = PAGE_W - MARGIN_X - w - 10;
    this.page!.drawRectangle({ x, y: this.y - 2, width: w + 10, height: 13, borderColor: color, borderWidth: 1, color: PAPER });
    this.page!.drawText(text, { x: x + 5, y: this.y + 1, size, font: this.fonts.bodyBold, color });
  }
}

async function embedFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    body: await doc.embedFont(StandardFonts.Helvetica),
    bodyBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

function buildCoverPage(doc: PDFDocument, fonts: Fonts, kit: PrepKit) {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });

  const cx = PAGE_W / 2;
  page.drawLine({ start: { x: cx - 32, y: 660 }, end: { x: cx + 32, y: 660 }, thickness: 2, color: GOLD });

  const eyebrow = 'INTERVIEW CASE DOSSIER';
  const eyebrowSize = 10;
  const eyebrowW = fonts.bodyBold.widthOfTextAtSize(eyebrow, eyebrowSize);
  page.drawText(eyebrow, { x: cx - eyebrowW / 2, y: 624, size: eyebrowSize, font: fonts.bodyBold, color: GOLD });

  const titleSize = 34;
  const titleW = fonts.serif.widthOfTextAtSize(kit.clientName, titleSize);
  page.drawText(kit.clientName, { x: cx - titleW / 2, y: 578, size: titleSize, font: fonts.serif, color: INK });

  const subSize = 15;
  const subW = fonts.serifItalic.widthOfTextAtSize(kit.businessName, subSize);
  page.drawText(kit.businessName, { x: cx - subW / 2, y: 552, size: subSize, font: fonts.serifItalic, color: INK_DIM });

  const metaRows: [string, string][] = [
    ['Generated', kit.generatedDate],
  ];
  let my = 300;
  page.drawLine({ start: { x: MARGIN_X, y: my + 22 }, end: { x: PAGE_W - MARGIN_X, y: my + 22 }, thickness: 0.75, color: RULE });
  for (const [label, value] of metaRows) {
    page.drawText(label.toUpperCase(), { x: MARGIN_X, y: my, size: 9, font: fonts.body, color: INK_MUTE });
    const vw = fonts.bodyBold.widthOfTextAtSize(value, 10.5);
    page.drawText(value, { x: PAGE_W - MARGIN_X - vw, y: my, size: 10.5, font: fonts.bodyBold, color: INK });
    my -= 22;
    page.drawLine({ start: { x: MARGIN_X, y: my + 22 }, end: { x: PAGE_W - MARGIN_X, y: my + 22 }, thickness: 0.75, color: RULE });
  }

  const footerLines = [
    'Prepared for personal interview revision only — not a legal filing document.',
    'Confidential. For the named applicant’s use only.',
  ];
  let fy = 70;
  for (const line of footerLines) {
    const w = fonts.body.widthOfTextAtSize(line, 8.5);
    page.drawText(line, { x: cx - w / 2, y: fy, size: 8.5, font: fonts.body, color: INK_MUTE });
    fy -= 12;
  }
}

function renderCriticalGapsAndPersona(b: DossierBuilder, kit: PrepKit) {
  b.startSection('00', 'Case Overview', 'What this dossier covers and what to fix first');

  if (kit.criticalGaps && kit.criticalGaps.actions.length > 0) {
    b.label('Do this first — ' + kit.criticalGaps.title);
    b.paragraph(kit.criticalGaps.subtitle, { size: 10, color: INK_DIM, gap: 10 });
    kit.criticalGaps.actions.forEach((a, i) => {
      b.paragraph(`${i + 1}. ${a.action}`, { bold: true, gap: 2 });
      b.paragraph(a.why, { size: 10, color: INK_DIM, gap: 12 });
    });
    b.divider();
  }

  if (kit.persona) {
    b.label(kit.persona.title);
    b.paragraph(kit.persona.subtitle, { size: 10, color: INK_DIM, gap: 10 });
    b.paragraph(kit.persona.roleSummary, { gap: 10 });
    b.paragraph(kit.persona.backgroundSummary, { gap: 10 });
    b.paragraph(kit.persona.caseTheorySummary, { gap: 10 });
    if (kit.persona.interviewStyleNotes.length > 0) {
      b.label('Interview style notes');
      kit.persona.interviewStyleNotes.forEach((n) => b.bullet(n));
    }
  }
}

function renderSection1(b: DossierBuilder, s: PrepKit['section1']) {
  b.startSection('01', s.title, s.subtitle);
  s.facts.forEach((f) => b.keyValueRow(f.label, f.value));
}

function renderSection2(b: DossierBuilder, s: PrepKit['section2']) {
  b.startSection('02', s.title, s.subtitle);
  s.strengths.forEach((st) => {
    b.paragraph(st.heading, { bold: true, gap: 3 });
    b.paragraph(st.detail, { size: 10.5, color: INK_DIM, gap: 14 });
  });
}

function renderConcern(b: DossierBuilder, c: OfficerConcern) {
  b.ensureSpace(20);
  const startY = b.y;
  b.page!.drawText(`${c.code} · ${c.name}`, { x: MARGIN_X, y: startY, size: 12, font: b.fonts.bodyBold, color: INK });
  b.riskTag(c.risk);
  b.y -= 16;
  b.paragraph(c.concern, { size: 10.5, color: INK_DIM, gap: 8 });
  if (c.factsToKnow.length > 0) {
    b.label('Facts to know');
    c.factsToKnow.forEach((f) => b.bullet(f));
  }
  b.label('Best short answer');
  b.pullquote(c.bestShortAnswer);
  b.label('Avoid saying');
  b.paragraph(c.avoidSaying, { size: 10, color: RED, gap: 14 });
  b.divider();
}

function renderSection3(b: DossierBuilder, s: PrepKit['section3']) {
  b.startSection('03', s.title, s.subtitle);
  s.highRisk.forEach((c) => renderConcern(b, c));
  s.moderateRisk.forEach((c) => renderConcern(b, c));
  if (s.noIssues.length > 0) {
    b.label('No issues identified');
    s.noIssues.forEach((n) => b.bullet(n));
  }
}

function renderSection4(b: DossierBuilder, s: PrepKit['section4']) {
  b.startSection('04', s.title, s.subtitle);
  b.label('Business overview');
  b.paragraph(s.businessOverview, { gap: 14 });
  b.label('Management role');
  b.paragraph(s.managementRole, { gap: 14 });
  b.label('Staffing plan');
  b.paragraph(s.staffingPlan, { gap: 14 });
  b.label('Market position');
  b.paragraph(s.marketPosition, { gap: 14 });
}

function renderSection5(b: DossierBuilder, s: PrepKit['section5']) {
  b.startSection('05', s.title, s.subtitle);
  s.breakdown.forEach((row) => b.amountRow(row.item, row.amount));
  b.amountRow('Total invested', s.totalInvested, { total: true });
  b.paragraph(`Committed amount: ${s.committedAmount}`, { size: 10, color: INK_DIM, gap: 14 });
  if (s.sourceChronology.length > 0) {
    b.label('Source of funds — chronology');
    s.sourceChronology.forEach((c) => b.bullet(c));
  }
  if (s.fddNote) {
    b.label('FDD note');
    b.paragraph(s.fddNote, { size: 10, color: INK_DIM, gap: 10 });
  }
}

function renderSection6(b: DossierBuilder, s: PrepKit['section6']) {
  b.startSection('06', s.title, s.subtitle);
  if (s.keyDates.length > 0) {
    b.label('Key dates');
    s.keyDates.forEach((d) => b.keyValueRow(d.event, d.date));
  }
  b.label('Simulator feedback');
  b.paragraph(s.simulatorFeedback, { gap: 14 });
  if (s.documentsToCarry.length > 0) {
    b.label('Documents to carry');
    s.documentsToCarry.forEach((d) => b.bullet(d));
  }
  if (s.whatMayHaveChanged.length > 0) {
    b.label('What may have changed');
    s.whatMayHaveChanged.forEach((d) => b.bullet(d));
  }
  if (s.materialUpdates && s.materialUpdates.length > 0) {
    b.label('Material updates');
    s.materialUpdates.forEach((d) => b.bullet(d));
  }
}

function renderQuestion(b: DossierBuilder, q: InterviewQuestion) {
  b.ensureSpace(24);
  b.paragraph(`Q. ${q.question}`, { bold: true, gap: 6 });
  if (q.shortAnswer) {
    b.label('Short answer');
    b.pullquote(q.shortAnswer);
  }
  b.label('Answer framework');
  b.paragraph(q.answerFramework, { size: 10.5, color: INK_DIM, gap: 8 });
  if (q.keyNumbers.length > 0) {
    b.label('Key numbers');
    q.keyNumbers.forEach((n) => b.bullet(n));
  }
  b.label('Pitfalls');
  b.paragraph(q.pitfalls, { size: 10, color: RED, gap: 14 });
  b.divider();
}

function renderSection7(b: DossierBuilder, s: PrepKit['section7']) {
  b.startSection('07', s.title, s.subtitle);
  s.questions.forEach((q) => renderQuestion(b, q));
  if (s.applicableProbes.length > 0) {
    b.label('Applicable follow-up probes');
    s.applicableProbes.forEach((p) => {
      b.paragraph(`${p.trigger}: ${p.question}`, { bold: true, gap: 3 });
      b.paragraph(p.answerFramework, { size: 10, color: INK_DIM, gap: 14 });
    });
  }
}

function renderSection8(b: DossierBuilder, s: NonNullable<PrepKit['section8']>) {
  b.startSection('08', s.title, s.subtitle);
  s.rules.forEach((r) => b.bullet(r));
}

function renderSection9(b: DossierBuilder, s: NonNullable<PrepKit['section9']>) {
  b.startSection('09', s.title, s.subtitle);
  s.rounds.forEach((r) => {
    b.paragraph(`${r.name} — ${r.focus}`, { bold: true, gap: 6 });
    r.sampleQuestions.forEach((q) => b.bullet(q));
    b.divider();
  });
}

function renderSection10(b: DossierBuilder, s: NonNullable<PrepKit['section10']>) {
  b.startSection('10', s.title, s.subtitle);
  s.checklist.forEach((c) => b.bullet(c));
}

function renderQuickReference(b: DossierBuilder, kit: PrepKit) {
  b.startSection('QR', 'Quick Reference', 'The waiting-room cheat sheet — skim this last');
  if (kit.criticalGaps && kit.criticalGaps.actions.length > 0) {
    b.label('Do this first');
    kit.criticalGaps.actions.forEach((a) => b.bullet(a.action));
  }
  const allHighRisk = kit.section3.highRisk;
  if (allHighRisk.length > 0) {
    b.label('High-risk factors');
    allHighRisk.slice(0, 5).forEach((r) => b.bullet(`${r.name}: ${r.bestShortAnswer}`));
  }
  b.label('Total invested');
  b.paragraph(kit.section5.totalInvested, { bold: true, gap: 14 });
  if (kit.section6.documentsToCarry.length > 0) {
    b.label('Documents to carry');
    kit.section6.documentsToCarry.forEach((d) => b.bullet(d));
  }
}

function insertToc(doc: PDFDocument, fonts: Fonts, clientName: string, entries: { title: string; subtitle: string; contentPageIndex: number }[]) {
  const page = doc.insertPage(1, [PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  page.drawText(`${clientName} · Table of Contents`, { x: MARGIN_X, y: 750, size: 9, font: fonts.body, color: INK_MUTE });
  page.drawLine({ start: { x: MARGIN_X, y: 742 }, end: { x: PAGE_W - MARGIN_X, y: 742 }, thickness: 0.75, color: RULE });

  let y = CONTENT_TOP;
  page.drawText('Table of Contents', { x: MARGIN_X, y, size: 24, font: fonts.serif, color: INK });
  y -= 40;

  for (const e of entries) {
    const finalPageNum = e.contentPageIndex + 3; // cover(1) + toc(1) + 0-based index
    page.drawText(e.title, { x: MARGIN_X, y, size: 12, font: fonts.bodyBold, color: INK });
    const numStr = String(finalPageNum);
    const numW = fonts.body.widthOfTextAtSize(numStr, 11);
    page.drawText(numStr, { x: PAGE_W - MARGIN_X - numW, y, size: 11, font: fonts.body, color: INK_MUTE });
    y -= 15;
    if (e.subtitle) {
      for (const line of wrapText(e.subtitle, fonts.body, 9.5, PAGE_W - MARGIN_X * 2 - 40)) {
        page.drawText(line, { x: MARGIN_X, y, size: 9.5, font: fonts.body, color: INK_DIM });
        y -= 13;
      }
    }
    y -= 8;
    page.drawLine({ start: { x: MARGIN_X, y: y + 4 }, end: { x: PAGE_W - MARGIN_X, y: y + 4 }, thickness: 0.5, color: RULE });
    y -= 6;
  }
  return page;
}

function drawFootersAndFinalize(doc: PDFDocument) {
  const pages = doc.getPages();
  const total = pages.length;
  // Skip cover (index 0); footer needs a font, embed once via first content page's resources.
  return { pages, total };
}

export async function buildDossierPdf(kit: PrepKit): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Interview Case Dossier — ${kit.clientName}`);
  doc.setSubject('E-2 treaty investor interview preparation');
  doc.setProducer('e2go.app');

  const fonts = await embedFonts(doc);

  buildCoverPage(doc, fonts, kit);

  const b = new DossierBuilder(doc, fonts, kit.clientName);
  renderCriticalGapsAndPersona(b, kit);
  renderSection1(b, kit.section1);
  renderSection2(b, kit.section2);
  renderSection3(b, kit.section3);
  renderSection4(b, kit.section4);
  renderSection5(b, kit.section5);
  renderSection6(b, kit.section6);
  renderSection7(b, kit.section7);
  if (kit.section8) renderSection8(b, kit.section8);
  if (kit.section9) renderSection9(b, kit.section9);
  if (kit.section10) renderSection10(b, kit.section10);
  renderQuickReference(b, kit);

  insertToc(doc, fonts, kit.clientName, b.tocEntries);

  const { pages, total } = drawFootersAndFinalize(doc);
  for (let i = 1; i < pages.length; i++) {
    const page = pages[i];
    const label = `Page ${i + 1} of ${total}`;
    const w = fonts.body.widthOfTextAtSize(label, 8.5);
    page.drawLine({ start: { x: MARGIN_X, y: 46 }, end: { x: PAGE_W - MARGIN_X, y: 46 }, thickness: 0.5, color: RULE });
    page.drawText('Confidential — personal use only', { x: MARGIN_X, y: 32, size: 8.5, font: fonts.body, color: INK_MUTE });
    page.drawText(label, { x: PAGE_W - MARGIN_X - w, y: 32, size: 8.5, font: fonts.body, color: INK_MUTE });
  }

  return doc.save();
}
