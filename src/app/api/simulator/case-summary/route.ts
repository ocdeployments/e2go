import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { QUESTION_LABELS, SECTION_MAP, SECTION_LABELS } from '@/data/question-labels';
import { getBusinessCategoryLabel } from '@/lib/business-categories';
import { uploadedDocTypeLabel, summarizeExtractedJson } from '@/lib/uploaded-doc-labels';

const SECTION_ORDER = [
  'section_1_story',
  'section_2_business',
  'section_3_investment',
  'section_4_qualifications',
  'section_5_family',
  'section_6_ties',
];

function sectionForQuestion(questionKey: string): string | null {
  return (
    SECTION_MAP[questionKey.substring(0, 2)] ||
    SECTION_MAP[questionKey.substring(0, 3)] ||
    null
  );
}

function labelForQuestion(questionKey: string): string {
  if (questionKey === 'Q0-10') return 'Business category';
  return QUESTION_LABELS[questionKey] || questionKey;
}

function displayValue(questionKey: string, value: string): string {
  if (questionKey === 'Q0-10') return getBusinessCategoryLabel(value);
  return value;
}

// GET /api/simulator/case-summary?applicationId=xxx — what the app knows
// about the user's case, grouped for the "your case file" review screen.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Missing applicationId parameter' },
        { status: 400 }
      );
    }

    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, principal_name, business_name, application_type, tier, source')
      .eq('id', applicationId)
      .eq('user_id', user.id)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const { data: answers, error: ansError } = await supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', applicationId);

    if (ansError) {
      // Non-fatal — continue with empty answers.
      console.warn('Answer query error (non-fatal):', ansError.message);
    }

    // Two upload pipelines feed this screen: the current uploaded_documents
    // taxonomy and the legacy application_documents pipeline (still live —
    // gap-analysis remediation and quick-start onboarding write to it). Both
    // must be read or documents uploaded through the legacy path silently
    // vanish from the case file summary.
    const [{ data: documents, error: docError }, { data: legacyDocuments, error: legacyDocError }] = await Promise.all([
      supabase
        .from('uploaded_documents')
        .select('id, file_name, doc_type, extracted_json, fields_total, extraction_status')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true }),
      supabase
        .from('application_documents')
        .select('id, original_filename, detected_document_type, fields_extracted, document_summary')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: true }),
    ]);

    if (docError) {
      // Non-fatal — table may not exist yet if migration is pending. Continue with empty list.
      console.warn('Document query error (non-fatal):', docError.message);
    }
    if (legacyDocError) {
      console.warn('Legacy document query error (non-fatal):', legacyDocError.message);
    }

    // Group filled answers by section
    const sectionFields = new Map<string, Array<{ key: string; label: string; value: string }>>();
    for (const ans of answers || []) {
      if (!ans.answer_value) continue;
      const section = sectionForQuestion(ans.question_key);
      if (!section) continue;

      if (!sectionFields.has(section)) sectionFields.set(section, []);
      sectionFields.get(section)!.push({
        key: ans.question_key,
        label: labelForQuestion(ans.question_key),
        value: displayValue(ans.question_key, ans.answer_value),
      });
    }

    const sections = SECTION_ORDER
      .map(key => ({
        key,
        label: SECTION_LABELS[key] || key,
        fields: sectionFields.get(key) || [],
      }))
      .filter(section => section.fields.length > 0);

    const documentSummaries = [
      ...(documents || []).map(doc => ({
        id: doc.id,
        filename: doc.file_name,
        detectedType: doc.doc_type,
        detectedTypeLabel: uploadedDocTypeLabel(doc.doc_type),
        fieldsExtracted: doc.fields_total || 0,
        summary: summarizeExtractedJson(doc.extracted_json as Record<string, unknown> | null),
        status: doc.extraction_status,
      })),
      ...(legacyDocuments || []).map(doc => ({
        id: doc.id,
        filename: doc.original_filename,
        detectedType: doc.detected_document_type,
        detectedTypeLabel: uploadedDocTypeLabel(doc.detected_document_type),
        fieldsExtracted: doc.fields_extracted || 0,
        summary: doc.document_summary || '',
        status: 'complete',
      })),
    ];

    const totalFields = sections.reduce((sum, s) => sum + s.fields.length, 0);

    const answersMap = new Map((answers || []).map(a => [a.question_key, a.answer_value]));
    const operatingName = answersMap.get('QF-09') || answersMap.get('M3-F-09') || null;
    const investmentAmount = answersMap.get('QF-02') || answersMap.get('M3-F-02') || null;
    const rawBusinessCategory = answersMap.get('Q0-10') || null;

    return NextResponse.json({
      application: {
        principalName: application.principal_name,
        businessName: application.business_name,
        operatingName,
        applicationType: application.application_type,
        tier: application.tier,
        targetState: null,
        businessCategory: rawBusinessCategory ? getBusinessCategoryLabel(rawBusinessCategory) : null,
        investmentAmount,
      },
      sections,
      documents: documentSummaries,
      totalFields,
    });
  } catch (error) {
    console.error('Case summary error:', error);
    return NextResponse.json({ error: 'Case summary failed' }, { status: 500 });
  }
}
