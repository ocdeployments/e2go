import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface FamilyMember {
  id: string;
  member_type: 'co_investor' | 'spouse' | 'child';
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  role: string | null;
  sort_order: number;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ members: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as Partial<FamilyMember>;

  if (!body.member_type) {
    return NextResponse.json({ error: 'member_type is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      user_id:         user.id,
      member_type:     body.member_type,
      first_name:      body.first_name ?? null,
      middle_name:     body.middle_name ?? null,
      last_name:       body.last_name ?? null,
      gender:          body.gender ?? null,
      date_of_birth:   body.date_of_birth ?? null,
      nationality:     body.nationality ?? null,
      passport_number: body.passport_number ?? null,
      role:            body.role ?? null,
      sort_order:      body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data }, { status: 201 });
}
