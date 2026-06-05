"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface TabStatus {
  letter: string;
  title: string;
  complete: boolean;
  answerCount: number;
  questionCount: number;
}

const TABS: { letter: string; title: string }[] = [
  { letter: "A", title: "Personal & Passport" },
  { letter: "B", title: "Personal Checklist" },
  { letter: "C", title: "Visa Category" },
  { letter: "D", title: "Cover Letter Details" },
  { letter: "E", title: "Ownership & Control" },
  { letter: "F", title: "Investment Proof" },
  { letter: "G", title: "Business Evidence" },
  { letter: "H", title: "Source of Funds" },
  { letter: "I", title: "Non-Marginality" },
  { letter: "J", title: "Qualifications" },
  { letter: "K", title: "Business Plan" },
  { letter: "L", title: "Family Dependents" },
];

export default function Module3Overview() {
  const router = useRouter();
  const [tabs, setTabs] = useState<TabStatus[]>(
    TABS.map((t) => ({
      ...t,
      complete: false,
      answerCount: 0,
      questionCount: 0,
    }))
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [applicationId, setApplicationId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const supabase = createBrowserSupabaseClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: apps } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (!apps || apps.length === 0) {
          setLoading(false);
          return;
        }

        const appId = apps[0].id;
        setApplicationId(appId);

        const { data: answers } = await supabase
          .from("answers")
          .select("question_id")
          .eq("application_id", appId);

        const _answeredIds = new Set(answers?.map((a: { question_id: string }) => a.question_id) || []);

        // Tab prefixes: Tab A answers use a_ prefix, etc.
        const updatedTabs = TABS.map((tab) => {
          const prefix = `${tab.letter.toLowerCase()}_`;
          const tabAnswers = answers?.filter((a: { question_id: string }) =>
            a.question_id.startsWith(prefix)
          ) || [];
          return {
            ...tab,
            answerCount: tabAnswers.length,
            questionCount: 0, // We don't know the exact question count per tab here
            complete: tabAnswers.length > 0,
          };
        });

        setTabs(updatedTabs);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  const allComplete = tabs.every((t) => t.complete);

  const handleGeneratePackage = async () => {
    if (!applicationId || !userId) return;
    setGenerating(true);

    try {
      const res = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      // Kick off background pipeline
      await fetch(`/api/generate/run/${data.jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      // Navigate to Module 4 (follow-up conversation) before generation
      router.push(`/apply/module4`);
    } catch {
      setGenerating(false);
    }
  };

  const completedCount = tabs.filter((t) => t.complete).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="text-4xl font-light tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Module 3 — Your Application
          </h1>
          <p
            className="mt-3 text-sm text-white/50"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {completedCount} of {TABS.length} sections complete
          </p>
          {/* Overall progress bar */}
          <div className="mt-4 h-[2px] w-full bg-white/8">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(completedCount / TABS.length) * 100}%`,
                backgroundColor: "#C9A84C",
              }}
            />
          </div>
        </div>

        {/* Tab Grid */}
        <div className="mb-12 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {tabs.map((tab) => (
            <button
              key={tab.letter}
              onClick={() =>
                router.push(`/apply/module3/${tab.letter.toLowerCase()}`)
              }
              className="flex items-center gap-3 border px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
              style={{
                borderColor: tab.complete
                  ? "rgba(201,168,76,0.3)"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <span
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center text-xs ${
                  tab.complete ? "text-[#C9A84C]" : "text-white/20"
                }`}
              >
                {tab.complete ? "✓" : tab.letter}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm ${
                    tab.complete ? "text-[#C9A84C]" : "text-white/50"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {tab.title}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* Generate Button */}
        {allComplete && (
          <div className="text-center">
            <div className="mb-8">
              <p
                className="mb-2 text-sm text-[#C9A84C]"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                All sections are complete. Your application is ready for
                document generation.
              </p>
              <p
                className="text-xs text-white/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                This process takes 3–5 minutes. Each document will be written
                specifically for your case.
              </p>
            </div>
            <button
              onClick={handleGeneratePackage}
              disabled={generating}
              className="border border-[#C9A84C] bg-[#C9A84C] px-10 py-4 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c] disabled:opacity-50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {generating ? "Starting..." : "Generate My Package →"}
            </button>
          </div>
        )}

        {!allComplete && (
          <div className="text-center">
            <p
              className="text-xs text-white/20"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Complete all {TABS.length} sections above to unlock document
              generation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}