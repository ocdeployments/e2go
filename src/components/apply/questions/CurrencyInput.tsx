'use client';

import { useState, useCallback } from 'react';

interface CurrencyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function toDisplay(raw: string): string {
  const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function CurrencyInput({ value, onChange, placeholder, disabled }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.replace(/[^0-9.]/g, ''));
  }, [onChange]);

  return (
    <div
      className="flex items-center"
      style={{
        border: `1px solid ${focused ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.12)'}`,
        backgroundColor: 'transparent',
        transition: 'border-color 0.15s',
      }}
    >
      <span
        style={{
          padding: '12px 14px',
          color: 'rgba(201,168,76,0.65)',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '14px',
          fontWeight: 300,
          borderRight: '1px solid rgba(201,168,76,0.10)',
          lineHeight: 1,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        $
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={focused ? value : toDisplay(value)}
        onChange={handleChange}
        placeholder={placeholder || '0'}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 py-3 text-[14px] outline-none disabled:opacity-50"
        style={{
          backgroundColor: 'transparent',
          color: '#f5f0e8',
          fontFamily: "'DM Sans', sans-serif",
          borderRadius: 0,
        }}
      />
    </div>
  );
}
