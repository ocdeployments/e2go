"use client";
import { useState } from "react";

interface Props {
  tierId: string;
  label: string;
  redirectOnAuth?: string; // page to set as ?next= if user must log in first
  style?: React.CSSProperties;
}

export function CheckoutButton({ tierId, label, redirectOnAuth = "/modules", style }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });

      if (res.status === 401) {
        window.location.href = `/login?next=${redirectOnAuth}`;
        return;
      }

      const json = await res.json() as { alreadyPaid?: boolean; url?: string; error?: string };

      if (json.alreadyPaid) {
        window.location.href = "/case-profile";
        return;
      }
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error || "Something went wrong. Please try again.");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: "inline-block",
          padding: "13px 24px",
          background: loading ? "rgba(201,168,76,0.55)" : "#C9A84C",
          color: "#0a0a0a",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'DM Sans', sans-serif",
          borderRadius: 0,
          ...style,
        }}
      >
        {loading ? "Preparing checkout…" : label}
      </button>
      {error && (
        <div style={{ marginTop: "6px", fontSize: "10px", color: "#f87171" }}>
          {error}
        </div>
      )}
    </div>
  );
}
