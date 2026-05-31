
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import scoringLogic from "../../../public/data/module0_scoring_logic.json";

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

    // Check hard stops
    for (const stop of scoringLogic.hard_stops) {
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
    for (const flag of scoringLogic.attorney_flags) {
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
            const confirmedTieValues = [
              "Yes — I own Canadian property and will keep it",
              "Yes — close family will remain in Canada",
              "Yes — I will keep active Canadian financial accounts",
            ];
            niAnswers.forEach((q) => {
              if (confirmedTieValues.includes(answerMap[q])) confirmedTies++;
            });
            if (confirmedTies === 0) attorneyFlagCodes.push(flag.code);
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
            attorneyFlagCodes.push(flag.code);
          }
        }
      }
    }

    // Check risk flags
    for (const flag of scoringLogic.risk_flags) {
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
  }, [router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  const { outcome, hard_stop_codes, attorney_flag_codes, risk_flag_codes, answers } = result;

  // DO_NOT_PROCEED - Hard stop
  if (outcome === "DO_NOT_PROCEED") {
    const stopMessages: Record<string, string> = {
      "PR-01": "Principal applicant not a Canadian citizen",
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
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
          <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              Application Not Eligible
            </h1>
            <p className="text-[#434655] mb-2">
              {hard_stop_codes[0] && stopMessages[hard_stop_codes[0]]}
            </p>
            <p className="text-sm text-[#737686] mb-8">
              Based on your responses, the E-2 visa may not be the right path for you at this time. We recommend speaking with a qualified immigration attorney to explore your options.
            </p>
            <div className="space-y-3">
              <button className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors">
                Find a qualified immigration lawyer
              </button>
              <Link
                href="/quiz"
                className="block w-full border border-[#004ac6] text-[#004ac6] font-medium py-4 rounded-lg hover:bg-[#e5eeff] transition-colors text-center"
              >
                Start over
              </Link>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#737686]">
          e2go.app · The American Dream Edition
        </footer>
      </div>
    );
  }

  // ATTORNEY_RECOMMENDED
  if (outcome === "ATTORNEY_RECOMMENDED") {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
          <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mb-8">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-[#0b1c30] mb-2">
              Legal review recommended
            </h1>
            <p className="text-sm text-[#434655]">
              Your responses indicate factors that require individualized legal assessment before proceeding.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-8">
            <h2 className="text-lg font-semibold text-[#0b1c30] mb-4">Factors requiring legal review</h2>
            <ul className="space-y-3">
              {attorney_flag_codes.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm text-[#434655]">
                  <span className="text-amber-500 mt-1">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#eff4ff] rounded-xl p-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-[#c3c6d7] text-[#004ac6] focus:ring-[#004ac6]"
              />
              <span className="text-sm text-[#434655]">
                I understand that e2go.app is a preparation tool and not a law firm. I accept responsibility for consulting with a qualified immigration attorney before proceeding.
              </span>
            </label>
          </div>

          <div className="space-y-3">
            <button
              disabled={!acknowledged}
              onClick={() => router.push("/pricing")}
              className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Pricing
            </button>
            <button className="w-full border border-[#004ac6] text-[#004ac6] font-medium py-4 rounded-lg hover:bg-[#e5eeff] transition-colors">
              Find a qualified immigration lawyer
            </button>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#737686]">
          e2go.app · The American Dream Edition
        </footer>
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
    { name: "Non-Immigrant Intent", status: risk_flag_codes.some(f => f.includes("W-NI")) ? "warn" : "pass", desc: "Strong ties to Canada confirmed, reducing 214(b) risk." },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 max-w-2xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <section className="relative h-[280px] flex items-center justify-center overflow-hidden rounded-xl mb-8">
          <div className="absolute inset-0 z-0">
            <div
              className="w-full h-full object-cover opacity-40"
              style={{
                backgroundImage: "url(/flag.png)",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#f8f9ff]/10 via-[#f8f9ff]/60 to-[#f8f9ff]" />
          </div>
          <div className="relative z-10 text-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#004ac6]/10 text-[#004ac6] mb-4 border border-[#004ac6]/20">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-medium uppercase tracking-wider">Analysis Complete</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#0b1c30] mb-2">
              {isProceedRisk ? "You appear eligible with risk flags" : "You appear eligible to proceed"}
            </h1>
            <p className="text-sm text-[#434655] max-w-[500px] mx-auto">
              {isProceedRisk
                ? "Based on your answers, you meet the foundational requirements with some factors to address."
                : "Based on your answers, you meet the foundational requirements for the E-2 Treaty Investor Visa."}
            </p>
          </div>
        </section>

        {isProceedRisk && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">Risk factors identified</p>
                <p className="text-xs text-[#434655] mt-1">
                  The following flags will be tracked through your application. Each has a specific mitigation strategy.
                </p>
              </div>
            </div>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#0b1c30] mb-4 text-center">The 6-Pillar Eligibility Check</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillars.map((pillar, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-[#e2e8f0] shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  {pillar.status === "pass" ? (
                    <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                    </svg>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[#0b1c30] mb-1">{pillar.name}</h3>
                <p className="text-xs text-[#434655]">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {isProceedRisk && risk_flag_codes.length > 0 && (
          <section className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-8">
            <h2 className="text-lg font-semibold text-[#0b1c30] mb-4">Risk flags to address</h2>
            <ul className="space-y-3">
              {risk_flag_codes.map((flag) => (
                <li key={flag} className="flex items-start gap-2 text-sm text-[#434655]">
                  <span className="text-amber-500 mt-1">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-[#eff4ff] rounded-xl p-6 mb-8 text-center">
          <p className="text-sm text-[#434655] mb-2">Recommended path</p>
          <p className="text-2xl font-bold text-[#004ac6]">{applicationType} Application</p>
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
            className="block w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors text-center"
          >
            Begin Your Application
          </button>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-[#737686]">
        e2go.app · The American Dream Edition
      </footer>
    </div>
  );
}
