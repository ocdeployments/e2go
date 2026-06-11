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

const STATUS_STYLES: Record<string, { border: string; text: string }> = {
  complete: { border: 'rgba(201,168,76,0.30)', text: '#C9A84C' },
  active: { border: 'rgba(201,168,76,0.20)', text: '#C9A84C' },
  not_started: { border: 'rgba(201,168,76,0.12)', text: 'rgba(245,240,232,0.28)' },
  waiting: { border: 'rgba(201,168,76,0.08)', text: 'rgba(245,240,232,0.15)' },
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
}: SectionCardProps) {
  const styles = STATUS_STYLES[status];

  return (
    <a
      href={href}
      className="group block transition-all"
      style={{
        border: `1px solid ${styles.border}`,
        backgroundColor: 'rgba(201,168,76,0.015)',
        padding: '20px 24px',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.28)';
        e.currentTarget.style.backgroundColor = 'rgba(201,168,76,0.03)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = styles.border;
        e.currentTarget.style.backgroundColor = 'rgba(201,168,76,0.015)';
      }}
    >
      {/* Section number */}
      <p
        className="mb-1.5"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '9px',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: '#C9A84C',
        }}
      >
        Section {number}
      </p>

      {/* Section title */}
      <h3
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 300,
          fontStyle: 'italic',
          fontSize: '20px',
          color: '#f5f0e8',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="mt-1.5"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '12px',
          fontWeight: 300,
          color: 'rgba(245,240,232,0.40)',
          lineHeight: 1.6,
        }}
      >
        {subtitle}
      </p>

      {/* Completion state indicator */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Document chips */}
          {documents.map((doc) => (
            <span
              key={doc.label}
              className="inline-block border px-2 py-0.5"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '10px',
                fontWeight: 300,
                color: 'rgba(245,240,232,0.28)',
                borderColor: 'rgba(245,240,232,0.08)',
              }}
            >
              {doc.label}
            </span>
          ))}
        </div>

        {status === 'complete' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}

        {status === 'active' && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '10px',
              fontWeight: 300,
              color: 'rgba(201,168,76,0.55)',
            }}
          >
            {completionPct}% complete
          </span>
        )}

        {prefillCount > 0 && status !== 'complete' && (
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '10px',
              fontWeight: 300,
              color: 'rgba(201,168,76,0.40)',
            }}
          >
            {prefillCount} pre-filled
          </span>
        )}
      </div>
    </a>
  );
}
