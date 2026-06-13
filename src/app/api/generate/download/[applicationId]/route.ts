/**
 * GET /api/generate/download/[applicationId]
 *
 * Generates and streams a ZIP file containing 15 .docx files:
 *  - 00_Cover_Page.docx
 *  - 01_Table_of_Contents.docx
 *  - For each tab: Tab_[X]_Divider.docx + Tab_[X]_[DocumentName].docx (6 pairs)
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
  TAB_SECTION_TITLES,
  TAB_ORDER,
} from '@/lib/docx-package-constants';
import type { DocumentType } from '@/types/generation';

const VALID_DOC_TYPES: DocumentType[] = [
  'cover_letter',
  'source_of_funds',
  'investment_proof',
  'business_plan',
  'qualifications',
  'ds160_reference',
];

/** Human-readable display names for renamed document files */
const DOC_DISPLAY_NAMES: Record<DocumentType, string> = {
  cover_letter: 'Cover_Letter',
  source_of_funds: 'Source_of_Funds',
  investment_proof: 'Investment_Proof',
  business_plan: 'Business_Plan',
  qualifications: 'Qualifications',
  ds160_reference: 'DS160_Reference',
};

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

    // 3. Gate check — must be acknowledged AND released
    const { data: pipelineLog, error: logError } = await supabase
      .from('generation_pipeline_log')
      .select('applicant_acknowledged, final_status')
      .eq('application_id', applicationId)
      .eq('applicant_acknowledged', true)
      .eq('final_status', 'RELEASED')
      .limit(1)
      .single();

    if (logError || !pipelineLog) {
      return NextResponse.json(
        {
          error:
            'Documents not yet released. Please complete the acknowledgment step first.',
        },
        { status: 403 }
      );
    }

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
    const { data: profile } = await supabase
      .from('applications')
      .select('personal_info, business_name')
      .eq('id', applicationId)
      .single();

    const personalInfo = (profile?.personal_info || {}) as Record<
      string,
      unknown
    >;
    const firstName =
      (personalInfo.firstName as string) ||
      (personalInfo.first_name as string) ||
      '';
    const lastName =
      (personalInfo.lastName as string) ||
      (personalInfo.last_name as string) ||
      'Applicant';
    const applicantName = firstName
      ? `${firstName} ${lastName}`
      : lastName;
    const businessName =
      (profile?.business_name as string) || '[Business name]';
    const nationality =
      (personalInfo.nationality as string) || '[Nationality]';
    const passportNumber =
      (personalInfo.passportNumber as string) ||
      (personalInfo.passport_number as string) ||
      '[passport number from Tab A]';

    // Business state: try target_state column, fallback to bracket placeholder
    let businessState = '[State]';
    try {
      const { data: appDetail } = await supabase
        .from('applications')
        .select('target_state')
        .eq('id', applicationId)
        .single();
      if (appDetail?.target_state) {
        businessState = appDetail.target_state;
      }
    } catch {
      // target_state column may not exist — use fallback
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

    // 7b. Table of contents
    const tocDoc = buildTableOfContents({
      applicantName,
      preparedDate,
      includedTabs,
    });
    const tocBuffer = await Packer.toBuffer(tocDoc);
    zip.file('01_Table_of_Contents.docx', Buffer.from(tocBuffer));

    // 7c. For each tab in TAB_ORDER: divider + renamed document
    for (const tabLetter of TAB_ORDER) {
      const tabEntry = TAB_SECTION_TITLES[tabLetter];
      if (!tabEntry) continue;

      // Find the document for this tab
      const docForTab = includedDocTypes.find(
        (dt) => DOC_TYPE_TAB_MAP[dt] === tabLetter
      );
      if (!docForTab) continue;

      // Build divider
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

      // Build the actual document (reuses existing buildDocument)
      const docContent = documents.find(
        (d) => d.document_type === docForTab
      );
      if (docContent?.content_text) {
        const docx = buildDocument({
          contentText: docContent.content_text,
          documentType: docForTab,
          lastName,
        });
        const docBuffer = await Packer.toBuffer(docx);
        const displayName = DOC_DISPLAY_NAMES[docForTab];
        zip.file(
          `Tab_${tabLetter}_${displayName}.docx`,
          Buffer.from(docBuffer)
        );
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

    // 8. Log the download event
    const now = new Date().toISOString();
    await supabase
      .from('generation_pipeline_log')
      .update({ downloaded_at: now })
      .eq('application_id', applicationId)
      .eq('applicant_acknowledged', true);

    // 9. Generate ZIP as arraybuffer and return
    const zipBlob = await zip.generateAsync({ type: 'arraybuffer' });

    return new NextResponse(zipBlob as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition':
          'attachment; filename="E2_Application_Package.zip"',
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
