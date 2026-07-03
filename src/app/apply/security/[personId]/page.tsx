'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useApplicationGate } from '@/hooks/useApplicationGate';
import ApplicationNotReadyScreen from '@/components/apply/ApplicationNotReadyScreen';
import { useTrackSectionVisit } from '@/hooks/useTrackSectionVisit';
import QuestionSetRunner from '@/components/apply/questions/QuestionSetRunner';
import AdvisoryBlock from '@/components/apply/questions/AdvisoryBlock';
import { SECURITY_SUB_AREAS } from '@/lib/ds160-question-sets';
import { GOLD, CREAM, CARD_BG, BORDER, INNER } from '@/components/casefile/tokens';

interface PersonInfo {
  name: string;
  familyMemberId: string | null;
}

export default function SecurityBackgroundPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = use(params);
  useTrackSectionVisit('security-background');
  const router = useRouter();
  const { status: gateStatus, applicationId, retry } = useApplicationGate();

  const [person, setPerson] = useState<PersonInfo | null>(null);
  const [activeAreaKey, setActiveAreaKey] = useState(SECURITY_SUB_AREAS[0].key);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (gateStatus !== 'ready') return;
    if (personId === 'principal') {
      setPerson({ name: 'You', familyMemberId: null });
      return;
    }
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('family_members')
        .select('first_name, last_name')
        .eq('id', personId)
        .single();
      if (data) {
        setPerson({ name: [data.first_name, data.last_name].filter(Boolean).join(' ') || 'This family member', familyMemberId: personId });
      } else {
        setPerson({ name: 'This family member', familyMemberId: personId });
      }
    };
    load();
  }, [gateStatus, personId]);

  if (gateStatus === 'no-user') {
    router.push('/login');
    return null;
  }
  if (gateStatus === 'not-ready') {
    return <ApplicationNotReadyScreen onRetry={retry} />;
  }
  if (gateStatus === 'loading' || !person || !applicationId) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <p style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Loading...</p>
      </div>
    );
  }

  const activeArea = SECURITY_SUB_AREAS.find((a) => a.key === activeAreaKey) ?? SECURITY_SUB_AREAS[0];
  const backHref = person.familyMemberId ? `/apply/dependent/${person.familyMemberId}` : '/case-profile';

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Link href={backHref} style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
          ← Back
        </Link>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 500, color: CREAM, marginTop: '16px', marginBottom: '8px' }}>
          Security &amp; Background
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.6)', marginBottom: '8px' }}>
          {personId === 'principal' ? 'Your sworn statement' : `${person.name}'s sworn statement`} — DS-160 Security &amp; Background
        </p>

        <AdvisoryBlock>
          These questions mirror the DS-160 Security and Background pages. Answer honestly and completely — a misrepresentation here can independently jeopardize the visa, even if unrelated to the E-2 case itself. This section is self-attested; it cannot be filled from uploaded documents. If you are unsure how to answer any question, stop and consult a qualified immigration attorney before submitting — e2go is not a law firm and does not provide legal advice.
        </AdvisoryBlock>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '28px 0' }}>
          {SECURITY_SUB_AREAS.map((area) => (
            <button
              key={area.key}
              onClick={() => setActiveAreaKey(area.key)}
              style={{
                padding: '8px 14px',
                fontSize: '11px',
                fontFamily: "'DM Sans', sans-serif",
                border: `1px solid ${area.key === activeAreaKey ? GOLD : BORDER}`,
                backgroundColor: area.key === activeAreaKey ? INNER : 'transparent',
                color: area.key === activeAreaKey ? CREAM : 'rgba(245,240,232,0.6)',
                cursor: 'pointer',
              }}
            >
              {area.label}
            </button>
          ))}
        </div>

        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, padding: '28px' }}>
          <QuestionSetRunner
            questions={activeArea.questions}
            applicationId={applicationId}
            familyMemberId={person.familyMemberId}
            onSaveStatusChange={setSaveStatus}
          />
        </div>

        <p style={{ marginTop: '16px', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed — check your connection' : ''}
        </p>
      </div>
    </div>
  );
}
