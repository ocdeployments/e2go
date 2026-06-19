import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildCaseProfile } from '@/lib/case-profile';

async function rebuild() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const profile = await buildCaseProfile(user.id);
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: 'Profile build failed' }, { status: 500 });
  }
}

export const GET = rebuild;
export const POST = rebuild;
