// Sentry tunnel — proxies error reports through our domain so ad-blockers
// don't silently swallow them. Validates the envelope DSN before forwarding
// so this cannot be abused to tunnel arbitrary traffic to third parties.

import { NextRequest, NextResponse } from 'next/server';

const SENTRY_HOST = 'sentry.io';
const ALLOWED_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN ?? '';

function dsnProjectId(dsn: string): string | null {
  try {
    const url = new URL(dsn);
    return url.pathname.replace(/^\//, '');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const pieces = rawBody.split('\n');
    const header = JSON.parse(pieces[0] ?? '{}') as { dsn?: string };

    if (!header.dsn) {
      return NextResponse.json({ error: 'Missing DSN' }, { status: 400 });
    }

    // Validate: only forward envelopes whose DSN project matches ours.
    const incomingId = dsnProjectId(header.dsn);
    const allowedId = dsnProjectId(ALLOWED_DSN);
    if (!incomingId || !allowedId || incomingId !== allowedId) {
      return NextResponse.json({ error: 'DSN mismatch' }, { status: 400 });
    }

    const sentryUrl = `https://${SENTRY_HOST}/api/${incomingId}/envelope/`;

    const upstreamRes = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Forwarded-For': req.headers.get('x-forwarded-for') ?? '',
        'User-Agent': req.headers.get('user-agent') ?? '',
      },
      body: rawBody,
    });

    return new NextResponse(null, { status: upstreamRes.status });
  } catch (err) {
    console.error('Sentry tunnel error:', err);
    return NextResponse.json({ error: 'Tunnel error' }, { status: 500 });
  }
}
