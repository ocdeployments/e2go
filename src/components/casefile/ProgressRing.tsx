import { GOLD, CREAM, BORDER } from '@/components/casefile/tokens';

interface ProgressRingProps {
  progressPct: number;
  size?: number;
  strokeWidth?: number;
}

export default function ProgressRing({ progressPct, size = 56, strokeWidth = 4 }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, progressPct));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={BORDER} strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={GOLD}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '13px',
          fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif",
          color: CREAM,
        }}
      >
        {clamped}%
      </div>
    </div>
  );
}
