import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const SECTION_PREFIXES: Record<string, string[]> = {
  story:          ['M3-S1-', 'M3-A-'],
  business:       ['M3-E-', 'M3-G-', 'M3-K-'],
  investment:     ['M3-F-', 'M3-H-', 'M3-I-'],
  qualifications: ['M3-Q-', 'M3-V-'],
  family:         ['M3-L-'],
  ties:           ['M3-T-'],
};

const SECTION_COMPLETE_THRESHOLD: Record<string, number> = {
  story:          5,
  business:       6,
  investment:     4,
  qualifications: 4,
  family:         3,
  ties:           3,
};

export type SectionStatus = 'none' | 'partial' | 'complete';

export interface SectionCompletion {
  story:          SectionStatus;
  business:       SectionStatus;
  investment:     SectionStatus;
  qualifications: SectionStatus;
  family:         SectionStatus;
  ties:           SectionStatus;
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's primary application (not simulator standalone)
    const { data: apps } = await supabase
      .from('applications')
      .select('id, source')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const primaryApp = (apps ?? []).find(
      (a: { source: string | null }) => a.source !== 'simulator_standalone'
    );

    if (!primaryApp) {
      return NextResponse.json({
        story: 'none', business: 'none', investment: 'none',
        qualifications: 'none', family: 'none', ties: 'none',
      } satisfies SectionCompletion);
    }

    const { data: answers } = await supabase
      .from('answers')
      .select('question_key')
      .eq('application_id', primaryApp.id)
      .not('answer_value', 'is', null)
      .neq('answer_value', '');

    const counts: Record<string, number> = {
      story: 0, business: 0, investment: 0, qualifications: 0, family: 0, ties: 0,
    };

    for (const row of (answers ?? [])) {
      for (const [section, prefixes] of Object.entries(SECTION_PREFIXES)) {
        if (prefixes.some(p => row.question_key.startsWith(p))) {
          counts[section]++;
          break;
        }
      }
    }

    const result: SectionCompletion = {
      story:          toStatus(counts.story,          SECTION_COMPLETE_THRESHOLD.story),
      business:       toStatus(counts.business,       SECTION_COMPLETE_THRESHOLD.business),
      investment:     toStatus(counts.investment,     SECTION_COMPLETE_THRESHOLD.investment),
      qualifications: toStatus(counts.qualifications, SECTION_COMPLETE_THRESHOLD.qualifications),
      family:         toStatus(counts.family,         SECTION_COMPLETE_THRESHOLD.family),
      ties:           toStatus(counts.ties,           SECTION_COMPLETE_THRESHOLD.ties),
    };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'private, max-age=30' },
    });
  } catch {
    return NextResponse.json({
      story: 'none', business: 'none', investment: 'none',
      qualifications: 'none', family: 'none', ties: 'none',
    } satisfies SectionCompletion);
  }
}

function toStatus(count: number, completeAt: number): SectionStatus {
  if (count === 0) return 'none';
  if (count >= completeAt) return 'complete';
  return 'partial';
}
