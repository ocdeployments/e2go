'use client';

import { useState } from 'react';
import type { PreparationStatus } from '@/types/document-upload';

interface DocumentUploadCardProps {
  preparationStatus: PreparationStatus;
}

export default function DocumentUploadCard({ preparationStatus }: DocumentUploadCardProps) {
  const [dismissed, setDismissed] = useState(false);

  // Scratch users see a compact link, not the full card
  if (preparationStatus === 'scratch' || dismissed) {
    return (
      <div className="mb-6 text-center">
        <a
          href="/apply/upload"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] transition-colors hover:text-[#C9A84C]"
          style={{
            color: 'rgba(245,240,232,0.3)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span
            className="inline-block h-1 w-1"
            style={{ backgroundColor: 'rgba(201,168,76,0.4)' }}
          />
          Have existing documents? Upload them
          <span style={{ color: 'rgba(201,168,76,0.5)' }}>&rarr;</span>
        </a>
      </div>
    );
  }

  const headline =
    preparationStatus === 'near_complete'
      ? 'Upload your documents and we will find what is missing'
      : 'Upload what you have and we will build on it';

  return (
    <div
      className="mb-8 border p-6 sm:p-8"
      style={{ borderColor: 'rgba(201,168,76,0.12)' }}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className="text-sm"
          style={{ color: '#C9A84C' }}
        >
          &#9670;
        </span>
        <h3
          className="text-xs uppercase tracking-[0.1em]"
          style={{
            color: '#C9A84C',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          Document intake
        </h3>
      </div>

      <p
        className="mb-2 text-[11px] leading-relaxed"
        style={{
          color: 'rgba(245,240,232,0.5)',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '15px',
          fontWeight: 300,
        }}
      >
        {headline}
      </p>
      <p
        className="mb-6 text-[11px] leading-relaxed"
        style={{
          color: 'rgba(245,240,232,0.35)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        We will read them, pre-fill your case file, and show you exactly
        what is still missing.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href="/apply/upload"
          className="inline-flex items-center justify-center border px-6 py-2.5 text-[11px] uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(201,168,76,0.06)]"
          style={{
            borderColor: '#C9A84C',
            color: '#C9A84C',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          Upload documents
          <span className="ml-2">&rarr;</span>
        </a>

        <button
          onClick={() => setDismissed(true)}
          className="inline-flex items-center justify-center px-6 py-2.5 text-[11px] uppercase tracking-[0.1em] transition-colors hover:text-[rgba(245,240,232,0.5)]"
          style={{
            color: 'rgba(245,240,232,0.25)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
