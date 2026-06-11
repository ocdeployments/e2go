'use client';

import { useState, useCallback, useEffect } from 'react';
import useSpeechInput from '@/hooks/useSpeechInput';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

const MIC_SVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// Module-level: track whether the unsupported browser notice has been shown this page load
let noticeShownThisPageLoad = false;

export default function TextArea({ value, onChange, placeholder, rows = 4, disabled }: TextAreaProps) {
  const [focused, setFocused] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);

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

  const handleMicClick = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full resize-none border px-4 py-3 text-[14px] leading-relaxed transition-colors outline-none disabled:opacity-50"
        style={{
          backgroundColor: 'transparent',
          borderColor: focused ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.12)',
          color: '#f5f0e8',
          fontFamily: "'DM Sans', sans-serif",
          borderRadius: 0,
          paddingRight: supported && !disabled ? '40px' : undefined,
        }}
      />

      {/* Mic button — top-right corner of textarea */}
      {supported && !disabled && (
        <button
          type="button"
          onClick={handleMicClick}
          aria-label={listening ? 'Stop voice input' : 'Start voice input'}
          className="absolute top-2 right-2 flex items-center justify-center"
          style={{
            width: '28px',
            height: '28px',
            background: 'transparent',
            border: listening ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.25)',
            borderRadius: 0,
            cursor: 'pointer',
            color: listening ? '#C9A84C' : 'rgba(245,240,232,0.50)',
            animation: listening ? 'mic-pulse 1.5s ease-in-out infinite' : 'none',
            zIndex: 1,
          }}
        >
          {MIC_SVG}
        </button>
      )}

      {/* Listening indicator */}
      {listening && (
        <div
          className="absolute bottom-2 left-4 flex items-center gap-1.5"
          style={{
            fontSize: '12px',
            fontWeight: 300,
            color: '#C9A84C',
            fontFamily: "'DM Sans', sans-serif",
            zIndex: 1,
          }}
        >
          <span
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#C9A84C',
              display: 'inline-block',
            }}
          />
          Listening&hellip;
        </div>
      )}

      {/* Pulse animation keyframes */}
      <style jsx>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(201,168,76,0); }
        }
      `}</style>

      {/* One-time unsupported browser notice */}
      {showVoiceNotice && (
        <div
          className="flex items-start justify-between gap-3 mt-1.5"
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
