

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface SubQuestion {
  show_if: string;
  question: string;
  options: string[];
  warning_codes?: string[];
  stop_codes?: string[];
}

interface Question {
  id: string;
  type: "select" | "multiselect" | "currency" | "text" | "acknowledgment" | "searchable_select" | "state_select";
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
  display_note?: string;
  sub_question?: SubQuestion;
  helper_text?: string;
}

interface TreatyCountry {
  code: string;
  name: string;
  consulate: string;
  notes: string;
}

interface USState {
  code: string;
  name: string;
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

const US_STATES: USState[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" }
];

// Currency symbols for display - keeping for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _CURRENCY_SYMBOLS = { USD: "$", CAD: "C$", EUR: "€", GBP: "£", AUD: "A$", JPY: "¥", CNY: "¥", INR: "₹", MXN: "MX$", BRL: "R$" };

export default function QuizPage() {
  const router = useRouter();
  const [questionsData, setQuestionsData] = useState<QuestionsData | null>(null);
  const [scoringLogic, setScoringLogic] = useState<ScoringLogic | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [stopScreen, setStopScreen] = useState<{ code: string; message: string } | null>(null);
  const [currencyToggle, setCurrencyToggle] = useState<string>("USD");
  const [currencyValue, setCurrencyValue] = useState("");
  const [proportionalityFlag, setProportionalityFlag] = useState<string | null>(null);
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [isAnimating, setIsAnimating] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  // v3 state
  const [treatyCountries, setTreatyCountries] = useState<TreatyCountry[]>([]);
  const [countrySearch, setCountrySearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<TreatyCountry | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [currencyRates, setCurrencyRates] = useState<Record<string, number>>({});
  const [cannabisGatePassed, setCannabisGatePassed] = useState(false);
  const [showCannabisGate, setShowCannabisGate] = useState(false);

  // Fetch treaty countries and currency rates (v3)
  useEffect(() => {
    fetch("/data/treaty_countries.json")
      .then((r) => r.json())
      .then((data) => {
        setTreatyCountries(data.countries || []);
      })
      .catch(console.error);
  }, []);

  // Fetch currency rates for all supported currencies (v3)
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD");
        const data = await res.json();
        if (data.rates) {
          setCurrencyRates(data.rates);
        }
      } catch {
        console.error("Failed to fetch currency rates");
      }
    };
    fetchRates();
  }, []);

  // Load questions and scoring logic
  useEffect(() => {
    // Load cannabis gate state from localStorage
    const saved = localStorage.getItem("e2go_cannabis_gate_passed");
    if (saved === "true") {
      setCannabisGatePassed(true);
    }
  }, []);

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
      who_you_are: "Who You Are",
      your_investment: "Your Investment",
      your_business: "Your Business Plans",
      where_youre_headed: "Where You're Headed",
      your_history: "Your History",
      your_ties: "Your Ties to Home",
      your_family: "Your Family",
      consent: "Consent",
    };
    return sections[currentQuestion.section] || currentQuestion.section;
  };

  // Filter countries based on search (v3)
  const filteredCountries = treatyCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  ).slice(0, 10);

  // Filter states based on search (v3)
  const filteredStates = US_STATES.filter(s =>
    s.name.toLowerCase().includes(stateSearch.toLowerCase())
  );

  // Handle treaty country selection (v3)
  const handleCountrySelect = (country: TreatyCountry) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setCountrySearch(country.name);

    const newAnswers = { ...answers, [currentQuestion!.id]: country.name };
    setAnswers(newAnswers);

    // Check if it's a treaty country
    if (country.notes?.includes("No E-2 treaty") || country.notes?.includes("EMERGENCY")) {
      setStopScreen({ code: "PR-01", message: `${country.name} does not have an E-2 treaty with the United States.` });
      return;
    }

    // Check for Iran special case
    if (country.code === "IR") {
      setStopScreen({ code: "PR-01", message: "Iran has an E-2 treaty but the U.S. Embassy is closed. No processing available. Consider obtaining citizenship in an active E-2 treaty country." });
      return;
    }

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(newAnswers);
    }
  };

  // Handle state selection (v3)
  const handleStateSelect = (stateName: string) => {
    setShowStateDropdown(false);
    setStateSearch(stateName);
    const newAnswers = { ...answers, [currentQuestion!.id]: stateName };
    setAnswers(newAnswers);

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(newAnswers);
    }
  };

  // Handle sub-question answer (v3)
  const handleSubQuestionAnswer = (answer: string) => {
    if (!currentQuestion?.sub_question) return;
    const newAnswers = { ...answers, [`${currentQuestion.id}_sub`]: answer };
    setAnswers(newAnswers);

    // Check sub_question hard stops
    if (currentQuestion.sub_question.stop_codes?.length) {
      if (answer === "A property rental or investment business") {
        setStopScreen({ code: "PR-07", message: "A passive real estate investment does not qualify for an E-2 visa. The E-2 requires an active, operating business." });
        return;
      }
    }

    // Show cannabis informational gate after sub-question (not for property rental or "something else")
    if (!cannabisGatePassed && currentQuestion.id === "Q0-10" &&
        answer !== "A property rental or investment business" && answer !== "Something else") {
      setShowCannabisGate(true);
      return;
    }

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 200);
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateAndRedirect(newAnswers);
    }
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

    const amount = parseFloat(currencyValue.replace(/,/g, ''));
    // Use multi-currency rate conversion (v3)
    let amountUSD = amount;
    if (currencyToggle !== "USD" && currencyRates[currencyToggle]) {
      amountUSD = amount / currencyRates[currencyToggle];
    }

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

  // Cannabis informational gate
  if (showCannabisGate) {
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
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#0b1c30] mb-4">
              One thing worth knowing
            </h1>
            <p className="text-[#434655] mb-4">
              Cannabis businesses are legal in many U.S. states — but U.S. immigration operates under federal law, where cannabis remains illegal. This means E-2 visas cannot be used to invest in cannabis-related businesses, regardless of which state the business is in.
            </p>
            <p className="text-[#434655] mb-8">
              If your business involves cannabis in any way, please speak with an immigration attorney before proceeding.
            </p>
            <button
              onClick={() => {
                setShowCannabisGate(false);
                setCannabisGatePassed(true);
                localStorage.setItem("e2go_cannabis_gate_passed", "true");
                // Continue to next question
                setIsAnimating(true);
                setTimeout(() => setIsAnimating(false), 200);
                if (currentIndex < visibleQuestions.length - 1) {
                  setCurrentIndex(currentIndex + 1);
                } else {
                  calculateAndRedirect(answers);
                }
              }}
              className="w-full bg-[#004ac6] text-white font-medium py-4 rounded-lg hover:bg-[#00337d] transition-colors"
            >
              My business is not cannabis-related — continue
            </button>
          </div>
        </main>

        <footer className="py-4 text-center text-xs text-[#737686]">
          e2go.app · The American Dream Edition
        </footer>
      </div>
    );
  }

  // Currency input display (v3 - multi-currency)
  const getCurrencyUSD = () => {
    if (!currencyValue) return "";
    const amount = parseFloat(currencyValue.replace(/,/g, ''));
    if (isNaN(amount)) return "";
    let amountUSD = amount;
    if (currencyToggle !== "USD" && currencyRates[currencyToggle]) {
      amountUSD = amount / currencyRates[currencyToggle];
    }
    return amountUSD.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--navy)" }}>
      {/* Header - Glassmorphism */}
      <header className="w-full sticky top-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--teal)", fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
          </Link>
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

            {/* Display note for Q0-01 */}
            {currentQuestion.display_note && (
              <div className="mb-4 p-3 bg-[#eff4ff] rounded-lg">
                <p className="text-sm text-[#434655]">{currentQuestion.display_note}</p>
              </div>
            )}

            {/* Searchable Select - Treaty Country (v3) */}
            {currentQuestion.type === "searchable_select" && (
              <div className="space-y-4">
                <div className="relative w-full sm:max-w-[480px] sm:mx-auto">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
                    onFocus={() => setShowCountryDropdown(true)}
                    placeholder="Start typing your country..."
                    className="w-full p-4 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] text-lg focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                  />
                  {showCountryDropdown && countrySearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#c3c6d7] rounded-lg shadow-lg max-h-60 overflow-y-auto sm:max-w-[480px]">
                      {filteredCountries.length === 0 ? (
                        <div className="p-4 text-[#737686]">No countries found</div>
                      ) : (
                        filteredCountries.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => handleCountrySelect(country)}
                            className="w-full text-left p-3 hover:bg-[#eff4ff] border-b border-[#e5eeff] last:border-b-0 min-h-[44px]"
                          >
                            <span className="text-[#0b1c30]">{country.name}</span>
                            {country.notes && <span className="block text-xs text-[#737686]">{country.notes}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedCountry && (
                  <div className="p-3 bg-[#eff4ff] rounded-lg">
                    <p className="text-sm text-[#434655]">
                      Selected: <span className="font-medium">{selectedCountry.name}</span>
                      {selectedCountry.consulate !== "Not applicable" && <span className="block">Consulate: {selectedCountry.consulate}</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* State Select (v3) */}
            {currentQuestion.type === "state_select" && (
              <div className="space-y-4">
                <div className="relative w-full sm:max-w-[480px] sm:mx-auto">
                  <input
                    type="text"
                    value={stateSearch}
                    onChange={(e) => { setStateSearch(e.target.value); setShowStateDropdown(true); }}
                    onFocus={() => setShowStateDropdown(true)}
                    placeholder="Start typing a U.S. state..."
                    className="w-full p-4 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] text-lg focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                  />
                  {showStateDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-[#c3c6d7] rounded-lg shadow-lg max-h-60 overflow-y-auto sm:max-w-[480px]">
                      {filteredStates.length === 0 ? (
                        <div className="p-4 text-[#737686]">No states found</div>
                      ) : (
                        filteredStates.map((state) => (
                          <button
                            key={state.code}
                            onClick={() => handleStateSelect(state.name)}
                            className="w-full text-left p-3 hover:bg-[#eff4ff] border-b border-[#e5eeff] last:border-b-0"
                          >
                            <span className="text-[#0b1c30]">{state.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleStateSelect("I have not decided yet")}
                  className="w-full text-[#737686] font-medium py-3 hover:text-[#004ac6] transition-colors"
                >
                  I have not decided yet
                </button>
              </div>
            )}

            {/* Select Options */}
            {currentQuestion.type === "select" && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left px-4 rounded-lg border transition-all flex items-center justify-between min-h-[48px] ${
                      answers[currentQuestion.id] === option
                        ? "border-[#0D9488] bg-[#f0fdfa] shadow-sm"
                        : "border-[#c3c6d7] bg-white hover:border-[#0D9488]"
                    }`}
                  >
                    <span className="text-[#0b1c30] text-[15px]">{option}</span>
                    {answers[currentQuestion.id] === option && (
                      <svg className="w-5 h-5 text-[#0D9488] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
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
                      className={`w-full text-left px-4 rounded-lg border transition-all flex items-center gap-3 min-h-[48px] ${
                        selected
                          ? "border-[#0D9488] bg-[#f0fdfa] shadow-sm"
                          : "border-[#c3c6d7] bg-white hover:border-[#0D9488]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                          selected ? "bg-[#0D9488] border-[#0D9488]" : "border-[#737686]"
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
                      <span className="text-[#0b1c30] text-[15px]">{option}</span>
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
                <div className="flex items-center gap-3">
                  <select
                    value={currencyToggle}
                    onChange={(e) => setCurrencyToggle(e.target.value)}
                    className="px-3 py-3 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] font-medium focus:outline-none focus:border-[#004ac6]"
                  >
                    <option value="USD">USD</option>
                    <option value="CAD">CAD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currencyValue}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^0-9,]/g, '');
                      setCurrencyValue(cleaned);
                    }}
                    placeholder="Enter amount"
                    className="flex-1 p-4 rounded-lg border border-[#c3c6d7] bg-white text-[#0b1c30] text-lg focus:outline-none focus:border-[#004ac6] focus:ring-1 focus:ring-[#004ac6]"
                  />
                </div>

                {currencyValue && (
                  <div className="p-3 bg-[#f0fdfa] rounded-lg text-center">
                    <span className="text-sm text-[#0D9488]">≈ {getCurrencyUSD()} USD</span>
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

            {/* Sub-Question (v3) */}
            {currentQuestion.sub_question && answers[currentQuestion.id] === currentQuestion.sub_question.show_if && (
              <div className="mt-6 p-4 bg-[#f8f9ff] rounded-lg border border-[#c3c6d7]">
                <h2 className="text-lg font-semibold text-[#0b1c30] mb-4">
                  {currentQuestion.sub_question.question}
                </h2>
                <div className="space-y-3">
                  {currentQuestion.sub_question.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSubQuestionAnswer(option)}
                      className="w-full text-left p-4 rounded-lg border border-[#c3c6d7] bg-white hover:border-[#737686] transition-all"
                    >
                      <span className="text-[#0b1c30]">{option}</span>
                    </button>
                  ))}
                </div>
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