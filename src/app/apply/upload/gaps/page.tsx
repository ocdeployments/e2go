'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import GapReportClient from '@/components/apply/GapReportClient';

function GapsContent() {
  const searchParams = useSearchParams();
  const appParam = searchParams.get('app');

  if (!appParam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p
            className="mb-4 text-sm"
            style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Missing application reference.
          </p>
          <a
            href="/apply"
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Return to case file
          </a>
        </div>
      </div>
    );
  }

  return <GapReportClient applicationId={appParam} />;
}

export default function GapsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
          <p
            className="text-sm"
            style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Loading...
          </p>
        </div>
      }
    >
      <GapsContent />
    </Suspense>
  );
}
