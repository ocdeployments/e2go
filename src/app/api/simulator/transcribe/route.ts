import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function POST(request: NextRequest) {
  // Session auth
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'Transcription service not configured' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile || audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Invalid file' },
        { status: 400 }
      );
    }

    const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      );
    }

    // Build FormData for Groq
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile);
    groqFormData.append('model', 'whisper-large-v3-turbo');

    const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: groqFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq transcription error:', response.status, errorText);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
