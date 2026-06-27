'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TabLRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/apply/family');
  }, [router]);
  return null;
}
