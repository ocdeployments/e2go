'use client';

import { ReactNode } from 'react';

interface AdvisoryBlockProps {
  children: ReactNode;
}

export default function AdvisoryBlock({ children }: AdvisoryBlockProps) {
  return (
    <div
      className="mt-4 border-l-2"
      style={{
        borderLeftColor: 'rgba(201,168,76,0.40)',
        backgroundColor: 'rgba(201,168,76,0.03)',
        padding: '14px 16px',
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C9A84C"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            color: '#C9A84C',
          }}
        >
          Advisory
        </span>
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 300,
          color: 'rgba(245,240,232,0.55)',
          lineHeight: '1.6',
        }}
      >
        {children}
      </div>
    </div>
  );
}
