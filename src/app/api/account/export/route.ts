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

  /**
   * Applications are fetched first because answers are scoped through them.
   *
   * The answers table has no user_id — it is keyed on application_id — and
   * this route used to filter it on user_id anyway. That query errored, and
   * because supabase-js returns { data: null, error } rather than throwing,
   * the export shipped with an empty answers array and no sign anything had
   * gone wrong. Several other sections here failed the same way.
   */
  const { data: applications, error: applicationsError } = await admin
    .from('applications')
    .select('id, created_at, updated_at, business_name, business_category, source, preparation_status')
    .eq('user_id', uid);

  if (applicationsError) {
    console.error('[export] failed to load applications:', applicationsError);
    return NextResponse.json(
      { error: 'Could not assemble your data export. Please contact support.' },
      { status: 500 },
    );
  }

  const applicationIds = (applications ?? []).map((a) => a.id as string);

  // Fetch all user data — parallel where possible
  const [
    { data: profile },
    { data: quizSessions },
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
    admin.from('profiles').select('*').eq('id', uid).maybeSingle(),
    /**
     * result_json is included whole. It holds the treaty country and the rest
     * of the quiz outcome, and this route previously asked for treaty_country
     * and pricing_tier as columns — neither of which is stored. Returning the
     * stored record itself is both accurate and more complete than the two
     * fields it was reaching for.
     */
    admin.from('quiz_sessions')
      .select('id, created_at, completed_at, score, score_breakdown, outcome, hard_stop_codes, risk_flag_codes, attorney_flag_codes, application_type, archetype, business_type, consulate_post, investment_amount, investment_currency, readiness_stage, result_json, post_quiz_profile')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    applicationIds.length
      ? admin.from('answers')
          .select('application_id, question_key, answer_value, source, updated_at')
          .in('application_id', applicationIds)
          .order('application_id')
      : Promise.resolve({ data: [], error: null }),
    admin.from('simulator_sessions')
      .select('id, created_at, session_number, readiness_indicator, questions_asked, answers_given, coaching_notes')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    /**
     * There is no single overall or gap score on case_profiles — the six
     * scores below are what is actually held. The export names all of them
     * rather than picking one to stand in for a column that never existed.
     */
    admin.from('case_profiles')
      .select('archetype, data_state, completeness_score, eligibility_score, business_plan_score, franchise_match_score, management_role_score, source_of_funds_score, franchise_triggered, created_at, updated_at')
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
      .select('question_number, question_text, answer_text, gap_category, created_at')
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
