"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase";
import PackageSummary from "@/components/PackageSummary";
import DocumentAuditPanel from "@/components/documents/DocumentAuditPanel";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_TABS,
} from "@/types/generation";
import type {
  GeneratedDocument,
  DocumentListResponse,
  RevisionCredit,
  DocumentType,
} from "@/types/generation";
import type { PackageManifest } from "@/lib/cic-package-manifest";

// ─── Local types ─────────────────────────────────────────────────────────────

interface ModalState {
  open: boolean;
  document: GeneratedDocument | null;
}

interface RegenFormState {
  open: boolean;
  documentType: DocumentType | "";
  note: string;
  submitting: boolean;
}

interface ChangeImpactReport {
  affectedDocumentTypes: string[];
  changedDimensions: string[];
  urgency: "high" | "medium" | "low";
  summary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string | null> {
  try {
    const { data: { session } } = await createBrowserSupabaseClient().auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsReviewPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [credits, setCredits] = useState<RevisionCredit | null>(null);
  const [manifest, setManifest] = useState<PackageManifest | null>(null);
  const [impactReport, setImpactReport] = useState<ChangeImpactReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<ModalState>({ open: false, document: null });
  const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);

  const [regenForm, setRegenForm] = useState<RegenFormState>({
    open: false,
    documentType: "",
    note: "",
    submitting: false,
  });

  const [certifying, setCertifying] = useState<string | null>(null); // documentType being certified
  const [dismissingImpact, setDismissingImpact] = useState(false);

  const [acknowledgments, setAcknowledgments] = useState({
    genuine: false,
    nolawyer: false,
    reviewed: false,
    attorney: false,
    responsible: false,
    outcomes_consent: false, // D6 — consent to share anonymised outcome for learning
  });
  const [downloadState, setDownloadState] = useState<
    "locked" | "ready" | "downloading" | "complete"
  >("locked");

  // Derived
  const allAcknowledged = Object.values(acknowledgments).every(Boolean);
  const packageReady = manifest?.packageReady ?? false;
  const canDownload = packageReady && allAcknowledged;

  useEffect(() => {
    setDownloadState(canDownload ? "ready" : "locked");
  }, [canDownload]);

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const [docsRes, manifestRes, impactRes] = await Promise.all([
        fetch(`/api/generate/documents/${applicationId}`),
        fetch(`/api/dashboard/package-manifest?applicationId=${applicationId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`/api/dashboard/change-impact?applicationId=${applicationId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (docsRes.status === 401) { setError("Not authenticated"); return; }
      if (!docsRes.ok) throw new Error("Failed to fetch documents");

      const docsData: DocumentListResponse = await docsRes.json();
      setDocuments(docsData.documents || []);
      setCredits(docsData.credits);

      if (manifestRes.ok) {
        const mData = await manifestRes.json() as PackageManifest;
        setManifest(mData);
      }

      if (impactRes.ok) {
        const iData = await impactRes.json() as { impactReport: ChangeImpactReport | null };
        setImpactReport(iData.impactReport ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const certifyDocument = async (documentType: DocumentType) => {
    setCertifying(documentType);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/dashboard/certify-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ applicationId, documentType }),
      });
      if (!res.ok) throw new Error("Certification failed");

      // Optimistic update
      setDocuments((prev) =>
        prev.map((d) =>
          d.document_type === documentType
            ? { ...d, client_certified: true, certified_at: new Date().toISOString() }
            : d
        )
      );
      // Refresh manifest to update packageReady
      const token2 = await getAuthToken();
      const mRes = await fetch(
        `/api/dashboard/package-manifest?applicationId=${applicationId}`,
        { headers: token2 ? { Authorization: `Bearer ${token2}` } : {} }
      );
      if (mRes.ok) setManifest(await mRes.json() as PackageManifest);

      closeModal();
    } catch {
      alert("Could not certify — please try again.");
    } finally {
      setCertifying(null);
    }
  };

  const submitRegen = async () => {
    if (!regenForm.documentType) return;
    setRegenForm((prev) => ({ ...prev, submitting: true }));
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/dashboard/request-regeneration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          applicationId,
          documentType: regenForm.documentType,
          note: regenForm.note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Request failed");

      // Optimistic: clear certified flag on this document
      setDocuments((prev) =>
        prev.map((d) =>
          d.document_type === regenForm.documentType
            ? { ...d, client_certified: false, certified_at: null }
            : d
        )
      );
      setRegenForm({ open: false, documentType: "", note: "", submitting: false });
      closeModal();
    } catch {
      alert("Could not request regeneration — please try again.");
      setRegenForm((prev) => ({ ...prev, submitting: false }));
    }
  };

  const dismissImpact = async () => {
    setDismissingImpact(true);
    try {
      const token = await getAuthToken();
      await fetch(`/api/dashboard/change-impact?applicationId=${applicationId}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setImpactReport(null);
    } finally {
      setDismissingImpact(false);
    }
  };

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  const openModal = (doc: GeneratedDocument) => {
    setModal({ open: true, document: doc });
    setHoveredParagraph(null);
  };

  const closeModal = () => {
    setModal({ open: false, document: null });
    setHoveredParagraph(null);
    setRegenForm((prev) => ({ ...prev, open: false }));
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

  const docLabel = (doc: GeneratedDocument): string =>
    DOCUMENT_TYPE_LABELS[doc.document_type as DocumentType] || doc.document_type;

  const docTab = (doc: GeneratedDocument): string =>
    DOCUMENT_TYPE_TABS[doc.document_type as DocumentType] || "";

  const isCertified = (doc: GeneratedDocument) => Boolean(doc.client_certified);

  const getStatusBadge = (doc: GeneratedDocument) => {
    const base = "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border";
    if (isCertified(doc)) {
      return <span className={`${base} border-[#22c55e]/40 text-[#22c55e]`}>CERTIFIED</span>;
    }
    if (doc.status === "approved" || doc.status === "awaiting_approval") {
      return <span className={`${base} border-[#C9A84C]/40 text-[#C9A84C]`}>AWAITING CERTIFICATION</span>;
    }
    if (doc.status === "generating") {
      return <span className={`${base} border-white/10 text-white/30`}>GENERATING</span>;
    }
    return <span className={`${base} border-white/15 text-white/40`}>UNDER REVIEW</span>;
  };

  // ─── Derived counts for progress strip ────────────────────────────────────
  const certifiedCount = manifest?.certifiedCount ?? 0;
  const totalGenerated = documents.length;
  const outstandingCount = manifest?.outstandingCount ?? 0;

  // ─── Loading / error ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading documents…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p className="mb-4 text-sm text-[#dc2626]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {error}
          </p>
          <button
            onClick={fetchAll}
            className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#C9A84C]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-4xl px-6 py-12">

        {/* ── Change Impact Banner ────────────────────────────────────────── */}
        {impactReport && (
          <div
            className={`mb-8 border p-5 ${
              impactReport.urgency === "high"
                ? "border-[#dc2626]/30 bg-[#dc2626]/5"
                : impactReport.urgency === "medium"
                ? "border-[#C9A84C]/30 bg-[#C9A84C]/5"
                : "border-white/10 bg-white/2"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p
                  className={`mb-1 text-xs font-medium uppercase tracking-wider ${
                    impactReport.urgency === "high"
                      ? "text-[#dc2626]"
                      : impactReport.urgency === "medium"
                      ? "text-[#C9A84C]"
                      : "text-white/40"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {impactReport.urgency === "high" ? "⚠ High priority" : "Document update detected"}
                </p>
                <p
                  className="text-sm text-white/70 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {impactReport.summary}
                </p>
                {impactReport.affectedDocumentTypes.length > 0 && (
                  <p
                    className="mt-2 text-xs text-white/40"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Documents that may need re-certification:{" "}
                    {impactReport.affectedDocumentTypes
                      .map((dt) => DOCUMENT_TYPE_LABELS[dt as DocumentType] ?? dt)
                      .join(", ")}
                  </p>
                )}
              </div>
              <button
                onClick={dismissImpact}
                disabled={dismissingImpact}
                className="shrink-0 text-white/30 hover:text-white/60 text-xs uppercase tracking-wider border border-white/15 px-3 py-1.5 transition-colors disabled:opacity-30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="mb-10">
          <h1
            className="mb-2 text-4xl font-light tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Your Application Package
          </h1>
          <div
            className="flex flex-wrap items-center gap-4 text-sm text-white/50"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>Application {applicationId.slice(0, 8)}</span>
            {credits && (
              <span className="text-white/30">
                Revision credits:{" "}
                <span className="text-[#C9A84C]">{credits.credits_remaining}</span>
              </span>
            )}
          </div>
        </div>

        {/* ── Package Progress Strip ───────────────────────────────────────── */}
        {documents.length > 0 && (
          <div className="mb-10 border border-white/8 bg-[#0d0d0d] px-6 py-4">
            <div
              className="flex flex-wrap items-center justify-between gap-4 mb-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xl font-light text-[#22c55e]">{certifiedCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Certified</p>
                </div>
                <div className="h-8 w-px bg-white/8" />
                <div className="text-center">
                  <p className="text-xl font-light text-white/60">{totalGenerated - certifiedCount}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/30">Awaiting</p>
                </div>
                {outstandingCount > 0 && (
                  <>
                    <div className="h-8 w-px bg-white/8" />
                    <div className="text-center">
                      <p className="text-xl font-light text-white/30">{outstandingCount}</p>
                      <p className="text-[10px] uppercase tracking-wider text-white/20">Outstanding</p>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${packageReady ? "bg-[#22c55e]" : "bg-white/20"}`}
                />
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    packageReady ? "text-[#22c55e]" : "text-white/30"
                  }`}
                >
                  {packageReady ? "Package ready" : "Certification in progress"}
                </span>
              </div>
            </div>
            {/* Progress bar */}
            <div className="h-px w-full bg-white/6">
              <div
                className="h-px bg-[#22c55e] transition-all duration-500"
                style={{
                  width: totalGenerated > 0 ? `${(certifiedCount / totalGenerated) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        )}

        {/* ── Document Cards ───────────────────────────────────────────────── */}
        <div className="mb-12 space-y-6">
          {documents.map((doc) => (
            <div key={doc.id} className="border border-white/8 bg-[#0d0d0d]">
              {/* Card header */}
              <div className="flex flex-wrap items-start justify-between gap-4 p-6">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3
                      className="text-lg font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {docLabel(doc)}
                    </h3>
                    {getStatusBadge(doc)}
                  </div>
                  <div
                    className="flex flex-wrap gap-4 text-xs text-white/30"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span>{docTab(doc)}</span>
                    {doc.page_estimate && <span>~{doc.page_estimate} pages</span>}
                    {doc.word_count && (
                      <span>{doc.word_count.toLocaleString()} words</span>
                    )}
                    {doc.revision_count > 0 && (
                      <span>
                        {doc.revision_count} revision
                        {doc.revision_count > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {isCertified(doc) ? (
                    /* Already certified — only regen available */
                    <button
                      onClick={() => {
                        openModal(doc);
                        setRegenForm((prev) => ({
                          ...prev,
                          open: true,
                          documentType: doc.document_type,
                        }));
                      }}
                      className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:border-white/30 hover:text-white/60"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Request New Draft
                    </button>
                  ) : (
                    /* Not yet certified */
                    <>
                      <button
                        onClick={() => openModal(doc)}
                        className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#f5f0e8] transition-colors hover:bg-[#C9A84C]/10"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Read &amp; Certify
                      </button>
                      <button
                        onClick={() => {
                          openModal(doc);
                          setRegenForm((prev) => ({
                            ...prev,
                            open: true,
                            documentType: doc.document_type,
                          }));
                        }}
                        className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:border-white/30"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Request New Draft
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Quality audit panel */}
              {doc.content_text && (
                <DocumentAuditPanel
                  doc={doc}
                  onRequestRevision={() => {
                    openModal(doc);
                    setRegenForm((prev) => ({
                      ...prev,
                      open: true,
                      documentType: doc.document_type,
                    }));
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* ── Empty State ──────────────────────────────────────────────────── */}
        {documents.length === 0 && (
          <div className="border border-white/8 bg-[#0d0d0d] p-12 text-center">
            <p
              className="text-sm text-white/30"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              No documents have been generated yet.
            </p>
          </div>
        )}

        {/* ── Outstanding Items List ───────────────────────────────────────── */}
        {manifest && outstandingCount > 0 && (
          <div className="mb-12 border border-white/8 bg-[#0d0d0d] p-6">
            <h2
              className="mb-4 text-base font-light text-white/60"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Outstanding Items
            </h2>
            <div className="space-y-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {manifest.tabs
                .filter((t) => t.status === "outstanding" && t.source !== "auto")
                .map((t) => (
                  <div key={t.tabNumber} className="flex items-start gap-3">
                    <span className="mt-0.5 text-[10px] text-white/20 font-mono w-6 shrink-0">
                      {t.tabNumber}
                    </span>
                    <div>
                      <p className="text-sm text-white/50">{t.label}</p>
                      <p className="text-xs text-white/25 leading-snug">{t.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── Package Strength Overview ────────────────────────────────────── */}
        {documents.length > 0 && (
          <div className="mb-12">
            <PackageSummary applicationId={applicationId} />
          </div>
        )}

        {/* ── Acknowledgment + Download Gate ──────────────────────────────── */}
        {packageReady && documents.length > 0 && (
          <div className="border border-[#C9A84C]/20 bg-[#0d0d0d] p-8">
            <h2
              className="mb-2 text-xl font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Before You Download
            </h2>
            <p
              className="mb-6 text-sm text-[#22c55e]/80"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              All {certifiedCount} document{certifiedCount !== 1 ? "s" : ""} certified — your package is ready.
            </p>

            <div className="space-y-4">
              {[
                {
                  key: "genuine" as const,
                  text: "I confirm this application is for my own genuine investment",
                },
                {
                  key: "nolawyer" as const,
                  text: "I understand e2go has prepared these documents to support my application, not guarantee its approval",
                },
                {
                  key: "reviewed" as const,
                  text: "I have reviewed all documents and confirm they are accurate",
                },
                {
                  key: "attorney" as const,
                  text: "I understand I may wish to have an immigration attorney review this package before submission",
                },
                {
                  key: "responsible" as const,
                  text: "I accept full responsibility for the accuracy of the information I provided",
                },
                {
                  key: "outcomes_consent" as const,
                  text: "I consent to e2go using my anonymised case outcome (approved / denied / RFE) to improve guidance for future E-2 applicants. No personal details are shared. I can withdraw consent at any time in Settings.",
                },
              ].map(({ key, text }) => (
                <label key={key} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={acknowledgments[key]}
                    onChange={(e) =>
                      setAcknowledgments((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-[#C9A84C]"
                  />
                  <span
                    className="text-sm text-white/70"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {text}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-8 text-center">
              <button
                disabled={
                  downloadState === "locked" || downloadState === "downloading"
                }
                onClick={async () => {
                  if (downloadState !== "ready") return;
                  setDownloadState("downloading");
                  try {
                    const token = await getAuthToken();
                    const res = await fetch(
                      `/api/generate/download/${applicationId}`,
                      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
                    );
                    if (!res.ok) throw new Error("Download failed");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `e2go-embassy-package-${
                      new Date().toISOString().split("T")[0]
                    }.zip`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    setDownloadState("complete");
                  } catch {
                    setDownloadState("ready");
                  }
                }}
                className={`border px-8 py-3 text-sm font-medium uppercase tracking-wider transition-all duration-300 ${
                  downloadState === "locked"
                    ? "cursor-not-allowed border-[#C9A84C]/20 bg-[#C9A84C]/5 text-[#f5f0e8]/50"
                    : downloadState === "downloading"
                    ? "cursor-wait border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]"
                    : downloadState === "complete"
                    ? "cursor-default border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]"
                    : "cursor-pointer border-[#C9A84C] bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#d4b35c]"
                }`}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {downloadState === "locked" && "Complete all confirmations to download"}
                {downloadState === "downloading" && "Preparing your package…"}
                {downloadState === "complete" && "Package downloaded"}
                {downloadState === "ready" && "Download your embassy package"}
              </button>
              {downloadState === "complete" && (
                <p
                  className="mt-3 text-xs text-[#22c55e]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Your package has been downloaded. Keep it secure.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Not-ready hint when docs exist but package isn't complete ────── */}
        {!packageReady && documents.length > 0 && (
          <div
            className="border border-white/6 bg-[#0d0d0d] p-6 text-center"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <p className="text-sm text-white/30">
              Read and certify each document above to unlock your embassy package.
            </p>
          </div>
        )}
      </div>

      {/* ── Document Modal ───────────────────────────────────────────────────── */}
      {modal.open && modal.document && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0a0a0a]/95 p-6"
          onClick={closeModal}
        >
          <div
            className="relative my-8 w-full max-w-3xl border border-white/8 bg-[#0d0d0d]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-8 py-5">
              <div>
                <h2
                  className="text-xl font-light"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  {docLabel(modal.document)}
                </h2>
                <div className="mt-1 flex gap-3 text-xs text-white/30">
                  <span>{docTab(modal.document)}</span>
                  {modal.document.page_estimate && (
                    <span>~{modal.document.page_estimate} pages</span>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-white/30 hover:text-white/60"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="max-h-[60vh] overflow-y-auto px-8 py-6">
              {regenForm.open ? (
                /* ── Request New Draft form ─────────────────────────────── */
                <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <h3 className="mb-1 text-sm font-medium text-[#C9A84C]">
                    Request a New Draft
                  </h3>
                  <p className="mb-4 text-xs text-white/30">
                    Describe what needs to change. The generation engine will use
                    your note as its first priority instruction.
                  </p>
                  <textarea
                    value={regenForm.note}
                    onChange={(e) =>
                      setRegenForm((prev) => ({ ...prev, note: e.target.value }))
                    }
                    placeholder="e.g. The investment breakdown is missing the franchise fee. Please add it to the financial summary section."
                    rows={5}
                    className="w-full border border-white/10 bg-[#0a0a0a] p-3 text-sm text-white/80 placeholder:text-white/20"
                    disabled={regenForm.submitting}
                  />
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      onClick={() =>
                        setRegenForm((prev) => ({ ...prev, open: false, note: "" }))
                      }
                      disabled={regenForm.submitting}
                      className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 disabled:opacity-30"
                    >
                      Back
                    </button>
                    <button
                      onClick={submitRegen}
                      disabled={regenForm.submitting}
                      className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#C9A84C] disabled:opacity-30"
                    >
                      {regenForm.submitting ? "Submitting…" : "Submit Request"}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Document content ────────────────────────────────────── */
                <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {(modal.document.content_text || "No content generated yet.")
                    .split(/\n\n+/)
                    .filter(Boolean)
                    .map((para, idx) => (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredParagraph(idx)}
                        onMouseLeave={() => setHoveredParagraph(null)}
                        style={{
                          position: "relative",
                          marginBottom: "16px",
                          padding: "8px 10px",
                          borderLeft:
                            hoveredParagraph === idx
                              ? "2px solid rgba(201,168,76,0.4)"
                              : "2px solid transparent",
                          transition: "border-color 0.15s",
                          background:
                            hoveredParagraph === idx
                              ? "rgba(201,168,76,0.03)"
                              : "transparent",
                        }}
                      >
                        <p
                          className="whitespace-pre-wrap text-sm leading-relaxed"
                          style={{ color: "rgba(245,240,232,0.7)", margin: 0 }}
                        >
                          {para}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/8 px-8 py-5">
              {regenForm.open ? (
                <span />
              ) : (
                <button
                  onClick={() =>
                    setRegenForm((prev) => ({
                      ...prev,
                      open: true,
                      documentType: modal.document?.document_type ?? "",
                    }))
                  }
                  className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:border-white/30"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Request a New Draft
                </button>
              )}

              {!regenForm.open && (
                <button
                  disabled={
                    isCertified(modal.document) ||
                    certifying === modal.document.document_type
                  }
                  onClick={() =>
                    certifyDocument(modal.document!.document_type)
                  }
                  className="border border-[#C9A84C] bg-[#C9A84C] px-6 py-2 text-xs font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c] disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {certifying === modal.document.document_type
                    ? "Certifying…"
                    : isCertified(modal.document)
                    ? "Certified"
                    : "Certify This Document"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
