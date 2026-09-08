import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { captureApiError } from '@/lib/capture-error';

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

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rateResult = await checkRateLimit(ip, 'early-access-submit');
  if (!rateResult.allowed) {
    return NextResponse.json({ error: 'Too many submissions — please try again later.' }, { status: 429 });
  }

  let body: {
    email?: string;
    name?: string;
    country?: string;
    filingTimeline?: string;
    company?: string; // honeypot — real users never see or fill this field
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Honeypot: bots that fill every field trip this; humans never see it (hidden via CSS).
  if (body.company) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim();
  const country = body.country?.trim();
  const filingTimeline = body.filingTimeline;

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!country) {
    return NextResponse.json({ error: 'Country of residence is required' }, { status: 400 });
  }
  if (!filingTimeline || !VALID_TIMELINES.includes(filingTimeline as FilingTimeline)) {
    return NextResponse.json({ error: 'Please select a filing timeline' }, { status: 400 });
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
        source: 'facebook_group',
      },
      { onConflict: 'email' }
    );

  if (upsertErr) {
    captureApiError(upsertErr, { route: 'early-access', stage: 'upsert', email });
    return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
