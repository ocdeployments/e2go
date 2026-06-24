'use client';

import { useEffect, useRef, useState } from 'react';

interface GenerationProgressProps {
  /** When true, bar runs. When it flips to false, bar snaps to 100% briefly. */
  isActive: boolean;
  /** How long the operation typically takes, in seconds. Controls easing speed. */
  estimatedSeconds?: number;
  /** Status messages cycled during generation. Must have ≥1 entry. */
  steps?: string[];
  /** Compact variant — bar only, no status text row. */
  compact?: boolean;
  /** Show "usually takes ~Xs" hint below. */
  showEstimate?: boolean;
}

/**
 * Animated progress bar for long-running background operations.
 * Uses exponential easing to approach 95% over estimatedSeconds,
 * then snaps to 100% when isActive flips false.
 *
 * Designed for the e2go Obsidian Gold design system.
 */
export default function GenerationProgress({
  isActive,
  estimatedSeconds = 30,
  steps = ['Processing…'],
  compact = false,
  showEstimate = false,
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepVisible, setStepVisible] = useState(true);
  const [done, setDone] = useState(false);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isActive) {
      // Snap to 100% then mark done
      setProgress(100);
      setDone(true);
      if (tickRef.current) clearInterval(tickRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
      return;
    }

    // Reset on start
    setProgress(0);
    setStepIndex(0);
    setDone(false);
    setStepVisible(true);
    startRef.current = Date.now();

    // Progress ticker — asymptotic approach to 95%
    tickRef.current = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const target = 95 * (1 - Math.exp((-2.5 * elapsed) / estimatedSeconds));
      setProgress(prev => Math.max(prev, Math.min(94, target)));
    }, 200);

    // Step cycling — every 4 s with 400 ms fade
    if (steps.length > 1) {
      cycleRef.current = setInterval(() => {
        setStepVisible(false);
        setTimeout(() => {
          setStepIndex(i => (i + 1) % steps.length);
          setStepVisible(true);
        }, 400);
      }, 4000);
    }

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [isActive, estimatedSeconds, steps]);

  const pct = Math.round(progress);

  return (
    <div style={{ width: '100%' }}>
      {/* ── Row: bar + percentage ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Track */}
        <div style={{
          flex: 1,
          position: 'relative',
          height: compact ? '3px' : '4px',
          background: 'rgba(201,168,76,0.10)',
          borderRadius: '99px',
          overflow: 'visible',
        }}>
          {/* Fill */}
          <div style={{
            position: 'absolute',
            inset: 0,
            right: `${100 - pct}%`,
            background: done
              ? 'linear-gradient(90deg, rgba(74,222,128,0.5) 0%, #4ade80 100%)'
              : 'linear-gradient(90deg, rgba(201,168,76,0.4) 0%, #C9A84C 100%)',
            borderRadius: '99px',
            transition: 'right 0.35s ease-out, background 0.5s ease',
          }} />

          {/* Shimmer glow on leading edge */}
          {isActive && pct < 100 && pct > 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: `${pct}%`,
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#C9A84C',
              boxShadow: '0 0 10px 4px rgba(201,168,76,0.45)',
              transition: 'left 0.35s ease-out',
              pointerEvents: 'none',
            }} />
          )}

          {/* Done glow */}
          {done && (
            <div style={{
              position: 'absolute',
              top: '50%',
              right: 0,
              transform: 'translate(0, -50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#4ade80',
              boxShadow: '0 0 10px 4px rgba(74,222,128,0.4)',
            }} />
          )}
        </div>

        {/* Percentage */}
        {!compact && (
          <span style={{
            fontSize: '11px',
            fontFamily: "'DM Sans', monospace",
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: done ? '#4ade80' : 'rgba(201,168,76,0.85)',
            minWidth: '32px',
            textAlign: 'right' as const,
            transition: 'color 0.5s ease',
          }}>
            {done ? '✓' : `${pct}%`}
          </span>
        )}
      </div>

      {/* ── Status message ───────────────────────────────────────── */}
      {!compact && (
        <div style={{ marginTop: '10px', minHeight: '16px' }}>
          <p style={{
            margin: 0,
            fontSize: '12px',
            fontFamily: "'DM Sans', sans-serif",
            color: done ? 'rgba(74,222,128,0.7)' : 'rgba(245,240,232,0.35)',
            opacity: stepVisible ? 1 : 0,
            transition: 'opacity 0.4s ease',
            letterSpacing: '0.02em',
          }}>
            {done ? 'Complete' : steps[stepIndex]}
          </p>
        </div>
      )}

      {/* ── Estimate hint ─────────────────────────────────────────── */}
      {showEstimate && isActive && !done && (
        <p style={{
          margin: '6px 0 0',
          fontSize: '11px',
          fontFamily: "'DM Sans', sans-serif",
          color: 'rgba(245,240,232,0.18)',
          letterSpacing: '0.02em',
        }}>
          Usually takes ~{estimatedSeconds < 60
            ? `${estimatedSeconds}s`
            : `${Math.round(estimatedSeconds / 60)} min`}
        </p>
      )}
    </div>
  );
}
