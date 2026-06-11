"use client";

import { useEffect, useState } from "react";
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

interface TimelineData {
  workingTargetDate: string | null;
  confirmedInterviewDate: string | null;
  deadlineMode: "ranges" | "specific";
}

interface CalendarItem {
  itemType: string;
  dueDate: string | null;
  rangeDescription?: string;
  anchorNote?: string;
  status: "pending" | "completed" | "overdue";
}

interface PhaseGroup {
  phase: string;
  title: string;
  items: CalendarItem[];
}

const ITEM_LABELS: Record<string, string> = {
  ds_160_submission: "DS-160 Submission",
  ds_156e_submission: "DS-156E Submission",
  document_review_final: "Document Review Final",
  interview_prep_complete: "Interview Prep Complete",
  package_printed_organised: "Package Printed & Organised",
  fee_payment: "Fee Payment",
  biometrics: "Biometrics Appointment",
  medical_exam: "Medical Examination",
};

const PHASE_ORDER = [
  { phase: "pre_interview_1", title: "Initial Submissions" },
  { phase: "pre_interview_2", title: "Document Preparation" },
  { phase: "pre_interview_3", title: "Final Preparations" },
  { phase: "post_approval", title: "Post-Approval Steps" },
];

const PRE_INTERVIEW_ITEMS = [
  { itemType: "fee_payment", daysBefore: 30, phase: "pre_interview_1" },
  { itemType: "ds_160_submission", daysBefore: 14, phase: "pre_interview_1" },
  { itemType: "ds_156e_submission", daysBefore: 14, phase: "pre_interview_1" },
  { itemType: "biometrics", daysBefore: 21, phase: "pre_interview_2" },
  { itemType: "medical_exam", daysBefore: 14, phase: "pre_interview_2" },
  { itemType: "document_review_final", daysBefore: 7, phase: "pre_interview_3" },
  { itemType: "interview_prep_complete", daysBefore: 3, phase: "pre_interview_3" },
  { itemType: "package_printed_organised", daysBefore: 1, phase: "pre_interview_3" },
];


function getPhaseForItem(itemType: string): string {
  const item = PRE_INTERVIEW_ITEMS.find(i => i.itemType === itemType);
  return item?.phase || "pre_interview_1";
}

function groupItemsByPhase(items: CalendarItem[]): PhaseGroup[] {
  const phaseMap = new Map<string, CalendarItem[]>();
  
  for (const item of items) {
    const phase = getPhaseForItem(item.itemType);
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, []);
    }
    phaseMap.get(phase)!.push(item);
  }
  
  return PHASE_ORDER
    .filter(p => phaseMap.has(p.phase))
    .map(p => ({
      phase: p.phase,
      title: p.title,
      items: phaseMap.get(p.phase) || [],
    }));
}

export default function ComplianceCalendarPage() {
  useTrackSectionVisit("calendar");

  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputDate, setInputDate] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: apps } = await supabase
        .from("applications")
        .select("id, working_target_date, confirmed_interview_date, outcome")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!apps || apps.length === 0) {
        setLoading(false);
        return;
      }

      const app = apps[0];
      const deadlineMode = app.confirmed_interview_date ? "specific" : "ranges";

      setTimeline({
        workingTargetDate: app.working_target_date,
        confirmedInterviewDate: app.confirmed_interview_date,
        deadlineMode,
      });

      // Show renewal alert for approved applications
      if (app.outcome === "approved") {
        setShowRenewalAlert(true);
      }

      if (deadlineMode === "specific") {
        const { data: calendarItems } = await supabase
          .from("calendar_items")
          .select("item_type, due_date, status")
          .eq("application_id", app.id)
          .order("due_date", { ascending: true });

        setItems(
          (calendarItems || []).map((item: { item_type: string; due_date: string; status: "pending" | "completed" | "overdue" }) => ({
            itemType: item.item_type,
            dueDate: item.due_date,
            anchorNote: `Calculated from your confirmed interview date of ${new Date(
              app.confirmed_interview_date!
            ).toLocaleDateString()}`,
            status: item.status || "pending",
          }))
        );
      } else {
        setItems(
          PRE_INTERVIEW_ITEMS.map((d) => {
            const weeks = Math.ceil(d.daysBefore / 7);
            return {
              itemType: d.itemType,
              dueDate: null,
              rangeDescription: `Approximately ${weeks} week${
                weeks > 1 ? "s" : ""
              } before your interview`,
              status: "pending" as const,
            };
          })
        );
      }
      setLoading(false);
    };

    loadData();
  }, [supabase]);

  const handleConfirmDate = async () => {
    if (!inputDate || !timeline) return;
    setUpdating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: apps } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!apps || apps.length === 0) {
      setUpdating(false);
      return;
    }

    const appId = apps[0].id;
    const confirmedDate = new Date(inputDate);

    // Update application
    await supabase
      .from("applications")
      .update({ confirmed_interview_date: inputDate })
      .eq("id", appId);

    // Create/update calendar items
    const updates = PRE_INTERVIEW_ITEMS.map((d) => {
      const dueDate = new Date(confirmedDate);
      dueDate.setDate(dueDate.getDate() - d.daysBefore);
      return supabase
        .from("calendar_items")
        .upsert({
          application_id: appId,
          item_type: d.itemType,
          due_date: dueDate.toISOString().split("T")[0],
          status: "pending",
        })
        .eq("application_id", appId)
        .eq("item_type", d.itemType);
    });

    await Promise.all(updates);

    // Refresh data
    window.location.reload();
  };

  const handleMarkComplete = async (itemType: string) => {
    if (!timeline?.confirmedInterviewDate) return;
    
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: apps } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!apps || apps.length === 0) return;

    await supabase
      .from("calendar_items")
      .update({ status: "completed" })
      .eq("application_id", apps[0].id)
      .eq("item_type", itemType);

    setItems(items.map(item => 
      item.itemType === itemType ? { ...item, status: "completed" as const } : item
    ));
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

  const phaseGroups = groupItemsByPhase(items);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8]">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex justify-between items-center mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-white/50 hover:text-[#C9A84C] transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ← Back to Dashboard
          </Link>
          <Link
            href="/documents"
            className="text-sm font-medium px-4 py-2 bg-[#C9A84C] text-[#0a0a0a] hover:bg-[#D4BC6A] transition-colors"
            style={{ borderRadius: 0, fontFamily: "'DM Sans', sans-serif" }}
          >
            Next: Documents →
          </Link>
        </div>

        <h1
          className="text-3xl font-light tracking-wide mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Compliance Calendar
        </h1>
        <p className="text-sm text-white/50 mb-8" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Track your critical deadlines leading up to your E-2 visa interview.
        </p>

        {/* Renewal Alert */}
        {showRenewalAlert && (
          <div
            className="mb-8 p-4 border-l-2 border-[#C9A84C]"
            style={{ background: "rgba(201,168,76,0.08)" }}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center" style={{ background: "rgba(201,168,76,0.15)" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2">
                  <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-[#C9A84C]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Renewal Reminder
                </h3>
                <p className="text-xs text-white/60 mt-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  Your E-2 visa is valid for up to 5 years. Start preparing your renewal 6 months before expiration.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Date Input Section */}
        {timeline?.deadlineMode === "ranges" && (
          <div
            className="mb-8 p-4 border-l-2 border-[#C9A84C]"
            style={{ background: "rgba(201,168,76,0.04)" }}
          >
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.8)", fontFamily: "'DM Sans', sans-serif" }}>
              Your compliance deadlines will lock in once you confirm your interview appointment date.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="flex-1 bg-transparent border border-[#C9A84C] px-3 py-2 text-sm text-[#f5f0e8] focus:outline-none focus:ring-1 focus:ring-[#C9A84C]"
                style={{ fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}
              />
              <button
                onClick={handleConfirmDate}
                disabled={!inputDate || updating}
                className="bg-[#C9A84C] px-4 py-2 text-xs font-medium uppercase tracking-wider text-[#0a0a0a] disabled:opacity-50 transition-colors"
                style={{ fontFamily: "'DM Sans', sans-serif", borderRadius: 0 }}
              >
                {updating ? "Saving..." : "Lock In Deadlines"}
              </button>
            </div>
          </div>
        )}

        {timeline?.deadlineMode === "specific" && (
          <div
            className="mb-8 p-4 border-l-2 border-[#C9A84C]"
            style={{ background: "rgba(201,168,76,0.04)" }}
          >
            <p className="text-sm" style={{ color: "rgba(245,240,232,0.8)", fontFamily: "'DM Sans', sans-serif" }}>
              Deadlines calculated from your confirmed interview date of{" "}
              <span className="font-semibold text-[#C9A84C]">
                {timeline.confirmedInterviewDate
                  ? new Date(timeline.confirmedInterviewDate).toLocaleDateString()
                  : "N/A"}
              </span>
              .
            </p>
            <button
              onClick={() => {
                setInputDate(timeline.confirmedInterviewDate || "");
                setTimeline({ ...timeline, deadlineMode: "ranges" });
              }}
              className="mt-2 text-xs text-[#C9A84C] hover:underline"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Update date
            </button>
          </div>
        )}

        {/* Phase Groups */}
        {phaseGroups.map((group) => (
          <div key={group.phase} className="mb-8">
            <h2
              className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {group.title}
            </h2>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.itemType}
                  className={`p-4 border transition-all ${
                    item.status === "completed" 
                      ? "border-[#22c55e]/30 bg-[#22c55e]/5" 
                      : "border-white/8 hover:border-white/15"
                  }`}
                  style={{ borderRadius: 0 }}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleMarkComplete(item.itemType)}
                        disabled={item.status === "completed" || !timeline?.confirmedInterviewDate}
                        className={`flex-shrink-0 w-5 h-5 border transition-colors ${
                          item.status === "completed"
                            ? "bg-[#22c55e] border-[#22c55e]"
                            : "border-white/30 hover:border-[#C9A84C]"
                        }`}
                        style={{ borderRadius: 0 }}
                      >
                        {item.status === "completed" && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3" className="mx-auto mt-1">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      <div>
                        <h3
                          className={`text-base font-medium ${
                            item.status === "completed" ? "text-white/50 line-through" : ""
                          }`}
                          style={{ fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {ITEM_LABELS[item.itemType] || item.itemType}
                        </h3>
                        {item.rangeDescription && (
                          <p className="text-xs mt-1" style={{ color: "rgba(245,240,232,0.6)" }}>
                            {item.rangeDescription}
                          </p>
                        )}
                        {item.anchorNote && (
                          <p className="text-xs mt-1" style={{ color: "rgba(201,168,76,0.8)" }}>
                            {item.anchorNote}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.dueDate ? (
                        <p
                          className="text-sm font-semibold"
                          style={{ 
                            color: item.status === "completed" ? "rgba(245,240,232,0.5)" : "#C9A84C", 
                            fontFamily: "'DM Sans', sans-serif" 
                          }}
                        >
                          {new Date(item.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      ) : (
                        <span
                          className="inline-block px-2 py-1 text-xs border"
                          style={{ borderColor: "rgba(245,240,232,0.2)", color: "rgba(245,240,232,0.4)" }}
                        >
                          TBD
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Empty state for no date */}
        {timeline?.deadlineMode === "ranges" && items.length > 0 && (
          <div className="mt-12 text-center p-6 border border-dashed" style={{ borderColor: "rgba(255,255,255,0.1)", borderRadius: 0 }}>
            <p className="text-sm text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Confirm your interview date above to see your specific deadlines.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
