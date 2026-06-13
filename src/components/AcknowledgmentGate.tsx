"use client";

import { useState } from "react";

/**
 * AcknowledgmentGate — Pre-download acknowledgment (Spec4 Release Stage)
 *
 * 5-checkbox gate. All must be checked before download is enabled.
 * Exact copy from Spec4_Quality_Gate_Pipeline.md.
 */

const ACKNOWLEDGMENTS = [
  {
    id: "accuracy",
    text: "I have reviewed these documents for accuracy. All facts, figures, dates, and names are correct to the best of my knowledge.",
  },
  {
    id: "service-type",
    text: "I understand that these documents were prepared using e2go.app, a document preparation service. e2go.app is not a law firm and has not provided legal advice.",
  },
  {
    id: "false-info",
    text: "I understand that submitting false or misleading information to a U.S. government agency may constitute a federal offense.",
  },
  {
    id: "no-guarantee",
    text: "I am aware that my visa application will be assessed by a consular officer based on these documents and my interview. No outcome is guaranteed.",
  },
  {
    id: "attorney-review",
    text: "I recommend — and e2go.app strongly encourages — that I have these documents reviewed by a licensed U.S. immigration attorney before submission.",
  },
];

interface AcknowledgmentGateProps {
  applicationId: string;
  onAcknowledged: () => void;
}

export default function AcknowledgmentGate({
  applicationId,
  onAcknowledged,
}: AcknowledgmentGateProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked = ACKNOWLEDGMENTS.every((a) => checked[a.id]);

  const handleToggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
    setError(null);
  };

  const handleConfirm = async () => {
    if (!allChecked || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/generate/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: applicationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to record acknowledgment. Please try again.");
        setSubmitting(false);
        return;
      }

      onAcknowledged();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="w-full max-w-[680px] mx-auto"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Header */}
      <div className="mb-8">
        <h2
          className="text-2xl font-light italic text-[#C9A84C] mb-3"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Before you download your documents, please confirm:
        </h2>
        <div className="h-px w-full bg-[#C9A84C]/30" />
      </div>

      {/* Checkboxes */}
      <div className="space-y-5">
        {ACKNOWLEDGMENTS.map((ack) => (
          <label
            key={ack.id}
            className="flex items-start gap-4 cursor-pointer group"
          >
            <div className="mt-0.5 flex-shrink-0">
              <input
                type="checkbox"
                checked={!!checked[ack.id]}
                onChange={() => handleToggle(ack.id)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 flex items-center justify-center transition-colors ${
                  checked[ack.id]
                    ? "bg-[#C9A84C] border-[#C9A84C]"
                    : "border border-white/25 bg-transparent group-hover:border-white/40"
                }`}
              >
                {checked[ack.id] && (
                  <svg
                    className="w-3 h-3 text-[#0a0a0a]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className="text-[14px] leading-[1.65] text-white/70 group-hover:text-white/85 transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {ack.text}
            </span>
          </label>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-6 p-3 text-[13px] text-white/70"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            lineHeight: 1.5,
          }}
        >
          {error}
        </div>
      )}

      {/* Confirm button */}
      <div className="mt-8">
        <button
          onClick={handleConfirm}
          disabled={!allChecked || submitting}
          className="w-full py-3.5 text-[14px] font-medium uppercase tracking-wider transition-colors"
          style={{
            background: allChecked ? "#C9A84C" : "rgba(201,168,76,0.25)",
            color: "#0a0a0a",
            borderRadius: 0,
            cursor: allChecked && !submitting ? "pointer" : "not-allowed",
            fontFamily: "'DM Sans', sans-serif",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting
            ? "Recording confirmation..."
            : "I confirm and download my documents →"}
        </button>
      </div>

      {/* Progress hint */}
      {!allChecked && (
        <p
          className="mt-3 text-center text-[11px] text-white/35"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {ACKNOWLEDGMENTS.filter((a) => checked[a.id]).length} of{" "}
          {ACKNOWLEDGMENTS.length} confirmed
        </p>
      )}
    </div>
  );
}
