import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/capture-error';
import { sendEarlyAccessWelcomeEmail } from '@/lib/emails/early-access-welcome';

export const dynamic = 'force-dynamic';

const VALID_TIMELINES = ['asap', '1_3_months', '3_6_months', '6_12_months', 'exploring'] as const;
type FilingTimeline = typeof VALID_TIMELINES[number];

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ['facebook_group', 'facebook_group_standalone'] as const;

// This is a public lead-capture endpoint with no cookies/session involved,
// and it's meant to be embeddable outside the app's own origin (e.g. a
// standalone sign-up page shared directly to a Facebook group) — so it
// allows any origin rather than allowlisting one.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateResult = await checkRateLimit(ip, 'early-access-submit');
  if (!rateResult.allowed) {
    return jsonResponse({ error: 'Too many submissions — please try again later.' }, 429);
  }

  let body: {
    email?: string;
    name?: string;
    country?: string;
    filingTimeline?: string;
    source?: string;
    company?: string; // honeypot — real users never see or fill this field
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  // Honeypot: bots that fill every field trip this; humans never see it (hidden via CSS).
  if (body.company) {
    return jsonResponse({ ok: true }, 200);
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const country = body.country?.trim();
  const filingTimeline = body.filingTimeline;
  const source = VALID_SOURCES.includes(body.source as typeof VALID_SOURCES[number])
    ? (body.source as typeof VALID_SOURCES[number])
    : 'facebook_group';

  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'A valid email is required' }, 400);
  }
  if (!name) {
    return jsonResponse({ error: 'Name is required' }, 400);
  }
  if (!country) {
    return jsonResponse({ error: 'Country of residence is required' }, 400);
  }
  if (!filingTimeline || !VALID_TIMELINES.includes(filingTimeline as FilingTimeline)) {
    return jsonResponse({ error: 'Please select a filing timeline' }, 400);
  }

  const admin = getAdmin();
  const { error: upsertErr } = await admin
    .from('early_access_leads')
    .upsert(
      {
        email,
        name,
        country,
        filing_timeline: filingTimeline,
        source,
      },
      { onConflict: 'email' }
    );

  if (upsertErr) {
    captureApiError(upsertErr, { route: 'early-access', stage: 'upsert', email });
    return jsonResponse({ error: 'Something went wrong — please try again.' }, 500);
  }

  // Best-effort: a failed welcome email should never fail a signup that
  // already succeeded in the database.
  sendEarlyAccessWelcomeEmail(name, email).catch((e) =>
    captureApiError(e, { route: 'early-access', stage: 'welcome-email', email })
  );

  return jsonResponse({ ok: true }, 200);
}
