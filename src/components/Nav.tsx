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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
      <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
          <span className="text-xl font-bold" style={{ color: "var(--teal)", fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
        </Link>
        <div className="flex items-center gap-4">
          {!loading && (
            <>
              {user ? (
                <>
                  <span className="hidden md:block text-sm" style={{ color: "var(--white-dim)" }}>
                    {user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm transition-colors"
                    style={{ color: "var(--white-dim)" }}
                  >
                    Sign Out
                  </button>
                  <Link
                    href="/dashboard"
                    className="hidden md:block text-sm transition-colors"
                    style={{ color: "var(--teal)" }}
                  >
                    My Application
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden md:block text-sm transition-colors"
                    style={{ color: "var(--white-dim)" }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/quiz"
                    className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    style={{ background: "var(--teal)", color: "#fff" }}
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