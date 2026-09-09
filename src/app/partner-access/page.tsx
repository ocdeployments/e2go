"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import Link from "next/link";

type AcceptState = "loading" | "ready" | "accepting" | "success" | "error" | "mismatch" | "used";

function PartnerAccessInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<AcceptState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setState("error");
        setErrorMsg("No invitation token found. Check the link in your email.");
        return;
      }

      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const next = encodeURIComponent(`/partner-access?token=${token}`);
        router.replace(`/login?next=${next}`);
        return;
      }

      setUserEmail(user.email ?? "");
      setState("ready");
    };

    init();
  }, [token, router]);

  const handleAccept = async () => {
    setState("accepting");
    try {
      const res = await fetch("/api/partner/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json() as { success?: boolean; error?: string; emailMismatch?: boolean };

      if (!res.ok) {
        if (res.status === 409) {
          setState("used");
        } else if (data.emailMismatch) {
          setState("mismatch");
          setErrorMsg(data.error ?? "Email mismatch.");
        } else {
          setState("error");
          setErrorMsg(data.error ?? "Something went wrong. Please try again.");
        }
        return;
      }

      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Network error. Please try again.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0a",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        maxWidth: "480px",
        width: "100%",
        border: "1px solid rgba(201,168,76,0.2)",
        background: "rgba(201,168,76,0.02)",
        padding: "40px",
      }}>

        {/* Wordmark */}
        <p style={{ margin: "0 0 32px", fontSize: "18px", fontWeight: 300, color: "#C9A84C", letterSpacing: "0.04em", fontFamily: "'Cormorant Garamond', serif" }}>
          E2go<span style={{ color: "#f5f0e8" }}>.app</span>
        </p>

        {/* LOADING */}
        {state === "loading" && (
          <>
            <div style={{ height: "1px", width: "120px", background: "rgba(201,168,76,0.4)", marginBottom: "24px" }} />
            <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)" }}>
              Verifying your invitation…
            </p>
          </>
        )}

        {/* READY TO ACCEPT */}
        {state === "ready" && (
          <>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontWeight: 400, color: "#C9A84C", lineHeight: 1.25 }}>
              {"You've been invited."}
            </h1>
            <p style={{ margin: "0 0 20px", fontSize: "14px", color: "rgba(245,240,232,0.7)", lineHeight: 1.7 }}>
              Your business partner has granted you access to the E2go Interview Prep simulator — personalised to your joint E-2 case.
            </p>

            <div style={{ padding: "14px 16px", background: "rgba(201,168,76,0.05)", borderLeft: "3px solid rgba(201,168,76,0.4)", marginBottom: "28px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(245,240,232,0.55)", lineHeight: 1.6 }}>
                Accepting as: <span style={{ color: "#C9A84C" }}>{userEmail}</span>
              </p>
            </div>

            <button
              onClick={handleAccept}
              style={{
                width: "100%",
                padding: "14px 24px",
                background: "#C9A84C",
                color: "#0a0a0a",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
              }}
            >
              Accept Interview Prep Access →
            </button>
          </>
        )}

        {/* ACCEPTING */}
        {state === "accepting" && (
          <>
            <div style={{ height: "1px", width: "120px", background: "rgba(201,168,76,0.4)", marginBottom: "24px" }} />
            <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.5)" }}>
              Activating your access…
            </p>
          </>
        )}

        {/* SUCCESS */}
        {state === "success" && (
          <>
            <div style={{ fontSize: "24px", marginBottom: "16px", color: "#5DCAA5" }}>✓</div>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: "26px", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.25 }}>
              Access granted.
            </h1>
            <p style={{ margin: "0 0 28px", fontSize: "14px", color: "rgba(245,240,232,0.6)", lineHeight: 1.7 }}>
              Interview Prep is now active on your account. Head to your dashboard to start your first simulation.
            </p>
            <Link
              href="/dashboard"
              style={{
                display: "block",
                textAlign: "center",
                padding: "14px 24px",
                background: "#C9A84C",
                color: "#0a0a0a",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Go to Dashboard →
            </Link>
          </>
        )}

        {/* ALREADY USED */}
        {state === "used" && (
          <>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.25 }}>
              This invitation has already been accepted.
            </h1>
            <p style={{ margin: "0 0 24px", fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.7 }}>
              {"If you're the intended partner, log into your account — Interview Prep should already be active."}
            </p>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "none" }}>
              Go to Dashboard →
            </Link>
          </>
        )}

        {/* EMAIL MISMATCH */}
        {state === "mismatch" && (
          <>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.25 }}>
              Wrong account.
            </h1>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.7 }}>
              {errorMsg}
            </p>
            <Link href="/login" style={{
              display: "block",
              textAlign: "center",
              padding: "12px 24px",
              border: "1px solid rgba(201,168,76,0.4)",
              color: "#C9A84C",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}>
              Log in with a different account →
            </Link>
          </>
        )}

        {/* GENERIC ERROR */}
        {state === "error" && (
          <>
            <h1 style={{ margin: "0 0 12px", fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400, color: "#f5f0e8", lineHeight: 1.25 }}>
              Something went wrong.
            </h1>
            <p style={{ margin: "0 0 20px", fontSize: "13px", color: "rgba(245,240,232,0.55)", lineHeight: 1.7 }}>
              {errorMsg || "The invitation link may be invalid or expired. Ask your partner to resend it."}
            </p>
            <Link href="/dashboard" style={{ fontSize: "13px", color: "#C9A84C", textDecoration: "none" }}>
              Return to Dashboard →
            </Link>
          </>
        )}

      </div>
    </div>
  );
}

export default function PartnerAccessPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: "14px", color: "rgba(245,240,232,0.4)", fontFamily: "'DM Sans', sans-serif" }}>Loading…</p>
      </div>
    }>
      <PartnerAccessInner />
    </Suspense>
  );
}
