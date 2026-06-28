"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import quizData from "@/data/module0_questions.json";

interface QuizQuestion {
  id: string;
  question: string;
  section: string;
  is_sub: boolean;
  parent: string | null;
}

// Build lookup from the single source of truth — the quiz JSON.
// This ensures sub-questions are never silently dropped.
const ALL_QUESTIONS = quizData.questions as QuizQuestion[];
const QUESTIONS_MAP: Record<string, { q: string; section: string; is_sub: boolean }> =
  Object.fromEntries(
    ALL_QUESTIONS.map(q => [q.id, { q: q.question, section: q.section, is_sub: q.is_sub }])
  );

// Section display order matches quiz flow
const SECTION_ORDER = ["Eligibility", "Investment", "Family", "Business", "Professional", "History", "Home Ties"];

export default function QuizReview() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Try localStorage first (works for unauthenticated users with a draft)
      const draft = localStorage.getItem("e2go_quiz_draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft) as { answers?: Record<string, string | string[]> };
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            setAnswers(parsed.answers);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Also try the completed quiz result stored after submission
      const result = localStorage.getItem("e2go_quiz_result");
      if (result) {
        try {
          const parsed = JSON.parse(result) as { answers?: Record<string, string | string[]> };
          if (parsed.answers && Object.keys(parsed.answers).length > 0) {
            setAnswers(parsed.answers);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Fallback: fetch from DB for authenticated users
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: session } = await supabase
            .from("quiz_sessions")
            .select("result_json")
            .eq("user_id", user.id)
            .not("outcome", "is", null)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          const dbAnswers = (session?.result_json as Record<string, unknown>)?.answers;
          if (dbAnswers && typeof dbAnswers === "object") {
            setAnswers(dbAnswers as Record<string, string | string[]>);
          }
        }
      } catch {}

      setLoading(false);
    };

    load();
  }, []);

  // Mark that the user has navigated away to change an answer
  useEffect(() => {
    const flag = localStorage.getItem("quiz_review_changed");
    if (flag) {
      setHasChanges(true);
      localStorage.removeItem("quiz_review_changed");
    }
  }, []);

  const handleJumpToQuestion = (questionId: string) => {
    localStorage.setItem("quiz_jump_to_id", questionId);
    localStorage.setItem("quiz_return_to_results", "true");
    localStorage.setItem("quiz_review_changed", "true");
    router.push("/quiz");
  };

  const handleConfirm = () => {
    router.push("/results");
  };

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading...</div>
      </div>
    );
  }

  // Only show questions where we have an answer AND the key is recognised in the quiz JSON
  const answeredIds = Object.keys(answers).filter(id => QUESTIONS_MAP[id]);

  // Group by section, preserving quiz section order
  const grouped: Record<string, Array<{ id: string; question: string; answer: string | string[]; is_sub: boolean }>> = {};
  for (const id of answeredIds) {
    const meta = QUESTIONS_MAP[id];
    if (!grouped[meta.section]) grouped[meta.section] = [];
    grouped[meta.section].push({ id, question: meta.q, answer: answers[id], is_sub: meta.is_sub });
  }

  const formatAnswer = (answer: string | string[]): string => {
    if (Array.isArray(answer)) return answer.join(", ");
    return answer;
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>

      {/* Header */}
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Quiz review</div>
      </div>

      <div style={{ padding: "48px 40px 80px", maxWidth: "680px" }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.3 }}>
          Review your answers
        </div>
        <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.74)", marginBottom: "40px", lineHeight: 1.6 }}>
          Click any answer to change it — sub-questions are shown indented below their parent.
        </div>

        {answeredIds.length === 0 ? (
          <div style={{ padding: "40px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.72)" }}>No answers saved yet.</div>
            <button
              onClick={() => router.push("/quiz")}
              style={{ marginTop: "16px", padding: "11px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}
            >
              Start the quiz →
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {SECTION_ORDER.filter(s => grouped[s]).map(section => (
              <div key={section}>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.82)", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                  {section}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {grouped[section].map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleJumpToQuestion(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        marginLeft: item.is_sub ? "20px" : "0",
                        border: "1px solid rgba(201,168,76,0.1)",
                        borderLeft: item.is_sub ? "2px solid rgba(201,168,76,0.25)" : "1px solid rgba(201,168,76,0.1)",
                        background: item.is_sub ? "rgba(201,168,76,0.015)" : "rgba(201,168,76,0.02)",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                        borderRadius: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.35)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = item.is_sub ? "rgba(201,168,76,0.25)" : "rgba(201,168,76,0.1)"}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {item.is_sub && (
                          <div style={{ fontSize: "8px", letterSpacing: "0.1em", color: "rgba(201,168,76,0.45)", textTransform: "uppercase", marginBottom: "2px" }}>
                            Follow-up
                          </div>
                        )}
                        <div style={{ fontSize: "13px", color: item.is_sub ? "rgba(245,240,232,0.78)" : "#f5f0e8", marginBottom: "3px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.question}
                        </div>
                        <div style={{ fontSize: "12px", color: "#C9A84C", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {formatAnswer(item.answer)}
                        </div>
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", letterSpacing: "0.04em", flexShrink: 0, marginLeft: "16px" }}>
                        Change →
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirm CTA — bottom right */}
        {answeredIds.length > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "48px", paddingTop: "24px", borderTop: "1px solid rgba(201,168,76,0.08)" }}>
            <button
              onClick={handleConfirm}
              style={{
                padding: "14px 32px",
                background: "#C9A84C",
                color: "#0a0a0a",
                fontSize: "12px",
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                borderRadius: 0,
              }}
            >
              {hasChanges ? "Confirm My Answers →" : "Back to Results →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
