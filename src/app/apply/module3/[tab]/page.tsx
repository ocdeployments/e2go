'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

const VALID_TABS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'];

export default function Module3TabPage() {
  const router = useRouter();
  const params = useParams();
  const tab = params?.tab as string;

  useEffect(() => {
    if (tab && !VALID_TABS.includes(tab.toLowerCase())) {
      // Invalid tab - redirect to Tab A
      router.replace('/apply/module3/a');
    } else if (tab) {
      // Valid tab but ensure lowercase
      router.replace(`/apply/module3/${tab.toLowerCase()}`);
    }
  }, [tab, router]);

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
      <div className="text-[#004ac6]">Loading...</div>
    </div>
  );
}