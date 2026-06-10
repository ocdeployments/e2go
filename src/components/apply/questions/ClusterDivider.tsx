'use client';

interface ClusterDividerProps {
  label: string;
}

export default function ClusterDivider({ label }: ClusterDividerProps) {
  return (
    <div className="my-8 flex items-center gap-4">
      <span
        className="text-[9px] uppercase tracking-[0.1em] shrink-0"
        style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {label}
      </span>
      <div
        className="h-px flex-1"
        style={{ backgroundColor: 'rgba(201,168,76,0.07)' }}
      />
    </div>
  );
}
