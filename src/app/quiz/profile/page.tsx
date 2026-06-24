"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Profile questions — shown after quiz, before results
// ---------------------------------------------------------------------------

interface ProfileQuestion {
  id: string;
  question: string;
  helper?: string;
  type: "select" | "multiselect";
  options: Array<{ text: string; value: string }>;
  skippable: boolean;
}

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    id: "net_worth_range",
    question: "What is your approximate net worth, excluding your primary residence?",
    helper: "This helps us match you with franchise opportunities that fit your financial profile.",
    type: "select",
    options: [
      { text: "Under $250,000", value: "under_250k" },
      { text: "$250,000 – $500,000", value: "250k_500k" },
      { text: "$500,000 – $1,000,000", value: "500k_1m" },
      { text: "$1,000,000 – $2,500,000", value: "1m_2_5m" },
      { text: "Over $2,500,000", value: "over_2_5m" },
    ],
    skippable: true,
  },
  {
    id: "prior_business",
    question: "What is your business background?",
    helper: "This helps us tailor your case strategy and coaching to your experience level.",
    type: "select",
    options: [
      { text: "I have owned and operated a business before", value: "owner" },
      { text: "I have managed a business or team, but not owned", value: "manager" },
      { text: "I am transitioning from employment or a profession", value: "career_switcher" },
      { text: "I am an investor looking to deploy capital", value: "investor" },
    ],
    skippable: true,
  },
  {
    id: "industry_interest",
    question: "What industry or business type are you most interested in?",
    helper: "This is not a commitment — it helps us surface the most relevant opportunities and case examples.",
    type: "select",
    options: [
      { text: "Home care / senior care / healthcare services", value: "home_care" },
      { text: "Food & beverage / restaurant / café", value: "food_beverage" },
      { text: "Retail / consumer services / fitness", value: "retail_services" },
      { text: "Professional services / consulting / staffing", value: "professional_services" },
      { text: "Technology / software / SaaS", value: "technology" },
      { text: "I already have a specific business in mind", value: "existing_business" },
      { text: "I am still exploring options", value: "exploring" },
    ],
    skippable: true,
  },
  {
    id: "timeline_goal",
    question: "When are you hoping to be operating your business in the United States?",
    helper: "This helps us calibrate your preparation timeline and highlight time-sensitive steps.",
    type: "select",
    options: [
      { text: "Within 6 months — I need to move quickly", value: "urgent" },
      { text: "6 to 12 months", value: "6_12mo" },
      { text: "12 to 24 months", value: "12_24mo" },
      { text: "Planning ahead — more than 2 years", value: "planning" },
    ],
    skippable: true,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuizProfilePage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Pre-populate from localStorage if user navigated back
  useEffect(() => {
    const stored = localStorage.getItem("e2go_quiz_profile");
    if (stored) {
      try {
        setAnswers(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const question = PROFILE_QUESTIONS[current];
  const totalQuestions = PROFILE_QUESTIONS.length;
  const progressPct = Math.round(((current) / totalQuestions) * 100);

  const handleSelect = useCallback(
    (value: string) => {
      const updated = { ...answers, [question.id]: value };
      setAnswers(updated);
      localStorage.setItem("e2go_quiz_profile", JSON.stringify(updated));
    },
    [answers, question?.id]
  );

  const handleNext = useCallback(async () => {
    if (current < totalQuestions - 1) {
      setCurrent((c) => c + 1);
      return;
    }

    // Last question — save and navigate to results
    setSaving(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Update most recent quiz_session for this user with the profile data
        const { data: sessions } = await supabase
          .from("quiz_sessions")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (sessions && sessions.length > 0) {
          const industryValue = answers.industry_interest ?? question.id === "industry_interest"
            ? answers.industry_interest
            : undefined;

          await supabase
            .from("quiz_sessions")
            .update({
              post_quiz_profile: answers,
              franchise_triggered:
                industryValue === "home_care" ||
                industryValue === "food_beverage" ||
                industryValue === "retail_services",
            })
            .eq("id", sessions[0].id);
        }
      }
    } catch {
      // Non-blocking — profile data is in localStorage regardless
    } finally {
      setSaving(false);
      // Trigger profile rebuild fire-and-forget
      fetch('/api/profile/rebuild', { method: 'POST' }).catch(() => {});
      router.push("/results?from=quiz");
    }
  }, [current, totalQuestions, answers, question?.id, router]);

  const handleSkip = useCallback(() => {
    if (current < totalQuestions - 1) {
      setCurrent((c) => c + 1);
    } else {
      router.push("/results?from=quiz");
    }
  }, [current, totalQuestions, router]);

  const selectedValue = answers[question?.id] ?? null;
  const canAdvance = selectedValue !== null;

  return (
    <div
      style={{
        background: "#0a0a0a",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'DM Sans', system-ui, sans-serif",
        color: "#f5f0e8",
      }}
    >
      {/* Progress bar */}
      <div style={{ height: "2px", background: "rgba(201,168,76,0.1)" }}>
        <div
          style={{
            height: "100%",
            background: "#C9A84C",
            width: `${progressPct}%`,
            transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          padding: "20px 40px",
          borderBottom: "1px solid rgba(201,168,76,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>
          E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span>
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "rgba(245,240,232,0.68)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {current + 1} of {totalQuestions}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "40px 24px 80px",
          maxWidth: "600px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        {/* Section label */}
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.82)",
            marginBottom: "20px",
          }}
        >
          A few more questions
        </div>

        {/* Question */}
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(22px, 4vw, 30px)",
            fontWeight: 300,
            lineHeight: 1.25,
            color: "#f5f0e8",
            marginBottom: question.helper ? "10px" : "32px",
          }}
        >
          {question.question}
        </div>

        {/* Helper */}
        {question.helper && (
          <div
            style={{
              fontSize: "13px",
              color: "rgba(245,240,232,0.74)",
              lineHeight: 1.6,
              marginBottom: "32px",
            }}
          >
            {question.helper}
          </div>
        )}

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {question.options.map((opt) => {
            const isSelected = selectedValue === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "16px 20px",
                  textAlign: "left",
                  background: isSelected
                    ? "rgba(201,168,76,0.12)"
                    : "rgba(201,168,76,0.02)",
                  border: `1px solid ${isSelected ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.12)"}`,
                  color: isSelected ? "#C9A84C" : "rgba(245,240,232,0.75)",
                  fontSize: "14px",
                  lineHeight: 1.45,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: 0,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)";
                    e.currentTarget.style.color = "rgba(245,240,232,0.9)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = "rgba(201,168,76,0.12)";
                    e.currentTarget.style.color = "rgba(245,240,232,0.75)";
                  }
                }}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "32px",
          }}
        >
          {question.skippable ? (
            <button
              onClick={handleSkip}
              style={{
                fontSize: "13px",
                color: "rgba(245,240,232,0.68)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "8px 0",
                fontFamily: "'DM Sans', sans-serif",
                letterSpacing: "0.04em",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "rgba(245,240,232,0.76)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "rgba(245,240,232,0.68)")
              }
            >
              Skip
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            disabled={!canAdvance || saving}
            style={{
              padding: "13px 32px",
              background: canAdvance && !saving
                ? "rgba(201,168,76,0.15)"
                : "rgba(201,168,76,0.05)",
              border: `1px solid ${canAdvance && !saving ? "rgba(201,168,76,0.5)" : "rgba(201,168,76,0.1)"}`,
              color: canAdvance && !saving
                ? "#C9A84C"
                : "rgba(201,168,76,0.3)",
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              cursor: canAdvance && !saving ? "pointer" : "not-allowed",
              transition: "all 0.15s ease",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
            }}
          >
            {saving
              ? "Saving..."
              : current < totalQuestions - 1
              ? "Next →"
              : "View my results →"}
          </button>
        </div>
      </div>
    </div>
  );
}
