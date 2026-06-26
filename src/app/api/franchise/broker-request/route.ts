import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { Resend } from 'resend';

// TODO(OPQ-2): Change BROKER_NOTIFICATION_EMAIL to a CRM webhook or internal
// inbox once the broker handoff mechanism decision is resolved.
const BROKER_NOTIFICATION_EMAIL = 'romyjames@gmail.com';

// POST /api/franchise/broker-request
// Records a broker connection request and emails the internal team.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as {
      match_categories?: string[];
      name?: string;
    };

    const matchCategories: string[] = Array.isArray(body.match_categories) ? body.match_categories : [];
    const displayName: string = typeof body.name === 'string' ? body.name : '';
    const timestamp = new Date().toISOString();

    const service = createServiceClient();

    // ── Persist to database ──
    // Attempt to insert into broker_requests table.
    // Migration in supabase/migrations will create this table.
    try {
      await service.from('broker_requests').insert({
        user_id: user.id,
        user_email: user.email ?? '',
        user_name: displayName,
        match_categories: matchCategories,
        requested_at: timestamp,
      });
    } catch {
      // Table may not exist yet — non-critical, email will still send
    }

    // Also flag the latest application record if the column exists
    try {
      const { data: apps } = await service
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (apps && apps.length > 0) {
        await service
          .from('applications')
          .update({ broker_interest_requested: true })
          .eq('id', apps[0].id);
      }
    } catch {
      // Column may not exist yet — non-critical
    }

    // ── Send email notification via Resend ──
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const categoriesText = matchCategories.length > 0
        ? matchCategories.join(', ')
        : 'Not specified';

      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev', // TODO: change to notifications@e2go.app once domain is verified
          to: BROKER_NOTIFICATION_EMAIL,
          subject: 'New Broker Connection Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #f5f0e8; padding: 32px;">
              <h1 style="font-family: Georgia, serif; font-weight: 300; color: #C9A84C; font-size: 24px; margin-bottom: 24px;">
                New Broker Connection Request
              </h1>
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr style="border-bottom: 1px solid rgba(245,240,232,0.08);">
                  <td style="padding: 10px 0; color: rgba(245,240,232,0.5); width: 160px;">Name</td>
                  <td style="padding: 10px 0; color: #f5f0e8;">${displayName || '(not provided)'}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(245,240,232,0.08);">
                  <td style="padding: 10px 0; color: rgba(245,240,232,0.5);">Email</td>
                  <td style="padding: 10px 0; color: #f5f0e8;">${user.email ?? '(not provided)'}</td>
                </tr>
                <tr style="border-bottom: 1px solid rgba(245,240,232,0.08);">
                  <td style="padding: 10px 0; color: rgba(245,240,232,0.5);">Match Categories</td>
                  <td style="padding: 10px 0; color: #f5f0e8;">${categoriesText}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; color: rgba(245,240,232,0.5);">Requested At</td>
                  <td style="padding: 10px 0; color: #f5f0e8;">${new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/Toronto', dateStyle: 'long', timeStyle: 'short' })}</td>
                </tr>
              </table>
              <p style="font-size: 11px; color: rgba(245,240,232,0.3); margin-top: 32px;">
                E2Go Franchise Navigator &mdash; automated notification
              </p>
            </div>
          `,
        });
      } catch (e) {
        console.error('Resend broker-request email failed:', e);
      }
    } else {
      console.log('[broker-request] RESEND_API_KEY not set. Request from:', user.email, '| Categories:', matchCategories);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[broker-request] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
