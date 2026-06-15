'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import CaseFileSummary from '@/components/simulator/CaseFileSummary';
import CaseGapsForm from '@/components/simulator/CaseGapsForm';

const supabase = createBrowserSupabaseClient();

function CaseFileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const applicationId = searchParams.get('applicationId');
  const [authChecked, setAuthChecked] = useState(false);
  const [gapsResolved, setGapsResolved] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/simulator');
        return;
      }
      setAuthChecked(true);
    };
    check();
  }, [router]);

  if (!authChecked) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;
  }

  if (!applicationId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', marginBottom: '20px' }}>
            Missing application reference.
          </p>
          <a href="/simulator" style={{ color: '#C9A84C', fontSize: '13px', textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}>
            ← Back to simulator
          </a>
        </div>
      </div>
    );
  }

  if (!gapsResolved) {
    return (
      <CaseGapsForm
        applicationId={applicationId}
        onComplete={() => setGapsResolved(true)}
      />
    );
  }

  return (
    <CaseFileSummary
      applicationId={applicationId}
      continueLabel="Begin practice interview →"
      onContinue={() => router.push('/simulator')}
      secondaryAction={{ label: 'Upload more documents first', href: '/simulator/quick-start' }}
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
