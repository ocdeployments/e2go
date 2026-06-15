import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Orpheus requires <=200 chars per request — split on sentence boundaries.
function chunkText(text: string, maxLen = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxLen) {
      if (current.trim()) chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.length > 0 ? chunks : [text.substring(0, maxLen)];
}

export async function POST(request: NextRequest) {
  // Session auth
  const supabaseAuth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'TTS service not configured' },
      { status: 503 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.length > 4000) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      );
    }

    const chunks = chunkText(text);
    const audioChunks: string[] = [];

    for (const chunk of chunks) {
      const response = await fetch(`${GROQ_BASE_URL}/audio/speech`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'canopylabs/orpheus-v1-english',
          input: chunk,
          voice: 'daniel',
          response_format: 'mp3',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Groq TTS error:', response.status, errorText);
        return NextResponse.json(
          { error: 'TTS generation failed' },
          { status: 502 }
        );
      }

      const audioBuffer = await response.arrayBuffer();
      audioChunks.push(Buffer.from(audioBuffer).toString('base64'));
    }

    return NextResponse.json({ audioChunks });
  } catch (error) {
    console.error('TTS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
