'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export default function TextArea({ value, onChange, onBlur, placeholder, disabled }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    setMicError(null);
    try {
      // Prefer built-in Mac mic to avoid Continuity/iPhone devices
      let deviceId: string | undefined;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');
        const builtIn = audioInputs.find(d =>
          /built.?in|macbook|internal/i.test(d.label)
        );
        deviceId = builtIn?.deviceId;
      } catch { /* fall through to default device */ }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: deviceId ? { deviceId: { exact: deviceId } } : true,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 1000) {
          // Too small — likely no audio captured
          setTranscribing(false);
          return;
        }

        setTranscribing(true);
        try {
          const form = new FormData();
          form.append('file', blob, 'recording.webm');
          const res = await fetch('/api/simulator/transcribe', { method: 'POST', body: form });
          const json = await res.json() as { transcript?: string; error?: string };
          if (json.transcript) {
            const trimmed = value.trim();
            onChange(trimmed ? `${trimmed} ${json.transcript.trim()}` : json.transcript.trim());
          }
        } catch {
          setMicError('Transcription failed. Please try again or type your answer.');
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowed')) {
        setMicError('Microphone access denied. Check browser settings.');
      } else {
        setMicError('Could not access microphone. Please type your answer.');
      }
    }
  }, [value, onChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const handleMicClick = useCallback(() => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [recording, startRecording, stopRecording]);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const hasMinimumWords = wordCount >= 20;
  const micSupported = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

  return (
    <div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); onBlur?.(value); }}
        className="w-full resize-none outline-none transition-colors disabled:opacity-50"
        style={{
          minHeight: '110px',
          backgroundColor: 'rgba(201,168,76,0.02)',
          border: recording
            ? '1px solid #C9A84C'
            : focused
              ? '1px solid rgba(201,168,76,0.45)'
              : '1px solid rgba(201,168,76,0.15)',
          boxShadow: recording ? '0 0 0 1px rgba(201,168,76,0.15)' : 'none',
          color: '#f5f0e8',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 300,
          fontSize: '14px',
          lineHeight: '1.7',
          padding: '14px 16px',
          borderRadius: 0,
        }}
      />

      {/* Voice input bar */}
      <div className="mt-2 flex items-center gap-2.5">
        {micSupported && !disabled && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={transcribing}
            className="inline-flex items-center gap-1.5 transition-all"
            style={{
              background: recording ? 'rgba(201,168,76,0.05)' : 'transparent',
              border: `1px solid ${recording ? '#C9A84C' : 'rgba(201,168,76,0.22)'}`,
              color: recording ? '#C9A84C' : transcribing ? 'rgba(245,240,232,0.4)' : 'rgba(245,240,232,0.72)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.08em',
              padding: '6px 14px',
              cursor: transcribing ? 'default' : 'pointer',
              borderRadius: 0,
              animation: recording ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {recording ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" />
                <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .34-.03.67-.09 1" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
            {transcribing ? 'Transcribing…' : recording ? 'Stop recording' : 'Speak your answer'}
          </button>
        )}

        {/* Waveform indicator (while recording) */}
        {recording && (
          <div className="flex items-center gap-[3px]">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="inline-block"
                style={{
                  width: '3px',
                  height: '12px',
                  backgroundColor: '#C9A84C',
                  animation: `waveform-bar 0.8s ease-in-out ${i * 0.1}s infinite`,
                  transformOrigin: 'center',
                }}
              />
            ))}
            <span
              className="ml-2"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '11px',
                fontWeight: 300,
                color: '#C9A84C',
              }}
            >
              Recording — click to stop
            </span>
          </div>
        )}

        {/* Word count (right-aligned) */}
        <span
          className="ml-auto"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '10px',
            fontWeight: 300,
            color: hasMinimumWords ? 'rgba(201,168,76,0.55)' : 'rgba(245,240,232,0.62)',
          }}
        >
          {wordCount} words{hasMinimumWords ? ' ✓' : ''}
        </span>
      </div>

      {/* Error message */}
      {micError && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#f87171', fontFamily: "'DM Sans', sans-serif" }}>
          {micError}
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style jsx>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.35); }
          50% { box-shadow: 0 0 0 5px rgba(201,168,76,0); }
        }
        @keyframes waveform-bar {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
