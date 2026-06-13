/**
 * docx-cover-builder.ts
 *
 * Builds the cover page for the E-2 visa application package.
 * Per spec section 1: Century Schoolbook, ALL CAPS applicant name,
 * centered layout, no page number, no running header, 1" margins.
 *
 * Session 4 — Package Assembly
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  convertInchesToTwip,
  BorderStyle,
} from 'docx';
import { buildTextRuns } from '@/lib/docx-builder';

export interface CoverPageOptions {
  applicantName: string;
  businessName: string;
  businessState: string;
  preparedDate: string;
  nationality: string;
  passportNumber: string; // may be bracket placeholder
}

/**
 * Build a formatted Document for the package cover page.
 */
export function buildCoverPage(options: CoverPageOptions): Document {
  const {
    applicantName,
    businessName,
    businessState,
    preparedDate,
    nationality,
    passportNumber,
  } = options;

  const children: Paragraph[] = [];

  // --- Top spacing (push content toward vertical center) ---
  for (let i = 0; i < 8; i++) {
    children.push(
      new Paragraph({
        spacing: { after: 0, line: 480 },
        children: [],
      })
    );
  }

  // --- Applicant name: ALL CAPS, bold, 16pt, centered ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: applicantName.toUpperCase(),
          bold: true,
          font: 'Century Schoolbook',
          size: 32, // 16pt in half-points
        }),
      ],
    })
  );

  // --- Blank line ---
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [],
    })
  );

  // --- "E-2 TREATY INVESTOR VISA APPLICATION": bold, 14pt, all caps, centered ---
  children.push(
    new Paragraph({
      spacing: { after: 300 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'E-2 TREATY INVESTOR VISA APPLICATION',
          bold: true,
          font: 'Century Schoolbook',
          size: 28, // 14pt
        }),
      ],
    })
  );

  // --- Blank line ---
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [],
    })
  );

  // --- Business name/state line: 12pt centered ---
  children.push(
    new Paragraph({
      spacing: { after: 100 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: businessName,
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
          text: businessState,
          font: 'Century Schoolbook',
          size: 24,
        }),
      ],
    })
  );

  // --- "Submitted to: U.S. Consulate General Toronto" ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Submitted to: U.S. Consulate General, Toronto',
          font: 'Century Schoolbook',
          size: 24,
        }),
      ],
    })
  );

  // --- "Date Prepared: [Month DD, YYYY]" ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Date Prepared: ${preparedDate}`,
          font: 'Century Schoolbook',
          size: 24,
        }),
      ],
    })
  );

  // --- "Nationality: [X] | Passport: [Y]" ---
  children.push(
    new Paragraph({
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Nationality: ${nationality}  |  Passport: `,
          font: 'Century Schoolbook',
          size: 24,
        }),
        ...buildTextRuns(passportNumber),
      ],
    })
  );

  // --- Thin 0.5pt horizontal rule ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 4, // ~0.5pt
          color: '999999',
          space: 1,
        },
      },
      children: [],
    })
  );

  // --- "Prepared in accordance with 9 FAM 402.9" — 12pt centered italic ---
  children.push(
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'Prepared in accordance with 9 FAM 402.9',
          font: 'Century Schoolbook',
          size: 24,
          italics: true,
        }),
      ],
    })
  );

  // --- Thin 0.5pt horizontal rule ---
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

  // --- Bottom spacing ---
  for (let i = 0; i < 4; i++) {
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
        // No header — cover page has no running header
        // No footer — cover page has no page number
        children,
      },
    ],
  });
}
