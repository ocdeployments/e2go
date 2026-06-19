import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { buildCaseProfile } from '@/lib/case-profile';
import { matchFranchises } from '@/lib/franchise-matcher';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const profile = await buildCaseProfile(user.id);
    const matches = await matchFranchises(profile);
    return NextResponse.json({ matches });
  } catch {
    return NextResponse.json({ error: 'Failed to load franchise matches' }, { status: 500 });
  }
}
