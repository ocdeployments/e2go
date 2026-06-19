"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { PartialProfileTeaser } from "@/components/PartialProfileTeaser";

interface UserProfile {
  email?: string;
  first_name?: string;
  last_name?: string;
  tier?: string;
}

interface QuizData {
  id: string;
  outcome: string;
  application_type: string | null;
  completed_at: string;
}

interface LifecycleData {
  module0_completed_at?: string;
  module1_completed_at?: string;
  module2_completed_at?: string;
  module3_completed_at?: string;
  module4_completed_at?: string;
  module5_completed_at?: string;
  module6_completed_at?: string;
}

interface TimelineData {
  workingTargetDate: string | null;
  confirmedInterviewDate: string | null;
}

interface SimulatorData {
  sessionsUsed: number;
  sessionsPurchased: number;
}

interface CaseProfileData {
  archetype?: string | null;
  completeness_score?: number | null;
  net_worth_range?: string | null;
  industry_interest?: string | null;
  timeline_goal?: string | null;
  data_state?: string | null;
}

export default function DashboardPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [isSimulatorOnly, setIsSimulatorOnly] = useState(false);
  const [simulatorData, setSimulatorData] = useState<SimulatorData | null>(null);
  const [caseProfile, setCaseProfile] = useState<CaseProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Use the shared singleton — safe now that duplicate GoTrueClient
        // instances are eliminated (Session 29 singleton fix).
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (!authUser) {
          // No session — middleware should have caught this,
          // but handle gracefully anyway
          window.location.href = '/login';
          return;
        }

        // Get user profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        // Get latest quiz session
        const { data: quizData } = await supabase
          .from("quiz_sessions")
          .select("id, outcome, application_type, completed_at")
          .eq("user_id", authUser.id)
          .order("completed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get application lifecycle
        let lifecycleData: LifecycleData | null = null;
        if (quizData) {
          const { data: life } = await supabase
            .from("application_lifecycle")
            .select("*")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          lifecycleData = life;
        }

        // Get timeline data
        let timelineData: TimelineData | null = null;
        if (quizData) {
          const { data: app } = await supabase
            .from("applications")
            .select("working_target_date, confirmed_interview_date")
            .eq("user_id", authUser.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          timelineData = app
            ? {
                workingTargetDate: app.working_target_date,
                confirmedInterviewDate: app.confirmed_interview_date,
              }
            : null;
        }

        // Determine whether this user has any "build my case" application,
        // or only ever purchased the standalone interview simulator. Simulator-only
        // subscribers should not see case-building / document-generation UI.
        const { data: allApps } = await supabase
          .from("applications")
          .select("source, simulator_sessions_used, simulator_sessions_purchased")
          .eq("user_id", authUser.id);

        const simulatorOnly = Boolean(
          allApps && allApps.length > 0 && allApps.every((a: { source: string | null }) => a.source === "simulator_standalone")
        );

        let simData: SimulatorData | null = null;
        if (simulatorOnly && allApps) {
          simData = allApps.reduce(
            (acc: SimulatorData, a: { simulator_sessions_used: number | null; simulator_sessions_purchased: number | null }) => ({
              sessionsUsed: acc.sessionsUsed + (a.simulator_sessions_used || 0),
              sessionsPurchased: acc.sessionsPurchased + (a.simulator_sessions_purchased || 0),
            }),
            { sessionsUsed: 0, sessionsPurchased: 0 }
          );
        }

        // Get case profile (archetype, completeness, snapshot fields)
        const { data: cpData } = await supabase
          .from('case_profiles')
          .select('archetype, completeness_score, net_worth_range, industry_interest, timeline_goal, data_state')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (!cancelled) {
          setUser(profile || null);
          setQuiz(quizData || null);
          setLifecycle(lifecycleData);
          setTimeline(timelineData);
          setIsSimulatorOnly(simulatorOnly);
          setSimulatorData(simData);
          setCaseProfile(cpData || null);
        }
      } catch (err) {
        console.error("[dashboard] init failed:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    init();

    return () => { cancelled = true; };
  }, [supabase]);

  // Calculate progress based on lifecycle milestones
  const getProgress = () => {
    if (!lifecycle) return 0;
    let completed = 0;
    const total = 6; // modules 0-5 (6 total)
    if (lifecycle.module0_completed_at) completed++;
    if (lifecycle.module1_completed_at) completed++;
    if (lifecycle.module2_completed_at) completed++;
    if (lifecycle.module3_completed_at) completed++;
    if (lifecycle.module4_completed_at) completed++;
    if (lifecycle.module5_completed_at) completed++;
    return Math.round((completed / total) * 100);
  };

  const progress = getProgress();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div style={{ color: "#C9A84C" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a" }}>
      <main className="pt-20 pb-12 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Welcome */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            Welcome back{user?.first_name ? `, ${user.first_name}` : ""}
          </h1>
          <p style={{ color: "rgba(245,240,232,0.6)" }}>
            Manage your E-2 visa application
          </p>
        </section>

        {isSimulatorOnly ? (
          <>
            {/* Simulator-only subscriber dashboard */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>Interview Simulator</h3>
                <p className="text-2xl font-bold" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  {simulatorData ? `${Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0)} session${Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0) === 1 ? '' : 's'} remaining` : 'Ready to practice'}
                </p>
                {simulatorData && (
                  <p className="text-sm mt-1" style={{ color: "rgba(245,240,232,0.45)" }}>
                    {simulatorData.sessionsUsed} of {simulatorData.sessionsPurchased} used
                  </p>
                )}
                <Link
                  href="/simulator"
                  className="inline-block mt-3 text-sm font-medium px-4 py-2 bg-[#C9A84C] text-[#0a0a0a] transition-colors hover:bg-[#D4BC6A]"
                  style={{ borderRadius: 0 }}
                >
                  Go to practice interview →
                </Link>
              </div>

              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>About your plan</h3>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.7 }}>
                  You&rsquo;re on the standalone Interview Simulator. Each practice session draws on the
                  documents you&rsquo;ve uploaded to ask the kind of questions a consular officer would.
                </p>
              </div>
            </section>

            {/* Quick Actions */}
            <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link
                  href="/simulator"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Practice interview</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Run a simulated consular interview</p>
                </Link>
                <Link
                  href="/support"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Get Help</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Contact support</p>
                </Link>
              </div>
            </section>

            {/* Profile teaser — drives conversion from simulator-only to full platform */}
            <PartialProfileTeaser />
          </>
        ) : quiz ? (
          <>
            {/* Status Cards */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Application Progress */}
              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>Application Progress</h3>
                <p className="text-2xl font-bold" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  {progress > 0 ? `${progress}% Complete` : "Not Started"}
                </p>
                {progress > 0 && (
                  <div className="w-full h-2 mt-2" style={{ background: "rgba(201,168,76,0.15)" }}>
                    <div
                      className="h-2 transition-all"
                      style={{ width: `${progress}%`, background: "#C9A84C" }}
                    />
                  </div>
                )}
              </div>

              {/* Quiz Result */}
              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>Eligibility Status</h3>
                <p className="text-2xl font-bold capitalize" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  {quiz.outcome.replace(/_/g, " ")}
                </p>
                <p className="text-sm mt-1" style={{ color: "rgba(245,240,232,0.45)" }}>
                  {quiz.application_type || "Solo"} Application
                </p>
              </div>

              {/* Timeline Status */}
              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>Interview Timeline</h3>
                {timeline?.confirmedInterviewDate ? (
                  <>
                    <p className="text-xl font-bold flex items-center gap-2" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                      <span>Interview confirmed</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-[#C9A84C]" />
                    </p>
                    <p className="text-sm mt-1" style={{ color: "rgba(245,240,232,0.8)" }}>
                      {new Date(timeline.confirmedInterviewDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </>
                ) : timeline?.workingTargetDate ? (
                  <>
                    <p className="text-xl font-bold" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                      {new Date(timeline.workingTargetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.45)" }}>
                      Target move date (planning)
                    </p>
                    <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                      Confirm your interview date to lock in deadlines
                    </p>
                    <Link href="/apply/calendar" className="inline-block mt-2 text-xs" style={{ color: "#C9A84C" }}>
                      Enter confirmed date →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold" style={{ color: "rgba(245,240,232,0.6)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                      Not set
                    </p>
                    <Link href="/apply/calendar" className="inline-block mt-2 text-xs" style={{ color: "#C9A84C" }}>
                      Set timeline →
                    </Link>
                  </>
                )}
              </div>

              {/* Next Step */}
              <div style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <h3 className="text-sm font-medium mb-2" style={{ color: "rgba(245,240,232,0.6)" }}>Next Step</h3>
                <p className="text-lg font-semibold" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  {progress < 100 ? "Continue building your case" : "Ready to submit!"}
                </p>
                <Link
                  href="/apply"
                  className="inline-block mt-3 text-sm font-medium px-4 py-2 bg-[#C9A84C] text-[#0a0a0a] transition-colors hover:bg-[#D4BC6A]"
                  style={{ borderRadius: 0 }}
                >
                  Continue my application →
                </Link>
              </div>
            </section>

            {/* Module Checklist — replaces confusing progress bar */}
            <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0, marginBottom: "32px" }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Your Application Checklist</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Eligibility Quiz', href: '/quiz', done: !!lifecycle?.module0_completed_at, desc: 'Confirm E-2 eligibility' },
                  { label: 'Onboarding', href: '/apply', done: !!lifecycle?.module1_completed_at, desc: 'Personal info & timeline' },
                  { label: 'Business Information', href: '/apply/business', done: !!lifecycle?.module2_completed_at, desc: 'Business description & structure' },
                  { label: 'Investment & Documents', href: '/apply/upload', done: !!lifecycle?.module3_completed_at, desc: 'Source of funds & supporting docs' },
                  { label: 'Gap Analysis', href: '/gap-analysis', done: !!lifecycle?.module4_completed_at, desc: 'Identify case weaknesses' },
                  { label: 'Interview Simulator', href: '/simulator', done: !!lifecycle?.module5_completed_at, desc: 'Practice your consular interview' },
                ].map((step) => (
                  <Link
                    key={step.label}
                    href={step.href}
                    className="flex items-start gap-3 p-3 transition-colors"
                    style={{ background: step.done ? "rgba(201,168,76,0.06)" : "transparent", border: `1px solid ${step.done ? "rgba(201,168,76,0.3)" : "rgba(201,168,76,0.12)"}`, borderRadius: 0, textDecoration: 'none' }}
                  >
                    <span style={{ minWidth: 20, height: 20, borderRadius: '50%', background: step.done ? '#C9A84C' : 'transparent', border: `1.5px solid ${step.done ? '#C9A84C' : 'rgba(201,168,76,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                      {step.done && <span style={{ color: '#0a0a0a', fontSize: 11, fontWeight: 700 }}>✓</span>}
                    </span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: step.done ? '#C9A84C' : '#f5f0e8' }}>{step.label}</p>
                      <p className="text-xs" style={{ color: 'rgba(245,240,232,0.45)' }}>{step.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* Profile Snapshot — from case_profiles */}
            {caseProfile && (
              <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0, marginBottom: "32px" }}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Your Investor Profile</h2>
                  {caseProfile.completeness_score != null && (
                    <span className="text-sm px-3 py-1" style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', color: '#C9A84C' }}>
                      {Math.round(caseProfile.completeness_score)}% complete
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {caseProfile.archetype && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Investor type</p>
                      <p className="text-sm font-medium capitalize" style={{ color: '#f5f0e8' }}>{caseProfile.archetype.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {caseProfile.industry_interest && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Industry</p>
                      <p className="text-sm font-medium capitalize" style={{ color: '#f5f0e8' }}>{caseProfile.industry_interest.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                  {caseProfile.net_worth_range && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Net worth range</p>
                      <p className="text-sm font-medium" style={{ color: '#f5f0e8' }}>{caseProfile.net_worth_range}</p>
                    </div>
                  )}
                  {caseProfile.timeline_goal && (
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(245,240,232,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Target timeline</p>
                      <p className="text-sm font-medium capitalize" style={{ color: '#f5f0e8' }}>{caseProfile.timeline_goal.replace(/_/g, ' ')}</p>
                    </div>
                  )}
                </div>
                {caseProfile.completeness_score != null && caseProfile.completeness_score < 80 && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(201,168,76,0.1)' }}>
                    <Link href="/gap-analysis" className="text-sm" style={{ color: '#C9A84C' }}>
                      View your gap analysis to strengthen this profile →
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* Quick Actions */}
            <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/apply/checklist"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Document Checklist</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>View required documents</p>
                </Link>
                <Link
                  href="/gap-analysis"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Gap Analysis</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>See what&apos;s missing in your case</p>
                </Link>
                <Link
                  href="/fdd"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>FDD Analysis</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Analyse your franchise disclosure</p>
                </Link>
                <Link
                  href="/support"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Get Help</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Contact support</p>
                </Link>
              </div>
            </section>
          </>
        ) : (
          /* Empty State - No Quiz Completed */
          <section style={{ padding: "32px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0, textAlign: "center" }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Start Your E-2 Application</h2>
            <p className="mb-6" style={{ color: "rgba(245,240,232,0.6)" }}>
              Take the eligibility quiz to see if you qualify for the E-2 treaty investor visa.
            </p>
            <Link
              href="/quiz"
              className="inline-block px-6 py-3 font-medium transition-colors"
              style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
            >
              Start your application →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
