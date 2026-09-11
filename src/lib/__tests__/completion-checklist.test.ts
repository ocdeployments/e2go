/**
 * DR-17 (Gap G-12), September 11, 2026 (Session 146).
 *
 * Six documents on the Foundation feature list are conditional
 * (document-plan.ts's buildDocumentPlan). When one doesn't trigger it is
 * simply absent from `documents` — nothing in the package said why, so a
 * client counting files against the full feature list could mistake a
 * correct omission for a short-changed one. buildChecklist() now adds a
 * "Not Applicable to Your Case" section naming every non-triggered group
 * with its reason, and promotes the two cover-page-only bracket fields
 * (passportNumber, businessState — docx-cover-builder.ts, never collected
 * at intake) into the same placeholder-completion list the checklist
 * already built from the generated documents.
 *
 * buildChecklist() returns a docx `Document` object, not plain text, so
 * these tests render it through the real Packer/JSZip path (same approach
 * as download-budget.test.ts) and inspect word/document.xml rather than
 * reaching into docx's internal object tree.
 */
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildChecklist } from '../checklist-builder';
import type { DocumentType } from '@/types/generation';

async function renderedText(doc: ReturnType<typeof buildChecklist>): Promise<string> {
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('string');
  return xml.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
}

const REASONS = {
  spouse: 'No spouse or common-law partner was included on this application.',
  property: 'Your investment funds were not reported as coming from the sale of property.',
  investmentProof:
    'Your investment funds are already fully deployed into the business, so separate evidence of at-risk funds is not required.',
  financialAssets:
    'Your investment funds were not reported as coming from securities, a registered retirement account, or cryptocurrency.',
  lease: 'No lease agreement was uploaded for this business.',
};

const ALL_REASONS = Object.values(REASONS);

function doc(documentType: DocumentType, content_text: string | null = 'Body text, no brackets.') {
  return { document_type: documentType, content_text };
}

describe('buildChecklist — Not Applicable to Your Case (DR-17)', () => {
  it('a minimal solo persona (no conditional documents present) names all 5 non-triggered groups', async () => {
    const checklist = buildChecklist({
      documents: [doc('cover_letter'), doc('business_plan')],
      applicantName: 'Test Applicant',
      passportNumber: '[passport number from Tab A]',
      businessState: '[Business state]',
    });
    const text = await renderedText(checklist);

    expect(text).toContain('Not Applicable to Your Case');
    for (const reason of ALL_REASONS) {
      expect(text).toContain(reason);
    }
  });

  it('promotes both unfilled cover-page brackets into the placeholder list', async () => {
    const checklist = buildChecklist({
      documents: [doc('cover_letter')],
      applicantName: 'Test Applicant',
      passportNumber: '[passport number from Tab A]',
      businessState: '[Business state]',
    });
    const text = await renderedText(checklist);

    expect(text).toContain('Cover Page');
    expect(text).toContain('passport number from Tab A');
    expect(text).toContain('Business state');
  });

  it('excludes a triggered group (spouse included) from the non-applicable section, keeps the rest', async () => {
    const checklist = buildChecklist({
      documents: [doc('cover_letter'), doc('declaration_spouse'), doc('resume_spouse')],
      applicantName: 'Test Applicant',
      passportNumber: '[passport number from Tab A]',
      businessState: '[Business state]',
    });
    const text = await renderedText(checklist);

    expect(text).not.toContain(REASONS.spouse);
    expect(text).toContain(REASONS.property);
    expect(text).toContain(REASONS.investmentProof);
    expect(text).toContain(REASONS.financialAssets);
    expect(text).toContain(REASONS.lease);
  });

  it('a fully-triggered case (all six conditional types present) has no Not Applicable section', async () => {
    const checklist = buildChecklist({
      documents: [
        doc('cover_letter'),
        doc('declaration_spouse'),
        doc('resume_spouse'),
        doc('property_portfolio'),
        doc('investment_proof'),
        doc('financial_assets_portfolio'),
        doc('lease_premises_summary'),
      ],
      applicantName: 'Test Applicant',
      passportNumber: 'A1234567',
      businessState: 'Texas',
    });
    const text = await renderedText(checklist);

    expect(text).not.toContain('Not Applicable to Your Case');
    for (const reason of ALL_REASONS) {
      expect(text).not.toContain(reason);
    }
  });

  it('does not surface a Cover Page group when passportNumber/businessState are real values', async () => {
    const checklist = buildChecklist({
      documents: [doc('cover_letter', null)],
      applicantName: 'Test Applicant',
      passportNumber: 'A1234567',
      businessState: 'Texas',
    });
    const text = await renderedText(checklist);

    expect(text).not.toContain('Cover Page');
  });

  it('omitting passportNumber/businessState entirely does not add Cover Page items', async () => {
    const checklist = buildChecklist({
      documents: [doc('cover_letter', null)],
      applicantName: 'Test Applicant',
    });
    const text = await renderedText(checklist);

    expect(text).not.toContain('Cover Page');
  });
});
