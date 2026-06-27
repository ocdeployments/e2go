'use client';

import Link from 'next/link';

export interface TeaserData {
  country: string;
  investment_range: string;
  application_type: string;
  answers: Record<string, string | string[]>;
  outcome: string;
}

function buildOpening(data: TeaserData): string {
  const country = data.country || 'my treaty country';
  const rawType = (data.answers['Q0-08a'] as string) || '';
  const isPartnership =
    data.application_type === 'partnership' ||
    data.application_type === 'spousal_partnership';

  let businessDesc = 'a new commercial enterprise';
  if (/franchise/i.test(rawType)) businessDesc = 'a franchise business unit';
  else if (/acquisition|existing independent/i.test(rawType))
    businessDesc = 'an established operating business';

  const partnerNote = isPartnership ? ', together with my co-investor,' : '';

  const range = data.investment_range || '';
  const lower = range.includes('$')
    ? (range.split('–')[0] || range.split('—')[0] || range.split('-')[0] || '').trim()
    : '';
  const investNote = lower
    ? ` I have committed ${lower} — fully at risk and irrevocable — to the capitalisation of this enterprise.`
    : '';

  return `I, the undersigned, am a national and citizen of ${country}. I${partnerNote} respectfully submit this application for classification as an E-2 Treaty Investor pursuant to INA § 101(a)(15)(E)(ii) and 9 FAM 402.9.${investNote} My investment in ${businessDesc} is substantial relative to the total cost of establishing the enterprise. I will be entering the United States solely for the purpose of developing and directing this investment, for which I possess the requisite qualifications and industry expertise.`;
}

export default function DocumentTeaser({
  data,
  isLoggedIn,
}: {
  data: TeaserData;
  isLoggedIn: boolean;
}) {
  if (data.outcome !== 'PROCEED' && data.outcome !== 'PROCEED_RISK') return null;

  const opening = buildOpening(data);

  return (
    <div style={{ padding: '40px 0', borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <div style={{ width: '28px', height: '1px', background: 'rgba(201,168,76,0.4)' }} />
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(201,168,76,0.6)',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
          }}
        >
          Document preview — Cover Letter
        </span>
      </div>

      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontWeight: 300,
          fontSize: '18px',
          color: '#f5f0e8',
          marginBottom: '18px',
          lineHeight: 1.4,
        }}
      >
        This is how your application opens.
      </div>

      {/* Document card */}
      <div
        style={{
          border: '1px solid rgba(201,168,76,0.15)',
          background: 'rgba(201,168,76,0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Document meta header */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid rgba(201,168,76,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(245,240,232,0.3)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cover Letter · E-2 Treaty Investor Application
            </div>
            <div
              style={{
                fontSize: '11px',
                color: 'rgba(245,240,232,0.2)',
                fontFamily: "'DM Sans', sans-serif",
                marginTop: '2px',
              }}
            >
              {data.country || 'Treaty Country'} National · Consulate Application
            </div>
          </div>
          <div
            style={{
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(201,168,76,0.4)',
              border: '1px solid rgba(201,168,76,0.15)',
              padding: '3px 8px',
              fontFamily: "'DM Sans', sans-serif",
              whiteSpace: 'nowrap',
            }}
          >
            Draft
          </div>
        </div>

        {/* Preview text */}
        <div style={{ padding: '24px 28px 0', position: 'relative' }}>
          <p
            style={{
              fontSize: '13.5px',
              lineHeight: 1.9,
              color: 'rgba(245,240,232,0.82)',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              margin: 0,
            }}
          >
            {opening}
          </p>

          {/* Blurred continuation lines */}
          <div style={{ marginTop: '20px', position: 'relative', paddingBottom: '24px' }}>
            {[100, 93, 86, 98, 74].map((w, i) => (
              <div
                key={i}
                style={{
                  height: '11px',
                  marginBottom: '9px',
                  background: 'rgba(245,240,232,0.07)',
                  width: `${w}%`,
                  filter: `blur(${2 + i * 0.6}px)`,
                  opacity: Math.max(0.08, 0.3 - i * 0.05),
                }}
              />
            ))}
            {/* Gradient fade */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '72px',
                background:
                  'linear-gradient(to bottom, transparent, rgba(10,10,10,0.96))',
                pointerEvents: 'none',
              }}
            />
          </div>
        </div>

        {/* CTA bar */}
        <div
          style={{
            padding: '16px 24px 18px',
            borderTop: '1px solid rgba(201,168,76,0.1)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#f5f0e8',
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: '3px',
                }}
              >
                15 documents. Your complete application package.
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'rgba(245,240,232,0.5)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Business plan · Source of funds · Qualifications · +12 more
              </div>
            </div>
            <Link
              href={isLoggedIn ? '/apply/module1' : '/pricing'}
              style={{
                display: 'inline-block',
                padding: '11px 22px',
                background: '#C9A84C',
                color: '#0a0a0a',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Build my case →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
