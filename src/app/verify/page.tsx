"use client";

// REACH CONTEXT: This page is ONLY reached via an email link sent after
// completing the eligibility quiz. It is intentionally NOT linked from
// the main navigation or footer, as it requires a valid, single-use token
// parameter to function. Do not add this route to the Nav or Footer components.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyToken, markTokenUsed } from "../actions/verify-token";
import { createBrowserSupabaseClient } from "@/lib/supabase";
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
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [supabase] = useState(() => createBrowserSupabaseClient());

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

      setVerifiedData(result);
      setLoading(false);
    };
    validate();
  }, [token]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    if (!verifiedData?.email) {
      setAuthError("Verification data missing.");
      return;
    }

    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email: verifiedData.email,
      password,
      options: {
        data: { email: verifiedData.email }
      }
    });

    if (authErr) {
      setAuthError(authErr.message);
      return;
    }

    await supabase.from("quiz_sessions")
      .update({ user_id: auth.user!.id })
      .eq("id", verifiedData.quiz_session_id);

    await markTokenUsed(token!);

    localStorage.setItem("e2go_quiz_result", JSON.stringify(verifiedData.result_json));
    localStorage.removeItem('e2go_quiz_draft');

    router.push("/results?verified=true");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex" style={{ background: "#0a0a0a" }}>
        <AuthImageSlider />
        <div className="w-full md:w-1/2 flex items-center justify-center">
          <div className="text-[#C9A84C]">Verifying your token...</div>
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
          <Link href="/quiz" className="px-8 py-3" style={{ background: '#C9A84C', color: '#0a0a0a', fontWeight: 500, borderRadius: 0 }}>Retake the Quiz →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0a' }}>
      <AuthImageSlider />

      <div className="w-full md:w-1/2 flex flex-col">
        <header className="w-full z-50 px-8 py-6" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-8 py-16">
          <div className="w-full max-w-md" style={{
            background: 'rgba(201,168,76,0.02)',
            border: '1px solid rgba(201,168,76,0.12)',
            padding: '40px',
            borderRadius: 0
          }}>
            <div className="text-center mb-8">
              <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#C9A84C] mb-2">YOUR RESULT IS READY</div>
              <h1 className="text-3xl mb-4" style={{ color: '#f5f0e8', fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Create your account to continue.</h1>
              <p className="text-base" style={{ color: 'rgba(245,240,232,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>Your eligibility result is waiting. Create a free account to view your full result and start your application.</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[12px] font-medium tracking-[0.12em] uppercase" style={{ color: "rgba(245,240,232,0.45)" }}>Email</label>
                <input type="email" value={verifiedData?.email ?? ""} disabled className="w-full p-3 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[rgba(245,240,232,0.4)] cursor-not-allowed" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium tracking-[0.12em] uppercase" style={{ color: "rgba(245,240,232,0.45)" }}>Create a password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 bg-transparent border border-[#C9A84C]/20 text-[#f5f0e8] focus:border-[#C9A84C] outline-none transition-colors" style={{ borderRadius: 0 }} />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-medium tracking-[0.12em] uppercase" style={{ color: "rgba(245,240,232,0.45)" }}>Confirm password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full p-3 bg-transparent border border-[#C9A84C]/20 text-[#f5f0e8] focus:border-[#C9A84C] outline-none transition-colors" style={{ borderRadius: 0 }} />
              </div>
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <button type="submit" className="w-full py-4 text-[#0a0a0a] font-medium transition-colors hover:opacity-90" style={{ background: '#C9A84C', borderRadius: 0 }}>
                Create Account & View Result →
              </button>
            </form>

            <div className="mt-8 text-center text-sm">
              <Link href="/login" className="underline hover:text-[#E8D5A3]" style={{ color: '#C9A84C' }}>Already have an account? Sign in →</Link>
            </div>
          </div>
        </main>
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
