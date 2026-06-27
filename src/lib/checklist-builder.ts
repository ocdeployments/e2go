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
  documentType: DocumentType;
  documentLabel: string;
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
        documentType,
        documentLabel: docLabel,
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
}

/**
 * Build COMPLETE-BEFORE-SUBMITTING.docx from all document placeholders.
 */
export function buildChecklist(options: ChecklistBuilderOptions): Document {
  const { documents, includedTabs } = options;
  const allPlaceholders: PlaceholderItem[] = [];

  for (const doc of documents) {
    if (doc.content_text) {
      const items = extractPlaceholders(doc.content_text, doc.document_type);
      allPlaceholders.push(...items);
    }
  }

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
    // Group by document type
    const grouped = new Map<DocumentType, PlaceholderItem[]>();
    for (const item of allPlaceholders) {
      const existing = grouped.get(item.documentType) || [];
      existing.push(item);
      grouped.set(item.documentType, existing);
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
    for (const [docType, items] of grouped) {
      const docLabel = DOCUMENT_TYPE_LABELS[docType];

      // Document type header
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [
            new TextRun({
              text: docLabel,
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
