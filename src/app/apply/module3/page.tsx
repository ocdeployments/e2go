"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Module3Page() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login?next=/apply/module3");
        return;
      }

      const { data: lifecycle } = await supabase
        .from("application_lifecycle")
        .select("module2_completed_at")
        .eq("user_id", user.id)
        .single();

      if (!lifecycle?.module2_completed_at) {
        router.push("/apply/module2");
        return;
      }

      setLoading(false);
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-[#434655] hover:text-[#004ac6]">
            Dashboard
          </Link>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
          <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">Module 3: Coming Soon</h1>
          <p className="text-[#434655] mb-6">
            Document Interview Engine with Tabs A-L (~250 questions). This module is currently in development.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-[#004ac6] text-white rounded-lg font-medium hover:bg-[#003699]"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
