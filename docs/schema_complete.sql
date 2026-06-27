-- ============================================================================
-- E2GO.APP DATABASE SCHEMA
-- Version: 5.0 (Idempotent)
-- Created: 2026-05-29
-- Purpose: Complete database schema for E-2 Treaty Investor visa preparation app
-- Note: Uses public.profiles instead of public.users (Supabase has auth.users)
-- This script is fully idempotent - safe to run on existing database
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PROFILES TABLE (replaces users - extends Supabase auth.users)
-- Purpose: App-specific user profile data linked to auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'complete')),
    application_type TEXT CHECK (application_type IN ('solo', 'partnership')),
    ip_hash TEXT,
    last_login_at TIMESTAMPTZ,
    login_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    founding_member BOOLEAN DEFAULT FALSE,
    guarantee_eligible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPLICATIONS TABLE
-- Purpose: Stores E-2 visa application data for each user
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    principal_name TEXT,
    business_name TEXT,
    application_type TEXT CHECK (application_type IN ('solo', 'partnership')),
    tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'complete')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'approved', 'denied')),
    overall_score INTEGER,
    route TEXT CHECK (route IN ('solo', 'partnership')),
    family_type TEXT CHECK (family_type IN ('individual', 'couple', 'family')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    lead_temperature INTEGER DEFAULT 0,
    lead_stage TEXT DEFAULT 'unknown',
    franchise_matching_triggered BOOLEAN DEFAULT FALSE,
    attorney_warmth INTEGER DEFAULT 0,
    cpa_warmth TEXT DEFAULT 'none',
    banking_warmth TEXT DEFAULT 'none',
    fx_warmth TEXT DEFAULT 'none',
    multiunit_routing BOOLEAN DEFAULT FALSE,
    growth_ambition TEXT DEFAULT 'unknown'
);

-- ============================================================================
-- ANSWERS TABLE
-- Purpose: Stores user's answers to document interview questions (Tabs A-L)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    answer_value TEXT,
    skipped_by_user BOOLEAN DEFAULT FALSE,
    privacy_category TEXT DEFAULT 'green',
    answered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (application_id, question_key)
);

-- ============================================================================
-- APPLICATION LIFECYCLE TABLE
-- Purpose: Tracks every milestone from first visit through approval
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.application_lifecycle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_token UUID,
    first_visit_at TIMESTAMPTZ,
    quiz_started_at TIMESTAMPTZ,
    quiz_completed_at TIMESTAMPTZ,
    quiz_outcome TEXT CHECK (quiz_outcome IN ('PROCEED', 'PROCEED_RISK', 'ATTORNEY_RECOMMENDED', 'DO_NOT_PROCEED')),
    account_created_at TIMESTAMPTZ,
    payment_completed_at TIMESTAMPTZ,
    tier_purchased TEXT CHECK (tier_purchased IN ('standard', 'complete')),
    module1_started_at TIMESTAMPTZ,
    module1_completed_at TIMESTAMPTZ,
    module2_started_at TIMESTAMPTZ,
    module2_completed_at TIMESTAMPTZ,
    module3_started_at TIMESTAMPTZ,
    module3_completed_at TIMESTAMPTZ,
    module4_started_at TIMESTAMPTZ,
    module4_completed_at TIMESTAMPTZ,
    module5_started_at TIMESTAMPTZ,
    module5_completed_at TIMESTAMPTZ,
    module6_started_at TIMESTAMPTZ,
    module6_completed_at TIMESTAMPTZ,
    generation_triggered_at TIMESTAMPTZ,
    generation_completed_at TIMESTAMPTZ,
    simulator_first_run_at TIMESTAMPTZ,
    simulator_sessions_total INTEGER DEFAULT 0,
    simulator_best_score INTEGER,
    interview_date TIMESTAMPTZ,
    outcome_recorded_at TIMESTAMPTZ,
    outcome TEXT CHECK (outcome IN ('approved', 'refused', 'processing')),
    approval_date TIMESTAMPTZ,
    total_journey_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUIZ SESSIONS TABLE
-- Purpose: Stores Module 0 eligibility quiz attempts and results
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT,
    outcome TEXT CHECK (outcome IN ('PROCEED', 'PROCEED_RISK', 'ATTORNEY_RECOMMENDED', 'DO_NOT_PROCEED')),
    hard_stop_codes TEXT[] DEFAULT '{}',
    attorney_flag_codes TEXT[] DEFAULT '{}',
    risk_flag_codes TEXT[] DEFAULT '{}',
    application_type TEXT CHECK (application_type IN ('solo', 'partnership')),
    investment_amount NUMERIC,
    investment_currency TEXT CHECK (investment_currency IN ('USD', 'CAD')),
    acknowledged_risk BOOLEAN DEFAULT FALSE,
    casl_consent BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONSENT LOG TABLE
-- Purpose: Tracks user consent for ToS, privacy policy, CASL compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.consent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tos_version TEXT NOT NULL,
    ip_hash TEXT,
    action TEXT NOT NULL CHECK (action IN ('accepted', 'declined', 'viewed')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PDF EXPORTS TABLE
-- Purpose: Tracks PDF document generation and download history
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pdf_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    export_type TEXT CHECK (export_type IN ('full_package', 'individual_tabs', 'cover_letter', 'business_plan')),
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    export_count INTEGER DEFAULT 1
);

-- ============================================================================
-- AI USAGE LOG TABLE
-- Purpose: Tracks MiniMax/OpenRouter API usage for billing and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    feature TEXT NOT NULL CHECK (feature IN ('document_generation', 'interview_simulator', 'answer_evaluation', 'adaptive_education', 'business_plan', 'cover_letter')),
    model TEXT NOT NULL,
    tokens_input INTEGER,
    tokens_output INTEGER,
    tokens_total INTEGER,
    cost_usd NUMERIC(10, 6),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TICKETS TABLE
-- Purpose: Support ticket system for user help requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_on_user', 'resolved', 'closed')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    category TEXT CHECK (category IN ('technical', 'billing', 'eligibility', 'document', 'other')),
    assigned_to UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- TICKET REPLIES TABLE
-- Purpose: Responses to support tickets (user and admin replies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    is_admin_reply BOOLEAN DEFAULT FALSE,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ADMIN USERS TABLE
-- Purpose: Admin role management for dashboard access
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'support' CHECK (role IN ('super_admin', 'admin', 'support', 'analyst')),
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret TEXT
);

-- ============================================================================
-- FEATURE FLAGS TABLE
-- Purpose: Feature toggle system for gradual rollouts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_for_users UUID[] DEFAULT '{}',
    enabled_for_tiers TEXT[] DEFAULT '{}',
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- ============================================================================
-- DOCUMENT GENERATION JOBS TABLE
-- Purpose: Async job queue for AI-generated PDF documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.document_generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('cover_letter', 'business_plan', 'source_of_funds', 'investment_justification', 'economic_impact')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    input_data JSONB,
    output_url TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- SIMULATION SESSIONS TABLE
-- Purpose: Interview simulator session tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.simulation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    tab TEXT NOT NULL,
    mode TEXT DEFAULT 'practice' CHECK (mode IN ('practice', 'timed', 'evaluation')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    questions_answered INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    ai_evaluation JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================================================
-- SIMULATION ANSWERS TABLE
-- Purpose: Individual answer records for interview simulator
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.simulation_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.simulation_sessions(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    user_answer TEXT,
    ai_response TEXT,
    is_correct BOOLEAN,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REFERRAL CONSENTS TABLE
-- Purpose: Track user consent for referral program
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referred_by UUID REFERENCES public.profiles(id),
    consent_given BOOLEAN DEFAULT FALSE,
    consent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REFERRAL LEADS TABLE
-- Purpose: Track referred users before they sign up
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed_up', 'converted', 'expired')),
    referred_at TIMESTAMPTZ DEFAULT NOW(),
    signed_up_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ
);

-- ============================================================================
-- REFERRAL PARTNERS TABLE
-- Purpose: Partner organizations for referral program (CPAs, lawyers, etc)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    contact_email TEXT,
    partnership_type TEXT CHECK (partnership_type IN ('referral', 'affiliate', 'white_label')),
    commission_rate NUMERIC(5, 2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'terminated')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (use CREATE INDEX IF NOT EXISTS for idempotency)
-- ============================================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON public.profiles(tier);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at);

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON public.applications(created_at);
CREATE INDEX IF NOT EXISTS idx_applications_updated_at ON public.applications(updated_at);

-- Answers indexes
CREATE INDEX IF NOT EXISTS idx_answers_application_id ON public.answers(application_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_key ON public.answers(question_key);
CREATE INDEX IF NOT EXISTS idx_answers_answered_at ON public.answers(answered_at);

-- Application lifecycle indexes
CREATE INDEX IF NOT EXISTS idx_application_lifecycle_user_id ON public.application_lifecycle(user_id);
CREATE INDEX IF NOT EXISTS idx_application_lifecycle_session_token ON public.application_lifecycle(session_token);
CREATE INDEX IF NOT EXISTS idx_application_lifecycle_outcome ON public.application_lifecycle(outcome);

-- Quiz sessions indexes
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_email ON public.quiz_sessions(email);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_outcome ON public.quiz_sessions(outcome);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_completed_at ON public.quiz_sessions(completed_at);

-- Consent log indexes
CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON public.consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_timestamp ON public.consent_log(timestamp);

-- PDF exports indexes
CREATE INDEX IF NOT EXISTS idx_pdf_exports_application_id ON public.pdf_exports(application_id);
CREATE INDEX IF NOT EXISTS idx_pdf_exports_exported_at ON public.pdf_exports(exported_at);

-- AI usage log indexes
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_application_id ON public.ai_usage_log(application_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_feature ON public.ai_usage_log(feature);
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created_at ON public.ai_usage_log(created_at);

-- Tickets indexes
CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON public.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON public.tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON public.tickets(created_at);

-- Ticket replies indexes
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON public.ticket_replies(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_user_id ON public.ticket_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_created_at ON public.ticket_replies(created_at);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_is_active ON public.admin_users(is_active);

-- Feature flags indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON public.feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags(is_enabled);

-- Document generation indexes
CREATE INDEX IF NOT EXISTS idx_doc_gen_jobs_user_id ON public.document_generation_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_doc_gen_jobs_application_id ON public.document_generation_jobs(application_id);
CREATE INDEX IF NOT EXISTS idx_doc_gen_jobs_status ON public.document_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_doc_gen_jobs_created_at ON public.document_generation_jobs(created_at);

-- Simulation sessions indexes
CREATE INDEX IF NOT EXISTS idx_sim_sessions_user_id ON public.simulation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_sessions_application_id ON public.simulation_sessions(application_id);
CREATE INDEX IF NOT EXISTS idx_sim_sessions_status ON public.simulation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sim_sessions_started_at ON public.simulation_sessions(started_at);

-- Simulation answers indexes
CREATE INDEX IF NOT EXISTS idx_sim_answers_session_id ON public.simulation_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_sim_answers_question_key ON public.simulation_answers(question_key);

-- Referral consents indexes
CREATE INDEX IF NOT EXISTS idx_referral_consents_user_id ON public.referral_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_consents_referral_code ON public.referral_consents(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_consents_email ON public.referral_consents(email);

-- Referral leads indexes
CREATE INDEX IF NOT EXISTS idx_referral_leads_referrer_id ON public.referral_leads(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_leads_email ON public.referral_leads(email);
CREATE INDEX IF NOT EXISTS idx_referral_leads_status ON public.referral_leads(status);

-- Referral partners indexes
CREATE INDEX IF NOT EXISTS idx_referral_partners_user_id ON public.referral_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_partners_status ON public.referral_partners(status);
CREATE INDEX IF NOT EXISTS idx_referral_partners_partnership_type ON public.referral_partners(partnership_type);

-- ============================================================================
-- ROW LEVEL SECURITY (enable RLS on all tables)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.admin_users au
        WHERE au.user_id = auth.uid() AND au.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- PROFILES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own profile' AND tablename = 'profiles') THEN
        CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- APPLICATIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own applications' AND tablename = 'applications') THEN
        CREATE POLICY "Users can select own applications" ON public.applications FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own applications' AND tablename = 'applications') THEN
        CREATE POLICY "Users can insert own applications" ON public.applications FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- ANSWERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own answers' AND tablename = 'answers') THEN
        CREATE POLICY "Users can select own answers" ON public.answers FOR SELECT USING (
            (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = answers.application_id AND a.user_id = auth.uid()))
            OR public.is_admin() = TRUE
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own answers' AND tablename = 'answers') THEN
        CREATE POLICY "Users can insert own answers" ON public.answers FOR INSERT WITH CHECK (
            (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = answers.application_id AND a.user_id = auth.uid()))
            OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- APPLICATION LIFECYCLE
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own lifecycle' AND tablename = 'application_lifecycle') THEN
        CREATE POLICY "Users can view own lifecycle" ON public.application_lifecycle FOR SELECT USING (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own lifecycle' AND tablename = 'application_lifecycle') THEN
        CREATE POLICY "Users can insert own lifecycle" ON public.application_lifecycle FOR INSERT WITH CHECK (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own lifecycle' AND tablename = 'application_lifecycle') THEN
        CREATE POLICY "Users can update own lifecycle" ON public.application_lifecycle FOR UPDATE USING (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- QUIZ SESSIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own quiz sessions' AND tablename = 'quiz_sessions') THEN
        CREATE POLICY "Users can select own quiz sessions" ON public.quiz_sessions FOR SELECT USING (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own quiz sessions' AND tablename = 'quiz_sessions') THEN
        CREATE POLICY "Users can insert own quiz sessions" ON public.quiz_sessions FOR INSERT WITH CHECK (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- CONSENT LOG
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own consent logs' AND tablename = 'consent_log') THEN
        CREATE POLICY "Users can select own consent logs" ON public.consent_log FOR SELECT USING (
            auth.uid() = user_id OR user_id IS NULL OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- PDF EXPORTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own pdf exports' AND tablename = 'pdf_exports') THEN
        CREATE POLICY "Users can select own pdf exports" ON public.pdf_exports FOR SELECT USING (
            (EXISTS (SELECT 1 FROM public.applications a WHERE a.id = pdf_exports.application_id AND a.user_id = auth.uid()))
            OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- AI USAGE LOG
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own AI usage' AND tablename = 'ai_usage_log') THEN
        CREATE POLICY "Users can view own AI usage" ON public.ai_usage_log FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- TICKETS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can select own tickets' AND tablename = 'tickets') THEN
        CREATE POLICY "Users can select own tickets" ON public.tickets FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create tickets' AND tablename = 'tickets') THEN
        CREATE POLICY "Users can create tickets" ON public.tickets FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- TICKET REPLIES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view ticket replies' AND tablename = 'ticket_replies') THEN
        CREATE POLICY "Users can view ticket replies" ON public.ticket_replies FOR SELECT USING (
            (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_replies.ticket_id AND t.user_id = auth.uid()))
            OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- ADMIN USERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage admin_users' AND tablename = 'admin_users') THEN
        CREATE POLICY "Admins can manage admin_users" ON public.admin_users FOR ALL USING (public.is_admin() = TRUE);
    END IF;
END $$;

-- FEATURE FLAGS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view feature flags' AND tablename = 'feature_flags') THEN
        CREATE POLICY "Anyone can view feature flags" ON public.feature_flags FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage feature flags' AND tablename = 'feature_flags') THEN
        CREATE POLICY "Admins can manage feature flags" ON public.feature_flags FOR ALL USING (public.is_admin() = TRUE);
    END IF;
END $$;

-- DOCUMENT GENERATION JOBS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own document jobs' AND tablename = 'document_generation_jobs') THEN
        CREATE POLICY "Users can view own document jobs" ON public.document_generation_jobs FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create document jobs' AND tablename = 'document_generation_jobs') THEN
        CREATE POLICY "Users can create document jobs" ON public.document_generation_jobs FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- SIMULATION SESSIONS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own simulations' AND tablename = 'simulation_sessions') THEN
        CREATE POLICY "Users can view own simulations" ON public.simulation_sessions FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create simulations' AND tablename = 'simulation_sessions') THEN
        CREATE POLICY "Users can create simulations" ON public.simulation_sessions FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- SIMULATION ANSWERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own simulation answers' AND tablename = 'simulation_answers') THEN
        CREATE POLICY "Users can view own simulation answers" ON public.simulation_answers FOR SELECT USING (
            (EXISTS (SELECT 1 FROM public.simulation_sessions ss WHERE ss.id = simulation_answers.session_id AND ss.user_id = auth.uid()))
            OR public.is_admin() = TRUE
        );
    END IF;
END $$;

-- REFERRAL CONSENTS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own referral consents' AND tablename = 'referral_consents') THEN
        CREATE POLICY "Users can view own referral consents" ON public.referral_consents FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- REFERRAL LEADS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own referral leads' AND tablename = 'referral_leads') THEN
        CREATE POLICY "Users can view own referral leads" ON public.referral_leads FOR SELECT USING (auth.uid() = referrer_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- REFERRAL PARTNERS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own referral partner' AND tablename = 'referral_partners') THEN
        CREATE POLICY "Users can view own referral partner" ON public.referral_partners FOR SELECT USING (auth.uid() = user_id OR public.is_admin() = TRUE);
    END IF;
END $$;

-- ============================================================================
-- AUTOMATIC TRIGGERS
-- ============================================================================

-- Trigger: Create profile automatically when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, tier)
    VALUES (NEW.id, NEW.email, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_application_lifecycle_timestamp ON public.application_lifecycle;
CREATE TRIGGER update_application_lifecycle_timestamp
    BEFORE UPDATE ON public.application_lifecycle
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_applications_timestamp ON public.applications;
CREATE TRIGGER update_applications_timestamp
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_tickets_timestamp ON public.tickets;
CREATE TRIGGER update_tickets_timestamp
    BEFORE UPDATE ON public.tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_feature_flags_timestamp ON public.feature_flags;
CREATE TRIGGER update_feature_flags_timestamp
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_referral_partners_timestamp ON public.referral_partners;
CREATE TRIGGER update_referral_partners_timestamp
    BEFORE UPDATE ON public.referral_partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================================================
-- INITIAL DATA - Feature Flags (idempotent insert)
-- ============================================================================
INSERT INTO public.feature_flags (name, description, is_enabled) VALUES
    ('interview_simulator', 'Enable AI-powered interview practice simulator', FALSE),
    ('pdf_export', 'Enable PDF document generation', FALSE),
    ('llc_formation', 'Enable LLC formation wizard (Complete tier)', FALSE),
    ('banking_setup', 'Enable banking setup guide (Complete tier)', FALSE),
    ('departure_tax', 'Enable Canadian departure tax planner', FALSE),
    ('referral_engine', 'Enable referral program engine', FALSE)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================