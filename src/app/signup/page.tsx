"use client";

import { useState, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import AuthImageSlider from "@/components/auth/AuthImageSlider";

function SignupForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [status, setStatus] = useState<string>('idle');
  const [errorMessage, setErrorMessage] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Terms acceptance state
  const termsBoxRef = useRef<HTMLDivElement>(null);
  const [hasScrolledTerms, setHasScrolledTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // CASL consent state
  const [caslConsent, setCaslConsent] = useState(false);

  const handleTermsScroll = () => {
    const el = termsBoxRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
    if (atBottom) setHasScrolledTerms(true);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage("");

    if (!firstName.trim() || !lastName.trim()) {
      setStatus('error');
      setErrorMessage("First name and last name are required");
      return;
    }

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

    if (!termsAccepted) {
      setStatus('error');
      setErrorMessage("You must accept the Terms of Service to create an account");
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });

      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }

      // Upsert profile with first_name, last_name, and CASL consent
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: email,
            casl_consent: caslConsent,
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          // Non-blocking — account is created, profile write is best-effort
        }

        // Record terms acceptance
        try {
          await fetch('/api/auth/accept-terms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
        } catch {
          console.error('Terms acceptance recording failed — non-blocking');
        }
      }

      setStatus('success');
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
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </header>

          <main className="flex-1 flex items-center justify-center px-8 py-12">
            <div className="w-full max-w-md">
              <div className="p-8 text-center" style={{ background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.08)" }}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="font-medium mb-2" style={{ color: "#f5f0e8" }}>Check your email</p>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>We sent a confirmation link to {email}</p>
                <p className="text-xs mt-4" style={{ color: "rgba(245,240,232,0.35)" }}>Please verify your email before signing in.</p>
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
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            <div className="p-8" style={{ background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Create your account</h1>
              <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)" }}>Start your E-2 visa application journey</p>

              {status === 'error' && (
                <div className="p-3 text-sm mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", borderRadius: 0 }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                      First name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                      placeholder="Last name"
                    />
                  </div>
                </div>

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

                {/* Scrollable terms box */}
                <div
                  ref={termsBoxRef}
                  onScroll={handleTermsScroll}
                  style={{
                    height: '240px',
                    overflowY: 'auto',
                    border: '1px solid rgba(201,168,76,0.2)',
                    padding: '16px',
                    marginTop: '24px',
                    background: 'rgba(201,168,76,0.02)',
                    fontSize: '12px',
                    lineHeight: '1.7',
                    color: 'rgba(245,240,232,0.6)',
                  }}
                >
                  <p style={{ fontWeight: 500, color: 'rgba(245,240,232,0.8)', marginBottom: '12px', fontSize: '13px' }}>
                    E2go Terms of Service Summary
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    E2go is a document preparation platform. It is not a law firm
                    and does not provide legal advice. No attorney-client relationship
                    is created by using this platform.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    Documents generated by E2go are produced using artificial
                    intelligence. AI documents may contain errors. You are
                    responsible for reading every document carefully and verifying
                    its accuracy before submitting it to any government authority.
                    E2go&apos;s responsibility ends at the point of download.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    E2go does not guarantee visa approval. All consular decisions
                    are made by U.S. government officers exercising independent
                    discretion. A strong eligibility score does not mean your visa
                    will be approved.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    Payment is final once document generation has begun. If you
                    have not started generation, you may request a refund within
                    72 hours of purchase.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    Your personal information is encrypted and is not sold to
                    third parties. If you are in Canada, PIPEDA applies to your
                    data. If you are in the EU, GDPR applies. If you are in
                    California, CCPA applies. You may request deletion of your
                    data at any time by contacting privacy@e2go.app.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    These Terms are governed by the laws of Texas, United States.
                    Disputes are resolved by binding arbitration.
                  </p>
                  <p style={{ marginBottom: '10px' }}>
                    By accepting, you confirm you have read these Terms, you are
                    at least 18 years old, and you agree to be bound by them.
                  </p>
                  <p>
                    Read the full Terms of Service at{' '}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#C9A84C', textDecoration: 'underline' }}>
                      e2go.app/terms
                    </a>
                  </p>
                </div>

                {/* Terms checkbox — disabled until scroll */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginTop: '16px',
                  opacity: hasScrolledTerms ? 1 : 0.35,
                  pointerEvents: hasScrolledTerms ? 'auto' : 'none',
                }}>
                  <input
                    type="checkbox"
                    id="terms-accept"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    disabled={!hasScrolledTerms}
                    style={{
                      width: '16px',
                      height: '16px',
                      marginTop: '2px',
                      accentColor: '#C9A84C',
                      cursor: hasScrolledTerms ? 'pointer' : 'not-allowed',
                      flexShrink: 0,
                    }}
                  />
                  <label
                    htmlFor="terms-accept"
                    style={{
                      fontSize: '13px',
                      color: 'rgba(245,240,232,0.7)',
                      lineHeight: '1.5',
                      cursor: hasScrolledTerms ? 'pointer' : 'default',
                    }}
                  >
                    I have read and agree to the{' '}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#C9A84C', textDecoration: 'underline' }}
                    >
                      Terms of Service
                    </a>
                    . I understand that E2go is not a law firm, does not provide
                    legal advice, and that I am responsible for reviewing all
                    generated documents before submission.
                  </label>
                </div>

                {!hasScrolledTerms && (
                  <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', marginTop: '8px' }}>
                    Please scroll through the terms above before accepting.
                  </p>
                )}

                {/* CASL opt-in — separate, optional */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginTop: '12px' }}>
                  <input
                    type="checkbox"
                    id="casl-consent"
                    checked={caslConsent}
                    onChange={(e) => setCaslConsent(e.target.checked)}
                    style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#C9A84C', flexShrink: 0 }}
                  />
                  <label htmlFor="casl-consent"
                    style={{ fontSize: '12px', color: 'rgba(245,240,232,0.5)', lineHeight: '1.5' }}>
                    I&apos;d like to receive occasional tips and updates about E-2
                    visa preparation from E2go. (Optional — unsubscribe any time.)
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full font-medium py-3 transition-colors"
                  disabled={!hasScrolledTerms || !termsAccepted}
                  style={{
                    background: (!hasScrolledTerms || !termsAccepted)
                      ? 'rgba(201,168,76,0.3)'
                      : '#C9A84C',
                    color: "#0a0a0a",
                    borderRadius: 0,
                    cursor: (!hasScrolledTerms || !termsAccepted)
                      ? 'not-allowed'
                      : 'pointer',
                  }}
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
