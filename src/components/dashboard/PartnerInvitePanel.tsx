"use client";

import { useState } from "react";

interface PartnerInvitePanelProps {
  existingInvite: { partnerEmail: string; accepted: boolean } | null;
}

export default function PartnerInvitePanel({ existingInvite }: PartnerInvitePanelProps) {
  const [email, setEmail] = useState(existingInvite?.partnerEmail ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    existingInvite && !existingInvite.accepted ? "sent" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setErrorMsg("Enter a valid email address.");
      return;
    }
    setErrorMsg("");
    setStatus("sending");

    try {
      const res = await fetch("/api/partner/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerEmail: trimmed }),
      });
      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok) {
        setErrorMsg(data.error ?? "Failed to send invitation.");
        setStatus("idle");
        return;
      }

      setStatus("sent");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("idle");
    }
  };

  // Already accepted — nothing to do
  if (existingInvite?.accepted) return null;

  return (
    <div style={{
      padding: "18px 20px",
      border: "1px solid rgba(201,168,76,0.15)",
      background: "rgba(201,168,76,0.02)",
    }}>
      <div style={{
        fontSize: "9px",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.5)",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        marginBottom: "10px",
      }}>
        Partner Access
      </div>

      {status === "sent" ? (
        <>
          <p style={{ margin: "0 0 10px", fontSize: "12px", color: "rgba(245,240,232,0.6)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }}>
            Invitation sent to{" "}
            <span style={{ color: "#C9A84C" }}>{email}</span>
          </p>
          <p style={{ margin: "0 0 12px", fontSize: "11px", color: "rgba(245,240,232,0.35)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
            {"Waiting for your partner to accept. They'll receive Interview Prep access immediately."}
          </p>
          <button
            onClick={() => setStatus("idle")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              color: "rgba(201,168,76,0.6)",
              fontFamily: "'DM Sans', sans-serif",
              padding: 0,
              letterSpacing: "0.04em",
            }}
          >
            Resend or change email →
          </button>
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: "rgba(245,240,232,0.55)", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.55 }}>
            Enter your partner&apos;s email to grant them Interview Prep access.
          </p>

          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
              placeholder="partner@example.com"
              style={{
                flex: 1,
                padding: "9px 12px",
                background: "rgba(245,240,232,0.05)",
                border: "1px solid rgba(245,240,232,0.12)",
                color: "#f5f0e8",
                fontSize: "12px",
                fontFamily: "'DM Sans', sans-serif",
                outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={status === "sending"}
              style={{
                padding: "9px 14px",
                background: "#C9A84C",
                color: "#0a0a0a",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                border: "none",
                cursor: status === "sending" ? "not-allowed" : "pointer",
                opacity: status === "sending" ? 0.6 : 1,
                whiteSpace: "nowrap",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {status === "sending" ? "Sending…" : "Send Invite"}
            </button>
          </div>

          {errorMsg && (
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "rgba(239,68,68,0.8)", fontFamily: "'DM Sans', sans-serif" }}>
              {errorMsg}
            </p>
          )}
        </>
      )}
    </div>
  );
}
