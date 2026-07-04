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
import { buildDocument } from '@/lib/docx-builder';
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
      const uncertified = manifest.tabs.filter(
        t => t.source === 'generated' && t.status !== 'certified'
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

    // 4. Read all 6 documents
    const { data: documents, error: docsError } = await supabase
      .from('generated_documents')
      .select('document_type, content_text')
      .eq('application_id', applicationId);

    if (docsError || !documents || documents.length === 0) {
      return NextResponse.json(
        { error: 'No generated documents found' },
        { status: 404 }
      );
    }

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
        const docContent = documents.find(
          (d) => d.document_type === docType
        );
        if (docContent?.content_text) {
          const isP2Doc = docType.endsWith('_p2');
          const docLastName = isP2Doc && coInvestor?.last_name ? coInvestor.last_name : lastName;
          const personCode = isP2Doc ? (coInvestor?.person_code ?? 'P2') : 'P1';

          const docx = buildDocument({
            contentText: docContent.content_text,
            documentType: docType,
            lastName: docLastName,
            caseCode,
            personCode,
          });
          const docBuffer = await Packer.toBuffer(docx);
          const displayName = DOC_DISPLAY_NAMES[docType];
          const codeSegment = caseCode ? `${caseCode}_` : '';
          const personSegment = personCode !== 'P1' ? `${personCode}_` : '';
          zip.file(
            `Tab_${tabLetter}_${codeSegment}${personSegment}${displayName}.docx`,
            Buffer.from(docBuffer)
          );
        }
      }
    }

    // 7d. Checklist (last file)
    const checklistDoc = buildChecklist({
      documents: documents.map((d) => ({
        document_type: d.document_type as DocumentType,
        content_text: d.content_text,
      })),
      applicantName,
      includedTabs,
    });
    const checklistBuffer = await Packer.toBuffer(checklistDoc);
    zip.file(
      'COMPLETE_BEFORE_SUBMITTING.docx',
      Buffer.from(checklistBuffer)
    );

    // 8. Generate ZIP as arraybuffer and return
    const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });

    return new NextResponse(zipBlob as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          `attachment; filename="E2_Application_Package${caseCode ? `_${caseCode}` : ''}.zip"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('[DOWNLOAD] Error:', err);
    return NextResponse.json(
      { error: 'Failed to generate download package' },
      { status: 500 }
    );
  }
}
