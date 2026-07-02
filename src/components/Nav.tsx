"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import OutcomesConsentBanner from "@/components/OutcomesConsentBanner";

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  tier?: string;
}

interface Application {
  id: string;
  source: string | null;
}

const chevron = (open: boolean) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 12 12"
    fill="none"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
  >
    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

const HOVER_ON  = "#f5f0e8";
const DIM       = "rgba(245,240,232,0.75)";
const DIM_MED   = "rgba(245,240,232,0.65)";
const GOLD      = "#C9A84C";

export default function Nav() {
  const [user, setUser]                       = useState<Profile | null>(null);
  const [application, setApplication]         = useState<Application | null>(null);
  const [isSimulatorOnly, setIsSimulatorOnly] = useState(false);
  const [isFranchise, setIsFranchise]         = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen]   = useState(false);
  const [accountOpen, setAccountOpen]         = useState(false);
  const [appOpen, setAppOpen]                 = useState(false);
  const [intelOpen, setIntelOpen]             = useState(false);
  const [loading, setLoading]                 = useState(true);

  const accountRef = useRef<HTMLDivElement>(null);
  const appRef     = useRef<HTMLDivElement>(null);
  const intelRef   = useRef<HTMLDivElement>(null);
  const pathname   = usePathname();
  const router     = useRouter();
  const supabase   = createBrowserSupabaseClient();

  // Single outside-click handler for all three dropdowns
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
      if (appRef.current    && !appRef.current.contains(e.target as Node))     setAppOpen(false);
      if (intelRef.current  && !intelRef.current.contains(e.target as Node))   setIntelOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user?: { id: string } } | null) => {
        if (session?.user) {
          const [profileResult, appsResult, quizResult] = await Promise.all([
            supabase.from("profiles").select("*").eq("id", session.user.id).single(),
            supabase.from("applications").select("id, source").eq("user_id", session.user.id).order("created_at", { ascending: false }),
            supabase
              .from("quiz_sessions")
              .select("result_json")
              .eq("user_id", session.user.id)
              .not("completed_at", "is", null)
              .order("completed_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          setUser(profileResult.data);

          // Detect franchise business type from quiz answer Q0-08a
          if (quizResult.data?.result_json) {
            const rj = quizResult.data.result_json as Record<string, unknown>;
            const answers = rj?.answers as Record<string, string> | null;
            setIsFranchise(answers?.["Q0-08a"] === "franchise");
          }

          const allApps = appsResult.data;
          if (allApps && allApps.length > 0) {
            const simOnly = allApps.every((a: Application) => a.source === "simulator_standalone");
            setIsSimulatorOnly(simOnly);
            if (!simOnly) {
              const regularApp = allApps.find((a: Application) => a.source !== "simulator_standalone");
              if (regularApp) setApplication(regularApp);
            }
          } else {
            setIsSimulatorOnly(false);
          }
        } else {
          setUser(null);
          setApplication(null);
          setIsSimulatorOnly(false);
          setIsFranchise(false);
        }
        setLoading(false);
      }
    );
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    closeAll();
  };

  const closeAll = () => {
    setAccountOpen(false);
    setAppOpen(false);
    setIntelOpen(false);
    setMobileMenuOpen(false);
  };

  const isActive  = (path: string) => pathname === path;
  const isSimPath = pathname.startsWith("/simulator");
  const showApp   = !isSimulatorOnly && !isSimPath;

  // Documents: use specific application URL when available, else index
  const docsHref = application ? `/documents/${application.id}` : "/documents";

  const linkColor = (active: boolean) => active ? GOLD : DIM;

  const dropdownItem = "block px-4 py-3 text-sm transition-colors hover:bg-[rgba(201,168,76,0.06)] hover:text-[#f5f0e8]";
  const divider      = <div className="border-t border-[rgba(201,168,76,0.1)]" />;

  if (loading) return null;

  return (
    <>
    <header
      className="fixed top-0 left-0 right-0 z-50"
      style={{ background: "rgba(10,10,10,0.95)", borderBottom: "1px solid rgba(201,168,76,0.1)" }}
    >
      <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-7xl mx-auto">

        {/* Logo */}
        <Link href={user ? "/case-profile" : "/"} style={{ textDecoration: "none" }}>
          <span className="text-xl font-medium tracking-tight text-[#f5f0e8]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            e2go<span className="text-[#C9A84C]">.app</span>
          </span>
        </Link>

        {/* ─── Desktop nav ─── */}
        <div className="hidden md:flex items-center gap-6">

          {!user ? (
            /* ── Logged-out: Learn · Pricing · Simulator · Log in · Check eligibility ── */
            <>
              {(["Learn /learn", "Pricing /pricing", "Simulator /simulator"] as const).map(item => {
                const [label, href] = item.split(" ");
                return (
                  <Link key={href} href={href} className="text-sm transition-colors"
                    style={{ color: linkColor(isActive(href)) }}
                    onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                    onMouseLeave={e => e.currentTarget.style.color = linkColor(isActive(href))}
                  >
                    {label}
                  </Link>
                );
              })}
              <Link href="/login" className="text-sm transition-colors"
                style={{ color: DIM }}
                onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                onMouseLeave={e => e.currentTarget.style.color = DIM}
              >
                Log in
              </Link>
              <Link href="/quiz" className="text-sm transition-colors"
                style={{ padding: "8px 18px", border: "1px solid rgba(201,168,76,0.5)", color: GOLD, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", background: "transparent", borderRadius: 0 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = GOLD}
                onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.5)"}
              >
                Check eligibility
              </Link>
            </>

          ) : (
            /* ── Logged-in ── */
            <>
              {/* Application dropdown */}
              {showApp && (
                <div className="relative" ref={appRef}>
                  <button
                    onClick={() => { setAppOpen(v => !v); setIntelOpen(false); setAccountOpen(false); }}
                    className="flex items-center gap-1.5 text-sm transition-colors"
                    style={{ color: (pathname.startsWith("/apply") || isActive("/gap-analysis")) ? GOLD : DIM }}
                    onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                    onMouseLeave={e => e.currentTarget.style.color = (pathname.startsWith("/apply") || isActive("/gap-analysis")) ? GOLD : DIM}
                  >
                    Application {chevron(appOpen)}
                  </button>
                  {appOpen && (
                    <div className="absolute left-0 mt-2 w-44 bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] shadow-lg z-50">
                      <Link href="/case-profile"   className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>Case File</Link>
                      <Link href="/gap-analysis"   className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>Gap Analysis</Link>
                      <Link href="/apply/checklist" className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>Checklist</Link>
                    </div>
                  )}
                </div>
              )}

              {/* Intelligence dropdown */}
              {showApp && (
                <div className="relative" ref={intelRef}>
                  <button
                    onClick={() => { setIntelOpen(v => !v); setAppOpen(false); setAccountOpen(false); }}
                    className="flex items-center gap-1.5 text-sm transition-colors"
                    style={{ color: (pathname.startsWith("/fdd") || isActive("/market-analysis") || pathname.startsWith("/franchise")) ? GOLD : DIM }}
                    onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                    onMouseLeave={e => e.currentTarget.style.color = (pathname.startsWith("/fdd") || isActive("/market-analysis") || pathname.startsWith("/franchise")) ? GOLD : DIM}
                  >
                    Intelligence {chevron(intelOpen)}
                  </button>
                  {intelOpen && (
                    <div className="absolute left-0 mt-2 w-52 bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] shadow-lg z-50">
                      <Link href="/fdd"             className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>FDD Analysis</Link>
                      <Link href="/market-analysis" className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>Market Analysis</Link>
                      {isFranchise && (
                        <Link href="/franchise"     className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>Franchise Navigator</Link>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Documents — always visible */}
              {showApp && (
                <Link href={docsHref} className="text-sm transition-colors"
                  style={{ color: linkColor(pathname.startsWith("/documents")) }}
                  onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                  onMouseLeave={e => e.currentTarget.style.color = linkColor(pathname.startsWith("/documents"))}
                >
                  Documents
                </Link>
              )}

              {/* Simulator — always visible for authenticated users */}
              <Link href="/simulator" className="text-sm transition-colors"
                style={{ color: linkColor(pathname.startsWith("/simulator")) }}
                onMouseEnter={e => e.currentTarget.style.color = HOVER_ON}
                onMouseLeave={e => e.currentTarget.style.color = linkColor(pathname.startsWith("/simulator"))}
              >
                Simulator
              </Link>

              {/* Account dropdown */}
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => { setAccountOpen(v => !v); setAppOpen(false); setIntelOpen(false); }}
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: "rgba(245,240,232,0.78)" }}
                >
                  <span>{user?.first_name ?? "Account"}</span>
                  {chevron(accountOpen)}
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] shadow-lg z-50">
                    {showApp && (
                      <>
                        <Link href="/case-profile" className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>
                          My Case Profile
                        </Link>
                        {divider}
                      </>
                    )}
                    <Link href="/settings" className={dropdownItem} style={{ color: DIM_MED }} onClick={closeAll}>
                      Settings
                    </Link>
                    {divider}
                    <button onClick={handleSignOut} className={`w-full text-left ${dropdownItem}`} style={{ color: DIM_MED }}>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Toggle mobile menu">
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform ${mobileMenuOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-opacity ${mobileMenuOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block w-6 h-0.5 bg-[#C9A84C] transition-transform ${mobileMenuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>
      </div>

      {/* ─── Mobile Menu ─── */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[rgba(201,168,76,0.1)] px-4 pb-6 pt-2" style={{ background: "rgba(10,10,10,0.98)" }}>
          {!user ? (
            <div className="flex flex-col gap-4">
              {[["Learn", "/learn"], ["Pricing", "/pricing"], ["Simulator", "/simulator"]].map(([label, href]) => (
                <Link key={href} href={href} className="text-sm py-2" style={{ color: DIM }} onClick={closeAll}>{label}</Link>
              ))}
              <Link href="/login" className="text-sm py-2" style={{ color: DIM }} onClick={closeAll}>Log in</Link>
              <Link href="/quiz" className="text-sm py-3 text-center" style={{ padding: "8px 18px", border: "1px solid rgba(201,168,76,0.5)", color: GOLD, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", background: "transparent", borderRadius: 0, marginTop: "4px" }} onClick={closeAll}>
                Check eligibility
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Application group */}
              {showApp && (
                <>
                  <div style={{ color: "rgba(201,168,76,0.4)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", paddingTop: "6px" }}>Application</div>
                  <Link href="/case-profile"    className="text-sm py-1 pl-3" style={{ color: isActive("/case-profile") ? GOLD : DIM_MED }}    onClick={closeAll}>Case File</Link>
                  <Link href="/gap-analysis"    className="text-sm py-1 pl-3" style={{ color: isActive("/gap-analysis") ? GOLD : DIM_MED }}    onClick={closeAll}>Gap Analysis</Link>
                  <Link href="/apply/checklist" className="text-sm py-1 pl-3" style={{ color: isActive("/apply/checklist") ? GOLD : DIM_MED }} onClick={closeAll}>Checklist</Link>
                </>
              )}

              {/* Intelligence group */}
              {showApp && (
                <>
                  <div style={{ color: "rgba(201,168,76,0.4)", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", paddingTop: "6px" }}>Intelligence</div>
                  <Link href="/fdd"             className="text-sm py-1 pl-3" style={{ color: pathname.startsWith("/fdd") ? GOLD : DIM_MED }}       onClick={closeAll}>FDD Analysis</Link>
                  <Link href="/market-analysis" className="text-sm py-1 pl-3" style={{ color: isActive("/market-analysis") ? GOLD : DIM_MED }}       onClick={closeAll}>Market Analysis</Link>
                  {isFranchise && (
                    <Link href="/franchise"     className="text-sm py-1 pl-3" style={{ color: pathname.startsWith("/franchise") ? GOLD : DIM_MED }} onClick={closeAll}>Franchise Navigator</Link>
                  )}
                </>
              )}

              {showApp && (
                <Link href={docsHref} className="text-sm py-2" style={{ color: pathname.startsWith("/documents") ? GOLD : DIM }} onClick={closeAll}>Documents</Link>
              )}
              <Link href="/simulator" className="text-sm py-2" style={{ color: pathname.startsWith("/simulator") ? GOLD : DIM }} onClick={closeAll}>Simulator</Link>

              <div style={{ height: "1px", background: "rgba(201,168,76,0.1)", margin: "4px 0" }} />

              {showApp && (
                <Link href="/case-profile" className="text-sm py-2" style={{ color: isActive("/case-profile") ? GOLD : DIM_MED }} onClick={closeAll}>My Case Profile</Link>
              )}
              <Link href="/settings" className="text-sm py-2" style={{ color: DIM_MED }} onClick={closeAll}>Settings</Link>
              <button onClick={handleSignOut} className="text-left text-sm py-2" style={{ color: DIM_MED }}>Log out</button>
            </div>
          )}
        </div>
      )}
    </header>
    {/* D6 Point 2 — outcomes consent banner; fixed to viewport bottom so it never overlaps page titles */}
    {user && <OutcomesConsentBanner />}
    </>
  );
}
