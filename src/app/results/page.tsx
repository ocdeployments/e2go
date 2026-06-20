"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { getPricingTier, PRICING_TIERS } from "@/lib/pricing-tier";
import { createAccountFromVerifiedEmail } from "../actions/create-account";
import flagExplanations from "../../data/flag_explanations.json";
import FaqWidget from "@/components/landing/FaqWidget";
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

/* ─── Existing helper functions ─────────────────────────────────────────── */

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent eligibility profile";
  if (score >= 80) return "Strong eligibility profile";
  if (score >= 70) return "Good eligibility profile — some areas to address";
  if (score >= 60) return "Moderate profile — attention required";
  return "Elevated risk profile — legal guidance recommended";
}

function getVerdict(outcome: string, score: number): string {
  if (outcome === "PROCEED" && score >= 90) return `${score}/100. Strong case. Here's what comes next.`;
  if (outcome === "PROCEED" || outcome === "PROCEED_RISK") return `${score}/100. You qualify. Here's what comes next.`;
  if (outcome === "ATTORNEY_RECOMMENDED") return "You may qualify — legal guidance recommended for your situation.";
  return "Your eligibility requires further review.";
}

function getVerdictSub(outcome: string, warnings: string[]): string {
  if (outcome === "PROCEED") return "Your profile clears all core eligibility requirements with no material risk flags.";
  if (outcome === "PROCEED_RISK") {
    const count = warnings.length;
    return `Your profile clears all core requirements. ${count} area${count > 1 ? "s" : ""} flagged below will need attention in your application — ${count > 1 ? "both are" : "this is"} manageable with the right preparation.`;
  }
  if (outcome === "ATTORNEY_RECOMMENDED") return "Your profile has complexity that benefits from legal review. You can still proceed — we recommend consulting an attorney alongside your preparation.";
  return "Based on your answers, we recommend speaking with a qualified immigration attorney before proceeding.";
}

function getPricingFromAnswers(data: ResultData): { tier: string; tierId: string; base: number; spouseAdd: number; childrenAdd: number; total: number } {
  const tierId = getPricingTier({
    application_type: data.application_type,
    dependents: data.dependents,
  });

  if (tierId) {
    const tierData = PRICING_TIERS[tierId];
    const dep = (data.dependents || "").toLowerCase();
    const hasSpouse = dep.includes("spouse");
    const hasChildren = dep.includes("children");
    const isPartnership = data.application_type === "partnership" || data.application_type === "spousal_partnership";

    let base = 0;
    let spouseAdd = 0;
    let childrenAdd = 0;

    if (isPartnership) {
      base = 997;
      if (hasSpouse && hasChildren) { spouseAdd = 300; childrenAdd = 100; }
      else if (hasSpouse) { spouseAdd = 300; }
    } else {
      base = 550;
      if (hasSpouse && hasChildren) { spouseAdd = 147; childrenAdd = 53; }
      else if (hasSpouse) { spouseAdd = 147; }
      else if (hasChildren) { childrenAdd = 200; }
    }

    return { tier: tierData.name, tierId, base, spouseAdd, childrenAdd, total: tierData.price };
  }

  return { tier: "Solo Individual", tierId: "solo_none", base: 550, spouseAdd: 0, childrenAdd: 0, total: 550 };
}

function getTimelineWeeks(data: ResultData): { weeksMin: number; weeksMax: number; adjustments: string[] } {
  const hasBusiness = (data.answers["Q0-08"] as string || "").includes("specific business");
  const country = (data.country || '').toLowerCase();
  const warnings = data.warnings || [];
  const appType = data.application_type || 'solo';
  const adjustments: string[] = [];

  let weeksMin = hasBusiness ? 10 : 16;
  let weeksMax = hasBusiness ? 14 : 22;

  if (country.includes('canada')) {
    weeksMin = Math.max(8, weeksMin - 2);
    weeksMax = Math.max(11, weeksMax - 3);
    adjustments.push('Canadian applicants typically benefit from faster processing');
  }

  const hasPriorDenial = warnings.some(w =>
    w === 'W-REFUSAL-RECENT' || w === 'W-E2-PRIOR-DENIAL' || w === 'W-REFUSAL-MULTIPLE'
  );
  if (hasPriorDenial) {
    weeksMin += 4;
    weeksMax += 8;
    adjustments.push('Prior visa refusal adds preparation depth and may extend processing');
  }

  if (appType === 'partnership' || appType === 'spousal_partnership') {
    weeksMin += 2;
    weeksMax += 4;
    adjustments.push('Partnership applications require additional documentation for both investors');
  }

  return { weeksMin, weeksMax, adjustments };
}

function getInterviewMonthRange(weeksMin: number, weeksMax: number): string {
  const today = new Date();
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const earliestDate = new Date(today);
  earliestDate.setDate(today.getDate() + weeksMin * 7);

  const latestDate = new Date(today);
  latestDate.setDate(today.getDate() + weeksMax * 7);

  const earliestMonth = monthNames[earliestDate.getMonth()];
  const latestMonth = monthNames[latestDate.getMonth()];
  const earliestYear = earliestDate.getFullYear();
  const latestYear = latestDate.getFullYear();

  if (earliestMonth === latestMonth && earliestYear === latestYear) return `${earliestMonth} ${earliestYear}`;
  if (earliestYear === latestYear) return `${earliestMonth} — ${latestMonth} ${earliestYear}`;
  return `${earliestMonth} ${earliestYear} — ${latestMonth} ${latestYear}`;
}

function getJourneyStepMonths(): string[] {
  const today = new Date();
  const addM = (n: number): string => {
    const d = new Date(today);
    d.setMonth(d.getMonth() + n);
    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };
  const addW = (n: number): string => {
    const d = new Date(today);
    d.setDate(d.getDate() + n * 7);
    return d.toLocaleString('default', { month: 'short', year: 'numeric' });
  };
  return [addM(0), addM(1), addM(2), addM(3), addM(4), addW(22), addM(7)];
}

function getTargetDateMessage(targetDate: string | null | undefined): string | null {
  if (!targetDate || targetDate === "Not sure yet") return null;
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  let monthsToAdd = 0;
  if (targetDate.includes("Within 6 months")) monthsToAdd = 6;
  else if (targetDate.includes("6 to 12")) monthsToAdd = 9;
  else if (targetDate.includes("12 to 24")) monthsToAdd = 18;
  else return null;
  const target = new Date(now);
  target.setMonth(target.getMonth() + monthsToAdd);
  const submitBy = new Date(target);
  submitBy.setMonth(submitBy.getMonth() - 4);
  return `To be in the US by ${monthNames[target.getMonth()]} ${target.getFullYear()}, you need to submit your application by ${monthNames[submitBy.getMonth()]} ${submitBy.getFullYear()}.`;
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
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'Canada': '🇨🇦', 'United Kingdom': '🇬🇧', 'Germany': '🇩🇪',
    'Australia': '🇦🇺', 'Japan': '🇯🇵', 'France': '🇫🇷',
    'Italy': '🇮🇹', 'Spain': '🇪🇸', 'South Korea': '🇰🇷',
    'Brazil': '🇧🇷', 'Mexico': '🇲🇽', 'Netherlands': '🇳🇱',
    'Switzerland': '🇨🇭', 'Sweden': '🇸🇪', 'Singapore': '🇸🇬',
    'Israel': '🇮🇱', 'Turkey': '🇹🇷', 'Poland': '🇵🇱',
    'Argentina': '🇦🇷', 'Chile': '🇨🇱', 'Colombia': '🇨🇴',
    'Philippines': '🇵🇭', 'Thailand': '🇹🇭', 'New Zealand': '🇳🇿',
  };
  return flags[country] || '🌍';
}



/* ─── Email Gate ────────────────────────────────────────────────────────── */
function EmailGate({ onBackToQuiz }: { onBackToQuiz: () => void }) {
  const [email, setEmail] = useState('');
  const [caslConsent, setCaslConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = useState(() => createBrowserSupabaseClient())[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !caslConsent || sending) return;
    setSending(true);
    setError(null);
    try {
      const { data: session } = await supabase
        .from("quiz_sessions")
        .select("id, result_json, outcome")
        .eq("email", email)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();
      if (!session) { setError("No quiz results found for this email. Take the quiz first."); setSending(false); return; }
      await fetch("/api/email/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, outcome: session.outcome, result_json: session.result_json, quiz_session_id: session.id, franchise_interest: (session.result_json as Record<string, unknown>)?.franchise_interest || false }),
      });
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
            <div style={{ width: "48px", height: "48px", border: "2px solid #5DCAA5", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "24px" }}>
              <span style={{ color: "#5DCAA5", fontSize: "20px" }}>✓</span>
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", textAlign: "center" }}>Check your email</h1>
            <p style={{ color: "rgba(245,240,232,0.5)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "8px" }}>We sent a verification link to <strong style={{ color: "#f5f0e8" }}>{email}</strong></p>
            <p style={{ color: "rgba(245,240,232,0.35)", fontSize: "13px", textAlign: "center", lineHeight: 1.6 }}>Click the link in the email to view your results. The link expires in 24 hours.</p>
            <button onClick={onBackToQuiz} style={{ marginTop: "32px", padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>← Back to quiz</button>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", textAlign: "center" }}>Your results are ready</h1>
            <p style={{ color: "rgba(245,240,232,0.5)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "32px" }}>Enter your email and we&apos;ll send you a secure link to view your eligibility results.</p>
            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required style={{ width: "100%", padding: "14px 16px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: "#f5f0e8", fontSize: "14px", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, outline: "none", marginBottom: "16px", boxSizing: "border-box" as const }} />
              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }}>
                <input type="checkbox" checked={caslConsent} onChange={(e) => setCaslConsent(e.target.checked)} style={{ marginTop: "3px", accentColor: "#C9A84C", width: "16px", height: "16px" }} />
                <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>I consent to receiving email from e2go.app. You can unsubscribe at any time. View our <a href="/terms" style={{ color: "#C9A84C", textDecoration: "underline" }}>Terms of Service</a>.</span>
              </label>
              <button type="submit" disabled={sending || !email || !caslConsent} style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: sending || !email || !caslConsent ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: sending || !email || !caslConsent ? 0.5 : 1 }}>
                {sending ? "Sending..." : "Send my results"}
              </button>
              {error && <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", color: "rgba(245,240,232,0.7)", lineHeight: 1.5 }}>{error}</div>}
            </form>
            <button onClick={onBackToQuiz} style={{ marginTop: "24px", padding: "8px 16px", background: "transparent", border: "none", color: "rgba(245,240,232,0.3)", fontSize: "12px", cursor: "pointer", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>Or retake the quiz</button>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Name Capture ───────────────────────────────────────────────────────── */
function NameCaptureForm({ email, quizSessionId, onSuccess, onDismiss }: { email: string; quizSessionId: string; onSuccess: () => void; onDismiss: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
        <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Account found</div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>We found an account with this email</div>
        <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "20px" }}>Log in to link this result to your account, or continue viewing as a guest.</div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link href="/login" style={{ padding: "12px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, textDecoration: "none", display: "inline-block" }}>Log in</Link>
          <button onClick={onDismiss} style={{ padding: "12px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "12px", cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Skip for now</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.03)", marginBottom: "24px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>One last thing</div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>What&apos;s your name?</div>
      <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>We&apos;ll use this for your application documents.</div>
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

  const [verificationState, setVerificationState] = useState<'loading' | 'unverified' | 'verified' | 'authenticated'>('loading');
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizEmail, setQuizEmail] = useState<string | null>(null);
  const [nameCaptureDismissed, setNameCaptureDismissed] = useState(false);
  const [personalizedExplanations, setPersonalizedExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!data) return;
    const allFlags = [...(data.warnings || []), ...(data.attorney_flags || [])];
    if (allFlags.length === 0) return;
    fetch('/api/quiz/personalized-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flags: allFlags, answers: data.answers || {} }),
    })
      .then(r => r.ok ? r.json() : { explanations: {} })
      .then(({ explanations }) => { if (explanations && typeof explanations === 'object') setPersonalizedExplanations(explanations); })
      .catch(() => {});
  }, [data]);

  useEffect(() => {
    const loadResult = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        setVerificationState('authenticated');

        const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).single();
        if (profile?.first_name) setUserName(profile.first_name);

        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) { try { setData(JSON.parse(stored)); } catch { /* ignore */ } }

        if (!stored) {
          const { data: session } = await supabase.from("quiz_sessions").select("result_json, outcome, score").eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).single();
          if (session?.result_json) setData(session.result_json as ResultData);
        }

        // Build case profile server-side (graceful fallback on failure)
        try {
          const res = await fetch('/api/case-profile/build');
          if (res.ok) {
            const { profile: cp } = await res.json();
            setCaseProfile(cp);
          }
        } catch { /* non-blocking */ }

        setLoading(false);
        return;
      }

      const paramSession = searchParams.get('session');
      const cookieSession = getCookie('verified_session');
      const sessionId = paramSession || cookieSession;

      if (!sessionId) { setVerificationState('unverified'); setLoading(false); return; }

      setQuizSessionId(sessionId);
      const { data: session } = await supabase.from("quiz_sessions").select("result_json, outcome, email").eq("id", sessionId).single();

      if (session?.result_json) {
        setData(session.result_json as ResultData);
        setQuizEmail(session.email);
        setVerificationState('verified');
      } else {
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) {
          try { setData(JSON.parse(stored)); setVerificationState('verified'); }
          catch { setVerificationState('unverified'); }
        } else { setVerificationState('unverified'); }
      }

      setLoading(false);
    };

    loadResult();
  }, [supabase, searchParams]);

  if (loading || verificationState === 'loading') {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading your result...</div>
      </div>
    );
  }

  if (verificationState === 'unverified') {
    return <EmailGate onBackToQuiz={() => router.push('/quiz')} />;
  }

  if (!data) return null;

  const score = data.score || 80;
  const outcome = data.outcome || "PROCEED";
  const pricing = getPricingFromAnswers(data);
  const timelineWeeks = getTimelineWeeks(data);
  const timeline = getInterviewMonthRange(timelineWeeks.weeksMin, timelineWeeks.weeksMax);
  const consulate = getConsulateIntel(data.country);
  const targetDateMsg = getTargetDateMessage(data.answers?.["Q0-target-date"] as string);
  const scoreLabel = getScoreLabel(score);
  const verdict = getVerdict(outcome, score);
  const verdictSub = getVerdictSub(outcome, data.warnings || []);
  const scoreColor = score >= 70 ? '#C9A84C' : score >= 40 ? '#f59e0b' : 'rgba(245,240,232,0.3)';

  const allFlags = [...(data.warnings || []), ...(data.attorney_flags || [])];

  function computeCriteriaBreakdown(d: ResultData): Array<{ label: string; score: number; note: string }> {
    const warns = new Set(d.warnings || []);
    const atty  = new Set(d.attorney_flags || []);
    const hard  = d.outcome === 'DO_NOT_PROCEED';
    const has = (...codes: string[]) => codes.some(c => warns.has(c) || atty.has(c));

    const nationalityScore = hard ? 0 : 100;
    const nationalityNote  = hard ? 'Hard stop — eligibility blocked' : 'Treaty country confirmed';

    const investScore = has('W-PROP-STRONG') ? 40 : has('W-PROP-SOFT', 'W-05') ? 70 : 100;
    const investNote  = has('W-PROP-STRONG') ? 'Below $75K — strong concern' : has('W-PROP-SOFT', 'W-05') ? 'Below $150K — advisory flag' : 'Investment level clear';

    const fundsFlags = [has('W-06'), has('W-07'), has('W-08')].filter(Boolean).length;
    const fundsScore = fundsFlags >= 2 ? 45 : fundsFlags === 1 ? 65 : 100;
    const fundsNote  = fundsFlags >= 2 ? 'Multiple documentation gaps' : fundsFlags === 1 ? 'Paper trail needs attention' : 'Source of funds clear';

    const bizFlags = [has('W-09'), has('W-10'), has('W-15')].filter(Boolean).length;
    const bizScore  = has('PR-05', 'PR-07', 'PR-08', 'PR-09') ? 20 : bizFlags >= 2 ? 50 : bizFlags === 1 ? 75 : 100;
    const bizNote   = has('PR-05', 'PR-07', 'PR-08', 'PR-09') ? 'Role or business type concern' : bizFlags >= 1 ? 'Role / structure needs clarification' : 'Active management role confirmed';

    const intentScore = has('W-NI-NONE') ? 30 : has('W-NI-WEAK') ? 55 : has('W-NI-01', 'W-NI-02', 'W-NI-03') ? 80 : 100;
    const intentNote  = has('W-NI-NONE') ? 'Weak ties to home country' : has('W-NI-WEAK') ? 'Limited ties — needs attention' : has('W-NI-01', 'W-NI-02', 'W-NI-03') ? 'Ties documented — strengthen further' : 'Strong home-country ties';

    return [
      { label: 'Treaty nationality',  score: nationalityScore, note: nationalityNote },
      { label: 'Investment amount',    score: investScore,      note: investNote },
      { label: 'Source of funds',      score: fundsScore,       note: fundsNote },
      { label: 'Business & role',      score: bizScore,         note: bizNote },
      { label: 'Non-immigrant intent', score: intentScore,      note: intentNote },
    ];
  }

  const criteriaBreakdown = computeCriteriaBreakdown(data);

  const flagsToShow = allFlags.map(code => ({
    code,
    info: (flagExplanations as Record<string, { question_id: string; plain_language: string; why_it_matters: string; edit_label: string }>)[code],
    isAttorney: (data.attorney_flags || []).includes(code),
  })).filter(f => f.info);

  const showNameCapture = verificationState === 'verified' && !isLoggedIn && !nameCaptureDismissed;

  // Franchise trigger
  const showFranchiseTeaser = caseProfile?.franchiseTrigger ?? data.franchise_interest;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <style>{`
        @media (max-width: 640px) {
          .profile-snap { grid-template-columns: 1fr 1fr !important; }
          .roadmap-step { flex-direction: column !important; gap: 8px !important; }
          .cta-intel-row { flex-direction: column !important; }
          .results-page-inner { padding: 0 20px !important; }
          .results-hero { padding: 36px 20px 28px !important; }
          .cta-block { padding: 24px 20px !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          {isLoggedIn && (
            <Link href="/dashboard" style={{ fontSize: "11px", color: "rgba(201,168,76,0.55)", letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>Dashboard</Link>
          )}
          <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
        </div>
      </div>

      {/* ─── ZONE 1: Hero — compact verdict ───────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div className="results-hero" style={{ maxWidth: "760px", margin: "0 auto", padding: "48px 40px 36px" }}>
          <button onClick={() => router.push('/quiz/review')} style={{ fontSize: '13px', color: 'rgba(245,240,232,0.35)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', marginBottom: '28px', fontFamily: "'DM Sans', sans-serif", display: 'block' }}>
            ← Review or change my answers
          </button>

          {/* Score circle + verdict */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "24px", marginBottom: "28px" }}>
            <div style={{ width: "88px", height: "88px", border: `3px solid ${scoreColor}`, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.3)", letterSpacing: "0.06em" }}>/100</div>
            </div>
            <div style={{ paddingTop: "4px" }}>
              {isLoggedIn && userName ? (
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, marginBottom: "6px" }}>{userName}, {verdict.charAt(0).toLowerCase() + verdict.slice(1)}</div>
              ) : (
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, marginBottom: "6px" }}>{verdict}</div>
              )}
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>{scoreLabel}</div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)", lineHeight: 1.65, maxWidth: "480px" }}>{verdictSub}</div>
            </div>
          </div>

          {/* ─── 7-step Journey Strip ──────────────────────────────────────────── */}
          {(() => {
            const sm = getJourneyStepMonths();
            const steps = [
              { label: "Eligibility confirmed", sub: `Quiz complete · ${score}/100`, month: sm[0], state: "done" as const },
              { label: "Business selection", sub: "Franchise matching · FDD & Market Analysis", month: sm[1], state: "active" as const },
              { label: "Application package", sub: "Business plan · All docs · Funds narrative", month: sm[2], state: "upcoming" as const },
              { label: "Application submission", sub: "DS-160 · Fees · Booking", month: sm[3], state: "upcoming" as const },
              { label: "Interview preparation", sub: "Consulate coaching · AI Simulator · Prep Kit", month: sm[4], state: "upcoming" as const },
              { label: "Consular interview", sub: consulate.name, month: sm[5], state: "upcoming" as const },
              { label: "Arrive in USA", sub: "Own your business", month: sm[6], state: "goal" as const },
            ];
            return (
              <div style={{ marginBottom: "24px", padding: "18px 20px 20px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.08)", marginLeft: "-20px", marginRight: "-20px" }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "3px", flexWrap: "wrap", gap: "4px" }}>
                  <div style={{ fontSize: "12px", fontWeight: 500, color: "#f5f0e8" }}>Your E-2 Journey to the USA</div>
                  <div style={{ fontSize: "10px", color: "rgba(201,168,76,0.65)", fontStyle: "italic" }}>Start now — you could be in the US by {sm[6]}</div>
                </div>
                <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.2)", marginBottom: "16px" }}>7 milestones · {consulate.name}</div>
                <div style={{ overflowX: "auto" as const }}>
                  <div style={{ display: "flex", minWidth: "660px" }}>
                    {steps.map((step, i) => (
                      <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                        {i > 0 && <div style={{ position: "absolute", top: "5px", left: 0, width: "50%", height: "1px", background: "rgba(201,168,76,0.12)" }} />}
                        {i < steps.length - 1 && <div style={{ position: "absolute", top: "5px", left: "50%", width: "50%", height: "1px", background: "rgba(201,168,76,0.12)" }} />}
                        <div style={{
                          width: step.state === "goal" ? "14px" : "11px",
                          height: step.state === "goal" ? "14px" : "11px",
                          borderRadius: "50%",
                          background: step.state === "done" ? "#5DCAA5" : step.state === "active" || step.state === "goal" ? "#C9A84C" : "transparent",
                          border: `1.5px solid ${step.state === "done" ? "#5DCAA5" : step.state === "active" || step.state === "goal" ? "#C9A84C" : "rgba(201,168,76,0.2)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative", zIndex: 1, flexShrink: 0,
                        }}>
                          {step.state === "done" && <span style={{ fontSize: "7px", color: "#0a0a0a", fontWeight: 700 }}>✓</span>}
                          {step.state === "goal" && <span style={{ fontSize: "7px", color: "#0a0a0a", fontWeight: 700 }}>★</span>}
                        </div>
                        <div style={{ marginTop: "7px", textAlign: "center", padding: "0 2px" }}>
                          <div style={{ fontSize: "8px", fontWeight: 600, lineHeight: 1.3, marginBottom: "2px", color: step.state === "done" ? "#5DCAA5" : step.state === "active" || step.state === "goal" ? "#C9A84C" : "rgba(245,240,232,0.28)" }}>{step.label}</div>
                          <div style={{ fontSize: "7px", lineHeight: 1.4, marginBottom: "3px", color: step.state === "done" ? "rgba(93,202,165,0.45)" : step.state === "active" || step.state === "goal" ? "rgba(201,168,76,0.5)" : "rgba(245,240,232,0.13)" }}>{step.sub}</div>
                          {step.state === "done" && <div style={{ display: "inline-block", fontSize: "6px", background: "rgba(93,202,165,0.1)", border: "1px solid rgba(93,202,165,0.3)", color: "#5DCAA5", padding: "1px 4px", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: "2px" }}>YOU ARE HERE</div>}
                          <div style={{ fontSize: "7px", fontWeight: step.state === "goal" ? 600 : 400, color: step.state === "done" ? "rgba(245,240,232,0.4)" : step.state === "goal" ? "#C9A84C" : "rgba(245,240,232,0.3)" }}>{step.month}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* All qualifying criteria chips */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "12px", color: "#5DCAA5" }}>
              {getCountryFlag(data.country)} {data.country} — E-2 treaty confirmed
            </div>
            {criteriaBreakdown[1].score >= 70 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "12px", color: "#5DCAA5" }}>
                ✓ {data.investment_range} — {criteriaBreakdown[1].note.charAt(0).toLowerCase() + criteriaBreakdown[1].note.slice(1)}
              </div>
            )}
            {criteriaBreakdown[2].score >= 70 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "12px", color: "#5DCAA5" }}>
                ✓ {criteriaBreakdown[2].note}
              </div>
            )}
            {criteriaBreakdown[3].score >= 70 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "12px", color: "#5DCAA5" }}>
                ✓ {data.application_type === "partnership" ? "Partnership investors" : "Solo investor"} — {criteriaBreakdown[3].note.charAt(0).toLowerCase() + criteriaBreakdown[3].note.slice(1)}
              </div>
            )}
            {criteriaBreakdown[4].score >= 70 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "5px 12px", background: "rgba(93,202,165,0.06)", border: "1px solid rgba(93,202,165,0.25)", fontSize: "12px", color: "#5DCAA5" }}>
                ✓ Non-immigrant intent — {criteriaBreakdown[4].note.charAt(0).toLowerCase() + criteriaBreakdown[4].note.slice(1)}
              </div>
            )}
          </div>


          {/* ─── Flags — immediately below chips ───────────────────────────── */}
          {flagsToShow.length > 0 && (
            <div style={{ marginTop: "16px", marginBottom: "8px" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "6px" }}>
                {flagsToShow.length === 1 ? "One area to address" : `${flagsToShow.length} areas to address`}
              </div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.35)", marginBottom: "12px", lineHeight: 1.5 }}>
                Your application is still viable — these are preparation priorities, not disqualifiers.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {flagsToShow.map(({ code, info, isAttorney }) => (
                  <div key={code} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: `1px solid ${isAttorney ? "rgba(239,100,100,0.25)" : "rgba(239,159,39,0.25)"}`, background: isAttorney ? "rgba(239,100,100,0.04)" : "rgba(239,159,39,0.04)" }}>
                    <div style={{ fontSize: "16px", color: isAttorney ? "rgba(239,100,100,0.8)" : "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>{isAttorney ? "⚖" : "!"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: isAttorney ? "rgba(239,100,100,0.95)" : "rgba(239,159,39,0.95)", marginBottom: "3px" }}>{info.plain_language}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "6px" }}>{personalizedExplanations[code] || info.why_it_matters}</div>
                      {data.answers?.[info.question_id] && (
                        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.3)", marginBottom: "6px" }}>Your answer: &ldquo;{Array.isArray(data.answers[info.question_id]) ? (data.answers[info.question_id] as string[]).join(", ") : String(data.answers[info.question_id])}&rdquo;</div>
                      )}
                      <button
                        onClick={() => {
                          localStorage.setItem("quiz_jump_to_id", info.question_id);
                          localStorage.setItem("quiz_return_to_results", "true");
                          router.push("/quiz");
                        }}
                        style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "underline", background: "transparent", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                      >
                        {info.edit_label} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verificationState === 'verified' && !isLoggedIn && (
            <div style={{ fontSize: "12px", color: "#5DCAA5", marginBottom: "12px" }}>✓ Email verified</div>
          )}
        </div>
      </div>

      {/* Name capture */}
      {showNameCapture && quizSessionId && quizEmail && (
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "32px 40px 0" }}>
          <NameCaptureForm email={quizEmail} quizSessionId={quizSessionId} onSuccess={() => window.location.reload()} onDismiss={() => setNameCaptureDismissed(true)} />
        </div>
      )}
      {verificationState === 'verified' && !isLoggedIn && nameCaptureDismissed && (
        <div style={{ padding: "16px 40px" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <Link href="/signup" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "underline" }}>Create an account to save your results and access your dashboard</Link>
          </div>
        </div>
      )}

      <div className="results-page-inner" style={{ maxWidth: "760px", margin: "0 auto", padding: "0 40px" }}>

        {/* ─── Editorial hook — between chips and flags ───────────────────── */}
        <div style={{ padding: "48px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ width: "28px", height: "1px", background: "rgba(201,168,76,0.4)", marginBottom: "28px" }} />
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, lineHeight: 1.85 }}>
            <p style={{ fontSize: "19px", color: "rgba(245,240,232,0.6)", margin: "0 0 18px" }}>
              You&apos;ve done the research. Talked to a few people. Your funds are ready.
            </p>
            <p style={{ fontSize: "22px", color: "#f5f0e8", fontStyle: "italic", margin: "0 0 18px" }}>
              And yet — one more question. One more article. One more person to ask.
            </p>
            <p style={{ fontSize: "19px", color: "rgba(245,240,232,0.6)", margin: "0 0 18px" }}>
              That&apos;s not laziness. That&apos;s fear of the process.
            </p>
            <p style={{ fontSize: "19px", color: "rgba(245,240,232,0.75)", margin: 0 }}>
              <span style={{ color: "#C9A84C" }}>E2go removes it.</span>{" "}
              From business plan to interview simulator, we guide you through every step of your application — at your own pace, in one platform, at a fraction of what an attorney charges.
            </p>
          </div>
        </div>

        {/* ─── ZONE 4: Package CTA — full-width conversion block ─────────────── */}
        <div style={{ padding: "40px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div className="cta-block" style={{ padding: "36px", border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.03)" }}>

            <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "4px" }}>Eligibility confirmed. Let&apos;s build your case.</div>
            <div style={{ fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(201,168,76,0.65)", marginBottom: "20px" }}>E-2 application package · {pricing.tier}</div>

            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>{pricing.tier}</div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)" }}>
                    {pricing.tier.includes("Partnership") ? "Partnership base" : "Solo applicant"}: <span style={{ color: "#f5f0e8" }}>${pricing.base}</span>
                  </span>
                  {pricing.spouseAdd > 0 && <span style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)" }}>+ Spouse: <span style={{ color: "#f5f0e8" }}>${pricing.spouseAdd}</span></span>}
                  {pricing.childrenAdd > 0 && <span style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)" }}>+ Children: <span style={{ color: "#f5f0e8" }}>${pricing.childrenAdd}</span></span>}
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.3)", marginBottom: "2px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Total</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>${pricing.total}</div>
              </div>
            </div>

            {/* Timeline + Consulate intel — inside CTA block */}
            <div className="cta-intel-row" style={{ display: "flex", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", margin: "0 0 24px" }}>
              <div style={{ flex: 1, padding: "16px 20px 16px 0" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.22)", marginBottom: "6px" }}>Estimated interview window</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
                {targetDateMsg && <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", lineHeight: 1.5 }}>{targetDateMsg}</div>}
              </div>
              <div style={{ width: "1px", background: "rgba(201,168,76,0.12)", flexShrink: 0 }} />
              <div style={{ flex: 1, padding: "16px 0 16px 20px" }}>
                <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(245,240,232,0.22)", marginBottom: "6px" }}>Consulate data · {consulate.name}</div>
                <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6 }}>{consulate.intel}</div>
              </div>
            </div>

            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.3)", marginBottom: "24px", lineHeight: 1.6 }}>
              Applications submitted this summer are best positioned for the {timeline} interview window at {consulate.name}.
            </div>

            {/* After you join us */}
            <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: "20px", marginBottom: "24px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(245,240,232,0.2)", marginBottom: "14px" }}>After you join us</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { n: "1", text: "Your onboarding questionnaire is ready — ", strong: "instantly" },
                  { n: "2", text: "We match you with a franchise broker based on your investment range — ", strong: "within 24 hours" },
                  { n: "3", text: "Build your application package inside E2go at your own pace — ", strong: "the platform is ready when you are" },
                  { n: "4", text: "When your information is complete, your case file is submission-ready — ", strong: "most clients finish in 2–4 weeks" },
                ].map(({ n, text, strong }) => (
                  <div key={n} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", color: "rgba(201,168,76,0.55)", flexShrink: 0, marginTop: "1px" }}>{n}</div>
                    <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.5 }}>{text}<span style={{ color: "rgba(245,240,232,0.75)" }}>{strong}</span></div>
                  </div>
                ))}
              </div>
            </div>

            <Link href={isLoggedIn ? "/apply" : `/pricing?tier=${data.application_type}`} style={{ display: "block", padding: "18px 24px", background: "#C9A84C", color: "#0a0a0a", fontSize: "13px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", textAlign: "center" as const }}>
              Yes — build my case file →
            </Link>
            {!isLoggedIn && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "rgba(245,240,232,0.22)", textAlign: "center" as const, lineHeight: 1.6 }}>
                Quiz and AI coaching are always free.<br />You pay only when you&apos;re ready to build your case.
              </div>
            )}
          </div>
        </div>

        {/* ─── ZONE 5: Franchise Teaser ──────────────────────────────────────── */}
        {showFranchiseTeaser && (
          <div style={{ padding: "32px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ padding: "20px 24px", border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.03)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Franchise opportunity</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
                Your profile matches franchise investment opportunities
              </div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "16px" }}>
                Based on your industry interest and investment profile, we have identified E-2-proven franchise brands in your range. Introductions are made only with your consent.
              </div>
              <Link href="/fdd" style={{ display: "inline-block", padding: "11px 24px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                Analyse an FDD →
              </Link>
            </div>
          </div>
        )}

        {/* ─── ZONE 9: FAQ ────────────────────────────────────────────────────── */}
        <FaqWidget />

      </div>

      {/* Disclaimer */}
      <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(201,168,76,0.06)" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.18)", lineHeight: 1.6, maxWidth: "720px", margin: "0 auto" }}>
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
