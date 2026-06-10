'use client';

interface CaseFileHeaderProps {
  name: string | null;
  nationality: string | null;
  businessName: string | null;
  targetCity: string | null;
  investmentAmount: string | null;
  applicationType?: 'solo' | 'partnership' | 'cos';
  lastActiveSection: string | null;
  lastActiveCluster: number | null;
  isReturning: boolean;
}

const SECTION_NAMES: Record<string, string> = {
  story: 'Your Story',
  business: 'Your Business',
  investment: 'Your Investment',
  qualifications: 'Your Qualifications',
  family: 'Your Family',
  ties: 'Your Ties',
};

export default function CaseFileHeader({
  name,
  nationality,
  businessName,
  targetCity,
  investmentAmount,
  lastActiveSection,
  lastActiveCluster,
  isReturning,
}: CaseFileHeaderProps) {
  const chips: string[] = [];
  if (nationality) chips.push(nationality);
  chips.push('E-2 Treaty Investor');
  if (targetCity) chips.push(targetCity);
  if (investmentAmount) chips.push(investmentAmount);
  if (businessName) chips.push(businessName);

  const firstName = name?.split(' ')[0] || null;
  const surname = name?.split(' ').slice(1).join(' ') || null;

  const sectionName = lastActiveSection ? SECTION_NAMES[lastActiveSection] || lastActiveSection : null;

  return (
    <div className="mb-10">
      {/* Welcome line */}
      <p
        className="mb-3 text-[11px] uppercase tracking-[0.12em]"
        style={{ color: 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}
      >
        {isReturning ? 'Welcome back' : 'Welcome'}
      </p>

      {/* Name line */}
      {firstName ? (
        <h1
          className="text-[28px] leading-tight font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif", color: '#f5f0e8' }}
        >
          {firstName}{' '}
          {surname && (
            <span style={{ fontStyle: 'italic', color: 'rgba(201,168,76,0.5)' }}>
              {surname}
            </span>
          )}
        </h1>
      ) : (
        <h1
          className="text-[24px] leading-tight font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: 'italic', color: '#C9A84C' }}
        >
          Your E-2 case file.
        </h1>
      )}

      {/* Meta chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center border px-3 py-1 text-[9px] uppercase tracking-[0.1em]"
            style={{
              borderColor: 'rgba(201,168,76,0.12)',
              color: 'rgba(245,240,232,0.55)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {chip}
          </span>
        ))}
      </div>

      {/* Gold rule */}
      <div className="mt-6 flex items-center gap-0">
        <div
          className="h-px"
          style={{
            width: '80px',
            backgroundColor: 'rgba(201,168,76,0.4)',
          }}
        />
        <div
          className="h-px flex-1"
          style={{
            backgroundColor: 'rgba(201,168,76,0.12)',
          }}
        />
      </div>

      {/* Resume/orientation strip */}
      {isReturning && sectionName ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className="text-sm"
            style={{ color: 'rgba(245,240,232,0.55)', fontFamily: "'DM Sans', sans-serif" }}
          >
            You left off in{' '}
            <span style={{ color: '#C9A84C' }}>{sectionName}</span>
            {lastActiveCluster ? ` — cluster ${lastActiveCluster}` : ''}.
            Ready to continue?
          </p>
          <a
            href={`/apply/${lastActiveSection || 'story'}`}
            className="inline-flex items-center border px-5 py-2 text-xs uppercase tracking-[0.1em] transition-colors hover:bg-[rgba(201,168,76,0.06)]"
            style={{
              borderColor: '#C9A84C',
              color: '#C9A84C',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Continue
          </a>
        </div>
      ) : !isReturning && name ? (
        <div className="mt-5">
          <p
            className="text-sm"
            style={{ color: 'rgba(245,240,232,0.55)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Your eligibility check is complete. Start with Section 1 —
            it takes about 8 minutes and sets the tone for everything that follows.
          </p>
        </div>
      ) : null}
    </div>
  );
}
