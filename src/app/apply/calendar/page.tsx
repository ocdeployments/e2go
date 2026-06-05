"use client";

import { useEffect, useState } from "react";
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

const ITEM_LABELS: Record<string, string> = {
  ds_160_submission: "DS-160 Submission",
  ds_156e_submission: "DS-156E Submission",
  document_review_final: "Document Review Final",
  interview_prep_complete: "Interview Prep Complete",
  package_printed_organised: "Package Printed & Organised",
};

export default function ComplianceCalendarPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputDate, setInputDate] = useState("");
  const [updating, setUpdating] = useState(false);

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
        .select("id, working_target_date, confirmed_interview_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!apps || apps.length === 0) {
        setLoading(false);
        return;
      }

      const appId = apps[0].id;
      const app = apps[0];

      const deadlineMode = app.confirmed_interview_date ? "specific" : "ranges";

      setTimeline({
        workingTargetDate: app.working_target_date,
        confirmedInterviewDate: app.confirmed_interview_date,
        deadlineMode,
      });

      if (deadlineMode === "specific") {
        const { data: calendarItems } = await supabase
          .from("calendar_items")
          .select("item_type, due_date, status")
          .eq("application_id", appId)
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
        const deadlines = [
          { itemType: "ds_160_submission", daysBefore: 14 },
          { itemType: "ds_156e_submission", daysBefore: 14 },
          { itemType: "document_review_final", daysBefore: 21 },
          { itemType: "interview_prep_complete", daysBefore: 7 },
          { itemType: "package_printed_organised", daysBefore: 3 },
        ];
        setItems(
          deadlines.map((d) => {
            const weeks = Math.ceil(d.daysBefore / 7);
            return {
              itemType: d.itemType,
              dueDate: null,
              rangeDescription: `Approximately ${weeks} week${
                weeks > 1 ? "s" : ""
              } before your interview`,
              status: "pending",
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

    // Recalculate deadlines
    const deadlines = [
      { itemType: "ds_160_submission", daysBefore: 14 },
      { itemType: "ds_156e_submission", daysBefore: 14 },
      { itemType: "document_review_final", daysBefore: 21 },
      { itemType: "interview_prep_complete", daysBefore: 7 },
      { itemType: "package_printed_organised", daysBefore: 3 },
    ];

    const updates = deadlines.map((d) => {
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm text-white/30" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </p>
      </div>
    );
  }

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

        {timeline?.deadlineMode === "ranges" && (
          <>
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
          </>
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

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.itemType}
              className="p-4 border transition-colors"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3
                    className="text-base font-medium"
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
                <div className="text-right">
                  {item.dueDate ? (
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#C9A84C", fontFamily: "'DM Sans', sans-serif" }}
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
    </div>
  );
}
