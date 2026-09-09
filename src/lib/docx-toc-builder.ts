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
import { TAB_SECTION_TITLES, DOC_DISPLAY_NAMES, DOC_TYPE_TAB_MAP, TAB_ORDER } from '@/lib/docx-package-constants';
import type { ExhibitEntry } from '@/lib/exhibit-registry';

export interface TocBuilderOptions {
  applicantName: string;
  preparedDate: string;
  includedTabs: string[]; // filtered TAB_ORDER for this application
  includedDocTypes?: string[]; // all generated doc types — enables per-tab file listing
  totalDocCount?: number; // actual doc count (may exceed tab count for multi-doc tabs)
  consulateDisplay?: string; // e.g. "U.S. Consulate General, Toronto"
  // WS3.2 — client-uploaded exhibits (from the WS3.1 exhibit registry), keyed
  // by tab letter, so this becomes a real Master Exhibit Index rather than
  // only listing the documents this application generated.
  exhibitsByTab?: Record<string, ExhibitEntry[]>;
}

/**
 * Build a formatted Document for the package table of contents.
 */
export function buildTableOfContents(options: TocBuilderOptions): Document {
  const {
    applicantName,
    preparedDate,
    includedTabs,
    includedDocTypes = [],
    totalDocCount,
    consulateDisplay = 'U.S. Consulate General',
    exhibitsByTab = {},
  } = options;

  const totalExhibitCount = Object.values(exhibitsByTab).reduce((sum, list) => sum + list.length, 0);

  // Union of tabs with generated docs and tabs with client-uploaded exhibits,
  // in canonical order — a tab with only exhibits (no generated doc) still
  // belongs in a real Master Exhibit Index.
  const allTabs = TAB_ORDER.filter(
    (t) => includedTabs.includes(t) || (exhibitsByTab[t]?.length ?? 0) > 0
  );

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
          text: `Submitted to: ${consulateDisplay}`,
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
  for (const tabLetter of allTabs) {
    const entry = TAB_SECTION_TITLES[tabLetter];
    if (!entry) continue;

    // All generated doc types assigned to this tab
    const docsInTab = includedDocTypes.filter(
      (dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter
    );

    // Tab letter + section title header (no filename on this line for multi-doc tabs)
    const firstFilename =
      docsInTab.length === 1
        ? `Tab_${tabLetter}_${DOC_DISPLAY_NAMES[docsInTab[0]] ?? docsInTab[0]}.docx`
        : '';

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
          ...(firstFilename
            ? [
                new TextRun({
                  children: ['\t'],
                  font: 'Century Schoolbook',
                  size: 24,
                }),
                new TextRun({
                  text: firstFilename,
                  font: 'Century Schoolbook',
                  size: 20,
                }),
              ]
            : []),
        ],
      })
    );

    // Description line, italic 10pt, indented 0.25"
    children.push(
      new Paragraph({
        spacing: { after: docsInTab.length > 1 ? 60 : 200 },
        indent: { left: convertInchesToTwip(0.25) },
        children: [
          new TextRun({
            text: entry.description,
            font: 'Century Schoolbook',
            size: 20,
            italics: true,
          }),
        ],
      })
    );

    // For multi-doc tabs: list each file indented below the description
    if (docsInTab.length > 1) {
      for (const dt of docsInTab) {
        const filename = `Tab_${tabLetter}_${DOC_DISPLAY_NAMES[dt] ?? dt}.docx`;
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: convertInchesToTwip(0.5) },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
                leader: 'dot',
              },
            ],
            children: [
              new TextRun({
                text: '→  ',
                font: 'Century Schoolbook',
                size: 20,
                color: '888888',
              }),
              new TextRun({
                text: filename,
                font: 'Century Schoolbook',
                size: 20,
              }),
            ],
          })
        );
      }
      // Extra spacing after a multi-doc tab
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [],
        })
      );
    }

    // WS3.2 — client-uploaded exhibits for this tab, listed by their
    // canonical registry ID (e.g. "Exhibit D-2") so the binder index matches
    // the exact citations used inside the generated documents.
    const exhibitsInTab = exhibitsByTab[tabLetter] ?? [];
    if (exhibitsInTab.length > 0) {
      for (const ex of exhibitsInTab) {
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            indent: { left: convertInchesToTwip(0.5) },
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
                leader: 'dot',
              },
            ],
            children: [
              new TextRun({
                text: `Exhibit ${ex.id}  `,
                bold: true,
                font: 'Century Schoolbook',
                size: 20,
              }),
              new TextRun({
                text: `${ex.label} — ${ex.fileName}`,
                font: 'Century Schoolbook',
                size: 20,
              }),
            ],
          })
        );
      }
      children.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [],
        })
      );
    }
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
          text: `TOTAL PACKAGE: ${totalDocCount ?? includedTabs.length} generated documents`
            + (totalExhibitCount > 0 ? ` + ${totalExhibitCount} client exhibit(s)` : '')
            + ` across ${allTabs.length} tabs (plus cover page, index, and tab dividers)`,
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
