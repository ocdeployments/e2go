import { NextResponse } from 'next/server';
import { buildPerspectiveEmail } from '@/lib/emails/quiz-nurture';
import { buildPackageReadyEmail } from '@/lib/emails/generation-emails';

// Dev-only email template preview, gated off in production. Returns the
// raw email HTML document directly (not wrapped in the app's RootLayout)
// so it renders exactly as a real email client would receive it.
export async function GET(
  _req: Request,
  { params }: { params: { template: string } },
) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  let html: string;
  switch (params.template) {
    case 'quiz-nurture-perspective':
      html = buildPerspectiveEmail({
        email: 'preview@example.com',
        country: 'Canada',
        hasViewedResults: false,
      }).html;
      break;
    case 'package-ready':
      html = buildPackageReadyEmail(
        'https://example.com/documents/preview',
        ['business_plan', 'cover_letter'],
        'preview@example.com',
      ).html;
      break;
    default:
      return new NextResponse('Not found', { status: 404 });
  }

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
