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

export default function DashboardPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [lifecycle, setLifecycle] = useState<LifecycleData | null>(null);
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

        setUser(profile || null);
        setQuiz(quizData || null);
        setLifecycle(lifecycleData);
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-6xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSignOut}
              className="text-sm text-[#434655] hover:text-[#004ac6]"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-12 px-4 md:px-8 max-w-6xl mx-auto">
        {/* Welcome */}
        <section className="mb-8">
          <h1 className="text-2xl font-bold text-[#0b1c30] mb-2">
            Welcome back{user?.full_name ? `, ${user.full_name}` : ""}
          </h1>
          <p className="text-[#434655]">
            {user?.email || "Manage your E-2 visa application"}
          </p>
        </section>

        {quiz ? (
          <>
            {/* Status Cards */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Application Progress */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
                <h3 className="text-sm font-medium text-[#737686] mb-2">Application Progress</h3>
                <p className="text-2xl font-bold text-[#0b1c30]">
                  {progress > 0 ? `${progress}% Complete` : "Not Started"}
                </p>
                {progress > 0 && (
                  <div className="w-full bg-[#e2e8f0] rounded-full h-2 mt-2">
                    <div 
                      className="bg-[#004ac6] h-2 rounded-full transition-all" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Quiz Result */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
                <h3 className="text-sm font-medium text-[#737686] mb-2">Eligibility Status</h3>
                <p className="text-2xl font-bold text-[#0b1c30] capitalize">
                  {quiz.outcome.replace(/_/g, " ")}
                </p>
                <p className="text-sm text-[#434655] mt-1">
                  {quiz.application_type || "Solo"} Application
                </p>
              </div>

              {/* Next Step */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
                <h3 className="text-sm font-medium text-[#737686] mb-2">Next Step</h3>
                <p className="text-lg font-semibold text-[#0b1c30]">
                  {progress < 100 ? "Continue building your case" : "Ready to submit!"}
                </p>
                <Link
                  href={progress < 100 ? "/apply/onboarding?demo=true" : "/export"}
                  className="inline-block mt-3 text-sm text-[#004ac6] hover:underline"
                >
                  {progress < 100 ? "Continue →" : "Submit Application →"}
                </Link>
              </div>
            </section>

            {/* Progress Bar */}
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-8">
              <h2 className="text-lg font-semibold text-[#0b1c30] mb-4">Module Progress</h2>
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
                    <div key={i} className={`p-3 rounded-lg ${completed ? 'bg-[#d4edda] text-[#155724]' : 'bg-[#f8f9ff] text-[#737686]'}`}>
                      <p className="text-xs font-medium">{mod}</p>
                      <p className="text-lg">{completed ? '✓' : '○'}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="bg-white rounded-xl border border-[#e2e8f0] p-6">
              <h2 className="text-lg font-semibold text-[#0b1c30] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/quiz"
                  className="p-4 rounded-lg border border-[#e2e8f0] hover:border-[#004ac6] hover:bg-[#f8f9ff] transition-colors"
                >
                  <p className="font-medium text-[#0b1c30]">Retake Quiz</p>
                  <p className="text-sm text-[#737686]">Check eligibility</p>
                </Link>
                <Link
                  href="/apply/onboarding?demo=true"
                  className="p-4 rounded-lg border border-[#e2e8f0] hover:border-[#004ac6] hover:bg-[#f8f9ff] transition-colors"
                >
                  <p className="font-medium text-[#0b1c30]">Case Builder</p>
                  <p className="text-sm text-[#737686]">Complete your application</p>
                </Link>
                <Link
                  href="/simulator"
                  className="p-4 rounded-lg border border-[#e2e8f0] hover:border-[#004ac6] hover:bg-[#f8f9ff] transition-colors"
                >
                  <p className="font-medium text-[#0b1c30]">Interview Prep</p>
                  <p className="text-sm text-[#737686]">Practice with AI</p>
                </Link>
                <Link
                  href="/support"
                  className="p-4 rounded-lg border border-[#e2e8f0] hover:border-[#004ac6] hover:bg-[#f8f9ff] transition-colors"
                >
                  <p className="font-medium text-[#0b1c30]">Get Help</p>
                  <p className="text-sm text-[#737686]">Contact support</p>
                </Link>
              </div>
            </section>
          </>
        ) : (
          /* Empty State - No Quiz Completed */
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-8 text-center">
            <h2 className="text-xl font-semibold text-[#0b1c30] mb-4">Start Your E-2 Application</h2>
            <p className="text-[#434655] mb-6">
              Take the eligibility quiz to see if you qualify for the E-2 treaty investor visa.
            </p>
            <Link
              href="/quiz"
              className="inline-block bg-[#004ac6] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#003699] transition-colors"
            >
              Start your application →
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
