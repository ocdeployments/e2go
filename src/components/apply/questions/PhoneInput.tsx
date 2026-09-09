'use client';

import { useState, useCallback } from 'react';
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// International phone entry, format-aware via libphonenumber-js — no hardcoded
// US/Canada country default. Users type the leading "+<country code>" (e.g.
// "+44 7911 123456") and AsYouType progressively formats as they type; on blur
// the raw digits are normalized to E.164 if the number validates, so the same
// stored value works regardless of the applicant's country.
export default function PhoneInput({ value, onChange, placeholder, disabled }: PhoneInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = new AsYouType().input(e.target.value);
    onChange(formatted);
  }, [onChange]);

  const handleBlur = useCallback(() => {
    setFocused(false);
    if (value && isValidPhoneNumber(value)) {
      onChange(new AsYouType().input(value));
    }
  }, [value, onChange]);

  return (
    <input
      type="tel"
      value={value}
      onChange={handleChange}
      placeholder={placeholder ?? '+1 415 555 0100'}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
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
