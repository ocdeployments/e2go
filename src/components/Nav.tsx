"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
interface Profile {
  id: string;
  email: string;
  full_name?: string;
  tier?: string;
}
import type { Session } from "@supabase/supabase-js";

export default function Nav() {
  const [user, setUser] = useState<Profile | null>(null);
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        // Fetch user profile from our users table
        const { data: userData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setUser(userData);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
      <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
          </svg>
          <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
        </Link>
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <span className="hidden md:block text-sm text-[#434655]">
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-[#434655] hover:text-[#004ac6] transition-colors"
                  >
                    Sign Out
                  </button>
                  <Link
                    href="/dashboard"
                    className="hidden md:block text-sm text-[#004ac6] hover:underline"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:block text-sm text-[#434655] hover:text-[#004ac6] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/quiz"
                    className="bg-[#004ac6] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#00337d] transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}