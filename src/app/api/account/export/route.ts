/**
 * GET /api/account/export
 *
 * PIPEDA / GDPR data portability — returns all personal data for the
 * authenticated user as a structured JSON download.
 *
 * Excludes: raw file binaries, internal pipeline logs, generated_documents
 * content (those are available for download in-app).
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const uid = user.id;

  // Fetch all user data — parallel where possible
  const [
    { data: profile },
    { data: quizSessions },
    { data: applications },
    { data: answers },
    { data: simulatorSessions },
    { data: caseProfiles },
    { data: payments },
    { data: consentLog },
    { data: termsAcceptance },
    { data: followupResponses },
    { data: legacyDocumentRefs },
    { data: uploadedDocumentRefs },
  ] = await Promise.all([
    admin.from('profiles').select('*').eq('user_id', uid).maybeSingle(),
    admin.from('quiz_sessions')
      .select('id, created_at, score, hard_stops, risk_flags, application_type, treaty_country, pricing_tier, post_quiz_profile')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    admin.from('applications')
      .select('id, created_at, updated_at, business_name, business_category, source, preparation_status')
      .eq('user_id', uid),
    admin.from('answers')
      .select('application_id, question_key, answer_value, source, updated_at')
      .eq('user_id', uid)
      .order('application_id'),
    admin.from('simulator_sessions')
      .select('id, created_at, session_number, readiness_indicator, questions_asked, answers_given, coaching_notes')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    admin.from('case_profiles')
      .select('overall_score, archetype, data_state, gap_score, updated_at')
      .eq('user_id', uid)
      .maybeSingle(),
    admin.from('payments')
      .select('created_at, amount_cents, currency, tier_id, status')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    admin.from('consent_log')
      .select('consent_type, consent_given, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    admin.from('terms_acceptance')
      .select('terms_version, accepted_at')
      .eq('user_id', uid),
    admin.from('followup_responses')
      .select('question_text, response_text, created_at')
      .eq('user_id', uid)
      .order('created_at'),
    admin.from('application_documents')
      .select('original_filename, detected_document_type, created_at, extraction_status')
      .eq('user_id', uid),
    // uploaded_documents is a second, still-live document pipeline (fed by
    // /case-profile) — the export must include it too, or a data subject
    // access request silently omits documents filed through that path.
    admin.from('uploaded_documents')
      .select('file_name, doc_type, created_at, extraction_status')
      .eq('user_id', uid),
  ]);

  const uploadedDocuments = [
    ...(legacyDocumentRefs ?? []).map((d) => ({
      filename: d.original_filename,
      docType: d.detected_document_type,
      createdAt: d.created_at,
      extractionStatus: d.extraction_status,
    })),
    ...(uploadedDocumentRefs ?? []).map((d) => ({
      filename: d.file_name,
      docType: d.doc_type,
      createdAt: d.created_at,
      extractionStatus: d.extraction_status,
    })),
  ];

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    requestedBy: user.email,
    dataSubjectId: uid,
    profile: profile ?? null,
    quizSessions: quizSessions ?? [],
    applications: applications ?? [],
    answers: answers ?? [],
    simulatorSessions: simulatorSessions ?? [],
    caseProfile: caseProfiles ?? null,
    payments: payments ?? [],
    consentLog: consentLog ?? [],
    termsAcceptance: termsAcceptance ?? [],
    followupResponses: followupResponses ?? [],
    uploadedDocuments,
    _notice:
      'This export contains all personal data held by e2go.app for the above user. ' +
      'Raw document files and generated DOCX content are available for download in-app ' +
      'and are not included here. To request deletion, use Settings → Delete Account.',
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="e2go-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
