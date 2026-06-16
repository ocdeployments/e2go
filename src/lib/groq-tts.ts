// Groq TTS Service
// Officer voice for interview simulator
// Calls server-side API route (GROQ_API_KEY stays server-side)

function playAudioChunk(base64: string): Promise<void> {
  return new Promise((resolve) => {
    const audioUrl = `data:audio/wav;base64,${base64}`;
    const audio = new Audio(audioUrl);
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    audio.play().catch(() => resolve());
  });
}

export async function speakQuestion(text: string): Promise<void> {
  try {
    const response = await fetch('/api/simulator/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      return;
    }

    const { audioChunks } = await response.json();
    if (!Array.isArray(audioChunks)) return;

    for (const chunk of audioChunks) {
      await playAudioChunk(chunk);
    }
  } catch {
    // Fail silently — text is still shown on screen
  }
}
