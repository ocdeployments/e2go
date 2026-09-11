/**
 * DR-10 (Gap G-08), September 11, 2026 (Session 146).
 *
 * generate/download/[applicationId]/route.ts had no `runtime`/`maxDuration`
 * at all, so it inherited Vercel's default function timeout — our own
 * fdd/report/route.ts:13-17 carries a comment warning that exactly this
 * omission "can kill the request after the LLM cost is already incurred."
 * This route has no LLM cost to protect, but an unbounded in-memory ZIP
 * assembly (cover page + TOC + a divider per tab + one .docx per generated
 * document + a closing checklist, each through Packer.toBuffer()) deserves
 * the same explicit budget rather than an implicit one.
 *
 * No DI seam on the route itself (createSupabaseServerClient needs a real
 * request scope via next/headers) — consistent with DR-5's progress-stall
 * and DR-8's document-dedupe tests, this drives the actual assembly
 * primitives (the docx/toc/cover/divider/checklist builders + JSZip) the
 * route itself calls, not the route's GET handler.
 */
import { Packer } from 'docx';
import JSZip from 'jszip';
import * as route from '../download/[applicationId]/route';
import { buildDocument } from '@/lib/docx-builder';
import { buildChecklist } from '@/lib/checklist-builder';
import { buildCoverPage } from '@/lib/docx-cover-builder';
import { buildTableOfContents } from '@/lib/docx-toc-builder';
import { buildTabDivider } from '@/lib/docx-divider-builder';
import {
  DOC_TYPE_TAB_MAP,
  TAB_SECTION_TITLES,
  TAB_ORDER,
} from '@/lib/docx-package-constants';
import type { DocumentType } from '@/types/generation';

describe('download route budget declarations (DR-10)', () => {
  it('declares an explicit nodejs runtime', () => {
    expect(route.runtime).toBe('nodejs');
  });

  it('declares an explicit maxDuration', () => {
    expect(typeof route.maxDuration).toBe('number');
    expect(route.maxDuration).toBeGreaterThan(0);
  });
});

describe('a full package assembly completes well inside the declared budget (DR-10)', () => {
  it('assembles every generated document type, all used tabs, in one ZIP', async () => {
    const allDocTypes = Object.keys(DOC_TYPE_TAB_MAP) as DocumentType[];
    const includedTabs = TAB_ORDER.filter((tabLetter) =>
      allDocTypes.some((dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter)
    );
    const paragraph =
      'I. BACKGROUND\nThis is a representative paragraph of generated content, long enough to exercise the same text-wrapping and run-splitting logic a real document would hit.\nA. Detail\nA second paragraph under a lettered subheading, repeated to pad the body out to a realistic length for timing purposes.\n'.repeat(
        8
      );

    const start = Date.now();

    const zip = new JSZip();

    const coverDoc = buildCoverPage({
      applicantName: 'Test Applicant',
      businessName: 'Test Business LLC',
      businessState: 'Texas',
      preparedDate: 'September 11, 2026',
      nationality: 'Canada',
      passportNumber: '[passport number from Tab A]',
    });
    zip.file('00_Cover_Page.docx', Buffer.from(await Packer.toBuffer(coverDoc)));

    const tocDoc = buildTableOfContents({
      applicantName: 'Test Applicant',
      preparedDate: 'September 11, 2026',
      includedTabs,
      includedDocTypes: allDocTypes,
      totalDocCount: allDocTypes.length,
    });
    zip.file('01_Table_of_Contents.docx', Buffer.from(await Packer.toBuffer(tocDoc)));

    for (const tabLetter of includedTabs) {
      const tabEntry = TAB_SECTION_TITLES[tabLetter];
      const dividerDoc = buildTabDivider({
        tabLetter,
        sectionTitle: tabEntry.title,
        description: tabEntry.description,
        applicantName: 'Test Applicant',
      });
      zip.file(
        `Tab_${tabLetter}_Divider.docx`,
        Buffer.from(await Packer.toBuffer(dividerDoc))
      );

      for (const docType of allDocTypes.filter((dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter)) {
        const docx = buildDocument({
          contentText: paragraph,
          documentType: docType,
          lastName: 'Applicant',
          caseCode: 'TEST-0001',
          personCode: docType.endsWith('_p2') ? 'P2' : 'P1',
        });
        zip.file(
          `Tab_${tabLetter}_${docType}.docx`,
          Buffer.from(await Packer.toBuffer(docx))
        );
      }
    }

    const checklistDoc = buildChecklist({
      documents: allDocTypes.map((document_type) => ({
        document_type,
        content_text: paragraph,
      })),
      applicantName: 'Test Applicant',
      includedTabs,
    });
    zip.file('COMPLETE_BEFORE_SUBMITTING.docx', Buffer.from(await Packer.toBuffer(checklistDoc)));

    await zip.generateAsync({ type: 'arraybuffer' });

    const elapsedMs = Date.now() - start;

    // Real headroom against route.maxDuration, not just "it finished" —
    // this is CPU-bound work with no network/LLM call in the critical path.
    expect(elapsedMs).toBeLessThan((route.maxDuration as number) * 1000 * 0.5);
  });
});
