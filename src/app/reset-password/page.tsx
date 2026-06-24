"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState("");
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      setHasSession(!!data.user);
    })();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setStatus('loading');
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setStatus('error');
      setError(updateError.message);
    } else {
      setStatus('success');
    }
  };

  if (hasSession === null) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "2px solid #C9A84C", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "400px", width: "100%", padding: "40px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)" }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C", marginBottom: "24px", textAlign: "center" }}>E2go</h1>
          </Link>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#ef4444", fontSize: "14px", textAlign: "center", marginBottom: "24px" }}>
            This reset link has expired or is invalid. Please request a new one.
          </p>
          <Link href="/forgot-password" style={{ display: "block", textAlign: "center", color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "underline" }}>
            Request a new link →
          </Link>
        </div>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "400px", width: "100%", padding: "40px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", textAlign: "center" as const }}>
          <Link href="/" style={{ textDecoration: "none" }}>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C", marginBottom: "24px" }}>E2go</h1>
          </Link>
          <div style={{ width: "48px", height: "48px", background: "rgba(201,168,76,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#C9A84C">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#f5f0e8", fontSize: "14px", fontWeight: 500, marginBottom: "8px" }}>Password updated</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.78)", fontSize: "13px", marginBottom: "24px" }}>You can now sign in with your new password.</p>
          <Link href="/login" style={{ display: "block", textAlign: "center", color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", textDecoration: "underline" }}>
            Back to Sign In →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ maxWidth: "400px", width: "100%", padding: "40px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)" }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 300, color: "#C9A84C", marginBottom: "24px", textAlign: "center" as const }}>E2go</h1>
        </Link>

        <p style={{ fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.70)", fontSize: "14px", textAlign: "center" as const, marginBottom: "24px" }}>
          Choose a new password for your account.
        </p>

        {error && (
          <p style={{ color: "#ef4444", fontSize: "13px", fontFamily: "'DM Sans', sans-serif", marginBottom: "16px" }}>{error}</p>
        )}

        <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input
            type="password"
            placeholder="New password (min. 8 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: "12px", background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.3)", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", borderRadius: 0, outline: "none", boxSizing: "border-box" as const }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            style={{ width: "100%", padding: "12px", background: "#0a0a0a", border: "1px solid rgba(201,168,76,0.3)", color: "#f5f0e8", fontFamily: "'DM Sans', sans-serif", fontSize: "14px", borderRadius: 0, outline: "none", boxSizing: "border-box" as const }}
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            style={{
              width: "100%",
              padding: "12px",
              background: status === 'loading' ? "rgba(201,168,76,0.5)" : "#C9A84C",
              color: "#0a0a0a",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              border: "none",
              borderRadius: 0,
              cursor: status === 'loading' ? "not-allowed" : "pointer",
            }}
          >
            {status === 'loading' ? 'Updating...' : 'Set New Password'}
          </button>
        </form>

        <Link href="/login" style={{ display: "block", textAlign: "center" as const, marginTop: "16px", color: "#C9A84C", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", textDecoration: "underline" }}>
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
