'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TabHRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/apply/investment');
  }, [router]);
  return null;
}
