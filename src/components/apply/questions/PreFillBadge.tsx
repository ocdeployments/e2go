'use client';

interface PreFillBadgeProps {
  isOriginal: boolean;
}

export default function PreFillBadge({ isOriginal }: PreFillBadgeProps) {
  return (
    <div
      className="mb-3 inline-flex items-center gap-2 border px-3 py-1"
      style={{
        borderColor: isOriginal ? 'rgba(201,168,76,0.22)' : 'rgba(245,240,232,0.08)',
      }}
    >
      <div
        className="h-1 w-1"
        style={{
          backgroundColor: isOriginal ? '#C9A84C' : 'rgba(245,240,232,0.2)',
        }}
      />
      <span
        className="text-[9px] uppercase tracking-[0.08em]"
        style={{
          color: isOriginal ? 'rgba(201,168,76,0.5)' : 'rgba(245,240,232,0.28)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {isOriginal ? 'From your eligibility check' : 'Edited'}
      </span>
    </div>
  );
}
