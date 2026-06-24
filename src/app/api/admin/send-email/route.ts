import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  // Must be admin
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { targetUserId: string; subject: string; message: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const { targetUserId, subject, message } = body;
  if (!targetUserId || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'targetUserId, subject, and message are required' }, { status: 400 });
  }

  // Look up target user's email
  const { data: { user: targetUser }, error: userErr } = await admin.auth.admin.getUserById(targetUserId);
  if (userErr || !targetUser?.email) {
    return NextResponse.json({ error: 'Target user not found or has no email' }, { status: 404 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from      = process.env.RESEND_FROM ?? 'team@e2go.app';
  if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 500 });

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f5f0e8;">
      <p style="font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      <hr style="border-color: rgba(201,168,76,0.2); margin: 32px 0;" />
      <p style="font-size: 12px; color: rgba(245,240,232,0.4);">
        Sent from the E2go team · <a href="https://e2go.app" style="color: #C9A84C;">e2go.app</a>
      </p>
    </div>
  `;

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from, to: targetUser.email, subject, html }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.json().catch(() => ({}));
    console.error('[admin/send-email] Resend error:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }

  // Audit log
  await admin.from('admin_audit_log').insert({
    admin_user_id: user.id,
    action: 'send_email',
    target_user_id: targetUserId,
    resource: 'email',
    details: { subject, preview: message.slice(0, 100) },
  }).then(() => {}, () => {});

  return NextResponse.json({ ok: true });
}
