"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("e2go_cookie_consent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("e2go_cookie_consent", "accepted");
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 w-full z-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 md:px-6 md:py-4"
      style={{
        background: "rgba(10,10,10,0.96)",
        borderTop: "0.5px solid rgba(201,168,76,0.2)",
      }}
    >
      <p
        className="text-[13px] leading-relaxed font-light"
        style={{
          fontFamily: "'DM Sans', sans-serif",
          color: "#f5f0e8",
        }}
      >
        E2go uses essential cookies for security and session management, and
        anonymised analytics to improve the product. No advertising cookies.
        No third-party tracking.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
        <button
          onClick={handleAccept}
          className="w-full sm:w-auto text-center px-5 py-2.5 text-sm font-medium transition-colors duration-200"
          style={{
            background: "#C9A84C",
            color: "#0a0a0a",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          Accept
        </button>
        <Link
          href="/privacy"
          className="w-full sm:w-auto text-center px-5 py-2.5 text-sm font-medium transition-colors duration-200 border"
          style={{
            background: "transparent",
            color: "#C9A84C",
            borderColor: "#C9A84C",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          Learn more
        </Link>
      </div>
    </div>
  );
}
