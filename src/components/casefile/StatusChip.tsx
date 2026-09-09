import { GOLD, GREEN } from '@/components/casefile/tokens';
import type { CardState } from '@/app/api/case/completion/route';

interface StatusChipProps {
  state: CardState;
}

const MUTED_DOT = 'rgba(245,240,232,0.25)';
const MUTED_TEXT = 'rgba(245,240,232,0.4)';

const STATUS_STYLES: Record<CardState, { dot: string; text: string; label: string }> = {
  locked: { dot: MUTED_DOT, text: MUTED_TEXT, label: 'Locked' },
  not_started: { dot: MUTED_DOT, text: MUTED_TEXT, label: 'Not started' },
  in_progress: { dot: GOLD, text: GOLD, label: 'In progress' },
  ready: { dot: GREEN, text: GREEN, label: 'Ready' },
  generated: { dot: GREEN, text: GREEN, label: 'Generated' },
};

export default function StatusChip({ state }: StatusChipProps) {
  const style = STATUS_STYLES[state];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: "'DM Sans', sans-serif",
          color: style.text,
        }}
      >
        {style.label}
      </span>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '9999px',
          background: style.dot,
          flexShrink: 0,
        }}
      />
    </span>
  );
}
