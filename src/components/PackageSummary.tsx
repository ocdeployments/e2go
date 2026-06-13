"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScoreLevel = "STRONG" | "ADEQUATE" | "WEAK" | "CRITICAL" | "PENDING";

interface DenialRisk {
  code: string;
  level: "CLEAR" | "WATCH" | "FLAG" | "CRITICAL";
  reason: string;
  follow_up_triggered?: string;
}

interface FramingDecision {
  area: string;
  approach: string;
  legal_basis?: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

interface CaseBriefData {
  application_id: string;
  created_at: string;
  substantiality_score: ScoreLevel;
  experience_score: ScoreLevel;
  fund_source_score: ScoreLevel;
  ownership_control_score: ScoreLevel;
  executive_role: {
    executive_responsibilities_score?: ScoreLevel;
    development_management_score?: ScoreLevel;
    combined_score?: ScoreLevel;
  } | null;
  marginality_income_score: ScoreLevel;
  marginality_contribution_score: ScoreLevel;
  denial_risks: DenialRisk[];
  framing_decisions: FramingDecision[];
  overall_score?: number;
}

interface PackageSummaryProps {
  applicationId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORE_TO_NUMERIC: Record<string, number> = {
  STRONG: 100,
  ADEQUATE: 70,
  WEAK: 40,
  CRITICAL: 10,
  PENDING: 50,
};

interface DimensionDef {
  key: string;
  label: string;
  plainLanguage: string;
  getScore: (brief: CaseBriefData) => ScoreLevel;
  editLink?: string;
  editLinkLabel?: string;
}

const DIMENSIONS: DimensionDef[] = [
  {
    key: "substantiality",
    label: "Investment Substantiality",
    plainLanguage: "Your investment relative to the total business cost",
    getScore: (b) => b.substantiality_score || "PENDING",
    editLink: "/apply/investment",
    editLinkLabel: "Review your investment details",
  },
  {
    key: "experience",
    label: "Investor Qualifications",
    plainLanguage: "Your professional background and this business",
    getScore: (b) => b.experience_score || "PENDING",
    editLink: "/apply/qualifications",
    editLinkLabel: "Edit your qualifications",
  },
  {
    key: "marginality",
    label: "Non-Marginality",
    plainLanguage: "Your capacity to generate income and economic contribution",
    getScore: (b) => {
      // Replicate score-sync.ts logic
      if (
        b.marginality_income_score === "ADEQUATE" &&
        b.marginality_contribution_score === "ADEQUATE"
      )
        return "ADEQUATE";
      if (
        b.marginality_income_score === "WEAK" ||
        b.marginality_contribution_score === "WEAK"
      )
        return "WEAK";
      if (
        b.marginality_income_score === "CRITICAL" ||
        b.marginality_contribution_score === "CRITICAL"
      )
        return "CRITICAL";
      return b.marginality_income_score || "PENDING";
    },
    editLink: "/apply/business-plan",
    editLinkLabel: "Review your business plan",
  },
  {
    key: "fund_source",
    label: "Source & Path of Funds",
    plainLanguage: "Legitimacy and traceability of your investment capital",
    getScore: (b) => b.fund_source_score || "PENDING",
    editLink: "/apply/funds",
    editLinkLabel: "Review your fund source details",
  },
  {
    key: "active_direction",
    label: "Active Direction",
    plainLanguage: "Your role in directing and developing the enterprise",
    getScore: (b) => b.executive_role?.combined_score || "PENDING",
    editLink: "/apply/qualifications",
    editLinkLabel: "Review your executive role",
  },
  {
    key: "ownership",
    label: "Real & Operating Enterprise",
    plainLanguage: "Viability and operational reality of the business",
    getScore: (b) => b.ownership_control_score || "PENDING",
    editLink: "/apply/business-plan",
    editLinkLabel: "Review your business plan",
  },
];

// ---------------------------------------------------------------------------
// Denial risk plain-language mapping
// ---------------------------------------------------------------------------

const DENIAL_RISK_EXPLANATIONS: Record<string, string> = {
  "D-01": "Your investment amount may be questioned as insufficient for this type of business.",
  "D-02": "The source of your funds may need clearer documentation or traceability.",
  "D-03": "Your business plan may not demonstrate enough revenue to support you and your family.",
  "D-04": "Your projected revenue is closer to your household needs than ideal — officers sometimes ask for more detail on hiring plans here.",
  "D-05": "Your role in the business may appear more employee-like than owner-like.",
  "D-06": "The business may appear to be a passive investment rather than an active operation.",
  "D-07": "Your professional background may not clearly connect to this business type.",
  "D-08": "The business may not appear to create enough jobs for U.S. workers.",
  "D-09": "Your business may operate in a way that looks more marginal than substantial.",
  "D-10": "The lease or property arrangement may raise questions about business viability.",
  "D-11": "Your business concept may overlap with an existing operation in a concerning way.",
  "D-12": "The franchise agreement terms may create questions about your control.",
  "D-13": "Your personal financial situation may raise questions about investment sustainability.",
  "D-14": "The business location or market may appear limited in potential.",
  "D-15": "Your application package may be missing supporting documentation.",
};

const DENIAL_RISK_LEVELS: Record<string, string> = {
  CLEAR: "No concern identified",
  WATCH: "Worth monitoring — minor area that could be strengthened",
  FLAG: "Officer may ask about this — good to prepare a clear explanation",
  CRITICAL: "This area needs attention before submission",
};

// ---------------------------------------------------------------------------
// Score display helpers
// ---------------------------------------------------------------------------

function scoreBarWidth(score: ScoreLevel): string {
  switch (score) {
    case "STRONG":
      return "w-full";
    case "ADEQUATE":
      return "w-[70%]";
    case "WEAK":
      return "w-[40%]";
    case "CRITICAL":
      return "w-[10%]";
    default:
      return "w-[50%]";
  }
}

function scoreBarColor(score: ScoreLevel): string {
  switch (score) {
    case "STRONG":
      return "bg-emerald-400";
    case "ADEQUATE":
      return "bg-[#C9A84C]";
    case "WEAK":
      return "bg-amber-500";
    case "CRITICAL":
      return "bg-red-400";
    default:
      return "bg-white/20";
  }
}

function scoreBadge(score: ScoreLevel): string {
  const base = "text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 border";
  switch (score) {
    case "STRONG":
      return `${base} border-emerald-400/40 text-emerald-400`;
    case "ADEQUATE":
      return `${base} border-[#C9A84C]/40 text-[#C9A84C]`;
    case "WEAK":
      return `${base} border-amber-500/40 text-amber-500`;
    case "CRITICAL":
      return `${base} border-red-400/40 text-red-400`;
    default:
      return `${base} border-white/20 text-white/40`;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function PackageSummary({ applicationId }: PackageSummaryProps) {
  const [brief, setBrief] = useState<CaseBriefData | null>(null);
  const [businessCategory, setBusinessCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCaseBrief = useCallback(async () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem("supabase_user");
      const userId = stored ? JSON.parse(stored).id : null;
      if (!userId) {
        setError("Not authenticated");
        return;
      }

      const res = await fetch(`/api/generate/case-brief/${applicationId}`, {
        headers: { Authorization: `Bearer ${userId}` },
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError("no_brief");
          return;
        }
        throw new Error("Failed to fetch case brief");
      }

      const data = await res.json();
      setBrief(data.caseBrief);
      setBusinessCategory(data.businessCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary");
    } finally {
      setLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    fetchCaseBrief();
  }, [fetchCaseBrief]);

  if (loading) {
    return (
      <div className="border border-white/8 bg-[#0d0d0d] p-8">
        <p
          className="text-sm text-white/30"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Loading package summary...
        </p>
      </div>
    );
  }

  if (error === "no_brief") {
    return null; // No case brief yet — silently hide
  }

  if (error || !brief) {
    return (
      <div className="border border-white/8 bg-[#0d0d0d] p-8">
        <p
          className="text-sm text-white/30"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Unable to load package summary.
        </p>
      </div>
    );
  }

  // Compute overall score from 6 dimensions
  const numericScores = DIMENSIONS.map(
    (d) => SCORE_TO_NUMERIC[d.getScore(brief)] || 50
  );
  const overallScore = Math.round(
    numericScores.reduce((a, b) => a + b, 0) / numericScores.length
  );

  // Split into strengths vs gaps
  const strengths = DIMENSIONS.filter((d) => {
    const s = d.getScore(brief);
    return s === "STRONG" || s === "ADEQUATE";
  });
  const gaps = DIMENSIONS.filter((d) => {
    const s = d.getScore(brief);
    return s === "WEAK" || s === "CRITICAL";
  });

  // Experience framing decisions
  const experienceFraming = (brief.framing_decisions || []).filter(
    (fd) => fd.area?.toLowerCase().includes("experience") || fd.area?.toLowerCase().includes("transferable")
  );
  const hasStrongExperienceFraming = experienceFraming.length > 0 && experienceFraming.some((f) => f.priority === "HIGH" || f.priority === "MEDIUM");

  // Relevant denial risks (WATCH, FLAG, CRITICAL only)
  const relevantRisks = (brief.denial_risks || []).filter(
    (r) => r.level === "WATCH" || r.level === "FLAG" || r.level === "CRITICAL"
  );

  return (
    <div className="space-y-8">
      {/* ================================================================ */}
      {/* SECTION 1 — Overall Package Strength                             */}
      {/* ================================================================ */}
      <div className="border border-white/8 bg-[#0d0d0d] p-8">
        <h2
          className="mb-2 text-2xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Package Strength Overview
        </h2>
        <p
          className="mb-6 text-sm text-white/40"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          How each area of your application package was assessed
        </p>

        {/* Overall score */}
        <div className="mb-8 flex items-baseline gap-3">
          <span
            className="text-4xl font-light text-[#C9A84C]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            {overallScore}
          </span>
          <span
            className="text-xs text-white/30"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            overall score
          </span>
        </div>

        {/* Dimension bars */}
        <div className="space-y-4">
          {DIMENSIONS.map((dim) => {
            const score = dim.getScore(brief);
            return (
              <div key={dim.key}>
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className="text-sm text-white/60"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {dim.label}
                  </span>
                  <span className={scoreBadge(score)}>{score}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5">
                  <div
                    className={`h-full transition-all duration-500 ${scoreBarWidth(score)} ${scoreBarColor(score)}`}
                  />
                </div>
                <p
                  className="mt-1 text-xs text-white/30"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {dim.plainLanguage}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================================================================ */}
      {/* SECTION 2 — What's Strong                                        */}
      {/* ================================================================ */}
      {strengths.length > 0 && (
        <div className="border border-emerald-400/15 bg-[#0d0d0d] p-8">
          <h2
            className="mb-2 text-2xl font-light text-emerald-400"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            What&apos;s Strong
          </h2>
          <p
            className="mb-6 text-sm text-white/40"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Areas where your package presents a solid foundation
          </p>

          <div className="space-y-3">
            {strengths.map((dim) => {
              const score = dim.getScore(brief);
              return (
                <div key={dim.key} className="flex items-start gap-3">
                  <span
                    className="mt-1 h-1.5 w-1.5 flex-shrink-0 bg-emerald-400"
                  />
                  <div>
                    <span
                      className="text-sm font-medium text-white/70"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {dim.label}
                    </span>
                    <span className="ml-2 text-xs text-emerald-400/60">
                      {score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 3 — Where the Package May Need More                      */}
      {/* ================================================================ */}
      {gaps.length > 0 && (
        <div className="border border-amber-500/15 bg-[#0d0d0d] p-8">
          <h2
            className="mb-2 text-2xl font-light text-amber-500"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Where the Package May Need More
          </h2>
          <p
            className="mb-6 text-sm text-white/40"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Areas that could be strengthened — your documents present what&apos;s
            available, but additional context may help
          </p>

          <div className="space-y-6">
            {gaps.map((dim) => {
              const score = dim.getScore(brief);
              const isExperience =
                dim.key === "experience" && score !== "PENDING";

              return (
                <div key={dim.key} className="border-l-2 border-amber-500/30 pl-4">
                  <div className="mb-1 flex items-center gap-2">
                    <span
                      className="text-sm font-medium text-white/70"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {dim.plainLanguage}
                    </span>
                    <span className={scoreBadge(score)}>{score}</span>
                  </div>

                  {/* Experience-specific messaging */}
                  {isExperience && !hasStrongExperienceFraming && (
                    <p
                      className="mt-2 text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      We looked for ways to connect your background to{" "}
                      {businessCategory
                        ? `a ${businessCategory.replace(/_/g, " ")} business`
                        : "this business"}
                      {" "}and didn&apos;t find a strong direct link. Your documents
                      present what&apos;s available, but this is an area where
                      additional context could help.
                    </p>
                  )}

                  {isExperience && hasStrongExperienceFraming && (
                    <p
                      className="mt-2 text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      We identified some connections between your background and
                      this business, though there may be room to strengthen
                      this further with additional details about your experience.
                    </p>
                  )}

                  {/* Non-experience gaps */}
                  {!isExperience && score === "WEAK" && (
                    <p
                      className="mt-2 text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      This area is thinner than ideal.{" "}
                      {dim.key === "marginality" &&
                        "Officers may ask for more detail about how your business will generate income and create economic activity."}
                      {dim.key === "substantiality" &&
                        "Your investment amount may benefit from additional detail about total business costs and how it compares to similar businesses."}
                      {dim.key === "fund_source" &&
                        "Clearer documentation of where your investment funds came from could strengthen this area."}
                      {dim.key === "active_direction" &&
                        "More detail about your day-to-day role in managing the business could help here."}
                      {dim.key === "ownership" &&
                        "Additional evidence of the business operating as a real, active enterprise would strengthen this area."}
                    </p>
                  )}

                  {!isExperience && score === "CRITICAL" && (
                    <p
                      className="mt-2 text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      This area needs attention.{" "}
                      {dim.key === "marginality" &&
                        "Your business plan should clearly show how the business generates income beyond your household needs and creates economic activity."}
                      {dim.key === "substantiality" &&
                        "Review your investment details — this is a core element of your E-2 application."}
                      {dim.key === "fund_source" &&
                        "Document the source and path of your investment funds clearly."}
                      {dim.key === "active_direction" &&
                        "Clarify your role as the directing and developing officer of the enterprise."}
                      {dim.key === "ownership" &&
                        "Ensure your business plan demonstrates a real, operating enterprise."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 4 — What Could Help                                      */}
      {/* ================================================================ */}
      {gaps.length > 0 && (
        <div className="border border-white/8 bg-[#0d0d0d] p-8">
          <h2
            className="mb-2 text-2xl font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            What Could Help
          </h2>
          <p
            className="mb-6 text-sm text-white/40"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Concrete steps you can take to strengthen your package — each
            change updates your documents automatically
          </p>

          <div className="space-y-4">
            {gaps.map((dim) => {
              const score = dim.getScore(brief);
              const isExperience =
                dim.key === "experience" && score !== "PENDING";

              return (
                <div
                  key={dim.key}
                  className="flex flex-col gap-3 border border-white/5 bg-[#0a0a0a] p-5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium text-white/70"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {dim.plainLanguage}
                    </span>
                    <span className={scoreBadge(score)}>{score}</span>
                  </div>

                  {/* Experience suggestion */}
                  {isExperience && !hasStrongExperienceFraming && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      If you have any experience — even informal — managing
                      people, running a household budget, volunteering, or
                      anything connected to the daily operations of a{" "}
                      {businessCategory
                        ? businessCategory.replace(/_/g, " ")
                        : "business"}
                      , adding this to your qualifications could strengthen
                      this area.
                    </p>
                  )}

                  {isExperience && hasStrongExperienceFraming && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Adding more specific details about your management
                      experience and how it connects to this business could
                      further strengthen this area.
                    </p>
                  )}

                  {/* Marginality suggestion */}
                  {dim.key === "marginality" && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Consider reviewing your hiring plan and revenue
                      projections — showing how the business will create jobs
                      and generate economic activity beyond your personal
                      income strengthens this area.
                    </p>
                  )}

                  {/* Substantiality suggestion */}
                  {dim.key === "substantiality" && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Review your investment details to ensure the total
                      committed amount and its proportion to the business cost
                      are clearly documented.
                    </p>
                  )}

                  {/* Fund source suggestion */}
                  {dim.key === "fund_source" && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Gather documentation showing the source and path of your
                      investment funds — bank statements, sale of assets, or
                      gift documentation as applicable.
                    </p>
                  )}

                  {/* Active direction suggestion */}
                  {dim.key === "active_direction" && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Clarify your executive role — describe your
                      day-to-day responsibilities, decision-making authority,
                      and how you direct the business operations.
                    </p>
                  )}

                  {/* Ownership suggestion */}
                  {dim.key === "ownership" && (
                    <p
                      className="text-sm text-white/50 leading-relaxed"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      Ensure your business plan shows a real, operating
                      enterprise with evidence of lease, contracts, or
                      operational setup.
                    </p>
                  )}

                  {dim.editLink && (
                    <Link
                      href={dim.editLink}
                      className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[#C9A84C] transition-colors hover:text-[#d4b35c]"
                      style={{ fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {dim.editLinkLabel || "Edit this section"}
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* SECTION 5 — Denial Risk Awareness (if any WATCH/FLAG/CRITICAL)   */}
      {/* ================================================================ */}
      {relevantRisks.length > 0 && (
        <div className="border border-white/8 bg-[#0d0d0d] p-8">
          <h2
            className="mb-2 text-2xl font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Areas Officers May Ask About
          </h2>
          <p
            className="mb-6 text-sm text-white/40"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Common areas where visa officers request additional information —
            being prepared with clear answers strengthens your application
          </p>

          <div className="space-y-3">
            {relevantRisks.map((risk) => (
              <div
                key={risk.code}
                className="border border-white/5 bg-[#0a0a0a] p-4"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="text-xs font-medium text-white/40"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {risk.code}
                  </span>
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider ${
                      risk.level === "CRITICAL"
                        ? "text-red-400"
                        : risk.level === "FLAG"
                        ? "text-amber-500"
                        : "text-white/40"
                    }`}
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {risk.level}
                  </span>
                </div>
                <p
                  className="text-sm text-white/50 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {DENIAL_RISK_EXPLANATIONS[risk.code] || risk.reason}
                </p>
                <p
                  className="mt-1 text-xs text-white/30"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {DENIAL_RISK_LEVELS[risk.level] || ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* MANDATORY DISCLAIMER                                             */}
      {/* ================================================================ */}
      <div className="border border-[#C9A84C]/20 bg-[#0d0d0d] p-6">
        <p
          className="text-sm leading-relaxed text-white/50"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          This summary reflects how completely and clearly your documents
          were prepared — it is not a legal assessment of your E-2
          eligibility and does not predict the outcome of your visa
          application. E2go is not a law firm and does not provide legal
          advice. If you have questions about your eligibility, consult a
          licensed immigration attorney.
        </p>
      </div>
    </div>
  );
}
