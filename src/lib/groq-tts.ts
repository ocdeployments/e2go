// Groq TTS Service
// Officer voice for interview simulator
// Calls server-side API route (GROQ_API_KEY stays server-side)

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

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  } catch {
    // Fail silently — text is still shown on screen
  }
}
