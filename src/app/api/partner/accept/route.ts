import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { token?: string };
  const token = (body.token ?? '').trim();

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: invite } = await service
    .from('partner_access_tokens')
    .select('id, created_by_user_id, partner_email, tier_id, used_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invitation link' }, { status: 404 });
  }

  if (invite.used_at) {
    return NextResponse.json({ error: 'This invitation has already been used' }, { status: 409 });
  }

  // Email must match
  const userEmail = user.email?.toLowerCase() ?? '';
  if (userEmail !== (invite.partner_email as string).toLowerCase()) {
    return NextResponse.json(
      {
        error: `This invitation was sent to ${invite.partner_email}. You are logged in as ${user.email}. Please log in with the correct account.`,
        emailMismatch: true,
      },
      { status: 403 }
    );
  }

  // Idempotent — skip insert if they already hold this entitlement
  const { data: existing } = await service
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', invite.tier_id as string)
    .eq('status', 'completed')
    .maybeSingle();

  if (!existing) {
    await service.from('payments').insert({
      user_id: user.id,
      payment_type: invite.tier_id,
      stripe_price_id: 'partner_grant',
      amount_paid: 0,
      status: 'completed',
      completed_at: new Date().toISOString(),
    });
  }

  // Mark token used
  await service
    .from('partner_access_tokens')
    .update({ used_at: new Date().toISOString(), used_by_user_id: user.id })
    .eq('token', token);

  return NextResponse.json({ success: true, tierId: invite.tier_id });
}
