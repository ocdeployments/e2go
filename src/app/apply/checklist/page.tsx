"use client";

import { useState, useEffect } from "react";
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import PreAppChecklist, { ChecklistItem } from "@/components/PreAppChecklist";
import { generatePreAppChecklist } from "@/lib/checklist-generator";

export default function ChecklistPage() {
  useTrackSectionVisit("checklist");

  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [quizPrompt, setQuizPrompt] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      let quizData: { answers?: Record<string, string | string[]> } | null = null;

      if (user) {
        // 1. Try Supabase quiz_sessions or application answers
        const { data: app } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (app) {
          const { data: answers } = await supabase
            .from("answers")
            .select("question_key, answer_value")
            .eq("application_id", app.id);

          if (answers) {
            const parsedAnswers: Record<string, string | string[]> = {};
            answers.forEach(a => {
              parsedAnswers[a.question_key] = a.answer_value;
            });
            quizData = { answers: parsedAnswers };
          }
        }
      }

      // 2. Fallback to localStorage if no Supabase data
      if (!quizData) {
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            quizData = { answers: parsed.answers || {} };
          } catch {
            // Ignore parse errors
          }
        }
      }

      if (quizData && quizData.answers) {
        setChecklistItems(generatePreAppChecklist(quizData));
        setQuizPrompt(false);
      } else {
        setChecklistItems(generatePreAppChecklist(null));
        setQuizPrompt(true);
      }

      setLoading(false);
    };

    init();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#f5f0e8]/70 font-[DM_Sans]">Loading checklist...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-[DM_Sans]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#C9A84C]/20">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#C9A84C]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-semibold text-[#f5f0e8] font-['Cormorant_Garamond']">e2go.app</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-[#f5f0e8]/70 hover:text-[#C9A84C] transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-sm mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">YOUR ROADMAP</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold font-['Cormorant_Garamond'] text-[#f5f0e8] mb-4">
              Application Checklist
            </h1>
            <p className="text-lg text-[#f5f0e8]/70 max-w-xl mx-auto">
              Track your progress from document preparation through visa approval.
            </p>
          </div>

          {/* Checklist Component */}
          <PreAppChecklist items={checklistItems} promptForQuiz={quizPrompt} />

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[#C9A84C]/20">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-[#f5f0e8]/50">
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm.
          </p>
        </div>
      </footer>
    </div>
  );
}