'use client';

import { useState } from 'react';

interface ComingSoonNotifyButtonProps {
  interestType: 'partnership' | 'renewal';
  label?: string;
}

/**
 * Captures interest from a logged-in user hitting a paused (Coming Soon)
 * feature — see coming_soon_interest table. Used by the module1 partnership
 * toggle and both case-profile Renewal Package cards so Romy can gauge
 * demand and manually unlock access instead of losing the lead.
 */
export default function ComingSoonNotifyButton({ interestType, label = 'Notify me' }: ComingSoonNotifyButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  async function handleClick() {
    setState('loading');
    try {
      const res = await fetch('/api/coming-soon-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestType }),
      });
      if (!res.ok) throw new Error('request failed');
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <span
        style={{
          flexShrink: 0,
          color: '#C9A84C',
          fontSize: '12px',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        ✓ We&apos;ll be in touch
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'loading'}
      style={{
        flexShrink: 0,
        background: 'rgba(201,168,76,0.12)',
        border: '1px solid rgba(201,168,76,0.3)',
        borderRadius: '6px',
        padding: '8px 16px',
        color: '#C9A84C',
        fontSize: '12px',
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 500,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        cursor: state === 'loading' ? 'default' : 'pointer',
      }}
    >
      {state === 'loading' ? 'Sending…' : state === 'error' ? 'Try again' : label}
    </button>
  );
}
