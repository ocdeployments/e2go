'use client';

import { useState, useCallback } from 'react';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TextInput({ value, onChange, placeholder, disabled }: TextInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className="w-full border px-4 py-3 text-[14px] transition-colors outline-none disabled:opacity-50"
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
