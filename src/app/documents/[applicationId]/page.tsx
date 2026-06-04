"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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

interface ModalState {
  open: boolean;
  document: GeneratedDocument | null;
}

export default function DocumentsReviewPage() {
  const params = useParams();
  const applicationId = params.applicationId as string;

  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [credits, setCredits] = useState<RevisionCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ModalState>({ open: false, document: null });
  const [revisionForm, setRevisionForm] = useState({
    open: false,
    documentId: "",
    description: "",
  });
  const [acknowledgments, setAcknowledgments] = useState({
    genuine: false,
    nolawyer: false,
    reviewed: false,
    attorney: false,
    responsible: false,
  });
  const [showDownload, setShowDownload] = useState(false);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("supabase_user");
      const userId = stored ? JSON.parse(stored).id : null;
      if (!userId) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch(`/api/generate/documents/${applicationId}`, {
        headers: { Authorization: `Bearer ${userId}` },
      });

      if (!res.ok) throw new Error("Failed to fetch documents");

      const data: DocumentListResponse = await res.json();
      setDocuments(data.documents || []);
      setCredits(data.credits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const openModal = (doc: GeneratedDocument) => {
    setModal({ open: true, document: doc });
  };

  const closeModal = () => {
    setModal({ open: false, document: null });
    setRevisionForm({ open: false, documentId: "", description: "" });
  };

  const openRevisionForm = (documentId: string) => {
    setRevisionForm({ open: true, documentId, description: "" });
  };

  const submitRevision = async () => {
    if (!revisionForm.documentId || !revisionForm.description.trim()) return;
    // Revision request would go to an API endpoint
    // For now, close the form
    setRevisionForm({ open: false, documentId: "", description: "" });
    setCredits((prev) =>
      prev
        ? { ...prev, credits_remaining: prev.credits_remaining - 1, credits_used: prev.credits_used + 1 }
        : null
    );
  };

  const approveDocument = async (documentId: string) => {
    try {
      const stored = localStorage.getItem("supabase_user");
      const userId = stored ? JSON.parse(stored).id : null;

      await fetch(`/api/generate/documents/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userId}`,
        },
        body: JSON.stringify({ documentId, status: "approved" }),
      });

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === documentId ? { ...d, status: "approved" } : d
        )
      );
    } catch {
      // Silently fail — user can retry
    }
  };

  const allApproved = documents.every((d) => d.status === "approved");
  const allAcknowledged = Object.values(acknowledgments).every(Boolean);
  const canDownload = allApproved && allAcknowledged;

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border";
    switch (status) {
      case "approved":
        return (
          <span className={`${baseClasses} border-[#C9A84C]/40 text-[#C9A84C]`}>
            APPROVED
          </span>
        );
      case "locked":
        return (
          <span className={`${baseClasses} border-[#C9A84C]/20 text-[#C9A84C]/60`}>
            LOCKED
          </span>
        );
      case "under_review":
      default:
        return (
          <span className={`${baseClasses} border-white/15 text-white/50`}>
            UNDER REVIEW
          </span>
        );
    }
  };

  const docLabel = (doc: GeneratedDocument): string => {
    const key = doc.document_type as DocumentType;
    return DOCUMENT_TYPE_LABELS[key] || doc.document_type;
  };

  const docTab = (doc: GeneratedDocument): string => {
    const key = doc.document_type as DocumentType;
    return DOCUMENT_TYPE_TABS[key] || "";
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading documents...
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
            onClick={fetchDocuments}
            className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#C9A84C]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-12">
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
                Credits remaining:{" "}
                <span className="text-[#C9A84C]">{credits.credits_remaining}</span>
              </span>
            )}
          </div>
        </div>

        {/* Document Cards */}
        <div className="mb-12 space-y-6">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="border border-white/8 bg-[#0d0d0d] p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3
                      className="text-lg font-light"
                      style={{ fontFamily: "'Cormorant Garamond', serif" }}
                    >
                      {docLabel(doc)}
                    </h3>
                    {getStatusBadge(doc.status)}
                  </div>
                  <div
                    className="flex flex-wrap gap-4 text-xs text-white/30"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    <span>{docTab(doc)}</span>
                    {doc.page_estimate && (
                      <span>~{doc.page_estimate} pages</span>
                    )}
                    {doc.word_count && (
                      <span>{doc.word_count.toLocaleString()} words</span>
                    )}
                    {doc.revision_count > 0 && (
                      <span>{doc.revision_count} revision{doc.revision_count > 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(doc)}
                    className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#f5f0e8] transition-colors hover:bg-[#C9A84C]/10"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Read &amp; Approve
                  </button>
                  <button
                    onClick={() => openRevisionForm(doc.id)}
                    disabled={!credits || credits.credits_remaining <= 0}
                    className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:border-white/30 disabled:opacity-30"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Revise
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
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

        {/* Acknowledgment Gate */}
        {allApproved && documents.length > 0 && (
          <div className="border border-[#C9A84C]/20 bg-[#0d0d0d] p-8">
            <h2
              className="mb-6 text-xl font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Before You Download
            </h2>
            <p
              className="mb-6 text-sm text-white/50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Please confirm the following before downloading your application
              package:
            </p>

            <div className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgments.genuine}
                  onChange={(e) =>
                    setAcknowledgments((prev) => ({
                      ...prev,
                      genuine: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[#C9A84C]"
                />
                <span
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  I confirm this application is for my own genuine investment
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgments.nolawyer}
                  onChange={(e) =>
                    setAcknowledgments((prev) => ({
                      ...prev,
                      nolawyer: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[#C9A84C]"
                />
                <span
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  I understand e2go has prepared these documents to support my
                  application, not guarantee its approval
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgments.reviewed}
                  onChange={(e) =>
                    setAcknowledgments((prev) => ({
                      ...prev,
                      reviewed: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[#C9A84C]"
                />
                <span
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  I have reviewed all documents and confirm they are accurate
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgments.attorney}
                  onChange={(e) =>
                    setAcknowledgments((prev) => ({
                      ...prev,
                      attorney: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[#C9A84C]"
                />
                <span
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  I understand I may wish to have an immigration attorney review
                  this package before submission
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={acknowledgments.responsible}
                  onChange={(e) =>
                    setAcknowledgments((prev) => ({
                      ...prev,
                      responsible: e.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 accent-[#C9A84C]"
                />
                <span
                  className="text-sm text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  I accept full responsibility for the accuracy of the
                  information I provided
                </span>
              </label>
            </div>

            <div className="mt-8 text-center">
              <button
                disabled={!allAcknowledged}
                onClick={() => setShowDownload(true)}
                className="border border-[#C9A84C] bg-[#C9A84C] px-8 py-3 text-sm font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c] disabled:opacity-30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {allAcknowledged
                  ? "Download Complete Package (ZIP)"
                  : "Check All Boxes to Download"}
              </button>
              {showDownload && canDownload && (
                <p
                  className="mt-3 text-xs text-[#C9A84C]"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  Download starting... (ZIP export coming in next session)
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Modal */}
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
              {revisionForm.open ? (
                <div>
                  <h3
                    className="mb-4 text-sm font-medium text-[#C9A84C]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Request a Revision
                  </h3>
                  <textarea
                    value={revisionForm.description}
                    onChange={(e) =>
                      setRevisionForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what needs to be changed..."
                    rows={4}
                    className="w-full border border-white/10 bg-[#0a0a0a] p-3 text-sm text-white/80 placeholder:text-white/20"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  />
                  <div className="mt-3 flex items-center justify-between">
                    <p
                      className="text-xs text-white/30"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      This uses 1 revision credit (
                      {credits?.credits_remaining || 0} remaining)
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setRevisionForm({
                            open: false,
                            documentId: "",
                            description: "",
                          })
                        }
                        className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={submitRevision}
                        disabled={!revisionForm.description.trim()}
                        className="border border-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#C9A84C] disabled:opacity-30"
                        style={{ fontFamily: "'DM Sans', sans-serif" }}
                      >
                        Submit Revision
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <pre
                  className="whitespace-pre-wrap text-sm leading-relaxed text-white/70"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {modal.document.content_text || "No content generated yet."}
                </pre>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/8 px-8 py-5">
              <button
                onClick={() =>
                  revisionForm.open
                    ? setRevisionForm({
                        open: false,
                        documentId: "",
                        description: "",
                      })
                    : openRevisionForm(modal.document?.id || "")
                }
                className="border border-white/15 px-4 py-2 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:border-white/30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {revisionForm.open ? "Back to Document" : "Request a Change"}
              </button>
              <button
                onClick={() => {
                  approveDocument(modal.document?.id || "");
                  closeModal();
                }}
                disabled={modal.document?.status === "approved"}
                className="border border-[#C9A84C] bg-[#C9A84C] px-6 py-2 text-xs font-medium uppercase tracking-wider text-[#0a0a0a] transition-colors hover:bg-[#d4b35c] disabled:opacity-30"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {modal.document?.status === "approved"
                  ? "Already Approved"
                  : "Approve This Document"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}