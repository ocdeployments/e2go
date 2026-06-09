"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

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
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fire and forget — do not block redirect
          supabase
            .from("quiz_sessions")
            .update({ user_id: user.id })
            .eq("email", email)
            .is("user_id", null);

          // Check for unlinked quiz draft in localStorage
          const draft = localStorage.getItem('e2go_quiz_draft');
          if (draft) {
            try {
              const parsed = JSON.parse(draft);
              if (parsed.answers && Object.keys(parsed.answers).length >= 10) {
                supabase.from('quiz_sessions').insert({
                  user_id: user.id,
                  email: email,
                  outcome: parsed.outcome || 'PROCEED',
                  score: parsed.score || 80,
                  hard_stop_codes: [],
                  attorney_flag_codes: parsed.attorneyFlags || [],
                  risk_flag_codes: parsed.warnings || [],
                  application_type: 'solo',
                  franchise_interest: parsed.franchiseInterest || false,
                  result_json: parsed,
                  completed_at: parsed.savedAt || new Date().toISOString(),
                }).then(() => {
                  localStorage.removeItem('e2go_quiz_draft');
                });
              }
            } catch {
              // Invalid draft — ignore
            }
          }
        }
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p style={{ color: "rgba(245,240,232,0.6)" }}>Signing you in...</p>
        </div>
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row">
        {/* Flag panel — desktop only */}
        <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
          <svg width="100%" height="100%" viewBox="0 0 660 520" preserveAspectRatio="xMinYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="loginFlagFadeRight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="50%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
                <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:1}}/>
              </linearGradient>
              <linearGradient id="loginFlagFadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="85%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
                <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
              </linearGradient>
            </defs>
            {[0,80,160,240,320,400,480].map((y,i) => <rect key={`r${i}`} width="660" height="40" y={y} fill="#BF0A30"/>)}
            {[40,120,200,280,360,440].map((y,i) => <rect key={`w${i}`} width="660" height="40" y={y} fill="#e6e6e6"/>)}
            <rect width="264" height="280" y="0" fill="#002868"/>
            {[
              [18,14],[50,14],[82,14],[114,14],[146,14],[178,14],[210,14],[242,14],
              [34,40],[66,40],[98,40],[130,40],[162,40],[194,40],[226,40],
              [18,66],[50,66],[82,66],[114,66],[146,66],[178,66],[210,66],[242,66],
              [34,92],[66,92],[98,92],[130,92],[162,92],[194,92],[226,92],
              [18,118],[50,118],[82,118],[114,118],[146,118],[178,118],[210,118],[242,118],
              [34,144],[66,144],[98,144],[130,144],[162,144],[194,144],[226,144],
              [18,170],[50,170],[82,170],[114,170],[146,170],[178,170],[210,170],[242,170],
              [34,196],[66,196],[98,196],[130,196],[162,196],[194,196],[226,196],
              [18,222],[50,222],[82,222],[114,222],[146,222],[178,222],[210,222],[242,222],
              [34,248],[66,248],[98,248],[130,248],[162,248],[194,248],[226,248],
            ].map(([cx,cy],i) => {
              const r=9,ir=4;
              const pts=Array.from({length:5},(_,k)=>{
                const a=(k*72-90)*Math.PI/180;
                const b=(k*72-90+36)*Math.PI/180;
                return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
              }).join(' ');
              return <polygon key={i} points={pts} fill="#FFFFFF"/>;
            })}
            <rect width="660" height="520" fill="url(#loginFlagFadeRight)"/>
            <rect width="660" height="520" fill="url(#loginFlagFadeBottom)"/>
          </svg>
        </div>

        {/* Form panel */}
        <div className="w-full md:w-1/2 flex flex-col">
          <header className="w-full z-50 px-8 py-6" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
            </Link>
          </header>

          <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-8">
            <div className="w-full max-w-md">
              <div style={{ padding: "32px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0, textAlign: "center" }}>
                <div className="w-12 h-12 flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(201,168,76,0.08)" }}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#C9A84C" }}>
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <p className="font-medium mb-2" style={{ color: "#f5f0e8" }}>Check your email</p>
                <p className="text-sm" style={{ color: "rgba(245,240,232,0.6)" }}>We sent a magic link to {email}</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row">
      {/* Flag panel — desktop only */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden bg-[#0a0a0a]">
        <svg width="100%" height="100%" viewBox="0 0 660 520" preserveAspectRatio="xMinYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <defs>
            <linearGradient id="loginFlagFadeRight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="50%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
              <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:1}}/>
            </linearGradient>
            <linearGradient id="loginFlagFadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="85%" style={{stopColor:'#0a0a0a',stopOpacity:0}}/>
              <stop offset="100%" style={{stopColor:'#0a0a0a',stopOpacity:0.85}}/>
            </linearGradient>
          </defs>
          {[0,80,160,240,320,400,480].map((y,i) => <rect key={`r${i}`} width="660" height="40" y={y} fill="#BF0A30"/>)}
          {[40,120,200,280,360,440].map((y,i) => <rect key={`w${i}`} width="660" height="40" y={y} fill="#e6e6e6"/>)}
          <rect width="264" height="280" y="0" fill="#002868"/>
          {[
            [18,14],[50,14],[82,14],[114,14],[146,14],[178,14],[210,14],[242,14],
            [34,40],[66,40],[98,40],[130,40],[162,40],[194,40],[226,40],
            [18,66],[50,66],[82,66],[114,66],[146,66],[178,66],[210,66],[242,66],
            [34,92],[66,92],[98,92],[130,92],[162,92],[194,92],[226,92],
            [18,118],[50,118],[82,118],[114,118],[146,118],[178,118],[210,118],[242,118],
            [34,144],[66,144],[98,144],[130,144],[162,144],[194,144],[226,144],
            [18,170],[50,170],[82,170],[114,170],[146,170],[178,170],[210,170],[242,170],
            [34,196],[66,196],[98,196],[130,196],[162,196],[194,196],[226,196],
            [18,222],[50,222],[82,222],[114,222],[146,222],[178,222],[210,222],[242,222],
            [34,248],[66,248],[98,248],[130,248],[162,248],[194,248],[226,248],
          ].map(([cx,cy],i) => {
            const r=9,ir=4;
            const pts=Array.from({length:5},(_,k)=>{
              const a=(k*72-90)*Math.PI/180;
              const b=(k*72-90+36)*Math.PI/180;
              return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)} ${cx+ir*Math.cos(b)},${cy+ir*Math.sin(b)}`;
            }).join(' ');
            return <polygon key={i} points={pts} fill="#FFFFFF"/>;
          })}
          <rect width="660" height="520" fill="url(#loginFlagFadeRight)"/>
          <rect width="660" height="520" fill="url(#loginFlagFadeBottom)"/>
        </svg>
      </div>

      {/* Form panel */}
      <div className="w-full md:w-1/2 flex flex-col">
        <header className="w-full z-50 px-8 py-6" style={{ borderBottom: "1px solid rgba(201,168,76,0.12)" }}>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: "#C9A84C", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>E2go<span style={{ color: '#f5f0e8' }}>.app</span></span>
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12 md:px-8">
          <div className="w-full max-w-md">
            <div style={{ padding: "32px", background: "rgba(201,168,76,0.02)", border: "1px solid rgba(201,168,76,0.12)", borderRadius: 0 }}>
              <h1 className="text-2xl font-bold mb-2" style={{ color: "#f5f0e8", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>Welcome back</h1>
              <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)" }}>Sign in to continue your application</p>

              {status === 'error' && (
                <div className="p-3 text-sm mb-4" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleEmailPasswordLogin} className="space-y-4">
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
                    className="w-full px-4 py-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 0, color: "#f5f0e8" }}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full font-medium py-3 transition-colors"
                  style={{ background: "#C9A84C", color: "#0a0a0a", borderRadius: 0 }}
                >
                  Sign In
                </button>

                <div className="text-center">
                  <Link href="/forgot-password" className="text-sm" style={{ color: "#C9A84C", textDecoration: "underline" }}>
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" style={{ borderColor: "rgba(201,168,76,0.2)" }}></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2" style={{ color: "rgba(245,240,232,0.45)", background: "#0a0a0a" }}>or</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleMagicLink}
                  className="w-full border font-medium py-3 transition-colors"
                  style={{ borderColor: "#C9A84C", color: "#C9A84C", borderRadius: 0 }}
                >
                  Send Magic Link
                </button>
              </form>

              <p className="mt-6 text-center text-sm" style={{ color: "rgba(245,240,232,0.45)" }}>
                Don&apos;t have an account?{" "}
                <Link href="/signup" style={{ color: "#C9A84C", textDecoration: "underline" }}>
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
