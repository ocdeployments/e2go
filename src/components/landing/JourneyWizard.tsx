"use client";

import { useState, useMemo } from "react";

const traditionalSteps = [
  { id: 1, label: "Research and orientation", range: "Weeks 1–4" },
  { id: 2, label: "Business search and FDD review", range: "Weeks 4–20" },
  { id: 3, label: "LLC, EIN, U.S. bank account", range: "Weeks 16–24" },
  { id: 4, label: "Find immigration consultant", range: "Weeks 20–28" },
  { id: 5, label: "Document gathering and drafting", range: "Weeks 24–34" },
  { id: 6, label: "Application submission", range: "Weeks 34–40" },
  { id: 7, label: "Consulate processing and outcome", range: "Weeks 40–56+" },
];

const e2goSteps = [
  { id: 1, label: "Eligibility quiz and score", range: "Day 1" },
  { id: 2, label: "Franchise broker introduction", range: "Week 1" },
  { id: 3, label: "Business selection and FDD review", range: "Weeks 1–6" },
  { id: 4, label: "LLC, EIN, U.S. bank account", range: "Weeks 4–8" },
  { id: 5, label: "Document interview — 12 tabs", range: "Weeks 8–10" },
  { id: 6, label: "AI document generation and review", range: "Weeks 10–12" },
  { id: 7, label: "Interview prep and simulator", range: "Weeks 12–16" },
  { id: 8, label: "Consulate interview", range: "Weeks 16–20" },
];

const stageDurations = {
  exploring: { traditional: "9–14 months", e2go: "16–20 weeks" },
  identified: { traditional: "7–11 months", e2go: "12–16 weeks" },
  llc: { traditional: "5–8 months", e2go: "8–12 weeks" },
  documents: { traditional: "3–5 months", e2go: "4–8 weeks" },
};

const stageCollapseIndex = {
  exploring: 0,
  identified: 2,
  llc: 3,
  documents: 5,
};

const targetMonths = ["3 months", "6 months", "9 months", "12 months", "18 months"];
const currentStages = ["Just exploring", "Business identified", "LLC formed", "Documents started"];
const applyingWith = ["Just me", "Me + spouse", "Me + spouse + children"];

export default function JourneyWizard() {
  const [targetDate, setTargetDate] = useState(3);
  const [currentStage, setCurrentStage] = useState(0);
  const [applying, setApplying] = useState(0);

  const collapseIndex = stageCollapseIndex[currentStages[currentStage].toLowerCase().replace(" ", "") as keyof typeof stageCollapseIndex] || 0;

  const traditionalDuration = Object.values(stageDurations)[currentStage];
  const e2goDuration = Object.values(stageDurations)[currentStage];

  const targetWeeks = (targetMonths[targetDate] as string).replace(" months", "") as unknown as number * 4;
  const targetWeeksNum = parseInt(targetMonths[targetDate]) * 4;
  const e2goMinWeeks = parseInt(e2goDuration.e2go.split("–")[0]) * 7;
  const e2goMaxWeeks = parseInt(e2goDuration.e2go.split("–")[1]?.replace(" weeks", "") || e2goDuration.e2go.split("–")[0]) * 7;
  const tradMinWeeks = parseInt(traditionalDuration.traditional.split("–")[0]) * 4;
  const tradMaxWeeks = parseInt(traditionalDuration.traditional.split("–")[1]?.replace(" months", "") || traditionalDuration.traditional.split("–")[0]) * 4;

  const gapMessage = useMemo(() => {
    if (targetWeeksNum < e2goMinWeeks) {
      return {
        type: "tight",
        text: `Your ${targetMonths[targetDate]} target is tight. Start immediately — every week matters.`,
      };
    }
    if (tradMinWeeks > targetWeeksNum) {
      const monthsSpare = Math.round((tradMinWeeks - targetWeeksNum) / 4);
      return {
        type: "gold",
        text: `The traditional route cannot meet your ${targetMonths[targetDate]} target. e2go can — with ${monthsSpare} months to spare.`,
      };
    }
    const speedup = Math.round((tradMinWeeks - e2goMaxWeeks) / 4);
    return {
      type: "gold",
      text: `e2go gets you to your interview approximately ${speedup} months faster than the traditional route.`,
    };
  }, [targetWeeksNum, e2goMinWeeks, e2goMaxWeeks, tradMinWeeks, targetDate]);

  return (
    <div className="w-full">
      {/* Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div>
          <label className="block font-sans text-sm text-[rgba(245,240,232,0.6)] mb-2">
            Target move date
          </label>
          <select
            value={targetDate}
            onChange={(e) => setTargetDate(parseInt(e.target.value))}
            className="w-full font-sans text-[#f5f0e8] bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-colors"
          >
            {targetMonths.map((month, idx) => (
              <option key={month} value={idx} className="bg-[#0a0a0a]">
                {month}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-sans text-sm text-[rgba(245,240,232,0.6)] mb-2">
            Where you are now
          </label>
          <select
            value={currentStage}
            onChange={(e) => setCurrentStage(parseInt(e.target.value))}
            className="w-full font-sans text-[#f5f0e8] bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-colors"
          >
            {currentStages.map((stage, idx) => (
              <option key={stage} value={idx} className="bg-[#0a0a0a]">
                {stage}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-sans text-sm text-[rgba(245,240,232,0.6)] mb-2">
            Applying with
          </label>
          <select
            value={applying}
            onChange={(e) => setApplying(parseInt(e.target.value))}
            className="w-full font-sans text-[#f5f0e8] bg-[#0a0a0a] border border-[rgba(201,168,76,0.2)] px-4 py-3 focus:outline-none focus:border-[#C9A84C] transition-colors"
          >
            {applyingWith.map((option, idx) => (
              <option key={option} value={idx} className="bg-[#0a0a0a]">
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Traditional Route */}
        <div className="border border-[rgba(201,168,76,0.12)] bg-[rgba(201,168,76,0.02)] p-6">
          <h3 className="font-sans text-lg text-[rgba(245,240,232,0.45)] mb-6">
            Traditional route
          </h3>
          <div className="space-y-0">
            {traditionalSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-start py-3 ${
                  idx < collapseIndex ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-3 h-3 rounded-full border ${
                      idx < collapseIndex
                        ? "bg-[rgba(245,240,232,0.25)] border-[rgba(245,240,232,0.25)] line-through"
                        : "bg-transparent border-[rgba(245,240,232,0.45)]"
                    }`}
                  />
                  {idx < traditionalSteps.length - 1 && (
                    <div className="w-px h-8 bg-[rgba(201,168,76,0.2)]" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-sans text-sm ${
                      idx < collapseIndex
                        ? "text-[rgba(245,240,232,0.25)] line-through"
                        : "text-[rgba(245,240,232,0.7)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`font-sans text-xs mt-1 ${
                      idx < collapseIndex
                        ? "text-[rgba(245,240,232,0.15)]"
                        : "text-[rgba(245,240,232,0.35)]"
                    }`}
                  >
                    {step.range}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(201,168,76,0.12)]">
            <p className="font-sans text-sm text-[rgba(245,240,232,0.5)]">
              Estimated: <span className="text-[rgba(245,240,232,0.7)]">{traditionalDuration.traditional}</span>
            </p>
          </div>
        </div>

        {/* e2go Route */}
        <div className="border border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.02)] p-6">
          <h3 className="font-sans text-lg text-[#C9A84C] mb-6">e2go route</h3>
          <div className="space-y-0">
            {e2goSteps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-start py-3 ${
                  idx < collapseIndex ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`w-3 h-3 rounded-full border ${
                      idx < collapseIndex
                        ? "bg-[#C9A84C] border-[#C9A84C] line-through"
                        : "bg-transparent border-[#C9A84C]"
                    }`}
                  />
                  {idx < e2goSteps.length - 1 && (
                    <div className="w-px h-8 bg-[rgba(201,168,76,0.3)]" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-sans text-sm ${
                      idx < collapseIndex
                        ? "text-[rgba(201,168,76,0.4)] line-through"
                        : "text-[#f5f0e8]"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p
                    className={`font-sans text-xs mt-1 ${
                      idx < collapseIndex
                        ? "text-[rgba(201,168,76,0.2)]"
                        : "text-[rgba(201,168,76,0.6)]"
                    }`}
                  >
                    {step.range}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(201,168,76,0.3)]">
            <p className="font-sans text-sm text-[rgba(245,240,232,0.5)]">
              Estimated: <span className="text-[#C9A84C]">{e2goDuration.e2go}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Gap Indicator */}
      <div
        className={`mt-8 p-4 border ${
          gapMessage.type === "gold"
            ? "border-[#C9A84C] bg-[rgba(201,168,76,0.05)]"
            : "border-red-900 bg-red-900/10"
        }`}
      >
        <p
          className={`font-sans text-sm text-center ${
            gapMessage.type === "gold" ? "text-[#C9A84C]" : "text-red-400"
          }`}
        >
          {gapMessage.text}
        </p>
      </div>
    </div>
  );
}