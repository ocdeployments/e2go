'use client';

import { useState, useCallback } from 'react';
import { format, parseISO, isValid } from 'date-fns';

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

// Native date picker — stores an unambiguous ISO 8601 (yyyy-MM-dd) value so a
// date can never be misread as MM/DD vs DD/MM depending on the applicant's
// locale. date-fns renders a human-readable confirmation string underneath.
export default function DateInput({ value, onChange, disabled }: DateInputProps) {
  const [focused, setFocused] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const parsed = value ? parseISO(value) : null;
  const readable = parsed && isValid(parsed) ? format(parsed, 'MMMM d, yyyy') : null;

  return (
    <div>
      <input
        type="date"
        value={value}
        onChange={handleChange}
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
          colorScheme: 'dark',
        }}
      />
      {readable && (
        <div style={{ marginTop: '6px', fontSize: '11px', color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
          {readable}
        </div>
      )}
    </div>
  );
}
