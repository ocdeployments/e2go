'use client';

import { useEffect, useState } from 'react';
import type { SectionNudgeResponse } from '@/app/api/simulator/section-nudge/route';

interface SimulatorNudgeProps {
  section: 'investment' | 'qualifications' | 'business' | 'story' | 'ties';
}

const SECTION_LABELS: Record<string, string> = {
  investment:     'source of funds and investment',
  qualifications: 'your qualifications and management role',
  business:       'your business description',
  story:          'your personal background',
  ties:           'your home-country ties',
};

export default function SimulatorNudge({ section }: SimulatorNudgeProps) {
  const [nudge, setNudge] = useState<SectionNudgeResponse | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchNudge() {
      try {
        const res = await fetch(`/api/simulator/section-nudge?section=${section}`);
        if (!res.ok) return;
        const data: SectionNudgeResponse = await res.json();
        if (!data.hasNudge || !data.sessionId) return;

        // Check if already dismissed
        const dismissKey = `sim_nudge_${data.sessionId}_${section}`;
        if (localStorage.getItem(dismissKey) === '1') return;

        setNudge(data);
      } catch {
        // Non-blocking — silently skip nudge if fetch fails
      }
    }
    void fetchNudge();
  }, [section]);

  if (!nudge || dismissed) return null;

  const dismissKey = `sim_nudge_${nudge.sessionId}_${section}`;
  const label = SECTION_LABELS[section] ?? section;

  function handleDismiss() {
    localStorage.setItem(dismissKey, '1');
    setDismissed(true);
  }

  return (
    <div
      style={{
        margin: '0 0 24px 0',
        padding: '14px 16px',
        borderLeft: '3px solid #C9A84C',
        background: 'rgba(201,168,76,0.05)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        {/* Icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C9A84C"
          strokeWidth="1.5"
          style={{ flexShrink: 0, marginTop: '2px' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>

        <div style={{ flex: 1 }}>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              fontWeight: 500,
              color: '#C9A84C',
              margin: '0 0 4px 0',
              lineHeight: 1.4,
            }}
          >
            Simulator coaching flag — {label}
          </p>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '13px',
              color: 'rgba(245,240,232,0.70)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Your session {nudge.sessionNumber} flagged {nudge.weakCount} answer{nudge.weakCount !== 1 ? 's' : ''} in this area as needs-work. Strengthening your answers here will improve your interview readiness.
          </p>

          {nudge.tips.length > 0 && (
            <ul
              style={{
                margin: '8px 0 0 0',
                paddingLeft: '16px',
                listStyle: 'disc',
              }}
            >
              {nudge.tips.map((tip, i) => (
                <li
                  key={i}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '12px',
                    color: 'rgba(245,240,232,0.78)',
                    lineHeight: 1.5,
                    marginBottom: '2px',
                  }}
                >
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            color: 'rgba(245,240,232,0.70)',
            flexShrink: 0,
            lineHeight: 1,
          }}
          aria-label="Dismiss coaching nudge"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
