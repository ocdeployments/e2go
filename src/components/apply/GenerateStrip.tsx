'use client';

interface GenerateStripProps {
  isUnlocked: boolean;
  completedCount: number;
  totalCount: number;
  onGenerate: () => void;
  generating: boolean;
}

export default function GenerateStrip({
  isUnlocked,
  completedCount,
  totalCount,
  onGenerate,
  generating,
}: GenerateStripProps) {
  return (
    <div
      className="mt-10 border p-6"
      style={{ borderColor: 'rgba(201,168,76,0.12)' }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {isUnlocked ? (
            <>
              <p
                className="text-sm font-light"
                style={{ color: '#C9A84C', fontFamily: "'Cormorant Garamond', serif" }}
              >
                Your case file is ready — generate your documents
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: 'rgba(245,240,232,0.4)', fontFamily: "'DM Sans', sans-serif" }}
              >
                This process takes 3–5 minutes. Each document will be written
                specifically for your case.
              </p>
            </>
          ) : (
            <>
              <p
                className="text-sm"
                style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
              >
                Complete all {totalCount} sections to generate your case file
              </p>
              <p
                className="mt-1 text-[11px]"
                style={{ color: 'rgba(245,240,232,0.15)', fontFamily: "'DM Sans', sans-serif" }}
              >
                {completedCount} of {totalCount} sections complete
              </p>
            </>
          )}
        </div>

        <button
          onClick={onGenerate}
          disabled={!isUnlocked || generating}
          className="shrink-0 border px-8 py-3 text-xs uppercase tracking-[0.1em] transition-colors disabled:cursor-not-allowed"
          style={{
            borderColor: isUnlocked ? '#C9A84C' : 'rgba(245,240,232,0.08)',
            color: isUnlocked ? '#C9A84C' : 'rgba(245,240,232,0.15)',
            background: isUnlocked ? 'rgba(201,168,76,0.04)' : 'transparent',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            if (isUnlocked && !generating) {
              e.currentTarget.style.backgroundColor = 'rgba(201,168,76,0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (isUnlocked) {
              e.currentTarget.style.backgroundColor = 'rgba(201,168,76,0.04)';
            }
          }}
        >
          {generating ? 'Starting...' : 'Generate Case File'}
        </button>
      </div>
    </div>
  );
}
