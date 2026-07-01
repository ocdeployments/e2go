"use client";

import { useEffect, useState } from "react";

export default function OutcomesConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile/outcomes-consent")
      .then(r => r.json())
      .then((d: { outcomes_consent: boolean | null }) => {
        // Show banner only when consent is NULL (never asked — existing user)
        if (d.outcomes_consent === null) setVisible(true);
      })
      .catch(() => {/* non-blocking */});
  }, []);

  async function respond(consent: boolean) {
    setSaving(true);
    try {
      await fetch("/api/profile/outcomes-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent }),
      });
    } finally {
      setVisible(false);
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div
      role="banner"
      style={{
        background: "rgba(201,168,76,0.06)",
        borderBottom: "1px solid rgba(201,168,76,0.18)",
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <p style={{ fontSize: "13px", color: "rgba(245,240,232,0.75)", margin: 0, flex: 1, minWidth: "240px" }}>
        <span style={{ color: "#C9A84C", fontWeight: 500 }}>One quick question — </span>
        Would you be willing to share your anonymized visa outcome with us once you hear back?
        It helps future applicants understand what works. Your identity is never shared.
      </p>
      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
        <button
          onClick={() => respond(false)}
          disabled={saving}
          style={{
            padding: "6px 16px",
            fontSize: "12px",
            background: "transparent",
            border: "1px solid rgba(245,240,232,0.2)",
            color: "rgba(245,240,232,0.5)",
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          No thanks
        </button>
        <button
          onClick={() => respond(true)}
          disabled={saving}
          style={{
            padding: "6px 18px",
            fontSize: "12px",
            background: "#C9A84C",
            border: "none",
            color: "#0a0a0a",
            fontWeight: 600,
            cursor: "pointer",
            borderRadius: 0,
          }}
        >
          Yes, I&apos;m in
        </button>
      </div>
    </div>
  );
}
