import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { captureApiError } from '@/lib/capture-error';
import { EMAIL_SENDER, replyToUser } from '@/lib/emails/senders';
import { checkRateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = 'romyjames@gmail.com';

const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_CATEGORY_LENGTH = 50;
const MAX_EMAIL_LENGTH = 254;

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Ticket text is user-controlled and is interpolated into an HTML email to the admin.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    // Signed-in users are limited per account, anonymous callers per IP.
    const limit = await checkRateLimit(user?.id ? `user:${user.id}` : getClientIp(request), 'support-submit');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a while before sending another message.' },
        { status: 429, headers: { 'Retry-After': String(limit.reset) } }
      );
    }

    let body: Record<string, unknown> | null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const category = typeof body?.category === 'string' ? body.category.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message are required.' }, { status: 400 });
    }
    if (
      subject.length > MAX_SUBJECT_LENGTH ||
      message.length > MAX_MESSAGE_LENGTH ||
      category.length > MAX_CATEGORY_LENGTH
    ) {
      return NextResponse.json(
        { error: `Subject must be under ${MAX_SUBJECT_LENGTH} characters and message under ${MAX_MESSAGE_LENGTH}.` },
        { status: 400 }
      );
    }

    const suppliedEmail = typeof body?.email === 'string' ? body.email.trim().slice(0, MAX_EMAIL_LENGTH) : '';
    const userEmail = user?.email ?? (suppliedEmail || 'anonymous');

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
        subject,
        message,
        status: 'open',
        priority: 'normal',
        application_id: applicationId,
        case_code: caseCode,
      })
      .select('id')
      .single();

    if (error) {
      captureApiError(error, { route: 'support/submit', stage: 'db-insert', userId: user?.id });
      return NextResponse.json({ error: 'Failed to submit ticket.' }, { status: 500 });
    }

    await resend.emails.send({
      from: EMAIL_SENDER,
      // Hitting reply on a ticket alert answers the customer directly.
      replyTo: replyToUser(userEmail),
      to: ADMIN_EMAIL,
      subject: `[Support] ${subject.replace(/[\r\n]+/g, ' ')}`,
      html: `
        <h2>New Support Ticket</h2>
        <p><strong>Ticket ID:</strong> ${ticket.id}</p>
        <p><strong>From:</strong> ${escapeHtml(userEmail)}</p>
        <p><strong>Category:</strong> ${escapeHtml(category || 'general')}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <hr/>
        <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
      `,
    }).catch((err) => {
      captureApiError(err, { route: 'support/submit', stage: 'email-send', userId: user?.id });
    });

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (err) {
    captureApiError(err, { route: 'support/submit' });
    return NextResponse.json({ error: 'Unexpected error.' }, { status: 500 });
  }
}
