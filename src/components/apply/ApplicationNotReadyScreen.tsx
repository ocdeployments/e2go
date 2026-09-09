'use client';

interface ApplicationNotReadyScreenProps {
  onRetry: () => void;
}

export default function ApplicationNotReadyScreen({ onRetry }: ApplicationNotReadyScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6">
      <div className="max-w-md text-center">
        <h1
          className="text-2xl mb-3"
          style={{ color: '#f5f0e8', fontFamily: "'Cormorant Garamond', serif" }}
        >
          Setting Up Your Case File
        </h1>
        <p
          className="text-sm mb-8 leading-relaxed"
          style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif" }}
        >
          We couldn&apos;t find your case file yet. This usually resolves within a few seconds
          after checkout. If it&apos;s been longer than a minute, try again or head back to your
          case profile.
        </p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onRetry}
            className="text-sm transition-colors"
            style={{
              padding: '10px 20px',
              border: '1px solid rgba(201,168,76,0.5)',
              color: '#C9A84C',
              fontSize: '11px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              background: 'transparent',
            }}
          >
            Try again
          </button>
          <a
            href="/case-profile"
            className="text-sm transition-colors"
            style={{ color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Back to case profile
          </a>
        </div>
      </div>
    </div>
  );
}
