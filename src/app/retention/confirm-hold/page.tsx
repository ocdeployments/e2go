"use client";

// REACH CONTEXT: This page is reached only from the "Keep my files" link in
// the retention-reminder email. It is not linked from navigation anywhere on
// the site.
//
// It confirms before acting, same reasoning as /unsubscribe: a link scanner
// at a corporate mail gateway fetches every URL in an incoming message; if
// arriving here alone placed the hold, every recipient's files would be kept
// regardless of what they actually wanted. So the page renders a button, and
// only the button's POST sets the hold.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const GOLD = "#C9A84C";
const INK = "#f5f0e8";

function ConfirmHoldInner() {
  const searchParams = useSearchParams();
  const a = searchParams.get("a") ?? "";
  const s = searchParams.get("s") ?? "";

  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleConfirm = async () => {
    setState("working");
    try {
      const res = await fetch("/api/retention/confirm-hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ a, s }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setMessage("Something went wrong. Please email support@e2go.app.");
      setState("error");
    }
  };

  const hasToken = Boolean(a && s);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#0a0a0a" }}
    >
      <div className="w-full max-w-md text-center">
        {state === "done" ? (
          <>
            <h1
              className="text-3xl mb-4"
              style={{ color: INK, fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            >
              Your files are kept.
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              Your uploaded files will not be removed on the scheduled date. They
              stay on your account until you delete them yourself.
            </p>
          </>
        ) : state === "error" || !hasToken ? (
          <>
            <h1
              className="text-3xl mb-4"
              style={{ color: INK, fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            >
              We could not read that link.
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              {message ||
                "The link may have been shortened or altered on its way to you. Email support@e2go.app and we will keep your files for you."}
            </p>
          </>
        ) : (
          <>
            <h1
              className="text-3xl mb-4"
              style={{ color: INK, fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            >
              Keep your uploaded files?
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              One click and the scheduled removal is cancelled. Nothing else about
              your account changes.
            </p>
            <button
              onClick={handleConfirm}
              disabled={state === "working"}
              className="px-8 py-3 min-h-[44px]"
              style={{
                background: GOLD,
                color: "#0a0a0a",
                fontWeight: 500,
                borderRadius: 0,
                border: "none",
                cursor: state === "working" ? "not-allowed" : "pointer",
                opacity: state === "working" ? 0.6 : 1,
                fontSize: "13px",
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
              }}
            >
              {state === "working" ? "Keeping your files..." : "Keep my files"}
            </button>
          </>
        )}

        <div className="mt-10">
          <Link
            href="/"
            style={{ color: "rgba(245,240,232,0.72)", fontSize: "13px", textDecoration: "underline" }}
          >
            Return to E2go.app
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmHoldPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "#0a0a0a", color: GOLD }}
        >
          Loading...
        </div>
      }
    >
      <ConfirmHoldInner />
    </Suspense>
  );
}
