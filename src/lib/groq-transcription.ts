// Groq Whisper Transcription Service
// Used for voice mode in the interview simulator
// Generated: June 5, 2026

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

/**
 * Transcribes audio using Groq's Whisper model.
 * @param audioBlob - The audio data to transcribe
 * @returns The transcribed text
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  try {
    // Convert blob to buffer for FormData
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create FormData with the audio file
    const formData = new FormData();
    const fileName = `recording_${Date.now()}.webm`;
    const file = new File([buffer], fileName, { type: 'audio/webm' });
    formData.append('file', file);
    formData.append('model', 'whisper-large-v3-turbo');

    const response = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq transcription error:', response.status, errorText);
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    return data.text || '';

  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

/**
 * Checks if Groq transcription is available/configured.
 */
export function isGroqConfigured(): boolean {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
}