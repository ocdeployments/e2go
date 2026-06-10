'use client';

import { ReactNode } from 'react';

interface RiskFlagProps {
  label?: string;
  children: ReactNode;
}

export default function RiskFlag({ label = 'Denial risk', children }: RiskFlagProps) {
  return (
    <div
      className="mt-4 border p-4"
      style={{
        borderColor: 'rgba(210,70,55,0.28)',
        backgroundColor: 'rgba(210,70,55,0.07)',
      }}
    >
      <p
        className="mb-2 text-[9px] uppercase tracking-[0.1em]"
        style={{ color: 'rgba(230,110,90,0.9)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </p>
      <div
        className="text-[11px] leading-[1.6]"
        style={{ color: 'rgba(245,240,232,0.6)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {children}
      </div>
    </div>
  );
}
