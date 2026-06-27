import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase-server';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// AI detection markers - phrases commonly found in AI-generated text
const AI_MARKERS = [
  'it is worth noting',
  'furthermore',
  'in conclusion',
  'it should be noted',
  'comprehensive',
  'crucial',
  'notably',
  'delve',
  'additionally',
  'moreover',
  'in summary',
  'ultimately',
  'essentially',
  'fundamentally',
  'significantly',
];

function detectAI(text: string): { score: number; flagged: boolean; passed: boolean } {
  const lowerText = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  let markerCount = 0;
  for (const marker of AI_MARKERS) {
    if (lowerText.includes(marker)) {
      markerCount++;
    }
  }

  const score = markerCount / sentenceCount;
  const flagged = score > 0.15;
  const passed = !flagged;

  return { score, flagged, passed };
}

function detectVocabularyLevel(text: string): 'accessible' | 'professional' | 'technical' | 'mixed' {
  const technicalTerms = [
    'algorithm', 'implementation', 'infrastructure', 'architecture',
    'compliance', 'regulatory', 'fiscal', 'strategic', 'operational',
    'transaction', 'investment', 'portfolio', 'derivative', 'equity'
  ];
  const professionalTerms = [
    'management', 'leadership', 'experience', 'team', 'strategy',
    'development', 'growth', 'performance', 'stakeholder', 'initiative'
  ];

  const lowerText = text.toLowerCase();
  const technicalCount = technicalTerms.filter(t => lowerText.includes(t)).length;
  const professionalCount = professionalTerms.filter(t => lowerText.includes(t)).length;

  if (technicalCount > 2 && professionalCount > 2) return 'mixed';
  if (technicalCount > 2) return 'technical';
  if (professionalCount > 2) return 'professional';
  return 'accessible';
}

function detectFormality(text: string): 'formal' | 'warm_formal' | 'conversational' | 'mixed' {
  const formalWords = ['therefore', 'pursuant', 'herein', 'regarding', 'accordingly'];
  const warmWords = ['love', 'passion', 'excited', 'happy', 'proud', 'dream'];

  const lowerText = text.toLowerCase();
  const formalCount = formalWords.filter(w => lowerText.includes(w)).length;
  const warmCount = warmWords.filter(w => lowerText.includes(w)).length;

  if (formalCount > 1 && warmCount > 1) return 'mixed';
  if (formalCount > 1) return 'formal';
  if (warmCount > 1) return 'warm_formal';
  return 'conversational';
}

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
    const { applicationId, voiceSampleText } = body;

    if (!applicationId || !voiceSampleText) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Run AI detection
    const { score, flagged, passed } = detectAI(voiceSampleText);
    const vocabularyLevel = detectVocabularyLevel(voiceSampleText);
    const formality = detectFormality(voiceSampleText);

    // Calculate average sentence length
    const sentences = voiceSampleText.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const wordCount = voiceSampleText.split(/\s+/).length;
    const sentenceLengthAvg = sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0;

    // Build voice_profile_text for prompt injection
    const voiceProfileText = `APPLICANT VOICE PROFILE:
Writing style: ${vocabularyLevel}, ${formality}
Characteristic approach: ${passed ? 'Natural, conversational writing with varied sentence structure.' : 'Writing shows signs of AI assistance - rephrase to sound more authentic.'}
Writing sample (match this voice in all documents):
${voiceSampleText}`;

    // Get user_id from application
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('user_id')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (application.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upsert voice profile
    const { error: voiceError } = await supabase
      .from('applicant_voice_profile')
      .upsert({
        application_id: applicationId,
        user_id: application.user_id,
        voice_sample_raw: voiceSampleText,
        voice_profile_text: voiceProfileText,
        sentence_length_avg: sentenceLengthAvg,
        vocabulary_level: vocabularyLevel,
        formality_register: formality,
        ai_detection_score: score,
        ai_detection_passed: passed,
        ai_detection_flagged: flagged,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'application_id',
      })
      .select()
      .single();

    if (voiceError) {
      console.error('Voice profile save error:', voiceError);
      return NextResponse.json({ error: 'Failed to save voice profile' }, { status: 500 });
    }

    // Update lifecycle: voice_sample_collected = true
    await supabase
      .from('application_lifecycle')
      .update({
        voice_sample_collected: true,
        module4_started_at: new Date().toISOString()
      })
      .eq('application_id', applicationId);

    return NextResponse.json({
      success: true,
      passed,
      flagged,
      score,
    });
  } catch (error) {
    console.error('Save voice sample error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
