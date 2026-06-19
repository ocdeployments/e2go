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
  if (outcome === "PROCEED" && score >= 90) return "You are strongly positioned for the E-2 Treaty Investor visa.";
  if (outcome === "PROCEED" || outcome === "PROCEED_RISK") return "You appear to qualify for the E-2 Treaty Investor visa.";
  if (outcome === "ATTORNEY_RECOMMENDED") return "You may qualify — with legal guidance recommended for your situation.";
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

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
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

/* ─── New helpers for 9-section layout ────────────────────────────────── */

function getConfidenceTier(dataState: string): { label: string; color: string } {
  switch (dataState) {
    case 'full':       return { label: 'Fully verified',       color: '#22c55e' };
    case 'documents':  return { label: 'Document-confirmed',   color: '#C9A84C' };
    case 'case_file':  return { label: 'Case file reported',   color: '#f59e0b' };
    default:           return { label: 'Quiz-derived',         color: 'rgba(245,240,232,0.35)' };
  }
}

function getOutcomeLabel(score: number): string {
  if (score >= 80) return "Strong Foundation";
  if (score >= 70) return "Good Foundation";
  if (score >= 50) return "Moderate Profile";
  return "Needs Attention";
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

const ARCHETYPE_STEPS: Record<string, Array<{ title: string; desc: string }>> = {
  buyer: [
    { title: "Review your franchise matches", desc: "Your profile fits several E-2-proven franchise models with documented approval histories. See matches below." },
    { title: "Document your source of funds", desc: "Franchise investments require clean, traceable capital. Start assembling your paper trail now." },
    { title: "Engage an E-2 franchise specialist", desc: "Specialist consultants match buyers with brands that have strong E-2 consular approval records." },
  ],
  builder: [
    { title: "Define your business model precisely", desc: "E-2 officers expect specificity — document your product, market, and differentiation clearly." },
    { title: "Establish your management role", desc: "You must fill a directing, executive, or supervisory role. Confirm this is explicit in all documentation." },
    { title: "Draft your business plan", desc: "A credible business plan is the centrepiece of an E-2 application. Begin your narrative now." },
  ],
  investor: [
    { title: "Identify your investment vehicle", desc: "E-2 requires direct investment in an active U.S. business. Passive holdings do not qualify." },
    { title: "Engage a U.S. business broker", desc: "Look for established businesses with verified financials and an active, documented customer base." },
    { title: "Prepare your investment documentation", desc: "Every dollar must be traced to a legitimate source. Begin assembling investment records now." },
  ],
  career_switcher: [
    { title: "Choose your business direction", desc: "E-2 requires a real, actively operating U.S. business. Define your sector and operating model first." },
    { title: "Research the franchise path", desc: "Franchises provide established models, brand infrastructure, and documented E-2 approval histories." },
    { title: "Document your management capability", desc: "Show you can operate and manage the business. Highlight relevant professional experience and skills." },
  ],
};

const NET_WORTH_LABELS: Record<string, string> = {
  under_250k: 'Under $250k', '250k_500k': '$250k – $500k',
  '500k_1m': '$500k – $1M', '1m_2_5m': '$1M – $2.5M', over_2_5m: 'Over $2.5M',
};
const PRIOR_BUSINESS_LABELS: Record<string, string> = {
  owner: 'Business owner', manager: 'Business manager',
  career_switcher: 'Career transition', investor: 'Investor',
};
const INDUSTRY_LABELS: Record<string, string> = {
  home_care: 'Home / senior care', food_beverage: 'Food & beverage',
  retail_services: 'Retail / consumer', professional_services: 'Professional services',
  technology: 'Technology / SaaS', existing_business: 'Specific business', exploring: 'Still exploring',
};
const TIMELINE_LABELS: Record<string, string> = {
  urgent: 'Within 6 months', '6_12mo': '6 – 12 months',
  '12_24mo': '12 – 24 months', planning: '2+ years',
};

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
    if (!email || sending) return;
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
              <button type="submit" disabled={sending || !email} style={{ width: "100%", padding: "14px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: sending || !email ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", borderRadius: 0, opacity: sending || !email ? 0.5 : 1 }}>
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
  const outcomeLabel = getOutcomeLabel(score);
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

  const clearItems = [
    !data.attorney_flags?.length && "No attorney-level risk flags",
    !(data.warnings || []).some(w => w.includes("refusal")) && "No immigration history issues",
    !(data.warnings || []).some(w => w.includes("documentation")) && "Investment source — clear",
  ].filter(Boolean) as string[];

  function getBenefits(d: ResultData) {
    const dep = (d.dependents || '').toLowerCase();
    const hasSpouse = dep.includes('spouse') || dep.includes('partner');
    const hasChildren = dep.includes('children') || dep.includes('child');
    const all = [
      { key: 'spouse',   show: hasSpouse,  priority: true,                     title: 'Your spouse can work anywhere in the U.S.', desc: 'Your spouse receives work authorisation and can work for any U.S. employer in any role — not just your business.' },
      { key: 'children', show: hasChildren, priority: true,                     title: 'Your children attend U.S. schools',         desc: 'Your children receive dependent status and can attend U.S. public and private schools as legal residents.' },
      { key: 'freedom',  show: true,        priority: !hasSpouse && !hasChildren, title: 'No employer. No sponsorship. No queue.',    desc: 'You move to the U.S. on your own terms — by building something. No waiting for an employer to file on your behalf.' },
      { key: 'renewable',show: true,        priority: false,                    title: 'Renewable with no expiry date',              desc: 'The E-2 renews indefinitely as long as your business operates. There is no fixed end to your time in the U.S.' },
      { key: 'nocap',    show: true,        priority: false,                    title: 'No cap, no lottery, no waiting list',        desc: 'Unlike the H-1B, there is no annual quota. If you qualify, you apply. Your eligibility is not subject to chance.' },
      { key: 'country',  show: true,        priority: false,                    title: `${d.country || 'Your country'} has an active E-2 treaty`, desc: `Citizens of ${d.country || 'your country'} have full access to the E-2 programme. Your treaty standing is confirmed.` },
    ];
    return all.filter(b => b.show).sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0)).slice(0, 4);
  }

  const showNameCapture = verificationState === 'verified' && !isLoggedIn && !nameCaptureDismissed;

  // Archetype for section 6 — use case profile if available, fall back to quiz-derived
  const archetype = caseProfile?.archetype ?? (data.franchise_interest ? 'buyer' : 'career_switcher');
  const archetypeSteps = ARCHETYPE_STEPS[archetype] ?? ARCHETYPE_STEPS.career_switcher;

  // Section 3 investment fit
  const investCriteria = criteriaBreakdown[1];
  const investColor = investCriteria.score >= 85 ? '#22c55e' : investCriteria.score >= 60 ? '#f59e0b' : '#ef4444';

  // Section 4 business fit
  const bizCriteria = criteriaBreakdown[3];
  const bizColor = bizCriteria.score >= 85 ? '#22c55e' : bizCriteria.score >= 60 ? '#f59e0b' : '#ef4444';

  // Section 8 franchise trigger
  const showFranchiseTeaser = caseProfile?.franchiseTrigger ?? data.franchise_interest;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <style>{`
        @media (max-width: 640px) {
          .benefits-grid { grid-template-columns: 1fr !important; }
          .assessment-row { grid-template-columns: 1fr !important; }
          .profile-snap { grid-template-columns: 1fr 1fr !important; }
          .results-sidebar { display: none !important; }
        }
      `}</style>

      {/* Nav */}
      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
      </div>

      {/* ── Section 1: Outcome header ─────────────────────────────────────────── */}
      <div style={{ padding: "56px 40px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ maxWidth: "720px" }}>
          <button onClick={() => router.push('/quiz/review')} style={{ fontSize: '13px', color: 'rgba(245,240,232,0.45)', background: 'transparent', border: 'none', cursor: 'pointer', letterSpacing: '0.04em', padding: '0', marginBottom: '32px', fontFamily: "'DM Sans', sans-serif", display: 'block' }}>
            ← Review or change my answers
          </button>

          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: "0 0 24px", height: "1px", background: "rgba(201,168,76,0.4)" }} />
            Assessment complete
          </div>

          {isLoggedIn && userName && (
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>{userName}, here are your results</div>
          )}
          {!isLoggedIn && (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>Your eligibility results</div>
              {verificationState === 'verified' && <div style={{ fontSize: "13px", color: "#5DCAA5", letterSpacing: "0.02em" }}>✓ Email verified</div>}
            </div>
          )}

          {/* Score circle + label */}
          <div style={{ display: "flex", alignItems: "center", gap: "28px", marginBottom: "24px" }}>
            <div style={{ width: "100px", height: "100px", border: `3px solid ${scoreColor}`, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: scoreColor, lineHeight: 1 }}>{score}</div>
              <div style={{ fontSize: "10px", color: "rgba(245,240,232,0.3)", letterSpacing: "0.06em" }}>/100</div>
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: scoreColor, lineHeight: 1.1, marginBottom: "4px" }}>{outcomeLabel}</div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{scoreLabel}</div>
            </div>
          </div>

          {/* Profile completeness bar — only shown when case profile exists */}
          {caseProfile && (() => {
            const tier = getConfidenceTier(caseProfile.dataState);
            return (
              <div style={{ marginBottom: '24px', maxWidth: '440px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Profile completeness
                  </span>
                  <span style={{ fontSize: '11px', color: tier.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {tier.label} · {caseProfile.completenessScore}%
                  </span>
                </div>
                <div style={{ height: '3px', background: 'rgba(245,240,232,0.08)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${caseProfile.completenessScore}%`, background: tier.color, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })()}

          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.25, marginBottom: "10px", letterSpacing: "-0.01em" }}>{verdict}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, maxWidth: "560px" }}>{verdictSub}</div>

          {isLoggedIn && (
            <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", fontSize: "13px", color: "rgba(245,240,232,0.6)", lineHeight: 1.6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <span>✓ Your profile has been saved. You can return to these results any time.</span>
              <Link href="/dashboard" style={{ fontSize: "12px", color: "#C9A84C", textDecoration: "underline", whiteSpace: "nowrap", fontFamily: "'DM Sans', sans-serif" }}>Go to dashboard →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Name capture for verified non-auth users */}
      {showNameCapture && quizSessionId && quizEmail && (
        <div style={{ padding: "40px 40px 0", maxWidth: "720px" }}>
          <NameCaptureForm email={quizEmail} quizSessionId={quizSessionId} onSuccess={() => window.location.reload()} onDismiss={() => setNameCaptureDismissed(true)} />
        </div>
      )}
      {verificationState === 'verified' && !isLoggedIn && nameCaptureDismissed && (
        <div style={{ padding: "20px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "720px" }}>
            <Link href="/signup" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "underline", letterSpacing: "0.02em" }}>Create an account to save your results and access your dashboard</Link>
          </div>
        </div>
      )}

      {/* ── Sections 2–9: single-column, max 760px ──────────────────────────── */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 40px" }}>

        {/* Section 2: Treaty nationality */}
        <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ fontSize: "32px", lineHeight: 1 }}>{getCountryFlag(data.country)}</div>
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "4px" }}>Treaty nationality</div>
            <div style={{ fontSize: "16px", color: "#f5f0e8", fontWeight: 400 }}>
              {data.country || "—"}
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "#5DCAA5" }}>✓ E-2 treaty country confirmed</span>
            </div>
          </div>
        </div>

        {/* Sections 3 & 4: Investment + Business (side by side) */}
        <div className="assessment-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>

          {/* Section 3: Investment assessment */}
          <div style={{ padding: "16px", border: `1px solid ${investColor}33`, background: `${investColor}08` }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Investment assessment</div>
            <div style={{ fontSize: "15px", color: "#f5f0e8", fontWeight: 400, marginBottom: "4px" }}>{data.investment_range || "—"}</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", marginBottom: "8px" }}>E-2 practical minimum: $100,000+</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: investColor }} />
              <span style={{ fontSize: "11px", color: investColor }}>{investCriteria.note}</span>
            </div>
          </div>

          {/* Section 4: Business assessment */}
          <div style={{ padding: "16px", border: `1px solid ${bizColor}33`, background: `${bizColor}08` }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Business assessment</div>
            <div style={{ fontSize: "15px", color: "#f5f0e8", fontWeight: 400, marginBottom: "4px" }}>
              {data.application_type === "partnership" ? "Partnership investment" : "Solo investor"}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", marginBottom: "8px" }}>Active management role required</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: bizColor }} />
              <span style={{ fontSize: "11px", color: bizColor }}>{bizCriteria.note}</span>
            </div>
          </div>
        </div>

        {/* Section 5: Case gaps — top 3 */}
        {flagsToShow.length > 0 && (
          <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Case gaps to address</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {flagsToShow.slice(0, 3).map(({ code, info, isAttorney }) => (
                <div key={code} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: `1px solid ${isAttorney ? "rgba(239,100,100,0.25)" : "rgba(239,159,39,0.25)"}`, background: isAttorney ? "rgba(239,100,100,0.04)" : "rgba(239,159,39,0.04)" }}>
                  <div style={{ fontSize: "16px", color: isAttorney ? "rgba(239,100,100,0.8)" : "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>{isAttorney ? "⚖" : "!"}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: isAttorney ? "rgba(239,100,100,0.95)" : "rgba(239,159,39,0.95)", marginBottom: "3px" }}>{info.plain_language}</div>
                    <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "6px" }}>{personalizedExplanations[code] || info.why_it_matters}</div>
                    <a href={`/quiz?edit=${info.question_id}`} style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "underline" }}>{info.edit_label} →</a>
                  </div>
                </div>
              ))}
              {flagsToShow.length === 0 && clearItems.slice(0, 2).map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(93,202,165,0.2)", background: "rgba(93,202,165,0.03)" }}>
                  <div style={{ fontSize: "16px", color: "#5DCAA5", flexShrink: 0 }}>✓</div>
                  <div><div style={{ fontSize: "13px", fontWeight: 500, color: "#5DCAA5" }}>{item}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 6: Next steps by archetype */}
        <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "4px" }}>Your next steps</div>
          {caseProfile && (
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", marginBottom: "14px", letterSpacing: "0.04em" }}>
              Tailored to your profile: {archetype === 'buyer' ? 'Franchise Buyer' : archetype === 'builder' ? 'Business Builder' : archetype === 'investor' ? 'Treaty Investor' : 'Career Switcher'}
            </div>
          )}
          {!caseProfile && <div style={{ marginBottom: "14px" }} />}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {archetypeSteps.map((step, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "24px", height: "24px", border: "1px solid rgba(201,168,76,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0, fontWeight: 500 }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "2px" }}>{step.title}</div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7: Profile snapshot — only if post-quiz profile data exists */}
        {caseProfile && (caseProfile.netWorthRange || caseProfile.priorBusiness || caseProfile.industryInterest || caseProfile.timelineGoal) && (
          <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your profile snapshot</div>
            <div className="profile-snap" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Net worth", value: NET_WORTH_LABELS[caseProfile.netWorthRange] || caseProfile.netWorthRange || "—" },
                { label: "Business background", value: PRIOR_BUSINESS_LABELS[caseProfile.priorBusiness] || caseProfile.priorBusiness || "—" },
                { label: "Industry interest", value: INDUSTRY_LABELS[caseProfile.industryInterest] || caseProfile.industryInterest || "—" },
                { label: "Target timeline", value: TIMELINE_LABELS[caseProfile.timelineGoal] || caseProfile.timelineGoal || "—" },
              ].map((tile) => (
                <div key={tile.label} style={{ padding: "14px 16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: "5px" }}>{tile.label}</div>
                  <div style={{ fontSize: "14px", color: "#f5f0e8", lineHeight: 1.4 }}>{tile.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 8: Franchise match teaser — conditional */}
        {showFranchiseTeaser && (
          <div style={{ padding: "28px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ padding: "20px 24px", border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.04)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Franchise opportunity</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
                Your profile matches franchise investment opportunities
              </div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "16px" }}>
                Based on your industry interest and investment profile, we have identified E-2-proven franchise brands in your range. Introductions are made only with your consent.
              </div>
              <Link href="/franchise" style={{ display: "inline-block", padding: "11px 24px", background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                View matches →
              </Link>
            </div>
          </div>
        )}

        {/* Section 9: CTA bar */}
        <div style={{ padding: "28px 0 40px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <Link href={isLoggedIn ? "/applications" : "/apply"} style={{ flex: "1 1 200px", display: "block", padding: "15px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", textAlign: "center" }}>
            Start your case file →
          </Link>
          <a href="mailto:hello@e2go.app" style={{ flex: "1 1 200px", display: "block", padding: "15px 24px", background: "transparent", border: "1px solid rgba(201,168,76,0.3)", color: "rgba(201,168,76,0.8)", fontSize: "13px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", textAlign: "center" }}>
            Talk to an attorney
          </a>
        </div>
      </div>

      {/* ── Supplementary: detailed breakdown + sidebar ──────────────────────── */}
      <div style={{ borderTop: "1px solid rgba(201,168,76,0.08)", padding: "40px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", maxWidth: "1100px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          {/* 5-criteria breakdown */}
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "20px" }}>E-2 criteria breakdown</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {criteriaBreakdown.map(({ label, score: cScore, note }) => {
                const color = cScore >= 85 ? "#22c55e" : cScore >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={label}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                      <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.7)", letterSpacing: "0.02em" }}>{label}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)" }}>{note}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color, minWidth: "36px", textAlign: "right" as const }}>{cScore}</span>
                      </div>
                    </div>
                    <div style={{ height: "3px", background: "rgba(245,240,232,0.07)" }}>
                      <div style={{ height: "100%", background: color, width: `${cScore}%`, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All flags (full list) */}
          {(flagsToShow.length > 3 || clearItems.length > 0) && (
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Full assessment details</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {flagsToShow.slice(3).map(({ code, info, isAttorney }) => (
                  <div key={code} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: `1px solid ${isAttorney ? "rgba(239,100,100,0.25)" : "rgba(239,159,39,0.25)"}`, background: isAttorney ? "rgba(239,100,100,0.04)" : "rgba(239,159,39,0.04)" }}>
                    <div style={{ fontSize: "16px", color: isAttorney ? "rgba(239,100,100,0.8)" : "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>{isAttorney ? "⚖" : "!"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: isAttorney ? "rgba(239,100,100,0.95)" : "rgba(239,159,39,0.95)", marginBottom: "3px" }}>{info.plain_language}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "8px" }}>{personalizedExplanations[code] || info.why_it_matters}</div>
                      {data.answers?.[info.question_id] && (
                        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.3)", marginBottom: "8px" }}>Your answer: &ldquo;{Array.isArray(data.answers[info.question_id]) ? (data.answers[info.question_id] as string[]).join(", ") : String(data.answers[info.question_id])}&rdquo;</div>
                      )}
                      <a href={`/quiz?edit=${info.question_id}`} style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "underline" }}>{info.edit_label} →</a>
                    </div>
                  </div>
                ))}
                {clearItems.slice(0, 2).map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: "1px solid rgba(93,202,165,0.2)", background: "rgba(93,202,165,0.03)" }}>
                    <div style={{ fontSize: "16px", color: "#5DCAA5", flexShrink: 0, marginTop: "1px" }}>✓</div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "#5DCAA5", marginBottom: "3px" }}>{item}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>No issues detected in this area of your profile.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* E-2 Benefits */}
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>What this visa gives you</div>
            <div className="benefits-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {getBenefits(data).map((benefit) => (
                <div key={benefit.key} style={{ padding: "14px 16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
                  <div style={{ color: "#C9A84C", fontSize: "16px", marginBottom: "8px" }}>◈</div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "4px", lineHeight: 1.4 }}>{benefit.title}</div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>{benefit.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Estimated path to your interview</div>
            <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", marginBottom: timelineWeeks.adjustments.length > 0 ? "10px" : 0 }}>Your estimated interview window, based on your profile and current processing times. Calculated from today, {formatToday()}.</div>
              {timelineWeeks.adjustments.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(201,168,76,0.08)", paddingTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {timelineWeeks.adjustments.map((adj, i) => (
                    <div key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", display: "flex", gap: "6px", alignItems: "flex-start" }}>
                      <span style={{ color: "rgba(201,168,76,0.4)", flexShrink: 0 }}>◈</span>
                      <span>{adj}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {targetDateMsg && (
              <div style={{ padding: "12px 16px", border: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)", marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#C9A84C", lineHeight: 1.6 }}>{targetDateMsg}</div>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              {["Eligibility confirmed", "Business selection", "Application package", "DS-160 & booking", "Interview"].map((step, i) => (
                <div key={step} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: i === 0 ? "rgba(93,202,165,0.6)" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.2)", border: `1px solid ${i === 0 ? "#5DCAA5" : i === 1 ? "#C9A84C" : "rgba(201,168,76,0.3)"}`, flexShrink: 0 }} />
                    {i < 4 && <div style={{ flex: 1, height: "1px", background: "rgba(201,168,76,0.15)" }} />}
                  </div>
                  <div style={{ fontSize: "10px", color: i === 0 ? "rgba(93,202,165,0.7)" : i === 1 ? "#C9A84C" : "rgba(245,240,232,0.35)", textAlign: "center", letterSpacing: "0.04em", lineHeight: 1.4, maxWidth: "60px" }}>{step}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Officer discretion note */}
          <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Important: Officer discretion</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.65 }}>Consular officers have discretion under 9 FAM to request additional documentation beyond what is listed in standard checklists. The most common additional requests are:</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.65, marginTop: "8px", paddingLeft: "12px" }}>
              — Bank statements extending beyond 12 months<br />
              — Tax returns for years not initially requested<br />
              — Third-party business valuations<br />
              — Additional evidence of operational status<br />
              — Further source-of-funds documentation
            </div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.65, marginTop: "8px" }}>
              The best defense against a 221(g) request is preparation depth — having documents ready that weren&apos;t specifically asked for. Your case file will note where additional preparation is recommended based on your profile.
            </div>
          </div>

        </div>

        {/* Sidebar */}
        <div className="results-sidebar" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Pricing card */}
          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.04)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Your recommended package</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "18px", color: "#f5f0e8", marginBottom: "14px" }}>{pricing.tier}</div>
            {[
              { label: pricing.tier.includes("Partnership") ? "Partnership base" : "Solo applicant", price: `$${pricing.base}` },
              pricing.spouseAdd > 0 && { label: "Add spouse", price: `+$${pricing.spouseAdd}` },
              pricing.childrenAdd > 0 && { label: "Add children", price: `+$${pricing.childrenAdd}` },
            ].filter(Boolean).map((row: { label: string; price: string } | false, i) => row && (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
                <div style={{ fontSize: "13px", color: "#f5f0e8" }}>{row.label}</div>
                <div style={{ fontSize: "14px", color: "#C9A84C", fontWeight: 500 }}>{row.price}</div>
              </div>
            ))}
            <div style={{ height: "1px", background: "rgba(201,168,76,0.12)", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Total</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", color: "#C9A84C", fontWeight: 300 }}>${pricing.total}</div>
            </div>
            <Link href={`/pricing?tier=${data.application_type}`}>
              <button style={{ width: "100%", padding: "12px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "12px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}>Start for ${pricing.total} →</button>
            </Link>
          </div>

          {/* Consulate intel */}
          <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Consulate intelligence</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "10px" }}>
              <div style={{ fontSize: "18px", color: "rgba(201,168,76,0.6)", flexShrink: 0, marginTop: "1px" }}>⊞</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>
                <strong style={{ color: "rgba(245,240,232,0.8)", fontWeight: 500 }}>{consulate.name}</strong> — {consulate.intel}
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.2)", marginTop: "6px" }}>Updated June 2026 · Applicant-reported data</div>
          </div>

        </div>
      </div>

      {/* Ask E2go FAQ */}
      <div style={{ padding: "48px 40px", borderTop: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ maxWidth: "720px" }}>
          <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Ask E2go</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>Questions about your results?</div>
          <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.4)", marginBottom: "24px" }}>Ask anything about the E-2 visa — eligibility, investment thresholds, the application process, or what your flags mean.</div>
          <FaqWidget />
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ padding: "20px 40px", borderTop: "1px solid rgba(201,168,76,0.06)" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.18)", lineHeight: 1.6, maxWidth: "720px" }}>
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
