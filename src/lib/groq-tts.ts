// Groq TTS Service
// Officer voice for interview simulator
// Calls server-side API route (GROQ_API_KEY stays server-side)
// Uses Web Audio API for reliable post-gesture playback (bypasses Chrome autoplay policy)

let _audioCtx: AudioContext | null = null;
let _currentSource: AudioBufferSourceNode | null = null;
let _ttsAbortController: AbortController | null = null;

function getOrCreateAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

export async function resumeAudioContext(): Promise<void> {
  try {
    const ctx = getOrCreateAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
  } catch { /* silent */ }
}

// Stop any in-flight TTS fetch and any currently playing audio.
// Called before starting a new question or replaying the current one.
export function cancelTTS(): void {
  if (_ttsAbortController) {
    _ttsAbortController.abort();
    _ttsAbortController = null;
  }
  if (_currentSource) {
    try { _currentSource.stop(); } catch { /* already stopped */ }
    _currentSource = null;
  }
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
      _currentSource = source;
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (_currentSource === source) _currentSource = null;
        resolve();
      };
      source.start(0);
    } catch {
      resolve();
    }
  });
}

export async function speakQuestion(text: string): Promise<void> {
  // Cancel any previous in-flight request or playing audio
  cancelTTS();

  const controller = new AbortController();
  _ttsAbortController = controller;

  try {
    const response = await fetch('/api/simulator/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (!response.ok || controller.signal.aborted) return;

    const data = await response.json();
    if (controller.signal.aborted) return;

    if (data.fallbackToBrowser) {
      browserSpeak(text);
      return;
    }

    const { audioChunks } = data;
    if (!Array.isArray(audioChunks) || audioChunks.length === 0) return;

    for (const chunk of audioChunks) {
      if (controller.signal.aborted) return;
      await playAudioChunk(chunk);
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return;
    // Other errors: fail silently — text is still shown on screen
  } finally {
    if (_ttsAbortController === controller) _ttsAbortController = null;
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
