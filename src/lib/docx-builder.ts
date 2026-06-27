/**
 * docx-builder.ts
 *
 * Converts plain-text content_text from generated_documents into a
 * formatted .docx using the `docx` library (dolanmiu/docx).
 *
 * Format spec (locked per E2Go Legal Document Standards v1.0):
 *  - Font: Century Schoolbook, 12pt body
 *  - Margins: 1" T/B/R, 1.25" left (binding)
 *  - Body: Double-spaced, justified, 0.5" first-line indent
 *  - Cover letter exception: 1.15 spacing, left-aligned, block paragraphs
 *  - H1: Bold, 12pt, ALL CAPS, underlined
 *  - H2: Bold, 12pt, title case
 *  - H3: Bold italic, 12pt
 *  - Header: Two-column — name left, "E-2 Treaty Investor Visa" right, thin rule
 *  - Footer: Name + Tab letter left, Page N right, thin rule
 *  - [bracket] placeholders highlighted yellow
 *  - No e2go branding, no AI metadata
 */

import {
  Document,
  Footer,
  Header,
  PageNumber,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
  UnderlineType,
} from 'docx';

/** Roman numeral section header pattern (Level 1) */
const ROMAN_HEADER_REGEX = /^(I{1,3}V?|VI{0,3}|IX|X)\.\s+(.+)$/;
/** Letter subheading pattern (Level 2): "A. ", "B. ", etc. */
const LETTER_HEADER_REGEX = /^([A-Z])\.\s+(.+)$/;
/** Numbered sub-subheading pattern (Level 3): "1. ", "2. ", etc. */
const NUMBER_HEADER_REGEX = /^(\d+)\.\s+(.+)$/;
export const BRACKET_PLACEHOLDER_REGEX = /\[[^\[\]]+\]/g;

/** Document type → Tab letter mapping for footers (imported from shared module) */
import { DOC_TYPE_TAB_MAP } from '@/lib/docx-package-constants';

interface DocxBuilderOptions {
  contentText: string;
  documentType: string;
  lastName: string;
}

interface ParsedLine {
  type: 'header' | 'subheader' | 'subsubheader' | 'body';
  text: string;
  romanNumeral?: string;
  letterPrefix?: string;
  numberPrefix?: string;
}

/**
 * Parse plain text into structured lines, detecting heading hierarchy.
 */
function parseContentLines(contentText: string): ParsedLine[] {
  const lines = contentText.split('\n');
  const parsed: ParsedLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      parsed.push({ type: 'body', text: '' });
      continue;
    }

    // Level 1: Roman numeral headings (I. II. III. etc.)
    const h1Match = trimmed.match(ROMAN_HEADER_REGEX);
    if (h1Match) {
      parsed.push({
        type: 'header',
        romanNumeral: h1Match[1],
        text: h1Match[2],
      });
      continue;
    }

    // Level 2: Letter subheadings (A. B. C. etc.)
    const h2Match = trimmed.match(LETTER_HEADER_REGEX);
    if (h2Match) {
      parsed.push({
        type: 'subheader',
        letterPrefix: h2Match[1],
        text: h2Match[2],
      });
      continue;
    }

    // Level 3: Numbered sub-subheadings (1. 2. 3. etc.)
    const h3Match = trimmed.match(NUMBER_HEADER_REGEX);
    if (h3Match) {
      parsed.push({
        type: 'subsubheader',
        numberPrefix: h3Match[1],
        text: h3Match[2],
      });
      continue;
    }

    parsed.push({ type: 'body', text: trimmed });
  }

  return parsed;
}

/**
 * Split text around [...] bracket placeholders
 * and return TextRun array with yellow highlighting on bracketed sections.
 */
export function buildTextRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(BRACKET_PLACEHOLDER_REGEX);
  const matches = text.match(BRACKET_PLACEHOLDER_REGEX) || [];

  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) {
      runs.push(
        new TextRun({
          text: parts[i],
          font: 'Century Schoolbook',
          size: 24, // 12pt in half-points
        })
      );
    }
    // Odd-indexed parts after split are the bracket matches
    if (i < matches.length) {
      runs.push(
        new TextRun({
          text: matches[i],
          font: 'Century Schoolbook',
          size: 24,
          highlight: 'yellow',
        })
      );
    }
  }

  return runs;
}

/** Check if a line is part of a markdown table (starts and ends with |). */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2;
}

/** Check if a line is a markdown table separator row (|---|---|...). */
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  return /^\|(\s*-{2,}\s*\|)+\s*$/.test(trimmed);
}

/** Parse a markdown table block into header + data rows (arrays of cell strings). */
function parseMarkdownTable(lines: string[]): { header: string[]; data: string[][] } {
  const header = lines[0]
    .split('|')
    .slice(1, -1)
    .map((c) => c.trim());
  const data: string[][] = [];
  // Skip separator row (index 1), process remaining rows
  for (let i = 2; i < lines.length; i++) {
    const cells = lines[i]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    data.push(cells);
  }
  return { header, data };
}

/** Create a Word Table from parsed markdown table data. */
function createWordTable(header: string[], data: string[][]): Table {
  const borderStyle = {
    style: BorderStyle.SINGLE,
    size: 1,
    color: '595959',
  };
  const borders = {
    top: borderStyle,
    bottom: borderStyle,
    left: borderStyle,
    right: borderStyle,
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: header.map(
      (cell) =>
        new TableCell({
          borders,
          shading: { fill: 'E8E8E8' },
          children: [
            new Paragraph({
              spacing: { after: 0, line: 240 },
              children: [
                new TextRun({
                  text: cell,
                  font: 'Century Schoolbook',
                  size: 22, // 11pt
                  bold: true,
                }),
              ],
            }),
          ],
        })
    ),
  });

  const dataRows = data.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              borders,
              children: [
                new Paragraph({
                  spacing: { after: 0, line: 240 },
                  children: [
                    new TextRun({
                      text: cell,
                      font: 'Century Schoolbook',
                      size: 22, // 11pt
                    }),
                  ],
                }),
              ],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

/**
 * Build a formatted Document from content_text.
 */
export function buildDocument(options: DocxBuilderOptions): Document {
  const { contentText, documentType, lastName } = options;
  const parsedLines = parseContentLines(contentText);

  // Cover letter uses business letter format; all others use formal legal format
  const isCoverLetter = documentType === 'cover_letter';
  const lineSpacing = isCoverLetter ? 276 : 480; // 1.15 vs double-spaced
  const bodyAlignment = isCoverLetter ? AlignmentType.LEFT : AlignmentType.JUSTIFIED;
  const firstLineIndent = isCoverLetter ? 0 : convertInchesToTwip(0.5);

  const tabLetter = DOC_TYPE_TAB_MAP[documentType] || '';
  const tabLabel = tabLetter ? `Tab ${tabLetter}` : '';

  const children: (Paragraph | Table)[] = [];

  let i = 0;
  while (i < parsedLines.length) {
    const line = parsedLines[i];

    // Empty line
    if (!line.text) {
      children.push(
        new Paragraph({
          spacing: { after: 0, line: lineSpacing },
          children: [],
        })
      );
      i++;
      continue;
    }

    // Detect markdown table block: consecutive lines matching table row format
    // with a separator row as the second line
    if (
      line.type === 'body' &&
      isTableRow(line.text) &&
      i + 1 < parsedLines.length &&
      parsedLines[i + 1].type === 'body' &&
      isTableSeparator(parsedLines[i + 1].text)
    ) {
      // Collect all contiguous table rows
      const tableLines: string[] = [];
      while (i < parsedLines.length && parsedLines[i].type === 'body' && isTableRow(parsedLines[i].text)) {
        tableLines.push(parsedLines[i].text);
        i++;
      }
      // Ensure we have at least a header + separator + 1 data row
      if (tableLines.length >= 3 && isTableSeparator(tableLines[1])) {
        const { header, data } = parseMarkdownTable(tableLines);
        children.push(createWordTable(header, data));
      } else {
        // Not a valid table — render as normal paragraphs
        for (const tl of tableLines) {
          children.push(
            new Paragraph({
              spacing: { after: 0, line: lineSpacing },
              alignment: bodyAlignment,
              indent: { firstLine: firstLineIndent },
              children: buildTextRuns(tl),
            })
          );
        }
      }
      continue;
    }

    // Level 1: Roman numeral section header — ALL CAPS, bold, underlined
    if (line.type === 'header') {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 240, line: 240 },
          children: [
            new TextRun({
              text: `${line.romanNumeral}. ${line.text.toUpperCase()}`,
              bold: true,
              font: 'Century Schoolbook',
              size: 24, // 12pt
              underline: { type: UnderlineType.SINGLE },
            }),
          ],
        })
      );
    } else if (line.type === 'subheader') {
      // Level 2: Letter subheading — title case, bold, 12pt
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 360, after: 120, line: lineSpacing },
          indent: { firstLine: firstLineIndent },
          children: [
            new TextRun({
              text: `${line.letterPrefix}. ${line.text}`,
              bold: true,
              font: 'Century Schoolbook',
              size: 24, // 12pt
            }),
          ],
        })
      );
    } else if (line.type === 'subsubheader') {
      // Level 3: Numbered sub-subheading — sentence case, bold italic, 12pt
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 240, after: 120, line: lineSpacing },
          indent: { firstLine: firstLineIndent },
          children: [
            new TextRun({
              text: `${line.numberPrefix}. ${line.text}`,
              bold: true,
              italics: true,
              font: 'Century Schoolbook',
              size: 24, // 12pt
            }),
          ],
        })
      );
    } else {
      // Normal body paragraph
      const textRuns = buildTextRuns(line.text);
      children.push(
        new Paragraph({
          spacing: { after: 0, line: lineSpacing },
          alignment: bodyAlignment,
          indent: { firstLine: firstLineIndent },
          children: textRuns,
        })
      );
    }
    i++;
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Century Schoolbook',
            size: 24, // 12pt
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25), // wider left for binding
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              // Header text: name left, "E-2 Treaty Investor Visa" right
              new Paragraph({
                spacing: { after: 0 },
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                children: [
                  new TextRun({
                    text: `${lastName}`,
                    font: 'Century Schoolbook',
                    size: 20, // 10pt
                  }),
                  new TextRun({
                    children: ['\t'],
                    font: 'Century Schoolbook',
                    size: 20,
                  }),
                  new TextRun({
                    text: 'E-2 Treaty Investor Visa',
                    font: 'Century Schoolbook',
                    size: 20, // 10pt
                  }),
                ],
              }),
              // Thin rule below header
              new Paragraph({
                spacing: { after: 0 },
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: '999999',
                    space: 1,
                  },
                },
                children: [],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              // Thin rule above footer
              new Paragraph({
                spacing: { after: 0 },
                border: {
                  top: {
                    style: BorderStyle.SINGLE,
                    size: 6,
                    color: '999999',
                    space: 1,
                  },
                },
                children: [],
              }),
              // Footer text: name+tab left, page number right
              new Paragraph({
                spacing: { after: 0 },
                tabStops: [
                  {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                  },
                ],
                children: [
                  new TextRun({
                    text: `${lastName} — E-2 Application${tabLabel ? ` — ${tabLabel}` : ''}`,
                    font: 'Century Schoolbook',
                    size: 20, // 10pt
                  }),
                  new TextRun({
                    children: ['\t'],
                    font: 'Century Schoolbook',
                    size: 20,
                  }),
                  new TextRun({
                    text: 'Page ',
                    font: 'Century Schoolbook',
                    size: 20,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Century Schoolbook',
                    size: 20,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}
