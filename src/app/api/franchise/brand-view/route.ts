import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-service';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { captureApiError } from '@/lib/capture-error';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { brand_slug, brand_name } = body as { brand_slug: string; brand_name?: string };

    if (!brand_slug) {
      return NextResponse.json({ error: 'brand_slug required' }, { status: 400 });
    }

    const authSupabase = await createSupabaseServerClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    const service = createServiceClient();
    await service.from('franchise_brand_views').insert({
      user_id: user?.id ?? null,
      brand_slug,
      brand_name: brand_name ?? null,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    captureApiError(err, { route: 'franchise/brand-view' });
    return NextResponse.json({ error: 'Failed to log view' }, { status: 500 });
  }
}
