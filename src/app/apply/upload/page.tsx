'use client';

import { useEffect, useState } from 'react';
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import UploadClient from '@/components/apply/UploadClient';

export default function UploadPage() {
  useTrackSectionVisit("upload");

  const router = useRouter();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadApplication = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (apps && apps.length > 0) {
          setApplicationId(apps[0].id);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadApplication();
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p
          className="text-sm"
          style={{ color: 'rgba(245,240,232,0.68)', fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading...
        </p>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center" style={{ maxWidth: '320px' }}>
          <p
            className="mb-2 text-sm"
            style={{ color: 'rgba(245,240,232,0.76)', fontFamily: "'DM Sans', sans-serif" }}
          >
            Document upload is part of your Complete package.
          </p>
          <p className="mb-6 text-xs" style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}>
            Once you unlock your case, you can upload supporting documents here.
          </p>
          <a
            href="/pricing"
            className="inline-block px-5 py-2 text-[11px] uppercase tracking-[0.08em] font-medium"
            style={{ background: '#C9A84C', color: '#0a0a0a', fontFamily: "'DM Sans', sans-serif", textDecoration: 'none' }}
          >
            Unlock Complete — $1,495
          </a>
          <a
            href="/dashboard"
            className="block mt-4 text-[11px]"
            style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Back to dashboard
          </a>
        </div>
      </div>
    );
  }

  return <UploadClient applicationId={applicationId} />;
}
