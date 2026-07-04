import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'romyjames@gmail.com';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, subject, message } = body as {
      category: string;
      subject: string;
      message: string;
    };

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
    }

    const authSupabase = await createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    const userEmail = user?.email ?? (body.email as string | undefined) ?? 'anonymous';

    const service = createServiceClient();

    let applicationId: string | null = null;
    let caseCode: string | null = null;
    if (user?.id) {
      const { data: existingApp } = await service
        .from('applications')
        .select('id, case_code')
        .eq('user_id', user.id)
        .not('source', 'eq', 'simulator_standalone')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      applicationId = existingApp?.id ?? null;
      caseCode = existingApp?.case_code ?? null;
    }

    const { data: ticket, error } = await service
      .from('support_tickets')
      .insert({
        user_id: user?.id ?? null,
        user_email: userEmail,
        category: category || 'general',
        subject: subject.trim(),
        message: message.trim(),
        status: 'open',
        priority: 'normal',
        application_id: applicationId,
        case_code: caseCode,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[support/submit] DB error:', error);
      return NextResponse.json({ error: 'Failed to submit ticket.' }, { status: 500 });
    }

    await resend.emails.send({
      from: 'e2go Support <noreply@e2go.app>',
      to: ADMIN_EMAIL,
      subject: `[Support] ${subject.trim()}`,
      html: `
        <h2>New Support Ticket</h2>
        <p><strong>Ticket ID:</strong> ${ticket.id}</p>
        <p><strong>From:</strong> ${userEmail}</p>
        <p><strong>Category:</strong> ${category || 'general'}</p>
        <p><strong>Subject:</strong> ${subject.trim()}</p>
        <hr/>
        <p>${message.trim().replace(/\n/g, '<br/>')}</p>
      `,
    }).catch((err) => {
      console.error('[support/submit] Email error (non-fatal):', err);
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    console.error('[support/submit] Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
