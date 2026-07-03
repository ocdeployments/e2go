/**
 * POST /api/gap-analysis/run
 *
 * Merged endpoint: runs both LLM jobs triggered on gap-analysis page load
 * in a single round-trip instead of N+1 parallel requests.
 *
 * Replaces concurrent calls to:
 *   /api/gap-analysis/enrich      (N calls, one per weak category)
 *   /api/gap-analysis/semantic-eval (1 call)
 *
 * Returns: { enrichments: Record<categoryId, string|null>, semanticResults: Record<fieldId, ...> }
 *
 * Enrichment/semantic-eval logic lives in @/lib/gap-analysis-enrichment so
 * the Interview Prep Kit (prep-kit/route.ts) can reuse the identical
 * category narrative and field ratings this page shows the user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { enrichCategory, runSemanticEval, type WeakCategory } from '@/lib/gap-analysis-enrichment';

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'gap-analysis-run');
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before running another analysis.' },
      { status: 429, headers: { 'Retry-After': String(rl.reset) } }
    );
  }

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  if (!process.env.OPENROUTER_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ enrichments: {}, semanticResults: {} });
  }

  let body: { applicationId: string; weakCategories: WeakCategory[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { applicationId, weakCategories } = body;
  if (!applicationId) {
    return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
  }

  // Verify ownership
  const serviceSupabase = getServiceSupabase();
  const { data: app } = await serviceSupabase
    .from('applications')
    .select('user_id, business_name')
    .eq('id', applicationId)
    .single();

  if (!app || app.user_id !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Fire enrichment + semantic eval in parallel
  const [enrichmentResults, semanticResults] = await Promise.all([
    weakCategories?.length > 0
      ? Promise.all(weakCategories.map(enrichCategory))
      : Promise.resolve([]),
    runSemanticEval(applicationId, app.business_name ?? null),
  ]);

  const enrichments: Record<string, string | null> = {};
  for (const { id, enrichment } of enrichmentResults) {
    enrichments[id] = enrichment;
  }

  return NextResponse.json({ enrichments, semanticResults });
}
