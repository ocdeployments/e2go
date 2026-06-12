"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { getPricingTier, PRICING_TIERS } from "@/lib/pricing-tier";
import { createAccountFromVerifiedEmail } from "../actions/create-account";
import flagExplanations from "../../data/flag_explanations.json";

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

function getTimelineWeeks(data: ResultData): { weeksMin: number; weeksMax: number } {
  const hasBusiness = (data.answers["Q0-08"] as string || "").includes("specific business");
  if (hasBusiness) return { weeksMin: 10, weeksMax: 14 };
  return { weeksMin: 16, weeksMax: 22 };
}

function getInterviewMonthRange(weeksMin: number, weeksMax: number): string {
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const earliestDate = new Date(today);
  earliestDate.setDate(today.getDate() + weeksMin * 7);

  const latestDate = new Date(today);
  latestDate.setDate(today.getDate() + weeksMax * 7);

  const earliestMonth = monthNames[earliestDate.getMonth()];
  const latestMonth = monthNames[latestDate.getMonth()];
  const earliestYear = earliestDate.getFullYear();
  const latestYear = latestDate.getFullYear();

  if (earliestMonth === latestMonth && earliestYear === latestYear) {
    return `${earliestMonth} ${earliestYear}`;
  }
  if (earliestYear === latestYear) {
    return `${earliestMonth} — ${latestMonth} ${earliestYear}`;
  }
  return `${earliestMonth} ${earliestYear} — ${latestMonth} ${latestYear}`;
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function getTargetDateMessage(targetDate: string | null | undefined): string | null {
  if (!targetDate || targetDate === "Not sure yet") return null;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const now = new Date();
  let monthsToAdd = 0;
  if (targetDate.includes("Within 6 months")) monthsToAdd = 6;
  else if (targetDate.includes("6 to 12")) monthsToAdd = 9;
  else if (targetDate.includes("12 to 24")) monthsToAdd = 18;
  else return null;
  const target = new Date(now);
  target.setMonth(target.getMonth() + monthsToAdd);
  const targetMonth = monthNames[target.getMonth()];
  const targetYear = target.getFullYear();
  const submitBy = new Date(target);
  submitBy.setMonth(submitBy.getMonth() - 4);
  const submitMonth = monthNames[submitBy.getMonth()];
  const submitYear = submitBy.getFullYear();
  return `To be in the US by ${targetMonth} ${targetYear}, you need to submit your application by ${submitMonth} ${submitYear}.`;
}

function getConsulateIntel(country: string): { name: string; intel: string } {
  const map: Record<string, { name: string; intel: string }> = {
    "Canada": {
      name: "Toronto Consulate",
      intel: "Currently processing E-2 applications in 8–12 weeks from submission to interview. Service-based franchises and established brands have the highest approval rates in recent adjudications."
    },
    "United Kingdom": {
      name: "London Embassy",
      intel: "Processing times are currently 10–14 weeks. UK applicants benefit from strong treaty standing. Business plans with detailed job creation projections perform well."
    },
    "Germany": {
      name: "Frankfurt Consulate",
      intel: "Processing times average 8–12 weeks. German applicants have strong treaty standing. Investment documentation standards are thorough — source of funds narratives must be precise."
    },
    "Australia": {
      name: "Sydney Consulate",
      intel: "Processing times average 10–16 weeks. Australian applicants have strong treaty standing. Franchise applications with established U.S. brands perform consistently well."
    },
    "Japan": {
      name: "Tokyo Embassy",
      intel: "Processing times average 8–14 weeks. Japanese applicants benefit from a long-standing treaty relationship with the U.S. Investment documentation requirements are thorough."
    },
  };
  return map[country] || {
    name: "Your Home Consulate",
    intel: "Processing times vary by consulate. We track approval patterns across all 82 treaty countries. Your specific consulate intelligence will be surfaced during your application preparation."
  };
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/* ────────────────────────────────────────────────────
   Email Gate — shown for anonymous users without verification
   ──────────────────────────────────────────────────── */
function EmailGate({
  onBackToQuiz,
}: {
  onBackToQuiz: () => void;
}) {
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
      // Look up quiz session by email
      const { data: session } = await supabase
        .from("quiz_sessions")
        .select("id, result_json, outcome")
        .eq("email", email)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        setError("No quiz results found for this email. Take the quiz first.");
        setSending(false);
        return;
      }

      await fetch("/api/email/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          outcome: session.outcome,
          result_json: session.result_json,
          quiz_session_id: session.id,
          franchise_interest: session.result_json?.franchise_interest || false,
        }),
      });

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSending(false);
    }
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
            <p style={{ color: "rgba(245,240,232,0.5)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "8px" }}>
              We sent a verification link to <strong style={{ color: "#f5f0e8" }}>{email}</strong>
            </p>
            <p style={{ color: "rgba(245,240,232,0.35)", fontSize: "13px", textAlign: "center", lineHeight: 1.6 }}>
              Click the link in the email to view your results. The link expires in 24 hours.
            </p>
            <button
              onClick={onBackToQuiz}
              style={{
                marginTop: "32px",
                padding: "12px 24px",
                background: "transparent",
                border: "1px solid rgba(201,168,76,0.3)",
                color: "rgba(201,168,76,0.7)",
                fontSize: "12px",
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                fontFamily: "'DM Sans', sans-serif",
                borderRadius: 0,
              }}
            >
              ← Back to quiz
            </button>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "12px", textAlign: "center" }}>Your results are ready</h1>
            <p style={{ color: "rgba(245,240,232,0.5)", fontSize: "14px", textAlign: "center", lineHeight: 1.6, marginBottom: "32px" }}>
              Enter your email and we&apos;ll send you a secure link to view your eligibility results.
            </p>

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(201,168,76,0.04)",
                  border: "1px solid rgba(201,168,76,0.2)",
                  color: "#f5f0e8",
                  fontSize: "14px",
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: 0,
                  outline: "none",
                  marginBottom: "16px",
                  boxSizing: "border-box",
                }}
              />

              <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "24px", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={caslConsent}
                  onChange={(e) => setCaslConsent(e.target.checked)}
                  style={{ marginTop: "3px", accentColor: "#C9A84C", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)", lineHeight: 1.5 }}>
                  I consent to receiving email from e2go.app. You can unsubscribe at any time. View our{' '}
                  <a href="/terms" style={{ color: "#C9A84C", textDecoration: "underline" }}>Terms of Service</a>.
                </span>
              </label>

              <button
                type="submit"
                disabled={sending || !email}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "#C9A84C",
                  border: "none",
                  color: "#0a0a0a",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: sending || !email ? "not-allowed" : "pointer",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase" as const,
                  fontFamily: "'DM Sans', sans-serif",
                  borderRadius: 0,
                  opacity: sending || !email ? 0.5 : 1,
                }}
              >
                {sending ? "Sending..." : "Send my results"}
              </button>

              {error && (
                <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", color: "rgba(245,240,232,0.7)", lineHeight: 1.5 }}>
                  {error}
                </div>
              )}
            </form>

            <button
              onClick={onBackToQuiz}
              style={{
                marginTop: "24px",
                padding: "8px 16px",
                background: "transparent",
                border: "none",
                color: "rgba(245,240,232,0.3)",
                fontSize: "12px",
                cursor: "pointer",
                textDecoration: "underline",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Or retake the quiz
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Name Capture — shown on first verified visit (no account yet)
   ──────────────────────────────────────────────────── */
function NameCaptureForm({
  email,
  quizSessionId,
  onSuccess,
  onDismiss,
}: {
  email: string;
  quizSessionId: string;
  onSuccess: () => void;
  onDismiss: () => void;
}) {
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

    if (!firstName || !lastName || !newPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setCreating(true);

    try {
      const result = await createAccountFromVerifiedEmail({
        email,
        password: newPassword,
        firstName,
        lastName,
        quizSessionId,
      });

      if (result.error) {
        if (result.error.includes("already") || result.error.includes("exists") || result.error.includes("registered")) {
          setAccountExists(true);
        } else {
          setError(result.error);
        }
      } else {
        // Account created — reload to pick up auth session
        onSuccess();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  if (accountExists) {
    return (
      <div style={{ padding: "28px", border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.03)", marginBottom: "24px" }}>
        <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Account found</div>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
          We found an account with this email
        </div>
        <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "20px" }}>
          Log in to link this result to your account, or continue viewing as a guest.
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <Link
            href="/login"
            style={{
              padding: "12px 24px",
              background: "#C9A84C",
              border: "none",
              color: "#0a0a0a",
              fontSize: "12px",
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Log in
          </Link>
          <button
            onClick={onDismiss}
            style={{
              padding: "12px 24px",
              background: "transparent",
              border: "1px solid rgba(201,168,76,0.25)",
              color: "rgba(201,168,76,0.7)",
              fontSize: "12px",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
            }}
          >
            Continue as guest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "28px", border: "1px solid rgba(201,168,76,0.2)", background: "rgba(201,168,76,0.03)", marginBottom: "24px" }}>
      <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>One last thing</div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "22px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>
        What&apos;s your name?
      </div>
      <div style={{ fontSize: "13px", color: "rgba(245,240,232,0.4)", lineHeight: 1.6, marginBottom: "20px" }}>
        We&apos;ll use this for your application documents.
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            style={{
              padding: "12px 14px",
              background: "rgba(201,168,76,0.04)",
              border: "1px solid rgba(201,168,76,0.15)",
              color: "#f5f0e8",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
              outline: "none",
            }}
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            style={{
              padding: "12px 14px",
              background: "rgba(201,168,76,0.04)",
              border: "1px solid rgba(201,168,76,0.15)",
              color: "#f5f0e8",
              fontSize: "14px",
              fontFamily: "'DM Sans', sans-serif",
              borderRadius: 0,
              outline: "none",
            }}
          />
        </div>
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "rgba(201,168,76,0.04)",
            border: "1px solid rgba(201,168,76,0.15)",
            color: "#f5f0e8",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 0,
            outline: "none",
            marginBottom: "12px",
            boxSizing: "border-box",
          }}
        />
        <input
          type="password"
          placeholder="Confirm password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "rgba(201,168,76,0.04)",
            border: "1px solid rgba(201,168,76,0.15)",
            color: "#f5f0e8",
            fontSize: "14px",
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 0,
            outline: "none",
            marginBottom: "20px",
            boxSizing: "border-box",
          }}
        />

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", fontSize: "13px", color: "rgba(245,240,232,0.7)", marginBottom: "16px", lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={creating}
          style={{
            width: "100%",
            padding: "13px",
            background: "#C9A84C",
            border: "none",
            color: "#0a0a0a",
            fontSize: "13px",
            fontWeight: 500,
            cursor: creating ? "not-allowed" : "pointer",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            fontFamily: "'DM Sans', sans-serif",
            borderRadius: 0,
            opacity: creating ? 0.5 : 1,
          }}
        >
          {creating ? "Creating account..." : "Continue"}
        </button>
      </form>
    </div>
  );
}

/* ────────────────────────────────────────────────────
   Results Page — main component
   ──────────────────────────────────────────────────── */
function ResultsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Verification states
  const [verificationState, setVerificationState] = useState<'loading' | 'unverified' | 'verified' | 'authenticated'>('loading');
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizEmail, setQuizEmail] = useState<string | null>(null);
  const [nameCaptureDismissed, setNameCaptureDismissed] = useState(false);

  useEffect(() => {
    const loadResult = async () => {
      // 1. Check authentication
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        setIsLoggedIn(true);
        setVerificationState('authenticated');

        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name")
          .eq("id", user.id)
          .single();
        if (profile?.first_name) setUserName(profile.first_name);

        // Load results from localStorage then Supabase
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) {
          try { setData(JSON.parse(stored)); } catch { /* ignore */ }
        }

        if (!stored) {
          const { data: session } = await supabase
            .from("quiz_sessions")
            .select("result_json, outcome, score")
            .eq("user_id", user.id)
            .order("completed_at", { ascending: false })
            .limit(1)
            .single();
          if (session?.result_json) setData(session.result_json as ResultData);
        }

        setLoading(false);
        return;
      }

      // 2. Anonymous: check verification cookie or query param
      const paramSession = searchParams.get('session');
      const cookieSession = getCookie('verified_session');
      const sessionId = paramSession || cookieSession;

      if (!sessionId) {
        setVerificationState('unverified');
        setLoading(false);
        return;
      }

      // 3. Verified session found — load data
      setQuizSessionId(sessionId);

      const { data: session } = await supabase
        .from("quiz_sessions")
        .select("result_json, outcome, email")
        .eq("id", sessionId)
        .single();

      if (session?.result_json) {
        setData(session.result_json as ResultData);
        setQuizEmail(session.email);
        setVerificationState('verified');
      } else {
        // Fallback to localStorage
        const stored = localStorage.getItem("e2go_quiz_result");
        if (stored) {
          try {
            setData(JSON.parse(stored));
            setVerificationState('verified');
          } catch {
            setVerificationState('unverified');
          }
        } else {
          setVerificationState('unverified');
        }
      }

      setLoading(false);
    };

    loadResult();
  }, [supabase, searchParams]);

  // Loading state
  if (loading || verificationState === 'loading') {
    return (
      <div style={{ background: "#0a0a0a", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading your result...</div>
      </div>
    );
  }

  // Email gate for unverified anonymous users
  if (verificationState === 'unverified') {
    return (
      <EmailGate onBackToQuiz={() => router.push('/quiz')} />
    );
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

  const allFlags = [...(data.warnings || []), ...(data.attorney_flags || [])];
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
      {
        key: 'spouse',
        show: hasSpouse,
        priority: true,
        title: 'Your spouse can work anywhere in the U.S.',
        desc: 'Your spouse receives work authorisation and can work for any U.S. employer in any role — not just your business.',
      },
      {
        key: 'children',
        show: hasChildren,
        priority: true,
        title: 'Your children attend U.S. schools',
        desc: 'Your children receive dependent status and can attend U.S. public and private schools as legal residents.',
      },
      {
        key: 'freedom',
        show: true,
        priority: !hasSpouse && !hasChildren,
        title: 'No employer. No sponsorship. No queue.',
        desc: 'You move to the U.S. on your own terms — by building something. No waiting for an employer to file on your behalf.',
      },
      {
        key: 'renewable',
        show: true,
        priority: false,
        title: 'Renewable with no expiry date',
        desc: 'The E-2 renews indefinitely as long as your business operates. There is no fixed end to your time in the U.S.',
      },
      {
        key: 'nocap',
        show: true,
        priority: false,
        title: 'No cap, no lottery, no waiting list',
        desc: 'Unlike the H-1B, there is no annual quota. If you qualify, you apply. Your eligibility is not subject to chance.',
      },
      {
        key: 'country',
        show: true,
        priority: false,
        title: `${d.country || 'Your country'} has an active E-2 treaty`,
        desc: `Citizens of ${d.country || 'your country'} have full access to the E-2 programme. Your treaty standing is confirmed.`,
      },
    ];

    return all
      .filter(b => b.show)
      .sort((a, b) => (b.priority ? 1 : 0) - (a.priority ? 1 : 0))
      .slice(0, 4);
  }

  const showNameCapture = verificationState === 'verified' && !isLoggedIn && !nameCaptureDismissed;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#f5f0e8" }}>
      <style>{`
        @media (max-width: 640px) {
          .benefits-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ padding: "18px 40px", borderBottom: "1px solid rgba(201,168,76,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "17px", color: "#C9A84C", fontWeight: 300 }}>E2go<span style={{ color: "rgba(245,240,232,0.9)" }}>.app</span></div>
        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.25)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Eligibility result</div>
      </div>

      <div style={{ padding: "56px 40px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
        <div style={{ maxWidth: "720px" }}>
          <button
            onClick={() => router.push('/quiz/review')}
            style={{
              fontSize: '13px',
              color: 'rgba(245,240,232,0.45)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              padding: '0',
              marginBottom: '32px',
              fontFamily: "'DM Sans', sans-serif",
              display: 'block',
            }}
          >
            ← Review or change my answers
          </button>
          <div style={{ fontSize: "10px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.6)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: "0 0 24px", height: "1px", background: "rgba(201,168,76,0.4)" }} />
            Assessment complete
          </div>

          {isLoggedIn && userName ? (
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "8px" }}>
              {userName}, here are your results
            </div>
          ) : !isLoggedIn ? (
            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#f5f0e8", marginBottom: "4px" }}>
                Your eligibility results
              </div>
              {verificationState === 'verified' && (
                <div style={{ fontSize: "13px", color: "#5DCAA5", letterSpacing: "0.02em" }}>
                  ✓ Email verified
                </div>
              )}
            </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "16px" }}>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "80px", fontWeight: 300, color: "#C9A84C", lineHeight: 1 }}>{score}</div>
            <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "32px", fontWeight: 300, color: "rgba(201,168,76,0.4)", lineHeight: 1, paddingBottom: "10px" }}>/100</div>
            <div style={{ flex: 1, paddingBottom: "16px" }}>
              <div style={{ height: "3px", background: "rgba(201,168,76,0.12)", marginBottom: "8px" }}>
                <div style={{ height: "100%", background: "#C9A84C", width: `${score}%`, transition: "width 1s cubic-bezier(.4,0,.2,1)" }} />
              </div>
              <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase" }}>{scoreLabel}</div>
            </div>
          </div>
          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "36px", fontWeight: 300, color: "#f5f0e8", lineHeight: 1.25, marginBottom: "12px", letterSpacing: "-0.01em" }}>{verdict}</div>
          <div style={{ fontSize: "14px", color: "rgba(245,240,232,0.45)", lineHeight: 1.7, maxWidth: "560px" }}>{verdictSub}</div>
          {isLoggedIn && (
            <div style={{ marginTop: "16px", padding: "12px 16px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", fontSize: "13px", color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              ✓ Your profile has been saved. You can return to these results any time from your dashboard.
            </div>
          )}
        </div>
      </div>

      {/* Name capture for verified non-authenticated users */}
      {showNameCapture && quizSessionId && quizEmail && (
        <div style={{ padding: "40px 40px 0", maxWidth: "720px" }}>
          <NameCaptureForm
            email={quizEmail}
            quizSessionId={quizSessionId}
            onSuccess={() => {
              // Account created — reload to pick up new auth session
              window.location.reload();
            }}
            onDismiss={() => {
              // Guest dismissed — hide the form, keep viewing results
              setNameCaptureDismissed(true);
            }}
          />
        </div>
      )}

      {/* Guest: show link to create account */}
      {verificationState === 'verified' && !isLoggedIn && nameCaptureDismissed && (
        <div style={{ padding: "20px 40px", borderBottom: "1px solid rgba(201,168,76,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", maxWidth: "720px" }}>
            <Link href="/signup" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "underline", letterSpacing: "0.02em" }}>
              Create a free account to save these results
            </Link>
          </div>
        </div>
      )}

      <div style={{ padding: "40px", display: "grid", gridTemplateColumns: "1fr 320px", gap: "32px", maxWidth: "1100px" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your profile</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {[
                { label: "Treaty country", value: data.country || "—", ok: !!data.country },
                { label: "Investment range", value: data.investment_range || "—", ok: true },
                { label: "Application type", value: (() => { const base = data.application_type === "partnership" ? "Partnership — consular processing" : "Solo — consular processing"; const d = (data.dependents || "").toLowerCase(); const family = d === "spouse_and_children" ? " · You + spouse + children" : d === "spouse_only" ? " · You + spouse" : d === "children_only" ? " · You + children" : ""; return base + family; })(), gold: true },
                { label: "Dependents", value: data.dependents || "Just me", neutral: true },
                { label: "Business status", value: (data.answers?.["Q0-08"] as string) || "—", neutral: true },
                { label: "Funds documentation", value: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) ? "Needs attention" : "Clear", warn: (data.warnings || []).some(w => w.includes("gap") || w.includes("docum")) },
              ].map(cell => (
                <div key={cell.label} style={{ padding: "14px 16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(245,240,232,0.3)", marginBottom: "5px" }}>{cell.label}</div>
                  <div style={{ fontSize: "14px", color: cell.ok ? "#5DCAA5" : cell.gold ? "#C9A84C" : cell.warn ? "rgba(239,159,39,0.9)" : "#f5f0e8", lineHeight: 1.4 }}>
                    {cell.ok && "✓ "}{cell.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(flagsToShow.length > 0 || clearItems.length > 0) && (
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Areas requiring attention</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {flagsToShow.map(({ code, info, isAttorney }) => (
                  <div key={code} style={{ display: "flex", gap: "12px", padding: "14px 16px", border: `1px solid ${isAttorney ? "rgba(239,100,100,0.25)" : "rgba(239,159,39,0.25)"}`, background: isAttorney ? "rgba(239,100,100,0.04)" : "rgba(239,159,39,0.04)" }}>
                    <div style={{ fontSize: "16px", color: isAttorney ? "rgba(239,100,100,0.8)" : "rgba(239,159,39,0.8)", flexShrink: 0, marginTop: "1px" }}>{isAttorney ? "⚖" : "!"}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: isAttorney ? "rgba(239,100,100,0.95)" : "rgba(239,159,39,0.95)", marginBottom: "3px" }}>{info.plain_language}</div>
                      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "8px" }}>{info.why_it_matters}</div>
                      {data.answers?.[info.question_id] && (
                        <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.3)", marginBottom: "8px" }}>
                          Your answer: &ldquo;{Array.isArray(data.answers[info.question_id]) ? (data.answers[info.question_id] as string[]).join(", ") : String(data.answers[info.question_id])}&rdquo;
                        </div>
                      )}
                      <a href={`/quiz?edit=${info.question_id}`} style={{ fontSize: "11px", color: "#C9A84C", textDecoration: "underline" }}>
                        {info.edit_label} →
                      </a>
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
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "#f5f0e8", marginBottom: "4px", lineHeight: 1.4 }}>
                    {benefit.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6 }}>
                    {benefit.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Estimated path to your interview</div>
            <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.1)", background: "rgba(201,168,76,0.02)", marginBottom: "12px" }}>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "28px", fontWeight: 300, color: "#C9A84C", marginBottom: "4px" }}>{timeline}</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.4)" }}>Your estimated interview window, based on your profile and current processing times. Calculated from today, {formatToday()}.</div>
            </div>
            {targetDateMsg && (
              <div style={{ padding: "12px 16px", border: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)", marginTop: "8px", marginBottom: "12px" }}>
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

          <div style={{ padding: "16px", border: "1px solid rgba(201,168,76,0.15)", background: "rgba(201,168,76,0.03)" }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "8px" }}>Important: Officer discretion</div>
            <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.65 }}>
              Consular officers have discretion under 9 FAM to request additional documentation beyond what is listed in standard checklists. The most common additional requests are:
            </div>
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

          <div>
            <div style={{ fontSize: "10px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "14px" }}>Your next steps</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {[
                { title: "Create your account", desc: isLoggedIn ? "Your result is saved to your account." : "Save this result. Begin your application. Takes 60 seconds." },
                { title: "Select your business", desc: data.franchise_interest ? "We can connect you with E-2 specialist franchise brokers in your investment range." : "Complete the business type advisor to confirm your business qualifies." },
                { title: "Complete the document interview", desc: "Our guided engine builds your complete application package — cover letter, source of funds, business plan, and all supporting documents." },
                { title: "Download your consulate package", desc: "A complete, consulate-formatted binder ready for your interview. Every tab, every document, in the correct order." },
              ].map((step, i) => (
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

          <div>
            <Link href={`/pricing?tier=${data.application_type}&dependents=${encodeURIComponent(data.dependents || "none")}`}>
              <button style={{ width: "100%", padding: "15px 24px", background: "#C9A84C", border: "none", color: "#0a0a0a", fontSize: "13px", fontWeight: 500, cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                Start my application →
              </button>
            </Link>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

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

          {data.franchise_interest && (
            <div style={{ padding: "20px", border: "1px solid rgba(201,168,76,0.12)", background: "rgba(201,168,76,0.02)" }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", marginBottom: "10px" }}>Franchise broker network</div>
              <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, fontSize: "17px", color: "#f5f0e8", marginBottom: "8px" }}>We can connect you with the right broker</div>
              <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.45)", lineHeight: 1.6, marginBottom: "14px" }}>Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent.</div>
              {["FranConnect Advisors — E-2 specialist", "Gateway Franchise Group — Service franchises"].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <div style={{ width: "32px", height: "32px", border: "1px solid rgba(201,168,76,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#C9A84C", flexShrink: 0 }}>B</div>
                  <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.55)" }}>{b}</div>
                </div>
              ))}
              <button style={{ width: "100%", padding: "11px", background: "transparent", border: "1px solid rgba(201,168,76,0.25)", color: "rgba(201,168,76,0.7)", fontSize: "11px", cursor: "pointer", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif", borderRadius: 0, marginTop: "4px" }}>Request an introduction →</button>
            </div>
          )}

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
