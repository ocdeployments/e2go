import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callAI } from '@/lib/ai';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const GENERIC_BULLETS = [
  'Management experience documented and ready for cover letter integration.',
  'Industry experience details captured to strengthen qualifications narrative.',
];

export async function POST(request: NextRequest) {
  try {
    // Session auth
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Missing applicationId' }, { status: 400 });
    }

    // Verify application ownership
    const { data: application } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();
    if (!application || application.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Load all followup_responses for this application
    const { data: responses, error: responsesError } = await supabase
      .from('followup_responses')
      .select('*')
      .eq('application_id', applicationId)
      .order('question_number', { ascending: true });

    if (responsesError) {
      console.error('Responses load error:', responsesError);
      return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 });
    }

    // Load voice_profile_text
    const { data: voiceProfile, error: voiceError } = await supabase
      .from('applicant_voice_profile')
      .select('voice_profile_text')
      .eq('application_id', applicationId)
      .single();

    if (voiceError) {
      console.error('Voice profile load error:', voiceError);
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json({ summary: GENERIC_BULLETS });
    }

    // Format responses for the prompt
    const formattedResponses = responses
      .map((r: Record<string, unknown>) => {
        const answerText = r.answer_text as string;
        const truncatedAnswer = answerText.length > 300
          ? answerText.substring(0, 300) + '...'
          : answerText;
        return `Q${r.question_number} [${r.gap_category}]: ${r.question_text}\nAnswer: ${truncatedAnswer}`;
      })
      .join('\n\n');

    const systemPrompt = `Review these follow-up conversation responses from
an E-2 visa applicant. Identify the 3-4 strongest
pieces of evidence or experience that will
strengthen their application.

Return ONLY a valid JSON array of strings.
Each string is one bullet point.
Each bullet must:
- Reference a SPECIFIC fact from their responses
- Connect it to a specific E-2 requirement
- Be 15-25 words maximum
- Start with the specific experience, not a generic claim

Example:
["12 years managing 47-person teams directly supports the executive role and develop-and-direct requirement"]

Return ONLY the JSON array. No other text.`;

    const userMessage = `FOLLOW-UP RESPONSES:\n${formattedResponses}\n\n${voiceProfile ? `VOICE PROFILE:\n${voiceProfile.voice_profile_text}\n` : ''}\n\nIdentify the strongest evidence from these responses.`;

    const aiResult = await callAI({
      systemPrompt,
      userPrompt: userMessage,
    });

    let summary: string[];

    if (aiResult.error || !aiResult.response) {
      console.error('AI summary error:', aiResult.error);
      // Generate generic bullets from response content
      summary = GENERIC_BULLETS;
    } else {
      try {
        const jsonMatch = aiResult.response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          summary = GENERIC_BULLETS;
        } else {
          summary = JSON.parse(jsonMatch[0]);
          if (!Array.isArray(summary) || summary.length === 0) {
            summary = GENERIC_BULLETS;
          }
        }
      } catch {
        console.error('JSON parse error for summary:', aiResult.response);
        summary = GENERIC_BULLETS;
      }
    }

    // Update lifecycle: followup_completed = true, module4_completed_at = now()
    await supabase
      .from('application_lifecycle')
      .update({
        followup_completed: true,
        module4_completed_at: new Date().toISOString(),
      })
      .eq('application_id', applicationId);

    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Completion summary error:', error);
    return NextResponse.json({ summary: GENERIC_BULLETS }, { status: 200 });
  }
}
