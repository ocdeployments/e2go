"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { GENERATION_STEP_LABELS, DOCUMENT_TYPE_LABELS } from "@/types/generation";
import type { SSEProgressMessage, DocumentType } from "@/types/generation";

type StepStatus = "pending" | "running" | "complete" | "failed";

interface StepState {
  id: number;
  label: string;
  status: StepStatus;
}

const TOTAL_DOCUMENTS = 6;
const POLL_INTERVAL = 2000;

export default function GenerateProgressPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.applicationId as string;

  const [_jobId, setJobId] = useState<string | null>(null);
  const [steps, setSteps] = useState<StepState[]>(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      label: GENERATION_STEP_LABELS[i + 1] || `Step ${i + 1}`,
      status: "pending" as StepStatus,
    }))
  );
  const [currentDocument, setCurrentDocument] = useState<string>("");
  const [documentText, setDocumentText] = useState<string>("");
  const [documentsComplete, setDocumentsComplete] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [overallProgress, setOverallProgress] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const updateStepStatus = useCallback(
    (stepNum: number, status: StepStatus) => {
      setSteps((prev) =>
        prev.map((s) => {
          if (s.id === stepNum) return { ...s, status };
          if (s.id < stepNum && status === "running" && s.status === "pending") {
            return { ...s, status: "complete" };
          }
          return s;
        })
      );
    },
    []
  );

  const mapDocumentType = (type: string): string => {
    const key = type as DocumentType;
    return DOCUMENT_TYPE_LABELS[key] || type;
  };

  const processMessage = useCallback(
    (msg: SSEProgressMessage) => {
      setJobStatus(msg.status);
      if (msg.error) setErrorMessage(msg.error);

      setDocumentsComplete(msg.documentsComplete);

      const stepNum = msg.step || 0;
      if (msg.status === "completed") {
        updateStepStatus(stepNum, "complete");
        setOverallProgress(100);
      } else if (msg.status === "failed") {
        updateStepStatus(stepNum, "failed");
        setOverallProgress(Math.round((stepNum / 15) * 100));
      } else {
        updateStepStatus(stepNum, "running");
        setOverallProgress(Math.round((stepNum / 15) * 100));
      }

      if (msg.currentDocument) {
        setCurrentDocument(mapDocumentType(msg.currentDocument));
      }
      if (msg.currentDocumentText) {
        setDocumentText(msg.currentDocumentText);
      }
    },
    [updateStepStatus]
  );

  const startPolling = useCallback((jid: string) => {
    const poll = setInterval(async () => {
      try {
        await fetch(`/api/generate/progress/${jid}`);
        const jobRes = await fetch(`/api/generate/documents/${applicationId}`, {
          headers: { Authorization: "Bearer poll" },
        });
        if (jobRes.ok) {
          const data = await jobRes.json();
          setDocumentsComplete(
            data.documents?.filter(
              (d: { status: string }) => d.status === "under_review"
            ).length || 0
          );
        }
      } catch {
        // Ignore poll errors
      }
    }, POLL_INTERVAL);

    return () => clearInterval(poll);
  }, [applicationId]);

  const connectSSE = useCallback((jid: string) => {
    const eventSource = new EventSource(`/api/generate/progress/${jid}`);

    eventSource.onmessage = (event) => {
      try {
        const msg: SSEProgressMessage = JSON.parse(event.data);
        processMessage(msg);
        if (msg.status === "completed" || msg.status === "failed") {
          eventSource.close();
        }
      } catch {
        // Ignore parse errors on SSE
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      startPolling(jid);
    };

    return () => eventSource.close();
  }, [processMessage, startPolling]);

  const startGeneration = useCallback(async () => {
    try {
      // Get userId from localStorage or session
      const stored = localStorage.getItem("supabase_user");
      const userId = stored ? JSON.parse(stored).id : null;
      if (!userId) {
        setErrorMessage("Not authenticated");
        return;
      }

      const res = await fetch("/api/generate/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to start generation");
        return;
      }

      const newJobId = data.jobId;
      setJobId(newJobId);

      // Kick off background pipeline
      await fetch(`/api/generate/run/${newJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      // Connect to SSE
      connectSSE(newJobId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }, [applicationId, connectSSE]);

  useEffect(() => {
    startGeneration();
  }, [startGeneration]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [documentText]);

  const isComplete = jobStatus === "completed";
  const isFailed = jobStatus === "failed" && !errorMessage.includes("retry");

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-xs text-white/30">
            ○
          </span>
        );
      case "running":
        return (
          <span className="inline-flex h-6 w-6 items-center justify-center animate-pulse text-sm text-[#C9A84C]">
            ⟳
          </span>
        );
      case "complete":
        return (
          <span className="inline-flex h-6 w-6 items-center justify-center text-sm text-[#C9A84C]">
            ✓
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex h-6 w-6 items-center justify-center text-sm text-[#dc2626]">
            ✗
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="font-light text-4xl tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {isComplete
              ? "Your Package Is Ready"
              : "Preparing Your Application Package"}
          </h1>
          {!isComplete && !isFailed && (
            <p
              className="mt-3 text-sm text-white/50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Each document is being written for your specific case. This takes
              3–5 minutes.
            </p>
          )}
          {isFailed && (
            <p
              className="mt-3 text-sm text-[#dc2626]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Our team has been notified and will email you within 2 hours.
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left: Step List */}
          <div className="order-2 lg:order-1">
            <h2
              className="mb-4 text-xs font-medium uppercase tracking-widest text-white/30"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Progress
            </h2>
            <div className="space-y-1">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-2 py-2 transition-colors duration-300 ${
                    step.status === "running"
                      ? "bg-[#C9A84C]/5 border-l-2 border-[#C9A84C]"
                      : "border-l-2 border-transparent"
                  }`}
                >
                  <span className="flex-shrink-0 w-8 text-center">
                    {getStatusIcon(step.status)}
                  </span>
                  <span
                    className={`text-sm ${
                      step.status === "complete"
                        ? "text-[#C9A84C]"
                        : step.status === "running"
                          ? "text-[#f5f0e8]"
                          : step.status === "failed"
                            ? "text-[#dc2626]"
                            : "text-white/30"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {step.id}. {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Document Preview */}
          <div className="order-1 lg:order-2">
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-xs font-medium uppercase tracking-widest text-white/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Live Preview
              </h2>
              {currentDocument && !isComplete && (
                <span
                  className="inline-flex items-center gap-1.5 border border-[#C9A84C]/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#C9A84C]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                  GENERATING
                </span>
              )}
              {isComplete && (
                <span
                  className="inline-flex items-center gap-1.5 border border-[#C9A84C]/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#C9A84C]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  COMPLETE
                </span>
              )}
            </div>
            {currentDocument && (
              <p
                className="mb-3 text-sm text-white/60"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {currentDocument}
              </p>
            )}
            <div
              ref={previewRef}
              className="h-[500px] overflow-y-auto border border-white/8 bg-[#0d0d0d] p-6"
            >
              {documentText ? (
                <pre
                  className="whitespace-pre-wrap text-sm leading-relaxed text-white/70"
                  style={{ fontFamily: "'DM Sans', monospace" }}
                >
                  {documentText}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p
                    className="text-sm text-white/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {isComplete
                      ? "All documents generated."
                      : isFailed
                        ? "Generation encountered an error."
                        : "Document preview will appear here..."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: Progress Bar */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <span
              className="text-xs text-white/40"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {documentsComplete} of {TOTAL_DOCUMENTS} documents complete
            </span>
            <span
              className="text-xs text-white/40"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {overallProgress}%
            </span>
          </div>
          <div className="h-[2px] w-full bg-white/8">
            <div
              className="h-full transition-all duration-700 ease-out"
              style={{
                width: `${overallProgress}%`,
                backgroundColor: "#C9A84C",
              }}
            />
          </div>
          {!isComplete && !isFailed && (
            <p
              className="mt-4 text-center text-xs text-white/25"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Your documents are being prepared with care. Do not close this
              window.
            </p>
          )}
        </div>

        {/* Completion CTA */}
        {isComplete && (
          <div className="mt-12 text-center">
            <button
              onClick={() => router.push(`/documents/${applicationId}`)}
              className="border border-[#C9A84C] bg-[#C9A84C] px-8 py-3 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Review Your Documents →
            </button>
          </div>
        )}

        {/* Failure State */}
        {isFailed && (
          <div className="mt-12 text-center">
            <p
              className="mb-4 text-sm text-[#dc2626]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              One document encountered an issue. Our team will follow up within
              2 hours.
            </p>
            <button
              onClick={startGeneration}
              className="border border-[#C9A84C] px-6 py-2 text-sm font-medium uppercase tracking-wider text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Retry Generation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}