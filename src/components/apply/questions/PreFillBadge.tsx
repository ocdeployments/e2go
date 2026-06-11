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
        className="mb-2 inline-flex items-center gap-1.5 border px-2 py-0.5"
        style={{
          borderColor: 'rgba(201,168,76,0.28)',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '10px',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: '#C9A84C',
          }}
        >
          ✦ Your choice
        </span>
      </div>
    );
  }

  // Document upload badge — warm amber
  if (source === 'document_upload') {
    const isMediumConfidence = confidence === 'medium';

    return (
      <div
        className="mb-2 inline-flex items-center gap-1.5 border px-2 py-0.5"
        style={{
          borderColor: isMediumConfidence
            ? 'rgba(251,146,60,0.25)'
            : 'rgba(251,191,36,0.25)',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '10px',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: isMediumConfidence
              ? 'rgba(251,146,60,0.80)'
              : 'rgba(251,191,36,0.80)',
          }}
        >
          {isMediumConfidence
            ? '◈ From your documents — please verify'
            : '◈ From your documents'}
        </span>
      </div>
    );
  }

  // User edited badge
  if (source === 'user_edited') {
    return (
      <div
        className="mb-2 inline-flex items-center gap-1.5 border px-2 py-0.5"
        style={{
          borderColor: 'rgba(245,240,232,0.08)',
        }}
      >
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '10px',
            fontWeight: 300,
            letterSpacing: '0.06em',
            color: 'rgba(245,240,232,0.28)',
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
      className="mb-2 inline-flex items-center gap-1.5 border px-2 py-0.5"
      style={{
        borderColor: isOriginal ? 'rgba(201,168,76,0.28)' : 'rgba(245,240,232,0.08)',
      }}
    >
      <span
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '10px',
          fontWeight: 300,
          letterSpacing: '0.06em',
          color: isOriginal ? '#C9A84C' : 'rgba(245,240,232,0.28)',
        }}
      >
        {isOriginal ? '✦ From your eligibility check' : 'Edited'}
      </span>
    </div>
  );
}
