import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

async function transcribeWithGroq(audioFile: File): Promise<string> {
  const groqFormData = new FormData();
  groqFormData.append('file', audioFile);
  groqFormData.append('model', 'whisper-large-v3-turbo');

  const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
    body: groqFormData,
  });

  if (!response.ok) {
    throw new Error(`Groq STT HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

async function transcribeWithOpenAI(audioFile: File): Promise<string> {
  const openaiFormData = new FormData();
  openaiFormData.append('file', audioFile);
  openaiFormData.append('model', 'whisper-1');

  const response = await fetch(`${OPENAI_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: openaiFormData,
  });

  if (!response.ok) {
    throw new Error(`OpenAI STT HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

export async function POST(request: NextRequest) {
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY && !OPENAI_API_KEY) {
    return NextResponse.json({ error: 'Transcription service not configured' }, { status: 503 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile || audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Invalid file' }, { status: 400 });
    }

    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Primary: Groq Whisper (faster inference)
    if (GROQ_API_KEY) {
      try {
        const text = await transcribeWithGroq(audioFile);
        return NextResponse.json({ text });
      } catch (groqError) {
        console.warn('[transcribe] Groq STT failed, falling back to OpenAI Whisper:', groqError);
      }
    }

    // Fallback: OpenAI Whisper
    if (OPENAI_API_KEY) {
      try {
        const text = await transcribeWithOpenAI(audioFile);
        return NextResponse.json({ text });
      } catch (openaiError) {
        console.error('[transcribe] OpenAI Whisper also failed:', openaiError);
      }
    }

    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  } catch (error) {
    console.error('[transcribe] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
