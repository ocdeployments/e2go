'use client';

import type { Confidence } from '@/types/document-upload';

type PreFillSource = 'quiz' | 'document_upload' | 'user_edited' | 'user_resolved_conflict';

interface PreFillBadgeProps {
  isOriginal: boolean;
  source?: PreFillSource;
  confidence?: Confidence | null;
}

export default function PreFillBadge({
  isOriginal,
  source,
  confidence,
}: PreFillBadgeProps) {
  // User resolved conflict — gold "Your choice" badge
  if (source === 'user_resolved_conflict') {
    return (
      <div
        className="mb-3 inline-flex items-center gap-2 border px-3 py-1"
        style={{ borderColor: 'rgba(201,168,76,0.2)' }}
      >
        <div
          className="h-1 w-1"
          style={{ backgroundColor: '#C9A84C' }}
        />
        <span
          className="text-[9px] uppercase tracking-[0.08em]"
          style={{
            color: 'rgba(201,168,76,0.5)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Your choice
        </span>
      </div>
    );
  }

  // Document upload badge — warm amber
  if (source === 'document_upload') {
    const isMediumConfidence = confidence === 'medium';

    return (
      <div
        className="mb-3 inline-flex items-center gap-2 border px-3 py-1"
        style={{
          borderColor: isMediumConfidence
            ? 'rgba(210,150,50,0.45)'
            : 'rgba(210,150,50,0.3)',
        }}
      >
        <div
          className="h-1 w-1"
          style={{
            backgroundColor: isMediumConfidence
              ? 'rgba(210,150,50,0.9)'
              : 'rgba(210,150,50,0.7)',
          }}
        />
        <span
          className="text-[9px] uppercase tracking-[0.08em]"
          style={{
            color: isMediumConfidence
              ? 'rgba(210,150,50,0.9)'
              : 'rgba(210,150,50,0.7)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {isMediumConfidence
            ? 'From your documents — please verify'
            : 'From your documents'}
        </span>
      </div>
    );
  }

  // User edited badge
  if (source === 'user_edited') {
    return (
      <div
        className="mb-3 inline-flex items-center gap-2 border px-3 py-1"
        style={{ borderColor: 'rgba(245,240,232,0.08)' }}
      >
        <div
          className="h-1 w-1"
          style={{ backgroundColor: 'rgba(245,240,232,0.2)' }}
        />
        <span
          className="text-[9px] uppercase tracking-[0.08em]"
          style={{
            color: 'rgba(245,240,232,0.28)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Edited
        </span>
      </div>
    );
  }

  // Default — quiz pre-fill or original
  return (
    <div
      className="mb-3 inline-flex items-center gap-2 border px-3 py-1"
      style={{
        borderColor: isOriginal ? 'rgba(201,168,76,0.22)' : 'rgba(245,240,232,0.08)',
      }}
    >
      <div
        className="h-1 w-1"
        style={{
          backgroundColor: isOriginal ? '#C9A84C' : 'rgba(245,240,232,0.2)',
        }}
      />
      <span
        className="text-[9px] uppercase tracking-[0.08em]"
        style={{
          color: isOriginal ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.28)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {isOriginal ? 'From your eligibility check' : 'Edited'}
      </span>
    </div>
  );
}
