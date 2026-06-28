import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json() as {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };

  const firstName  = body.firstName?.trim() ?? '';
  const middleName = body.middleName?.trim() || null;
  const lastName   = body.lastName?.trim() ?? '';

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: 'First name and last name are required' },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, first_name: firstName, middle_name: middleName, last_name: lastName },
      { onConflict: 'id' }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, firstName, middleName, lastName });
}
