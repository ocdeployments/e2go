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

function getBandConfig(outcome: string): { color: string; label: string } {
  if (outcome === "PROCEED") return { color: "#5DCAA5", label: "Strong E-2 eligibility band — safe to proceed into full preparation." };
  if (outcome === "PROCEED_RISK") return { color: "#f59e0b", label: "Viable — specific areas require strengthening before submission." };
  if (outcome === "ATTORNEY_RECOMMENDED") return { color: "rgba(239,68,68,0.8)", label: "Complex case — legal guidance recommended alongside preparation." };
  return { color: "rgba(239,68,68,0.4)", label: "E-2 approval is unlikely for your current situation." };
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
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300, marginBottom: "48px" }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
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
  const band = getBandConfig(outcome);
  const ctaHref = isLoggedIn ? "/apply" : `/pricing?tier=${data.application_type}`;
  const displayNameFromEmail = quizEmail ? (quizEmail.split("@")[0].charAt(0).toUpperCase() + quizEmail.split("@")[0].slice(1)) : null;
  const FALLBACK_NAMES = ["Alex", "Jordan", "Morgan", "Taylor", "Casey", "Riley"];
  const displayName = userName || displayNameFromEmail || FALLBACK_NAMES[score % FALLBACK_NAMES.length];

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
      q: "Can e2go replace an immigration attorney?",
      a: "No, and we are explicit about this. e2go is a document preparation and case management platform — we help you organize, write, and strengthen your application file. A licensed attorney provides legal strategy, handles complex situations (prior denials, 221(g) processing, security checks), and can represent you if needed. For straightforward applications with strong investment and clean funds, e2go prepares the documents at a fraction of attorney fees. Attorney review alongside e2go is always an option.",
    },
    {
      q: "What if my application is flagged or gets a 221(g)?",
      a: "A 221(g) is an administrative hold — not a denial. It is a request for additional documents or a security clearance check. The most common requests are for source of funds documentation, business plan clarification, or an organizational chart. e2go builds all of these proactively. If you receive a 221(g), your Gap Analysis case file identifies which evidence categories to strengthen and exactly what to add. Most 221(g) cases resolve within 4–8 weeks of providing the requested documents.",
    },
    {
      q: "I've sold property in my home country — will that affect my case?",
      a: "Yes, it can — but it is manageable. Selling your primary residence is a signal officers may interpret as immigrant intent. It is not disqualifying, but it requires a clear counter-narrative: demonstrable ties that remain after the sale (family, investments, accounts, professional obligations), a credible E-2 renewal plan, and an explicit non-immigrant intent statement. e2go's Ties Section and Interview Simulator both address this pattern directly.",
    },
    {
      q: `How long does the ${consulate.name} process take?`,
      a: `From submission to interview is currently ${timelineWeeks.weeksMin}–${timelineWeeks.weeksMax} weeks for a well-prepared application at ${consulate.name}. ${consulate.intel} Preparation inside e2go typically takes 2–4 weeks depending on case complexity. Your interview window is ${timeline}. Most approvals are issued the same day as the interview, with the passport returned within 5–7 business days.`,
    },
    {
      q: "What's included in the $1,495 package?",
      a: "Gap Analysis (6 evidence categories), 15 consulate-formatted documents including Cover Letter, Business Plan, Source of Funds Statement, Market Analysis, Qualifications Narrative, Non-Immigrant Intent Statement, and 9 more. FDD Analysis is included for franchise buyers. Also includes 3 Interview Simulator sessions (additional sessions available), and 10 document revision credits. All formatted for your specific consulate.",
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
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>e2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
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
        {/* Congratulatory headline — name embedded when available */}
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "48px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.15, marginBottom: "24px" }}>
          Congratulations{displayName ? `, ${displayName.split(" ")[0]}` : ""}. You qualify for an E-2 visa.
        </div>

        {/* Score — redesigned display */}
        <div style={{ display: "flex", alignItems: "center", gap: "28px", marginBottom: "24px", flexWrap: "wrap" as const }}>
          {/* Large score number */}
          <div style={{ flexShrink: 0, lineHeight: 1 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "88px", fontWeight: 300, color: scoreColor }}>{score}</span>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "rgba(245,240,232,0.18)", verticalAlign: "super" }}>/100</span>
          </div>
          {/* Score meta */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.18em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "10px" }}>Eligibility score</div>
            <div style={{ height: "2px", background: "rgba(245,240,232,0.07)", maxWidth: "260px", marginBottom: "12px" }}>
              <div style={{ height: "100%", width: `${score}%`, background: scoreColor }} />
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>{band.label.split(" — ")[0]}</div>
            <div style={{ fontSize: "10.5px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>
              {missedPoints > 0
                ? `${missedPoints} points addressable — e2go targets every evidence gap`
                : "Maximum score — your profile is in the strongest eligibility band"}
            </div>
          </div>
        </div>

        {/* Case summary pills */}
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: "8px", marginBottom: "36px" }}>
          {caseStrengths.map((s, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "rgba(93,202,165,0.07)", border: "1px solid rgba(93,202,165,0.22)", borderRadius: "2px", fontSize: "11px", color: "#5DCAA5", fontFamily: "'DM Sans', sans-serif" }}>
              ✓ {s}
            </span>
          ))}
          {flagsToShow.slice(0, 2).map((f, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", borderRadius: "2px", fontSize: "11px", color: "rgba(245,158,11,0.9)", fontFamily: "'DM Sans', sans-serif" }}>
              △ {f.info?.plain_language ? (f.info.plain_language.length > 42 ? f.info.plain_language.slice(0, 42) + "…" : f.info.plain_language) : f.code}
            </span>
          ))}
          {verificationState === "verified" && !isLoggedIn && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "rgba(93,202,165,0.07)", border: "1px solid rgba(93,202,165,0.2)", borderRadius: "2px", fontSize: "11px", color: "#5DCAA5", fontFamily: "'DM Sans', sans-serif" }}>
              ✓ Email verified
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 12px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: "2px", fontSize: "11px", color: "rgba(201,168,76,0.75)", fontFamily: "'DM Sans', sans-serif" }}>
            {consulate.name}
          </span>
        </div>

      </div>

      {/* ─── INTERVIEW BANNER — only shown for known consulates ──────────────── */}
      {consulate.name !== "Your Home Consulate" && (
        <div style={{ background: "rgba(201,168,76,0.05)", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(201,168,76,0.12)", padding: "16px 40px" }}>
          <div style={{ maxWidth: "980px", margin: "0 auto", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" as const }}>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#C9A84C", flexShrink: 0 }} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#C9A84C" }}>
              If you start today — interview window: {timeline}
            </span>
            <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.6)" }}>
              · {consulate.name} is currently processing in {timelineWeeks.weeksMin}–{timelineWeeks.weeksMax} weeks from submission.
            </span>
            {targetDateMsg && <span style={{ fontSize: "11px", color: "rgba(201,168,76,0.7)" }}>{targetDateMsg}</span>}
          </div>
        </div>
      )}

      <div className="results-inner" style={{ maxWidth: "980px", margin: "0 auto", padding: "0 40px" }}>

        {/* ─── SCORE BREAKDOWN ──────────────────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>By the numbers</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "36px" }}>What your quiz revealed</div>
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

        {/* ─── RECOVER X POINTS — removed from UI ──────────────────────────────── */}
        {(false as boolean) && missedPoints > 0 && recoveryCards.length > 0 && (
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

        {/* ─── JOURNEY — 4 steps merged ─────────────────────────────────────────── */}
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>How it works</div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "30px", fontWeight: 300, color: "#f5f0e8", marginBottom: "36px" }}>From quiz to consulate — four steps</div>
          <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "48px" }}>

            {/* Step 00 — Quiz (done) */}
            <div style={{ border: "1px solid rgba(93,202,165,0.22)", padding: "24px 20px", background: "rgba(93,202,165,0.012)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "rgba(93,202,165,0.2)", lineHeight: 1, marginBottom: "10px" }}>00</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px", background: "rgba(93,202,165,0.1)", border: "1px solid rgba(93,202,165,0.28)", fontSize: "10px", color: "#5DCAA5", marginBottom: "10px", letterSpacing: "0.04em" }}>✓ Done</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px" }}>Eligibility Quiz</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  `Score: ${score}/100`,
                  `${consulate.name} matched`,
                  flagsToShow.length > 0 ? `${flagsToShow.length} risk area${flagsToShow.length > 1 ? "s" : ""} flagged` : "Clean risk profile",
                  "Answers saved to your case",
                ].map((b, i) => (
                  <li key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.75, display: "flex", gap: "7px" }}>
                    <span style={{ color: "#5DCAA5", flexShrink: 0 }}>·</span>{b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Step 01 */}
            <div style={{ border: "1px solid rgba(201,168,76,0.15)", padding: "24px 20px", background: "rgba(10,10,10,0.4)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "rgba(201,168,76,0.18)", lineHeight: 1, marginBottom: "14px" }}>01</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px" }}>Choose & Build</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Quiz answers pre-loaded in your account",
                  "Pick your direction: independent or franchise",
                  "Franchise buyers matched to a vetted broker",
                  "Build: business plan, source of funds, qualifications, ties statement",
                ].map((b, i) => (
                  <li key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.75, display: "flex", gap: "7px" }}>
                    <span style={{ color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>·</span>{b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Step 02 */}
            <div style={{ border: "1px solid rgba(201,168,76,0.15)", padding: "24px 20px", background: "rgba(10,10,10,0.4)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "rgba(201,168,76,0.18)", lineHeight: 1, marginBottom: "14px" }}>02</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px" }}>Analyse & Generate</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Franchise buyers: upload FDD for item-by-item analysis",
                  "Unit economics, red flags, territory fit",
                  `Generate 15 documents formatted for ${consulate.name}`,
                  "Export-ready from your case file",
                ].map((b, i) => (
                  <li key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.75, display: "flex", gap: "7px" }}>
                    <span style={{ color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>·</span>{b}
                  </li>
                ))}
              </ul>
            </div>

            {/* Step 03 */}
            <div style={{ border: "1px solid rgba(201,168,76,0.15)", padding: "24px 20px", background: "rgba(10,10,10,0.4)" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "44px", fontWeight: 300, color: "rgba(201,168,76,0.18)", lineHeight: 1, marginBottom: "14px" }}>03</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "17px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px" }}>Prepare</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  `AI Simulator trained on ${consulate.name} patterns`,
                  "Adapted to your business type and investment",
                  "Day-of checklist: what to bring, what to leave",
                  "Know what to expect at every stage",
                ].map((b, i) => (
                  <li key={i} style={{ fontSize: "11px", color: "rgba(245,240,232,0.65)", lineHeight: 1.75, display: "flex", gap: "7px" }}>
                    <span style={{ color: "rgba(201,168,76,0.5)", flexShrink: 0 }}>·</span>{b}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Document tab preview */}
          <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.48)", marginBottom: "10px" }}>
            Sample document draft — generated from your quiz answers
          </div>
          <DocumentTabPreview data={data} consulateName={consulate.name} userName={displayName} />
        </div>

        {/* ─── DOCUMENT BREAKDOWN ───────────────────────────────────────────────── */}
        {(() => {
          // Page targets sourced from Document_Generation_Standards.md — verified May 2026
          // Toronto (Canada): 50-page total package limit (official ca.usembassy.gov rule)
          // Frankfurt (Germany): 30-page hard limit, compressed format
          // All other consulates: no confirmed hard limit — standard format
          const countryLower = (data.country || "").toLowerCase();
          const isCanada  = countryLower.includes("canada");
          const isGermany = countryLower.includes("germany");
          const isFranchise = /franchise/i.test(String(data.answers?.["Q0-08a"] || ""));

          const packageLimitNote = isCanada
            ? `${consulate.name} enforces a 50-page maximum for the complete application package (official rule). All documents are sized to meet this limit with a 4-page buffer.`
            : isGermany
            ? `Frankfurt Consulate enforces a 30-page maximum and a 5MB file size limit. Your Business Plan is generated in executive summary format. All narratives are compressed to fit.`
            : `Page allocation follows your consulate's published guidance. Where no hard limit is confirmed, documents are generated at full depth.`;

          type DocRow = { title: string; pages: string; tags: string[]; detail: string };

          function pp(ca: string, de: string, other = "consulate-formatted"): string {
            if (isCanada) return ca;
            if (isGermany) return de;
            return other;
          }

          const DOCS: DocRow[] = [
            {
              title: "Cover Letter",
              pages: pp("up to 5 pp", "2–3 pp"),
              tags: ["gap", "archetype", "fdd"],
              detail: "Six statutory sections — treaty standing, substantiality, source of funds, non-marginality, active management, nonimmigrant intent. Every section is cross-referenced with your gap analysis output and written to the develop-and-direct standard your archetype requires.",
            },
            {
              title: "Business Plan",
              pages: pp("up to 18 pp", "exec. summary format"),
              tags: ["gap", "archetype", "market", "fdd"],
              detail: "Built from your quiz answers, gap analysis, and Market Analysis engine output. Includes 3-year financial projections, employment creation timeline, and competitive positioning. Structured specifically around the consulate's non-marginality burden of proof — not a generic template.",
            },
            {
              title: "Source of Funds Declaration",
              pages: pp("up to 3 pp", "1–2 pp"),
              tags: ["gap", "fdd"],
              detail: "Full chronological trace from origin to U.S. account — savings, business proceeds, asset sales. Each source linked to its supporting document category. Exhibits checklist included.",
            },
            {
              title: "Fund Flow Chronology",
              pages: pp("up to 2 pp", "1 pp"),
              tags: ["gap", "fdd"],
              detail: "Transaction-level timeline: each wire, each disbursement, each recipient. Purpose-coded against investment categories. Built from your source of funds answers and gap analysis flags.",
            },
            {
              title: "Net Worth Statement",
              pages: pp("up to 2 pp", "1 pp"),
              tags: ["gap", "fdd"],
              detail: "Pre- and post-investment balance sheet. Substantiality ratio calculated and stated. Retained home-country assets documented as financial stability evidence for the nonimmigrant intent argument.",
            },
            {
              title: "Investment Proof Package",
              pages: pp("up to 3 pp", "1–2 pp"),
              tags: ["gap", "archetype"],
              detail: "Capital commitment evidence — bank wires, contracts, lease deposits, equipment invoices — organized by investment category with a running total. Structured to the proportionality standard your investment level requires.",
            },
            {
              title: "Qualifications Narrative",
              pages: pp("up to 2 pp", "1 pp"),
              tags: ["gap", "archetype"],
              detail: "Develop-and-direct argument built from your specific career history. Every past responsibility mapped to the proposed enterprise's operational demands. Archetype-specific: franchise buyer, entrepreneur, and investor archetypes each frame management capacity differently.",
            },
            {
              title: "Non-Immigrant Intent Statement",
              pages: pp("up to 1 pp", "1 pp"),
              tags: ["gap"],
              detail: "Home-country ties documentation: property, family, financial accounts, tax residency. Identifies the ties most relevant to your profile from gap analysis. Includes a defined E-2 renewal plan with a clear business timeline.",
            },
            {
              title: "Visa Category Memorandum",
              pages: pp("up to 3 pp", "1–2 pp"),
              tags: ["gap", "archetype", "fdd"],
              detail: "Legal substantiality memo. Proportionality ratio stated and defended against the applicable tier. Committed vs. reserved capital breakdown per USCIS guidance. Archetype-tailored — the investor and franchise buyer archetypes receive different proportionality arguments.",
            },
            {
              title: "Marginality Rebuttal",
              pages: pp("up to 2 pp", "1 pp"),
              tags: ["gap"],
              detail: "Proactive rebuttal to the marginality presumption. Job creation timeline with role descriptions and salary projections. Revenue model benchmarked against Market Analysis data. Written against your consulate's known scrutiny patterns.",
            },
            {
              title: "Résumé — Principal",
              pages: pp("up to 2 pp", "1–2 pp"),
              tags: ["archetype"],
              detail: "E-2-formatted résumé — not a job-search CV. Emphasis on management capacity, P&L ownership, and operational leadership. Framed specifically to connect your background to the proposed enterprise's day-to-day demands.",
            },
            {
              title: "Principal Declaration",
              pages: pp("up to 1 pp", "1 pp"),
              tags: ["gap", "archetype", "fdd"],
              detail: "First-person sworn statement of investment intent, operational commitment, and nonimmigrant intent. Written in the register of a legal declaration — precise, first-person, without hedging. Consulate-appropriate and archetype-matched.",
            },
            {
              title: "Market Analysis",
              pages: pp("within Business Plan", "within Business Plan"),
              tags: ["gap", "market"],
              detail: "TAM/SAM sizing with BLS and Census data anchors, competitive landscape specific to your sector and target location, and industry growth benchmarks. Generated by a dedicated Market Analysis engine — then injected into the Business Plan as an evidence annex. No other E-2 preparation platform includes this.",
            },
            {
              title: "Spouse Declaration",
              pages: pp("up to 1 pp", "1 pp"),
              tags: ["conditional"],
              detail: "Derivative E-2S intent statement for accompanying spouse. Generated when spousal accompaniment is indicated. Includes nonimmigrant intent and home-country ties statement.",
            },
            {
              title: "Property Portfolio Summary",
              pages: pp("up to 1 pp", "1 pp"),
              tags: ["conditional"],
              detail: "Home-country real estate schedule — title references, valuations, mortgage status. Generated when property ownership is a primary nonimmigrant intent tie. Supports the intent statement with specific asset references.",
            },
          ];

          return (
          <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.5)", marginBottom: "6px" }}>What gets built</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "26px", fontWeight: 300, color: "#f5f0e8", marginBottom: "6px" }}>15 documents. Every one engineered.</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.52)", lineHeight: 1.6, marginBottom: "20px", maxWidth: "560px" }}>
              Each document passes through five intelligence layers before it reaches you. This is not a template fill-in — every sentence is generated from your specific answers, your evidence gaps, your investor archetype, and your consulate&apos;s known adjudication patterns.
            </div>

            {/* Consulate page limit notice */}
            <div style={{ marginBottom: "28px", padding: "12px 16px", background: "rgba(201,168,76,0.03)", border: "1px solid rgba(201,168,76,0.15)", borderLeft: "2px solid rgba(201,168,76,0.5)", fontSize: "10.5px", color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              <span style={{ color: "rgba(201,168,76,0.75)", fontWeight: 600 }}>Page allocation — {consulate.name}: </span>
              {packageLimitNote}
            </div>

            {/* Engine legend */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" as const, marginBottom: "20px" }}>
              {([
                { dot: "#C9A84C", label: "Gap analysis feeds this document" },
                { dot: "#5DCAA5", label: "Archetype-tailored (4 investor types)" },
                { dot: "#7BC8E8", label: "Market Analysis engine input" },
                ...(isFranchise ? [{ dot: "#C47BDE", label: "FDD data injected (franchise)" }] : []),
                { dot: "rgba(245,240,232,0.35)", label: "Conditional on your case" },
              ] as Array<{ dot: string; label: string }>).map(({ dot, label }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "10px", color: "rgba(245,240,232,0.52)" }}>
                  <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: dot, flexShrink: 0 }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Document tiles — infographic style, 3-col grid */}
            {(() => {
              const coreDocs  = DOCS.filter(d => !d.tags.includes("conditional"));
              const condDocs  = DOCS.filter(d =>  d.tags.includes("conditional"));
              function tileAccent(doc: DocRow): string {
                if (doc.tags.includes("fdd") && isFranchise) return "#C47BDE";
                if (doc.tags.includes("market"))              return "#7BC8E8";
                if (doc.tags.includes("archetype"))           return "#5DCAA5";
                return "#C9A84C";
              }
              function Tile({ doc }: { doc: DocRow }) {
                const isConditional = doc.tags.includes("conditional");
                const accent = isConditional ? "rgba(245,240,232,0.18)" : tileAccent(doc);
                return (
                  <div style={{ background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.1)", display: "flex", flexDirection: "column" as const, padding: "13px 14px 11px" }}>
                    <div style={{ height: "2px", background: accent, marginBottom: "10px" }} />
                    <div style={{ fontSize: "11px", fontWeight: 600, color: isConditional ? "rgba(245,240,232,0.5)" : "#f5f0e8", lineHeight: 1.35, flex: 1, marginBottom: "10px" }}>{doc.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
                        {doc.tags.includes("gap")         && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#C9A84C" }} />}
                        {doc.tags.includes("archetype")   && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#5DCAA5" }} />}
                        {doc.tags.includes("market")      && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#7BC8E8" }} />}
                        {doc.tags.includes("fdd") && isFranchise && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#C47BDE" }} />}
                        {isConditional                    && <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(245,240,232,0.3)" }} />}
                      </div>
                      <span style={{ fontSize: "8px", color: "rgba(201,168,76,0.45)", letterSpacing: "0.05em", whiteSpace: "nowrap" as const }}>{doc.pages}</span>
                    </div>
                  </div>
                );
              }
              return (
                <div>
                  {/* Core 13 */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px", marginBottom: "14px" }}>
                    {coreDocs.map((doc, i) => <Tile key={i} doc={doc} />)}
                  </div>
                  {/* Conditional 2 */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                    <div style={{ fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "rgba(245,240,232,0.3)", paddingTop: "14px", whiteSpace: "nowrap" as const, flexShrink: 0 }}>If applicable</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", flex: 1 }}>
                      {condDocs.map((doc, i) => <Tile key={i} doc={doc} />)}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Engine description — 4-stage visual pipeline */}
            <div style={{ marginTop: "20px", padding: "20px 22px", background: "rgba(201,168,76,0.025)", border: "1px solid rgba(201,168,76,0.12)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "16px" }}>The intelligence pipeline — how every document is produced</div>

              {/* Pipeline row — 4 stages with arrows */}
              <div style={{ display: "flex", alignItems: "stretch", gap: "0", overflowX: "auto" as const }}>

                {/* ── Stage 1: Assessment ── */}
                {([
                  {
                    stageKey: "s1",
                    barColor: "#C9A84C",
                    labelColor: "#C9A84C",
                    numColor: "rgba(201,168,76,0.7)",
                    label: "Assessment",
                    steps: [
                      {
                        num: "① Quiz scoring",
                        title: "9 regulatory dimensions",
                        facts: ["60+ answers evaluated", "Pure functions — no LLM", "Eligibility score + 15 risk flags"],
                        badge: null,
                      },
                      {
                        num: "② Gap analysis",
                        title: "6 categories + 15 D-codes",
                        facts: ["SoF 25% · Mgmt 25% · BP 20%", "Inv 15% · Emp 10% · Ops 5%", "buildGapContext() → every prompt"],
                        badge: null,
                      },
                    ],
                  },
                  {
                    stageKey: "s2",
                    barColor: "#7BC8E8",
                    labelColor: "#7BC8E8",
                    numColor: "rgba(123,200,232,0.8)",
                    label: "Data engines",
                    steps: [
                      {
                        num: "③ Market Analysis",
                        title: "Location + sector data",
                        facts: ["Census ACS 5-year · BLS", "TAM/SAM + competitive landscape", "Injected into Business Plan sections"],
                        badge: null,
                      },
                      {
                        num: "④ FDD Intelligence",
                        title: "4-pass · 50 fields · 5 engines",
                        facts: ["Item 7 · 19 · 20 · 21 + red flags", "Injected into 7 documents"],
                        badge: { label: "Franchise buyers only", color: "#C47BDE", bg: "rgba(196,123,222,0.08)", border: "rgba(196,123,222,0.3)" },
                      },
                    ],
                  },
                  {
                    stageKey: "s3",
                    barColor: "#5DCAA5",
                    labelColor: "#5DCAA5",
                    numColor: "rgba(93,202,165,0.8)",
                    label: "Generation",
                    steps: [
                      {
                        num: "⑤ Archetype",
                        title: "64 tailored prompt layers",
                        facts: ["4 investor types × 16 doc types", "Changes legal framing + structure", "Not just tone — different argument"],
                        badge: null,
                      },
                      {
                        num: "⑥ Document gen",
                        title: "claude-opus-4-8 direct SDK",
                        facts: ["All prior context in one prompt", "16 REQUIRED_ELEMENTS validated", "Per-doc structure enforced"],
                        badge: null,
                      },
                    ],
                  },
                  {
                    stageKey: "s4",
                    barColor: "#C47BDE",
                    labelColor: "#C47BDE",
                    numColor: "rgba(196,123,222,0.8)",
                    label: "Quality gate",
                    steps: [
                      {
                        num: "⑦ Quality pipeline",
                        title: "5 sequential checks",
                        facts: ["Repetition → Consistency", "AI Detection → Humanization (3×)", "Metadata Sanitization → Gate"],
                        badge: null,
                      },
                      {
                        num: "⑧ Preview gate",
                        title: "Acknowledgment gate",
                        facts: ["All stages must pass", "22–25 steps per complete run", "Conditional docs auto-triggered"],
                        badge: null,
                      },
                    ],
                  },
                ] as Array<{
                  stageKey: string; barColor: string; labelColor: string; numColor: string; label: string;
                  steps: Array<{ num: string; title: string; facts: string[]; badge: { label: string; color: string; bg: string; border: string } | null }>;
                }>).map((stage, si) => (
                  <div key={stage.stageKey} style={{ display: "flex", alignItems: "stretch" }}>
                    {/* Arrow between stages */}
                    {si > 0 && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M1 6h10M7 2l4 4-4 4" stroke="#C9A84C" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity="0.35"/>
                        </svg>
                      </div>
                    )}
                    {/* Stage card */}
                    <div style={{ flex: 1, minWidth: "168px", border: "1px solid rgba(201,168,76,0.18)", background: "rgba(201,168,76,0.025)", display: "flex", flexDirection: "column" as const }}>
                      <div style={{ height: "3px", background: stage.barColor }} />
                      <div style={{ padding: "14px 14px 16px", flex: 1, display: "flex", flexDirection: "column" as const }}>
                        <div style={{ fontSize: "8px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: stage.labelColor, fontWeight: 600, marginBottom: "12px" }}>{stage.label}</div>
                        {stage.steps.map((step, stepIdx) => (
                          <div key={stepIdx} style={{ flex: 1, paddingTop: stepIdx > 0 ? "10px" : "0", marginTop: stepIdx > 0 ? "2px" : "0", borderTop: stepIdx > 0 ? "1px solid rgba(201,168,76,0.08)" : "none" }}>
                            <div style={{ fontSize: "9px", letterSpacing: "0.04em", color: stage.numColor, marginBottom: "3px", fontWeight: 600 }}>{step.num}</div>
                            <div style={{ fontSize: "11px", fontWeight: 600, color: "#f5f0e8", lineHeight: 1.3, marginBottom: "4px" }}>{step.title}</div>
                            {step.facts.map((fact, fi) => (
                              <div key={fi} style={{ fontSize: "9.5px", color: "rgba(245,240,232,0.5)", lineHeight: 1.4 }}>{fact}</div>
                            ))}
                            {step.badge && (
                              <div style={{ marginTop: "5px", display: "inline-block", fontSize: "8px", padding: "2px 7px", background: step.badge.bg, color: step.badge.color, border: `1px solid ${step.badge.border}`, fontWeight: 600, letterSpacing: "0.04em" }}>
                                {step.badge.label}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(201,168,76,0.08)", fontSize: "10px", color: "rgba(245,240,232,0.35)", lineHeight: 1.6 }}>
                Every document carries the full combined context: gap analysis output · archetype layer · market data · FDD findings (franchise). Conditional documents — Spouse Declaration, Property Portfolio — are generated only when triggered by specific quiz answers. Page budgets tracked in real time against {consulate.name}&apos;s confirmed limits.
              </div>
            </div>
          </div>
          );
        })()}

        {/* ─── PRICING CARD ─────────────────────────────────────────────────────── */}
        {(() => {
          const isPartnership = data.application_type === "complete_partnership";
          const priceDollars = isPartnership ? "$2,495" : "$1,495";
          const packageLabel = isPartnership ? "Partnership Package" : "Complete Package";
          const packageSubline = isPartnership ? "Two investors · two complete case files" : "one-time · no subscription";
          const isFranchiseBuyer = /franchise/i.test(String(data.answers?.["Q0-08a"] || ""));
          return (
        <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "6px" }}>Ready to build your case</div>
          <div style={{ border: "1px solid rgba(201,168,76,0.45)", padding: "32px 36px", background: "rgba(201,168,76,0.018)" }}>
            <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" as const }}>

              {/* Price block */}
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.65)", marginBottom: "6px" }}>{packageLabel}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "56px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{priceDollars}</div>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.42)", marginTop: "4px" }}>{packageSubline}</div>
                <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.48)", marginTop: "3px" }}>vs. $8,000–$15,000 for attorneys</div>
                {isPartnership && (
                  <div style={{ marginTop: "10px", padding: "7px 10px", background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.18)", fontSize: "10px", color: "rgba(201,168,76,0.8)", lineHeight: 1.5 }}>
                    Covers both partners + their families.<br />Two separate case files. One price.
                  </div>
                )}
              </div>

              {/* Unified what's included list — two explicit columns, no grid wrapping */}
              <div style={{ flex: 1, minWidth: "240px", display: "flex", gap: "20px" }}>
                {/* Left column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                  {([
                    { icon: "✓", color: "#5DCAA5", text: "Eligibility assessment", dim: true },
                    { icon: "✓", color: "#5DCAA5", text: flagsToShow.length > 0 ? `${flagsToShow.length} risk area${flagsToShow.length > 1 ? "s" : ""} identified` : "Clean profile", dim: true },
                    { icon: "✓", color: "#5DCAA5", text: "Consulate adjudication profiled", dim: true },
                    { icon: "→", color: "#C9A84C", text: "15 engineered documents", dim: false },
                    { icon: "→", color: "#C9A84C", text: "3 interview simulations", dim: false },
                  ] as Array<{ icon: string; color: string; text: string; dim: boolean }>).map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: "7px", alignItems: "center", fontSize: "11px" }}>
                      <span style={{ color: row.color, flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ color: row.dim ? "rgba(245,240,232,0.5)" : "rgba(245,240,232,0.85)", whiteSpace: "nowrap" as const }}>{row.text}</span>
                    </div>
                  ))}
                </div>
                {/* Right column */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: "6px" }}>
                  {([
                    { icon: "→", color: "#C9A84C", text: "Gap Analysis — 6 categories", dim: false, star: false },
                    { icon: "→", color: "#C9A84C", text: "Page limits enforced", dim: false, star: false },
                    { icon: "→", color: "#C9A84C", text: "Market Analysis", dim: false, star: true },
                    { icon: "→", color: isFranchiseBuyer ? "#C9A84C" : "rgba(201,168,76,0.28)", text: "FDD Intelligence", dim: !isFranchiseBuyer, star: isFranchiseBuyer },
                  ] as Array<{ icon: string; color: string; text: string; dim: boolean; star: boolean }>).map((row, i) => (
                    <div key={i} style={{ display: "flex", gap: "7px", alignItems: "center", fontSize: "11px" }}>
                      <span style={{ color: row.color, flexShrink: 0 }}>{row.icon}</span>
                      <span style={{ color: row.dim ? "rgba(245,240,232,0.3)" : "rgba(245,240,232,0.85)", whiteSpace: "nowrap" as const }}>{row.text}</span>
                      {row.star && <span style={{ fontSize: "8px", color: "#C9A84C", fontWeight: 700 }}>★</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: "6px", fontSize: "9px", color: "rgba(201,168,76,0.45)", letterSpacing: "0.04em", whiteSpace: "nowrap" as const }}>★ Unique to e2go</div>
                </div>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "flex-end", justifyContent: "flex-end", flexShrink: 0 }}>
                <Link href={ctaHref} style={{ display: "block", padding: "17px 30px", background: "#C9A84C", color: "#0a0a0a", fontSize: "12px", fontWeight: 600, letterSpacing: "0.08em", fontFamily: "'DM Sans', sans-serif", textDecoration: "none", textAlign: "center" as const, whiteSpace: "nowrap" as const }}>
                  {isPartnership ? "Build Our Partnership Case" : "Build My Case with E2Go"}
                </Link>
                <div style={{ display: "flex", gap: "14px", marginTop: "10px" }}>
                  <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)" }}>✓ No subscription</span>
                  <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)" }}>✓ Documents yours forever</span>
                </div>
              </div>

            </div>
          </div>
        </div>
          );
        })()}

        {/* ─── ALSO AVAILABLE / NOT RELEVANT — removed from UI ─────────────────── */}
        {data.application_type !== "complete_partnership" && (() => {
          const bizAnswer = String(data.answers?.["Q0-08a"] || "").toLowerCase();
          const isFranchisePath = /franchise/i.test(bizAnswer) || showFranchiseTeaser;
          const isNewConcept = !isFranchisePath && !/acquisition/i.test(bizAnswer);

          return (
            <div style={{ padding: "52px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
              <div style={{ fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.6)", marginBottom: "8px" }}>Individual modules</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "10px" }}>Joining us mid-journey?</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)", lineHeight: 1.7, maxWidth: "560px", marginBottom: "32px" }}>
                E2Go is designed to be with you from the very first step — quiz, gap analysis, consulate matching, and a complete submission-ready file. If you&apos;re already mid-process and only need a specific piece, each module is available individually.
              </div>

              <div className="step-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                {/* FDD Intelligence */}
                {isFranchisePath ? (
                  <div style={{ border: "1px solid rgba(201,168,76,0.35)", padding: "22px", background: "rgba(201,168,76,0.02)", display: "flex", flexDirection: "column" as const }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "#C9A84C", marginBottom: "10px" }}>Relevant for your path</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>FDD Intelligence</div>
                    <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.6)", lineHeight: 1.65, marginBottom: "16px", flex: 1 }}>
                      5 engines extract the 50 fields that matter from your FDD — Item 7 investment validation, Item 19 unit economics, territory density, officer red flags. Findings inject directly into your case documents.
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Link href="/fdd" style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
                        {fddReceived ? "Analyse my FDD →" : "Learn more →"}
                      </Link>
                      <span style={{ fontSize: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#C9A84C", fontWeight: 300 }}>$495</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ border: "1px solid rgba(245,240,232,0.06)", padding: "22px", background: "rgba(245,240,232,0.008)", opacity: 0.5, display: "flex", flexDirection: "column" as const }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(245,240,232,0.35)", marginBottom: "10px" }}>Not applicable</div>
                    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 300, color: "rgba(245,240,232,0.45)", marginBottom: "8px" }}>FDD Intelligence</div>
                    <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.38)", lineHeight: 1.65, flex: 1 }}>
                      {isNewConcept
                        ? "FDD analysis is for franchise acquisitions only. Your new-concept case does not require it."
                        : "FDD analysis applies to franchise acquisitions. This module is not part of your recommended path."}
                    </div>
                  </div>
                )}

                {/* Market Analysis */}
                <div style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "22px", background: "rgba(201,168,76,0.01)", display: "flex", flexDirection: "column" as const }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "10px" }}>All business types</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Market Analysis</div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.6)", lineHeight: 1.65, marginBottom: "16px", flex: 1 }}>
                    Census ACS 5-year + BLS employment data for your exact sector and geography. TAM/SAM sizing, competitive landscape, industry benchmarks — embedded into your Business Plan, not appended as an afterthought.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link href="/market-analysis" style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>Learn more →</Link>
                    <span style={{ fontSize: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#C9A84C", fontWeight: 300 }}>$295</span>
                  </div>
                </div>

                {/* Business Plan */}
                <div style={{ border: "1px solid rgba(201,168,76,0.2)", padding: "22px", background: "rgba(201,168,76,0.01)", display: "flex", flexDirection: "column" as const }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(201,168,76,0.55)", marginBottom: "10px" }}>All business types</div>
                  <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>E-2 Business Plan</div>
                  <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.6)", lineHeight: 1.65, marginBottom: "16px", flex: 1 }}>
                    Produced by claude-opus-4-8 with your gap analysis, investor archetype, and market data loaded into a single structured prompt. Formatted to your consulate&apos;s confirmed page limits. Market Analysis included.
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Link href="/modules" style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>Learn more →</Link>
                    <span style={{ fontSize: "12px", fontFamily: "'Cormorant Garamond', Georgia, serif", color: "#C9A84C", fontWeight: 300 }}>$695</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "16px", fontSize: "10px", color: "rgba(245,240,232,0.3)", lineHeight: 1.6 }}>
                All three modules are included in the Complete Package ($1,495). Purchasing individually costs more.{" "}
                <Link href="/modules" style={{ color: "rgba(201,168,76,0.55)", textDecoration: "none" }}>See full module details →</Link>
              </div>
            </div>
          );
        })()}

        {/* ─── FLAGS — removed from UI ──────────────────────────────────────────── */}
        {(false as boolean) && flagsToShow.length > 0 && (
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

        {/* ─── DOCUMENT PACKAGE PREVIEW — removed from UI ───────────────────────── */}
        {(false as boolean) && <DocumentPackagePreview data={data} isLoggedIn={isLoggedIn} consulateName={consulate.name} />}

        {/* ─── FAQ — removed from UI ────────────────────────────────────────────── */}
        {(false as boolean) && (
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
        )}

        {/* ─── FRANCHISE TEASER — removed from UI ───────────────────────────── */}
        {(false as boolean) && showFranchiseTeaser && (
          <div style={{ padding: "32px 0", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
            <div style={{ padding: "20px 24px", border: "1px solid rgba(201,168,76,0.25)", background: "rgba(201,168,76,0.03)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "10px" }}>Franchise opportunity</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "20px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>Your profile matches franchise investment opportunities</div>
              <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.74)", lineHeight: 1.6, marginBottom: "16px" }}>Based on your industry interest and investment profile, we have identified E-2-proven franchise brands in your range. Introductions are made only with your consent.</div>
              <Link href="/fdd" style={{ display: "inline-block", padding: "11px 24px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.35)", color: "#C9A84C", fontSize: "12px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>Analyse an FDD →</Link>
            </div>
          </div>
        )}

        {/* ─── FDD CTA — removed from UI ─────────────────────────────────────── */}
        {(false as boolean) && showFddCta && (
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
