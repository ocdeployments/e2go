"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  // Three states per Rule 13
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleEmailPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setStatus('error');
        setErrorMessage("Invalid email or password");
      } else {
        setStatus('success');
        window.location.href = next ?? '/dashboard';
      }
    } catch {
      setStatus('error');
      setErrorMessage("An unexpected error occurred");
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setStatus('error');
      setErrorMessage("Please enter your email first");
      return;
    }

    setStatus('loading');
    setErrorMessage("");

    try {
      const supabase = createBrowserSupabaseClient();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
      } else {
        setMagicLinkSent(true);
        setStatus('idle');
      }
    } catch {
      setStatus('error');
      setErrorMessage("An unexpected error occurred");
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--navy)" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: "var(--white-dim)" }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  // Magic link sent state
  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--navy)" }}>
        <header className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
          <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "var(--teal)", fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
          <div className="w-full max-w-md">
            <div className="glass p-8 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--teal-dim)" }}>
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "var(--teal)" }}>
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <p className="font-medium mb-2" style={{ color: "var(--white)" }}>Check your email</p>
              <p className="text-sm" style={{ color: "var(--white-dim)" }}>We sent a magic link to {email}</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Idle/Error state - show form
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--navy)" }}>
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", background: "rgba(6,13,31,0.8)", borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex justify-between items-center h-16 px-4 max-w-xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "var(--teal)", fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12 pt-24">
        <div className="w-full max-w-md">
          <div className="glass p-8">
            <h1 className="text-2xl font-bold mb-2 font-playfair" style={{ color: "var(--white)" }}>Welcome back</h1>
            <p className="mb-8" style={{ color: "var(--white-dim)" }}>Sign in to continue your application</p>

            {status === 'error' && (
              <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
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
                  className="w-full px-4 py-3 rounded-lg border bg-[var(--glass-bg)] text-[var(--white)] focus:outline-none"
                  style={{ borderColor: "var(--glass-border)" }}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="w-full font-medium py-3 rounded-lg transition-colors"
                style={{ background: "var(--teal)", color: "#fff" }}
              >
                Sign In
              </button>

              <div className="text-center">
                <Link href="/forgot-password" className="text-sm hover:underline" style={{ color: "var(--teal)" }}>
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" style={{ borderColor: "var(--glass-border)" }}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2" style={{ color: "var(--white-dim)" }}>or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                className="w-full border font-medium py-3 rounded-lg transition-colors hover:opacity-80"
                style={{ borderColor: "var(--teal)", color: "var(--teal)" }}
              >
                Send Magic Link
              </button>
            </form>

            <p className="mt-6 text-center text-sm" style={{ color: "var(--white-dim)" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="hover:underline" style={{ color: "var(--teal)" }}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--navy)" }}>
        <div className="w-8 h-8 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}