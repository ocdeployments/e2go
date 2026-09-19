import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

export async function POST(request: Request) {
  try {
    let body: { brand_slug?: string; brand_name?: string } | null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { brand_slug, brand_name } = body ?? {};

    if (!brand_slug) {
      return NextResponse.json({ error: 'brand_slug required' }, { status: 400 });
    }

    const authSupabase = await createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    const service = createServiceClient();
    const { error: insertError } = await service.from('franchise_brand_views').insert({
      user_id: user?.id ?? null,
      brand_slug,
      brand_name: brand_name ?? null,
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
