import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';
import { checkRateLimit } from '@/lib/rate-limit';
import { getBrandBySlug } from '@/data/franchise-brands';

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: Request) {
  try {
    const limit = await checkRateLimit(getClientIp(request), 'brand-view');
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(limit.reset) } }
      );
    }

    let body: { brand_slug?: string; brand_name?: string } | null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const brand_slug = typeof body?.brand_slug === 'string' ? body.brand_slug : '';

    if (!brand_slug) {
      return NextResponse.json({ error: 'brand_slug required' }, { status: 400 });
    }

    // Only log views of real brands, and take the name from our data rather
    // than the caller, so anonymous requests cannot write arbitrary rows.
    const brand = getBrandBySlug(brand_slug);
    if (!brand) {
      return NextResponse.json({ error: 'Unknown brand' }, { status: 404 });
    }

    const authSupabase = await createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    const service = createServiceClient();
    const { error: insertError } = await service.from('franchise_brand_views').insert({
      user_id: user?.id ?? null,
      brand_slug: brand.slug,
      brand_name: brand.name,
    });
    if (insertError) {
      captureApiError(insertError, { route: 'franchise/brand-view', stage: 'insert' });
      return NextResponse.json({ error: 'Failed to log view' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError(err, { route: 'franchise/brand-view' });
    return NextResponse.json({ error: 'Failed to log view' }, { status: 500 });
  }
}
