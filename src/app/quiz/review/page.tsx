"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface QuizAnswer {
  id: string;
  question: string;
  answer: string | string[];
  section: string;
}

const SECTION_ORDER = ["Eligibility", "Investment", "Family", "Business", "History", "Home Ties"];

const QUESTIONS_MAP: Record<string, { q: string; section: string }> = {
  "Q0-01": { q: "What is your current citizenship?", section: "Eligibility" },
  "Q0-02": { q: "Who is this application for?", section: "Eligibility" },
  "Q0-03": { q: "Who is moving with you?", section: "Family" },
  "Q0-03a": { q: "What are your children's ages?", section: "Family" },
  "Q0-04": { q: "Will you have a business partner or co-investor?", section: "Business" },
  "Q0-04a": { q: "What is your partner's role in the business?", section: "Business" },
  "Q0-05": { q: "Where are you applying from?", section: "Investment" },
  "Q0-06": { q: "How are you funding your investment?", section: "Investment" },
  "Q0-07": { q: "What is your estimated total investment?", section: "Investment" },
  "Q0-08": { q: "What is your current business situation?", section: "Business" },
  "Q0-08a": { q: "What type of business is it?", section: "Business" },
  "Q0-08b": { q: "Who introduced you to the business opportunity?", section: "Business" },
  "Q0-09": { q: "Do any of the following apply to your immigration history?", section: "History" },
  "Q0-09a": { q: "When did the visa refusal occur?", section: "History" },
  "Q0-09b": { q: "Please describe the nature of your criminal conviction.", section: "History" },
  "Q0-10": { q: "What ties do you maintain in your home country?", section: "Home Ties" },
};

export default function QuizReview() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const draft = localStorage.getItem("e2go_quiz_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          setAnswers(parsed.answers);
        }
      } catch {}
    }
    setLoading(false);
  }, []);

  const handleJumpToQuestion = (questionId: string) => {
    const questionIds = Object.keys(QUESTIONS_MAP);
    const idx = questionIds.indexOf(questionId);
    if (idx !== -1) {
      localStorage.setItem("quiz_jump_to", String(idx));
      localStorage.setItem("quiz_return_to_results", "true");
      router.push("/quiz");
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading...</div>
      </div>
    );
  }

  const answeredIds = Object.keys(answers).filter(id => QUESTIONS_MAP[id]);
  const grouped: Record<string, QuizAnswer[]> = {};

  for (const id of answeredIds) {
    const meta = QUESTIONS_MAP[id];
    const section = meta.section;
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push({
      id,
      question: meta.q,
      answer: answers[id],
      section,
    });
  }

  const formatAnswer = (answer: string | string[]): string => {
    if (Array.isArray(answer)) return answer.join(", ");
    return answer;
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Quiz review</div>
      </div>

      <div style={{ padding: "48px 40px 40px", maxWidth: "680px" }}>
        <button
          onClick={() => router.push("/results")}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            fontWeight: 400,
            letterSpacing: '0.04em',
            color: 'rgba(245,240,232,0.55)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px 0',
            marginBottom: '24px',
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(245,240,232,0.85)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(245,240,232,0.55)'}
        >
          ← Back to results
        </button>

        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.3 }}>Review your answers</div>
        <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", marginBottom: "40px", lineHeight: 1.6 }}>Change any answer below — your results will update automatically.</div>

        {answeredIds.length === 0 ? (
          <div style={{ padding: "40px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", textAlign: "center" }}>
            <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.4)" }}>No answers saved yet.</div>
            <button onClick={() => router.push("/quiz")} style={{ marginTop: "16px", padding: "11px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start the quiz →</button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {SECTION_ORDER.filter(s => grouped[s]).map(section => (
              <div key={section}>
                <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "12px", paddingBottom: "8px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>{section}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {grouped[section].map(item => (
                    <div
                      key={item.id}
                      onClick={() => handleJumpToQuestion(item.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "14px 16px",
                        border: "1px solid rgba(201,168,76,0.1)",
                        background: "rgba(201,168,76,0.02)",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                        borderRadius: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.3)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(201,168,76,0.1)"}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", color: "#f5f0e8", marginBottom: "3px", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.question}</div>
                        <div style={{ fontSize: "12px", color: "#C9A84C", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{formatAnswer(item.answer)}</div>
                      </div>
                      <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", letterSpacing: "0.04em", flexShrink: 0, marginLeft: "16px" }}>Change →</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
