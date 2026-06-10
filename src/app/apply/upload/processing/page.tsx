'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ProcessingClient from '@/components/apply/ProcessingClient';

function ProcessingContent() {
  const searchParams = useSearchParams();

  const docsParam = searchParams.get('docs');
  const appParam = searchParams.get('app');

  if (!docsParam || !appParam) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p
            className="mb-4 text-sm"
            style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Missing document or application reference.
          </p>
          <a
            href="/apply/upload"
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Return to upload
          </a>
        </div>
      </div>
    );
  }

  const documentIds = docsParam.split(',').filter(Boolean);

  return (
    <ProcessingClient
      documentIds={documentIds}
      applicationId={appParam}
    />
  );
}

export default function ProcessingPage() {
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
      <ProcessingContent />
    </Suspense>
  );
}
