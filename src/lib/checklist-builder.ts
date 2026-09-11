/**
 * checklist-builder.ts
 *
 * Scans all 6 generated documents for [BRACKET FORMAT] placeholders
 * and generates a COMPLETE-BEFORE-SUBMITTING.docx checklist document.
 *
 * Format spec: same as docx-builder — Century Schoolbook 12pt, 1-inch
 * margins, 1.5 line spacing, no e2go branding.
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
} from 'docx';
import { DOCUMENT_TYPE_LABELS, DocumentType } from '@/types/generation';
import { TAB_SECTION_TITLES } from '@/lib/docx-package-constants';

const BRACKET_PLACEHOLDER_REGEX = /\[[^\[\]]+\]/g;

interface PlaceholderItem {
  groupLabel: string;
  placeholder: string;
}

/**
 * Extract all [BRACKET FORMAT] placeholders from a single document.
 */
function extractPlaceholders(
  contentText: string,
  documentType: DocumentType
): PlaceholderItem[] {
  const items: PlaceholderItem[] = [];
  const docLabel = DOCUMENT_TYPE_LABELS[documentType];
  let match: RegExpExecArray | null;

  // Reset regex state
  BRACKET_PLACEHOLDER_REGEX.lastIndex = 0;

  while ((match = BRACKET_PLACEHOLDER_REGEX.exec(contentText)) !== null) {
    // match[0] is the full "[text]" — strip brackets for display
    const placeholder = match[0].slice(1, -1).trim();
    if (placeholder) {
      items.push({
        groupLabel: docLabel,
        placeholder,
      });
    }
  }

  return items;
}

interface DocumentEntry {
  document_type: DocumentType;
  content_text: string | null;
}

interface ChecklistBuilderOptions {
  documents: DocumentEntry[];
  applicantName?: string;
  includedTabs?: string[];
  /** Cover-page field (docx-cover-builder.ts) — may still be a bracket placeholder. */
  passportNumber?: string;
  /** Cover-page field (docx-cover-builder.ts) — may still be a bracket placeholder. */
  businessState?: string;
}

/**
 * DR-17 (Gap G-12): the six conditional document types from
 * document-plan.ts's buildDocumentPlan, grouped by the single trigger that
 * fires them. A minimal solo persona (no spouse, no property-sale funds,
 * funds fully deployed, no securities/registered-plan/crypto funds, no
 * lease) fires none of these five triggers, so all six document types stay
 * absent — reported here as five reason lines (the spousal trigger alone
 * covers two document types: declaration_spouse + resume_spouse).
 */
interface ConditionalDocumentGroup {
  documentTypes: DocumentType[];
  reason: string;
}

const CONDITIONAL_DOCUMENT_GROUPS: ConditionalDocumentGroup[] = [
  {
    documentTypes: ['declaration_spouse', 'resume_spouse'],
    reason: 'No spouse or common-law partner was included on this application.',
  },
  {
    documentTypes: ['property_portfolio'],
    reason: 'Your investment funds were not reported as coming from the sale of property.',
  },
  {
    documentTypes: ['investment_proof'],
    reason:
      'Your investment funds are already fully deployed into the business, so separate evidence of at-risk funds is not required.',
  },
  {
    documentTypes: ['financial_assets_portfolio'],
    reason:
      'Your investment funds were not reported as coming from securities, a registered retirement account, or cryptocurrency.',
  },
  {
    documentTypes: ['lease_premises_summary'],
    reason: 'No lease agreement was uploaded for this business.',
  },
];

function findNonTriggeredGroups(
  presentTypes: ReadonlySet<DocumentType>
): ConditionalDocumentGroup[] {
  return CONDITIONAL_DOCUMENT_GROUPS.filter(
    (group) => !group.documentTypes.some((dt) => presentTypes.has(dt))
  );
}

/** A cover-page field (docx-cover-builder.ts's own fallback shape) still unfilled. */
const BRACKET_VALUE_REGEX = /^\[(.+)\]$/;

/**
 * Build COMPLETE-BEFORE-SUBMITTING.docx from all document placeholders.
 */
export function buildChecklist(options: ChecklistBuilderOptions): Document {
  const { documents, includedTabs, passportNumber, businessState } = options;
  const allPlaceholders: PlaceholderItem[] = [];

  for (const doc of documents) {
    if (doc.content_text) {
      const items = extractPlaceholders(doc.content_text, doc.document_type);
      allPlaceholders.push(...items);
    }
  }

  // DR-17: the cover page (docx-cover-builder.ts) is built separately from
  // `documents` and is never scanned above, so a bracket left there —
  // passport number / business state, neither collected at intake — would
  // otherwise reach the client unannounced in the first file they open.
  for (const value of [passportNumber, businessState]) {
    const match = value?.trim().match(BRACKET_VALUE_REGEX);
    if (match) {
      allPlaceholders.push({ groupLabel: 'Cover Page', placeholder: match[1].trim() });
    }
  }

  const presentTypes = new Set(documents.map((d) => d.document_type));
  const nonTriggeredGroups = findNonTriggeredGroups(presentTypes);

  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'COMPLETE BEFORE SUBMITTING',
          bold: true,
          font: 'Century Schoolbook',
          size: 32, // 16pt
        }),
      ],
    })
  );

  // Subtitle
  children.push(
    new Paragraph({
      spacing: { after: 400 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'You must complete the items below before submitting your E-2 visa application.',
          font: 'Century Schoolbook',
          size: 24, // 12pt
          italics: true,
        }),
      ],
    })
  );

  // Package contents intro (Session 4 addition)
  if (includedTabs && includedTabs.length > 0) {
    const docList = includedTabs
      .map((tabLetter) => {
        const entry = TAB_SECTION_TITLES[tabLetter];
        if (!entry) return null;
        return `Tab ${tabLetter} — ${entry.title}`;
      })
      .filter(Boolean)
      .join(', ');

    children.push(
      new Paragraph({
        spacing: { after: 300 },
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({
            text: `Your package includes a cover page, table of contents, tab dividers, and the following ${includedTabs.length} documents: `,
            font: 'Century Schoolbook',
            size: 22, // 11pt
          }),
          new TextRun({
            text: `${docList}.`,
            font: 'Century Schoolbook',
            size: 22,
            bold: true,
          }),
        ],
      })
    );

    // Blank line after intro
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [],
      })
    );
  }

  // DR-17: name every correctly-omitted conditional document and why, so a
  // client counting files against the full Foundation feature list doesn't
  // mistake a correct omission for a short-changed package.
  if (nonTriggeredGroups.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 120 },
        children: [
          new TextRun({
            text: 'Not Applicable to Your Case',
            bold: true,
            font: 'Century Schoolbook',
            size: 28,
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: 'The documents below are part of the full E-2 package but do not apply to your case, and are correctly not included:',
            font: 'Century Schoolbook',
            size: 22,
            italics: true,
          }),
        ],
      })
    );
    for (const group of nonTriggeredGroups) {
      const label = group.documentTypes.map((dt) => DOCUMENT_TYPE_LABELS[dt]).join(' & ');
      children.push(
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: convertInchesToTwip(0.5) },
          children: [
            new TextRun({
              text: `${label} — `,
              bold: true,
              font: 'Century Schoolbook',
              size: 22,
            }),
            new TextRun({
              text: group.reason,
              font: 'Century Schoolbook',
              size: 22,
            }),
          ],
        })
      );
    }
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [],
      })
    );
  }

  if (allPlaceholders.length === 0) {
    // No placeholders found — all documents are complete
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'No outstanding items found. All documents are ready for submission.',
            font: 'Century Schoolbook',
            size: 24,
            bold: true,
          }),
        ],
      })
    );
  } else {
    // Group by document (or, for cover-page fields, by "Cover Page")
    const grouped = new Map<string, PlaceholderItem[]>();
    for (const item of allPlaceholders) {
      const existing = grouped.get(item.groupLabel) || [];
      existing.push(item);
      grouped.set(item.groupLabel, existing);
    }

    // Summary line
    children.push(
      new Paragraph({
        spacing: { after: 300 },
        children: [
          new TextRun({
            text: `${allPlaceholders.length} item${allPlaceholders.length === 1 ? '' : 's'} across ${grouped.size} document${grouped.size === 1 ? '' : 's'} require completion:`,
            font: 'Century Schoolbook',
            size: 24,
          }),
        ],
      })
    );

    // Grouped list
    for (const [groupLabel, items] of grouped) {
      // Document (or cover-page field) header
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: groupLabel,
              bold: true,
              font: 'Century Schoolbook',
              size: 28, // 14pt
            }),
          ],
        })
      );

      // Each placeholder
      for (let i = 0; i < items.length; i++) {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: convertInchesToTwip(0.5) },
            children: [
              new TextRun({
                text: `■  ${items[i].placeholder}`,
                font: 'Century Schoolbook',
                size: 24,
              }),
            ],
          })
        );
      }
    }

    // Footer instruction
    children.push(
      new Paragraph({
        spacing: { before: 400 },
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: 'Each item above is highlighted yellow in its respective document. Open each .docx file, find the highlighted sections, and complete them before submitting.',
            font: 'Century Schoolbook',
            size: 22, // 11pt
            italics: true,
            color: '555555',
          }),
        ],
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
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: 'E-2 Application | Completion Checklist',
                    font: 'Century Schoolbook',
                    size: 18,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: 'Century Schoolbook',
                    size: 18,
                    color: '666666',
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
