"use client";

// REACH CONTEXT: This page is reached via an email link sent after
// completing the eligibility quiz. It validates a single-use token,
// marks it as verified, stores a cookie, and redirects to /results.
// It is NOT linked from the main navigation or footer.

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyToken } from "../actions/verify-token";
import Link from "next/link";
import AuthImageSlider from "@/components/auth/AuthImageSlider";

type TokenResult = {
  valid: boolean;
  email?: string;
  outcome?: string;
  result_json?: Record<string, unknown>;
  quiz_session_id?: string;
  franchise_interest?: boolean;
  reason?: string;
};

function VerifyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifiedData, setVerifiedData] = useState<TokenResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No token provided.");
      setLoading(false);
      return;
    }

    const validate = async () => {
      const result = await verifyToken(token);
      if (!result.valid) {
        setError("This link has expired or is invalid.");
        setLoading(false);
        return;
      }

      // Store verified session cookie (24 hours)
      if (result.quiz_session_id) {
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
        document.cookie = `verified_session=${result.quiz_session_id}; expires=${expires}; path=/; SameSite=Lax`;
      }

      // Store result in localStorage for results page
      if (result.result_json) {
        localStorage.setItem("e2go_quiz_result", JSON.stringify(result.result_json));
      }

      setVerifiedData(result);
      setLoading(false);

      // Redirect to results with session ID
      const quizSessionId = result.quiz_session_id || "";
      router.replace(`/results?session=${quizSessionId}`);
    };
    validate();
  }, [token, router]);

  const handleResend = useCallback(async () => {
    if (!verifiedData?.quiz_session_id) return;
    setResending(true);
    try {
      await fetch("/api/email/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verifiedData.email,
          outcome: verifiedData.outcome,
          result_json: verifiedData.result_json,
          quiz_session_id: verifiedData.quiz_session_id,
          franchise_interest: verifiedData.franchise_interest,
        }),
      });
      setResent(true);
    } catch {
      // ignore
    } finally {
      setResending(false);
    }
  }, [verifiedData]);

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
        <AuthImageSlider />
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Verifying your link...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
        <AuthImageSlider />
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-8">
          <h1 className="text-2xl mb-4" style={{ color: '#f5f0e8', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>This link has expired</h1>
          <p className="mb-8" style={{ color: 'rgba(245,240,232,0.6)' }}>Verification links expire after 24 hours.</p>
          {resent ? (
            <p style={{ color: '#5DCAA5', fontSize: '14px', marginBottom: '16px' }}>New link sent. Check your email.</p>
          ) : (
            <button
              onClick={handleResend}
              disabled={resending}
              className="px-8 py-3"
              style={{
                background: '#C9A84C',
                color: '#0a0a0a',
                fontWeight: 500,
                borderRadius: 0,
                cursor: resending ? 'not-allowed' : 'pointer',
                opacity: resending ? 0.6 : 1,
                border: 'none',
                fontSize: '13px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
              }}
            >
              {resending ? 'Sending...' : 'Resend results'}
            </button>
          )}
          <Link href="/quiz" className="mt-6" style={{ color: 'rgba(245,240,232,0.4)', fontSize: '13px', textDecoration: 'underline' }}>
            Or retake the quiz
          </Link>
        </div>
      </div>
    );
  }

  // Redirecting...
  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
      <AuthImageSlider />
      <div className="w-full md:w-1/2 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div style={{ color: "rgba(201,168,76,0.6)", fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Redirecting to your results...
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex" style={{ background: '#0a0a0a' }}>
        <AuthImageSlider />
        <div className="w-full md:w-1/2 flex items-center justify-center text-[#C9A84C]">Loading...</div>
      </div>
    }>
      <VerifyPageInner />
    </Suspense>
  );
}
