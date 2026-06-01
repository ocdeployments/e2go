"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type ChecklistItem = {
  key: string;
  label: string;
  helpKey?: string;
};

const phase1Items: ChecklistItem[] = [
  { key: "business_selected", label: "Business selected and E-2 compatible confirmed" },
  { key: "llc_formed", label: "LLC formed", helpKey: "llc_referral_trigger" },
  { key: "ein_obtained", label: "EIN obtained from IRS" },
  { key: "agreement_executed", label: "Franchise agreement or purchase agreement executed" },
  { key: "bank_account_opened", label: "U.S. business bank account opened", helpKey: "banking_referral_trigger" },
  { key: "funds_transferred", label: "Investment funds transferred to U.S. account" },
  { key: "wire_confirmation", label: "Wire transfer confirmation obtained" },
  { key: "lease_signed", label: "Commercial lease or premises signed" },
  { key: "membership_ledger", label: "Membership Interest Ledger obtained" },
  { key: "membership_certs", label: "Membership Interest Certificates obtained" },
  { key: "unanimous_consent", label: "Unanimous Written Consent obtained" },
];

const phase2Items: ChecklistItem[] = [
  { key: "licenses_obtained", label: "Business licenses obtained" },
  { key: "equipment_purchased", label: "Equipment purchased" },
  { key: "hiring_begun", label: "Hiring begun" },
  { key: "simulator_completed", label: "Interview simulator completed" },
  { key: "documents_reviewed", label: "All documents reviewed" },
];

const phase3Items: ChecklistItem[] = [
  { key: "ssn_obtained", label: "Social Security Number obtained" },
  { key: "drivers_license", label: "Driver's license converted" },
  { key: "health_insurance", label: "Health insurance arranged" },
  { key: "canadian_notified", label: "Canadian institutions notified" },
  { key: "fbar_reviewed", label: "FBAR obligation reviewed if accounts exceed $10,000 USD" },
  { key: "compliance_calendar", label: "Compliance calendar enrolled" },
  { key: "renewal_reminder", label: "Renewal reminder set" },
];

interface PhaseProps {
  title: string;
  subtitle?: string;
  items: ChecklistItem[];
  checkedItems: Set<string>;
  onToggle: (key: string) => void;
  phase: 1 | 2 | 3;
}

function PhaseSection({ title, subtitle, items, checkedItems, onToggle, phase }: PhaseProps) {
  const completion = Math.round((items.filter(i => checkedItems.has(i.key)).length / items.length) * 100);
  const phaseColors = {
    1: { accent: "var(--teal)", bg: "var(--teal-dim)" },
    2: { accent: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
    3: { accent: "var(--white-dim)", bg: "var(--glass-bg)" },
  };
  const colors = phaseColors[phase];

  return (
    <div className="glass mb-6" style={{ padding: "24px" }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold font-playfair" style={{ color: "var(--white)" }}>{title}</h2>
          {subtitle && <p className="text-sm mt-1" style={{ color: "var(--white-dim)" }}>{subtitle}</p>}
          <p className="text-sm" style={{ color: "var(--white-dim)" }}>{items.length} items</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold" style={{ color: colors.accent }}>{completion}%</span>
          <p className="text-xs" style={{ color: "var(--white-dim)" }}>complete</p>
        </div>
      </div>
      <div className="w-full rounded-full h-2 mb-6" style={{ background: "var(--glass-border)" }}>
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${completion}%`, background: colors.accent }}
        />
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checkedItems.has(item.key)}
                onChange={() => onToggle(item.key)}
                className="w-5 h-5 rounded"
                style={{ accentColor: colors.accent }}
              />
              <span style={{ color: "var(--white)" }}>{item.label}</span>
            </label>
            {phase === 1 && item.helpKey && (
              <button className="text-sm flex items-center gap-1" style={{ color: colors.accent }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                Help
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChecklistPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      // Get application ID
      const { data: app } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (app) {
        // Load saved checklist items
        const allItems = [
          ...phase1Items.map(i => `checklist_phase1_${i.key}`),
          ...phase2Items.map(i => `checklist_phase2_${i.key}`),
          ...phase3Items.map(i => `checklist_phase3_${i.key}`),
        ];

        const { data: answers } = await supabase
          .from("answers")
          .select("question_key, answer_value")
          .eq("application_id", app.id)
          .in("question_key", allItems);

        if (answers) {
          const checked = new Set<string>();
          answers.forEach(a => {
            if (a.answer_value === "true") {
              // Extract the item key from the full question_key
              const key = a.question_key.replace("checklist_phase1_", "").replace("checklist_phase2_", "").replace("checklist_phase3_", "");
              checked.add(key);
            }
          });
          setCheckedItems(checked);
        }
      }
      setLoading(false);
    };

    init();
  }, [supabase]);

  const handleToggle = async (key: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(key)) {
      newChecked.delete(key);
    } else {
      newChecked.add(key);
    }
    setCheckedItems(newChecked);

    // Save to Supabase
    if (userId) {
      const { data: app } = await supabase
        .from("applications")
        .select("id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (app) {
        // Determine which phase this key belongs to
        let phaseKey = "";
        if (phase1Items.some(i => i.key === key)) {
          phaseKey = `checklist_phase1_${key}`;
        } else if (phase2Items.some(i => i.key === key)) {
          phaseKey = `checklist_phase2_${key}`;
        } else if (phase3Items.some(i => i.key === key)) {
          phaseKey = `checklist_phase3_${key}`;
        }

        if (phaseKey) {
          await supabase
            .from("answers")
            .upsert(
              {
                application_id: app.id,
                question_key: phaseKey,
                answer_value: newChecked.has(key) ? "true" : "false",
              },
              { onConflict: "application_id,question_key" }
            );
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center">
        <div className="text-[#434655]">Loading checklist...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#c3c6d7]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-[#434655] hover:text-[#004ac6]">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#e5eeff] rounded-full text-[#004ac6] text-sm mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">YOUR ROADMAP</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0b1c30] mb-4">
              Application Checklist
            </h1>
            <p className="text-lg text-[#434655] max-w-xl mx-auto">
              Three phases. Track your progress from document preparation through visa approval.
            </p>
          </div>

          {/* Phase 1 */}
          <PhaseSection
            title="Phase 1 — Before Submission"
            subtitle="These items gate document generation"
            items={phase1Items}
            checkedItems={checkedItems}
            onToggle={handleToggle}
            phase={1}
          />

          {/* Phase 2 */}
          <PhaseSection
            title="Phase 2 — Before Interview"
            subtitle="Recommended preparation"
            items={phase2Items}
            checkedItems={checkedItems}
            onToggle={handleToggle}
            phase={2}
          />

          {/* Phase 3 */}
          <PhaseSection
            title="Phase 3 — After Visa Approval"
            subtitle="Post-arrival steps"
            items={phase3Items}
            checkedItems={checkedItems}
            onToggle={handleToggle}
            phase={3}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#0b1c30]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm text-gray-400">
            This tool is a self-service preparation guide and does not constitute legal advice.
            e2go.app is not a law firm.
          </p>
        </div>
      </footer>
    </div>
  );
}