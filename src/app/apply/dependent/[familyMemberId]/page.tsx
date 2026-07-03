'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useApplicationGate } from '@/hooks/useApplicationGate';
import ApplicationNotReadyScreen from '@/components/apply/ApplicationNotReadyScreen';
import { useTrackSectionVisit } from '@/hooks/useTrackSectionVisit';
import QuestionSetRunner from '@/components/apply/questions/QuestionSetRunner';
import ClusterDivider from '@/components/apply/questions/ClusterDivider';
import { TRAVEL_COMPANIONS_QUESTIONS, US_POC_QUESTIONS } from '@/lib/ds160-question-sets';
import { GOLD, CREAM, CARD_BG, BORDER } from '@/components/casefile/tokens';

interface MemberInfo {
  name: string;
  memberType: 'spouse' | 'child' | 'co_investor';
}

export default function DependentDS160Page({ params }: { params: Promise<{ familyMemberId: string }> }) {
  const { familyMemberId } = use(params);
  useTrackSectionVisit('dependent-ds160');
  const router = useRouter();
  const { status: gateStatus, applicationId, retry } = useApplicationGate();

  const [member, setMember] = useState<MemberInfo | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    if (gateStatus !== 'ready') return;
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('family_members')
        .select('first_name, last_name, member_type')
        .eq('id', familyMemberId)
        .single();
      if (data) {
        setMember({
          name: [data.first_name, data.last_name].filter(Boolean).join(' ') || 'This family member',
          memberType: data.member_type,
        });
      }
    };
    load();
  }, [gateStatus, familyMemberId]);

  if (gateStatus === 'no-user') {
    router.push('/login');
    return null;
  }
  if (gateStatus === 'not-ready') {
    return <ApplicationNotReadyScreen onRetry={retry} />;
  }
  if (gateStatus === 'loading' || !member || !applicationId) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <p style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif", fontSize: '13px' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', padding: '48px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        <Link href="/case-profile" style={{ fontSize: '11px', color: 'rgba(201,168,76,0.6)', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}>
          ← Back to Case Profile
        </Link>

        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '32px', fontWeight: 500, color: CREAM, marginTop: '16px', marginBottom: '8px' }}>
          {member.name}&apos;s DS-160 Details
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', color: 'rgba(245,240,232,0.6)', marginBottom: '32px' }}>
          {member.memberType === 'spouse' ? 'Spouse' : 'Child'} dependents file their own DS-160 — these sections cover
          what isn&apos;t already collected on the Family &amp; Dependents page.
        </p>

        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, padding: '28px', marginBottom: '24px' }}>
          <ClusterDivider label="Travel companions" />
          <QuestionSetRunner
            questions={TRAVEL_COMPANIONS_QUESTIONS}
            applicationId={applicationId}
            familyMemberId={familyMemberId}
            onSaveStatusChange={setSaveStatus}
          />
        </div>

        <div style={{ backgroundColor: CARD_BG, border: `1px solid ${BORDER}`, padding: '28px', marginBottom: '24px' }}>
          <ClusterDivider label="U.S. point of contact" />
          <QuestionSetRunner
            questions={US_POC_QUESTIONS}
            applicationId={applicationId}
            familyMemberId={familyMemberId}
            onSaveStatusChange={setSaveStatus}
          />
        </div>

        <Link
          href={`/apply/security/${familyMemberId}`}
          style={{
            display: 'block',
            padding: '18px 20px',
            border: `1px solid ${GOLD}`,
            backgroundColor: 'rgba(201,168,76,0.05)',
            textDecoration: 'none',
          }}
        >
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '13px', fontWeight: 600, color: CREAM, marginBottom: '4px' }}>
            Security &amp; Background →
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '11px', color: 'rgba(245,240,232,0.55)' }}>
            Required sworn statement — health, criminal history, and immigration-violation disclosures for {member.name}.
          </div>
        </Link>

        <p style={{ marginTop: '16px', fontSize: '10px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)' }}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed — check your connection' : ''}
        </p>
      </div>
    </div>
  );
}
