import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, RGB } from 'pdf-lib';

// Shared visual system for e2go's native (pdf-lib) PDF documents — same paper,
// ink, gold-rule aesthetic as the interview dossier (see dossier-pdf.ts).
// Used by dossier-pdf.ts, fdd-pdf.ts, and market-analysis-pdf.ts so the three
// document types look like one family.

export const PAGE_W = 612;
export const PAGE_H = 792;
export const MARGIN_X = 56;
export const CONTENT_TOP = 720;
export const CONTENT_BOTTOM = 80;
export const LINE_GAP = 1.5;

export const PAPER: RGB = rgb(0.984, 0.98, 0.968);
export const INK: RGB = rgb(0.11, 0.102, 0.086);
export const INK_BODY: RGB = rgb(0.169, 0.157, 0.125);
export const INK_DIM: RGB = rgb(0.353, 0.337, 0.3);
export const INK_MUTE: RGB = rgb(0.58, 0.565, 0.498);
export const GOLD: RGB = rgb(0.612, 0.502, 0.204);
export const RULE: RGB = rgb(0.894, 0.878, 0.831);
export const RED: RGB = rgb(0.541, 0.231, 0.231);
export const AMBER: RGB = rgb(0.541, 0.353, 0.141);
export const GREEN: RGB = rgb(0.259, 0.416, 0.278);

export interface Fonts {
  serif: PDFFont;
  serifItalic: PDFFont;
  body: PDFFont;
  bodyBold: PDFFont;
}

export async function embedFonts(doc: PDFDocument): Promise<Fonts> {
  return {
    serif: await doc.embedFont(StandardFonts.TimesRoman),
    serifItalic: await doc.embedFont(StandardFonts.TimesRomanItalic),
    body: await doc.embedFont(StandardFonts.Helvetica),
    bodyBold: await doc.embedFont(StandardFonts.HelveticaBold),
  };
}

export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
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

export class DocBuilder {
  doc: PDFDocument;
  fonts: Fonts;
  docName: string;
  contentPages: PDFPage[] = [];
  tocEntries: { title: string; subtitle: string; contentPageIndex: number }[] = [];
  page: PDFPage | null = null;
  y = 0;
  currentSectionTitle = '';

  constructor(doc: PDFDocument, fonts: Fonts, docName: string) {
    this.doc = doc;
    this.fonts = fonts;
    this.docName = docName;
  }

  private fillBg(page: PDFPage) {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  }

  newContentPage(sectionTitle: string, isNewSection: boolean) {
    const page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.fillBg(page);
    this.contentPages.push(page);
    page.drawText(`${this.docName} · ${sectionTitle}`, {
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
    const color = opts.color ?? INK_BODY;
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
      this.page!.drawText(valueLines[i], { x: MARGIN_X + labelW, y: this.y, size, font: this.fonts.body, color: INK_BODY });
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
      this.page!.drawText(lines[i], { x: MARGIN_X + 14, y: this.y, size, font: this.fonts.body, color: INK_BODY });
      this.y -= size * LINE_GAP;
    }
    this.y -= 4;
  }

  tag(text: string, color: RGB) {
    const size = 8;
    const w = this.fonts.bodyBold.widthOfTextAtSize(text, size);
    const x = PAGE_W - MARGIN_X - w - 10;
    this.page!.drawRectangle({ x, y: this.y - 2, width: w + 10, height: 13, borderColor: color, borderWidth: 1, color: PAPER });
    this.page!.drawText(text, { x: x + 5, y: this.y + 1, size, font: this.fonts.bodyBold, color });
  }
}

export function buildCoverPage(doc: PDFDocument, fonts: Fonts, opts: {
  eyebrow: string; title: string; subtitle: string; metaRows: [string, string][]; footerLines: string[];
}) {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });

  const cx = PAGE_W / 2;
  page.drawLine({ start: { x: cx - 32, y: 660 }, end: { x: cx + 32, y: 660 }, thickness: 2, color: GOLD });

  const eyebrowSize = 10;
  const eyebrowW = fonts.bodyBold.widthOfTextAtSize(opts.eyebrow, eyebrowSize);
  page.drawText(opts.eyebrow, { x: cx - eyebrowW / 2, y: 624, size: eyebrowSize, font: fonts.bodyBold, color: GOLD });

  const titleSize = 30;
  const titleLines = wrapText(opts.title, fonts.serif, titleSize, PAGE_W - MARGIN_X * 2 - 40);
  let ty = 578;
  for (const line of titleLines) {
    const titleW = fonts.serif.widthOfTextAtSize(line, titleSize);
    page.drawText(line, { x: cx - titleW / 2, y: ty, size: titleSize, font: fonts.serif, color: INK });
    ty -= 36;
  }

  const subSize = 15;
  const subW = fonts.serifItalic.widthOfTextAtSize(opts.subtitle, subSize);
  page.drawText(opts.subtitle, { x: cx - subW / 2, y: ty - 6, size: subSize, font: fonts.serifItalic, color: INK_DIM });

  let my = 300;
  page.drawLine({ start: { x: MARGIN_X, y: my + 22 }, end: { x: PAGE_W - MARGIN_X, y: my + 22 }, thickness: 0.75, color: RULE });
  for (const [label, value] of opts.metaRows) {
    page.drawText(label.toUpperCase(), { x: MARGIN_X, y: my, size: 9, font: fonts.body, color: INK_MUTE });
    const vw = fonts.bodyBold.widthOfTextAtSize(value, 10.5);
    page.drawText(value, { x: PAGE_W - MARGIN_X - vw, y: my, size: 10.5, font: fonts.bodyBold, color: INK });
    my -= 22;
    page.drawLine({ start: { x: MARGIN_X, y: my + 22 }, end: { x: PAGE_W - MARGIN_X, y: my + 22 }, thickness: 0.75, color: RULE });
  }

  let fy = 70;
  for (const line of opts.footerLines) {
    const w = fonts.body.widthOfTextAtSize(line, 8.5);
    page.drawText(line, { x: cx - w / 2, y: fy, size: 8.5, font: fonts.body, color: INK_MUTE });
    fy -= 12;
  }
}

export function insertToc(doc: PDFDocument, fonts: Fonts, docName: string, entries: { title: string; subtitle: string; contentPageIndex: number }[]) {
  const page = doc.insertPage(1, [PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: PAPER });
  page.drawText(`${docName} · Table of Contents`, { x: MARGIN_X, y: 750, size: 9, font: fonts.body, color: INK_MUTE });
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
}

export function drawFootersAndFinalize(doc: PDFDocument, fonts: Fonts) {
  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 1; i < pages.length; i++) {
    const page = pages[i];
    const label = `Page ${i + 1} of ${total}`;
    const w = fonts.body.widthOfTextAtSize(label, 8.5);
    page.drawLine({ start: { x: MARGIN_X, y: 46 }, end: { x: PAGE_W - MARGIN_X, y: 46 }, thickness: 0.5, color: RULE });
    page.drawText('Confidential — personal use only', { x: MARGIN_X, y: 32, size: 8.5, font: fonts.body, color: INK_MUTE });
    page.drawText(label, { x: PAGE_W - MARGIN_X - w, y: 32, size: 8.5, font: fonts.body, color: INK_MUTE });
  }
}
