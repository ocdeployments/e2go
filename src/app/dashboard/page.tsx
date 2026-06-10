"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface UserProfile {
  email?: string;
  full_name?: string;
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

export default function DashboardPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleData | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (authUser) {
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
          .single();

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
            .single();
          timelineData = app
            ? {
                workingTargetDate: app.working_target_date,
                confirmedInterviewDate: app.confirmed_interview_date,
              }
            : null;
        }

        setUser(profile || null);
        setQuiz(quizData || null);
        setLifecycle(lifecycleData);
        setTimeline(timelineData);
      }
      setLoading(false);
    };

    init();
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="text-sm"
              style={{ color: "rgba(245,240,232,0.6)" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Welcome */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p style={{ color: "rgba(245,240,232,0.6)" }}>
            {user?.email || "Manage your E-2 visa application"}
          </p>
        </section>

        {quiz ? (
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

            {/* Progress Bar */}
            <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0, marginBottom: "32px" }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Module Progress</h2>
              <div className="grid grid-cols-6 gap-2 text-center">
                {['Quiz', 'Onboarding', 'Business', 'Documents', 'Score', 'Simulator'].map((mod, i) => {
                  const completed = [
                    lifecycle?.module0_completed_at,
                    lifecycle?.module1_completed_at,
                    lifecycle?.module2_completed_at,
                    lifecycle?.module3_completed_at,
                    lifecycle?.module4_completed_at,
                    lifecycle?.module5_completed_at,
                  ][i];
                  return (
                    <div key={i} className="p-3" style={{ background: completed ? "rgba(201,168,76,0.08)" : "rgba(201,168,76,0.02)", color: completed ? "#C9A84C" : "rgba(245,240,232,0.45)" }}>
                      <p className="text-xs font-medium">{mod}</p>
                      <p className="text-lg">{completed ? '✓' : '○'}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions */}
            <section style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  href="/apply/checklist"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>Document Checklist</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>View required documents</p>
                </Link>
                <Link
                  href="/score"
                  className="p-4 transition-colors"
                  style={{ border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                >
                  <p className="font-medium" style={{ color: "#f5f0e8" }}>View my confidence score</p>
                  <p className="text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>Assess application strength</p>
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
