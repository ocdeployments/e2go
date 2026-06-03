

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

// Dynamic text replacement utility
const replaceDynamic = (text: string, answers: Record<string, string | string[]>): string => {
  const country = answers['Q0-01'] as string || 'your country';
  return text
    .replace(/\[nationality\]/gi, country)
    .replace(/\[home country\]/gi, country)
    .replace(/\[nationality from Q0-01\]/gi, country);
};

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div style={{ color: "#C9A84C" }}>Loading...</div>
      </div>
    );
  }

  // Stop screen
  if (stopScreen) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
        <header className="w-full sticky top-0 z-50" style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)' }}>
              <svg className="w-8 h-8" style={{ color: "#ef4444" }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              Application Not Eligible
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.75)" }}>
              {stopScreen.message}
            </p>
            <p className="text-sm mb-8" style={{ color: "rgba(245,240,232,0.45)" }}>
              Based on your responses, the E-2 visa may not be the right path for you at this time. We recommend speaking with a qualified immigration attorney to explore your options.
            </p>
            <div className="space-y-3">
              <button className="w-full font-medium py-4 transition-colors" style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}>
                Find a qualified immigration lawyer
              </button>
              <button
                onClick={() => {
                  setStopScreen(null);
                  setCurrentIndex(0);
                  setAnswers({});
                }}
                className="w-full font-medium py-4 transition-colors"
                style={{ border: "1px solid #C9A84C", color: "#C9A84C", borderRadius: 0 }}
              >
                Start over
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Cannabis informational gate
  if (showCannabisGate) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0a' }}>
        <header className="w-full sticky top-0 z-50" style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <svg className="w-8 h-8" style={{ color: "#f59e0b" }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              One thing worth knowing
            </h1>
            <p className="mb-4" style={{ color: "rgba(245,240,232,0.75)" }}>
              Cannabis businesses are legal in many U.S. states — but U.S. immigration operates under federal law, where cannabis remains illegal. This means E-2 visas cannot be used to invest in cannabis-related businesses, regardless of which state the business is in.
            </p>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.75)" }}>
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
              className="w-full font-medium py-4 transition-colors"
              style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
            >
              My business is not cannabis-related — continue
            </button>
          </div>
        </main>
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
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header - Obsidian Gold */}
      <header className="w-full sticky top-0 z-50" style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(201,168,76,0.2)' }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 py-8">
        {/* Progress Bar - Gold */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 500, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#C9A84C' }}>
              {getCurrentSection()}
            </span>
            <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.45)' }}>
              {currentIndex + 1} of {visibleQuestions.length}
            </span>
          </div>
          <div style={{ height: '3px', background: 'rgba(201,168,76,0.15)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#C9A84C', borderRadius: '2px', width: `${((currentIndex + 1) / visibleQuestions.length) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        {/* Quiz Card - Gold border, no glassmorphism */}
        <div style={{
          background: 'rgba(201,168,76,0.02)',
          border: '1px solid rgba(201,168,76,0.12)',
          borderRadius: 0,
          padding: '40px 44px'
        }}>
          {/* Question */}
          {currentQuestion && (
            <div
              className={`flex-1 transition-opacity duration-200 ${isAnimating ? "opacity-0" : "opacity-100"}`}
            >
              {/* Question text - Cormorant Garamond, fully opaque */}
              <h1 style={{
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontSize: '28px',
                fontWeight: 300,
                color: '#f5f0e8',
                lineHeight: 1.3,
                marginBottom: '8px',
                opacity: 1,
                position: 'static',
                zIndex: 'auto'
              }}>
                {replaceDynamic(currentQuestion.question, answers)}
              </h1>

              {/* Helper text + Tooltip */}
              {(currentQuestion.helper_text || currentQuestion.tooltip) && (
                <p style={{
                  fontSize: '13px',
                  fontWeight: 300,
                  color: 'rgba(245,240,232,0.45)',
                  lineHeight: 1.6,
                  marginBottom: '24px',
                  fontFamily: "'DM Sans', sans-serif"
                }}>
                  {replaceDynamic(currentQuestion.helper_text || '', answers)}
                  {currentQuestion.tooltip && ' ' + replaceDynamic(currentQuestion.tooltip, answers)}
                </p>
              )}

            {/* Searchable Select - Treaty Country */}
            {currentQuestion.type === "searchable_select" && (
              <div className="space-y-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => { setCountrySearch(e.target.value); setShowCountryDropdown(true); }}
                    onFocus={() => setShowCountryDropdown(true)}
                    placeholder="Start typing your country..."
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 0,
                      color: '#f5f0e8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  {showCountryDropdown && countrySearch && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#0a0a0a',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 0,
                      zIndex: 50,
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {filteredCountries.length === 0 ? (
                        <div style={{ padding: '14px 16px', color: 'rgba(245,240,232,0.45)' }}>No countries found</div>
                      ) : (
                        filteredCountries.map((country) => (
                          <button
                            key={country.code}
                            onClick={() => handleCountrySelect(country)}
                            style={{
                              padding: '11px 16px',
                              fontSize: '14px',
                              color: 'rgba(245,240,232,0.65)',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(201,168,76,0.08)',
                              transition: 'background 0.12s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              textAlign: 'left',
                              background: 'transparent',
                              borderTop: 'none',
                              borderLeft: 'none',
                              borderRight: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                              e.currentTarget.style.color = '#f5f0e8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(245,240,232,0.65)';
                            }}
                          >
                            <span style={{ color: '#f5f0e8' }}>{country.name}</span>
                            {country.notes && <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)' }}>{country.notes}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                {selectedCountry && (
                  <div style={{ padding: '12px 14px', background: 'rgba(201,168,76,0.05)', borderRadius: 0, border: '1px solid rgba(201,168,76,0.2)' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(245,240,232,0.8)' }}>
                      Selected: <span style={{ fontWeight: 500, color: '#f5f0e8' }}>{selectedCountry.name}</span>
                      {selectedCountry.consulate !== "Not applicable" && <span style={{ display: 'block', fontSize: '12px', color: 'rgba(245,240,232,0.5)' }}>Consulate: {selectedCountry.consulate}</span>}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* State Select */}
            {currentQuestion.type === "state_select" && (
              <div className="space-y-4">
                <div className="relative w-full">
                  <input
                    type="text"
                    value={stateSearch}
                    onChange={(e) => { setStateSearch(e.target.value); setShowStateDropdown(true); }}
                    onFocus={() => setShowStateDropdown(true)}
                    placeholder="Start typing a U.S. state..."
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 0,
                      color: '#f5f0e8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                  {showStateDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#0a0a0a',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 0,
                      zIndex: 50,
                      maxHeight: '240px',
                      overflowY: 'auto'
                    }}>
                      {filteredStates.length === 0 ? (
                        <div style={{ padding: '14px 16px', color: 'rgba(245,240,232,0.45)' }}>No states found</div>
                      ) : (
                        filteredStates.map((state) => (
                          <button
                            key={state.code}
                            onClick={() => handleStateSelect(state.name)}
                            style={{
                              padding: '11px 16px',
                              fontSize: '14px',
                              color: 'rgba(245,240,232,0.65)',
                              cursor: 'pointer',
                              borderBottom: '1px solid rgba(201,168,76,0.08)',
                              transition: 'background 0.12s',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              textAlign: 'left',
                              background: 'transparent',
                              borderTop: 'none',
                              borderLeft: 'none',
                              borderRight: 'none'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(201,168,76,0.08)';
                              e.currentTarget.style.color = '#f5f0e8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.color = 'rgba(245,240,232,0.65)';
                            }}
                          >
                            <span style={{ color: '#f5f0e8' }}>{state.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleStateSelect("I have not decided yet")}
                  style={{
                    width: '100%',
                    color: 'rgba(245,240,232,0.35)',
                    fontSize: '13px',
                    fontFamily: "'DM Sans', sans-serif",
                    padding: '12px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(245,240,232,0.6)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(245,240,232,0.35)'}
                >
                  I have not decided yet
                </button>
              </div>
            )}

            {/* Select Options - Gold border style */}
            {currentQuestion.type === "select" && (
              <div>
                {currentQuestion.options?.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(replaceDynamic(option, answers))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        width: '100%',
                        padding: '15px 18px',
                        background: isSelected ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.02)',
                        border: isSelected ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
                        borderRadius: 0,
                        color: isSelected ? '#f5f0e8' : 'rgba(245,240,232,0.80)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '15px',
                        fontWeight: 400,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginBottom: '9px',
                        minHeight: '52px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(201,168,76,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
                          e.currentTarget.style.color = 'rgba(245,240,232,0.95)';
                          e.currentTarget.style.transform = 'translateX(2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.background = 'rgba(201,168,76,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                          e.currentTarget.style.color = 'rgba(245,240,232,0.80)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }
                      }}
                    >
                      <span style={{ flex: 1 }}>{replaceDynamic(option, answers)}</span>
                      {isSelected && (
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: 0,
                          background: '#C9A84C',
                          color: '#0a0a0a',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Multiselect Options */}
            {currentQuestion.type === "multiselect" && (
              <div>
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        width: '100%',
                        padding: '15px 18px',
                        background: selected ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.02)',
                        border: selected ? '1px solid #C9A84C' : '1px solid rgba(201,168,76,0.2)',
                        borderRadius: 0,
                        color: selected ? '#f5f0e8' : 'rgba(245,240,232,0.80)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '15px',
                        fontWeight: 400,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginBottom: '9px',
                        minHeight: '52px'
                      }}
                      onMouseEnter={(e) => {
                        if (!selected) {
                          e.currentTarget.style.background = 'rgba(201,168,76,0.06)';
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
                          e.currentTarget.style.color = 'rgba(245,240,232,0.95)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!selected) {
                          e.currentTarget.style.background = 'rgba(201,168,76,0.02)';
                          e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                          e.currentTarget.style.color = 'rgba(245,240,232,0.80)';
                        }
                      }}
                    >
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: 0,
                          border: selected ? 'none' : '1px solid rgba(245,240,232,0.4)',
                          background: selected ? '#C9A84C' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {selected && (
                          <svg style={{ width: '12px', height: '12px', color: '#0a0a0a' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span>{replaceDynamic(option, answers)}</span>
                    </button>
                  );
                })}
                <button
                  onClick={handleMultiselectContinue}
                  disabled={!((answers[currentQuestion.id] as string[]) || []).length}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#C9A84C',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: ((answers[currentQuestion.id] as string[]) || []).length ? 'pointer' : 'not-allowed',
                    marginTop: '20px',
                    transition: 'background 0.2s',
                    opacity: ((answers[currentQuestion.id] as string[]) || []).length ? 1 : 0.5
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {/* Currency Input */}
            {currentQuestion.type === "currency" && (
              <div className="space-y-4">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <select
                    value={currencyToggle}
                    onChange={(e) => setCurrencyToggle(e.target.value)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 0,
                      border: '1px solid rgba(201,168,76,0.2)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f5f0e8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '14px',
                      fontWeight: 500,
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="USD" style={{ background: '#0a0a0a' }}>USD</option>
                    <option value="CAD" style={{ background: '#0a0a0a' }}>CAD</option>
                    <option value="EUR" style={{ background: '#0a0a0a' }}>EUR</option>
                    <option value="GBP" style={{ background: '#0a0a0a' }}>GBP</option>
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
                    style={{
                      flex: 1,
                      padding: '14px 16px',
                      borderRadius: 0,
                      border: '1px solid rgba(201,168,76,0.2)',
                      background: 'rgba(255,255,255,0.04)',
                      color: '#f5f0e8',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '15px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>

                {currencyValue && (
                  <div style={{ padding: '12px', background: 'rgba(201,168,76,0.05)', borderRadius: 0, textAlign: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#C9A84C' }}>≈ {getCurrencyUSD()} USD</span>
                  </div>
                )}

                {proportionalityFlag && (
                  <div
                    style={{
                      padding: '12px',
                      borderRadius: 0,
                      background: proportionalityFlag === "W-PROP-STRONG" ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${proportionalityFlag === "W-PROP-STRONG" ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}
                  >
                    <p style={{ fontSize: '13px', color: proportionalityFlag === "W-PROP-STRONG" ? '#fca5a5' : '#fcd34d' }}>
                      {proportionalityFlag === "W-PROP-STRONG"
                        ? "This amount is below the recommended threshold for E-2 investment. Strong risk flag."
                        : "This amount is below the clean threshold. Consider this a soft advisory."}
                    </p>
                  </div>
                )}

                <button
                  onClick={handleCurrencyContinue}
                  disabled={!currencyValue}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#C9A84C',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: currencyValue ? 'pointer' : 'not-allowed',
                    marginTop: '20px',
                    transition: 'background 0.2s',
                    opacity: currencyValue ? 1 : 0.5
                  }}
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
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: 0,
                    border: '1px solid rgba(201,168,76,0.2)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#f5f0e8',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                />

                <button
                  onClick={handleTextContinue}
                  disabled={!emailValue}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: '#C9A84C',
                    color: '#0a0a0a',
                    border: 'none',
                    borderRadius: 0,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: emailValue ? 'pointer' : 'not-allowed',
                    marginTop: '20px',
                    transition: 'background 0.2s',
                    opacity: emailValue ? 1 : 0.5
                  }}
                >
                  Continue
                </button>
              </div>
            )}

            {/* Sub-Question */}
            {currentQuestion.sub_question && answers[currentQuestion.id] === currentQuestion.sub_question.show_if && (
              <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(201,168,76,0.02)', borderRadius: 0, border: '1px solid rgba(201,168,76,0.12)' }}>
                <h2 style={{
                  fontFamily: "'Cormorant Garamond', Georgia, serif",
                  fontSize: '20px',
                  fontWeight: 300,
                  color: '#f5f0e8',
                  marginBottom: '16px'
                }}>
                  {replaceDynamic(currentQuestion.sub_question.question, answers)}
                </h2>
                <div>
                  {currentQuestion.sub_question.options?.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleSubQuestionAnswer(option)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        width: '100%',
                        padding: '15px 18px',
                        background: 'rgba(201,168,76,0.02)',
                        border: '1px solid rgba(201,168,76,0.2)',
                        borderRadius: 0,
                        color: 'rgba(245,240,232,0.80)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '15px',
                        fontWeight: 400,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        marginBottom: '9px',
                        minHeight: '52px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(201,168,76,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.4)';
                        e.currentTarget.style.color = 'rgba(245,240,232,0.95)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(201,168,76,0.02)';
                        e.currentTarget.style.borderColor = 'rgba(201,168,76,0.2)';
                        e.currentTarget.style.color = 'rgba(245,240,232,0.80)';
                      }}
                    >
                      <span>{replaceDynamic(option, answers)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Back Button */}
            {currentIndex > 0 && (
              <button
                onClick={handleBack}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'center',
                  marginTop: '12px',
                  padding: '8px',
                  color: 'rgba(245,240,232,0.35)',
                  fontSize: '13px',
                  fontFamily: "'DM Sans', sans-serif",
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(245,240,232,0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(245,240,232,0.35)'}
              >
                ← Back
              </button>
            )}
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
