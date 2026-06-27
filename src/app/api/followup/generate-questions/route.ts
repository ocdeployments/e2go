import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callAI } from '@/lib/ai';
import { getOperationalNeeds } from '@/lib/business-operational-needs';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const DEFAULT_QUESTIONS = [
  {
    id: 'q1',
    gap_category: 'personal_connection',
    question_text: 'What first drew you to this specific type of business?',
    why_it_matters: 'Your personal connection to the business strengthens the credibility of your investment decision',
    question_number: 1
  },
  {
    id: 'q2',
    gap_category: 'management_experience',
    question_text: 'Can you describe a time when you managed a team or led a project? How many people were involved and what was the outcome?',
    why_it_matters: 'Specific examples of management experience directly support your executive role and develop-and-direct requirement',
    question_number: 2
  },
  {
    id: 'q3',
    gap_category: 'industry_experience',
    question_text: 'Have you ever worked with, cared for, or spent significant time with the customers this business will serve?',
    why_it_matters: 'Even indirect experience with your target customer base strengthens your qualifications narrative',
    question_number: 3
  },
  {
    id: 'q4',
    gap_category: 'financial_management',
    question_text: 'Have you ever managed a budget, handled financial decisions for a business, or been responsible for profit and loss?',
    why_it_matters: 'Financial management experience demonstrates readiness to develop and direct the enterprise',
    question_number: 4
  },
  {
    id: 'q5',
    gap_category: 'motivation',
    question_text: 'What do you want your life to look like in 5 years as a result of this investment?',
    why_it_matters: 'Your long-term vision demonstrates genuine commitment to the enterprise beyond the visa itself',
    question_number: 5
  }
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

    // Load Case Brief from case_briefs table
    const { data: caseBrief } = await supabase
      .from('case_briefs')
      .select('case_brief_json')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load Module 3 answers
    const { data: answers, error: answersError } = await supabase
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', applicationId);

    if (answersError) {
      console.error('Answers load error:', answersError);
    }

    // Build context from answers
    const answersMap: Record<string, string> = {};
    if (answers) {
      for (const row of answers) {
        answersMap[row.question_key] = row.answer_value;
      }
    }

    // Extract business type from answers (looking for business_type or similar)
    // The quiz stores business_type in quiz_sessions.result_json.business_type
    // and as Q0-business-type in the answers map. Try multiple sources.
    let businessType = answersMap['business_type'] ||
                        answersMap['Q0-business-type'] ||
                        answersMap['qb-type'] ||
                        answersMap['qf-type'] ||
                        null;

    // Fallback: query quiz_sessions table (authoritative source for business type)
    if (!businessType) {
      const { data: quizSession } = await supabase
        .from('quiz_sessions')
        .select('business_type')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      businessType = quizSession?.business_type || 'the selected business type';
    }

    // Get applicant background summary - find Tab J answers
    const tabJAnswers = Object.entries(answersMap)
      .filter(([key]) => key.startsWith('qj-'))
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const experienceScore = caseBrief?.case_brief_json?.experience_score || caseBrief?.case_brief_json?.substantiality_score || 'unknown';
    const contentGaps = caseBrief?.case_brief_json?.content_gaps || [];

    const systemPrompt = `You are helping prepare an E-2 visa application.
Based on the applicant's case brief and answers,
identify information gaps that would strengthen
their application documents if filled.

Generate between 5 and 8 questions maximum.
Each question must:
- Address a specific gap in this specific application
- Be conversational — not interrogative
- Include a "why_it_matters" explanation (one sentence)
- Be answerable in 2-5 sentences
- Target hidden experience the applicant may not
  think to mention

Gap categories to probe (in priority order):
1. Direct experience in this specific industry
2. Management and operations experience with numbers
3. Personal connection to this specific business type
4. Family or community involvement in relevant sector
5. Volunteer or informal experience in relevant field
6. Prior business ownership or management
7. Specific measurable achievements in work history
8. Personal motivation — why this business specifically

Return ONLY a valid JSON array. No other text.
Format:
[
  {
    "id": "q1",
    "gap_category": "category name",
    "question_text": "The actual question",
    "why_it_matters": "One sentence why this matters",
    "question_number": 1
  }
]`;

    const userMessage = `CASE BRIEF SUMMARY:
Experience score: ${experienceScore}
Framing decisions: ${contentGaps.join(', ') || 'standard framing'}
Content gaps identified: ${contentGaps.join(', ') || 'none identified'}

BUSINESS TYPE: ${businessType}
APPLICANT BACKGROUND SUMMARY: ${tabJAnswers || 'No Tab J answers available'}

Generate questions targeting the specific gaps
in this application.`;

    const aiResult = await callAI({
      systemPrompt,
      userPrompt: userMessage,
    });

    if (aiResult.error || !aiResult.response) {
      console.error('AI generation error:', aiResult.error);
      return NextResponse.json({ questions: DEFAULT_QUESTIONS });
    }

    // Parse JSON response
    try {
      // Try to extract JSON from response (in case there's extra text)
      const jsonMatch = aiResult.response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const questions = JSON.parse(jsonMatch[0]);

      // Validate and sanitize questions
      const validQuestions = questions
        .filter((q: Record<string, unknown>) => q.question_text && q.gap_category)
        .map((q: Record<string, unknown>, index: number) => ({
          id: q.id || `q${index + 1}`,
          gap_category: q.gap_category,
          question_text: q.question_text,
          why_it_matters: q.why_it_matters || 'This helps strengthen your application',
          question_number: q.question_number || index + 1,
        }))
        .slice(0, 7); // Leave room for potential targeted question (max 8 total per Spec2)

      // Layer 0: Targeted experience-gap question when experience_score = WEAK
      // Per Spec1 Category B: experience_score < ADEQUATE and follow_up_not_completed
      const isWeakExperience = experienceScore === 'WEAK' || experienceScore === 'CRITICAL';
      if (isWeakExperience) {
        const categoryNeeds = getOperationalNeeds(businessType || '');
        if (categoryNeeds) {
          const demandLabels = categoryNeeds.operational_demands
            .slice(0, 3)
            .map(d => d.label)
            .join(', ');

          const targetedPrompt = `This applicant's background shows little direct connection to ${categoryNeeds.category_name}.
This business requires people who can handle: ${demandLabels}.

Generate ONE warm, conversational follow-up question (per Spec2's tone — never clinical)
that asks the applicant about experiences from ANY part of their life — work, family,
volunteering, hobbies, military, education — that might relate to these specific demands.

Do NOT list the business's operational needs to the applicant verbatim.
Ask naturally, the way Spec2's existing templates do.

Return ONLY a JSON object with these fields:
{
  "id": "q_targeted",
  "gap_category": "experience_bridge",
  "question_text": "The question",
  "why_it_matters": "One sentence why this matters",
  "question_number": 1
}`;

          const targetedResult = await callAI({
            systemPrompt: 'You generate a single follow-up question for an E-2 visa applicant.',
            userPrompt: targetedPrompt,
          });

          if (targetedResult.response) {
            try {
              const targetedMatch = targetedResult.response.match(/\{[\s\S]*\}/);
              if (targetedMatch) {
                const targetedQ = JSON.parse(targetedMatch[0]);
                if (targetedQ.question_text) {
                  // Prepend targeted question, keep within 8-question cap
                  validQuestions.unshift({
                    id: targetedQ.id || 'q_targeted',
                    gap_category: targetedQ.gap_category || 'experience_bridge',
                    question_text: targetedQ.question_text,
                    why_it_matters: targetedQ.why_it_matters || 'This helps surface transferable experience',
                    question_number: 1,
                  });
                }
              }
            } catch (e) {
              console.warn('[FOLLOWUP] Targeted question parse failed:', e);
            }
          }
        }
      }

      // Final cap at 8 questions per Spec2
      const finalQuestions = validQuestions.slice(0, 8);

      // Renumber questions sequentially
      finalQuestions.forEach((q: { question_number: number }, i: number) => { q.question_number = i + 1; });

      if (finalQuestions.length === 0) {
        return NextResponse.json({ questions: DEFAULT_QUESTIONS });
      }

      return NextResponse.json({ questions: finalQuestions });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, aiResult.response);
      return NextResponse.json({ questions: DEFAULT_QUESTIONS });
    }
  } catch (error) {
    console.error('Generate questions error:', error);
    return NextResponse.json({ questions: DEFAULT_QUESTIONS }, { status: 200 });
  }
}
