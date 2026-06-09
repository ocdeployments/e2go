"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  tier?: string;
}

interface Application {
  id: string;
}

export default function Nav() {
  const [user, setUser] = useState<Profile | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setUser(userData);

        const { data: appData } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (appData) {
          setApplication(appData);
        }
      }
      setLoading(false);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setUser(userData);

        const { data: appData } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (appData) {
          setApplication(appData);
        }
      } else {
        setUser(null);
        setApplication(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  };

  const isActive = (path: string) => pathname === path;

  if (loading) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10,10,10,0.95)",
        borderBottom: "1px solid rgba(201,168,76,0.1)",
      }}
    >
      <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-7xl mx-auto">
        <Link
          href={user ? "/dashboard" : "/"}
          className="flex items-center gap-2"
          style={{ textDecoration: "none" }}
        >
          <span className="text-xl font-medium tracking-tight text-[#f5f0e8]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            e2go<span className="text-[#C9A84C]">.app</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {!user ? (
            <>
              <Link
                href="/#how-it-works"
                className="text-sm transition-colors"
                style={{ color: isActive("/#how-it-works") ? "#C9A84C" : "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = isActive("/#how-it-works") ? "#C9A84C" : "rgba(245,240,232,0.75)"}
              >
                How it works
              </Link>
              <Link
                href="/learn"
                className="text-sm transition-colors"
                style={{ color: isActive("/learn") ? "#C9A84C" : "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = isActive("/learn") ? "#C9A84C" : "rgba(245,240,232,0.75)"}
              >
                Learn
              </Link>
              <Link
                href="/pricing"
                className="text-sm transition-colors"
                style={{ color: isActive("/pricing") ? "#C9A84C" : "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = isActive("/pricing") ? "#C9A84C" : "rgba(245,240,232,0.75)"}
              >
                Pricing
              </Link>
              <Link
                href="/simulator"
                className="text-sm transition-colors"
                style={{ color: isActive("/simulator") ? "#C9A84C" : "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = isActive("/simulator") ? "#C9A84C" : "rgba(245,240,232,0.75)"}
              >
                Simulator
              </Link>
              <Link
                href="/login"
                className="text-sm transition-colors"
                style={{ color: "rgba(245,240,232,0.55)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = "rgba(245,240,232,0.55)"}
              >
                Log in
              </Link>
              <Link
                href="/quiz"
                className="text-sm transition-colors"
                style={{
                  padding: "8px 18px",
                  border: "1px solid rgba(201,168,76,0.5)",
                  color: "#C9A84C",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "transparent",
                  borderRadius: 0,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#C9A84C"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"}
              >
                Check eligibility
              </Link>
            </>
          ) : (
            <>
              <Link href="/apply/overview" className="text-sm transition-colors" style={{ color: isActive("/apply/overview") ? "#C9A84C" : "rgba(245,240,232,0.75)" }}
                onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                onMouseLeave={e => e.currentTarget.style.color = isActive("/apply/overview") ? "#C9A84C" : "rgba(245,240,232,0.75)"}
              >
                My Application
              </Link>
              {application && (
                <Link href={`/documents/${application.id}`} className="text-sm transition-colors" style={{ color: "rgba(245,240,232,0.75)" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#f5f0e8"}
                  onMouseLeave={e => e.currentTarget.style.color = "rgba(245,240,232,0.75)"}
                >
                  Documents
                </Link>
              )}

              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: "rgba(245,240,232,0.75)" }}
                >
                  <span>Account</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="transition-transform" style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] shadow-lg z-50">
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 text-sm text-[rgba(245,240,232,0.65)] hover:bg-[rgba(201,168,76,0.06)] hover:text-[#f5f0e8] transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/settings"
                      className="block px-4 py-3 text-sm text-[rgba(245,240,232,0.65)] hover:bg-[rgba(201,168,76,0.06)] hover:text-[#f5f0e8] transition-colors"
                      onClick={() => setDropdownOpen(false)}
                    >
                      Settings
                    </Link>
                    <div className="border-t border-[rgba(201,168,76,0.2)]" />
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-sm text-[rgba(245,240,232,0.65)] hover:bg-[rgba(201,168,76,0.06)] hover:text-[#f5f0e8] transition-colors"
                    >
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-opacity ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(201,168,76,0.1)] px-4 pb-6 pt-2" style={{ background: "rgba(10,10,10,0.98)" }}>
          {!user ? (
            <div className="flex flex-col gap-4">
              <Link href="/#how-it-works" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                How it works
              </Link>
              <Link href="/learn" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                Learn
              </Link>
              <Link href="/pricing" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                Pricing
              </Link>
              <Link href="/simulator" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                Simulator
              </Link>
              <Link href="/login" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.55)" }} onClick={() => setMobileMenuOpen(false)}>
                Log in
              </Link>
              <Link
                href="/quiz"
                className="text-sm font-medium py-3 text-center transition-colors"
                style={{
                  padding: "8px 18px",
                  border: "1px solid rgba(201,168,76,0.5)",
                  color: "#C9A84C",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: "transparent",
                  borderRadius: 0,
                  marginTop: "4px",
                }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Check eligibility
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Link href="/apply/overview" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                My Application
              </Link>
              {application && (
                <Link href={`/documents/${application.id}`} className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                  Documents
                </Link>
              )}
              <Link href="/dashboard" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                Dashboard
              </Link>
              <Link href="/settings" className="text-sm py-2" style={{ color: "rgba(245,240,232,0.75)" }} onClick={() => setMobileMenuOpen(false)}>
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="text-left text-sm text-[rgba(245,240,232,0.65)] hover:text-[#f5f0e8] transition-colors py-2"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
