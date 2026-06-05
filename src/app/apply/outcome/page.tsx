/* eslint-disable react/jsx-no-undef, react/no-unescaped-entities */
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type OutcomeFlow = "select" | "approved" | "refused" | "administrative_processing";

interface ApplicationData {
  id: string;
  outcome: string | null;
  confirmed_interview_date: string | null;
}

const COMMON_QUESTIONS = [
  "What is your business?",
  "How much are you investing?",
  "Where did the funds come from?",
  "What will you do if the business fails?",
  "How many employees will you hire?",
  "What is your educational background?",
  "Have you ever been to the US before?",
  "What is your marital status?",
  "Do you have any children?",
  "How long have you been in your current business?",
  "Why did you choose this particular business?",
  "What experience do you have in this industry?",
  "Will your family be moving with you?",
  "What state will you operate in?",
  "Do you have a lease for your business location?",
];

export default function OutcomeCapturePage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const router = useRouter();
  
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<OutcomeFlow>("select");
  
  // Approved flow state
  const [visaReceivedDate, setVisaReceivedDate] = useState("");
  const [spouseApproved, setSpouseApproved] = useState("");
  const [childrenApprovedCount, setChildrenApprovedCount] = useState("");
  const [interviewDuration, setInterviewDuration] = useState("");
  const [questionsAsked, setQuestionsAsked] = useState<string[]>([]);
  const [surprisingQuestions, setSurprisingQuestions] = useState("");
  
  // Refused flow state
  const [denialReason, setDenialReason] = useState("");
  const [refusedInterviewDuration, setRefusedInterviewDuration] = useState("");
  const [refusedQuestionsAsked, setRefusedQuestionsAsked] = useState<string[]>([]);
  
  // Administrative processing state
  const [received221gForm, setReceived221gForm] = useState("");
  const [documentsRequested, setDocumentsRequested] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadApplication = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: apps } = await supabase
        .from("applications")
        .select("id, outcome, confirmed_interview_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!apps || apps.length === 0) {
        setLoading(false);
        return;
      }

      const app = apps[0];
      setApplication(app);

      // If already has outcome, jump to that flow
      if (app.outcome === "approved") setFlow("approved");
      else if (app.outcome === "refused") setFlow("refused");
      else if (app.outcome === "administrative_processing") setFlow("administrative_processing");

      setLoading(false);
    };

    loadApplication();
  }, [supabase, router]);

  const handleSaveApproved = async () => {
    if (!application) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("applications")
      .update({
        outcome: "approved",
        outcome_date: today,
        visa_received_date: visaReceivedDate || null,
        spouse_approved: spouseApproved || null,
        children_approved_count: childrenApprovedCount ? parseInt(childrenApprovedCount) : null,
        interview_duration: interviewDuration || null,
        outcome_recorded_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    // Save interview questions
    for (const q of questionsAsked) {
      await supabase.from("interview_questions_reported").insert({
        application_id: application.id,
        question_text: q,
        was_asked: true,
        was_surprising: surprisingQuestions.toLowerCase().includes(q.toLowerCase()),
      });
    }

    await supabase
      .from("application_lifecycle")
      .update({ outcome_recorded_at: new Date().toISOString() })
      .eq("application_id", application.id);

    setSaving(false);
    router.push("/dashboard?outcome=saved");
  };

  const handleSaveRefused = async () => {
    if (!application) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];

    await supabase
      .from("applications")
      .update({
        outcome: "refused",
        outcome_date: today,
        denial_reason: denialReason || null,
        interview_duration: refusedInterviewDuration || null,
        outcome_recorded_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    // Save interview questions
    for (const q of refusedQuestionsAsked) {
      await supabase.from("interview_questions_reported").insert({
        application_id: application.id,
        question_text: q,
        was_asked: true,
        was_surprising: false,
      });
    }

    await supabase
      .from("application_lifecycle")
      .update({ outcome_recorded_at: new Date().toISOString() })
      .eq("application_id", application.id);

    setSaving(false);
    router.push("/dashboard?outcome=saved");
  };

  const handleSaveAdministrative = async () => {
    if (!application) return;
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];
    const checkDate = checkInDate ? new Date(checkInDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    await supabase
      .from("applications")
      .update({
        outcome: "administrative_processing",
        outcome_date: today,
        received_221g_form: received221gForm === "yes",
        documents_requested: documentsRequested || null,
        outcome_recorded_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    await supabase
      .from("application_lifecycle")
      .update({
        outcome_recorded_at: new Date().toISOString(),
        follow_up_check_in_at: checkDate.toISOString(),
      })
      .eq("application_id", application.id);

    setSaving(false);
    router.push("/dashboard?outcome=saved");
  };

  const toggleQuestion = (q: string) => {
    if (flow === "refused") {
      setRefusedQuestionsAsked((prev) =>
        prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
      );
    } else {
      setQuestionsAsked((prev) =>
        prev.includes(q) ? prev.filter((x) => x !== q) : [...prev, q]
      );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </p>
      </div>
    );
  }

  // SELECT FLOW
  if (flow === "select") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <Link
            href="/dashboard"
            className="text-sm text-white/50 hover:text-[#C9A84C] transition-colors mb-8 block"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Back to Dashboard
          </Link>

          <div
            className="mb-8 p-6"
            style={{ background: "rgba(201,168,76,0.1)", borderRadius: 0 }}
          >
            <h1
              className="text-3xl font-light mb-4"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Capture Your Interview Outcome
            </h1>
            <p className="text-sm text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Help other applicants by sharing your experience. Select what happened at your interview.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setFlow("approved")}
              className="w-full p-6 border text-left transition-all hover:bg-[#C9A84C]/10"
              style={{
                borderColor: "rgba(201,168,76,0.3)",
                borderRadius: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.15)", borderRadius: 0 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-medium text-[#22c55e]">My visa was approved</div>
                  <div className="text-sm text-white/50">Congratulations! Let's capture the details.</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setFlow("administrative_processing")}
              className="w-full p-6 border text-left transition-all hover:bg-[#C9A84C]/10"
              style={{
                borderColor: "rgba(201,168,76,0.3)",
                borderRadius: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.15)", borderRadius: 0 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-medium text-[#f59e0b]">Administrative Processing (221g)</div>
                  <div className="text-sm text-white/50">Additional documents were requested.</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setFlow("refused")}
              className="w-full p-6 border text-left transition-all hover:bg-[#C9A84C]/10"
              style={{
                borderColor: "rgba(201,168,76,0.3)",
                borderRadius: 0,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 flex items-center justify-center"
                  style={{ background: "rgba(239,68,68,0.15)", borderRadius: 0 }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
                <div>
                  <div className="text-lg font-medium text-[#ef4444]">My visa was refused</div>
                  <div className="text-sm text-white/50">We're sorry. Let's capture what happened.</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // APPROVED FLOW
  if (flow === "approved") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <button
            onClick={() => setFlow("select")}
            className="text-sm text-white/50 hover:text-[#C9A84C] transition-colors mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Choose different outcome
          </button>

          <div
            className="mb-8 p-4 border-l-4 border-[#22c55e]"
            style={{ background: "rgba(34,197,94,0.04)" }}
          >
            <h1
              className="text-2xl font-light mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#22c55e" }}
            >
              Visa Approved
            </h1>
            <p className="text-sm text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Congratulations on your E-2 visa approval! Please share some details to help us complete your record.
            </p>
          </div>

          <div className="space-y-6">
            <div className="form-field">
              <label className="form-label">When did you receive your visa?</label>
              <input
                type="date"
                value={visaReceivedDate}
                onChange={(e) => setVisaReceivedDate(e.target.value)}
                className="form-input"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#C9A84C" }} />
                Was your spouse's visa also approved?
              </label>
              <select
                value={spouseApproved}
                onChange={(e) => setSpouseApproved(e.target.value)}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
                <option value="not_applicable">Not applicable (single / no spouse)</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#C9A84C" }} />
                How many children had their visas approved?
              </label>
              <select
                value={childrenApprovedCount}
                onChange={(e) => setChildrenApprovedCount(e.target.value)}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select...</option>
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="N/A">Not applicable</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#C9A84C" }} />
                How long was your interview?
              </label>
              <select
                value={interviewDuration}
                onChange={(e) => setInterviewDuration(e.target.value)}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select...</option>
                <option value="under_5">Under 5 minutes</option>
                <option value="5-10">5-10 minutes</option>
                <option value="10-15">10-15 minutes</option>
                <option value="15+">15+ minutes</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#C9A84C" }} />
                Which questions were you asked? (select all that apply)
              </label>
              <div className="space-y-2 mt-2">
                {COMMON_QUESTIONS.map((q) => (
                  <label
                    key={q}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      questionsAsked.includes(q) ? "border-[#C9A84C] bg-[#C9A84C]/5" : "border-white/10 hover:border-white/20"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <input
                      type="checkbox"
                      checked={questionsAsked.includes(q)}
                      onChange={() => toggleQuestion(q)}
                      className="mt-1 accent-[#C9A84C]"
                    />
                    <span className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{q}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">
                Did anything about the interview surprise you? (optional)
              </label>
              <textarea
                value={surprisingQuestions}
                onChange={(e) => setSurprisingQuestions(e.target.value)}
                className="form-input"
                placeholder="Any unexpected questions, topics, or situations..."
                rows={3}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
            </div>

            <button
              onClick={handleSaveApproved}
              disabled={saving}
              className="w-full py-4 bg-[#22c55e] text-[#0a0a0a] font-medium text-sm uppercase tracking-wider transition-colors hover:bg-[#16a34a] disabled:opacity-50"
              style={{ borderRadius: 0, fontFamily: "'DM Sans', sans-serif" }}
            >
              {saving ? "Saving..." : "Save and see my next steps →"}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // REFUSED FLOW
  if (flow === "refused") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <button
            onClick={() => setFlow("select")}
            className="text-sm text-white/50 hover:text-[#C9A84C] transition-colors mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Choose different outcome
          </button>

          <div
            className="mb-8 p-4 border-l-4 border-[#ef4444]"
            style={{ background: "rgba(239,68,68,0.04)" }}
          >
            <h1
              className="text-2xl font-light mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Visa Refused
            </h1>
            <p className="text-sm text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              We're sorry to hear about your outcome. Your experience helps others prepare better.
            </p>
          </div>

          <div className="space-y-6">
            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#ef4444" }} />
                Were you given a reason for the refusal?
              </label>
              <select
                value={denialReason ? "yes" : "no"}
                onChange={(e) => {
                  if (e.target.value === "no") setDenialReason("");
                }}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            {denialReason && (
              <div className="form-field">
                <label className="form-label">
                  <span className="privacy-dot" style={{ background: "#ef4444" }} />
                  What reason did they give?
                </label>
                <textarea
                  value={denialReason}
                  onChange={(e) => setDenialReason(e.target.value)}
                  className="form-input"
                  placeholder="What reason did the officer mention..."
                  rows={3}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            )}

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#ef4444" }} />
                How long was your interview?
              </label>
              <select
                value={refusedInterviewDuration}
                onChange={(e) => setRefusedInterviewDuration(e.target.value)}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select...</option>
                <option value="under_5">Under 5 minutes</option>
                <option value="5-10">5-10 minutes</option>
                <option value="10-15">10-15 minutes</option>
                <option value="15+">15+ minutes</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#ef4444" }} />
                Which questions were you asked? (select all that apply)
              </label>
              <div className="space-y-2 mt-2">
                {COMMON_QUESTIONS.map((q) => (
                  <label
                    key={q}
                    className={`flex items-start gap-3 p-3 border cursor-pointer transition-colors ${
                      refusedQuestionsAsked.includes(q) ? "border-[#ef4444] bg-[#ef4444]/5" : "border-white/10 hover:border-white/20"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    <input
                      type="checkbox"
                      checked={refusedQuestionsAsked.includes(q)}
                      onChange={() => toggleQuestion(q)}
                      className="mt-1 accent-[#ef4444]"
                    />
                    <span className="text-sm" style={{ fontFamily: "'DM Sans', sans-serif" }}>{q}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveRefused}
              disabled={saving}
              className="w-full py-4 bg-[#ef4444] text-white font-medium text-sm uppercase tracking-wider transition-colors hover:bg-[#dc2626] disabled:opacity-50"
              style={{ borderRadius: 0, fontFamily: "'DM Sans', sans-serif" }}
            >
              {saving ? "Saving..." : "Save my experience →"}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ADMINISTRATIVE PROCESSING FLOW
  if (flow === "administrative_processing") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <button
            onClick={() => setFlow("select")}
            className="text-sm text-white/50 hover:text-[#C9A84C] transition-colors mb-6"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Choose different outcome
          </button>

          <div
            className="mb-8 p-4 border-l-4 border-[#f59e0b]"
            style={{ background: "rgba(245,158,11,0.04)" }}
          >
            <h1
              className="text-2xl font-light mb-2"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: "#f59e0b" }}
            >
              Administrative Processing (221g)
            </h1>
            <p className="text-sm text-white/70" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Additional documentation was requested. Let's track your status and next steps.
            </p>
          </div>

          <div className="space-y-6">
            <div className="form-field">
              <label className="form-label">
                <span className="privacy-dot" style={{ background: "#f59e0b" }} />
                Did you receive a 221(g) form?
              </label>
              <select
                value={received221gForm}
                onChange={(e) => setReceived221gForm(e.target.value)}
                className="form-select"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No (verbal request)</option>
              </select>
            </div>

            {received221gForm && (
              <div className="form-field">
                <label className="form-label">
                  <span className="privacy-dot" style={{ background: "#f59e0b" }} />
                  What documents were requested?
                </label>
                <textarea
                  value={documentsRequested}
                  onChange={(e) => setDocumentsRequested(e.target.value)}
                  className="form-input"
                  placeholder="What documents did the officer request..."
                  rows={3}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              </div>
            )}

            <div className="form-field">
              <label className="form-label">
                When do you want to check in on your status?
              </label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="form-input"
                min={new Date().toISOString().split("T")[0]}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              />
              <p className="text-xs text-white/40 mt-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Default: 14 days from today
              </p>
            </div>

            <button
              onClick={handleSaveAdministrative}
              disabled={saving}
              className="w-full py-4 bg-[#f59e0b] text-[#0a0a0a] font-medium text-sm uppercase tracking-wider transition-colors hover:bg-[#d97706] disabled:opacity-50"
              style={{ borderRadius: 0, fontFamily: "'DM Sans', sans-serif" }}
            >
              {saving ? "Saving..." : "Save and track my status →"}
            </button>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-sm text-white/40 hover:text-white/60 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
