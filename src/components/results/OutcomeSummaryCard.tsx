'use client';

interface OutcomeSummaryCardProps {
  country: string;
  investmentRange: string;
  applicationType: string;
  dependents: string;
  answers: Record<string, string | string[]>;
  warnings: string[];
  consulateName: string;
  outcome: string;
}

function getImmigrantIntentRisk(warnings: string[]): { level: 'low' | 'moderate' | 'high'; label: string } {
  const has = (code: string) => warnings.includes(code);
  if (has('W-NI-NONE')) return { level: 'high', label: 'Immigrant intent — requires explicit documentation' };
  if (has('W-NI-WEAK')) return { level: 'moderate', label: 'Home-country ties — needs strengthening' };
  return { level: 'low', label: 'Home-country ties — strong' };
}

function getBizStatusLabel(answers: Record<string, string | string[]>): string {
  const q08 = (answers['Q0-08'] as string) || '';
  const q08a = (answers['Q0-08a'] as string) || '';
  const q08c = (answers['Q0-08c'] as string) || '';

  if (/franchise/i.test(q08a)) {
    if (/specific/i.test(q08) || q08c.startsWith('Yes')) return 'Franchise buyer — specific brand identified';
    if (/offered/i.test(q08c)) return 'Franchise buyer — FDD offered by franchisor';
    return 'Franchise buyer — brand search in progress';
  }
  if (/acquisition|existing independent/i.test(q08a)) return 'Business acquisition — existing operating business';
  if (/new concept/i.test(q08a) || /new/i.test(q08a)) return 'New business concept';
  if (q08a) return q08a;
  if (/specific/i.test(q08)) return 'Business identified';
  return 'Business type — to be determined';
}

// E-3-04: Correctly report spouse + children using multiple possible answer keys
function getFamilyLabel(applicationType: string, dependents: string, answers: Record<string, string | string[]>): string {
  const isPartnership = applicationType === 'partnership' || applicationType === 'spousal_partnership';
  const familyAns = (answers['Q0-family'] as string) || dependents || '';

  if (isPartnership && applicationType === 'spousal_partnership') return 'Spousal partnership application';
  if (isPartnership) return 'Partnership investors (two principals)';

  // Check children/dependents count from multiple possible answer keys
  const numChildrenRaw =
    (answers['children'] as string) ||
    (answers['num_children'] as string) ||
    (answers['Q0-04'] as string) ||
    (answers['dependents'] as string) ||
    '';
  const numChildren = parseInt(numChildrenRaw, 10);
  const hasChildren = !isNaN(numChildren) && numChildren > 0;
  const hasSpouse = /spouse/i.test(familyAns);

  if (/spouse.*child|child.*spouse/i.test(familyAns)) {
    const childMatch = familyAns.match(/(\d+)\s*child/i);
    const count = childMatch ? parseInt(childMatch[1], 10) : (hasChildren ? numChildren : 1);
    return `Travelling with spouse and ${count} ${count === 1 ? 'child' : 'children'}`;
  }
  if (hasSpouse && hasChildren) {
    return `Travelling with spouse and ${numChildren} ${numChildren === 1 ? 'child' : 'children'}`;
  }
  if (hasSpouse) return 'Travelling with spouse';
  if (hasChildren) return `Travelling with ${numChildren} dependent ${numChildren === 1 ? 'child' : 'children'}`;
  if (/child/i.test(familyAns)) return 'Travelling with dependent children';
  return 'Solo applicant — no accompanying dependents';
}

function getConsulateLabel(country: string, consulateName: string): string {
  const processingMap: Record<string, string> = {
    'Canada': 'Toronto consulate — 8–12 week processing',
    'United Kingdom': 'London embassy — 10–14 week processing',
    'Germany': 'Frankfurt consulate — 8–12 week processing',
    'Australia': 'Sydney consulate — 10–16 week processing',
    'Japan': 'Tokyo embassy — 8–14 week processing',
  };
  return processingMap[country] || `${consulateName} — processing time varies`;
}

const DOT = ({ color }: { color: string }) => (
  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0, marginTop: '5px' }} />
);

export default function OutcomeSummaryCard({
  country, investmentRange, applicationType, dependents,
  answers, warnings, consulateName, outcome,
}: OutcomeSummaryCardProps) {
  const intentRisk = getImmigrantIntentRisk(warnings);
  const bizStatus = getBizStatusLabel(answers);
  const familyLabel = getFamilyLabel(applicationType, dependents, answers);
  const consulateLabel = getConsulateLabel(country, consulateName);
  const targetDate = (answers['Q0-target-date'] as string) || '';

  const items: Array<{ label: string; value: string; tone: 'green' | 'amber' | 'red' | 'neutral' }> = [
    {
      label: 'Citizenship',
      value: country ? `${country} national — E-2 treaty active` : 'Treaty country confirmed',
      tone: 'green',
    },
    {
      label: 'Investment',
      value: investmentRange ? `${investmentRange} committed capital` : 'Investment level assessed',
      tone: 'green',
    },
    {
      label: 'Business',
      value: bizStatus,
      tone: 'neutral',
    },
    {
      label: 'Consulate',
      value: consulateLabel,
      tone: 'neutral',
    },
    {
      label: 'Application',
      value: familyLabel,
      tone: 'neutral',
    },
    {
      label: 'Immigrant intent',
      value: intentRisk.label,
      tone: intentRisk.level === 'low' ? 'green' : intentRisk.level === 'moderate' ? 'amber' : 'red',
    },
    ...(targetDate && targetDate !== 'Not sure yet' ? [{
      label: 'Target',
      value: `Move date: ${targetDate}`,
      tone: 'neutral' as const,
    }] : []),
  ];

  const toneColor = { green: '#5DCAA5', amber: '#f59e0b', red: 'rgba(239,68,68,0.8)', neutral: 'rgba(201,168,76,0.5)' };

  return (
    <div style={{ padding: '20px 24px', border: '1px solid rgba(201,168,76,0.15)', background: 'rgba(201,168,76,0.02)', marginTop: '20px' }}>
      {/* E-3-03: Header row with title + color legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
          What your assessment found
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5DCAA5', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.03em' }}>Confirmed strength</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
            <span style={{ fontSize: '9px', color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.03em' }}>Needs attention</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map(({ label, value, tone }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <DOT color={toneColor[tone]} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", marginRight: '6px', letterSpacing: '0.02em' }}>
                {label}:
              </span>
              <span style={{ fontSize: '12px', color: '#f5f0e8', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                {value}
              </span>
            </div>
          </div>
        ))}
      </div>
      {outcome === 'PROCEED_RISK' && warnings.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(201,168,76,0.08)', fontSize: '11px', color: 'rgba(245,240,232,0.62)', fontFamily: "'DM Sans', sans-serif" }}>
          {warnings.length} area{warnings.length > 1 ? 's' : ''} flagged below — all are addressable before submission.
        </div>
      )}
    </div>
  );
}
