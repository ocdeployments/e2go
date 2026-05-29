-- E2GO.APP DATABASE SCHEMA
-- Version: 1.0
-- Created: 2026-05-29
-- Reference: E2Pathway_Vol4_Technical_Architecture.md

-- ============================================
-- EXTENSION FOR UUID
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'standard', 'complete')),
    application_type TEXT CHECK (application_type IN ('solo', 'partnership'))
);

-- ============================================
-- APPLICATIONS TABLE
-- ============================================
CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    principal_name TEXT,
    business_name TEXT,
    application_type TEXT CHECK (application_type IN ('solo', 'partnership')),
    tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'complete')),
    status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'approved', 'denied')),
    overall_score INTEGER,
    route TEXT CHECK (route IN ('solo', 'partnership')),
    family_type TEXT CHECK (family_type IN ('individual', 'couple', 'family')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ANSWERS TABLE
-- ============================================
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    answer_value TEXT,
    answered_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUIZ SESSIONS TABLE
-- ============================================
CREATE TABLE public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
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

-- ============================================
-- CONSENT LOG TABLE
-- ============================================
CREATE TABLE public.consent_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    tos_version TEXT NOT NULL,
    ip_hash TEXT,
    action TEXT NOT NULL CHECK (action IN ('accepted', 'declined', 'viewed')),
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PDF EXPORTS TABLE
-- ============================================
CREATE TABLE public.pdf_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
    export_type TEXT CHECK (export_type IN ('full_package', 'individual_tabs', 'cover_letter', 'business_plan')),
    exported_at TIMESTAMPTZ DEFAULT NOW(),
    export_count INTEGER DEFAULT 1
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_applications_user_id ON public.applications(user_id);
CREATE INDEX idx_answers_application_id ON public.answers(application_id);
CREATE INDEX idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX idx_quiz_sessions_email ON public.quiz_sessions(email);
CREATE INDEX idx_consent_log_user_id ON public.consent_log(user_id);
CREATE INDEX idx_pdf_exports_application_id ON public.pdf_exports(application_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_exports ENABLE ROW LEVEL SECURITY;

-- USERS: Users can only access their own row
CREATE POLICY "Users can select their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- APPLICATIONS: Users can only access their own applications
CREATE POLICY "Users can select their own applications" ON public.applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own applications" ON public.applications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications" ON public.applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own applications" ON public.applications
    FOR DELETE USING (auth.uid() = user_id);

-- ANSWERS: Users can only access answers for their own applications
CREATE POLICY "Users can select their own answers" ON public.answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = answers.application_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own answers" ON public.answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = answers.application_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own answers" ON public.answers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = answers.application_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own answers" ON public.answers
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = answers.application_id AND a.user_id = auth.uid()
        )
    );

-- QUIZ SESSIONS: Users can access their own quiz sessions + anonymous sessions
CREATE POLICY "Users can select their own quiz sessions" ON public.quiz_sessions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own quiz sessions" ON public.quiz_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- CONSENT LOG: Users can only access their own consent logs
CREATE POLICY "Users can select their own consent logs" ON public.consent_log
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own consent logs" ON public.consent_log
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- PDF EXPORTS: Users can only access exports for their own applications
CREATE POLICY "Users can select their own pdf exports" ON public.pdf_exports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = pdf_exports.application_id AND a.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own pdf exports" ON public.pdf_exports
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.applications a
            WHERE a.id = pdf_exports.application_id AND a.user_id = auth.uid()
        )
    );

-- ============================================
-- FUNCTION: Create user record on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, tier)
    VALUES (NEW.id, NEW.email, 'free');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user record on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Update application updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on applications
DROP TRIGGER IF EXISTS update_applications_timestamp ON public.applications;
CREATE TRIGGER update_applications_timestamp
    BEFORE UPDATE ON public.applications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
