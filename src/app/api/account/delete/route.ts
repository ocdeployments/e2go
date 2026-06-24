import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

// Tables that contain user data — deleted in dependency order (children before parents)
const USER_TABLES = [
  'simulator_answers',
  'followup_responses',
  'case_briefs',
  'application_documents',
  'answers',
  'generation_pipeline_log',
  'generated_documents',
  'simulator_sessions',
  'simulator_outcomes',
  'case_profiles',
  'applications',
  'quiz_sessions',
  'payments',
  'application_lifecycle',
  'profiles',
] as const;

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
  const admin = getAdminClient();

  // Wipe all user data in dependency order
  const deleteErrors: string[] = [];
  for (const table of USER_TABLES) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error) {
      // Log but don't abort — best-effort wipe across all tables
      console.error(`[account/delete] Failed to delete from ${table}:`, error.message);
      deleteErrors.push(table);
    }
  }

  // Delete Supabase Auth user (this invalidates all sessions)
  const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId);
  if (authDeleteError) {
    console.error('[account/delete] Auth user deletion failed:', authDeleteError.message);
    return NextResponse.json({ error: 'Failed to delete account. Please contact support.' }, { status: 500 });
  }

  // Send deletion confirmation email via Resend (non-blocking — don't fail if email fails)
  if (userEmail) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const tableList = USER_TABLES.filter(t => t !== 'profiles').map(t => `• ${t.replace(/_/g, ' ')}`).join('\n');

      await resend.emails.send({
        from: 'E2go <no-reply@e2go.app>',
        to: userEmail,
        subject: 'Your E2go account and data have been deleted',
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; background: #0a0a0a; color: #f5f0e8; padding: 40px; max-width: 560px; margin: 0 auto;">
            <div style="font-size: 17px; color: #C9A84C; margin-bottom: 32px; font-weight: 300;">E2go<span style="color: #f5f0e8;">.app</span></div>

            <h1 style="font-family: Georgia, serif; font-weight: 300; font-size: 26px; color: #f5f0e8; margin-bottom: 16px; line-height: 1.25;">
              Your account has been deleted
            </h1>

            <p style="color: rgba(245,240,232,0.65); font-size: 14px; line-height: 1.7; margin-bottom: 24px;">
              This confirms that your E2go account and all associated data have been permanently deleted
              as requested. This action cannot be undone.
            </p>

            <div style="background: rgba(201,168,76,0.05); border: 1px solid rgba(201,168,76,0.15); padding: 20px; margin-bottom: 24px;">
              <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(201,168,76,0.7); margin-bottom: 12px;">Data deleted</p>
              <p style="font-size: 13px; color: rgba(245,240,232,0.78); line-height: 1.8; white-space: pre-line;">${tableList}</p>
            </div>

            <p style="color: rgba(245,240,232,0.72); font-size: 12px; line-height: 1.6;">
              Deleted on: ${new Date(deletedAt).toUTCString()}<br/>
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
      console.error('[account/delete] Confirmation email failed:', emailErr);
    }
  }

  return NextResponse.json({
    deleted: true,
    deletedAt,
    tablesWithErrors: deleteErrors,
  });
}
