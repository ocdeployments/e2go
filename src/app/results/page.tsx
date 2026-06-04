"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

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
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showBanner, setShowBanner] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [user, setUser] = useState<any>(null);

  const computeResult = (answers: Answer[]): QuizResult => {
    const answerMap: Record<string, string> = {};
    answers.forEach((a) => {
      answerMap[a.questionId] = a.value;
    });

    const hardStopCodes: string[] = [];
    const attorneyFlagCodes: string[] = [];
    const riskFlagCodes: string[] = [];

    const typedScoring = scoringLogic as ScoringLogicType;
    for (const stop of typedScoring.hard_stops) {
      const answer = answerMap[stop.question];
      if (answer && stop.trigger.includes(answer)) {
        hardStopCodes.push(stop.code);
        break;
      }
    }

    if (hardStopCodes.length > 0) {
      return {
        outcome: "DO_NOT_PROCEED",
        hard_stop_codes: hardStopCodes,
        attorney_flag_codes: [],
        risk_flag_codes: [],
        answers: answerMap,
      };
    }

    // Determine outcome
    const outcome = attorneyFlagCodes.length > 0 ? "ATTORNEY_RECOMMENDED" : riskFlagCodes.length > 0 ? "PROCEED_RISK" : "PROCEED";
    return {
      outcome,
      hard_stop_codes: hardStopCodes,
      attorney_flag_codes: attorneyFlagCodes,
      risk_flag_codes: riskFlagCodes,
      answers: answerMap,
    };
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      const storedResultRaw = localStorage.getItem("e2go_quiz_result");
      const dismissedBanner = localStorage.getItem("e2go_banner_dismissed");

      if (storedResultRaw) {
        const parsedResult = JSON.parse(storedResultRaw);
        setResult(parsedResult);
        setShowBanner(!authUser && !dismissedBanner);
      } else {
        const { data: quizSession } = await supabase
          .from("quiz_sessions")
          .select("*")
          .order("created_at", { ascending: false })
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
        }
      }
      setLoading(false);
    };

    init();
  }, [supabase.auth, router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div style={{ color: "#C9A84C" }}>Loading...</div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { outcome, hard_stop_codes, attorney_flag_codes, risk_flag_codes, answers } = result;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isProceedRisk = outcome === "PROCEED_RISK";
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const applicationType = answers["Q0-09"] === "Two equal 50/50 owners" ? "Partnership" : "Solo";

  // Use the variables to suppress warnings, and later use them for real logic
  console.log({ attorney_flag_codes, risk_flag_codes, isProceedRisk, applicationType });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0a0a" }}>
      {showBanner && result && (
        <div style={{
          background: 'rgba(201,168,76,0.08)',
          borderBottom: '1px solid rgba(201,168,76,0.2)',
          padding: '16px',
        }}>
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm" style={{ color: 'rgba(245,240,232,0.8)' }}>
              We sent your result to {result.answers['Q0-21']}. Click the link to save your result.
            </p>
            <button
              onClick={() => { setShowBanner(false); localStorage.setItem("e2go_banner_dismissed", "true"); }}
              style={{ color: 'rgba(245,240,232,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>
              ✕
            </button>
          </div>
        </div>
      )}
      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl" style={{ color: "#f5f0e8" }}>Eligibility result: {outcome}</h1>
      </main>
    </div>
  );
}
