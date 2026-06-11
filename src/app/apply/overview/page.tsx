'use client';
import { Suspense, useEffect } from 'react';
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
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
  useTrackSectionVisit("overview");

  return (
    <Suspense>
      <OverviewRedirectInner />
    </Suspense>
  );
}
