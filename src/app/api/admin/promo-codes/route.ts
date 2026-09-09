import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { normalizePromoCode } from '@/lib/promo-codes';
import { captureApiError } from '@/lib/capture-error';

export const dynamic = 'force-dynamic';

const VALID_DISCOUNTS = [25, 50, 75, 100];

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type RequireAdminResult =
  | { user: { id: string }; error: null }
  | { user: null; error: NextResponse };

async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { user: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { user, error: null };
}

export async function GET() {
  const { user, error } = await requireAdmin();
  if (error) return error;

  const admin = getAdmin();

  const [{ data: codes, error: codesErr }, { data: redemptions, error: redErr }] = await Promise.all([
    admin.from('promo_codes')
      .select('id, code, code_type, assigned_email, discount_percent, applicable_tiers, max_redemptions, active, expires_at, note, created_at')
      .order('created_at', { ascending: false }),
    admin.from('promo_redemptions').select('promo_code_id, status'),
  ]);

  if (codesErr) {
    captureApiError(codesErr, { route: 'admin/promo-codes', stage: 'list-codes', userId: user.id });
    return NextResponse.json({ error: 'Failed to load promo codes' }, { status: 500 });
  }
  if (redErr) {
    captureApiError(redErr, { route: 'admin/promo-codes', stage: 'list-redemptions', userId: user.id });
    return NextResponse.json({ error: 'Failed to load redemptions' }, { status: 500 });
  }

  const redemptionCounts = new Map<string, number>();
  for (const r of redemptions ?? []) {
    if (r.status === 'pending' || r.status === 'completed') {
      redemptionCounts.set(r.promo_code_id, (redemptionCounts.get(r.promo_code_id) ?? 0) + 1);
    }
  }

  const enriched = (codes ?? []).map(c => ({
    ...c,
    redemptions: redemptionCounts.get(c.id) ?? 0,
  }));

  return NextResponse.json({ codes: enriched });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireAdmin();
  if (error) return error;
  const admin = getAdmin();

  let body: {
    code?: string;
    codeType?: 'shared' | 'personal';
    assignedEmail?: string;
    discountPercent?: number;
    applicableTiers?: string[];
    maxRedemptions?: number | null;
    expiresAt?: string | null;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const rawCode = body.code?.trim();
  if (!rawCode) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }
  const code = normalizePromoCode(rawCode);

  if (body.codeType !== 'shared' && body.codeType !== 'personal') {
    return NextResponse.json({ error: 'codeType must be "shared" or "personal"' }, { status: 400 });
  }

  if (!body.discountPercent || !VALID_DISCOUNTS.includes(body.discountPercent)) {
    return NextResponse.json({ error: 'discountPercent must be one of 25, 50, 75, 100' }, { status: 400 });
  }

  const assignedEmail = body.assignedEmail?.trim().toLowerCase() || null;
  if (body.codeType === 'personal' && !assignedEmail) {
    return NextResponse.json({ error: 'assignedEmail is required for personal codes' }, { status: 400 });
  }

  const applicableTiers = body.applicableTiers && body.applicableTiers.length > 0 ? body.applicableTiers : null;

  let maxRedemptions: number | null = null;
  if (body.maxRedemptions !== undefined && body.maxRedemptions !== null) {
    maxRedemptions = Number(body.maxRedemptions);
    if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
      return NextResponse.json({ error: 'maxRedemptions must be a positive integer' }, { status: 400 });
    }
  }

  let expiresAt: string | null = null;
  if (body.expiresAt) {
    const d = new Date(body.expiresAt);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json({ error: 'expiresAt is not a valid date' }, { status: 400 });
    }
    expiresAt = d.toISOString();
  }

  const { data: inserted, error: insertErr } = await admin
    .from('promo_codes')
    .insert({
      code,
      code_type: body.codeType,
      assigned_email: body.codeType === 'personal' ? assignedEmail : null,
      discount_percent: body.discountPercent,
      applicable_tiers: applicableTiers,
      max_redemptions: maxRedemptions,
      expires_at: expiresAt,
      note: body.note?.trim() || null,
      active: true,
    })
    .select('id, code')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      return NextResponse.json({ error: 'A promo code with this code already exists' }, { status: 409 });
    }
    captureApiError(insertErr, { route: 'admin/promo-codes', stage: 'create', userId: user.id, code });
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'create_promo_code',
    resource: 'promo_codes',
    resource_id: inserted.id,
    details: {
      code: inserted.code,
      codeType: body.codeType,
      assignedEmail: body.codeType === 'personal' ? assignedEmail : null,
      discountPercent: body.discountPercent,
      applicableTiers,
      maxRedemptions,
      expiresAt,
    },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true, id: inserted.id, code: inserted.code });
}
