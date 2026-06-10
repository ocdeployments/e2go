'use client';

interface HelperTextProps {
  children: string;
}

export default function HelperText({ children }: HelperTextProps) {
  return (
    <p
      className="mt-2 text-[11px] leading-[1.6]"
      style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}
    >
      {children}
    </p>
  );
}
