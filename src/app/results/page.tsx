"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { createAccountFromVerifiedEmail } from "../actions/create-account";
import flagExplanations from "../../data/flag_explanations.json";
import FlagCard, { FLAG_REMEDIATION } from "@/components/results/FlagCard";
import DocumentPackagePreview from "@/components/results/DocumentPackagePreview";
import OutcomeSummaryCard from "@/components/results/OutcomeSummaryCard";
import type { CaseProfile } from "@/types/case-profile";

interface ResultData {
  outcome: string;
  score: number;
  warnings: string[];
  attorney_flags: string[];
  franchise_interest: boolean;
  answers: Record<string, string | string[]>;
  country: string;
  investment_range: string;
  application_type: string;
  dependents: string;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getIdentityLabel(outcome: string, score: number): string {
  if (outcome === "PROCEED" && score >= 90) return "You're on the Straight-Path E-2 Track.";
  if (outcome === "PROCEED") return "You're on a strong E-2 path.";
  if (outcome === "PROCEED_RISK") return "Your case is viable — a few things need attention.";
  if (outcome === "ATTORNEY_RECOMMENDED") return "Your situation needs legal guidance alongside preparation.";
  return "E-2 is not viable for your current situation.";
}

function getBandConfig(outcome: string): { color: string; label: string } {
  if (outcome === "PROCEED") return { color: "#5DCAA5", label: "Strong E-2 eligibility band — safe to proceed into full preparation." };
  if (outcome === "PROCEED_RISK") return { color: "#f59e0b", label: "Viable — specific areas require strengthening before submission." };
  if (outcome === "ATTORNEY_RECOMMENDED") return { color: "rgba(239,68,68,0.8)", label: "Complex case — legal guidance recommended alongside preparation." };
  return { color: "rgba(239,68,68,0.4)", label: "E-2 approval is unlikely for your current situation." };
}

function getOutcomeCTA(outcome: string): string {
  if (outcome === "PROCEED") return "Start My E-2 Application Plan →";
  if (outcome === "PROCEED_RISK") return "See How to Strengthen My Case →";
  if (outcome === "ATTORNEY_RECOMMENDED") return "Review My Application Options →";
  return "Review My Options →";
}

function getPricingFromAnswers(_data: ResultData): { tier: string; tierId: string; total: number } {
  return { tier: "Complete", tierId: "complete", total: 1495 };
}

function getTimelineWeeks(data: ResultData): { weeksMin: number; weeksMax: number } {
  const hasBusiness = (data.answers["Q0-08"] as string || "").includes("specific business");
  const country = (data.country || "").toLowerCase();
  const warnings = data.warnings || [];
  const appType = data.application_type || "solo";

  let weeksMin = hasBusiness ? 10 : 16;
  let weeksMax = hasBusiness ? 14 : 22;

  if (country.includes("canada")) { weeksMin = Math.max(8, weeksMin - 2); weeksMax = Math.max(11, weeksMax - 3); }
  const hasPriorDenial = warnings.some(w => w === "W-REFUSAL-RECENT" || w === "W-E2-PRIOR-DENIAL" || w === "W-REFUSAL-MULTIPLE");
  if (hasPriorDenial) { weeksMin += 4; weeksMax += 8; }
  if (appType === "partnership" || appType === "spousal_partnership") { weeksMin += 2; weeksMax += 4; }

  return { weeksMin, weeksMax };
}

function getInterviewMonthRange(weeksMin: number, weeksMax: number): string {
  const today = new Date();
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const earliestDate = new Date(today); earliestDate.setDate(today.getDate() + weeksMin * 7);
  const latestDate = new Date(today); latestDate.setDate(today.getDate() + weeksMax * 7);
  const em = monthNames[earliestDate.getMonth()]; const lm = monthNames[latestDate.getMonth()];
  const ey = earliestDate.getFullYear(); const ly = latestDate.getFullYear();
  if (em === lm && ey === ly) return `${em} ${ey}`;
  if (ey === ly) return `${em} — ${lm} ${ey}`;
  return `${em} ${ey} — ${lm} ${ly}`;
}

function getTargetDateMessage(targetDate: string | null | undefined): string | null {
  if (!targetDate || targetDate === "Not sure yet") return null;
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  let monthsToAdd = 0;
  if (targetDate.includes("Within 6 months")) monthsToAdd = 6;
  else if (targetDate.includes("6 to 12")) monthsToAdd = 9;
  else if (targetDate.includes("12 to 24")) monthsToAdd = 18;
  else return null;
  const target = new Date(now); target.setMonth(target.getMonth() + monthsToAdd);
  const submitBy = new Date(target); submitBy.setMonth(submitBy.getMonth() - 4);
  return `To be in the US by ${monthNames[target.getMonth()]} ${target.getFullYear()}, submit by ${monthNames[submitBy.getMonth()]} ${submitBy.getFullYear()}.`;
}

function getConsulateIntel(country: string): { name: string; intel: string } {
  const map: Record<string, { name: string; intel: string }> = {
    "Canada": { name: "Toronto Consulate", intel: "Currently processing E-2 applications in 8–12 weeks from submission to interview. Service-based franchises and established brands have the highest approval rates in recent adjudications." },
    "United Kingdom": { name: "London Embassy", intel: "Processing times are currently 10–14 weeks. UK applicants benefit from strong treaty standing. Business plans with detailed job creation projections perform well." },
    "Germany": { name: "Frankfurt Consulate", intel: "Processing times average 8–12 weeks. German applicants have strong treaty standing. Investment documentation standards are thorough — source of funds narratives must be precise." },
    "Australia": { name: "Sydney Consulate", intel: "Processing times average 10–16 weeks. Australian applicants have strong treaty standing. Franchise applications with established U.S. brands perform consistently well." },
    "Japan": { name: "Tokyo Embassy", intel: "Processing times average 8–14 weeks. Japanese applicants benefit from a long-standing treaty relationship with the U.S. Investment documentation requirements are thorough." },
  };
  return map[country] || { name: "Your Home Consulate", intel: "Processing times vary by consulate. We track approval patterns across all 82 treaty countries. Your specific consulate intelligence will be surfaced during your application preparation." };
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    "Canada": "🇨🇦", "United Kingdom": "🇬🇧", "Germany": "🇩🇪",
    "Australia": "🇦🇺", "Japan": "🇯🇵", "France": "🇫🇷",
    "Italy": "🇮🇹", "Spain": "🇪🇸", "South Korea": "🇰🇷",
    "Brazil": "🇧🇷", "Mexico": "🇲🇽", "Netherlands": "🇳🇱",
    "Switzerland": "🇨🇭", "Sweden": "🇸🇪", "Singapore": "🇸🇬",
    "Israel": "🇮🇱", "Turkey": "🇹🇷", "Poland": "🇵🇱",
    "Argentina": "🇦🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
    "Philippines": "🇵🇭", "Thailand": "🇹🇭", "New Zealand": "🇳🇿",
  };
  return flags[country] || "🌍";
}

function getPersonalTranslation(data: ResultData, consulateName: string): string {
  const parts: string[] = [];
  if (data.country) parts.push(`${getCountryFlag(data.country)} ${data.country} national`);
  if (data.investment_range) parts.push(data.investment_range);
  const bizType = (data.answers?.["Q0-08a"] as string) || "";
  if (/franchise/i.test(bizType)) parts.push("franchise buyer");
  else if (/acquisition|existing independent/i.test(bizType)) parts.push("business acquisition");
  else if (bizType) parts.push("new business");
  if (data.application_type === "partnership" || data.application_type === "spousal_partnership") parts.push("partnership");
  else parts.push("solo applicant");
  parts.push(consulateName);
  return parts.join(" · ");
}

/* ─── Email Gate ─────────────────────────────────────────────────────────── */
function EmailGate({ onBackToQuiz }: { onBackToQuiz: () => void }) {
  const [email, setEmail] = useState("");
  const [caslConsent, setCaslConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useState(() => createBrowserSupabaseClient())[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !caslConsent || sending) return;
    setSending(true); setError(null);
    try {
      const { data: session } = await supabase.from("quiz_sessions").select("id, result_json, outcome").eq("email", email).order("completed_at", { ascending: false }).limit(1).single();
      if (!session) { setError("No quiz results found for this email. Take the quiz first."); setSending(false); return; }
      await fetch("/api/email/results", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, outcome: session.outcome, result_json: session.result_json, quiz_session_id: session.id, franchise_interest: (session.result_json as Record<string, unknown>)?.franchise_interest || false }) });
      setSent(true);
    } catch { setError("Something went wrong. Please try again."); }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
      <div className="w-full flex flex-col items-center justify-center p-8" style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300, marginBottom: "48px" }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        {sent ? (
          <>
            <div style={{ width: "48px", height: "48px", border: "2px solid #5DCAA5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}><span style={{ color: "#5DCAA5", fontSize: "20px" }}>✓</span></div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", textAlign: "center" }}>Check your email</h1>
            <p style={{ color: "rgba(245,240,232,0.76)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "8px" }}>We sent a verification link to <strong style={{ color: "#f5f0e8" }}>{email}</strong></p>
            <p style={{ color: "rgba(245,240,232,0.70)", fontSize: "13px", textAlign: "center", lineHeight: 1.6 }}>Click the link in the email to view your results. The link expires in 24 hours.</p>
            <button onClick={onBackToQuiz} style={{ marginTop: "32px", padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>← Back to quiz</button>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", textAlign: "center" }}>Your results are ready</h1>
            <p style={{ color: "rgba(245,240,232,0.76)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "32px" }}>Enter your email and we&apos;ll send you a secure link to view your eligibility results.</p>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ width: "100%", padding: "14px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "16px", boxSizing: "border-box" as const }} />
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }}>
                <input type="checkbox" checked={caslConsent} onChange={(e) => setCaslConsent(e.target.checked)} style={{ marginTop: "3px", accentColor: "#C9A84C", width: "16px", height: "16px" }} />
                <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.72)", lineHeight: 1.5 }}>I consent to receiving email from e2go.app. You can unsubscribe at any time. View our <a href="/terms" style={{ color: "#C9A84C", textDecoration: "underline" }}>Terms of Service</a>.</span>
              </label>
              <button type="submit" disabled={sending || !email || !caslConsent} style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: sending || !email || !caslConsent ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: sending || !email || !caslConsent ? 0.5 : 1 }}>
                {sending ? "Sending..." : "Send my results"}
              </button>
              {error && <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", color: "rgba(245,240,232,0.7)", lineHeight: 1.5 }}>{error}</div>}
            </form>
            <button onClick={onBackToQuiz} style={{ marginTop: "24px", padding: "8px 16px", background: "transparent", border: "none", color: "rgba(245,240,232,0.68)", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>Or retake the quiz</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Name Capture ───────────────────────────────────────────────────────── */
function NameCaptureForm({ email, quizSessionId, onSuccess, onDismiss }: { email: string; quizSessionId: string; onSuccess: () => void; onDismiss: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    if (!firstName || !lastName || !newPassword) { setError("All fields are required."); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmNewPassword) { setError("Passwords do not match."); return; }
    setCreating(true);
    try {
      const result = await createAccountFromVerifiedEmail({ email, password: newPassword, firstName, lastName, quizSessionId });
      if (result.error) {
        if (result.error.includes("already") || result.error.includes("exists") || result.error.includes("registered")) setAccountExists(true);
        else setError(result.error);
      } else { onSuccess(); }
    } catch { setError("Something went wrong. Please try again."); }
    finally { setCreating(false); }
  };

  if (accountExists) {
    return (
      <div style={{ padding: "28px", border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.03)", marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.82)", marginBottom: "14px" }}>Account found</div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>We found an account with this email</div>
        <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.74)", lineHeight: 1.6, marginBottom: "20px" }}>Log in to link this result to your account, or continue viewing as a guest.</div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link href="/login" style={{ padding: "12px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, textDecoration: "none", display: "inline-block" }}>Log in</Link>
          <button onClick={onDismiss} style={{ padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Skip for now</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.03)", marginBottom: "24px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.82)", marginBottom: "14px" }}>One last thing</div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>What&apos;s your name?</div>
      <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.72)", lineHeight: 1.6, marginBottom: "20px" }}>We&apos;ll use this for your application documents.</div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={{ padding: "12px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none" }} />
          <input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required style={{ padding: "12px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none" }} />
        </div>
        <input type="password" placeholder="Password (min 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "12px", boxSizing: "border-box" as const }} />
        <input type="password" placeholder="Confirm password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required style={{ width: "100%", padding: "12px 14px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "20px", boxSizing: "border-box" as const }} />
        {error && <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", color: "rgba(245,240,232,0.7)", marginBottom: "16px", lineHeight: 1.5 }}>{error}</div>}
        <button type="submit" disabled={creating} style={{ width: "100%", padding: "13px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: creating ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: creating ? 0.5 : 1 }}>
          {creating ? "Creating account..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

/* ─── Results Page ───────────────────────────────────────────────────────── */
function ResultsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [caseProfile, setCaseProfile] = useState<CaseProfile | null>(null);

  const [verificationState, setVerificationState] = useState<"loading" | "unverified" | "verified" | "authenticated">("loading");
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizEmail, setQuizEmail] = useState<string | null>(null);
  const [nameCaptureDismissed, setNameCaptureDismissed] = useState(false);
  const [personalizedExplanations, setPersonalizedExplanations] = useState<Record<string, string>>({});
  const [expandedFlag, setExpandedFlag] = useState<string | null>(null);
  const [flagAnswers, setFlagAnswers] = useState<Record<string, string>>({});
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [flagSaveStatus, setFlagSaveStatus] = useState<Record<string, "idle" | "saving" | "saved">>({});
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const flagDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!data) return;
    const allFlags = [...(data.warnings || []), ...(data.attorney_flags || [])];
    if (allFlags.length === 0) return;
    fetch("/api/quiz/personalized-flags", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ flags: allFlags, answers: data.answers || {} }) })
      .then(r => r.ok ? r.json() : { explanations: {} })
      .then(({ explanations }) => { if (explanations && typeof explanations === "object") setPersonalizedExplanations(explanations); })
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    const loadResult = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsLoggedIn(true); setVerificationState("authenticated");
        const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).single();
        if (profile?.first_name) setUserName(profile.first_name);
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) { try { setData(JSON.parse(stored)); } catch { /* ignore */ } }
        if (!stored) {
          const { data: session } = await supabase.from("quiz_sessions").select("result_json, outcome, score").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).single();
          if (session?.result_json) setData(session.result_json as ResultData);
        }
        try { const res = await fetch("/api/case-profile/build"); if (res.ok) { const { profile: cp } = await res.json(); setCaseProfile(cp); } } catch { /* non-blocking */ }
        try {
          const { data: appRow } = await supabase.from("applications").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (appRow) {
            setApplicationId(appRow.id);
            const uniqueAnswerKeys = Array.from(new Set(Object.values(FLAG_REMEDIATION).map(r => r.answerKey)));
            const { data: savedAnswers } = await supabase.from("answers").select("question_key, answer_value").eq("application_id", appRow.id).in("question_key", uniqueAnswerKeys);
            if (savedAnswers) {
              const map: Record<string, string> = {};
              for (const a of savedAnswers) { if (a.answer_value) map[a.question_key] = a.answer_value; }
              setFlagAnswers(map);
            }
          }
        } catch { /* non-blocking */ }
        setLoading(false); return;
      }
      const paramSession = searchParams.get("session");
      const cookieSession = getCookie("verified_session");
      const sessionId = paramSession || cookieSession;
      if (!sessionId) { setVerificationState("unverified"); setLoading(false); return; }
      setQuizSessionId(sessionId);
      const { data: session } = await supabase.from("quiz_sessions").select("result_json, outcome, email").eq("id", sessionId).single();
      if (session?.result_json) { setData(session.result_json as ResultData); setQuizEmail(session.email); setVerificationState("verified"); }
      else {
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) { try { setData(JSON.parse(stored)); setVerificationState("verified"); } catch { setVerificationState("unverified"); } }
        else { setVerificationState("unverified"); }
      }
      setLoading(false);
    };
    loadResult();
  }, [supabase, searchParams]);

  const handleFlagAnswerChange = useCallback((answerKey: string, value: string) => {
    setFlagAnswers(prev => ({ ...prev, [answerKey]: value }));
    if (!applicationId) return;
    const existing = flagDebounceRefs.current.get(answerKey);
    if (existing) clearTimeout(existing);
    setFlagSaveStatus(prev => ({ ...prev, [answerKey]: "saving" }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/answers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question_key: answerKey, answer_value: value, application_id: applicationId }) });
        if (res.ok) { setFlagSaveStatus(prev => ({ ...prev, [answerKey]: "saved" })); setTimeout(() => setFlagSaveStatus(prev => ({ ...prev, [answerKey]: "idle" })), 1500); }
        else { setFlagSaveStatus(prev => ({ ...prev, [answerKey]: "idle" })); }
      } catch { setFlagSaveStatus(prev => ({ ...prev, [answerKey]: "idle" })); }
    }, 800);
    flagDebounceRefs.current.set(answerKey, timer);
  }, [applicationId]);

  if (loading || verificationState === "loading") {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading your result...</div>
      </div>
    );
  }
  if (verificationState === "unverified") return <EmailGate onBackToQuiz={() => router.push("/quiz")} />;
  if (!data) return null;

  /* ── Computed variables ──────────────────────────────────────────────── */
  const score = data.score || 80;
  const outcome = data.outcome || "PROCEED";
  const pricing = getPricingFromAnswers(data);
  const timelineWeeks = getTimelineWeeks(data);
  const timeline = getInterviewMonthRange(timelineWeeks.weeksMin, timelineWeeks.weeksMax);
  const consulate = getConsulateIntel(data.country);
  const targetDateMsg = getTargetDateMessage(data.answers?.["Q0-target-date"] as string);
  const scoreColor = score >= 70 ? "#C9A84C" : score >= 40 ? "#f59e0b" : "rgba(245,240,232,0.68)";
  const identityLabel = getIdentityLabel(outcome, score);
  const band = getBandConfig(outcome);
  const personalTranslation = getPersonalTranslation(data, consulate.name);
  const ctaLabel = getOutcomeCTA(outcome);
  const ctaHref = isLoggedIn ? "/apply" : `/pricing?tier=${data.application_type}`;

  const allFlags = [...(data.warnings || []), ...(data.attorney_flags || [])];
  const flagsToShow = allFlags.map(code => ({
    code,
    info: (flagExplanations as Record<string, { question_id: string; plain_language: string; why_it_matters: string; edit_label: string }>)[code],
    isAttorney: (data.attorney_flags || []).includes(code),
  })).filter(f => f.info);

  const showNameCapture = verificationState === "verified" && !isLoggedIn && !nameCaptureDismissed;
  const showFranchiseTeaser = caseProfile?.franchiseTrigger ?? data.franchise_interest;
  const fddAnswer = typeof data.answers?.["Q0-08c"] === "string" ? (data.answers["Q0-08c"] as string) : "";
  const fddReceived = fddAnswer.startsWith("Yes");
  const fddOffered = fddAnswer.includes("offered");
  const showFddCta = fddReceived || fddOffered;

  const FLAG_MODULE: Record<string, string> = {
    "W-NI-NONE": "Ties Section — Non-Immigrant Intent",
    "W-NI-WEAK": "Ties Section — Non-Immigrant Intent",
    "W-REFUSAL-RECENT": "Cover Letter — Prior Refusal Narrative",
    "W-E2-PRIOR-DENIAL": "Cover Letter — Prior Refusal Narrative",
    "W-INVESTMENT-LOW": "Investment Section — Source of Funds",
    "W-INVESTMENT-CRITICAL": "Investment Section — Source of Funds",
    "W-SOURCE-UNCLEAR": "Investment Section — Source of Funds",
    "W-EXPERIENCE-WEAK": "Qualifications Section",
    "W-EXPERIENCE-CRITICAL": "Qualifications Section",
    "W-MARGINALITY-ACQUISITION": "Business Plan — Employment Creation",
  };

  const FAQ_ITEMS = [
    {
      q: "How much investment do I actually need?",
      a: "There is no hard dollar floor — E-2 uses a proportionality test. In practice, applications below $75,000 are very difficult to approve. The most successful applications show that the investment is substantial relative to the total cost of the enterprise and that the funds are clearly committed. For franchise buyers, most well-structured applications fall between $100,000 and $500,000. Your investment level and business type are both accounted for in your score above.",
    },
    {
      q: "Can E2go replace an immigration attorney?",
      a: "No, and we are explicit about this. E2go is a document preparation and case management platform — we help you organize, write, and strengthen your application file. A licensed attorney provides legal strategy, handles complex situations (prior denials, 221(g) processing, security checks), and can represent you if needed. For straightforward applications with strong investment and clean funds, E2go prepares the documents at a fraction of attorney fees. Attorney review alongside E2go is always an option.",
    },
    {
      q: "What if my application is flagged or gets a 221(g)?",
      a: "A 221(g) is an administrative hold — not a denial. It is a request for additional documents or a security clearance check. The most common requests are for source of funds documentation, business plan clarification, or an organizational chart. E2go builds all of these proactively. If you receive a 221(g), your Gap Analysis case file identifies which evidence categories to strengthen and exactly what to add. Most 221(g) cases resolve within 4–8 weeks of providing the requested documents.",
    },
    {
      q: "I've sold property in my home country — will that affect my case?",
      a: "Yes, it can — but it is manageable. Selling your primary residence is a signal officers may interpret as immigrant intent. It is not disqualifying, but it requires a clear counter-narrative: demonstrable ties that remain after the sale (family, investments, accounts, professional obligations), a credible E-2 renewal plan, and an explicit non-immigrant intent statement. E2go's Ties Section and Interview Simulator both address this pattern directly.",
    },
    {
      q: `How long does the ${consulate.name} process take?`,
      a: `From submission to interview is currently ${timelineWeeks.weeksMin}–${timelineWeeks.weeksMax} weeks for a well-prepared application at ${consulate.name}. ${consulate.intel} Preparation inside E2go typically takes 2–4 weeks depending on case complexity. Your interview window is ${timeline}. Most approvals are issued the same day as the interview, with the passport returned within 5–7 business days.`,
    },
    {
      q: "What's included in the $1,495 package?",
      a: "15 consulate-formatted documents: Cover Letter, Business Plan, Source of Funds Statement, Personal Financial Statement, Investment Evidence Summary, Qualifications Narrative, Organizational Chart, Employment Creation Plan, Business Registration Summary, Franchise Agreement Summary (if applicable), Market Analysis, Non-Immigrant Intent Statement, Spouse's Declaration (if applicable), Compliance Calendar, and a Table of Contents formatted for your consulate. The package also includes the Gap Analysis Module (6 evidence categories) and 10 document revision credits.",
    },
  ];

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <style>{`
        @media (max-width: 640px) {
          .results-hero { padding: 32px 20px 24px !important; }
          .results-page-inner { padding: 0 20px !important; }
          .free-paid-grid { grid-template-columns: 1fr !important; }
          .cta-intel-row { flex-direction: column !important; }
          .cta-block { padding: 24px 20px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {isLoggedIn && <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(201,168,76,0.85)", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Dashboard</Link>}
          <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
        </div>
      </div>

      {/* ─── ZONE 1: HERO ──────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div className="results-hero" style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 40px 36px" }}>

          <button onClick={() => router.push("/quiz/review")} style={{ fontSize: "13px", color: "rgba(245,240,232,0.70)", background: "transparent", border: "none", cursor: "pointer", padding: "0", marginBottom: "28px", fontFamily: "'DM Sans', sans-serif", display: "block" }}>
            ← Review or change my answers
          </button>

          {/* Score circle + Identity label */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "20px" }}>
            <div style={{ width: "88px", height: "88px", border: `3px solid ${scoreColor}`, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.68)", letterSpacing: "0.06em" }}>/100</div>
            </div>
            <div style={{ paddingTop: "6px", flex: 1 }}>
              {isLoggedIn && userName ? (
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, marginBottom: "8px" }}>
                  {userName}, {identityLabel.charAt(0).toLowerCase() + identityLabel.slice(1)}
                </div>
              ) : (
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, marginBottom: "8px" }}>
                  {identityLabel}
                </div>
              )}
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.62)", lineHeight: 1.6 }}>
                {personalTranslation}
              </div>
            </div>
          </div>

          {/* Eligibility band strip */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", background: "rgba(10,10,10,0.6)", border: `1px solid ${band.color}30`, marginBottom: "0" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: band.color, flexShrink: 0 }} />
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.82)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>{band.label}</div>
          </div>

          {/* Outcome Summary Card */}
          <OutcomeSummaryCard
            country={data.country}
            investmentRange={data.investment_range}
            applicationType={data.application_type}
            dependents={data.dependents}
            answers={data.answers}
            warnings={data.warnings || []}
            consulateName={consulate.name}
            outcome={outcome}
          />

          {verificationState === "verified" && !isLoggedIn && (
            <div style={{ fontSize: "12px", color: "#5DCAA5", marginTop: "14px" }}>✓ Email verified</div>
          )}
        </div>
      </div>

      {/* Name capture */}
      {showNameCapture && quizSessionId && quizEmail && (
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 40px 0" }}>
          <NameCaptureForm email={quizEmail} quizSessionId={quizSessionId} onSuccess={() => window.location.reload()} onDismiss={() => setNameCaptureDismissed(true)} />
        </div>
      )}
      {verificationState === "verified" && !isLoggedIn && nameCaptureDismissed && (
        <div style={{ padding: "16px 40px" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <Link href="/signup" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "underline" }}>Create an account to save your results and access your dashboard</Link>
          </div>
        </div>
      )}

      <div className="results-page-inner" style={{ maxWidth: "760px", margin: "0 auto", padding: "0 40px" }}>

        {/* ─── FLAGS ─────────────────────────────────────────────────────────── */}
        {flagsToShow.length > 0 && (
          <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.82)", marginBottom: "6px" }}>
              {flagsToShow.length === 1 ? "One area to address" : `${flagsToShow.length} areas to address`}
            </div>
            <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.70)", marginBottom: "20px", lineHeight: 1.5 }}>
              Your application is viable — these are preparation priorities, not disqualifiers.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {flagsToShow.map(({ code, info, isAttorney }) => {
                const remediation = FLAG_REMEDIATION[code];
                const answerKey = remediation?.answerKey;
                const flagAnswer = answerKey ? (flagAnswers[answerKey] ?? "") : "";
                const currentAnswer = data.answers?.[info.question_id]
                  ? (Array.isArray(data.answers[info.question_id]) ? (data.answers[info.question_id] as string[]).join(", ") : String(data.answers[info.question_id]))
                  : undefined;
                return (
                  <div key={code}>
                    <FlagCard
                      code={code}
                      info={info}
                      isAttorney={isAttorney}
                      currentAnswer={currentAnswer}
                      personalizedExplanation={personalizedExplanations[code]}
                      flagAnswer={flagAnswer}
                      isExpanded={expandedFlag === code}
                      canEdit={isLoggedIn && !!applicationId}
                      onToggle={() => setExpandedFlag(expandedFlag === code ? null : code)}
                      onFlagAnswerChange={handleFlagAnswerChange}
                      saveStatus={answerKey ? (flagSaveStatus[answerKey] ?? "idle") : "idle"}
                      onRedirectToQuiz={() => { localStorage.setItem("quiz_jump_to_id", info.question_id); localStorage.setItem("quiz_return_to_results", "true"); router.push("/quiz"); }}
                    />
                    {FLAG_MODULE[code] && (
                      <div style={{ marginTop: "4px", padding: "6px 12px", background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.08)", borderTop: "none", fontSize: "10.5px", color: "rgba(245,240,232,0.55)", fontFamily: "'DM Sans', sans-serif" }}>
                        How we address this: <span style={{ color: "rgba(201,168,76,0.7)" }}>{FLAG_MODULE[code]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── FREE / PAID SPLIT ─────────────────────────────────────────────── */}
        <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div className="free-paid-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
            {/* Free column */}
            <div style={{ padding: "24px 28px 24px 0", borderRight: "1px solid rgba(201,168,76,0.1)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(245,240,232,0.5)", marginBottom: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                You already have
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {[
                  "Eligibility assessment — complete",
                  `Outcome: ${identityLabel.slice(0, 32)}...`,
                  `${flagsToShow.length > 0 ? flagsToShow.length + " risk flags analysed" : "No critical flags"}`,
                  `${consulate.name} intelligence`,
                  "E-2 knowledge base — always free",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12px", color: "rgba(245,240,232,0.75)", lineHeight: 1.5 }}>
                    <span style={{ color: "#5DCAA5", fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Paid column */}
            <div style={{ padding: "24px 0 24px 28px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.65)", marginBottom: "12px", fontFamily: "'DM Sans', sans-serif" }}>
                Complete · $1,495
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "18px" }}>
                {[
                  "15 consulate-formatted documents",
                  "Business plan + source of funds narrative",
                  "Gap Analysis — 6 evidence categories",
                  "AI Interview Simulator (officer persona)",
                  "10 document revision credits",
                  "Franchise compatibility assessment",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontSize: "12px", color: "rgba(245,240,232,0.8)", lineHeight: 1.5 }}>
                    <span style={{ color: "#C9A84C", fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>→</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attorney anchor */}
          <div style={{ marginTop: "20px", padding: "16px 20px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.18)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.72)", lineHeight: 1.5 }}>
              E-2 attorneys charge <span style={{ color: "rgba(245,240,232,0.88)" }}>$8,000–$15,000</span> for document preparation.
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#C9A84C", whiteSpace: "nowrap" }}>
              E2go: $1,495
            </div>
          </div>
        </div>

        {/* ─── DOCUMENT PACKAGE PREVIEW ─────────────────────────────────────── */}
        <DocumentPackagePreview data={data} isLoggedIn={isLoggedIn} consulateName={consulate.name} />

        {/* ─── CTA BLOCK ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div className="cta-block" style={{ padding: "36px", border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.025)" }}>

            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>
                Eligibility confirmed. Let&apos;s build your case.
              </div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.65)", lineHeight: 1.5 }}>
                Your documents are pre-filled with your quiz answers. The case file opens instantly.
              </div>
            </div>

            {/* Timeline + consulate intel */}
            <div className="cta-intel-row" style={{ display: "flex", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", margin: "0 0 24px" }}>
              <div style={{ flex: 1, padding: "16px 20px 16px 0" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.62)", marginBottom: "6px" }}>Estimated interview window</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
                {targetDateMsg && <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.70)", lineHeight: 1.5 }}>{targetDateMsg}</div>}
              </div>
              <div style={{ width: "1px", background: "rgba(201,168,76,0.12)", flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "16px 0 16px 20px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.62)", marginBottom: "6px" }}>Consulate · {consulate.name}</div>
                <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.75)", lineHeight: 1.6 }}>{consulate.intel}</div>
              </div>
            </div>

            {/* What happens next */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,240,232,0.55)", marginBottom: "14px" }}>What happens next</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { time: "Day 1", text: "Your case file opens with all quiz answers pre-loaded. Begin immediately — nothing to re-enter." },
                  { time: "Week 1–2", text: "Build your 15 documents section by section. Business plan, source of funds, qualifications narrative." },
                  { time: "Week 3", text: `Complete package formatted for ${consulate.name}. Export to PDF, ready for submission.` },
                  { time: `${timeline}`, text: "Your interview. Most decisions are issued the same day. Passport returned in 5–7 days." },
                ].map(({ time, text }) => (
                  <div key={time} style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "10px", color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em", whiteSpace: "nowrap", minWidth: "60px", paddingTop: "1px" }}>{time}</div>
                    <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.75)", lineHeight: 1.55 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Price + CTA */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>${pricing.total}</div>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", marginTop: "3px" }}>Complete package · one-time payment</div>
              </div>
              <Link href={ctaHref} style={{ display: "inline-block", padding: "16px 28px", background: "#C9A84C", color: "#0a0a0a", fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", whiteSpace: "nowrap" }}>
                {ctaLabel}
              </Link>
            </div>

            {!isLoggedIn && (
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6, textAlign: "center" as const }}>
                Quiz and AI coaching are always free. You pay only when you&apos;re ready to build your case.
              </div>
            )}
          </div>
        </div>

        {/* ─── INTERVIEW SIMULATOR TEASER ────────────────────────────────────── */}
        <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.55)", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
            After the build — before the interview
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
            Interview Simulator
          </div>
          <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.70)", lineHeight: 1.65, marginBottom: "24px", maxWidth: "560px" }}>
            The E-2 interview is 15–25 minutes. Officers probe the same 8–12 areas in every session — investment substantiality, non-marginality, active management role, source of funds, and non-immigrant intent. The Simulator trains you on all of them with an adaptive AI officer persona.
          </div>

          {/* Preview card */}
          <div style={{ padding: "20px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.15)", marginBottom: "16px" }}>
            <div style={{ fontSize: "10px", color: "rgba(201,168,76,0.6)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>Sample question</div>
            <div style={{ fontSize: "13px", color: "#f5f0e8", lineHeight: 1.6, marginBottom: "12px", fontStyle: "italic" }}>
              &ldquo;Walk me through how your investment qualifies as substantial under E-2 treaty standards, relative to the total cost of the enterprise you are proposing to operate.&rdquo;
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{ padding: "4px 10px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", fontSize: "11px", color: "#f59e0b" }}>
                Unprepared score: 54/100
              </div>
              <span style={{ fontSize: "11px", color: "rgba(245,240,232,0.5)" }}>→</span>
              <div style={{ padding: "4px 10px", background: "rgba(93,202,165,0.1)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "11px", color: "#5DCAA5" }}>
                After coaching: 89/100
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.65)" }}>
              Interview Prep Pack · <span style={{ color: "#C9A84C" }}>$347</span> · add-on (requires Complete package)
            </div>
            <Link href={isLoggedIn ? "/apply?addon=interview" : "/pricing"} style={{ padding: "10px 20px", background: "transparent", border: "1px solid rgba(201,168,76,0.35)", color: "rgba(201,168,76,0.85)", fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "inline-block" }}>
              Add Interview Prep →
            </Link>
          </div>
        </div>

        {/* ─── FAQ ACCORDION ─────────────────────────────────────────────────── */}
        <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.55)", marginBottom: "6px", fontFamily: "'DM Sans', sans-serif" }}>
            Before you decide
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "20px" }}>
            Common questions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} style={{ borderTop: "1px solid rgba(201,168,76,0.1)", borderBottom: i === FAQ_ITEMS.length - 1 ? "1px solid rgba(201,168,76,0.1)" : "none" }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "16px 0", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span style={{ fontSize: "13px", color: openFaq === i ? "#C9A84C" : "#f5f0e8", lineHeight: 1.4, fontWeight: openFaq === i ? 500 : 400 }}>{item.q}</span>
                  <span style={{ fontSize: "16px", color: "rgba(201,168,76,0.6)", flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "rotate(0)", transition: "transform 0.2s ease" }}>+</span>
                </button>
                {openFaq === i && (
                  <div style={{ paddingBottom: "18px", paddingRight: "32px" }}>
                    <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.76)", lineHeight: 1.75 }}>{item.a}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── FRANCHISE TEASER ──────────────────────────────────────────────── */}
        {showFranchiseTeaser && (
          <div style={{ padding: "32px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ padding: "20px 24px", border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.03)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Franchise opportunity</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Your profile matches franchise investment opportunities</div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.74)", lineHeight: 1.6, marginBottom: "16px" }}>Based on your industry interest and investment profile, we have identified E-2-proven franchise brands in your range. Introductions are made only with your consent.</div>
              <Link href="/fdd" style={{ display: "inline-block", padding: "11px 24px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Analyse an FDD →</Link>
            </div>
          </div>
        )}

        {/* ─── FDD CTA ───────────────────────────────────────────────────────── */}
        {showFddCta && (
          <div style={{ padding: "32px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ padding: "20px 24px", border: "1px solid rgba(201,168,76,0.45)", background: "rgba(201,168,76,0.04)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Franchise disclosure document</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
                {fddReceived ? "Analyse your FDD before your interview" : "Get ahead — analyse your FDD when it arrives"}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.74)", lineHeight: 1.6, marginBottom: "16px" }}>
                {fddReceived
                  ? "You indicated you already have your Franchise Disclosure Document. Upload it now to extract unit economics, identify officer red flags, and build a stronger case before your E-2 interview."
                  : "Your franchisor has offered you the FDD. As soon as you receive it, run it through our analysis tool — it extracts Item 19 performance data and flags the specific disclosures officers scrutinise."}
              </div>
              <Link href="/fdd" style={{ display: "inline-block", padding: "11px 24px", background: fddReceived ? "#C9A84C" : "rgba(201,168,76,0.08)", border: "1px solid #C9A84C", color: fddReceived ? "#0a0a0a" : "#C9A84C", fontSize: "12px", fontWeight: fddReceived ? 600 : 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                {fddReceived ? "Analyse My FDD Now →" : "Learn About FDD Analysis →"}
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Disclaimer */}
      <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(201,168,76,0.06)", marginTop: "8px" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6, maxWidth: "720px", margin: "0 auto" }}>
          This assessment is based solely on the answers you provided and does not constitute legal advice. e2go.app is a self-service preparation tool, not a law firm. Consular decisions involve factors beyond the scope of any preparation tool. For legal advice, consult a qualified U.S. immigration attorney.
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading...</div>
      </div>
    }>
      <ResultsPageInner />
    </Suspense>
  );
}
