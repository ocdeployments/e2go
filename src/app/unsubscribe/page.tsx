"use client";

// REACH CONTEXT: This page is reached only from the unsubscribe link in an
// email footer. It is not linked from navigation anywhere on the site.
//
// It confirms before acting. A link scanner at a corporate mail gateway
// fetches every URL in an incoming message; if arriving here unsubscribed
// someone, people would be opted out of mail they never chose to leave. So
// the page renders a button, and only the button's POST suppresses the
// address.

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const GOLD = "#C9A84C";
const INK = "#f5f0e8";

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const e = searchParams.get("e") ?? "";
  const s = searchParams.get("s") ?? "";

  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleUnsubscribe = async () => {
    setState("working");
    try {
      const res = await fetch("/api/email/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ e, s }),
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

  const hasToken = Boolean(e && s);

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
              You are unsubscribed.
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              We will not email you again. Anything you have already prepared on
              e2go stays where it is — nothing has been deleted.
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
                "The link may have been shortened or altered on its way to you. Email support@e2go.app from the address you want removed and we will take care of it."}
            </p>
          </>
        ) : (
          <>
            <h1
              className="text-3xl mb-4"
              style={{ color: INK, fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            >
              Stop these emails?
            </h1>
            <p className="mb-8" style={{ color: "rgba(245,240,232,0.6)", lineHeight: 1.6 }}>
              One click and we stop writing. Your results stay available on the
              site, and you can always come back to them.
            </p>
            <button
              onClick={handleUnsubscribe}
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
              {state === "working" ? "Unsubscribing..." : "Unsubscribe"}
            </button>
          </>
        )}

        <div className="mt-10">
          <Link
            href="/"
            style={{ color: "rgba(245,240,232,0.72)", fontSize: "13px", textDecoration: "underline" }}
          >
            Return to e2go
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
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
      <UnsubscribeInner />
    </Suspense>
  );
}
