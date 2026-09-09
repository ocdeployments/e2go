import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import type { FamilyMember } from '../route';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json() as Partial<FamilyMember>;

  const { data, error } = await supabase
    .from('family_members')
    .update({
      first_name:      body.first_name,
      middle_name:     body.middle_name,
      last_name:       body.last_name,
      gender:          body.gender,
      date_of_birth:   body.date_of_birth,
      nationality:     body.nationality,
      passport_number: body.passport_number,
      role:            body.role,
      sort_order:      body.sort_order,
    })
    .eq('id', id)
    .eq('user_id', user.id) // enforce ownership
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id); // enforce ownership

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
