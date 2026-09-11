/**
 * GET /api/generate/download/[applicationId]
 *
 * Generates and streams a ZIP file containing .docx files:
 *  - 00_Cover_Page.docx
 *  - 01_Table_of_Contents.docx
 *  - For each tab: Tab_[X]_Divider.docx + Tab_[X]_[DocumentName].docx (8 pairs)
 *  - COMPLETE_BEFORE_SUBMITTING.docx (last)
 *
 * Gate: generation_pipeline_log.applicant_acknowledged = true
 *       AND final_status = 'RELEASED'
 *
 * Logs downloaded_at timestamp after successful ZIP creation.
 *
 * Session 4 — Package Assembly
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildChecklist } from '@/lib/checklist-builder';
import { buildCoverPage } from '@/lib/docx-cover-builder';
import { buildTableOfContents } from '@/lib/docx-toc-builder';
import { buildTabDivider } from '@/lib/docx-divider-builder';
import {
  DOC_TYPE_TAB_MAP,
  DOC_DISPLAY_NAMES,
  TAB_SECTION_TITLES,
  TAB_ORDER,
} from '@/lib/docx-package-constants';
import { buildPackageManifest } from '@/lib/cic-package-manifest';
import { buildExhibitRegistry } from '@/lib/exhibit-registry';
import type { DocumentType } from '@/types/generation';
import { captureApiError } from '@/lib/capture-error';
import { selectLatestDocumentRows, type DedupableDocumentRow } from '@/lib/document-dedupe';
import {
  buildDocumentSafely,
  buildFailureNoteText,
  alertDocumentBuildFailures,
  type DocumentBuildFailure,
} from '@/lib/document-build-safety';

// DR-10 (Gap G-08): this route assembles a cover page, TOC, a divider per
// tab, one .docx per generated document, and a closing checklist — each
// through Packer.toBuffer() — then zips the lot in memory. It previously
// carried neither, so it inherited Vercel's default function timeout. Unlike
// fdd/report/route.ts (an LLM call, budgeted at 150s), this work is entirely
// CPU-bound: src/app/api/generate/__tests__/download-budget.test.ts measures
// a full package assembly (every generated-document type, all tabs) at well
// under a second locally, so 60s leaves wide headroom without approaching
// run/[jobId]'s 300s (that route pays for the LLM calls this one doesn't).
// Still owed: confirming the *actual* ceiling for the current Vercel plan
// and whether Fluid Compute is on (sprint doc DR-10) — flagged for Romy.
export const runtime = 'nodejs';
export const maxDuration = 60;

// DOC_DISPLAY_NAMES has exactly one entry per DocumentType — deriving
// VALID_DOC_TYPES from it keeps this list from silently drifting out of
// sync with the type (a hand-maintained subset here previously excluded
// investment_proof/org_chart/etc. and all six _p2 partnership doc types
// from the download package).
const VALID_DOC_TYPES: DocumentType[] = Object.keys(DOC_DISPLAY_NAMES) as DocumentType[];

/** Format today's date as "Month DD, YYYY" */
function formatPreparedDate(): string {
  return new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params;

    if (!applicationId) {
      return NextResponse.json(
        { error: 'applicationId is required' },
        { status: 400 }
      );
    }

    // 1. Auth check
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify application belongs to user
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('id, user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !app) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    if (app.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 3. CIC-P.4 completeness gate — all generated docs certified, zero outstanding
    const manifest = await buildPackageManifest(applicationId);
    if (!manifest.packageReady) {
      const reasons: string[] = [];
      if (manifest.outstandingCount > 0) {
        reasons.push(`${manifest.outstandingCount} required item(s) still outstanding`);
      }
      const blocked = manifest.tabs.filter(t => t.status === 'blocked');
      if (blocked.length > 0) {
        reasons.push(
          `${blocked.length} document(s) held for E2go.app review: ` +
          blocked.map(t => `${t.label} (${t.blockedReason ?? 'quality gate'})`).join('; ')
        );
      }
      const uncertified = manifest.tabs.filter(
        t => t.source === 'generated' && t.status !== 'certified' && t.status !== 'blocked'
      );
      if (uncertified.length > 0) {
        reasons.push(`${uncertified.length} generated document(s) not yet certified by client`);
      }
      return NextResponse.json(
        {
          error: 'Package not ready for download.',
          reasons,
          certifiedCount: manifest.certifiedCount,
          outstandingCount: manifest.outstandingCount,
          blockedCount: manifest.blockedCount,
          totalTabs: manifest.totalTabs,
        },
        { status: 403 }
      );
    }

    // Log download intent for audit trail
    await supabase
      .from('generation_pipeline_log')
      .update({ downloaded_at: new Date().toISOString() })
      .eq('application_id', applicationId);

    // 4. Read all documents. A retried application can have more than one
    // row per document_type (see document-dedupe.ts) — dedupe here so the
    // ZIP is built from the run that actually completed, not whichever
    // duplicate row the database happened to return first.
    const { data: rawDocuments, error: docsError } = await supabase
      .from('generated_documents')
      .select('document_type, content_text, status, created_at')
      .eq('application_id', applicationId);

    if (docsError || !rawDocuments || rawDocuments.length === 0) {
      return NextResponse.json(
        { error: 'No generated documents found' },
        { status: 404 }
      );
    }

    type DocRow = DedupableDocumentRow & { content_text: string | null };
    const documentsByType = selectLatestDocumentRows(rawDocuments as DocRow[]);
    const documents = Array.from(documentsByType.values());

    // 5. Fetch applicant data for cover page and dividers
    //    Sources confirmed via live schema (Session 8):
    //    - applicantName: applications.principal_name
    //    - businessName:  applications.business_name
    //    - nationality:   quiz_sessions.result_json.country
    //    - passportNumber: not yet collected → bracket placeholder is correct
    //    - businessState: not yet collected → bracket placeholder is correct
    const { data: appProfile } = await supabase
      .from('applications')
      .select('principal_name, business_name, user_id, case_code')
      .eq('id', applicationId)
      .single();

    const caseCode = (appProfile?.case_code as string | undefined) ?? undefined;

    // Co-investor's own last_name/person_code — used so _p2 documents show
    // the real second person, not the principal's name (see docsForTab loop).
    // Same "first co_investor row wins" convention as ensureCoInvestorId in
    // partner2/intake/route.ts.
    const { data: coInvestor } = appProfile?.user_id
      ? await supabase
          .from('family_members')
          .select('id, last_name, person_code')
          .eq('user_id', appProfile.user_id)
          .eq('member_type', 'co_investor')
          .order('sort_order', { ascending: true })
          .limit(1)
          .maybeSingle()
      : { data: null };

    const applicantName =
      (appProfile?.principal_name as string) || '[Applicant name]';
    // Derive lastName for buildDocument (used in document footers)
    const nameParts = applicantName.split(' ');
    const lastName =
      nameParts.length > 1 ? nameParts[nameParts.length - 1] : 'Applicant';
    const businessName =
      (appProfile?.business_name as string) || '[Business name]';
    const passportNumber = '[passport number from Tab A]';
    const businessState = '[Business state]';

    // Nationality: query quiz_sessions.result_json.country
    let nationality = '[Nationality]';
    if (appProfile?.user_id) {
      const { data: quizSession } = await supabase
        .from('quiz_sessions')
        .select('result_json')
        .eq('user_id', appProfile.user_id)
        .limit(1)
        .single();
      const resultJson = (quizSession?.result_json || {}) as Record<
        string,
        unknown
      >;
      if (resultJson.country) {
        nationality = resultJson.country as string;
      }
    }

    const preparedDate = formatPreparedDate();

    // 6. Determine which tabs are included (only those with generated documents)
    const includedDocTypes = documents
      .filter(
        (doc) =>
          VALID_DOC_TYPES.includes(doc.document_type as DocumentType) &&
          doc.content_text
      )
      .map((doc) => doc.document_type as DocumentType);

    const includedTabs = TAB_ORDER.filter((tabLetter) =>
      includedDocTypes.some(
        (dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter
      )
    );

    // 7. Build ZIP
    const zip = new JSZip();

    // 7a. Cover page
    const coverDoc = buildCoverPage({
      applicantName,
      businessName,
      businessState,
      preparedDate,
      nationality,
      passportNumber,
    });
    const coverBuffer = await Packer.toBuffer(coverDoc);
    zip.file('00_Cover_Page.docx', Buffer.from(coverBuffer));

    // 7b. Table of contents / Master Exhibit Index (WS3.2 — also lists the
    // client's uploaded exhibits from the WS3.1 registry, not just generated docs)
    const exhibitRegistry = await buildExhibitRegistry(applicationId);
    const tocDoc = buildTableOfContents({
      applicantName,
      preparedDate,
      includedTabs,
      includedDocTypes,
      totalDocCount: includedDocTypes.length,
      exhibitsByTab: exhibitRegistry.byTab,
    });
    const tocBuffer = await Packer.toBuffer(tocDoc);
    zip.file('01_Table_of_Contents.docx', Buffer.from(tocBuffer));

    // 7c. For each tab in TAB_ORDER: divider + all documents assigned to that tab
    const buildFailures: DocumentBuildFailure[] = [];
    for (const tabLetter of TAB_ORDER) {
      const tabEntry = TAB_SECTION_TITLES[tabLetter];
      if (!tabEntry) continue;

      // Find ALL documents assigned to this tab
      const docsForTab = includedDocTypes.filter(
        (dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter
      );
      if (docsForTab.length === 0) continue;

      // Build one divider per tab
      const dividerDoc = buildTabDivider({
        tabLetter,
        sectionTitle: tabEntry.title,
        description: tabEntry.description,
        applicantName,
      });
      const dividerBuffer = await Packer.toBuffer(dividerDoc);
      zip.file(
        `Tab_${tabLetter}_Divider.docx`,
        Buffer.from(dividerBuffer)
      );

      // Build each document in this tab
      for (const docType of docsForTab) {
        const docContent = documentsByType.get(docType);
        if (docContent?.content_text) {
          const isP2Doc = docType.endsWith('_p2');
          const docLastName = isP2Doc && coInvestor?.last_name ? coInvestor.last_name : lastName;
          const personCode = isP2Doc ? (coInvestor?.person_code ?? 'P2') : 'P1';

          const result = await buildDocumentSafely({
            contentText: docContent.content_text,
            documentType: docType,
            lastName: docLastName,
            caseCode,
            personCode,
            applicationId,
          });

          if (!result.ok) {
            // Isolated: one bad document is skipped, not fatal to the rest
            // of the package — see buildDocumentSafely's comment above.
            buildFailures.push(result.failure);
            continue;
          }

          const displayName = DOC_DISPLAY_NAMES[docType];
          const codeSegment = caseCode ? `${caseCode}_` : '';
          const personSegment = personCode !== 'P1' ? `${personCode}_` : '';
          zip.file(
            `Tab_${tabLetter}_${codeSegment}${personSegment}${displayName}.docx`,
            Buffer.from(result.buffer)
          );
        }
      }
    }

    // 7c-ii. Every attempted document failed to build — there is nothing of
    // substance to deliver. Page ops immediately and tell the client exactly
    // which documents and why, rather than handing back a package that's
    // just a cover page and an empty checklist.
    if (includedDocTypes.length > 0 && buildFailures.length === includedDocTypes.length) {
      await alertDocumentBuildFailures(applicationId, buildFailures);
      return NextResponse.json(
        {
          error: 'None of your documents could be prepared for download right now.',
          failedDocuments: buildFailures.map((f) => ({ type: f.documentType, label: f.label })),
          applicationId,
          supportMessage:
            "This is on our side. Our team has been notified automatically. If this persists, contact support and reference this application ID.",
        },
        { status: 500 }
      );
    }

    if (buildFailures.length > 0) {
      zip.file('!! SOME DOCUMENTS COULD NOT BE INCLUDED.txt', buildFailureNoteText(applicationId, buildFailures));
      // Fire-and-forget from the response's perspective, but awaited here so
      // a cold serverless instance doesn't get torn down before the Resend
      // call leaves the function (see generation-emails.ts's note on the
      // same failure mode with an un-awaited send).
      await alertDocumentBuildFailures(applicationId, buildFailures);
    }

    // 7d. Checklist (last file)
    const checklistDoc = buildChecklist({
      documents: documents.map((d) => ({
        document_type: d.document_type as DocumentType,
        content_text: d.content_text,
      })),
      applicantName,
      includedTabs,
      passportNumber,
      businessState,
    });
    const checklistBuffer = await Packer.toBuffer(checklistDoc);
    zip.file(
      'COMPLETE_BEFORE_SUBMITTING.docx',
      Buffer.from(checklistBuffer)
    );

    // 8. Generate ZIP as arraybuffer and return
    const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });

    // DR-4 follow-up: the frontend can't see inside the ZIP, so a partial
    // package needs to announce itself via headers — the client still gets
    // every document that built successfully, plus an honest "N missing,
    // here's why, here's what to do" message instead of silence.
    const partialHeaders: Record<string, string> =
      buildFailures.length > 0
        ? {
            'X-Partial-Package': 'true',
            'X-Failed-Document-Count': String(buildFailures.length),
            'X-Failed-Documents': encodeURIComponent(
              JSON.stringify(buildFailures.map((f) => ({ type: f.documentType, label: f.label })))
            ),
          }
        : {};

    return new NextResponse(zipBlob as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          `attachment; filename="E2_Application_Package${caseCode ? `_${caseCode}` : ''}.zip"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...partialHeaders,
      },
    });
  } catch (err) {
    captureApiError(err, { route: 'generate/download' });
    return NextResponse.json(
      { error: 'Failed to generate download package' },
      { status: 500 }
    );
  }
}
