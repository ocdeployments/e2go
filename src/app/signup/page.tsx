"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  // Three states per Rule 13
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage("");

    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMessage("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setStatus('error');
      setErrorMessage("Password must be at least 8 characters");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
        },
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setStatus('success');
        // Redirect after showing success message
        setTimeout(() => {
          window.location.href = next;
        }, 2000);
      }
    } catch {
      setStatus('error');
      setErrorMessage("An unexpected error occurred");
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: "var(--white-dim)" }}>Creating your account...</p>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
        <header className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <div className="w-full max-w-md">
            <div className="glass p-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--teal-dim)" }}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--gold)" }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <p className="font-medium mb-2" style={{ color: "var(--white)" }}>Check your email</p>
              <p className="text-sm" style={{ color: "var(--white-dim)" }}>We sent a confirmation link to {email}</p>
              <p className="text-xs mt-4" style={{ color: "var(--white-dim)" }}>Redirecting to dashboard...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Idle/Error state - show form
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--gold)", fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
        <div className="w-full max-w-md">
          <div className="glass p-8">
            <h1 className="text-2xl font-bold mb-2 font-playfair" style={{ color: "var(--white)" }}>Create your account</h1>
            <p className="mb-8" style={{ color: "var(--white-dim)" }}>Start your E-2 visa application journey</p>

            {status === 'error' && (
              <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--white)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border bg-[var(--glass-bg)] text-[var(--white)] focus:outline-none"
                  style={{ borderColor: "var(--glass-border)" }}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--white)" }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-lg border bg-[var(--glass-bg)] text-[var(--white)] focus:outline-none"
                  style={{ borderColor: "var(--glass-border)" }}
                  placeholder="Min. 8 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--white)" }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 rounded-lg border bg-[var(--glass-bg)] text-[var(--white)] focus:outline-none"
                  style={{ borderColor: "var(--glass-border)" }}
                  placeholder="Confirm your password"
                />
              </div>

              <button
                type="submit"
                className="w-full font-medium py-3 rounded-lg transition-colors"
                style={{ background: "var(--gold)", color: "#fff" }}
              >
                Create Account
              </button>

              <p className="text-xs text-center" style={{ color: "var(--white-dim)" }}>
                By creating an account, you agree to our{" "}
                <Link href="#" className="underline">Terms of Service</Link> and{" "}
                <Link href="#" className="underline">Privacy Policy</Link>
              </p>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: "var(--white-dim)" }}>
              Already have an account?{" "}
              <Link href="/login" className="hover:underline" style={{ color: "var(--gold)" }}>
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 border-4 border-[var(--gold)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}