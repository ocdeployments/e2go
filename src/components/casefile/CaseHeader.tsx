'use client';

import Link from 'next/link';
import { GOLD, CREAM, CARD_BG, BORDER } from '@/components/casefile/tokens';
import ProgressRing from '@/components/casefile/ProgressRing';
import type { PersonSummary, NextBestAction } from '@/app/api/case/completion/route';

interface CaseHeaderProps {
  caseCode: string | null;
  packageLabel: string | null;
  people: PersonSummary[];
  progressPct: number;
  nextBestAction: NextBestAction | null;
}

const eyebrow: React.CSSProperties = {
  fontSize: '9px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'rgba(201,168,76,0.5)',
  fontFamily: "'DM Sans', sans-serif",
};

export default function CaseHeader({ caseCode, packageLabel, people, progressPct, nextBestAction }: CaseHeaderProps) {
  const principal = people.find((p) => p.role === 'principal');
  const coInvestor = people.find((p) => p.role === 'co_investor');
  const isPartnership = !!coInvestor;

  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: 0 }}>
        <ProgressRing progressPct={progressPct} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px',
              color: CREAM,
              lineHeight: 1.2,
              marginBottom: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {isPartnership ? `${principal?.name ?? 'You'} & ${coInvestor?.name}` : principal?.name ?? 'You'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {caseCode && <span style={eyebrow}>{caseCode}</span>}
            {packageLabel && (
              <>
                <span style={{ ...eyebrow, opacity: 0.4 }}>·</span>
                <span style={eyebrow}>{packageLabel}</span>
              </>
            )}
            {people.length > 1 && (
              <>
                <span style={{ ...eyebrow, opacity: 0.4 }}>·</span>
                <span style={eyebrow}>
                  {people.length} on file
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {nextBestAction && (
        <Link
          href={nextBestAction.href}
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            padding: '10px 18px',
            border: `1px solid ${GOLD}`,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              color: CREAM,
            }}
          >
            {nextBestAction.label}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: "'DM Sans', sans-serif",
              color: 'rgba(201,168,76,0.6)',
            }}
          >
            ~{nextBestAction.estimateMin} min
          </span>
        </Link>
      )}
    </div>
  );
}
