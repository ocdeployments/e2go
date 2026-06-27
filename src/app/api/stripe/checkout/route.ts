import { NextResponse } from 'next/server';

export async function HEAD() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return new NextResponse('Payment processing not configured', { status: 503 });
  }

  return new NextResponse('OK', { status: 200 });
}

export async function GET() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const testMode = secretKey?.startsWith('sk_test_') || false;

  return NextResponse.json({
    configured: !!secretKey,
    testMode,
  });
}