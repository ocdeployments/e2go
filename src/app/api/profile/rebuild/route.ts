import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildCaseProfile } from '@/lib/case-profile';

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fire-and-forget — return immediately, don't await the rebuild
    buildCaseProfile(user.id).catch((err) => {
      console.error('[profile/rebuild] Background rebuild failed:', err);
    });

    return NextResponse.json({ triggered: true });
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
