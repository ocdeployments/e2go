import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

async function callGroqTTS(text: string): Promise<string[]> {
  const response = await fetch(`${GROQ_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'playai-tts',
      input: text,
      voice: 'Fritz-PlayAI',
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq TTS HTTP ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return [Buffer.from(audioBuffer).toString('base64')];
}

async function callOpenAITTS(text: string): Promise<string[]> {
  const response = await fetch(`${OPENAI_BASE_URL}/audio/speech`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'onyx',
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI TTS HTTP ${response.status}`);
  }

  const audioBuffer = await response.arrayBuffer();
  return [Buffer.from(audioBuffer).toString('base64')];
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'tts');
  if (!rl.allowed) {
    return NextResponse.json({ audioChunks: [], fallbackToBrowser: true });
  }

  if (!GROQ_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json({ error: 'TTS service not configured' }, { status: 503 });
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.length > 4000) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Primary: Groq PlayAI TTS (no chunk limit)
    if (GROQ_API_KEY) {
      try {
        const audioChunks = await callGroqTTS(text);
        return NextResponse.json({ audioChunks });
      } catch (groqError) {
        console.warn('[tts] Groq failed, falling back to OpenAI TTS:', groqError);
      }
    }

    // Fallback: OpenAI TTS
    if (OPENAI_API_KEY) {
      try {
        const audioChunks = await callOpenAITTS(text);
        return NextResponse.json({ audioChunks });
      } catch (openaiError) {
        console.warn('[tts] OpenAI TTS failed:', openaiError);
      }
    }

    // Emergency: signal client to use browser SpeechSynthesis
    return NextResponse.json({ audioChunks: [], fallbackToBrowser: true });
  } catch (error) {
    console.error('[tts] Unexpected error:', error);
    return NextResponse.json({ audioChunks: [], fallbackToBrowser: true });
  }
}
