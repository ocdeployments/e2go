import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables - must be set at runtime
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate env vars immediately
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Client-side Supabase client
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Server-side client for API routes
export function createSupabaseServerClient(): SupabaseClient {
  return supabase;
}

// Type definitions
export interface User {
  id: string;
  email: string;
  created_at: string;
  tier: 'free' | 'standard' | 'complete';
  application_type: 'solo' | 'partnership' | null;
}

export interface Application {
  id: string;
  user_id: string;
  principal_name: string | null;
  business_name: string | null;
  application_type: string | null;
  tier: string | null;
  status: string;
  overall_score: number | null;
  route: string | null;
  family_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: string;
  application_id: string;
  question_key: string;
  answer_value: string | null;
  answered_at: string;
}

export interface QuizSession {
  id: string;
  user_id: string | null;
  email: string | null;
  outcome: 'PROCEED' | 'PROCEED_RISK' | 'ATTORNEY_RECOMMENDED' | 'DO_NOT_PROCEED';
  hard_stop_codes: string[];
  attorney_flag_codes: string[];
  risk_flag_codes: string[];
  application_type: string | null;
  investment_amount: number | null;
  investment_currency: string | null;
  acknowledged_risk: boolean;
  casl_consent: boolean;
  completed_at: string;
}

export interface ConsentLog {
  id: string;
  user_id: string | null;
  tos_version: string;
  ip_hash: string | null;
  action: string;
  timestamp: string;
}

export interface PdfExport {
  id: string;
  application_id: string;
  export_type: string | null;
  exported_at: string;
  export_count: number;
}