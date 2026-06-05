"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase";

type Stage = "exploring" | "business" | "llc" | "documents";

interface Milestone {
  id: string;
  title: string;
  duration: string;
  track: "e2go" | "traditional";
}

const MILESTONES: Milestone[] = [
  // e2go Track
  { id: "e1", title: "Eligibility confirmed", duration: "1-2 weeks", track: "e2go" },
  { id: "e2", title: "Business discovery", duration: "2-4 weeks", track: "e2go" },
  { id: "e3", title: "Business selected", duration: "2-4 weeks", track: "e2go" },
  { id: "e4", title: "LLC + banking formed", duration: "2-3 weeks", track: "e2go" },
  { id: "e5", title: "Document interview", duration: "1 week", track: "e2go" },
  { id: "e6", title: "Analysis + gap conversation", duration: "1 week", track: "e2go" },
  { id: "e7", title: "Document generation & review", duration: "1-2 weeks", track: "e2go" },
  { id: "e8", title: "Interview prep", duration: "1 week", track: "e2go" },
  { id: "e9", title: "Application submitted", duration: "2-4 weeks", track: "e2go" },
  { id: "e10", title: "Visa granted", duration: "1 week", track: "e2go" },
  // Traditional Track
  { id: "t1", title: "Research E-2 eligibility", duration: "2-4 weeks", track: "traditional" },
  { id: "t2", title: "Find franchise broker", duration: "1-2 weeks", track: "traditional" },
  { id: "t3", title: "Business discovery", duration: "8-16 weeks", track: "traditional" },
  { id: "t4", title: "LLC formation + banking", duration: "4-6 weeks", track: "traditional" },
  { id: "t5", title: "Find immigration consultant", duration: "1-2 weeks", track: "traditional" },
  { id: "t6", title: "Document gathering", duration: "4-6 weeks", track: "traditional" },
  { id: "t7", title: "Consultant drafts documents", duration: "3-5 weeks", track: "traditional" },
  { id: "t8", title: "Consulate interview", duration: "2-4 weeks", track: "traditional" },
];

const STAGE_OPTIONS: { id: Stage; label: string }[] = [
  { id: "exploring", label: "Just exploring" },
  { id: "business", label: "Business identified" },
  { id: "llc", label: "LLC formed" },
  { id: "documents", label: "Documents started" },
];

const GAP_MAP: Record<Stage, number> = {
  exploring: 21,
  business: 17,
  llc: 13,
  documents: 8,
};

const TRADITIONAL_STATUS_MAP: Record<Stage, string> = {
  exploring: "",
  business: "Traditional route: still in discovery phase.",
  llc: "Traditional route: still completing formation.",
  documents: "Traditional route: significantly behind at this stage.",
};

const BANNER_MAP: Record<Stage, string> = {
  exploring: "",
  business: "",
  llc: "You're already ahead of most applicants at this stage.",
  documents: "You're ahead of the traditional route timeline.",
};

export default function JourneyWizard() {
  const [stage, setStage] = useState<Stage>("exploring");
  const [isLoaded, setIsLoaded] = useState(false);
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    const loadStage = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("applications").select("journey_wizard_stage").maybeSingle();
        if (data?.journey_wizard_stage) {
          setStage(data.journey_wizard_stage as Stage);
        }
      } else {
        const saved = localStorage.getItem("e2go_journey_stage");
        if (saved && ["exploring", "business", "llc", "documents"].includes(saved)) {
          setStage(saved as Stage);
        }
      }
      setIsLoaded(true);
    };
    loadStage();
  }, [supabase]);

  const handleStageChange = async (newStage: Stage) => {
    setStage(newStage);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("applications").update({ journey_wizard_stage: newStage }).maybeSingle();
    } else {
      localStorage.setItem("e2go_journey_stage", newStage);
    }
  };

  if (!isLoaded) return null;

  const getVisibleMilestones = () => {
    return MILESTONES.filter((m) => {
      if (m.track === "e2go") {
        if (stage === "exploring") return true;
        if (stage === "business") return ["e3", "e4", "e5", "e6", "e7", "e8", "e9", "e10"].includes(m.id);
        if (stage === "llc") return ["e5", "e6", "e7", "e8", "e9", "e10"].includes(m.id);
        if (stage === "documents") return ["e7", "e8", "e9", "e10"].includes(m.id);
      }
      if (m.track === "traditional") {
        return true; // Traditional always shows but gets a status label
      }
      return true;
    });
  };

  const visibleMilestones = getVisibleMilestones();
  const gap = GAP_MAP[stage];
  const traditionalStatus = TRADITIONAL_STATUS_MAP[stage];
  const banner = BANNER_MAP[stage];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-light text-[#f5f0e8] mb-2 font-serif">Where are you now?</h2>
        <p className="text-[rgba(245,240,232,0.60)] text-sm">Select your current stage to see your personalised timeline.</p>
      </div>

      {/* Stage Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {STAGE_OPTIONS.map((option) => {
          const isSelected = stage === option.id;
          return (
            <button
              key={option.id}
              onClick={() => handleStageChange(option.id)}
              className={`relative flex flex-col items-start p-4 transition-all duration-300 ease-in-out ${
                isSelected
                  ? "border-[#C9A84C] bg-[rgba(201,168,76,0.08)] border"
                  : "border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.02)] border-[0.5px]"
              }`}
              style={{ borderRadius: 0 }}
            >
              {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#C9A84C]" />}
              <span className="font-['DM_Sans'] font-light text-[13px] text-[#f5f0e8]">{option.label}</span>
            </button>
          );
        })}
      </div>

      {/* Banner */}
      {banner && (
        <div className="mb-8 p-4 bg-[rgba(201,168,76,0.08)] border border-[#C9A84C] animate-fade-in">
          <p className="text-[#C9A84C] font-['DM_Sans'] text-sm text-center">{banner}</p>
        </div>
      )}

      {/* Timeline Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* e2go Track */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#C9A84C] mb-4 border-b border-[rgba(201,168,76,0.2)] pb-2">The e2go route</h3>
          <div className="space-y-3">
            {visibleMilestones
              .filter((m) => m.track === "e2go")
              .map((m, idx) => (
                <div key={m.id} className="flex gap-4 items-start animate-collapse-in">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border border-[#C9A84C] flex items-center justify-center mt-0.5">
                    <span className="text-[10px] text-[#C9A84C]">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[#f5f0e8] text-sm font-['DM_Sans']">{m.title}</div>
                    <div className="text-[#C9A84C] text-xs font-['DM_Sans'] opacity-80">{m.duration}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Traditional Track */}
        <div className="space-y-4 relative">
          <h3 className="text-lg font-medium text-[rgba(245,240,232,0.50)] mb-4 border-b border-[rgba(201,168,76,0.12)] pb-2">The traditional route</h3>
          {traditionalStatus && (
            <div className="mb-4 text-xs text-[rgba(245,240,232,0.50)] font-['DM_Sans'] italic">
              {traditionalStatus}
            </div>
          )}
          <div className="space-y-3 opacity-60">
            {visibleMilestones
              .filter((m) => m.track === "traditional")
              .map((m, idx) => (
                <div key={m.id} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border border-[rgba(245,240,232,0.30)] flex items-center justify-center mt-0.5">
                    <span className="text-[10px] text-[rgba(245,240,232,0.50)]">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-[rgba(245,240,232,0.60)] text-sm font-['DM_Sans']">{m.title}</div>
                    <div className="text-[rgba(245,240,232,0.40)] text-xs font-['DM_Sans']">{m.duration}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Gap Callout */}
      <div className="text-center py-8 border-t border-b border-[rgba(201,168,76,0.15)]">
        <div className="text-4xl font-light italic text-[#C9A84C] font-serif mb-2 transition-opacity duration-500">
          Save up to {gap} weeks.
        </div>
        <p className="text-[rgba(245,240,232,0.60)] text-sm font-['DM_Sans'] font-light">
          Same destination. A fraction of the time and cost.
        </p>
      </div>
    </div>
  );
}
