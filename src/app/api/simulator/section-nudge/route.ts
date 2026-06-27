import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

// Question IDs that map to each case-file section.
// A weak/inconsistent answer on any of these triggers a nudge on that section page.
const SECTION_QUESTION_MAP: Record<string, string[]> = {
  investment:     ['UQ-03', 'UQ-04', 'UQ-05', 'WP-01', 'WP-02', 'GP-01'],
  qualifications: ['UQ-02', 'UQ-07', 'WP-03', 'GP-02'],
  business:       ['UQ-01', 'UQ-06', 'GP-03'],
  story:          ['UQ-01', 'UQ-07', 'WP-03'],
  ties:           ['UQ-09', 'WP-04', 'WP-05'],
};

export interface SectionNudgeResponse {
  hasNudge: boolean;
  sessionId: string | null;
  sessionNumber: number | null;
  weakCount: number;
  tips: string[];
  section: string;
}

// GET /api/simulator/section-nudge?section=investment
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const section = request.nextUrl.searchParams.get('section') || '';
    const relevantQIds = SECTION_QUESTION_MAP[section];
    if (!relevantQIds) {
      return NextResponse.json<SectionNudgeResponse>({
        hasNudge: false,
        sessionId: null,
        sessionNumber: null,
        weakCount: 0,
        tips: [],
        section,
      });
    }

    // Find the user's latest application
    const { data: app } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!app) {
      return NextResponse.json<SectionNudgeResponse>({
        hasNudge: false, sessionId: null, sessionNumber: null, weakCount: 0, tips: [], section,
      });
    }

    // Latest completed simulator session for this application
    const { data: session } = await supabase
      .from('simulator_sessions')
      .select('id, session_number, coaching_notes')
      .eq('application_id', app.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json<SectionNudgeResponse>({
        hasNudge: false, sessionId: null, sessionNumber: null, weakCount: 0, tips: [], section,
      });
    }

    // Get weak/inconsistent answers for relevant question IDs
    const { data: answers } = await supabase
      .from('simulator_answers')
      .select('question_id, rating')
      .eq('session_id', session.id)
      .in('rating', ['weak', 'inconsistent'])
      .in('question_id', relevantQIds);

    const weakCount = answers?.length ?? 0;

    if (weakCount === 0) {
      return NextResponse.json<SectionNudgeResponse>({
        hasNudge: false, sessionId: session.id, sessionNumber: session.session_number, weakCount: 0, tips: [], section,
      });
    }

    // Pull coaching tips relevant to this section from coaching_notes
    const coachingNotes = session.coaching_notes as { top3NextSession?: string[] } | null;
    const allTips = coachingNotes?.top3NextSession ?? [];

    // Return up to 2 tips
    const tips = allTips.slice(0, 2);

    return NextResponse.json<SectionNudgeResponse>({
      hasNudge: true,
      sessionId: session.id,
      sessionNumber: session.session_number as number,
      weakCount,
      tips,
      section,
    });
  } catch (error) {
    console.error('[section-nudge] Error:', error);
    return NextResponse.json<SectionNudgeResponse>({
      hasNudge: false, sessionId: null, sessionNumber: null, weakCount: 0, tips: [], section: '',
    });
  }
}
