-- 0000_initial_schema.sql
-- Consolidates the 17 foundational tables that predate the migrations
-- folder (originally created via docs/schema.sql 2026-05-29 and
-- docs/schema_complete.sql 2026-05-31, before supabase/migrations/ existed
-- -- first tracked migration is 20260603120000). Pulled directly from the
-- live production schema (supabase db dump --linked --schema public,
-- 2026-07-17/18), not re-derived from the stale docs/schema*.sql files,
-- since those are known to have drifted from production (see K-4.5 audit
-- on application_lifecycle). Closes the disaster-recovery gap where a
-- fresh `supabase db reset` replaying only supabase/migrations/* would not
-- recreate these tables.
--
-- Tables: admin_users, ai_usage_log, answers, application_lifecycle,
-- applications, feature_flags, nps_scores, pdf_exports, profiles,
-- quiz_sessions, referral_leads, referral_partners, simulation_answers,
-- simulation_sessions, ticket_replies, tickets, users.
--
-- Named 0000_ so it sorts before every existing migration and runs first
-- on a fresh reset. All statements are idempotent so this is also safe to
-- run once against the already-provisioned production database (via
-- `supabase db push`) where these objects already exist:
--   - CREATE TABLE IF NOT EXISTS (native no-op)
--   - CREATE INDEX IF NOT EXISTS (native no-op)
--   - CREATE POLICY preceded by DROP POLICY IF EXISTS (no dependents ever
--     reference a policy by name, so drop+recreate is safe)
--   - ADD CONSTRAINT wrapped in a DO block that checks pg_constraint first
--     and skips if already present -- deliberately NOT drop+recreate,
--     because dropping a PRIMARY KEY that other already-existing tables'
--     foreign keys depend on would fail (or cascade-drop those FKs if
--     forced), which is unacceptable against a live production database.
--
-- Two FK constraints reference tables outside this set (family_members,
-- payments) that have their own later-dated migrations; those are split
-- into 20260628210000_initial_schema_fks_deferred.sql so ordering holds.
CREATE TABLE IF NOT EXISTS "public"."admin_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "role" "text" DEFAULT 'support'::"text",
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "last_login_at" timestamp with time zone,
    "mfa_enabled" boolean DEFAULT false,
    "mfa_secret" "text",
    CONSTRAINT "admin_users_role_check" CHECK (("role" = ANY (ARRAY['super_admin'::"text", 'admin'::"text", 'support'::"text", 'analyst'::"text"])))
);

ALTER TABLE "public"."admin_users" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "application_id" "uuid",
    "feature" "text" NOT NULL,
    "model" "text" NOT NULL,
    "tokens_input" integer,
    "tokens_output" integer,
    "tokens_total" integer,
    "cost_usd" numeric(10,6),
    "duration_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_usage_log_feature_check" CHECK (("feature" = ANY (ARRAY['document_generation'::"text", 'interview_simulator'::"text", 'answer_evaluation'::"text", 'adaptive_education'::"text", 'business_plan'::"text", 'cover_letter'::"text"])))
);

ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "question_key" "text" NOT NULL,
    "answer_value" "text",
    "answered_at" timestamp with time zone DEFAULT "now"(),
    "skipped_by_user" boolean DEFAULT false,
    "privacy_category" "text" DEFAULT 'green'::"text",
    "confidence" "text",
    "source_document_type" "text",
    "source" "text" DEFAULT 'user_entry'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "family_member_id" "uuid",
    CONSTRAINT "answers_confidence_check" CHECK (("confidence" = ANY (ARRAY['high'::"text", 'medium'::"text", 'low'::"text"]))),
    CONSTRAINT "answers_source_check" CHECK (("source" = ANY (ARRAY['quiz'::"text", 'user_entry'::"text", 'user_edited'::"text", 'document_extracted'::"text", 'user_resolved_conflict'::"text"])))
);

ALTER TABLE "public"."answers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."application_lifecycle" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "session_token" "uuid",
    "first_visit_at" timestamp with time zone,
    "quiz_started_at" timestamp with time zone,
    "quiz_completed_at" timestamp with time zone,
    "quiz_outcome" "text",
    "account_created_at" timestamp with time zone,
    "payment_completed_at" timestamp with time zone,
    "tier_purchased" "text",
    "module1_started_at" timestamp with time zone,
    "module1_completed_at" timestamp with time zone,
    "module2_started_at" timestamp with time zone,
    "module2_completed_at" timestamp with time zone,
    "module3_started_at" timestamp with time zone,
    "module3_completed_at" timestamp with time zone,
    "module4_started_at" timestamp with time zone,
    "module4_completed_at" timestamp with time zone,
    "module5_started_at" timestamp with time zone,
    "module5_completed_at" timestamp with time zone,
    "module6_started_at" timestamp with time zone,
    "module6_completed_at" timestamp with time zone,
    "generation_triggered_at" timestamp with time zone,
    "generation_completed_at" timestamp with time zone,
    "simulator_first_run_at" timestamp with time zone,
    "simulator_sessions_total" integer DEFAULT 0,
    "simulator_best_score" integer,
    "interview_date" timestamp with time zone,
    "outcome_recorded_at" timestamp with time zone,
    "outcome" "text",
    "approval_date" timestamp with time zone,
    "total_journey_days" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "follow_up_check_in_at" timestamp with time zone,
    "voice_sample_collected" boolean DEFAULT false,
    "followup_completed" boolean DEFAULT false,
    "first_entry" timestamp with time zone,
    "last_visited_section" "text",
    "onboarding_doc_uploaded_at" timestamp with time zone,
    "onboarding_completed_at" timestamp with time zone,
    CONSTRAINT "application_lifecycle_outcome_check" CHECK (("outcome" = ANY (ARRAY['approved'::"text", 'refused'::"text", 'processing'::"text"]))),
    CONSTRAINT "application_lifecycle_quiz_outcome_check" CHECK (("quiz_outcome" = ANY (ARRAY['PROCEED'::"text", 'PROCEED_RISK'::"text", 'ATTORNEY_RECOMMENDED'::"text", 'DO_NOT_PROCEED'::"text"]))),
    CONSTRAINT "application_lifecycle_tier_purchased_check" CHECK (("tier_purchased" = ANY (ARRAY['standard'::"text", 'complete'::"text"])))
);

ALTER TABLE "public"."application_lifecycle" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "principal_name" "text",
    "business_name" "text",
    "application_type" "text",
    "tier" "text" DEFAULT 'standard'::"text",
    "status" "text" DEFAULT 'in_progress'::"text",
    "overall_score" integer,
    "route" "text",
    "family_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "submitted_at" timestamp with time zone,
    "lead_temperature" integer DEFAULT 0,
    "lead_stage" "text" DEFAULT 'unknown'::"text",
    "franchise_matching_triggered" boolean DEFAULT false,
    "attorney_warmth" integer DEFAULT 0,
    "cpa_warmth" "text" DEFAULT 'none'::"text",
    "banking_warmth" "text" DEFAULT 'none'::"text",
    "fx_warmth" "text" DEFAULT 'none'::"text",
    "multiunit_routing" boolean DEFAULT false,
    "growth_ambition" "text" DEFAULT 'unknown'::"text",
    "payment_id" "uuid",
    "payment_status" "text" DEFAULT 'unpaid'::"text",
    "outcome" "text",
    "outcome_date" "date",
    "interview_duration" "text",
    "denial_reason" "text",
    "visa_received_date" "date",
    "spouse_approved" "text",
    "children_approved_count" integer,
    "outcome_recorded_at" timestamp with time zone,
    "received_221g_form" boolean,
    "documents_requested" "text",
    "administrative_notes" "text",
    "simulator_sessions_used" integer DEFAULT 0,
    "simulator_sessions_purchased" integer DEFAULT 2,
    "experience_gap_flag" "text",
    "business_shortlist" "text"[],
    "specific_business_description" "text",
    "processing_path" "text",
    "family_composition" "text",
    "module_1_complete" boolean DEFAULT false,
    "module_2_complete" boolean DEFAULT false,
    "module_3_complete" boolean DEFAULT false,
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "source" "text",
    "partner_gender" "text",
    "last_active_section" "text",
    "last_active_cluster" integer,
    "preparation_status" "text" DEFAULT 'scratch'::"text",
    "working_target_date" "date",
    "confirmed_interview_date" "date",
    "investment_amount" numeric,
    "operational_status" "text",
    "target_state" "text",
    "business_category" "text",
    "journey_wizard_stage" "text",
    "treaty_country" "text",
    "business_plan_length_mode" "text",
    "case_code" "text",
    CONSTRAINT "applications_application_type_check" CHECK (("application_type" = ANY (ARRAY['solo'::"text", 'partnership'::"text"]))),
    CONSTRAINT "applications_business_plan_length_mode_check" CHECK (("business_plan_length_mode" = ANY (ARRAY['recommended'::"text", 'extended'::"text"]))),
    CONSTRAINT "applications_family_type_check" CHECK (("family_type" = ANY (ARRAY['individual'::"text", 'couple'::"text", 'family'::"text"]))),
    CONSTRAINT "applications_outcome_check" CHECK (("outcome" = ANY (ARRAY['approved'::"text", 'refused'::"text", 'administrative_processing'::"text", '221g_document_request'::"text", 'withdrawn'::"text", 'unknown'::"text"]))),
    CONSTRAINT "applications_partner_gender_check" CHECK (("partner_gender" = ANY (ARRAY['man'::"text", 'woman'::"text"]))),
    CONSTRAINT "applications_payment_status_check" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text", 'refunded'::"text"]))),
    CONSTRAINT "applications_preparation_status_check" CHECK (("preparation_status" = ANY (ARRAY['scratch'::"text", 'partial'::"text", 'near_complete'::"text"]))),
    CONSTRAINT "applications_route_check" CHECK (("route" = ANY (ARRAY['solo'::"text", 'partnership'::"text"]))),
    CONSTRAINT "applications_spouse_approved_check" CHECK (("spouse_approved" = ANY (ARRAY['yes'::"text", 'no'::"text", 'not_applicable'::"text", 'unknown'::"text"]))),
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text", 'approved'::"text", 'denied'::"text"]))),
    CONSTRAINT "applications_tier_check" CHECK (("tier" = ANY (ARRAY['standard'::"text", 'complete'::"text"])))
);

ALTER TABLE "public"."applications" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_enabled" boolean DEFAULT false,
    "enabled_for_users" "uuid"[] DEFAULT '{}'::"uuid"[],
    "enabled_for_tiers" "text"[] DEFAULT '{}'::"text"[],
    "rollout_percentage" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    CONSTRAINT "feature_flags_rollout_percentage_check" CHECK ((("rollout_percentage" >= 0) AND ("rollout_percentage" <= 100)))
);

ALTER TABLE "public"."feature_flags" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."nps_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "score" integer NOT NULL,
    "comment" "text",
    "trigger_event" "text",
    CONSTRAINT "nps_scores_score_check" CHECK ((("score" >= 0) AND ("score" <= 10)))
);

ALTER TABLE "public"."nps_scores" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."pdf_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid",
    "export_type" "text",
    "exported_at" timestamp with time zone DEFAULT "now"(),
    "export_count" integer DEFAULT 1,
    CONSTRAINT "pdf_exports_export_type_check" CHECK (("export_type" = ANY (ARRAY['full_package'::"text", 'individual_tabs'::"text", 'cover_letter'::"text", 'business_plan'::"text"])))
);

ALTER TABLE "public"."pdf_exports" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "tier" "text" DEFAULT 'free'::"text",
    "application_type" "text",
    "ip_hash" "text",
    "last_login_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "role" "text" DEFAULT 'user'::"text",
    "flagged_at" timestamp with time zone,
    "flag_reason" "text",
    "middle_name" "text",
    "outcomes_consent" boolean,
    "outcomes_consent_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "profiles_application_type_check" CHECK (("application_type" = ANY (ARRAY['solo'::"text", 'partnership'::"text"]))),
    CONSTRAINT "profiles_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'standard'::"text", 'complete'::"text"])))
);

ALTER TABLE "public"."profiles" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."quiz_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "outcome" "text",
    "hard_stop_codes" "text"[] DEFAULT '{}'::"text"[],
    "attorney_flag_codes" "text"[] DEFAULT '{}'::"text"[],
    "risk_flag_codes" "text"[] DEFAULT '{}'::"text"[],
    "application_type" "text",
    "investment_amount" numeric,
    "investment_currency" "text",
    "acknowledged_risk" boolean DEFAULT false,
    "casl_consent" boolean DEFAULT false,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "readiness_stage" "text",
    "business_type" "text",
    "franchise_interest" boolean DEFAULT false,
    "franchise_consent" boolean DEFAULT false,
    "franchise_consent_timestamp" timestamp with time zone,
    "email_verification_sent" boolean DEFAULT false,
    "email_verified" boolean DEFAULT false,
    "casl_consent_at" timestamp with time zone,
    "score" integer,
    "result_json" "jsonb",
    "post_quiz_profile" "jsonb",
    "franchise_triggered" boolean DEFAULT false,
    "archetype" "text",
    "franchise_referral_requested" boolean DEFAULT false,
    "score_breakdown" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "consulate_post" "text",
    CONSTRAINT "quiz_sessions_application_type_check" CHECK (("application_type" = ANY (ARRAY['solo'::"text", 'partnership'::"text"]))),
    CONSTRAINT "quiz_sessions_investment_currency_check" CHECK (("investment_currency" = ANY (ARRAY['USD'::"text", 'CAD'::"text"]))),
    CONSTRAINT "quiz_sessions_outcome_check" CHECK (("outcome" = ANY (ARRAY['PROCEED'::"text", 'PROCEED_RISK'::"text", 'ATTORNEY_RECOMMENDED'::"text", 'DO_NOT_PROCEED'::"text"])))
);

ALTER TABLE "public"."quiz_sessions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."referral_leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "referred_at" timestamp with time zone DEFAULT "now"(),
    "signed_up_at" timestamp with time zone,
    "converted_at" timestamp with time zone,
    CONSTRAINT "referral_leads_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'signed_up'::"text", 'converted'::"text", 'expired'::"text"])))
);

ALTER TABLE "public"."referral_leads" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."referral_partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "company_name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "partnership_type" "text",
    "commission_rate" numeric(5,2),
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "referral_partners_partnership_type_check" CHECK (("partnership_type" = ANY (ARRAY['referral'::"text", 'affiliate'::"text", 'white_label'::"text"]))),
    CONSTRAINT "referral_partners_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'paused'::"text", 'terminated'::"text"])))
);

ALTER TABLE "public"."referral_partners" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."simulation_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid",
    "question_key" "text" NOT NULL,
    "user_answer" "text",
    "ai_response" "text",
    "is_correct" boolean,
    "feedback" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."simulation_answers" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."simulation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "application_id" "uuid",
    "tab" "text" NOT NULL,
    "mode" "text" DEFAULT 'practice'::"text",
    "status" "text" DEFAULT 'in_progress'::"text",
    "questions_answered" integer DEFAULT 0,
    "correct_count" integer DEFAULT 0,
    "ai_evaluation" "jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "simulation_sessions_mode_check" CHECK (("mode" = ANY (ARRAY['practice'::"text", 'timed'::"text", 'evaluation'::"text"]))),
    CONSTRAINT "simulation_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"])))
);

ALTER TABLE "public"."simulation_sessions" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."ticket_replies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid",
    "user_id" "uuid",
    "is_admin_reply" boolean DEFAULT false,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);

ALTER TABLE "public"."ticket_replies" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "subject" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'open'::"text",
    "priority" "text" DEFAULT 'medium'::"text",
    "category" "text",
    "assigned_to" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    CONSTRAINT "tickets_category_check" CHECK (("category" = ANY (ARRAY['technical'::"text", 'billing'::"text", 'eligibility'::"text", 'document'::"text", 'other'::"text"]))),
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'waiting_on_user'::"text", 'resolved'::"text", 'closed'::"text"])))
);

ALTER TABLE "public"."tickets" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tier" "text" DEFAULT 'free'::"text",
    "application_type" "text",
    "full_name" "text",
    "phone" "text",
    "ip_hash" "text",
    "last_login_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    CONSTRAINT "users_application_type_check" CHECK (("application_type" = ANY (ARRAY['solo'::"text", 'partnership'::"text"]))),
    CONSTRAINT "users_tier_check" CHECK (("tier" = ANY (ARRAY['free'::"text", 'standard'::"text", 'complete'::"text"])))
);

ALTER TABLE "public"."users" OWNER TO "postgres";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_pkey') THEN
    ALTER TABLE ONLY "public"."admin_users" ADD CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_user_id_key') THEN
    ALTER TABLE ONLY "public"."admin_users" ADD CONSTRAINT "admin_users_user_id_key" UNIQUE ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_log_pkey') THEN
    ALTER TABLE ONLY "public"."ai_usage_log" ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_pkey') THEN
    ALTER TABLE ONLY "public"."answers" ADD CONSTRAINT "answers_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_lifecycle_pkey') THEN
    ALTER TABLE ONLY "public"."application_lifecycle" ADD CONSTRAINT "application_lifecycle_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_lifecycle_user_id_key') THEN
    ALTER TABLE ONLY "public"."application_lifecycle" ADD CONSTRAINT "application_lifecycle_user_id_key" UNIQUE ("user_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_pkey') THEN
    ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_flags_name_key') THEN
    ALTER TABLE ONLY "public"."feature_flags" ADD CONSTRAINT "feature_flags_name_key" UNIQUE ("name");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_flags_pkey') THEN
    ALTER TABLE ONLY "public"."feature_flags" ADD CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nps_scores_pkey') THEN
    ALTER TABLE ONLY "public"."nps_scores" ADD CONSTRAINT "nps_scores_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdf_exports_pkey') THEN
    ALTER TABLE ONLY "public"."pdf_exports" ADD CONSTRAINT "pdf_exports_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pkey') THEN
    ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_sessions_pkey') THEN
    ALTER TABLE ONLY "public"."quiz_sessions" ADD CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_leads_pkey') THEN
    ALTER TABLE ONLY "public"."referral_leads" ADD CONSTRAINT "referral_leads_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_partners_pkey') THEN
    ALTER TABLE ONLY "public"."referral_partners" ADD CONSTRAINT "referral_partners_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_answers_pkey') THEN
    ALTER TABLE ONLY "public"."simulation_answers" ADD CONSTRAINT "simulation_answers_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_pkey') THEN
    ALTER TABLE ONLY "public"."simulation_sessions" ADD CONSTRAINT "simulation_sessions_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_replies_pkey') THEN
    ALTER TABLE ONLY "public"."ticket_replies" ADD CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_pkey') THEN
    ALTER TABLE ONLY "public"."tickets" ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_pkey') THEN
    ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "answers_application_question_member_key" ON "public"."answers" USING "btree" ("application_id", "question_key", "family_member_id") NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS "answers_family_member_idx" ON "public"."answers" USING "btree" ("family_member_id") WHERE ("family_member_id" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "answers_source_document_type_idx" ON "public"."answers" USING "btree" ("application_id", "source_document_type") WHERE ("source_document_type" IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "applications_case_code_key" ON "public"."applications" USING "btree" ("case_code") WHERE ("case_code" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_admin_users_is_active" ON "public"."admin_users" USING "btree" ("is_active");

CREATE INDEX IF NOT EXISTS "idx_admin_users_role" ON "public"."admin_users" USING "btree" ("role");

CREATE INDEX IF NOT EXISTS "idx_admin_users_user_id" ON "public"."admin_users" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_application_id" ON "public"."ai_usage_log" USING "btree" ("application_id");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_created_at" ON "public"."ai_usage_log" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_feature" ON "public"."ai_usage_log" USING "btree" ("feature");

CREATE INDEX IF NOT EXISTS "idx_ai_usage_log_user_id" ON "public"."ai_usage_log" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_answers_answered_at" ON "public"."answers" USING "btree" ("answered_at");

CREATE INDEX IF NOT EXISTS "idx_answers_application_id" ON "public"."answers" USING "btree" ("application_id");

CREATE INDEX IF NOT EXISTS "idx_answers_question_key" ON "public"."answers" USING "btree" ("question_key");

CREATE INDEX IF NOT EXISTS "idx_application_lifecycle_outcome" ON "public"."application_lifecycle" USING "btree" ("outcome");

CREATE INDEX IF NOT EXISTS "idx_application_lifecycle_session_token" ON "public"."application_lifecycle" USING "btree" ("session_token");

CREATE INDEX IF NOT EXISTS "idx_application_lifecycle_user_id" ON "public"."application_lifecycle" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_applications_created_at" ON "public"."applications" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_applications_inactivity" ON "public"."applications" USING "btree" ("last_activity_at", "payment_status", "module_3_complete", "outcome");

CREATE INDEX IF NOT EXISTS "idx_applications_outcome" ON "public"."applications" USING "btree" ("outcome") WHERE ("outcome" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_applications_source" ON "public"."applications" USING "btree" ("source") WHERE ("source" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "public"."applications" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_applications_updated_at" ON "public"."applications" USING "btree" ("updated_at");

CREATE INDEX IF NOT EXISTS "idx_applications_user_id" ON "public"."applications" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_feature_flags_enabled" ON "public"."feature_flags" USING "btree" ("is_enabled");

CREATE INDEX IF NOT EXISTS "idx_feature_flags_name" ON "public"."feature_flags" USING "btree" ("name");

CREATE INDEX IF NOT EXISTS "idx_pdf_exports_application_id" ON "public"."pdf_exports" USING "btree" ("application_id");

CREATE INDEX IF NOT EXISTS "idx_pdf_exports_exported_at" ON "public"."pdf_exports" USING "btree" ("exported_at");

CREATE INDEX IF NOT EXISTS "idx_profiles_created_at" ON "public"."profiles" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_profiles_deleted_at" ON "public"."profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);

CREATE INDEX IF NOT EXISTS "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");

CREATE INDEX IF NOT EXISTS "idx_profiles_tier" ON "public"."profiles" USING "btree" ("tier");

CREATE INDEX IF NOT EXISTS "idx_quiz_sessions_completed_at" ON "public"."quiz_sessions" USING "btree" ("completed_at");

CREATE INDEX IF NOT EXISTS "idx_quiz_sessions_email" ON "public"."quiz_sessions" USING "btree" ("email");

CREATE INDEX IF NOT EXISTS "idx_quiz_sessions_outcome" ON "public"."quiz_sessions" USING "btree" ("outcome");

CREATE INDEX IF NOT EXISTS "idx_quiz_sessions_user_id" ON "public"."quiz_sessions" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_referral_leads_email" ON "public"."referral_leads" USING "btree" ("email");

CREATE INDEX IF NOT EXISTS "idx_referral_leads_referrer_id" ON "public"."referral_leads" USING "btree" ("referrer_id");

CREATE INDEX IF NOT EXISTS "idx_referral_leads_status" ON "public"."referral_leads" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_referral_partners_partnership_type" ON "public"."referral_partners" USING "btree" ("partnership_type");

CREATE INDEX IF NOT EXISTS "idx_referral_partners_status" ON "public"."referral_partners" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_referral_partners_user_id" ON "public"."referral_partners" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_sim_answers_question_key" ON "public"."simulation_answers" USING "btree" ("question_key");

CREATE INDEX IF NOT EXISTS "idx_sim_answers_session_id" ON "public"."simulation_answers" USING "btree" ("session_id");

CREATE INDEX IF NOT EXISTS "idx_sim_sessions_application_id" ON "public"."simulation_sessions" USING "btree" ("application_id");

CREATE INDEX IF NOT EXISTS "idx_sim_sessions_started_at" ON "public"."simulation_sessions" USING "btree" ("started_at");

CREATE INDEX IF NOT EXISTS "idx_sim_sessions_status" ON "public"."simulation_sessions" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_sim_sessions_user_id" ON "public"."simulation_sessions" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_ticket_replies_created_at" ON "public"."ticket_replies" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_ticket_replies_ticket_id" ON "public"."ticket_replies" USING "btree" ("ticket_id");

CREATE INDEX IF NOT EXISTS "idx_ticket_replies_user_id" ON "public"."ticket_replies" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "idx_tickets_assigned_to" ON "public"."tickets" USING "btree" ("assigned_to");

CREATE INDEX IF NOT EXISTS "idx_tickets_created_at" ON "public"."tickets" USING "btree" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_tickets_priority" ON "public"."tickets" USING "btree" ("priority");

CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");

CREATE INDEX IF NOT EXISTS "idx_tickets_user_id" ON "public"."tickets" USING "btree" ("user_id");

CREATE INDEX IF NOT EXISTS "nps_scores_created_at_idx" ON "public"."nps_scores" USING "btree" ("created_at" DESC);

CREATE INDEX IF NOT EXISTS "nps_scores_score_idx" ON "public"."nps_scores" USING "btree" ("score");

CREATE INDEX IF NOT EXISTS "nps_scores_user_id_idx" ON "public"."nps_scores" USING "btree" ("user_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_users_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."admin_users" ADD CONSTRAINT "admin_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_log_application_id_fkey') THEN
    ALTER TABLE ONLY "public"."ai_usage_log" ADD CONSTRAINT "ai_usage_log_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_log_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."ai_usage_log" ADD CONSTRAINT "ai_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'answers_application_id_fkey') THEN
    ALTER TABLE ONLY "public"."answers" ADD CONSTRAINT "answers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'application_lifecycle_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."application_lifecycle" ADD CONSTRAINT "application_lifecycle_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."applications" ADD CONSTRAINT "applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'nps_scores_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."nps_scores" ADD CONSTRAINT "nps_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdf_exports_application_id_fkey') THEN
    ALTER TABLE ONLY "public"."pdf_exports" ADD CONSTRAINT "pdf_exports_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey') THEN
    ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_sessions_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."quiz_sessions" ADD CONSTRAINT "quiz_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_leads_referrer_id_fkey') THEN
    ALTER TABLE ONLY "public"."referral_leads" ADD CONSTRAINT "referral_leads_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'referral_partners_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."referral_partners" ADD CONSTRAINT "referral_partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_answers_session_id_fkey') THEN
    ALTER TABLE ONLY "public"."simulation_answers" ADD CONSTRAINT "simulation_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."simulation_sessions"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_application_id_fkey') THEN
    ALTER TABLE ONLY "public"."simulation_sessions" ADD CONSTRAINT "simulation_sessions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_sessions_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."simulation_sessions" ADD CONSTRAINT "simulation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_replies_ticket_id_fkey') THEN
    ALTER TABLE ONLY "public"."ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_replies_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assigned_to_fkey') THEN
    ALTER TABLE ONLY "public"."tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_user_id_fkey') THEN
    ALTER TABLE ONLY "public"."tickets" ADD CONSTRAINT "tickets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey') THEN
    ALTER TABLE ONLY "public"."users" ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage admin_users" ON "public"."admin_users";
CREATE POLICY "Admins can manage admin_users" ON "public"."admin_users" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."user_id" = "auth"."uid"()) AND ("au"."is_active" = true)))));

DROP POLICY IF EXISTS "Admins can manage feature flags" ON "public"."feature_flags";
CREATE POLICY "Admins can manage feature flags" ON "public"."feature_flags" USING ((EXISTS ( SELECT 1
   FROM "public"."admin_users" "au"
  WHERE (("au"."user_id" = "auth"."uid"()) AND ("au"."is_active" = true)))));

DROP POLICY IF EXISTS "Anyone can view feature flags" ON "public"."feature_flags";
CREATE POLICY "Anyone can view feature flags" ON "public"."feature_flags" FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create replies to their tickets" ON "public"."ticket_replies";
CREATE POLICY "Users can create replies to their tickets" ON "public"."ticket_replies" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_replies"."ticket_id") AND ("t"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can create simulation answers" ON "public"."simulation_answers";
CREATE POLICY "Users can create simulation answers" ON "public"."simulation_answers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."simulation_sessions" "ss"
  WHERE (("ss"."id" = "simulation_answers"."session_id") AND ("ss"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can create simulations" ON "public"."simulation_sessions";
CREATE POLICY "Users can create simulations" ON "public"."simulation_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can create tickets" ON "public"."tickets";
CREATE POLICY "Users can create tickets" ON "public"."tickets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can delete their own answers" ON "public"."answers";
CREATE POLICY "Users can delete their own answers" ON "public"."answers" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can delete their own applications" ON "public"."applications";
CREATE POLICY "Users can delete their own applications" ON "public"."applications" FOR DELETE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can insert own answers" ON "public"."answers";
CREATE POLICY "Users can insert own answers" ON "public"."answers" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can insert own applications" ON "public"."applications";
CREATE POLICY "Users can insert own applications" ON "public"."applications" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can insert own lifecycle" ON "public"."application_lifecycle";
CREATE POLICY "Users can insert own lifecycle" ON "public"."application_lifecycle" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."profiles";
CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can insert own quiz sessions" ON "public"."quiz_sessions";
CREATE POLICY "Users can insert own quiz sessions" ON "public"."quiz_sessions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can insert their own answers" ON "public"."answers";
CREATE POLICY "Users can insert their own answers" ON "public"."answers" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can insert their own applications" ON "public"."applications";
CREATE POLICY "Users can insert their own applications" ON "public"."applications" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can insert their own data" ON "public"."users";
CREATE POLICY "Users can insert their own data" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can insert their own pdf exports" ON "public"."pdf_exports";
CREATE POLICY "Users can insert their own pdf exports" ON "public"."pdf_exports" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "pdf_exports"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can read own application lifecycle" ON "public"."application_lifecycle";
CREATE POLICY "Users can read own application lifecycle" ON "public"."application_lifecycle" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can read own quiz sessions" ON "public"."quiz_sessions";
CREATE POLICY "Users can read own quiz sessions" ON "public"."quiz_sessions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (("user_id" IS NULL) AND ("email" = ("auth"."jwt"() ->> 'email'::"text")))));

DROP POLICY IF EXISTS "Users can select own answers" ON "public"."answers";
CREATE POLICY "Users can select own answers" ON "public"."answers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can select own applications" ON "public"."applications";
CREATE POLICY "Users can select own applications" ON "public"."applications" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can select own pdf exports" ON "public"."pdf_exports";
CREATE POLICY "Users can select own pdf exports" ON "public"."pdf_exports" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "pdf_exports"."application_id") AND ("a"."user_id" = "auth"."uid"())))) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can select own tickets" ON "public"."tickets";
CREATE POLICY "Users can select own tickets" ON "public"."tickets" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can select their own answers" ON "public"."answers";
CREATE POLICY "Users can select their own answers" ON "public"."answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can select their own applications" ON "public"."applications";
CREATE POLICY "Users can select their own applications" ON "public"."applications" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can select their own data" ON "public"."users";
CREATE POLICY "Users can select their own data" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can select their own pdf exports" ON "public"."pdf_exports";
CREATE POLICY "Users can select their own pdf exports" ON "public"."pdf_exports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "pdf_exports"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can update own lifecycle" ON "public"."application_lifecycle";
CREATE POLICY "Users can update own lifecycle" ON "public"."application_lifecycle" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can update their own answers" ON "public"."answers";
CREATE POLICY "Users can update their own answers" ON "public"."answers" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."applications" "a"
  WHERE (("a"."id" = "answers"."application_id") AND ("a"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can update their own applications" ON "public"."applications";
CREATE POLICY "Users can update their own applications" ON "public"."applications" FOR UPDATE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can update their own data" ON "public"."users";
CREATE POLICY "Users can update their own data" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can update their own simulations" ON "public"."simulation_sessions";
CREATE POLICY "Users can update their own simulations" ON "public"."simulation_sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can update their own tickets" ON "public"."tickets";
CREATE POLICY "Users can update their own tickets" ON "public"."tickets" FOR UPDATE USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can upsert own application lifecycle" ON "public"."application_lifecycle";
CREATE POLICY "Users can upsert own application lifecycle" ON "public"."application_lifecycle" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can view own AI usage" ON "public"."ai_usage_log";
CREATE POLICY "Users can view own AI usage" ON "public"."ai_usage_log" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view own lifecycle" ON "public"."application_lifecycle";
CREATE POLICY "Users can view own lifecycle" ON "public"."application_lifecycle" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));

DROP POLICY IF EXISTS "Users can view own referral leads" ON "public"."referral_leads";
CREATE POLICY "Users can view own referral leads" ON "public"."referral_leads" FOR SELECT USING ((("auth"."uid"() = "referrer_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view own referral partner" ON "public"."referral_partners";
CREATE POLICY "Users can view own referral partner" ON "public"."referral_partners" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view own simulation answers" ON "public"."simulation_answers";
CREATE POLICY "Users can view own simulation answers" ON "public"."simulation_answers" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."simulation_sessions" "ss"
  WHERE (("ss"."id" = "simulation_answers"."session_id") AND ("ss"."user_id" = "auth"."uid"())))) OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view own simulations" ON "public"."simulation_sessions";
CREATE POLICY "Users can view own simulations" ON "public"."simulation_sessions" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("public"."is_admin"() = true)));

DROP POLICY IF EXISTS "Users can view replies to their tickets" ON "public"."ticket_replies";
CREATE POLICY "Users can view replies to their tickets" ON "public"."ticket_replies" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_replies"."ticket_id") AND ("t"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can view their own AI usage" ON "public"."ai_usage_log";
CREATE POLICY "Users can view their own AI usage" ON "public"."ai_usage_log" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can view their own simulation answers" ON "public"."simulation_answers";
CREATE POLICY "Users can view their own simulation answers" ON "public"."simulation_answers" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."simulation_sessions" "ss"
  WHERE (("ss"."id" = "simulation_answers"."session_id") AND ("ss"."user_id" = "auth"."uid"())))));

DROP POLICY IF EXISTS "Users can view their own simulations" ON "public"."simulation_sessions";
CREATE POLICY "Users can view their own simulations" ON "public"."simulation_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can view their own tickets" ON "public"."tickets";
CREATE POLICY "Users can view their own tickets" ON "public"."tickets" FOR SELECT USING (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "Users can view ticket replies" ON "public"."ticket_replies";
CREATE POLICY "Users can view ticket replies" ON "public"."ticket_replies" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."tickets" "t"
  WHERE (("t"."id" = "ticket_replies"."ticket_id") AND ("t"."user_id" = "auth"."uid"())))) OR ("public"."is_admin"() = true)));

ALTER TABLE "public"."admin_users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ai_usage_log" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."answers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."application_lifecycle" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."feature_flags" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nps_insert_own" ON "public"."nps_scores";
CREATE POLICY "nps_insert_own" ON "public"."nps_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."nps_scores" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nps_scores_admin_select" ON "public"."nps_scores";
CREATE POLICY "nps_scores_admin_select" ON "public"."nps_scores" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));

DROP POLICY IF EXISTS "nps_scores_insert_own" ON "public"."nps_scores";
CREATE POLICY "nps_scores_insert_own" ON "public"."nps_scores" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

DROP POLICY IF EXISTS "nps_scores_select_own" ON "public"."nps_scores";
CREATE POLICY "nps_scores_select_own" ON "public"."nps_scores" FOR SELECT USING (("auth"."uid"() = "user_id"));

ALTER TABLE "public"."pdf_exports" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."quiz_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."referral_leads" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."referral_partners" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."simulation_answers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."simulation_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."ticket_replies" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE "public"."admin_users" TO "anon";
GRANT ALL ON TABLE "public"."admin_users" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_users" TO "service_role";

GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";

GRANT ALL ON TABLE "public"."answers" TO "anon";
GRANT ALL ON TABLE "public"."answers" TO "authenticated";
GRANT ALL ON TABLE "public"."answers" TO "service_role";

GRANT ALL ON TABLE "public"."application_lifecycle" TO "anon";
GRANT ALL ON TABLE "public"."application_lifecycle" TO "authenticated";
GRANT ALL ON TABLE "public"."application_lifecycle" TO "service_role";

GRANT ALL ON TABLE "public"."applications" TO "anon";
GRANT ALL ON TABLE "public"."applications" TO "authenticated";
GRANT ALL ON TABLE "public"."applications" TO "service_role";

GRANT ALL ON TABLE "public"."feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."feature_flags" TO "service_role";

GRANT ALL ON TABLE "public"."nps_scores" TO "anon";
GRANT ALL ON TABLE "public"."nps_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."nps_scores" TO "service_role";

GRANT ALL ON TABLE "public"."pdf_exports" TO "anon";
GRANT ALL ON TABLE "public"."pdf_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."pdf_exports" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."quiz_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quiz_sessions" TO "service_role";

GRANT ALL ON TABLE "public"."referral_leads" TO "anon";
GRANT ALL ON TABLE "public"."referral_leads" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_leads" TO "service_role";

GRANT ALL ON TABLE "public"."referral_partners" TO "anon";
GRANT ALL ON TABLE "public"."referral_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."referral_partners" TO "service_role";

GRANT ALL ON TABLE "public"."simulation_answers" TO "anon";
GRANT ALL ON TABLE "public"."simulation_answers" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_answers" TO "service_role";

GRANT ALL ON TABLE "public"."simulation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."simulation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_sessions" TO "service_role";

GRANT ALL ON TABLE "public"."ticket_replies" TO "anon";
GRANT ALL ON TABLE "public"."ticket_replies" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_replies" TO "service_role";

GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";

GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
