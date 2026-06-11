'use client';

import { ReactNode } from 'react';

interface RiskFlagProps {
  label?: string;
  children: ReactNode;
}

export default function RiskFlag({ label = 'Denial risk', children }: RiskFlagProps) {
  return (
    <div
      className="mt-4 border-l-2"
      style={{
        borderLeftColor: 'rgba(239,68,68,0.45)',
        backgroundColor: 'rgba(239,68,68,0.03)',
        padding: '14px 16px',
      }}
    >
      <div className="mb-1.5 flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(239,68,68,0.80)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(239,68,68,0.80)',
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 300,
          color: 'rgba(245,240,232,0.50)',
          lineHeight: '1.6',
        }}
      >
        {children}
      </div>
    </div>
  );
}
