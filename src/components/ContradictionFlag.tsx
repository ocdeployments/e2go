'use client';

import { useState } from 'react';

interface ContradictionFlagProps {
  fieldALabel: string;
  fieldAValue: string;
  fieldBLabel: string;
  fieldBValue: string;
  onUseA: () => void;
  onUseB: () => void;
}

export default function ContradictionFlag({
  fieldALabel,
  fieldAValue,
  fieldBLabel,
  fieldBValue,
  onUseA,
  onUseB,
}: ContradictionFlagProps) {
  const [resolved, setResolved] = useState(false);

  if (resolved) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-3 p-3 mb-3 rounded-l border-l-2"
      style={{
        background: 'rgba(201,168,76,0.06)',
        borderLeftColor: 'rgba(201,168,76,0.6)',
      }}
    >
      {/* Amber warning icon */}
      <svg
        className="w-5 h-5 flex-shrink-0"
        viewBox="0 0 20 20"
        fill="currentColor"
        style={{ color: 'rgba(201,168,76,0.9)' }}
      >
        <path
          fillRule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>

      <div className="flex-1">
        <p className="text-xs font-normal" style={{ color: 'rgba(245,240,232,0.8)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
          These values should match. Which is correct?
        </p>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              setResolved(true);
              onUseA();
            }}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid #C9A84C',
              color: '#C9A84C',
            }}
          >
            Use &quot;{fieldAValue}&quot; ({fieldALabel})
          </button>
          <button
            onClick={() => {
              setResolved(true);
              onUseB();
            }}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              background: 'transparent',
              border: '1px solid #C9A84C',
              color: '#C9A84C',
            }}
          >
            Use &quot;{fieldBValue}&quot; ({fieldBLabel})
          </button>
        </div>
      </div>
    </div>
  );
}