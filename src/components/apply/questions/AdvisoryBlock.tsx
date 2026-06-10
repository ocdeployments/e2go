'use client';

import { ReactNode } from 'react';

interface AdvisoryBlockProps {
  children: ReactNode;
}

export default function AdvisoryBlock({ children }: AdvisoryBlockProps) {
  return (
    <div
      className="mt-4 border p-4"
      style={{
        borderColor: 'rgba(201,168,76,0.22)',
        backgroundColor: 'rgba(201,168,76,0.05)',
      }}
    >
      <div
        className="text-[11px] leading-[1.6]"
        style={{ color: 'rgba(245,240,232,0.6)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {children}
      </div>
    </div>
  );
}
