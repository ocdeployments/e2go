'use client';

interface SectionCardDocument {
  label: string;
  primary: boolean;
}

interface SectionCardProps {
  number: string;
  title: string;
  subtitle: string;
  documents: SectionCardDocument[];
  prefillCount: number;
  completionPct: number;
  status: 'complete' | 'active' | 'not_started' | 'waiting';
  href: string;
  badge?: string;
}

const STATUS_STYLES: Record<string, { border: string; text: string; bg: string }> = {
  complete: { border: '#10B981', text: '#10B981', bg: 'rgba(16,185,129,0.06)' },
  active: { border: '#C9A84C', text: '#C9A84C', bg: 'rgba(201,168,76,0.06)' },
  not_started: { border: 'rgba(245,240,232,0.12)', text: 'rgba(245,240,232,0.28)', bg: 'transparent' },
  waiting: { border: 'rgba(245,240,232,0.08)', text: 'rgba(245,240,232,0.15)', bg: 'transparent' },
};

const STATUS_LABELS: Record<string, string> = {
  complete: 'Complete',
  active: 'In progress',
  not_started: 'Not started',
  waiting: 'Waiting',
};

export default function SectionCard({
  number,
  title,
  subtitle,
  documents,
  prefillCount,
  completionPct,
  status,
  href,
  badge,
}: SectionCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <a
      href={href}
      className="group block border transition-colors hover:bg-[rgba(201,168,76,0.03)]"
      style={{
        borderColor: 'rgba(201,168,76,0.12)',
        background: styles.bg,
      }}
    >
      {/* Top rule */}
      <div
        className="h-px"
        style={{
          backgroundColor: status === 'complete'
            ? '#C9A84C'
            : status === 'active'
              ? 'rgba(201,168,76,0.6)'
              : 'transparent',
        }}
      />

      <div className="p-5">
        {/* Top row: number + status */}
        <div className="mb-3 flex items-center justify-between">
          <span
            className="text-[9px] uppercase tracking-[0.1em]"
            style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Section {number}
          </span>
          <span
            className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.1em]"
            style={{
              borderColor: styles.border,
              color: styles.text,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>

        {/* Title */}
        <h3
          className="mb-1 text-[15px] font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
        >
          {title}
        </h3>
        <p
          className="mb-4 text-[11px]"
          style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}
        >
          {subtitle}
        </p>

        {/* Document chips */}
        {documents.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {documents.map((doc) => (
              <span
                key={doc.label}
                className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em]"
                style={{
                  borderColor: doc.primary
                    ? 'rgba(201,168,76,0.3)'
                    : 'rgba(245,240,232,0.08)',
                  color: doc.primary
                    ? 'rgba(201,168,76,0.6)'
                    : 'rgba(245,240,232,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {doc.label}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: gems + badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Pre-fill gems */}
            {prefillCount > 0 && (
              <div className="flex items-center gap-1.5">
                {Array.from({ length: Math.min(prefillCount, 5) }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 w-1"
                    style={{ backgroundColor: '#C9A84C' }}
                  />
                ))}
                <span
                  className="text-[9px] ml-0.5"
                  style={{ color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {prefillCount} pre-filled
                </span>
              </div>
            )}
            {prefillCount === 0 && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1 w-1"
                  style={{ backgroundColor: 'rgba(245,240,232,0.12)' }}
                />
              </div>
            )}
          </div>

          {/* Badge */}
          {badge && (
            <span
              className="border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em]"
              style={{
                borderColor: 'rgba(245,240,232,0.08)',
                color: 'rgba(245,240,232,0.28)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Completion bar */}
        {completionPct > 0 && (
          <div className="mt-3 h-px w-full" style={{ backgroundColor: 'rgba(245,240,232,0.06)' }}>
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${completionPct}%`,
                backgroundColor: status === 'complete' ? '#10B981' : '#C9A84C',
              }}
            />
          </div>
        )}
      </div>
    </a>
  );
}
