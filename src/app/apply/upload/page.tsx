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
          style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading...
        </p>
      </div>
    );
  }

  if (!applicationId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p
            className="mb-4 text-sm"
            style={{ color: 'rgba(245,240,232,0.5)', fontFamily: "'DM Sans', sans-serif" }}
          >
            No application found.
          </p>
          <a
            href="/quiz"
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: '#C9A84C', fontFamily: "'DM Sans', sans-serif" }}
          >
            Start eligibility check
          </a>
        </div>
      </div>
    );
  }

  return <UploadClient applicationId={applicationId} />;
}
