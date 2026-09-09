import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { Redis } from '@upstash/redis';
import { captureApiError } from '@/lib/capture-error';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST() {
  const authClient = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;
  const admin = getAdminClient();

  // Verify the account is actually in soft-delete state before restoring
  const { data: profile } = await admin
    .from('profiles')
    .select('deleted_at')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.deleted_at) {
    return NextResponse.json({ error: 'Account is not scheduled for deletion.' }, { status: 400 });
  }

  // Clear the soft-delete flag
  const { error: restoreError } = await admin
    .from('profiles')
    .update({ deleted_at: null })
    .eq('id', userId);

  if (restoreError) {
    captureApiError(restoreError, { route: 'account/restore', userId });
    return NextResponse.json({ error: 'Failed to restore account. Please contact support.' }, { status: 500 });
  }

  // Invalidate middleware cache so the restored user gets access on next navigation
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN })
    : null;
  if (redis) {
    await redis.del(`mw:access:${userId}`);
  }

  return NextResponse.json({ restored: true });
}
