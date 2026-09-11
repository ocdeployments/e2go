import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';
import { sendOpsAlert } from '@/lib/ops-alert';

export const dynamic = 'force-dynamic';

const VALID_INTEREST_TYPES = ['partnership', 'renewal'] as const;
type InterestType = typeof VALID_INTEREST_TYPES[number];

const INTEREST_LABELS: Record<InterestType, string> = {
  partnership: 'Partnership application',
  renewal: 'Renewal',
};

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { interestType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const interestType = body.interestType;
  if (!interestType || !VALID_INTEREST_TYPES.includes(interestType as InterestType)) {
    return NextResponse.json({ error: 'Invalid interestType' }, { status: 400 });
  }

  const admin = getAdmin();
  const { data: inserted, error: upsertErr } = await admin
    .from('coming_soon_interest')
    .upsert(
      {
        user_id: user.id,
        email: user.email ?? '',
        interest_type: interestType,
      },
      { onConflict: 'user_id,interest_type', ignoreDuplicates: true }
    )
    .select('id');

  if (upsertErr) {
    captureApiError(upsertErr, { route: 'coming-soon-interest', stage: 'upsert', userId: user.id, interestType });
    return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 500 });
  }

  // Only page ops on a genuinely new row — ignoreDuplicates means a repeat
  // click from the same user returns no row here, so this can't spam alerts.
  if (inserted && inserted.length > 0) {
    const label = INTEREST_LABELS[interestType as InterestType];
    await sendOpsAlert(
      `[E2go.app OPS] New "${label}" coming-soon interest — ${user.email}`,
      [
        `User: ${user.email} (${user.id})`,
        `Interest: ${label}`,
        `Time: ${new Date().toISOString()}`,
        '',
        'Reach out to gauge fit and, if warranted, unlock manual access.',
      ].join('\n')
    ).catch((e) =>
      captureApiError(e, { route: 'coming-soon-interest', stage: 'ops-alert', userId: user.id, interestType })
    );
  }

  return NextResponse.json({ ok: true });
}
