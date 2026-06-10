'use client';

import { ReactNode } from 'react';

interface QuestionPanelProps {
  sectionTitle: string;
  clusterLabel: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  answeredCount: number;
  totalCount: number;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
}

export default function QuestionPanel({
  sectionTitle,
  clusterLabel,
  saveStatus,
  answeredCount,
  totalCount,
  onBack,
  onNext,
  children,
}: QuestionPanelProps) {
  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col lg:min-h-screen">
      {/* Top bar */}
      <div
        className="sticky top-12 z-20 flex items-center justify-between border-b px-5 py-3 lg:top-0"
        style={{
          borderColor: 'rgba(201,168,76,0.12)',
          backgroundColor: '#0a0a0a',
        }}
      >
        <div className="flex items-center gap-3">
          <h2
            className="text-[15px] font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
          >
            {sectionTitle}
          </h2>
          <span
            className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em]"
            style={{
              borderColor: 'rgba(245,240,232,0.08)',
              color: 'rgba(245,240,232,0.28)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {clusterLabel}
          </span>
        </div>

        {/* Autosave indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-1.5 w-1.5 ${saveStatus === 'saving' ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: saveStatus === 'saving'
                ? '#C9A84C'
                : saveStatus === 'saved'
                  ? '#10B981'
                  : saveStatus === 'error'
                    ? '#EF4444'
                    : 'rgba(245,240,232,0.15)',
            }}
          />
          <span
            className="text-[9px] uppercase tracking-[0.08em]"
            style={{
              color: saveStatus === 'saving'
                ? '#C9A84C'
                : saveStatus === 'saved'
                  ? '#10B981'
                  : 'rgba(245,240,232,0.15)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {saveStatus === 'saving' && 'Saving'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Error'}
            {saveStatus === 'idle' && ''}
          </span>
        </div>
      </div>

      {/* Question body */}
      <div className="flex-1 px-5 py-8 lg:px-8">
        {children}
      </div>

      {/* Footer */}
      <div
        className="sticky bottom-0 z-20 flex items-center justify-between border-t px-5 py-4 lg:px-8"
        style={{
          borderColor: 'rgba(201,168,76,0.12)',
          backgroundColor: '#0a0a0a',
        }}
      >
        <button
          onClick={onBack}
          className="border px-5 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(245,240,232,0.03)]"
          style={{
            borderColor: 'rgba(245,240,232,0.08)',
            color: 'rgba(245,240,232,0.28)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Back
        </button>

        <span
          className="text-[11px]"
          style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
        >
          {answeredCount} of {totalCount} answered
        </span>

        <button
          onClick={onNext}
          className="border px-5 py-2 text-[11px] uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(201,168,76,0.06)]"
          style={{
            borderColor: '#C9A84C',
            color: '#C9A84C',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
