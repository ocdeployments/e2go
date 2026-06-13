"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useParams, useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import { GENERATION_STEP_LABELS, DOCUMENT_TYPE_LABELS } from "@/types/generation";
import type { SSEProgressMessage, DocumentType } from "@/types/generation";
import AcknowledgmentGate from "@/components/AcknowledgmentGate";
import PreGenerationConfirmation from "@/components/generate/PreGenerationConfirmation";
import type { PreGenerationValidationResult } from "@/lib/pre-generation-validation";

type StepStatus = "pending" | "running" | "complete" | "failed";

interface StepState {
  id: number;
  label: string;
  status: StepStatus;
}

const TOTAL_DOCUMENTS = 6;

const DOCUMENT_LIST = [
  { id: "cover_letter", label: "Cover Letter", status: "pending" as StepStatus },
  { id: "source_of_funds", label: "Source of Funds", status: "pending" as StepStatus },
  { id: "investment_proof", label: "Investment Proof", status: "pending" as StepStatus },
  { id: "business_plan", label: "Business Plan", status: "pending" as StepStatus },
  { id: "qualifications", label: "Qualifications", status: "pending" as StepStatus },
  { id: "ds160_reference", label: "DS-160 Reference", status: "pending" as StepStatus },
];

const QUALITY_STEPS = [
  { id: 7, label: "Gap Analysis" },
  { id: 8, label: "Repetition Check" },
  { id: 9, label: "Consistency Check" },
  { id: 10, label: "AI Detection Audit" },
  { id: 11, label: "Humanization Pass" },
  { id: 12, label: "Metadata Sanitization" },
  { id: 13, label: "Quality Gate" },
  { id: 14, label: "Pre-download Ack" },
  { id: 15, label: "Preview Unlock" },
];

const STATUS_MESSAGES: Record<string, string> = {
  cover_letter: "Establishing your investment narrative for the consular officer...",
  source_of_funds: "Tracing your investment funds from source to business account...",
  investment_proof: "Documenting your investment breakdown and irrevocability...",
  business_plan: "Building your financial projections and staffing plan...",
  qualifications: "Presenting your professional qualifications and management experience...",
  ds160_reference: "Preparing your DS-160 form reference guide...",
  quality_steps: "Applying final quality checks before your package is ready...",
};

interface ApplicationData {
  applicantName?: string;
  businessName?: string;
  city?: string;
  state?: string;
  investmentAmount?: number;
  consulate?: string;
  nationality?: string;
}

export default function GenerateProgressPage() {
  const params = useParams();
  const _router = useRouter();
  const applicationId = params.applicationId as string;

  const [_jobId, setJobId] = useState<string | null>(null);
  const [_steps, setSteps] = useState<StepState[]>(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      label: GENERATION_STEP_LABELS[i + 1] || `Step ${i + 1}`,
      status: "pending" as StepStatus,
    }))
  );
  const [currentDocumentType, setCurrentDocumentType] = useState<string>("");
  const [documentText, setDocumentText] = useState<string>("");
  const [documentPreview, setDocumentPreview] = useState<string>("");
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [approvedDocuments, setApprovedDocuments] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>("queued");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [applicationData, setApplicationData] = useState<ApplicationData>({});
  const [currentQualityStep, setCurrentQualityStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const generationStarted = useRef(false);

  // Pre-generation confirmation state
  const [validation, setValidation] = useState<PreGenerationValidationResult | null>(null);
  const [validationLoading, setValidationLoading] = useState(true);
  const [validationError, setValidationError] = useState<string>("");
  const [confirming, setConfirming] = useState(false);

  // Map document type to display name
  const mapDocumentType = (type: string): string => {
    const key = type as DocumentType;
    return DOCUMENT_TYPE_LABELS[key] || type;
  };

  // Get document state based on progress
  const getDocumentState = (docId: string): StepStatus => {
    const docIndex = DOCUMENT_LIST.findIndex(d => d.id === docId);
    if (approvedDocuments > docIndex) return "complete";
    if (currentDocumentType === docId && !awaitingApproval && jobStatus !== "completed") return "running";
    if (awaitingApproval && currentDocumentType === docId) return "running";
    return "pending";
  };

  // Get quality step state
  const getQualityStepState = (stepId: number): StepStatus => {
    if (stepId < currentQualityStep) return "complete";
    if (stepId === currentQualityStep && approvedDocuments >= 6) return "running";
    return "pending";
  };

  // Download handler — streams the ZIP from the API
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/generate/download/${applicationId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'E2_Application_Package.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloaded(true);
    } catch (err) {
      console.error('[DOWNLOAD] Error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

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

  const processMessage = useCallback(
    (msg: SSEProgressMessage) => {
      console.log('[SSE msg]', msg.status, msg.awaitingApproval, msg.currentDocument);

      unstable_batchedUpdates(() => {
        setJobStatus(msg.status);
        if (msg.error) setErrorMessage(msg.error);

        const isAwaitingApproval = msg.status === 'awaiting_approval' || msg.awaitingApproval === true;
        setAwaitingApproval(isAwaitingApproval);

        if (msg.currentDocument) {
          setCurrentDocumentType(msg.currentDocument);
        }
        if (msg.currentDocumentType) {
          setCurrentDocumentType(msg.currentDocumentType);
        }
        if (msg.currentDocumentText) {
          setDocumentText(msg.currentDocumentText);
        }
        if (msg.currentDocumentPreview) {
          setDocumentPreview(msg.currentDocumentPreview);
        }

        const stepNum = msg.step || 0;
        if (stepNum >= 7) {
          setCurrentQualityStep(stepNum);
        }

        if (msg.status === "completed") {
          updateStepStatus(stepNum, "complete");
          setOverallProgress(100);
          setAwaitingApproval(false);
        } else if (msg.status === "failed") {
          updateStepStatus(stepNum, "failed");
          setOverallProgress(Math.round((stepNum / 15) * 100));
          setAwaitingApproval(false);
        } else if (msg.status === "awaiting_approval") {
          updateStepStatus(stepNum, "running");
          setOverallProgress(Math.round((stepNum / 15) * 100));
        } else {
          updateStepStatus(stepNum, "running");
          setOverallProgress(Math.round((stepNum / 15) * 100));
        }
      });
    },
    [updateStepStatus]
  );

  // Approve current document and continue
  const handleApprove = useCallback(async () => {
    if (!currentDocumentType) return;

    try {
      const res = await fetch(`/api/generate/documents/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: currentDocumentType,
          action: 'approve',
        }),
      });

      if (res.ok) {
        setApprovedDocuments(prev => prev + 1);
        setAwaitingApproval(false);
      }
    } catch (err) {
      console.error('Failed to approve document:', err);
    }
  }, [applicationId, currentDocumentType]);

  // Request revision on current document
  const handleRevise = useCallback(async () => {
    if (!currentDocumentType) return;

    try {
      const res = await fetch(`/api/generate/documents/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: currentDocumentType,
          action: 'revise',
        }),
      });

      if (res.ok) {
        setAwaitingApproval(false);
      }
    } catch (err) {
      console.error('Failed to request revision:', err);
    }
  }, [applicationId, currentDocumentType]);

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
    };

    return () => eventSource.close();
  }, [processMessage]);

  const startGeneration = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      if (!userId) {
        setErrorMessage("Please log in to continue");
        return;
      }

      // Fetch application data for header
      const appRes = await fetch(`/api/applications/${applicationId}`);
      if (appRes.ok) {
        const appData = await appRes.json();
        setApplicationData({
          applicantName: appData.applicant_name,
          businessName: appData.business_name,
          city: appData.city,
          state: appData.state,
          investmentAmount: appData.investment_amount,
          consulate: appData.consulate,
          nationality: appData.nationality,
        });
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

      await fetch(`/api/generate/run/${newJobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      connectSSE(newJobId);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
    }
  }, [applicationId, connectSSE]);

  // Handle confirmation — log to pre_generation_confirmation, then start generation
  const handleConfirm = useCallback(async (payload: {
    breakdown: Record<string, number>;
    fundSources: Record<string, number | null>;
    edits: Array<{ field: string; oldValue: number | null; newValue: number }>;
    discrepancyPrompted: boolean;
    discrepancyResolution: 'total_updated' | 're_entered_line_item' | null;
  }) => {
    setConfirming(true);
    try {
      // Log the confirmation
      await fetch('/api/generate/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          breakdown: payload.breakdown,
          fundSources: payload.fundSources,
          edits: payload.edits,
          discrepancyPrompted: payload.discrepancyPrompted,
          discrepancyResolution: payload.discrepancyResolution,
        }),
      });

      // Start generation
      generationStarted.current = true;
      await startGeneration();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to confirm');
      setConfirming(false);
    }
  }, [applicationId, startGeneration]);

  // Handle "Something needs fixing" — navigate to the relevant tab
  const handleNeedsFixing = useCallback((_returnTab: string, _instruction: string) => {
    _router.push(`/apply/investment`);
  }, []);

  // Fetch validation data on mount — shows confirmation panel instead of auto-starting
  useEffect(() => {
    const fetchValidation = async () => {
      try {
        const res = await fetch(`/api/generate/validate/${applicationId}`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Failed to load validation' }));
          setValidationError(err.error || 'Failed to load investment data');
          setValidationLoading(false);
          return;
        }
        const data = await res.json();
        setValidation(data.validation);
        setApplicationData((prev) => ({
          ...prev,
          businessName: data.businessName || prev.businessName,
        }));
      } catch {
        setValidationError('Failed to load investment data');
      } finally {
        setValidationLoading(false);
      }
    };
    fetchValidation();
  }, [applicationId]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = 0;
    }
  }, [documentText]);

  const isComplete = jobStatus === "completed";
  const isFailed = jobStatus === "failed" && !errorMessage.includes("retry");
  const isGenerating = jobStatus === "running" || jobStatus === "awaiting_approval";
  const isQualityPhase = approvedDocuments >= 6 && !isComplete;

  // Get active document for status message
  const activeDoc = currentDocumentType || "cover_letter";
  const statusMessage = isQualityPhase
    ? STATUS_MESSAGES["quality_steps"]
    : STATUS_MESSAGES[activeDoc] || STATUS_MESSAGES["cover_letter"];

  // Calculate progress bar percentage
  const progressPercent = documentText.length > 0
    ? Math.min(95, (documentText.length / 500) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      {/* ZONE 1: CASE HEADER */}
      <header className="pt-12 pb-8 text-center">
        <h1
          className="font-light text-2xl tracking-wide italic text-[#C9A84C]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {isComplete
            ? "Your application package is ready"
            : `Preparing the E-2 application of ${applicationData.applicantName || "your application"}`
          }
        </h1>

        {!isComplete && !isFailed && applicationData.businessName && (
          <p
            className="mt-2 text-[13px] text-white/50"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {applicationData.businessName}
            {applicationData.city && applicationData.state && ` · ${applicationData.city}, ${applicationData.state}`}
            {applicationData.investmentAmount && ` · $${applicationData.investmentAmount.toLocaleString()} invested`}
          </p>
        )}

        {!isComplete && !isFailed && applicationData.consulate && (
          <p
            className="mt-1 text-[12px] text-white/35"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {applicationData.consulate} Consulate
            {applicationData.nationality && ` · ${applicationData.nationality} National`}
          </p>
        )}

        <div
          className="mx-auto mt-6 h-px w-full max-w-[600px] bg-[#C9A84C]/40"
        />
      </header>

      {/* MAIN LAYOUT: Sidebar + Content */}
      <div className="flex min-h-[calc(100vh-220px)]">
        {/* ZONE 2: LEFT SIDEBAR - Desktop only */}
        <aside className="hidden lg:block w-1/4 min-w-[280px] bg-[#111111] border-r border-[#C9A84C]/10 p-8">
          <div className="sticky top-8">
            <h2
              className="mb-6 text-[10px] font-medium uppercase tracking-widest text-white/30"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Documents
            </h2>

            <div className="space-y-3">
              {DOCUMENT_LIST.map((doc) => {
                const state = getDocumentState(doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-3 text-[13px] transition-all duration-300 ${
                      state === "complete" ? "text-white/60" :
                      state === "running" ? "text-[#C9A84C]" :
                      "text-white/40"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {/* Status indicator */}
                    {state === "pending" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                    )}
                    {state === "running" && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#C9A84C] animate-pulse" />
                    )}
                    {state === "complete" && (
                      <span className="text-[#C9A84C] text-xs">✓</span>
                    )}
                    {state === "failed" && (
                      <span className="text-[#ef4444] text-xs">×</span>
                    )}

                    <span>{doc.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Quality Steps */}
            {approvedDocuments >= 6 && (
              <>
                <div className="my-6 h-px bg-[#C9A84C]/20" />

                <h2
                  className="mb-4 text-[10px] font-medium uppercase tracking-widest text-white/30"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Quality Checks
                </h2>

                <div className="space-y-2">
                  {QUALITY_STEPS.map((step) => {
                    const state = getQualityStepState(step.id);
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 text-[11px] transition-all duration-300 ${
                          state === "complete" ? "text-white/40" :
                          state === "running" ? "text-white/50" :
                          "text-white/25"
                        }`}
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        {state === "pending" && (
                          <span className="h-1 w-1 rounded-full bg-white/15" />
                        )}
                        {state === "running" && (
                          <span className="h-1 w-1 rounded-full bg-[#C9A84C]/60" />
                        )}
                        {state === "complete" && (
                          <span className="text-[#C9A84C]/60 text-[8px]">✓</span>
                        )}

                        <span>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* ZONE 3: MAIN CONTENT */}
        <main className="flex-1 px-8 lg:px-12 pb-32">
          {/* Mobile progress bar */}
          <div className="lg:hidden mb-6">
            <div className="flex items-center justify-between text-[11px] text-white/40 mb-2">
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {approvedDocuments} of {TOTAL_DOCUMENTS} documents
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {Math.round(overallProgress)}%
              </span>
            </div>
            <div className="h-px w-full bg-white/8">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${overallProgress}%`, backgroundColor: "#C9A84C" }}
              />
            </div>
          </div>

          {/* PRE-GENERATION CONFIRMATION STATE */}
          {!isGenerating && !isComplete && !isFailed && !confirming && (
            <>
              {validationLoading && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <div className="relative w-[200px] h-px mb-6">
                    <div className="absolute inset-0 bg-[#C9A84C]/20" />
                    <div className="absolute inset-0 bg-[#C9A84C] animate-pulse" style={{ animationDuration: '2s' }} />
                  </div>
                  <p
                    className="text-sm text-white/50"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Loading your investment data...
                  </p>
                </div>
              )}

              {validationError && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <p
                    className="text-sm text-white/50 mb-4"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {validationError}
                  </p>
                  <button
                    onClick={() => _router.push('/apply/investment')}
                    className="border border-[#C9A84C]/40 px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Return to Investment Tab
                  </button>
                </div>
              )}

              {validation && !validation.readyForGeneration && !validationError && (
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                  <h2
                    className="text-xl italic text-[#C9A84C] mb-4 text-center"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    Before we can generate, we need a few details
                  </h2>
                  <div className="mb-6 space-y-2">
                    {validation.blockingGaps.map((gap) => (
                      <p
                        key={gap.id}
                        className="text-sm text-white/50"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        · {gap.instruction}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const firstGap = validation.blockingGaps[0];
                      _router.push(firstGap?.returnTab || '/apply/investment');
                    }}
                    className="bg-[#C9A84C] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Complete Required Fields →
                  </button>
                </div>
              )}

              {validation && validation.readyForGeneration && (
                <PreGenerationConfirmation
                  validation={validation}
                  businessName={applicationData.businessName ?? null}
                  applicationId={applicationId}
                  onConfirm={handleConfirm}
                  onNeedsFixing={handleNeedsFixing}
                />
              )}
            </>
          )}

          {/* CONFIRMING STATE — generating after confirmation */}
          {confirming && !isGenerating && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative w-[200px] h-px mb-6">
                <div className="absolute inset-0 bg-[#C9A84C]/20" />
                <div className="absolute inset-0 bg-[#C9A84C] animate-pulse" style={{ animationDuration: '2s' }} />
              </div>
              <p
                className="text-sm text-white/50"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Starting document generation...
              </p>
            </div>
          )}

          {/* GENERATING STATE */}
          {isGenerating && !isQualityPhase && (
            <div className="max-w-[680px]">
              {/* Document header */}
              <div className="mb-6">
                <h2
                  className="text-[11px] font-medium uppercase tracking-widest text-white/50"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {mapDocumentType(currentDocumentType).toUpperCase() || "COVER LETTER"}
                </h2>
                <div className="mt-2 h-px w-full bg-[#C9A84C]/30">
                  <div
                    className="h-full bg-[#C9A84C] relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute inset-0 bg-white/30 animate-pulse" style={{ animationDuration: '1.5s' }} />
                  </div>
                </div>
              </div>

              {/* Streaming text area */}
              <div
                ref={previewRef}
                className="overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 340px)' }}
              >
                {documentText ? (
                  <pre
                    className="text-[13px] leading-[1.8] text-[#f5f0e8] whitespace-pre-wrap"
                    style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                  >
                    {documentText}
                  </pre>
                ) : (
                  <p
                    className="text-sm text-white/30 italic"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Initializing generation...
                  </p>
                )}
              </div>

              {/* AWAITING APPROVAL STATE */}
              {awaitingApproval && (
                <div className="mt-8 pt-6">
                  <div className="h-px w-full bg-[#C9A84C] mb-6" />

                  <h3
                    className="text-xl italic text-[#C9A84C] mb-2"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {mapDocumentType(currentDocumentType)} complete
                  </h3>

                  <p
                    className="text-[13px] text-white/50 mb-6"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Review and approve to continue to {DOCUMENT_LIST[approvedDocuments + 1]?.label || "next document"}
                  </p>

                  {/* Preview of last paragraph */}
                  {documentPreview && (
                    <div className="mb-6 p-4 border border-[#C9A84C]/20 bg-[#C9A84C]/5">
                      <pre
                        className="text-[13px] leading-[1.8] text-white/60 whitespace-pre-wrap"
                        style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                      >
                        {documentPreview.slice(-500)}
                      </pre>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={handleApprove}
                      className="flex-1 bg-[#C9A84C] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Approve & Continue →
                    </button>
                    <button
                      onClick={handleRevise}
                      className="flex-1 border border-[#C9A84C]/40 px-6 py-3 text-sm font-medium uppercase tracking-wider text-white/60 transition-colors hover:border-[#C9A84C] hover:text-white"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Request Revision
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* QUALITY STEPS STATE */}
          {isQualityPhase && !isComplete && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <h3
                className="text-xl italic text-[#C9A84C] mb-8 text-center"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Applying final quality checks...
              </h3>

              {/* Animated status cycling */}
              {approvedDocuments >= 6 && currentQualityStep >= 7 && (
              <div className="relative h-6 overflow-hidden">
                <div className="flex flex-col items-center animate-pulse" style={{ animationDuration: '3s' }}>
                    <span
                      className="text-[13px] text-white/50"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {currentQualityStep === 7 && "Reviewing document consistency..."}
                      {currentQualityStep === 8 && "Running AI detection audit..."}
                      {currentQualityStep === 9 && "Applying humanization pass..."}
                      {currentQualityStep === 10 && "Sanitizing document metadata..."}
                      {currentQualityStep >= 11 && "Final quality gate..."}
                    </span>
                </div>
              </div>
              )}
            </div>
          )}

          {/* COMPLETE STATE */}
          {isComplete && !acknowledged && (
            <div className="py-8">
              <AcknowledgmentGate
                applicationId={applicationId}
                onAcknowledged={() => setAcknowledged(true)}
              />
            </div>
          )}

          {/* ACKNOWLEDGED STATE — ready to download */}
          {isComplete && acknowledged && !downloaded && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <h2
                className="text-2xl italic text-[#C9A84C] mb-4 text-center"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Your documents are ready.
              </h2>

              <p
                className="text-sm text-white/50 mb-2 text-center max-w-md"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                All 6 case file documents have passed quality review and your confirmation has been recorded.
              </p>

              <p
                className="text-xs text-white/30 mb-8 text-center max-w-md"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Your package includes 7 files — 6 application documents plus a completion checklist.
                Any highlighted fields must be completed locally before submission.
              </p>

              <button
                onClick={handleDownload}
                disabled={downloading}
                className="bg-[#C9A84C] px-8 py-3 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {downloading ? 'Generating Package…' : 'Download Application Package'}
              </button>

              {downloading && (
                <p
                  className="text-xs text-white/30 mt-4"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Preparing 7 .docx files…
                </p>
              )}
            </div>
          )}

          {/* DOWNLOADED STATE — confirmation */}
          {isComplete && acknowledged && downloaded && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <h2
                className="text-2xl italic text-[#C9A84C] mb-4 text-center"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Package downloaded.
              </h2>

              <p
                className="text-sm text-white/50 mb-8 text-center max-w-md"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Check your downloads folder for E2_Application_Package.zip.
                Review each document and complete any highlighted fields before submitting to your consulate.
              </p>

              <button
                onClick={handleDownload}
                className="border border-[#C9A84C] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Download Again
              </button>
            </div>
          )}

          {/* FAILURE STATE */}
          {isFailed && (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <h2
                className="text-xl italic text-[#ef4444] mb-4"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Generation encountered an issue
              </h2>

              <p
                className="text-sm text-white/50 mb-8"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Our team has been notified and will follow up within 2 hours.
              </p>

              <button
                onClick={startGeneration}
                className="border border-[#C9A84C] px-6 py-3 text-sm font-medium uppercase tracking-wider text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Retry Generation
              </button>
            </div>
          )}
        </main>
      </div>

      {/* STATUS BAR - Bottom */}
      <footer className="fixed bottom-0 left-0 right-0 h-10 bg-[#000000] border-t border-[#C9A84C]/10 flex items-center justify-center">
        <p
          className="text-[12px] italic text-white/40"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {errorMessage || statusMessage || "Preparing your E-2 visa application package..."}
        </p>
      </footer>
    </div>
  );
}