'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import useSpeechInput from '@/hooks/useSpeechInput';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

// Module-level: track whether the unsupported browser notice has been shown this page load
let noticeShownThisPageLoad = false;

export default function TextArea({ value, onChange, placeholder, disabled }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSpeechResult = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (isFinal) {
        const trimmed = value.trim();
        const newValue = trimmed ? `${trimmed} ${transcript.trim()}` : transcript.trim();
        onChange(newValue);
      }
    },
    [value, onChange]
  );

  const { supported, listening, startListening, stopListening } = useSpeechInput({
    onResult: handleSpeechResult,
  });

  // Auto-resize textarea based on content
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // Show one-time voice notice for unsupported browsers (once per page load)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (supported) return;

    const dismissed = localStorage.getItem('e2go_voice_notice_dismissed');
    if (dismissed === 'true') return;
    if (noticeShownThisPageLoad) return;

    noticeShownThisPageLoad = true;
    setShowVoiceNotice(true);
  }, [supported]);

  const dismissNotice = useCallback(() => {
    setShowVoiceNotice(false);
    localStorage.setItem('e2go_voice_notice_dismissed', 'true');
  }, []);

  const handleMicClick = useCallback(async () => {
    if (listening) {
      stopListening();
      return;
    }

    // Pre-check microphone permission before starting speech recognition
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately — we just needed the permission prompt
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        // Permission denied — don't start recognition
        return;
      }
    }

    startListening();
  }, [listening, startListening, stopListening]);

  // Word count
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const hasMinimumWords = wordCount >= 20;

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
        onBlur={() => setFocused(false)}
        className="w-full resize-none outline-none transition-colors disabled:opacity-50"
        style={{
          minHeight: '110px',
          backgroundColor: 'rgba(201,168,76,0.02)',
          border: listening
            ? '1px solid #C9A84C'
            : focused
              ? '1px solid rgba(201,168,76,0.45)'
              : '1px solid rgba(201,168,76,0.15)',
          boxShadow: listening ? '0 0 0 1px rgba(201,168,76,0.15)' : 'none',
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
        {/* Mic button */}
        {supported && !disabled && (
          <button
            type="button"
            onClick={handleMicClick}
            className="inline-flex items-center gap-1.5 transition-all"
            style={{
              background: listening ? 'rgba(201,168,76,0.05)' : 'transparent',
              border: `1px solid ${listening ? '#C9A84C' : 'rgba(201,168,76,0.22)'}`,
              color: listening ? '#C9A84C' : 'rgba(245,240,232,0.40)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.08em',
              padding: '6px 14px',
              cursor: 'pointer',
              borderRadius: 0,
              animation: listening ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
            }}
          >
            {listening ? (
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
            {listening ? 'Stop recording' : 'Speak your answer'}
          </button>
        )}

        {/* Waveform indicator (while listening) */}
        {listening && (
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
              Listening — click to stop
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
            color: hasMinimumWords ? 'rgba(201,168,76,0.55)' : 'rgba(245,240,232,0.18)',
          }}
        >
          {wordCount} words{hasMinimumWords ? ' ✓' : ''}
        </span>
      </div>

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

      {/* One-time unsupported browser notice */}
      {showVoiceNotice && (
        <div
          className="mt-1.5 flex items-start justify-between gap-3"
          style={{
            fontSize: '12px',
            fontWeight: 300,
            color: 'rgba(245,240,232,0.40)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span>
            Voice input works in Chrome and Edge. You can type your answers instead.
          </span>
          <button
            type="button"
            onClick={dismissNotice}
            aria-label="Dismiss voice input notice"
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(245,240,232,0.40)',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: '14px',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
