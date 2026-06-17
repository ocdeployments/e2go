// Groq TTS Service
// Officer voice for interview simulator
// Calls server-side API route (GROQ_API_KEY stays server-side)
// Uses Web Audio API for reliable post-gesture playback (bypasses Chrome autoplay policy)

let _audioCtx: AudioContext | null = null;

function getOrCreateAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

// Call this synchronously inside a user gesture (click handler) to unlock the
// AudioContext for the entire session — it stays 'running' even after async gaps.
export async function resumeAudioContext(): Promise<void> {
  try {
    const ctx = getOrCreateAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch { /* silent */ }
}

async function playAudioChunk(base64: string): Promise<void> {
  return new Promise(async (resolve) => {
    try {
      const ctx = getOrCreateAudioCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => resolve();
      source.start(0);
    } catch {
      resolve();
    }
  });
}

export async function speakQuestion(text: string): Promise<void> {
  try {
    const response = await fetch('/api/simulator/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) return;

    const data = await response.json();

    if (data.fallbackToBrowser) {
      browserSpeak(text);
      return;
    }

    const { audioChunks } = data;
    if (!Array.isArray(audioChunks) || audioChunks.length === 0) return;

    for (const chunk of audioChunks) {
      await playAudioChunk(chunk);
    }
  } catch {
    // Fail silently — text is still shown on screen
  }
}

function browserSpeak(text: string): void {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Truly last resort — silent failure
  }
}
