'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import CaseFileSummary from '@/components/simulator/CaseFileSummary';
import InterviewBrief from '@/components/simulator/InterviewBrief';

const supabase = createBrowserSupabaseClient();

function CaseFileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawApplicationId = searchParams.get('applicationId');

  const [applicationId, setApplicationId] = useState<string | null>(rawApplicationId);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/simulator');
        return;
      }

      if (!rawApplicationId) {
        // Auto-resolve: find the user's most recent simulator application
        const { data: apps } = await supabase
          .from('applications')
          .select('id, source')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (apps && apps.length > 0) {
          const simApp = apps.find((a: { id: string; source: string | null }) => a.source === 'simulator_standalone') ?? apps[0];
          setApplicationId(simApp.id);
        } else {
          // No application at all — send to Quick Start
          router.push('/simulator/quick-start');
          return;
        }
      }

      setAuthChecked(true);
    };
    check();
  }, [router, rawApplicationId]);

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;
  }

  if (!applicationId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', marginBottom: '20px' }}>
            No application found. Complete Quick Start first.
          </p>
          <a href="/simulator/quick-start" style={{ color: '#C9A84C', fontSize: '13px', textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}>
            Go to Quick Start →
          </a>
        </div>
      </div>
    );
  }


  const briefAndDivider = (
    <>
      <InterviewBrief applicationId={applicationId} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
        <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(245,240,232,0.65)', fontFamily: "'DM Sans', sans-serif" }}>
          CASE DETAILS
        </span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.1)' }} />
      </div>
    </>
  );

  return (
    <CaseFileSummary
      applicationId={applicationId}
      continueLabel="Begin practice interview →"
      onContinue={() => router.push('/simulator')}
      secondaryAction={{ label: 'Upload more documents', href: '/simulator/quick-start' }}
      headerContent={briefAndDivider}
    />
  );
}

export default function CaseFilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a0a0a' }} />}>
      <CaseFileContent />
    </Suspense>
  );
}
