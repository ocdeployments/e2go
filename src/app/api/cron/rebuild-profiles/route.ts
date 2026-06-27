import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { buildCaseProfile } from '@/lib/case-profile';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin credentials');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret — blocks unauthenticated calls
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch all user IDs that have an application (excludes test/orphaned accounts)
  const { data: applications, error } = await supabase
    .from('applications')
    .select('user_id')
    .not('user_id', 'is', null);

  if (error) {
    console.error('[cron/rebuild-profiles] Failed to fetch user IDs:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const userIds = [...new Set((applications ?? []).map((a) => a.user_id as string))];
  console.log(`[cron/rebuild-profiles] Rebuilding profiles for ${userIds.length} users`);

  const results = { success: 0, failed: 0, errors: [] as string[] };

  for (const userId of userIds) {
    try {
      await buildCaseProfile(userId);
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${userId}: ${err instanceof Error ? err.message : String(err)}`);
      console.error(`[cron/rebuild-profiles] Failed for user ${userId}:`, err);
    }
  }

  console.log(`[cron/rebuild-profiles] Done — ${results.success} rebuilt, ${results.failed} failed`);
  return NextResponse.json({ ...results, total: userIds.length });
}
