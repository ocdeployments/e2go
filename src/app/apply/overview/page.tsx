'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function OverviewRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/apply${query ? `?${query}` : ''}`);
  }, [router, searchParams]);

  return null;
}

export default function OverviewRedirect() {
  return (
    <Suspense>
      <OverviewRedirectInner />
    </Suspense>
  );
}
