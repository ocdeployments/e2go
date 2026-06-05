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
}

interface QuizResult {
  outcome: string;
  hard_stop_codes: string[];
  attorney_flag_codes: string[];
  risk_flag_codes: string[];
  answers: Record<string, string | string[]>;
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
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const storedResultRaw = localStorage.getItem("e2go_quiz_result");
      const dismissedBanner = localStorage.getItem("e2go_banner_dismissed");

      if (storedResultRaw) {
        const parsedResult = JSON.parse(storedResultRaw);
        setResult(parsedResult);
        setShowBanner(!authUser && !dismissedBanner);
      }
      setLoading(false);
    };
    init();
  }, [supabase.auth, router]);

  if (loading || !result) {
    return <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] text-[#C9A84C]">Loading...</div>;
  }

  const { outcome, hard_stop_codes, risk_flag_codes } = result;

  const stopMessages: Record<string, string> = {
    "PR-01": "The E-2 visa requires nationality from a country with a U.S. treaty. The selected country does not currently have an E-2 treaty with the United States.",
    "PR-02": "The E-2 requires the investment funds to be your own — not primarily from a loan.",
    "PR-03": "The investment amount does not meet the minimum threshold for an E-2 application.",
    "PR-06": "The E-2 requires the investor to actively develop and direct the business — passive investment does not qualify.",
    "PR-07": "The proposed business type does not qualify for E-2 status.",
  };

  const renderDO_NOT_PROCEED = () => (
    <main className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center p-10 bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.2)]">
        <h1 className="text-2xl font-bold mb-4 text-[#f5f0e8] font-serif">The E-2 visa may not be available to you.</h1>
        <p className="mb-6 text-[rgba(245,240,232,0.75)]">{hard_stop_codes[0] && stopMessages[hard_stop_codes[0]]}</p>
        <Link href="/signup" className="block w-full py-4 bg-[#C9A84C] text-[#0a0a0a] font-medium transition-colors">Create an Account →</Link>
      </div>
    </main>
  );

  const renderATTORNEY_RECOMMENDED = () => (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-4xl font-bold mb-6 text-center text-[#f5f0e8] font-serif">We recommend speaking with an attorney first.</h1>
      <div className="flex flex-col gap-4">
        <Link href="/signup" className="w-full py-4 bg-[#C9A84C] text-[#0a0a0a] font-medium text-center">Create an Account →</Link>
        <Link href="/signup" className="w-full py-4 border border-[#C9A84C] text-[#C9A84C] text-center">Prepare My Documents Anyway</Link>
      </div>
    </main>
  );

  const renderPROCEED_RISK = () => (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full">
      <h1 className="text-4xl font-bold mb-6 text-center text-[#f5f0e8] font-serif">You may qualify — with some considerations.</h1>
      <div className="mb-8 p-6 bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.2)]">
        {risk_flag_codes.map(code => <p key={code} className="mb-2 text-[#f5f0e8]">• {code}</p>)}
      </div>
      <Link href="/signup" className="block w-full py-4 bg-[#C9A84C] text-[#0a0a0a] font-medium text-center">Start My Application →</Link>
    </main>
  );

  const renderPROCEED = () => (
    <main className="flex-1 px-4 py-12 max-w-2xl mx-auto w-full text-center">
      <h1 className="text-4xl font-bold mb-6 text-[#f5f0e8] font-serif">You appear to qualify for the E-2.</h1>
      <Link href="/signup" className="block w-full py-4 bg-[#C9A84C] text-[#0a0a0a] font-medium text-center">Start My Application →</Link>
    </main>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      {outcome === "DO_NOT_PROCEED" && renderDO_NOT_PROCEED()}
      {outcome === "ATTORNEY_RECOMMENDED" && renderATTORNEY_RECOMMENDED()}
      {outcome === "PROCEED_RISK" && renderPROCEED_RISK()}
      {outcome === "PROCEED" && renderPROCEED()}
    </div>
  );
}
