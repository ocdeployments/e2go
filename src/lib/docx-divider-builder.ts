/**
 * docx-divider-builder.ts
 *
 * Builds tab divider pages for the E-2 visa application package.
 * One divider per included document tab (A, D, F, H, I, J).
 *
 * Per spec section 3: "TAB [X]" 36pt bold centered, section title 20pt,
 * description 12pt italic, footer with name + "E-2 Visa Application",
 * no page number, no running header.
 *
 * Session 4 — Package Assembly
 */

import {
  Document,
  Footer,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  TabStopType,
  TabStopPosition,
} from 'docx';

export interface TabDividerOptions {
  tabLetter: string;
  sectionTitle: string;
  description: string;
  applicantName: string;
}

/**
 * Build a formatted Document for a single tab divider page.
 */
export function buildTabDivider(options: TabDividerOptions): Document {
  const { tabLetter, sectionTitle, description, applicantName } = options;

  const children: Paragraph[] = [];

  // --- Generous top spacing ---
  for (let i = 0; i < 10; i++) {
    children.push(
      new Paragraph({
        spacing: { after: 0, line: 480 },
        children: [],
      })
    );
  }

  // --- "TAB [X]" — all caps, bold, 36pt, centered ---
  children.push(
    new Paragraph({
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `TAB ${tabLetter}`,
          bold: true,
          font: 'Century Schoolbook',
          size: 72, // 36pt in half-points
        }),
      ],
    })
  );

  // --- Section title — all caps, bold, 20pt, centered ---
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: sectionTitle.toUpperCase(),
          bold: true,
          font: 'Century Schoolbook',
          size: 40, // 20pt
        }),
      ],
    })
  );

  // --- Description — regular, 12pt, centered, italic ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: description,
          font: 'Century Schoolbook',
          size: 24, // 12pt
          italics: true,
        }),
      ],
    })
  );

  // --- Bottom spacing ---
  for (let i = 0; i < 8; i++) {
    children.push(
      new Paragraph({
        spacing: { after: 0, line: 480 },
        children: [],
      })
    );
  }

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
        // No running header — divider pages are not numbered per spec
        footers: {
          default: new Footer({
            children: [
              // Footer line: applicant name (left) + "E-2 Visa Application" (right) — no page number
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
                    text: applicantName,
                    font: 'Century Schoolbook',
                    size: 20, // 10pt
                  }),
                  new TextRun({
                    children: ['\t'],
                    font: 'Century Schoolbook',
                    size: 20,
                  }),
                  new TextRun({
                    text: 'E-2 Visa Application',
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
