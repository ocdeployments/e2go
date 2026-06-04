"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyToken, markTokenUsed } from "../actions/verify-token";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

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

    router.push("/results?verified=true");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#C9A84C]" style={{ background: '#0a0a0a' }}>Verifying your token...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: '#0a0a0a' }}>
        <h1 className="text-2xl mb-4" style={{ color: '#f5f0e8', fontFamily: "'Cormorant Garamond', serif" }}>This link has expired</h1>
        <p className="mb-8" style={{ color: 'rgba(245,240,232,0.6)' }}>Verification links expire after 24 hours.</p>
        <Link href="/quiz" className="px-8 py-3" style={{ background: '#C9A84C', color: '#0a0a0a', fontWeight: 500 }}>Retake the Quiz →</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-16 px-4" style={{ background: '#0a0a0a' }}>
      <div className="max-w-md mx-auto" style={{
        background: 'rgba(201,168,76,0.02)',
        border: '1px solid rgba(201,168,76,0.2)',
        padding: '40px'
      }}>
        <div className="text-center mb-8">
          <div className="text-[10px] font-medium tracking-[0.18em] uppercase text-[#C9A84C] mb-2">YOUR RESULT IS READY</div>
          <h1 className="text-4xl mb-4 text-[#f5f0e8]" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Create your account to continue.</h1>
          <p className="text-[16px] text-zinc-400" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>Your eligibility result is waiting. Create a free account to view your full result and start your application.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-6">
          <div className="space-y-1">
            <label className="text-[12px] font-medium tracking-[0.12em] uppercase text-zinc-500">Email</label>
            <input type="email" value={verifiedData?.email ?? ""} disabled className="w-full p-3 bg-zinc-900 border border-zinc-700 text-zinc-400" />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium tracking-[0.12em] uppercase text-zinc-500">Create a password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-3 bg-transparent border border-[#C9A84C]/20 text-[#f5f0e8] focus:border-[#C9A84C]" />
          </div>
          <div className="space-y-1">
            <label className="text-[12px] font-medium tracking-[0.12em] uppercase text-zinc-500">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full p-3 bg-transparent border border-[#C9A84C]/20 text-[#f5f0e8] focus:border-[#C9A84C]" />
          </div>
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button type="submit" className="w-full py-4 text-[#0a0a0a] font-medium" style={{ background: '#C9A84C' }}>
            Create Account & View Result →
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <Link href="/login" className="text-[#C9A84C]">Already have an account? Sign in →</Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-[#C9A84C]" style={{ background: '#0a0a0a' }}>Loading...</div>}>
      <VerifyPageInner />
    </Suspense>
  );
}
