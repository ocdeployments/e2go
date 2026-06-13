/**
 * docx-toc-builder.ts
 *
 * Builds the Table of Contents / Comprehensive Index for the E-2 visa
 * application package. Lists all included tabs with dot-leader → filename
 * navigation (no page numbers — each document is its own file).
 *
 * Session 4 — Package Assembly
 * Page-number resolution: dot leaders point to the .docx filename since
 * each document has its own page numbering starting at 1.
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from 'docx';
import { TAB_SECTION_TITLES } from '@/lib/docx-package-constants';

export interface TocBuilderOptions {
  applicantName: string;
  preparedDate: string;
  includedTabs: string[]; // filtered TAB_ORDER for this application
}

/**
 * Build a formatted Document for the package table of contents.
 */
export function buildTableOfContents(options: TocBuilderOptions): Document {
  const { applicantName, preparedDate, includedTabs } = options;

  const children: Paragraph[] = [];

  // --- Header block ---
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: applicantName.toUpperCase(),
          bold: true,
          font: 'Century Schoolbook',
          size: 24, // 12pt
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'COMPREHENSIVE INDEX / TABLE OF CONTENTS',
          bold: true,
          font: 'Century Schoolbook',
          size: 24,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Submitted to: U.S. Consulate General, Toronto',
          font: 'Century Schoolbook',
          size: 22, // 11pt
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Date: ${preparedDate}`,
          font: 'Century Schoolbook',
          size: 22,
        }),
      ],
    })
  );

  // Thin rule below header
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: '999999',
          space: 1,
        },
      },
      children: [],
    })
  );

  // --- Index entries ---
  for (const tabLetter of includedTabs) {
    const entry = TAB_SECTION_TITLES[tabLetter];
    if (!entry) continue;

    const filename = `Tab_${tabLetter}_${entry.title.replace(/[^a-zA-Z0-9]/g, '_')}.docx`;

    // Tab letter (bold) + section title (bold, sentence case) + dot leader → filename
    children.push(
      new Paragraph({
        spacing: { after: 60 },
        tabStops: [
          {
            type: TabStopType.RIGHT,
            position: TabStopPosition.MAX,
            leader: 'dot',
          },
        ],
        children: [
          new TextRun({
            text: `Tab ${tabLetter}`,
            bold: true,
            font: 'Century Schoolbook',
            size: 24,
          }),
          new TextRun({
            text: '   ',
            font: 'Century Schoolbook',
            size: 24,
          }),
          new TextRun({
            text: entry.title,
            bold: true,
            font: 'Century Schoolbook',
            size: 24,
          }),
          new TextRun({
            children: ['\t'],
            font: 'Century Schoolbook',
            size: 24,
          }),
          new TextRun({
            text: filename,
            font: 'Century Schoolbook',
            size: 20, // 10pt for filename
          }),
        ],
      })
    );

    // Description line below, italic, 10pt, indented 0.25"
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({
            text: entry.description,
            font: 'Century Schoolbook',
            size: 20, // 10pt
            italics: true,
          }),
        ],
      })
    );
  }

  // --- Bottom spacing ---
  children.push(
    new Paragraph({
      spacing: { after: 0, line: 480 },
      children: [],
    })
  );

  // Thin rule above total line
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        top: {
          style: BorderStyle.SINGLE,
          size: 4,
          color: '999999',
          space: 1,
        },
      },
      children: [],
    })
  );

  // --- TOTAL PACKAGE line ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `TOTAL PACKAGE: ${includedTabs.length} documents (plus cover page, index, and tab dividers)`,
          bold: true,
          font: 'Century Schoolbook',
          size: 22,
        }),
      ],
    })
  );

  // --- Footer instruction about navigation ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Navigate by opening the corresponding .docx file for each tab.',
          font: 'Century Schoolbook',
          size: 20,
          italics: true,
          color: '555555',
        }),
      ],
    })
  );

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Century Schoolbook',
            size: 24,
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
              left: convertInchesToTwip(1),
            },
          },
        },
        // No header/footer — this is a one-page index, matches spec
        children,
      },
    ],
  });
}
