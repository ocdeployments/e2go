"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get('error') === 'expired') {
      setError("That reset link has expired. Please request a new one.");
    }
  }, [searchParams]);

  const handleReset = async () => {
    if (!email) { setError("Enter your email address."); return; }
    const supabase = createBrowserSupabaseClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (err) { setError(err.message); } else { setSent(true); }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "400px", width: "100%", padding: "40px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C", marginBottom: "24px", textAlign: "center" as const }}>e2go</h1>
        </Link>

        {sent ? (
          <>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#f5f0e8", fontSize: "14px", textAlign: "center" as const, marginBottom: "24px" }}>
              If an account exists for {email}, a password reset link has been sent.
            </p>
            <Link href="/login" style={{ display: "block", textAlign: "center" as const, color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "underline" }}>
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.70)", fontSize: "14px", textAlign: "center" as const, marginBottom: "24px" }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
            {error && <p style={{ color: "#ef4444", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" }}>{error}</p>}
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: "100%", padding: "12px", marginBottom: "16px", background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.3)", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", borderRadius: 0, outline: "none" }}
            />
            <button
              onClick={handleReset}
              style={{ width: "100%", padding: "12px", background: "#C9A84C", color: "#0a0a0a", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", fontWeight: 500, border: "none", borderRadius: 0, cursor: "pointer" }}
            >
              Send Reset Link
            </button>
            <Link href="/login" style={{ display: "block", textAlign: "center" as const, marginTop: "16px", color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", textDecoration: "underline" }}>
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function ForgotPassword() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #C9A84C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </main>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
