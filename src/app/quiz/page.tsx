

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface Question {
  id: string;
  type: "select" | "multiselect" | "currency" | "text" | "acknowledgment";
  question: string;
  section: string;
  options?: string[];
  currency_options?: string[];
  warning_codes?: string[];
  stop_codes?: string[];
  proportionality_thresholds_usd?: {
    clean: { min: number; flag: null };
    soft_advisory: { min: number; max: number; flag: string };
    strong_warning: { max: number; flag: string };
  };
  show_if?: Record<string, string | string[]>;
  validation?: string;
  tooltip?: string;
}

interface QuestionsData {
  module: string;
  questions: Question[];
  hard_stops: Record<string, string>;
}

interface ScoringLogic {
  hard_stops: Array<{ code: string; question: string; trigger: string[] }>;
  attorney_flags: Array<{ code: string; question: string; trigger: string[]; level?: string }>;
  risk_flags: Array<{ code: string; question: string; trigger: string[]; level?: string }>;
}

export default function QuizPage() {
  const router = useRouter();
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(null);
  const [scoringLogic, setScoringLogic] = useState<ScoringLogic | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [stopScreen, setStopScreen] = useState<{ code: string; message: string } | null>(null);
  const [currencyToggle, setCurrencyToggle] = useState<"CAD" | "USD">("USD");
  const [currencyValue, setCurrencyValue] = useState("");
  const [proportionalityFlag, setProportionalityFlag] = useState<string | null>(null);
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [isAnimating, setIsAnimating] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [cadUsdRate, setCadUsdRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState(false);

  // Fetch CAD/USD rate once on mount
  useEffect(() => {
    const fetchRate = async () => {
      try {
        setRateLoading(true);
        const res = await fetch("https://open.er-api.com/v6/latest/CAD");
        const data = await res.json();
        if (data.rates?.USD) {
          setCadUsdRate(data.rates.USD);
        } else {
          setRateError(true);
        }
      } catch {
        setRateError(true);
      } finally {
        setRateLoading(false);
      }
    };
    fetchRate();
  }, []);

  // Load questions and scoring logic
  useEffect(() => {
    Promise.all([
      fetch("/data/module0_questions.json").then((r) => r.json()),
      fetch("/data/module0_scoring_logic.json").then((r) => r.json()),
    ]).then(([q, s]) => {
      setQuestionsData(q);
      setScoringLogic(s);
    });
  }, []);

  // Filter questions based on show_if conditions
  const getVisibleQuestions = useCallback(() => {
    if (!questionsData) return [];
    return questionsData.questions.filter((q) => {
      if (!q.show_if) return true;
      for (const [dependQId, dependValue] of Object.entries(q.show_if)) {
        const dependentAnswer = answers[dependQId];
        if (!dependentAnswer) return false;
        if (Array.isArray(dependValue)) {
          if (!dependValue.includes(dependentAnswer as string)) return false;
        } else {
          if (dependentAnswer !== dependValue) return false;
        }
      }
      return true;
    });
  }, [questionsData, answers]);

  const visibleQuestions = getVisibleQuestions();
  const currentQuestion = visibleQuestions[currentIndex];

  // Get current section
  const getCurrentSection = () => {
    if (!currentQuestion) return "";
    const sections: Record<string, string> = {
      principal: "About You",
      investment: "Investment Details",
      business_role: "Your Role",
      business_type: "Business Type",
      risk: "Risk Assessment",
      non_immigrant_intent: "Ties to Canada",
      partner: "Business Partner",
      family: "Family Members",
      consent: "Final Steps",
    };
    return sections[currentQuestion.section] || currentQuestion.section;
  };

  // Check for hard stops after each answer
  const checkHardStops = useCallback(
    (questionId: string, answer: string) => {
      if (!scoringLogic || !questionsData) return;

      const hardStops = scoringLogic.hard_stops;
      for (const stop of hardStops) {
        if (stop.question === questionId && stop.trigger.includes(answer)) {
          const message = questionsData.hard_stops[stop.code];
          setStopScreen({ code: stop.code, message: message || stop.code });
          return;
        }
      }
    },
    [scoringLogic, questionsData]
  );

  // Handle answer selection
  const handleAnswer = (answer: string) => {
    if (!currentQuestion) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    const newAnswers = { ...answers, [currentQuestion.id]: answer };
    setAnswers(newAnswers);

    // Check hard stops
    checkHardStops(currentQuestion.id, answer);

    // Auto-advance for select type
    if (currentQuestion.type === "select" && !stopScreen) {
      if (currentIndex < visibleQuestions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        // Final question - calculate score and redirect
        calculateAndRedirect(newAnswers);
      }
    }
  };

  // Handle multiselect continue
  const handleMultiselectContinue = () => {
    const selected = currentQuestion?.options?.filter((opt) => answers[currentQuestion.id]?.includes(opt)) || [];
    if (selected.length === 0) return;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(answers);
    }
  };

  // Handle currency question
  const handleCurrencyContinue = () => {
    if (!currencyValue || !currentQuestion) return;

    const amount = parseFloat(currencyValue);
    // Use live rate if available, fallback to 0.73
    const rate = cadUsdRate || 0.73;
    const amountUSD = currencyToggle === "CAD" ? amount * rate : amount;

    // Check proportionality
    if (currentQuestion.proportionality_thresholds_usd) {
      if (amountUSD < 75000) {
        setProportionalityFlag("W-PROP-STRONG");
      } else if (amountUSD < 150000) {
        setProportionalityFlag("W-PROP-SOFT");
      } else {
        setProportionalityFlag(null);
      }
    }

    const newAnswers = { ...answers, [currentQuestion.id]: currencyValue, [`${currentQuestion.id}_currency`]: currencyToggle };
    setAnswers(newAnswers);

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(newAnswers);
    }
  };

  // Handle text/email question
  const handleTextContinue = () => {
    if (!emailValue || !currentQuestion) return;

    const newAnswers = { ...answers, [currentQuestion.id]: emailValue };
    setAnswers(newAnswers);

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);

    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(newAnswers);
    }
  };

  // Handle back
  const handleBack = () => {
    if (currentIndex > 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 200);
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Calculate score and redirect
  const calculateAndRedirect = async (finalAnswers: Record<string, string | string[]>) => {
    if (!scoringLogic) return;

    const hardStopCodes: string[] = [];
    const attorneyFlags: string[] = [];
    const riskFlags: string[] = [];

    // Check hard stops
    for (const stop of scoringLogic.hard_stops) {
      const answer = finalAnswers[stop.question];
      if (answer && stop.trigger.includes(answer as string)) {
        hardStopCodes.push(stop.code);
      }
    }

    if (hardStopCodes.length > 0) {
      const result = {
        outcome: "DO_NOT_PROCEED",
        hard_stop_codes: hardStopCodes,
        attorney_flag_codes: [],
        risk_flag_codes: [],
        answers: finalAnswers,
      };
      localStorage.setItem("e2go_quiz_result", JSON.stringify(result));

      // Save to Supabase (if user is logged in)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_sessions").insert({
          user_id: user.id,
          outcome: "DO_NOT_PROCEED",
          hard_stop_codes: hardStopCodes,
          attorney_flag_codes: [],
          risk_flag_codes: [],
          acknowledged_risk: false,
          casl_consent: false,
        });
      }

      router.push("/results");
      return;
    }

    // Check attorney flags
    for (const flag of scoringLogic.attorney_flags) {
      const answer = finalAnswers[flag.question];
      if (answer && flag.trigger.includes(answer as string)) {
        attorneyFlags.push(flag.code);
      }
    }

    // Check risk flags
    for (const flag of scoringLogic.risk_flags) {
      const answer = finalAnswers[flag.question];
      if (answer && flag.trigger.includes(answer as string)) {
        riskFlags.push(flag.code);
      }
    }

    // Determine outcome
    let outcome: string;
    if (attorneyFlags.length > 0) {
      outcome = "ATTORNEY_RECOMMENDED";
    } else if (riskFlags.length > 0) {
      outcome = "PROCEED_RISK";
    } else {
      outcome = "PROCEED";
    }

    const result = {
      outcome,
      hard_stop_codes: hardStopCodes,
      attorney_flag_codes: attorneyFlags,
      risk_flag_codes: riskFlags,
      answers: finalAnswers,
    };

    localStorage.setItem("e2go_quiz_result", JSON.stringify(result));

    // Save to Supabase (if user is logged in)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Determine application type
      const q009 = finalAnswers["Q0-09"];
      const applicationType = q009 === "Two equal 50/50 owners" ? "partnership" : "solo";

      // Get investment amount and currency
      const amountKey = Object.keys(finalAnswers).find((k) => k.startsWith("Q0-05"));
      const investmentAmount = amountKey ? parseFloat(finalAnswers[amountKey] as string) : null;
      const currencyKey = `${amountKey}_currency`;
      const investmentCurrency = finalAnswers[currencyKey] as "USD" | "CAD" || null;

      // Get email from Q0-21
      const email = finalAnswers["Q0-21"] as string;

      await supabase.from("quiz_sessions").insert({
        user_id: user.id,
        email: email || null,
        outcome,
        hard_stop_codes: hardStopCodes,
        attorney_flag_codes: attorneyFlags,
        risk_flag_codes: riskFlags,
        application_type: applicationType,
        investment_amount: investmentAmount,
        investment_currency: investmentCurrency,
        acknowledged_risk: outcome === "ATTORNEY_RECOMMENDED" ? false : true,
        casl_consent: true,
      });
    }

    router.push("/results");
  };

  // Loading state
  if (!questionsData || !scoringLogic) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#004ac6]">Loading...</div>
      </div>
    );
  }

  // Stop screen
  if (stopScreen) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
        <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
          <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
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
            <p className="text-[#434655] mb-8">
              {stopScreen.message}
            </p>
            <p className="text-sm text-[#737686] mb-8">
              Based on your responses, the E-2 visa may not be the right path for you at this time. We recommend speaking with a qualified immigration attorney to explore your options.
            </p>
            <div className="space-y-3">
              <button className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors">
                Find a qualified immigration lawyer
              </button>
              <button
                onClick={() => {
                  setStopScreen(null);
                  setCurrentIndex(0);
                  setAnswers({});
                }}
                className="w-full border border-[#004ac6] text-[#004ac6] font-medium py-4 rounded-lg hover:bg-[#e5eeff] transition-colors"
              >
                Start over
              </button>
            </div>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#737686]">
          e2go.app · The American Dream Edition
        </footer>
      </div>
    );
  }

  // Currency input display
  const getCurrencyUSD = () => {
    if (!currencyValue) return "";
    const amount = parseFloat(currencyValue);
    if (isNaN(amount)) return "";
    // Use live rate if available, fallback to 0.73
    const rate = cadUsdRate || 0.73;
    const usd = currencyToggle === "CAD" ? amount * rate : amount;
    return usd.toLocaleString("en-US", { style: "currency", currency: "USD" });
  };

  // Get rate display
  const getRateDisplay = () => {
    if (rateError || !cadUsdRate) return null;
    return (
      <span className="text-xs text-[#737686]">
        Rate: 1 CAD = {cadUsdRate.toFixed(4)} USD
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] flex flex-col">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-white border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#eff4ff] transition-colors">
            <svg className="w-6 h-6 text-[#434655]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-8">
        {/* Progress Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#004ac6]">{getCurrentSection()}</span>
            <span className="text-sm text-[#737686]">
              {currentIndex + 1} of {visibleQuestions.length}
            </span>
          </div>
          <div className="h-2 bg-[#e5eeff] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#004ac6] rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / visibleQuestions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div
            className={`flex-1 transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}
          >
            <div className="flex items-start gap-2 mb-6">
              <h1 className="text-xl font-semibold text-[#0b1c30] flex-1">
                {currentQuestion.question}
              </h1>
              {currentQuestion.tooltip && (
                <button
                  onClick={() => setShowTooltip(!showTooltip)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-[#e5eeff] text-[#004ac6] text-sm font-bold hover:bg-[#dce9ff] transition-colors flex-shrink-0"
                >
                  i
                </button>
              )}
            </div>

            {/* Tooltip */}
            {showTooltip && currentQuestion.tooltip && (
              <div className="mb-6 p-4 bg-[#eff4ff] rounded-lg border border-[#dce9ff]">
                <p className="text-sm text-[#434655]">{currentQuestion.tooltip}</p>
              </div>
            )}

            {/* Select Options */}
            {currentQuestion.type === "select" && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      answers[currentQuestion.id] === option
                        ? "border-[#004ac6] bg-[#eff4ff] shadow-sm"
                        : "border-[#c3c6d7] bg-white hover:border-[#737686]"
                    }`}
                  >
                    <span className="text-[#0b1c30]">{option}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Multiselect Options */}
            {currentQuestion.type === "multiselect" && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => {
                  const selected = answers[currentQuestion.id]?.includes(option);
                  return (
                    <button
                      key={option}
                      onClick={() => {
                        const current = (answers[currentQuestion.id] as string[]) || [];
                        const updated = selected
                          ? current.filter((a) => a !== option)
                          : [...current, option];
                        setAnswers({ ...answers, [currentQuestion.id]: updated });
                      }}
                      className={`w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3 ${
                        selected
                          ? "border-[#004ac6] bg-[#eff4ff] shadow-sm"
                          : "border-[#c3c6d7] bg-white hover:border-[#737686]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          selected ? "bg-[#004ac6] border-[#004ac6]" : "border-[#737686]"
                        }`}
                      >
                        {selected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-[#0b1c30]">{option}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleMultiselectContinue}
                  disabled={!((answers[currentQuestion.id] as string[]) || []).length}
                  className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Currency Input */}
            {currentQuestion.type === "currency" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2 flex-1">
                  <button
                    onClick={() => setCurrencyToggle("USD")}
                    className={`flex-1 py-2 rounded-lg border font-medium transition-all ${
                      currencyToggle === "USD"
                        ? "border-[#004ac6] bg-[#eff4ff] text-[#004ac6]"
                        : "border-[#c3c6d7] text-[#434655]"
                    }`}
                  >
                    USD
                  </button>
                  <button
                    onClick={() => setCurrencyToggle("CAD")}
                    className={`flex-1 py-2 rounded-lg border font-medium transition-all ${
                      currencyToggle === "CAD"
                        ? "border-[#004ac6] bg-[#eff4ff] text-[#004ac6]"
                        : "border-[#c3c6d7] text-[#434655]"
                    }`}
                  >
                    CAD
                  </button>
                  </div>
                  {rateLoading ? (
                    <span className="text-xs text-[#737686]">Loading rate...</span>
                  ) : rateError ? (
                    <span className="text-xs text-amber-600">Enter amount in USD</span>
                  ) : (
                    getRateDisplay()
                  )}
                </div>

                <input
                  type="number"
                  value={currencyValue}
                  onChange={(e) => setCurrencyValue(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full p-4 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] text-lg focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                />

                {currencyValue && (
                  <div className="flex justify-between items-center p-3 bg-[#eff4ff] rounded-lg">
                    <span className="text-sm text-[#434655]">USD equivalent:</span>
                    <span className="font-medium text-[#004ac6]">{getCurrencyUSD()}</span>
                  </div>
                )}

                {proportionalityFlag && (
                  <div
                    className={`p-3 rounded-lg ${
                      proportionalityFlag === "W-PROP-STRONG"
                        ? "bg-red-50 border border-red-200"
                        : "bg-amber-50 border border-amber-200"
                    }`}
                  >
                    <p className={`text-sm ${proportionalityFlag === "W-PROP-STRONG" ? "text-red-700" : "text-amber-700"}`}>
                      {proportionalityFlag === "W-PROP-STRONG"
                        ? "This amount is below the recommended threshold for E-2 investment. Strong risk flag."
                        : "This amount is below the clean threshold. Consider this a soft advisory."}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCurrencyContinue}
                  disabled={!currencyValue}
                  className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Text/Email Input */}
            {currentQuestion.type === "text" && (
              <div className="space-y-4">
                <input
                  type={currentQuestion.validation === "email" ? "email" : "text"}
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder={currentQuestion.validation === "email" ? "your@email.com" : "Enter your answer"}
                  className="w-full p-4 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] text-lg focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                />

                <button
                  onClick={handleTextContinue}
                  disabled={!emailValue}
                  className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Back Button */}
            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                className="w-full mt-4 text-[#737686] font-medium py-3 hover:text-[#004ac6] transition-colors"
              >
                ← Back
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-[#737686]">
        e2go.app · The American Dream Edition
      </footer>
    </div>
  );
}