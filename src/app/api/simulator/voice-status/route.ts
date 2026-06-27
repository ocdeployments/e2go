import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/simulator/voice-status — tells the client (which has no access to
// server-only env vars) whether voice mode is configured on this deployment.
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const configured = !!process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 0;
  return NextResponse.json({ available: configured });
}
