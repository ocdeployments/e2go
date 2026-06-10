'use client';

import { useState, useCallback } from 'react';

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export default function TextArea({ value, onChange, placeholder, rows = 4, disabled }: TextAreaProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full resize-none border px-4 py-3 text-[14px] leading-relaxed transition-colors outline-none disabled:opacity-50"
      style={{
        backgroundColor: 'transparent',
        borderColor: focused ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.12)',
        color: '#f5f0e8',
        fontFamily: "'DM Sans', sans-serif",
        borderRadius: 0,
      }}
    />
  );
}
