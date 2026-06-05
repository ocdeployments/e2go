"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import AuthImageSlider from "@/components/auth/AuthImageSlider";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

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
        setTimeout(() => {
          window.location.href = next;
        }, 2000);
      }
    } catch {
      setStatus('error');
      setErrorMessage("An unexpected error occurred");
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: "rgba(245,240,232,0.6)" }}>Creating your account...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
        <AuthImageSlider />
        <div className="w-full md:w-1/2 flex flex-col">
          <header className="w-full z-50 px-8 py-6" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </header>

          <main className="flex-1 flex items-center justify-center px-8 py-12">
            <div className="w-full max-w-md">
              <div className="p-8 text-center" style={{ background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.08)" }}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="font-medium mb-2" style={{ color: "#f5f0e8" }}>Check your email</p>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>We sent a confirmation link to {email}</p>
                <p className="text-xs mt-4" style={{ color: "rgba(245,240,232,0.6)" }}>Redirecting to dashboard...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
      <AuthImageSlider />

      <div className="w-full md:w-1/2 flex flex-col">
        <header className="w-full z-50 px-8 py-6" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>e2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <div className="p-8" style={{ background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Create your account</h1>
              <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)" }}>Start your E-2 visa application journey</p>

              {status === 'error' && (
                <div className="p-3 rounded-lg text-sm mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                    placeholder="Confirm your password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full font-medium py-3 transition-colors"
                  style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
                >
                  Create Account
                </button>

                <p className="text-xs text-center mt-4" style={{ color: "rgba(245,240,232,0.45)" }}>
                  By creating an account, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-[#C9A84C]">Terms of Service</Link> and{" "}
                  <Link href="/privacy" className="underline hover:text-[#C9A84C]">Privacy Policy</Link>
                </p>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                Already have an account?{" "}
                <Link href="/login" className="hover:text-[#C9A84C] underline" style={{ color: "#C9A84C" }}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0a" }}>
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
