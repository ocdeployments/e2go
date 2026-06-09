import Link from "next/link";

const traditionalSteps = [
  { title: "Research E-2 eligibility", duration: "2–4 weeks", friction: true },
  { title: "Find a franchise broker", duration: "1–2 weeks", friction: false },
  { title: "Business discovery", duration: "8–16 weeks", friction: true },
  { title: "LLC formation + banking", duration: "4–6 weeks", friction: true },
  { title: "Find an immigration consultant", duration: "1–2 weeks", friction: false },
  { title: "Document gathering", duration: "4–6 weeks", friction: true },
  { title: "Consultant drafts documents", duration: "3–5 weeks", friction: true },
  { title: "Consulate interview", duration: "Wait + attend", friction: false },
];

const e2goSteps = [
  { title: "Eligibility confirmed", duration: "10 minutes", accel: true },
  { title: "Franchise connector briefed", duration: "Same day", accel: false },
  { title: "Focused business discovery", duration: "4–6 weeks", accel: true },
  { title: "LLC + banking via referral", duration: "2–3 weeks", accel: true },
  { title: "Document interview", duration: "Guided, in-app", accel: false },
  { title: "Analysis + gap conversation", duration: "Automated", accel: false },
  { title: "Documents generated & reviewed", duration: "Days", accel: true },
  { title: "Interview simulator + consulate", duration: "Prepared", accel: false },
];

export default function ComparisonSection() {
  return (
    <section className="w-full py-24 px-8 bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[#C9A84C] text-[11px] uppercase tracking-[0.18em] font-['DM_Sans'] font-medium mb-4">
            Two paths. One destination.
          </p>
          <h2 className="text-[40px] font-light italic text-[#f5f0e8] font-['Cormorant_Garamond'] leading-tight">
            The traditional route. And the better one.
          </h2>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative">
          {/* Vertical separator line for desktop */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-[rgba(201,168,76,0.15)] -translate-x-1/2" />

          {/* Traditional Route */}
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-[rgba(245,240,232,0.50)] mb-6 pb-2 border-b border-[rgba(201,168,76,0.12)]">
              The traditional route
            </h3>
            <div className="space-y-5 flex-1">
              {traditionalSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border border-[rgba(245,240,232,0.20)] flex items-center justify-center mt-0.5">
                    <span className="text-[10px] text-[rgba(245,240,232,0.40)]">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[rgba(245,240,232,0.60)] text-sm font-['DM_Sans'] line-through decoration-[rgba(245,240,232,0.30)]">
                        {step.title}
                      </span>
                      {step.friction && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[rgba(245,158,11,0.30)] text-[rgba(245,158,11,0.80)]">
                          High effort
                        </span>
                      )}
                    </div>
                    <div className="text-[rgba(245,240,232,0.40)] text-xs font-['DM_Sans']">
                      {step.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-[rgba(201,168,76,0.12)]">
              <p className="text-[rgba(245,240,232,0.50)] text-lg font-['DM_Sans'] font-light">
                9–14 months total
              </p>
              <p className="text-[rgba(245,240,232,0.50)] text-lg font-['DM_Sans'] font-light mt-1">
                $12,000–$25,000 in fees
              </p>
            </div>
          </div>

          {/* E2go Route */}
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-[#C9A84C] mb-6 pb-2 border-b border-[rgba(201,168,76,0.25)]">
              The E2go route
            </h3>
            <div className="space-y-5 flex-1">
              {e2goSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start group">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border border-[#C9A84C] flex items-center justify-center mt-0.5">
                    <span className="text-[10px] text-[#C9A84C]">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[#f5f0e8] text-sm font-['DM_Sans'] font-medium">
                        {step.title}
                      </span>
                      {step.accel && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-[rgba(201,168,76,0.40)] text-[#C9A84C]">
                          E2go accelerates
                        </span>
                      )}
                    </div>
                    <div className="text-[#C9A84C] text-xs font-['DM_Sans'] opacity-80">
                      {step.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-[rgba(201,168,76,0.25)]">
              <p className="text-[#C9A84C] text-lg font-['DM_Sans'] font-medium">
                4–6 months total
              </p>
              <p className="text-[#C9A84C] text-lg font-['DM_Sans'] font-medium mt-1">
                $297–$647
              </p>
            </div>
          </div>
        </div>

        {/* Gap Callout */}
        <div className="text-center py-10 mt-8 border-t border-b border-[rgba(201,168,76,0.15)]">
          <h3 className="text-4xl font-light italic text-[#C9A84C] font-['Cormorant_Garamond'] mb-3">
            Save up to 8 months.
          </h3>
          <p className="text-[rgba(245,240,232,0.60)] text-sm font-['DM_Sans'] font-light tracking-wide">
            Same destination. A fraction of the time and cost.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/quiz"
            className="inline-block px-8 py-4 bg-[#C9A84C] text-[#0a0a0a] font-['DM_Sans'] text-sm font-medium transition-all duration-200"
            style={{ borderRadius: 0 }}
          >
            Check your eligibility — it&apos;s free
          </Link>
        </div>
      </div>
    </section>
  );
}
