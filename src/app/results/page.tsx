

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import scoringLogic from "../../../public/data/module0_scoring_logic.json";

interface ScoringFlag {
  code: string;
  question: string;
  trigger: string | string[];
  level?: string;
  condition?: string;
  note?: string;
}

interface ScoringLogicType {
  hard_stops: Array<{ code: string; question: string; trigger: string[] }>;
  attorney_flags: ScoringFlag[];
  risk_flags: ScoringFlag[];
  non_immigrant_intent_composite?: {
    tie_confirmed_answers: Record<string, string[]>;
  };
}

interface QuizResult {
  outcome: string;
  hard_stop_codes: string[];
  attorney_flag_codes: string[];
  risk_flag_codes: string[];
  answers: Record<string, string | string[]>;
  investment_amount?: number;
  investment_currency?: string;
}

interface Answer {
  questionId: string;
  value: string;
}

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<QuizResult | null>(null);
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [acknowledged, setAcknowledged] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Compute result from answers using scoring logic
  const computeResult = (answers: Answer[]): QuizResult => {
    const answerMap: Record<string, string> = {};
    answers.forEach((a) => {
      answerMap[a.questionId] = a.value;
    });

    const hardStopCodes: string[] = [];
    const attorneyFlagCodes: string[] = [];
    const riskFlagCodes: string[] = [];

    const typedScoring = scoringLogic as ScoringLogicType;

    // Check hard stops
    for (const stop of typedScoring.hard_stops) {
      const answer = answerMap[stop.question];
      if (answer && stop.trigger.includes(answer)) {
        hardStopCodes.push(stop.code);
        break; // First hard stop exits immediately
      }
    }

    // If hard stop, return immediately
    if (hardStopCodes.length > 0) {
      return {
        outcome: "DO_NOT_PROCEED",
        hard_stop_codes: hardStopCodes,
        attorney_flag_codes: [],
        risk_flag_codes: [],
        answers: answerMap,
      };
    }

    // Check attorney flags
    for (const flag of typedScoring.attorney_flags) {
      let shouldCheck = true;

      // Check conditions
      if (flag.condition) {
        if (flag.condition.includes("Q0-09 = Two equal 50/50 owners")) {
          shouldCheck = answerMap["Q0-09"] === "Two equal 50/50 owners";
        } else if (flag.condition.includes("Q0-09 = Two equal 50/50 owners")) {
          shouldCheck = answerMap["Q0-09"] === "Two equal 50/50 owners";
        } else if (flag.condition.includes("Q0-16 includes spouse")) {
          shouldCheck = answerMap["Q0-16"]?.includes("spouse");
        } else if (flag.condition.includes("Q0-16 includes children")) {
          shouldCheck = answerMap["Q0-16"]?.includes("children");
        } else if (flag.condition.includes("Q0-16 includes any dependent")) {
          shouldCheck = answerMap["Q0-16"]?.includes("spouse") || answerMap["Q0-16"]?.includes("children");
        }
      }

      if (shouldCheck && flag.trigger) {
        if (typeof flag.trigger === "string") {
          // Composite triggers
          if (flag.trigger === "confirmed_ties == 0") {
            let confirmedTies = 0;
            const niAnswers = ["Q0-NI-01", "Q0-NI-02", "Q0-NI-03"];
            // v3 updated tie values
            const confirmedTieValues = [
              "Yes — I own my home and plan to keep it (rent it out or maintain it)",
              "Yes — I own investment property I plan to keep",
              "Yes — close family members will remain there",
              "Yes — I plan to keep my accounts open there",
              "Probably — though I have not thought it through fully",
            ];
            niAnswers.forEach((q) => {
              if (confirmedTieValues.includes(answerMap[q])) confirmedTies++;
            });
            if (confirmedTies === 0) attorneyFlagCodes.push(flag.code);
          } else if (flag.trigger === "confirmed_ties == 1") {
            let confirmedTies = 0;
            const niAnswers = ["Q0-NI-01", "Q0-NI-02", "Q0-NI-03"];
            const confirmedTieValues = [
              "Yes — I own my home and plan to keep it (rent it out or maintain it)",
              "Yes — I own investment property I plan to keep",
              "Yes — close family members will remain there",
              "Yes — I plan to keep my accounts open there",
              "Probably — though I have not thought it through fully",
            ];
            niAnswers.forEach((q) => {
              if (confirmedTieValues.includes(answerMap[q])) confirmedTies++;
            });
            if (confirmedTies === 1) riskFlagCodes.push(flag.code);
          }
        } else if (Array.isArray(flag.trigger)) {
          const answer = answerMap[flag.question];
          if (answer && flag.trigger.includes(answer)) {
            attorneyFlagCodes.push(flag.code);
          }
        }
      }
    }

    // Check risk flags
    for (const flag of typedScoring.risk_flags) {
      let shouldCheck = true;

      if (flag.condition) {
        if (flag.condition.includes("Q0-16 includes dependents")) {
          shouldCheck = answerMap["Q0-16"]?.includes("spouse") || answerMap["Q0-16"]?.includes("children");
        }
      }

      if (shouldCheck && flag.trigger) {
        if (typeof flag.trigger === "string") {
          // Investment threshold checks
          if (flag.trigger.startsWith("amount_usd")) {
            const amountStr = answerMap["Q0-05"]?.replace(/[^0-9]/g, "") || "0";
            const amount = parseInt(amountStr) || 0;
            if (flag.trigger === "amount_usd < 75000" && amount < 75000) {
              riskFlagCodes.push(flag.code);
            } else if (flag.trigger.includes("75000 <= amount_usd <= 149999")) {
              if (amount >= 75000 && amount <= 149999) riskFlagCodes.push(flag.code);
            }
          } else if (flag.trigger === "confirmed_ties == 1") {
            let confirmedTies = 0;
            const niAnswers = ["Q0-NI-01", "Q0-NI-02", "Q0-NI-03"];
            const confirmedTieValues = [
              "Yes — I own Canadian property and will keep it",
              "Yes — close family will remain in Canada",
              "Yes — I will keep active Canadian financial accounts",
            ];
            niAnswers.forEach((q) => {
              if (confirmedTieValues.includes(answerMap[q])) confirmedTies++;
            });
            if (confirmedTies === 1) riskFlagCodes.push(flag.code);
          }
        } else if (Array.isArray(flag.trigger)) {
          const answer = answerMap[flag.question];
          if (answer && flag.trigger.includes(answer)) {
            riskFlagCodes.push(flag.code);
          }
        }
      }
    }

    // Determine outcome
    let outcome: string;
    if (attorneyFlagCodes.length > 0) {
      outcome = "ATTORNEY_RECOMMENDED";
    } else if (riskFlagCodes.length > 0) {
      outcome = "PROCEED_RISK";
    } else {
      outcome = "PROCEED";
    }

    // Extract investment info
    const investmentStr = answerMap["Q0-05"] || "";
    const amount = parseInt(investmentStr.replace(/[^0-9]/g, "")) || 0;
    const currency = answerMap["Q0-05"]?.includes("$") 
      ? (answerMap["Q0-05"].includes("CAD") ? "CAD" : "USD")
      : "USD";

    return {
      outcome,
      hard_stop_codes: hardStopCodes,
      attorney_flag_codes: attorneyFlagCodes,
      risk_flag_codes: riskFlagCodes,
      answers: answerMap,
      investment_amount: amount,
      investment_currency: currency,
    };
  };

  useEffect(() => {
    const init = async () => {
      // Check for authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      // Try to get quiz answers from localStorage
      const storedAnswers = localStorage.getItem("e2go_quiz_answers");
      if (storedAnswers) {
        const answers = JSON.parse(storedAnswers);
        const computedResult = computeResult(answers);
        setResult(computedResult);

        // Save to localStorage for results page
        localStorage.setItem("e2go_quiz_result", JSON.stringify(computedResult));

        // Save to Supabase
        await supabase.from("quiz_sessions").insert({
          user_id: authUser?.id || null,
          email: authUser?.email || null,
          outcome: computedResult.outcome,
          hard_stop_codes: computedResult.hard_stop_codes,
          attorney_flag_codes: computedResult.attorney_flag_codes,
          risk_flag_codes: computedResult.risk_flag_codes,
          investment_amount: computedResult.investment_amount,
          investment_currency: computedResult.investment_currency,
          acknowledged_risk: computedResult.outcome === "PROCEED_RISK",
        });
      } else {
        // Try Supabase if not in localStorage
        const { data: quizSession } = await supabase
          .from("quiz_sessions")
          .select("*")
          .order("completed_at", { ascending: false })
          .limit(1)
          .single();

        if (quizSession) {
          setResult({
            outcome: quizSession.outcome,
            hard_stop_codes: quizSession.hard_stop_codes || [],
            attorney_flag_codes: quizSession.attorney_flag_codes || [],
            risk_flag_codes: quizSession.risk_flag_codes || [],
            answers: {},
          });
        } else {
          router.push("/quiz");
        }
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div style={{ color: "#C9A84C" }}>Loading...</div>
      </div>
    );
  }

  const { outcome, hard_stop_codes, attorney_flag_codes, risk_flag_codes, answers } = result;

  // DO_NOT_PROCEED - Hard stop
  if (outcome === "DO_NOT_PROCEED") {
    const stopMessages: Record<string, string> = {
      "PR-01": "Principal applicant not a treaty country citizen",
      "PR-02": "Principal applicant in U.S. without valid status",
      "PR-03": "No investment funds currently available",
      "PR-04": "Loan secured by business assets",
      "PR-05": "Passive investor role",
      "PR-06": "More than two equal owners",
      "PR-07": "Passive real estate holding",
      "PR-08": "Cannabis-related business",
      "PR-09": "No active management role",
    };

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
        {/* Header */}
        <header className="w-full sticky top-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center" style={{ padding: "40px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#ef4444" }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Application Not Eligible
            </h1>
            <p className="mb-2" style={{ color: "rgba(245,240,232,0.75)" }}>
              {hard_stop_codes[0] && stopMessages[hard_stop_codes[0]]}
            </p>
            <p className="text-sm mb-8" style={{ color: "rgba(245,240,232,0.45)" }}>
              Based on your responses, the E-2 visa may not be the right path for you at this time. We recommend speaking with a qualified immigration attorney to explore your options.
            </p>
            <div className="space-y-3">
              <button className="w-full font-medium py-4 transition-colors" style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}>
                Find a qualified immigration lawyer
              </button>
              <Link
                href="/quiz"
                className="block w-full border font-medium py-4 transition-colors text-center"
                style={{ borderColor: "#C9A84C", color: "#C9A84C", borderRadius: 0 }}
              >
                Start over
              </Link>
            </div>
          </div>
        </main>

              </div>
    );
  }

  // ATTORNEY_RECOMMENDED
  if (outcome === "ATTORNEY_RECOMMENDED") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
        {/* Header */}
        <header className="w-full sticky top-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
          <div className="text-center mb-8" style={{ padding: "24px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 0 }}>
            <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(245,158,11,0.15)" }}>
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#f59e0b" }}>
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Legal review recommended
            </h1>
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
              Your responses indicate factors that require individualized legal assessment before proceeding.
            </p>
          </div>

          <div className="mb-8" style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8" }}>Factors requiring legal review</h2>
            <ul className="space-y-3">
              {attorney_flag_codes.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                  <span style={{ color: "#f59e0b", marginTop: "4px" }}>•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-8" style={{ padding: "16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1"
                style={{ width: "20px", height: "20px", accentColor: "#C9A84C" }}
              />
              <span className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                I understand that e2go.app is a preparation tool and not a law firm. I accept responsibility for consulting with a qualified immigration attorney before proceeding.
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <button
              disabled={!acknowledged}
              onClick={() => router.push("/pricing")}
              className="w-full font-medium py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
            >
              Continue to Pricing
            </button>
            <button className="w-full border font-medium py-4 transition-colors" style={{ borderColor: "#C9A84C", color: "#C9A84C", borderRadius: 0 }}>
              Find a qualified immigration lawyer
            </button>
          </div>
        </main>

              </div>
    );
  }

  // PROCEED or PROCEED_RISK
  const isProceedRisk = outcome === "PROCEED_RISK";
  const applicationType = answers["Q0-09"] === "Two equal 50/50 owners" ? "Partnership" : "Solo";

  const pillars = [
    { name: "Treaty Nationality", status: "pass", desc: "Validated as a citizen of a country with an E-2 treaty." },
    { name: "Investment Capacity", status: risk_flag_codes.some(f => f.includes("PROP")) ? "warn" : "pass", desc: "Total capital exceeds the 'substantiality' threshold for your industry." },
    { name: "Source of Funds", status: risk_flag_codes.some(f => f === "W-06" || f === "W-07") ? "warn" : "pass", desc: "Funds can be traced from legitimate source to investment." },
    { name: "Business Type", status: "pass", desc: "Business is E-2 eligible and not in excluded category." },
    { name: "Active Management", status: "pass", desc: "Applicant will actively develop and direct the business." },
    { name: "Non-Immigrant Intent", status: risk_flag_codes.some(f => f.includes("W-NI")) ? "warn" : "pass", desc: "Strong ties to home country confirmed, reducing 214(b) risk." },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {/* Header */}
      <header className="w-full sticky top-0 z-50" style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(201,168,76,0.2)" }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <section className="relative h-[280px] flex items-center justify-center overflow-hidden mb-8" style={{ background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
          <div className="relative z-10 text-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4" style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 0 }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#C9A84C" }}>Analysis Complete</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              {isProceedRisk ? "You appear eligible with risk flags" : "You appear eligible to proceed"}
            </h1>
            <p className="text-sm max-w-[500px] mx-auto" style={{ color: "rgba(245,240,232,0.6)" }}>
              {isProceedRisk
                ? "Based on your answers, you meet the foundational requirements with some factors to address."
                : "Based on your answers, you meet the foundational requirements for the E-2 Treaty Investor Visa."}
            </p>
          </div>
        </section>

        {isProceedRisk && (
          <div className="mb-6" style={{ padding: "16px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 0 }}>
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#f59e0b" }}>
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <div>
                <p className="text-sm font-medium" style={{ color: "#f5f0e8" }}>Risk factors identified</p>
                <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.45)" }}>
                  The following flags will be tracked through your application. Each has a specific mitigation strategy.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 text-center" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>The 6-Pillar Eligibility Check</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((pillar, i) => (
              <div key={i} style={{ padding: "16px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2" style={{ background: "rgba(201,168,76,0.08)" }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  {pillar.status === "pass" ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#f59e0b" }}>
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-sm font-semibold mb-1" style={{ color: "#f5f0e8" }}>{pillar.name}</h3>
                <p className="text-xs" style={{ color: "rgba(245,240,232,0.45)" }}>{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {isProceedRisk && risk_flag_codes.length > 0 && (
          <section className="mb-8" style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: "#f5f0e8" }}>Risk flags to address</h2>
            <ul className="space-y-3">
              {risk_flag_codes.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>
                  <span style={{ color: "#f59e0b", marginTop: "4px" }}>•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mb-8 text-center" style={{ padding: "24px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
          <p className="text-sm mb-2" style={{ color: "rgba(245,240,232,0.45)" }}>Recommended path</p>
          <p className="text-2xl font-bold" style={{ color: "#C9A84C" }}>{applicationType} Application</p>
        </section>

        <div className="space-y-3">
          <button
            onClick={async () => {
              if (!user) {
                router.push("/signup");
                return;
              }

              if (outcome === "PROCEED" || outcome === "PROCEED_RISK") {
                const { data: existingApp } = await supabase
                  .from("applications")
                  .select("id")
                  .eq("user_id", user.id)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .single();

                if (!existingApp) {
                  const isPartnership = applicationType === "Partnership";
                  await supabase.from("applications").insert({
                    user_id: user.id,
                    route: isPartnership ? "partnership" : "solo",
                    status: "in_progress",
                    tier: "standard",
                  });
                }
              }

              router.push("/pricing");
            }}
            className="block w-full font-medium py-4 transition-colors text-center"
            style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
          >
            Begin Your Application
          </button>
        </div>
      </main>
    </div>
  );
}
