import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { Redis } from '@upstash/redis';
import { captureApiError } from '@/lib/capture-error';

const GRACE_DAYS = 30;

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST() {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const userEmail = user.email ?? '';
  const deletedAt = new Date().toISOString();
  const purgeDate = new Date(Date.now() + GRACE_DAYS * 24 * 60 * 60 * 1000);
  const admin = getAdminClient();

  // Soft-delete: stamp profiles.deleted_at — data is preserved for 30-day grace period
  const { error: softDeleteError } = await admin
    .from('profiles')
    .update({ deleted_at: deletedAt })
    .eq('user_id', userId);

  if (softDeleteError) {
    captureApiError(softDeleteError, { route: 'account/delete', stage: 'soft-delete', userId });
    return NextResponse.json({ error: 'Failed to schedule deletion. Please contact support.' }, { status: 500 });
  }

  // Invalidate middleware access cache so the middleware catches the deletion on next request
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;
  if (redis) {
    await redis.del(`mw:access:${userId}`);
  }

  // Send 30-day deletion scheduled email via Resend (non-blocking)
  if (userEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'e2go <no-reply@e2go.app>',
        to: userEmail,
        subject: 'Your e2go account is scheduled for deletion',
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; background: #0a0a0a; color: #f5f0e8; padding: 40px; max-width: 560px; margin: 0 auto;">
            <div style="font-size: 17px; color: #C9A84C; margin-bottom: 32px; font-weight: 300;">e2go<span style="color: #f5f0e8;">.app</span></div>

            <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 26px; color: #f5f0e8; margin-bottom: 16px; line-height: 1.25;">
              Account deletion scheduled
            </h1>

            <p style="color: rgba(245,240,232,0.65); font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
              We received your request to delete your e2go account. Your account and all associated data
              will be permanently removed on <strong style="color: #f5f0e8;">${purgeDate.toDateString()}</strong>.
            </p>

            <div style="background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.15); padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(201,168,76,0.7); margin-bottom: 8px;">Changed your mind?</p>
              <p style="font-size: 13px; color: rgba(245,240,232,0.78); line-height: 1.7; margin: 0;">
                You can cancel this deletion before ${purgeDate.toDateString()} by logging in and visiting
                your account recovery page. All your visa preparation work will be restored.
              </p>
            </div>

            <p style="color: rgba(245,240,232,0.72); font-size: 12px; line-height: 1.6;">
              Requested on: ${new Date(deletedAt).toUTCString()}<br/>
              Account: ${userEmail}
            </p>

            <p style="color: rgba(245,240,232,0.70); font-size: 12px; margin-top: 24px; line-height: 1.6;">
              If you did not request this deletion, please contact
              <a href="mailto:support@e2go.app" style="color: #C9A84C;">support@e2go.app</a> immediately.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      captureApiError(emailErr, { route: 'account/delete', stage: 'confirmation-email', userId });
    }
  }

  return NextResponse.json({
    scheduled: true,
    deletedAt,
    purgeDate: purgeDate.toISOString(),
  });
}
