'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API type declarations (not in TypeScript std lib)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor | undefined;
    webkitSpeechRecognition: SpeechRecognitionConstructor | undefined;
  }
}

interface UseSpeechInputOptions {
  lang?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
}

interface UseSpeechInputReturn {
  supported: boolean;
  listening: boolean;
  startListening: () => void;
  stopListening: () => void;
  transcript: string;
}

export default function useSpeechInput(
  options: UseSpeechInputOptions = {}
): UseSpeechInputReturn {
  const { lang = 'en-US', onResult } = options;

  const [supported, setSupported] = useState<boolean>(false);
  const [listening, setListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Check browser support on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      setSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          onResultRef.current?.(finalTranscript, true);
          setTranscript(finalTranscript);
        } else if (interimTranscript) {
          onResultRef.current?.(interimTranscript, false);
          setTranscript(interimTranscript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech') {
          // Silently stop listening
          setListening(false);
          setTranscript('');
          return;
        }
        if (event.error === 'not-allowed') {
          setSupported(false);
          setListening(false);
          setTranscript('');
          return;
        }
        // All other errors — stop listening, log
        console.warn('Speech recognition error:', event.error);
        setListening(false);
        setTranscript('');
      };

      recognition.onend = () => {
        setListening(false);
        setTranscript('');
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Already stopped
        }
      }
    };
  }, [lang]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;

    // Stop any existing session first
    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped
    }

    setTranscript('');
    setListening(true);

    try {
      recognitionRef.current.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch {
      // Already stopped
    }

    setListening(false);
  }, []);

  return {
    supported,
    listening,
    startListening,
    stopListening,
    transcript,
  };
}
