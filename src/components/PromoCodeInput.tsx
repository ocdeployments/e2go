"use client";

import { useState } from "react";

interface PromoCodeInputProps {
  tierId: string;
  onApply: (code: string, discountPercent: number) => void;
  onRemove: () => void;
}

export default function PromoCodeInput({ tierId, onApply, onRemove }: PromoCodeInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<{ code: string; discountPercent: number } | null>(null);

  const handleApply = async () => {
    const code = inputValue.trim();
    if (!code) return;
    setApplying(true);
    setError(null);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, tierId }),
      });
      const json = await res.json() as { ok?: boolean; discountPercent?: number; error?: string };
      if (json.ok && json.discountPercent) {
        setApplied({ code: code.toUpperCase(), discountPercent: json.discountPercent });
        onApply(code, json.discountPercent);
      } else {
        setError(json.error || "This promo code is not valid.");
      }
    } catch {
      setError("Could not validate this promo code. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setInputValue("");
    setError(null);
    setExpanded(false);
    onRemove();
  };

  if (applied) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", fontFamily: "'DM Sans', sans-serif" }}>
        <span style={{ color: "#5DCAA5" }}>
          ✓ {applied.code} applied — {applied.discountPercent}% off
        </span>
        <button
          type="button"
          onClick={handleRemove}
          style={{ background: "none", border: "none", padding: 0, color: "rgba(245,240,232,0.4)", fontSize: "11px", textDecoration: "underline", cursor: "pointer" }}
        >
          Remove
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{ background: "none", border: "none", padding: 0, color: "rgba(201,168,76,0.8)", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", textDecoration: "underline", cursor: "pointer" }}
      >
        Have a promo code?
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, gap: "6px" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleApply(); } }}
          placeholder="PROMO CODE"
          disabled={applying}
          style={{
            minWidth: "44px",
            width: "160px",
            padding: "10px 12px",
            background: "rgba(245,240,232,0.04)",
            border: "1px solid rgba(201,168,76,0.3)",
            borderRadius: 0,
            color: "#f5f0e8",
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "0.04em",
          }}
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={applying || !inputValue.trim()}
          style={{
            minHeight: "44px",
            padding: "0 16px",
            background: applying || !inputValue.trim() ? "rgba(201,168,76,0.3)" : "#C9A84C",
            color: "#0a0a0a",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.06em",
            fontFamily: "'DM Sans', sans-serif",
            border: "none",
            cursor: applying || !inputValue.trim() ? "not-allowed" : "pointer",
            whiteSpace: "nowrap" as const,
          }}
        >
          {applying ? "Checking…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={() => { setExpanded(false); setInputValue(""); setError(null); }}
          style={{ background: "none", border: "none", padding: "0 4px", color: "rgba(245,240,232,0.4)", fontSize: "16px", cursor: "pointer" }}
          aria-label="Cancel"
        >
          ×
        </button>
      </div>
      {error && (
        <span style={{ fontSize: "11px", color: "#f87171", fontFamily: "'DM Sans', sans-serif" }}>{error}</span>
      )}
    </div>
  );
}
