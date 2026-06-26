"use client";
import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { createAccountFromVerifiedEmail } from "../actions/create-account";
import flagExplanations from "../../data/flag_explanations.json";
import FlagCard, { FLAG_REMEDIATION } from "@/components/results/FlagCard";
import DocumentPackagePreview from "@/components/results/DocumentPackagePreview";
import DocumentTabPreview from "@/components/results/DocumentTabPreview";
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

/* ─── Score + Recovery Helpers ───────────────────────────────────────────── */

interface ScoreDimension {
  label: string;
  earned: number;
  max: number;
  note: string;
}

// Uses real quiz warning codes from module0_questions.json score_weights.
// Dimension maxes sum to 100; deductions match the actual quiz score_weights values,
// so the breakdown total tracks the quiz score.
function getScoreDimensions(warnings: string[]): ScoreDimension[] {
  // Investment Substantiality — Q0-07
  const hasLowInv    = warnings.includes("W-LOW-INVESTMENT");           // −6 pts
  const hasBorderInv = warnings.includes("W-BORDERLINE-INVESTMENT");    // −10 pts
  const invDeduct    = hasLowInv ? 6 : hasBorderInv ? 10 : 0;

  // Source of Funds — Q0-06, Q0-06a
  const srcMap: Record<string, number> = {
    "W-FAMILY-GIFT": 4, "W-RRSP": 3, "W-RRSP-PARTIAL": 4,
    "W-RRSP-PENDING": 5, "W-LOAN-PERSONAL": 3,
  };
  const srcDeduct = Object.entries(srcMap).reduce((s, [c, v]) => s + (warnings.includes(c) ? v : 0), 0);

  // Non-Marginality — Q0-08a, Q0-08d
  const hasMarg    = warnings.includes("W-MARGINALITY");                // −6 pts
  const hasMargAcq = warnings.includes("W-MARGINALITY-ACQUISITION");    // −6 pts
  const margDeduct = (hasMarg ? 6 : 0) + (hasMargAcq ? 6 : 0);

  // Non-Immigrant Intent — Q0-10
  const hasNoTies = warnings.includes("W-NO-TIES");                     // −8 pts
  const niDeduct  = hasNoTies ? 8 : 0;

  // Immigration History — Q0-09a/b/c/d, Q0-05
  const histMap: Record<string, number> = {
    "W-STATUS-UNKNOWN": 6, "W-REFUSAL-OLD": 5, "W-REFUSAL-RECENT": 10,
    "W-REFUSAL-MULTIPLE": 12, "W-E2-PRIOR-DENIAL": 15, "W-ENTRY-REFUSED": 12,
    "W-DEPORTED": 15, "W-CONVICTION-OLD": 5, "W-CONVICTION-RECENT": 12,
    "W-CONVICTION-UNSURE": 8,
  };
  const histDeduct = Object.entries(histMap).reduce((s, [c, v]) => s + (warnings.includes(c) ? v : 0), 0);

  return [
    {
      label: "Investment Substantiality", max: 30,
      earned: Math.max(0, 30 - invDeduct),
      note: invDeduct > 0
        ? (hasLowInv ? "Below preferred range — documentation can strengthen" : "At lower threshold — borderline substantiality")
        : "Meets substantiality threshold",
    },
    {
      label: "Source of Funds", max: 25,
      earned: Math.max(0, 25 - srcDeduct),
      note: srcDeduct > 0 ? "Some fund sources require additional documentation" : "Clean, documentable funding path",
    },
    {
      label: "Non-Marginality", max: 20,
      earned: Math.max(0, 20 - margDeduct),
      note: margDeduct > 0 ? "Employment creation plan needs strengthening" : "Business model supports job creation",
    },
    {
      label: "Non-Immigrant Intent", max: 15,
      earned: Math.max(0, 15 - niDeduct),
      note: niDeduct > 0 ? "Home country ties documentation required" : "Non-immigrant intent established",
    },
    {
      label: "Immigration History", max: 10,
      earned: Math.max(0, 10 - Math.min(histDeduct, 10)),
      note: histDeduct > 0 ? "Prior immigration issues must be addressed in application" : "Clean immigration record",
    },
  ];
}

interface RecoveryCard {
  title: string;
  action: string;
  points: string;
}

// Maps real quiz warning codes to concrete recovery actions.
// No generic fallbacks — only actionable steps tied to actual quiz deductions.
function getRecoveryCards(warnings: string[]): RecoveryCard[] {
  const MAP: Record<string, RecoveryCard> = {
    "W-LOW-INVESTMENT":           { title: "Document total committed investment", action: "Your investment is in the lower range. Signed commitment letters, a business valuation, or confirmed escrow can strengthen the substantiality case.", points: "+4–6 pts" },
    "W-BORDERLINE-INVESTMENT":    { title: "Raise or fully document investment level", action: "Investment sits at the threshold boundary. A formal appraisal, full escrow confirmation, or additional committed capital removes the risk.", points: "+8–10 pts" },
    "W-FAMILY-GIFT":              { title: "Build your gift funds paper trail", action: "Provide a notarized gift letter, evidence of the donor's financial capacity, and a clear bank transfer trail from donor account to yours.", points: "+3–4 pts" },
    "W-RRSP":                     { title: "Document the RRSP withdrawal", action: "Provide a statement showing the full withdrawal, post-tax amount, and confirmation the funds are now in a liquid account ready to invest.", points: "+2–3 pts" },
    "W-RRSP-PENDING":             { title: "Complete and document the RRSP withdrawal", action: "Officers need funds already withdrawn and available. A pending withdrawal without completion evidence is a submission risk.", points: "+4–5 pts" },
    "W-RRSP-PARTIAL":             { title: "Document the partial RRSP withdrawal", action: "Provide the RRSP statement showing the partial withdrawal, available post-tax balance, and the destination account receiving the funds.", points: "+3–4 pts" },
    "W-LOAN-PERSONAL":            { title: "Document personal loan terms", action: "A signed loan agreement, evidence of disbursement to your account, and confirmation the full amount is available for the investment.", points: "+2–3 pts" },
    "W-MARGINALITY":              { title: "Restructure around direct employment", action: "Consulting and professional service firms face higher scrutiny. Add a direct employment plan, revenue projections, and evidence of a non-passive operating model.", points: "+4–6 pts" },
    "W-MARGINALITY-ACQUISITION":  { title: "Build a 3-year employment creation plan", action: "A detailed hiring plan with role descriptions, salary ranges, and financial projections supporting the growth directly addresses non-marginality.", points: "+4–6 pts" },
    "W-NO-TIES":                  { title: "Document your home-country ties", action: "Provide evidence of intent to return: property ownership, family obligations, professional licenses, active bank accounts, and tax residency at home.", points: "+6–8 pts" },
    "W-REFUSAL-OLD":              { title: "Disclose and address the prior refusal", action: "Disclose in the cover letter, explain what has changed since, and provide evidence showing why this application is materially stronger.", points: "+4–5 pts" },
    "W-REFUSAL-RECENT":           { title: "Build a direct rebuttal to the refusal", action: "A recent refusal must be addressed head-on: state the specific grounds, document exactly what changed, and provide new evidence addressing the officer concern.", points: "+8–10 pts" },
    "W-REFUSAL-MULTIPLE":         { title: "Engage an attorney for your refusal history", action: "Multiple refusals require a legal strategy with case law citations. An attorney can build a rebuttal brief and coordinate with the consulate.", points: "attorney recommended" },
    "W-E2-PRIOR-DENIAL":          { title: "Rebut the prior E-2 denial directly", action: "Name the specific denial grounds, demonstrate what has materially changed, and provide new evidence not available in the prior application.", points: "+8–10 pts" },
    "W-STATUS-UNKNOWN":           { title: "Clarify current immigration status", action: "Your current US immigration status must be confirmed and documented before filing. Consult an attorney to establish status and confirm you may proceed.", points: "attorney recommended" },
    "W-CONVICTION-OLD":           { title: "Disclose and document the conviction", action: "Older convictions require disclosure: the court record, confirmation of no subsequent incidents, and a brief written explanation.", points: "+3–5 pts" },
  };
  const cards: RecoveryCard[] = [];
  for (const code of warnings) {
    if (MAP[code]) cards.push(MAP[code]);
    if (cards.length === 3) break;
  }
  return cards.slice(0, 3);
}

function getCaseStrengths(data: ResultData, warnings: string[]): string[] {
  const bizType = String(data.answers?.["Q0-08a"] || "");
  const strengths: string[] = [];
  if (!warnings.includes("W-LOW-INVESTMENT") && !warnings.includes("W-BORDERLINE-INVESTMENT"))
    strengths.push("Investment meets substantiality threshold");
  const srcCodes = ["W-FAMILY-GIFT", "W-RRSP", "W-RRSP-PARTIAL", "W-RRSP-PENDING", "W-LOAN-PERSONAL"];
  if (!srcCodes.some(c => warnings.includes(c)))
    strengths.push("Funding path is documentable");
  if (!warnings.includes("W-MARGINALITY") && !warnings.includes("W-MARGINALITY-ACQUISITION"))
    strengths.push("Business model supports employment");
  if (!warnings.includes("W-NO-TIES"))
    strengths.push("Non-immigrant intent established");
  const histCodes = ["W-REFUSAL-OLD", "W-REFUSAL-RECENT", "W-REFUSAL-MULTIPLE", "W-E2-PRIOR-DENIAL", "W-ENTRY-REFUSED", "W-DEPORTED", "W-CONVICTION-OLD", "W-CONVICTION-RECENT"];
  if (!histCodes.some(c => warnings.includes(c)))
    strengths.push("Clean immigration record");
  if (/franchise/i.test(bizType)) strengths.push("Established franchise brand");
  if (strengths.length < 2) strengths.push("No critical disqualifying factors identified");
  return strengths.slice(0, 4);
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
        const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle();
        if (profile?.first_name) {
          setUserName(profile.first_name);
        } else if ((user.user_metadata as Record<string, string>)?.first_name) {
          setUserName((user.user_metadata as Record<string, string>).first_name);
        } else if (user.email) {
          const part = user.email.split("@")[0];
          setUserName(part.charAt(0).toUpperCase() + part.slice(1));
        }
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

  const allWarnings = [...(data.warnings || []), ...(data.attorney_flags || [])];
  const scoreDimensions = getScoreDimensions(allWarnings);
  const recoveryCards = getRecoveryCards(allWarnings);
  const caseStrengths = getCaseStrengths(data, allWarnings);
  const missedPoints = 100 - score;
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - score / 100);

  const FLAG_MODULE: Record<string, string> = {
    "W-NO-TIES":                  "Ties Section — Non-Immigrant Intent",
    "W-REFUSAL-RECENT":           "Cover Letter — Prior Refusal Narrative",
    "W-REFUSAL-MULTIPLE":         "Cover Letter — Prior Refusal Narrative",
    "W-E2-PRIOR-DENIAL":          "Cover Letter — Prior E-2 Denial Rebuttal",
    "W-REFUSAL-OLD":              "Cover Letter — Prior Refusal Disclosure",
    "W-LOW-INVESTMENT":           "Investment Section — Substantiality",
    "W-BORDERLINE-INVESTMENT":    "Investment Section — Substantiality",
    "W-FAMILY-GIFT":              "Investment Section — Source of Funds",
    "W-RRSP":                     "Investment Section — Source of Funds",
    "W-RRSP-PARTIAL":             "Investment Section — Source of Funds",
    "W-RRSP-PENDING":             "Investment Section — Source of Funds",
    "W-LOAN-PERSONAL":            "Investment Section — Source of Funds",
    "W-MARGINALITY":              "Business Plan — Non-Marginality Section",
    "W-MARGINALITY-ACQUISITION":  "Business Plan — Employment Creation Plan",
    "W-STATUS-UNKNOWN":           "Cover Letter — Immigration Status",
    "W-CONVICTION-OLD":           "Cover Letter — Immigration History",
    "W-ENTRY-REFUSED":            "Cover Letter — Immigration History",
    "W-DEPORTED":                 "Cover Letter — Immigration History",
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
        @media (max-width: 768px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .includes-grid { grid-template-columns: 1fr !important; }
          .step-cards-grid { grid-template-columns: 1fr !important; }
          .results-inner { padding: 0 20px !important; }
          .hero-section { padding: 32px 20px 32px !important; }
          .score-row-note { display: none !important; }
          .score-row-label { width: 130px !important; font-size: 11px !important; }
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

      {/* ─── HERO ─────────────────────────────────────────────────────────────── */}
      <div className="hero-section" style={{ maxWidth: "980px", margin: "0 auto", padding: "48px 40px 48px" }}>
        <button onClick={() => router.push("/quiz/review")} style={{ fontSize: "13px", color: "rgba(245,240,232,0.55)", background: "transparent", border: "none", cursor: "pointer", padding: "0", marginBottom: "32px", fontFamily: "'DM Sans', sans-serif", display: "block" }}>
          ← Review or change my answers
        </button>
        {isLoggedIn && userName && (
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 300, color: "rgba(245,240,232,0.65)", lineHeight: 1.1, marginBottom: "4px" }}>
            Welcome, {userName}.
          </div>
        )}
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "48px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.1, marginBottom: "36px" }}>
          {identityLabel}
        </div>

        {/* 2-col hero grid */}
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Left: Assessment card */}
          <div style={{ border: "1px solid rgba(201,168,76,0.25)", padding: "28px", background: "rgba(201,168,76,0.015)" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.65)", marginBottom: "24px" }}>Your Assessment</div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "28px" }}>
              <svg width="88" height="88" viewBox="0 0 100 100" style={{ flexShrink: 0 }}>
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth="7" />
                <circle cx="50" cy="50" r="40" fill="none" stroke={scoreColor} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="50" textAnchor="middle" dominantBaseline="central"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fill: scoreColor, fontWeight: 300 }}>
                  {score}
                </text>
                <text x="50" y="68" textAnchor="middle"
                  style={{ fontSize: "9px", fill: "rgba(245,240,232,0.4)", letterSpacing: "0.03em" }}>
                  /100
                </text>
              </svg>
              <div>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.6)", lineHeight: 1.6, marginBottom: "8px" }}>{personalTranslation}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: band.color, flexShrink: 0 }} />
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.68)", lineHeight: 1.4 }}>{band.label.split(" — ")[0]}</div>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: "20px" }}>
              <div>
                <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#5DCAA5", marginBottom: "10px" }}>Strengths</div>
                {caseStrengths.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", fontSize: "11px", color: "rgba(245,240,232,0.78)", lineHeight: 1.4, marginBottom: "6px" }}>
                    <span style={{ color: "#5DCAA5", flexShrink: 0 }}>✓</span>{s}
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(245,158,11,0.85)", marginBottom: "10px" }}>Gaps</div>
                {flagsToShow.length > 0 ? flagsToShow.slice(0, 3).map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", fontSize: "11px", color: "rgba(245,240,232,0.72)", lineHeight: 1.4, marginBottom: "6px" }}>
                    <span style={{ color: "rgba(245,158,11,0.85)", flexShrink: 0 }}>△</span>
                    <span>{f.info?.plain_language ? (f.info.plain_language.length > 36 ? f.info.plain_language.slice(0, 36) + "…" : f.info.plain_language) : f.code}</span>
                  </div>
                )) : (
                  <div style={{ fontSize: "11px", color: "rgba(93,202,165,0.8)", lineHeight: 1.5 }}>No significant gaps identified</div>
                )}
              </div>
            </div>
            {verificationState === "verified" && !isLoggedIn && (
              <div style={{ fontSize: "11px", color: "#5DCAA5", marginTop: "16px" }}>✓ Email verified</div>
            )}
          </div>

          {/* Right: Pricing card */}
          <div style={{ border: "1px solid rgba(201,168,76,0.45)", padding: "28px", background: "rgba(201,168,76,0.025)", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.65)", marginBottom: "8px" }}>Complete Package</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "#C9A84C", lineHeight: 1, marginBottom: "2px" }}>$1,495</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)", marginBottom: "4px" }}>one-time · no subscription</div>
            <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.52)", marginBottom: "20px" }}>E-2 attorneys charge $8,000–$15,000 for the same documents.</div>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(245,240,232,0.38)", marginBottom: "8px" }}>What you already have</div>
              {[
                "Eligibility assessment — complete",
                flagsToShow.length > 0 ? `${flagsToShow.length} risk flags identified` : "Clean profile — no critical flags",
                `${consulate.name} intelligence`,
                "E-2 knowledge base",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "7px", alignItems: "flex-start", fontSize: "11px", color: "rgba(245,240,232,0.72)", marginBottom: "5px", lineHeight: 1.4 }}>
                  <span style={{ color: "#5DCAA5", flexShrink: 0 }}>✓</span><span>{item}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "8px" }}>What unlocks after payment</div>
              {[
                "15 consulate-formatted documents",
                "Business plan + source of funds narrative",
                "Gap Analysis — 6 evidence categories",
                "AI Interview Simulator",
                "10 document revision credits",
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", gap: "7px", alignItems: "flex-start", fontSize: "11px", color: "rgba(245,240,232,0.82)", marginBottom: "5px", lineHeight: 1.4 }}>
                  <span style={{ color: "#C9A84C", flexShrink: 0 }}>→</span><span>{item}</span>
                </div>
              ))}
            </div>
            <Link href={ctaHref} style={{ display: "block", padding: "15px 24px", background: "#C9A84C", color: "#0a0a0a", fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", textAlign: "center" as const, marginTop: "auto" }}>
              {ctaLabel}
            </Link>
            <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "10px" }}>
              <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)" }}>✓ No subscription</span>
              <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)" }}>✓ Documents yours forever</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── INTERVIEW BANNER ──────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(201,168,76,0.05)", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "16px 40px" }}>
        <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C9A84C", flexShrink: 0 }} />
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#C9A84C" }}>
            Estimated interview window: {timeline}
          </span>
          <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.6)" }}>
            · {consulate.name} is currently processing E-2 applications in {timelineWeeks.weeksMin}–{timelineWeeks.weeksMax} weeks from submission.
          </span>
          {targetDateMsg && <span style={{ fontSize: "11px", color: "rgba(201,168,76,0.7)" }}>{targetDateMsg}</span>}
        </div>
      </div>

      <div className="results-inner" style={{ maxWidth: "980px", margin: "0 auto", padding: "0 40px" }}>

        {/* ─── SCORE BREAKDOWN ──────────────────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>By the numbers</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "36px" }}>Detailed score breakdown</div>
          {scoreDimensions.map((dim, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "20px", padding: "14px 0", borderBottom: "1px solid rgba(201,168,76,0.06)" }}>
              <div className="score-row-label" style={{ width: "190px", flexShrink: 0, fontSize: "12px", color: "#f5f0e8", lineHeight: 1.3 }}>{dim.label}</div>
              <div style={{ flex: 1, position: "relative" as const, height: "4px", background: "rgba(201,168,76,0.1)", borderRadius: "2px" }}>
                <div style={{ position: "absolute" as const, top: 0, left: 0, height: "100%", borderRadius: "2px", width: `${(dim.earned / dim.max) * 100}%`, background: dim.earned / dim.max >= 0.8 ? "#5DCAA5" : dim.earned / dim.max >= 0.6 ? "#C9A84C" : "#f59e0b" }} />
              </div>
              <div style={{ width: "44px", textAlign: "right" as const, fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "15px", fontWeight: 300, color: dim.earned / dim.max >= 0.8 ? "#5DCAA5" : dim.earned / dim.max >= 0.6 ? "#C9A84C" : "#f59e0b", flexShrink: 0 }}>{dim.earned}/{dim.max}</div>
              <div className="score-row-note" style={{ width: "210px", fontSize: "11px", color: "rgba(245,240,232,0.5)", lineHeight: 1.4 }}>{dim.note}</div>
            </div>
          ))}
        </div>

        {/* ─── RECOVER X POINTS ─────────────────────────────────────────────────── */}
        {missedPoints > 0 && recoveryCards.length > 0 && (
          <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>
              Recover the missing {missedPoints} points
            </div>
            <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.58)", lineHeight: 1.5, marginBottom: "32px" }}>
              These changes would materially strengthen your case before submission.
            </div>
            <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {recoveryCards.map((card, i) => (
                <div key={i} style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "28px 24px", background: "rgba(201,168,76,0.012)", position: "relative" as const }}>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "40px", fontWeight: 300, color: "rgba(201,168,76,0.18)", position: "absolute" as const, top: "14px", right: "18px", lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</div>
                  <div style={{ display: "inline-block", padding: "2px 9px", background: "rgba(93,202,165,0.1)", border: "1px solid rgba(93,202,165,0.28)", fontSize: "10px", color: "#5DCAA5", marginBottom: "14px", letterSpacing: "0.04em" }}>{card.points}</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px", lineHeight: 1.35, paddingRight: "28px" }}>{card.title}</div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6 }}>{card.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Name capture */}
        {showNameCapture && quizSessionId && quizEmail && (
          <div style={{ paddingTop: "40px" }}>
            <NameCaptureForm email={quizEmail} quizSessionId={quizSessionId} onSuccess={() => window.location.reload()} onDismiss={() => setNameCaptureDismissed(true)} />
          </div>
        )}
        {verificationState === "verified" && !isLoggedIn && nameCaptureDismissed && (
          <div style={{ padding: "16px 0" }}>
            <Link href="/signup" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "underline" }}>Create an account to save your results and access your dashboard</Link>
          </div>
        )}

        {/* ─── WHAT HAPPENS AFTER PAYMENT ───────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>After payment</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "36px" }}>What happens next</div>
          <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {[
              { step: "01", title: "Choose & Build", desc: "Your account opens with quiz answers pre-loaded. Choose your business direction — independent or franchise. Franchise buyers are matched to a vetted broker in their investment range. Work through each section: business plan, source of funds, qualifications, ties statement." },
              { step: "02", title: "Analyse & Generate", desc: `Franchise buyers upload their FDD for a full item-by-item analysis — unit economics, officer red flags, territory fit, and market analysis. Then generate all 15 consulate-formatted documents from your case file, ready for ${consulate.name}.` },
              { step: "03", title: "Prepare", desc: "Your AI Interview Simulator trains you on the exact questions officers ask — adapted to your investment, business type, and consulate. Comes with a day-of checklist: what to bring, what to leave behind, and what to expect at each stage of the interview." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ border: "1px solid rgba(201,168,76,0.15)", padding: "32px 24px", background: "rgba(10,10,10,0.4)" }}>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "56px", fontWeight: 300, color: "rgba(201,168,76,0.18)", lineHeight: 1, marginBottom: "14px" }}>{step}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "10px" }}>{title}</div>
                <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.65)", lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── MODULE CARDS ─────────────────────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>Everything in the package</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "36px" }}>Three modules. One case file.</div>

          <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "48px" }}>
            {/* Module 1 — Document Generation */}
            <div style={{ border: "1px solid rgba(201,168,76,0.28)", padding: "28px 24px", background: "rgba(201,168,76,0.018)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Module 1</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "21px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Document Generation</div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.58)", lineHeight: 1.65, marginBottom: "18px" }}>15 consulate-formatted documents generated from your case answers. Export-ready for {consulate.name}.</div>
              <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: "14px" }}>
                {["Cover Letter", "Business Plan", "Source of Funds Statement", "Qualifications Narrative", "Non-Immigrant Intent Statement"].map((d, i) => (
                  <div key={i} style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(245,240,232,0.8)", marginBottom: "5px" }}>
                    <span style={{ color: "#C9A84C", flexShrink: 0 }}>✓</span>{d}
                  </div>
                ))}
                <div style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(201,168,76,0.65)", marginTop: "2px" }}>
                  <span style={{ flexShrink: 0 }}>+</span>10 more documents
                </div>
              </div>
            </div>

            {/* Module 2 — Gap Analysis */}
            <div style={{ border: "1px solid rgba(201,168,76,0.28)", padding: "28px 24px", background: "rgba(201,168,76,0.018)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Module 2</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "21px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Gap Analysis</div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.58)", lineHeight: 1.65, marginBottom: "18px" }}>6 evidence categories audited against consulate officer expectations. Identifies what to strengthen before submission.</div>
              <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: "14px" }}>
                {["Investment documentation", "Source of funds trail", "Business operations evidence", "Management qualifications", "Non-marginality proof", "Non-immigrant intent"].map((c, i) => (
                  <div key={i} style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(245,240,232,0.8)", marginBottom: "5px" }}>
                    <span style={{ color: "#5DCAA5", flexShrink: 0 }}>→</span>{c}
                  </div>
                ))}
              </div>
            </div>

            {/* Module 3 — Interview Simulator */}
            <div style={{ border: "1px solid rgba(201,168,76,0.28)", padding: "28px 24px", background: "rgba(201,168,76,0.018)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Module 3</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "21px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Interview Simulator</div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.58)", lineHeight: 1.65, marginBottom: "18px" }}>AI officer persona trained on {consulate.name} adjudication patterns. Adapts to your specific case profile in real time.</div>
              <div style={{ borderTop: "1px solid rgba(201,168,76,0.1)", paddingTop: "14px" }}>
                {["Officer questions for your business type", "Adapted to your investment profile", "Source of funds drill", "Non-immigrant intent challenge", "Real-time answer feedback", "Consulate-day checklist"].map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: "7px", fontSize: "11px", color: "rgba(245,240,232,0.8)", marginBottom: "5px" }}>
                    <span style={{ color: "#5DCAA5", flexShrink: 0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Document Tab Preview ── */}
          <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.48)", marginBottom: "10px" }}>
            Sample document draft — generated from your quiz answers
          </div>
          <DocumentTabPreview data={data} consulateName={consulate.name} userName={userName} />

          <div style={{ marginTop: "24px", padding: "14px 20px", background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.14)", marginBottom: "24px" }}>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6 }}>
              <span style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px" }}>$1,495</span>
              {" "}vs. $8,000–$15,000 for an attorney-prepared package. All formatted for {consulate.name}. 10 document revision credits included.
            </div>
          </div>
          <Link href={ctaHref} style={{ display: "inline-block", padding: "16px 36px", background: "#C9A84C", color: "#0a0a0a", fontSize: "12px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" as const, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
            {ctaLabel} — $1,495 one-time
          </Link>
        </div>

        {/* ─── ALSO AVAILABLE / NOT RELEVANT ────────────────────────────────────── */}
        {(() => {
          const bizAnswer = String(data.answers?.["Q0-08a"] || "").toLowerCase();
          const isFranchisePath = /franchise/i.test(bizAnswer) || showFranchiseTeaser;
          const isNewConcept = !isFranchisePath && !/acquisition/i.test(bizAnswer);

          return (
            <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>Add-on modules</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "32px" }}>Tailored to your path</div>

              <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
                {/* FDD Intelligence */}
                {isFranchisePath ? (
                  <div style={{ border: "1px solid rgba(201,168,76,0.45)", padding: "24px", background: "rgba(201,168,76,0.025)" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#C9A84C", marginBottom: "10px" }}>Relevant for your case</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>FDD Intelligence</div>
                    <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6, marginBottom: "14px" }}>
                      Full item-by-item FDD analysis — Item 19 unit economics, officer red flags, territory fit, and
                      {fddReceived ? " your FDD is already in hand." : fddOffered ? " analyse it the moment your franchisor delivers it." : " market analysis benchmarks."}
                    </div>
                    <Link href="/fdd" style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "underline", fontFamily: "'DM Sans', sans-serif" }}>
                      {fddReceived ? "Analyse my FDD now →" : "Learn about FDD analysis →"}
                    </Link>
                  </div>
                ) : (
                  <div style={{ border: "1px solid rgba(245,240,232,0.06)", padding: "24px", background: "rgba(245,240,232,0.012)", opacity: 0.6 }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(245,240,232,0.38)", marginBottom: "10px" }}>Not applicable</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 300, color: "rgba(245,240,232,0.55)", marginBottom: "6px" }}>FDD Intelligence</div>
                    <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)", lineHeight: 1.6 }}>
                      {isNewConcept
                        ? "FDD analysis applies to franchise acquisitions only. Your case is a new concept build — this module is not needed."
                        : "FDD analysis applies to franchise acquisitions. Based on your quiz answers, this module is not part of your recommended path."}
                    </div>
                  </div>
                )}

                {/* Market Analysis */}
                <div style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "24px", background: "rgba(201,168,76,0.012)" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "10px" }}>Available add-on</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>Market Analysis</div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6, marginBottom: "14px" }}>
                    AI-generated market sizing with TAM/SAM data, competitive landscape, and industry benchmarks for your specific business sector and geography. Included in document generation for your consulate.
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)" }}>Included in Complete Package</div>
                </div>

                {/* Additional Simulator Sessions */}
                <div style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "24px", background: "rgba(201,168,76,0.012)" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "10px" }}>Available add-on</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "19px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>Additional Simulator Sessions</div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.6, marginBottom: "14px" }}>
                    The Complete Package includes 10 simulator sessions. Purchase additional blocks as your interview date approaches — the officer persona adapts as your answers evolve.
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)" }}>Available after purchase · priced per block</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ─── FLAGS ─────────────────────────────────────────────────────────────── */}
        {flagsToShow.length > 0 && (
          <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.7)", marginBottom: "6px" }}>
              {flagsToShow.length === 1 ? "One area to address" : `${flagsToShow.length} areas to address`}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "24px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Preparation priorities</div>
            <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.62)", marginBottom: "24px", lineHeight: 1.5 }}>
              Your application is viable — these are areas to strengthen, not disqualifiers.
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

        {/* ─── DOCUMENT PACKAGE PREVIEW ─────────────────────────────────────────── */}
        <DocumentPackagePreview data={data} isLoggedIn={isLoggedIn} consulateName={consulate.name} />

        {/* ─── FAQ ──────────────────────────────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "28px" }}>Common questions</div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} style={{ borderBottom: "1px solid rgba(201,168,76,0.08)", paddingLeft: openFaq === i ? "16px" : "0", borderLeft: openFaq === i ? "2px solid #C9A84C" : "2px solid transparent", transition: "all 0.2s ease" }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", padding: "18px 0", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" as const, fontFamily: "'DM Sans', sans-serif" }}
              >
                <span style={{ fontSize: "13px", color: openFaq === i ? "#C9A84C" : "#f5f0e8", lineHeight: 1.4, fontWeight: openFaq === i ? 500 : 400 }}>{item.q}</span>
                <span style={{ fontSize: "18px", color: "rgba(201,168,76,0.5)", flexShrink: 0, display: "inline-block", transform: openFaq === i ? "rotate(45deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ paddingBottom: "20px", paddingRight: "32px" }}>
                  <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.72)", lineHeight: 1.8 }}>{item.a}</div>
                </div>
              )}
            </div>
          ))}
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
      <div style={{ padding: "24px 40px", borderTop: "1px solid rgba(201,168,76,0.06)", marginTop: "12px" }}>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)", lineHeight: 1.6, maxWidth: "960px", margin: "0 auto" }}>
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
