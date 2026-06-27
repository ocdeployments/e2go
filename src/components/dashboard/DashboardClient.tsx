"use client";
import { PartialProfileTeaser } from "@/components/PartialProfileTeaser";
import CaseCommandPanel from "@/components/dashboard/CaseCommandPanel";
import type { MilestoneRow } from "@/components/dashboard/CaseCommandPanel";
import FolderStack from "@/components/dashboard/FolderStack";
import PhaseStrip from "@/components/dashboard/PhaseStrip";
import type { PhaseData } from "@/components/dashboard/PhaseStrip";
import { deriveStrengthBadges } from "@/lib/strength-badges";

const NEXT_ACTION_WHY: Record<string, string> = {
  Onboarding:
    "Completing this pre-fills your details across all 15 consulate documents.",
  "Business Profile":
    "Completing this builds your investor archetype and Business Plan foundation.",
  "Investment & Documents":
    "Completing this generates your Source of Funds statement and startup cost schedule.",
  "Gap Analysis":
    "Running this reveals weaknesses before your consulate does and lifts every document score.",
  "Document Generation":
    "Generating your package produces 15 consulate-ready files in one step.",
  "Interview Preparation":
    "Practising builds the confidence and precision your consulate interview demands.",
};

const ARCHETYPE_LABEL: Record<string, string> = {
  buyer: "Buyer",
  builder: "Builder",
  career_switcher: "Career Switcher",
  investor: "Investor",
};

const ARCHETYPE_DESC: Record<string, string> = {
  buyer: "Franchise-forward, acquisition-oriented case profile.",
  builder: "Startup or new-business operator case profile.",
  career_switcher: "Professional pivoting into U.S. business ownership.",
  investor: "Capital-first, delegation-model case profile.",
};

const READINESS_LABEL: Record<string, string> = {
  ready: "Ready",
  nearly_ready: "Nearly Ready",
  needs_work: "Needs Work",
};

const READINESS_COLOR: Record<string, string> = {
  ready: "#5DCAA5",
  nearly_ready: "#C9A84C",
  needs_work: "#f87171",
};

interface DimensionScores {
  sourceOfFunds: number | null;
  managementRole: number | null;
  businessPlan: number | null;
}

interface SimulatorSnapshot {
  readinessIndicator: string;
  top3: string[];
  strongCount: number;
  needsWorkCount: number;
}

interface DashboardClientProps {
  firstName: string | null;
  applicationLabel: string | null;
  tier: string | null;
  progress: number;
  quizCompleted: boolean;
  quizOutcome: string | null;
  quizAnswers: Record<string, string>;
  quizWarnings: string[];
  investmentRange: string | null;
  caseArchetype: string | null;
  caseCompletenessScore: number | null;
  lifecycle: Record<string, string | null> | null;
  entitlements: { hasComplete: boolean; hasFdd: boolean };
  showFranchiseNavigator: boolean;
  isSimulatorOnly: boolean;
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null;
  sectionCompletionMap: { qualifications: boolean; family: boolean; ties: boolean };
  generatedDocCount: number;
  fddCount: number;
  dimensionScores: DimensionScores | null;
  simulatorSnapshot: SimulatorSnapshot | null;
}

function deriveCurrentPhase(
  lifecycle: Record<string, string | null> | null
): string {
  if (!lifecycle?.module1_completed_at) return "Onboarding";
  if (!lifecycle?.module2_completed_at) return "Business Profile";
  if (!lifecycle?.module3_completed_at) return "Investment & Documents";
  if (!lifecycle?.module4_completed_at) return "Gap Analysis";
  if (!lifecycle?.module5_completed_at) return "Document Generation";
  return "Interview Preparation";
}

function deriveNextAction(
  lifecycle: Record<string, string | null> | null
): string {
  if (!lifecycle?.module1_completed_at) return "Complete onboarding";
  if (!lifecycle?.module2_completed_at) return "Add business information";
  if (!lifecycle?.module3_completed_at) return "Add investment details";
  if (!lifecycle?.module4_completed_at) return "Run gap analysis";
  if (!lifecycle?.module5_completed_at) return "Generate your documents";
  return "Practice your interview";
}

function buildMilestones(
  quizCompleted: boolean,
  lifecycle: Record<string, string | null> | null
): MilestoneRow[] {
  const m1 = Boolean(lifecycle?.module1_completed_at);
  const m2 = Boolean(lifecycle?.module2_completed_at);
  const m3 = Boolean(lifecycle?.module3_completed_at);
  const m4 = Boolean(lifecycle?.module4_completed_at);
  const m5 = Boolean(lifecycle?.module5_completed_at);

  return [
    {
      id: "quiz",
      label: "Eligibility Quiz",
      phase: "Case File",
      status: quizCompleted ? "done" : "upcoming",
    },
    {
      id: "onboarding",
      label: "Onboarding",
      phase: "Business Profile",
      status: m1 ? "done" : quizCompleted ? "in-progress" : "upcoming",
    },
    {
      id: "business",
      label: "Business Profile",
      phase: "Investment Docs",
      status: m2 ? "done" : m1 ? "in-progress" : "upcoming",
    },
    {
      id: "investment",
      label: "Investment & Docs",
      phase: "Gap Analysis",
      status: m3 ? "done" : m2 ? "in-progress" : "upcoming",
    },
    {
      id: "generation",
      label: "Document Generation",
      phase: "Interview Prep",
      status: m4 ? "done" : m3 ? "in-progress" : "upcoming",
    },
    {
      id: "simulator",
      label: "Interview Simulator",
      phase: "Submit",
      status: m5 ? "done" : m4 ? "in-progress" : "upcoming",
    },
  ];
}

function buildPhases(
  quizCompleted: boolean,
  quizOutcome: string | null,
  lifecycle: Record<string, string | null> | null,
  caseArchetype: string | null,
  caseCompletenessScore: number | null,
  investmentRange: string | null,
  simulatorData: { sessionsUsed: number; sessionsPurchased: number } | null,
  currentPhaseName: string,
  generatedDocCount: number
): PhaseData[] {
  const m1 = Boolean(lifecycle?.module1_completed_at);
  const m2 = Boolean(lifecycle?.module2_completed_at);
  const m3 = Boolean(lifecycle?.module3_completed_at);
  const m4 = Boolean(lifecycle?.module4_completed_at);
  const m5 = Boolean(lifecycle?.module5_completed_at);

  return [
    {
      id: "eligibility",
      number: "01",
      title: "Eligibility",
      contentType: "eligibility",
      contentData: { outcome: quizOutcome ?? "", done: quizCompleted },
      isCurrentPhase: currentPhaseName === "Onboarding" && !quizCompleted,
    },
    {
      id: "onboarding",
      number: "02",
      title: "Onboarding",
      contentType: "onboarding",
      contentData: { done: m1 },
      isCurrentPhase: currentPhaseName === "Onboarding",
    },
    {
      id: "business",
      number: "03",
      title: "Business Profile",
      contentType: "business",
      contentData: { done: m2, archetype: caseArchetype },
      isCurrentPhase: currentPhaseName === "Business Profile",
    },
    {
      id: "investment",
      number: "04",
      title: "Investment & Docs",
      contentType: "investment",
      contentData: { done: m3, investmentRange },
      isCurrentPhase: currentPhaseName === "Investment & Documents",
    },
    {
      id: "gap",
      number: "05",
      title: "Gap Analysis",
      contentType: "gap",
      contentData: { done: m4, completenessScore: caseCompletenessScore },
      isCurrentPhase: currentPhaseName === "Gap Analysis",
    },
    {
      id: "generation",
      number: "06",
      title: "Generation",
      contentType: "generation",
      contentData: { done: generatedDocCount > 0, docCount: generatedDocCount },
      isCurrentPhase: currentPhaseName === "Document Generation",
    },
    {
      id: "interview",
      number: "07",
      title: "Interview Prep",
      contentType: "interview",
      contentData: {
        done: m5,
        sessionsUsed: simulatorData?.sessionsUsed ?? null,
        sessionsPurchased: simulatorData?.sessionsPurchased ?? 3,
      },
      isCurrentPhase: currentPhaseName === "Interview Preparation",
    },
  ];
}

// ── Profile Intelligence Strip ────────────────────────────────────────────────
function ProfileIntelligenceStrip({
  archetype,
  completenessScore,
  dimensionScores,
  currentPhase,
}: {
  archetype: string | null;
  completenessScore: number | null;
  dimensionScores: DimensionScores | null;
  currentPhase: string;
}) {
  const archetypeKey = archetype ?? "";
  const archetypeLabel = ARCHETYPE_LABEL[archetypeKey] ?? "Not yet set";
  const archetypeDesc = ARCHETYPE_DESC[archetypeKey] ?? "Complete your business profile to unlock your archetype.";

  let primaryRisk = "Run Gap Analysis";
  let primaryRiskDesc = "Your gap score hasn't been computed yet.";
  if (dimensionScores) {
    const dims = [
      { name: "Source of Funds", desc: "Traceable fund flow and deployment evidence.", score: dimensionScores.sourceOfFunds },
      { name: "Management Role", desc: "Active management authority and day-to-day control.", score: dimensionScores.managementRole },
      { name: "Business Plan", desc: "Employment creation, non-marginality, and viability.", score: dimensionScores.businessPlan },
    ].filter((d) => d.score !== null);
    if (dims.length > 0) {
      const lowest = dims.reduce((a, b) => (a.score! < b.score! ? a : b));
      primaryRisk = lowest.name;
      primaryRiskDesc = lowest.desc;
    }
  }

  const eyebrow: React.CSSProperties = {
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    color: "rgba(201,168,76,0.65)",
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: "6px",
  };
  const val: React.CSSProperties = {
    fontFamily: "'Cormorant Garamond', Georgia, serif",
    fontSize: "18px",
    fontWeight: 300,
    color: "#f5f0e8",
    marginBottom: "5px",
    lineHeight: 1.15,
  };
  const desc: React.CSSProperties = {
    fontSize: "11px",
    color: "rgba(245,240,232,0.45)",
    fontFamily: "'DM Sans', sans-serif",
    lineHeight: 1.5,
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        borderTop: "1px solid rgba(201,168,76,0.15)",
        borderLeft: "1px solid rgba(201,168,76,0.15)",
        marginBottom: "28px",
      }}
    >
      {[
        {
          label: "Investor Archetype",
          value: archetypeLabel,
          detail: archetypeDesc,
        },
        {
          label: "Case Readiness",
          value: completenessScore != null ? `${completenessScore}%` : "Not scored",
          detail:
            completenessScore == null
              ? "Complete your case file to generate a score."
              : completenessScore >= 75
              ? "Strong trajectory. Close remaining evidence gaps."
              : completenessScore >= 50
              ? "Good foundation. Several sections need attention."
              : "Needs work. Focus on the priorities below.",
        },
        {
          label: "Primary Risk Area",
          value: primaryRisk,
          detail: primaryRiskDesc,
        },
        {
          label: "Current Stage",
          value: currentPhase,
          detail: NEXT_ACTION_WHY[currentPhase] ?? "",
        },
      ].map((cell, i) => (
        <div
          key={i}
          style={{
            padding: "16px 18px",
            borderRight: "1px solid rgba(201,168,76,0.15)",
            borderBottom: "1px solid rgba(201,168,76,0.15)",
            background: i === 0 ? "rgba(201,168,76,0.03)" : "transparent",
          }}
        >
          <div style={eyebrow}>{cell.label}</div>
          <div style={val}>{cell.value}</div>
          <div style={desc}>{cell.detail}</div>
        </div>
      ))}
    </div>
  );
}

// ── Gap Priorities Panel ─────────────────────────────────────────────────────
function GapPrioritiesPanel({
  dimensionScores,
}: {
  dimensionScores: DimensionScores;
}) {
  const rows: { title: string; detail: string; href: string; score: number | null; severity: "critical" | "high" | "moderate" | "strong" }[] = [
    {
      title: "Source of Funds",
      detail: "Traceable chronology from origin to U.S. deployment — most common denial trigger.",
      href: "/apply/investment",
      score: dimensionScores.sourceOfFunds,
      severity:
        dimensionScores.sourceOfFunds == null ? "moderate"
        : dimensionScores.sourceOfFunds < 25 ? "critical"
        : dimensionScores.sourceOfFunds < 50 ? "high"
        : dimensionScores.sourceOfFunds < 75 ? "moderate"
        : "strong",
    },
    {
      title: "Management Role",
      detail: "Active control and day-to-day authority — officer must believe you will run the business.",
      href: "/apply/business",
      score: dimensionScores.managementRole,
      severity:
        dimensionScores.managementRole == null ? "moderate"
        : dimensionScores.managementRole < 25 ? "critical"
        : dimensionScores.managementRole < 50 ? "high"
        : dimensionScores.managementRole < 75 ? "moderate"
        : "strong",
    },
    {
      title: "Business Plan",
      detail: "Employment creation, non-marginality proof, and long-term viability of the enterprise.",
      href: "/apply/business",
      score: dimensionScores.businessPlan,
      severity:
        dimensionScores.businessPlan == null ? "moderate"
        : dimensionScores.businessPlan < 25 ? "critical"
        : dimensionScores.businessPlan < 50 ? "high"
        : dimensionScores.businessPlan < 75 ? "moderate"
        : "strong",
    },
  ];

  const visible = rows.filter((r) => r.severity !== "strong");
  if (visible.length === 0) return null;

  const SEVERITY_COLOR: Record<string, string> = {
    critical: "#f87171",
    high: "#fbbf24",
    moderate: "rgba(245,240,232,0.45)",
  };
  const SEVERITY_BORDER: Record<string, string> = {
    critical: "rgba(248,113,113,0.25)",
    high: "rgba(251,191,36,0.25)",
    moderate: "rgba(245,240,232,0.1)",
  };

  return (
    <div
      style={{
        marginTop: "20px",
        border: "1px solid rgba(201,168,76,0.15)",
        padding: "20px 22px 16px",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "18px",
            fontWeight: 300,
            color: "#f5f0e8",
          }}
        >
          Case Priorities
        </div>
        <a
          href="/gap-analysis"
          style={{
            fontSize: "10px",
            color: "rgba(201,168,76,0.7)",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none",
            letterSpacing: "0.06em",
          }}
        >
          Full analysis →
        </a>
      </div>
      <div style={{ display: "grid", gap: "1px", background: "rgba(201,168,76,0.08)" }}>
        {visible.map((row) => (
          <div
            key={row.title}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "14px",
              alignItems: "center",
              padding: "12px 14px",
              background: "#0a0a0a",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.1em",
                textTransform: "uppercase" as const,
                color: SEVERITY_COLOR[row.severity],
                border: `1px solid ${SEVERITY_BORDER[row.severity]}`,
                padding: "3px 8px",
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: "nowrap" as const,
              }}
            >
              {row.severity}
            </span>
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontFamily: "'DM Sans', sans-serif",
                  color: "#f5f0e8",
                  marginBottom: "2px",
                }}
              >
                {row.title}
                {row.score != null && (
                  <span style={{ color: "rgba(245,240,232,0.38)", fontSize: "11px", marginLeft: "6px" }}>
                    {row.score}%
                  </span>
                )}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "rgba(245,240,232,0.45)",
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {row.detail}
              </div>
            </div>
            <a
              href={row.href}
              style={{
                fontSize: "10px",
                color: "rgba(201,168,76,0.65)",
                fontFamily: "'DM Sans', sans-serif",
                textDecoration: "none",
                whiteSpace: "nowrap" as const,
              }}
            >
              Fix →
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Simulator Snapshot Card ──────────────────────────────────────────────────
function SimulatorSnapshotCard({ snapshot }: { snapshot: SimulatorSnapshot }) {
  const ri = snapshot.readinessIndicator in READINESS_LABEL
    ? snapshot.readinessIndicator
    : "needs_work";
  const riLabel = READINESS_LABEL[ri];
  const riColor = READINESS_COLOR[ri];

  return (
    <div
      style={{
        marginTop: "20px",
        border: "1px solid rgba(201,168,76,0.15)",
        padding: "20px 22px",
        background: "rgba(255,255,255,0.01)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "18px",
            fontWeight: 300,
            color: "#f5f0e8",
          }}
        >
          Interview Coaching
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            border: `1px solid ${riColor}40`,
            fontSize: "9px",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            color: riColor,
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: riColor,
              display: "inline-block",
            }}
          />
          {riLabel}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: snapshot.top3.length > 0 ? "14px" : 0,
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(93,202,165,0.05)",
            border: "1px solid rgba(93,202,165,0.15)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#5DCAA5",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "4px",
            }}
          >
            Strong Answers
          </div>
          <div
            style={{
              fontSize: "22px",
              fontFamily: "'Cormorant Garamond', serif",
              color: "#f5f0e8",
            }}
          >
            {snapshot.strongCount}
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "rgba(251,191,36,0.05)",
            border: "1px solid rgba(251,191,36,0.15)",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "#C9A84C",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "4px",
            }}
          >
            Needs Work
          </div>
          <div
            style={{
              fontSize: "22px",
              fontFamily: "'Cormorant Garamond', serif",
              color: "#f5f0e8",
            }}
          >
            {snapshot.needsWorkCount}
          </div>
        </div>
      </div>

      {snapshot.top3.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              color: "rgba(245,240,232,0.38)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "8px",
            }}
          >
            Recommended focus for next session
          </div>
          {snapshot.top3.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "10px",
                padding: "8px 0",
                borderBottom:
                  i < snapshot.top3.length - 1
                    ? "1px solid rgba(201,168,76,0.07)"
                    : "none",
              }}
            >
              <span
                style={{
                  fontSize: "9px",
                  color: "rgba(245,240,232,0.3)",
                  fontFamily: "'DM Sans', sans-serif",
                  paddingTop: "2px",
                  flexShrink: 0,
                }}
              >
                {i + 1}.
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "rgba(245,240,232,0.72)",
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {item}
              </span>
            </div>
          ))}
        </div>
      )}

      <a
        href="/simulator"
        style={{
          display: "inline-block",
          marginTop: "16px",
          fontSize: "10px",
          color: "rgba(201,168,76,0.7)",
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: "none",
          letterSpacing: "0.06em",
        }}
      >
        Run another session →
      </a>
    </div>
  );
}

export default function DashboardClient({
  firstName,
  applicationLabel,
  tier: _tier,
  progress,
  quizCompleted,
  quizOutcome,
  quizAnswers,
  quizWarnings,
  investmentRange,
  caseArchetype,
  caseCompletenessScore,
  lifecycle,
  entitlements,
  showFranchiseNavigator,
  isSimulatorOnly,
  simulatorData,
  sectionCompletionMap,
  generatedDocCount,
  fddCount,
  dimensionScores,
  simulatorSnapshot,
}: DashboardClientProps) {
  const isFranchisePath =
    /franchise/i.test(quizAnswers["Q0-08a"] ?? "") ||
    /franchise/i.test(quizAnswers["Q0-08"] ?? "");

  void deriveStrengthBadges(
    quizOutcome ?? "",
    quizWarnings,
    quizAnswers,
    investmentRange
  );

  const currentPhase = deriveCurrentPhase(lifecycle);
  const nextAction = deriveNextAction(lifecycle);
  const nextActionWhy = NEXT_ACTION_WHY[currentPhase];
  const milestones = buildMilestones(quizCompleted, lifecycle);
  const phases = buildPhases(
    quizCompleted,
    quizOutcome,
    lifecycle,
    caseArchetype,
    caseCompletenessScore,
    investmentRange,
    simulatorData,
    currentPhase,
    generatedDocCount
  );

  // ── Simulator-only branch ─────────────────────────────────────────────────
  if (isSimulatorOnly) {
    return (
      <div>
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(201,168,76,0.5)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "8px",
            }}
          >
            E-2 Application Dashboard
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(26px, 4vw, 38px)",
              color: "#f5f0e8",
              margin: "0 0 8px",
              lineHeight: 1.1,
            }}
          >
            {firstName ? `Welcome to the E2Go family, ${firstName}.` : "Welcome back."}
          </h1>
          {applicationLabel && (
            <div
              style={{
                fontSize: "13px",
                color: "rgba(245,240,232,0.5)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {applicationLabel}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div
            style={{
              padding: "24px",
              background: "rgba(201,168,76,0.02)",
              border: "1px solid rgba(201,168,76,0.12)",
            }}
          >
            <div
              style={{
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(245,240,232,0.45)",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: "6px",
              }}
            >
              Interview Simulator
            </div>
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 300,
                fontSize: "22px",
                color: "#f5f0e8",
                margin: "0 0 6px",
              }}
            >
              {simulatorData
                ? `${Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0)} session${Math.max(simulatorData.sessionsPurchased - simulatorData.sessionsUsed, 0) !== 1 ? "s" : ""} remaining`
                : "Ready to practice"}
            </p>
            {simulatorData && (
              <p
                style={{
                  fontSize: "12px",
                  color: "rgba(245,240,232,0.55)",
                  margin: "0 0 14px",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {simulatorData.sessionsUsed} of {simulatorData.sessionsPurchased} used
              </p>
            )}
            <a
              href="/simulator"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                background: "#C9A84C",
                color: "#0a0a0a",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Go to practice interview →
            </a>
          </div>
        </div>

        <PartialProfileTeaser />
      </div>
    );
  }

  // ── No quiz state ─────────────────────────────────────────────────────────
  if (!quizCompleted) {
    return (
      <div>
        <div style={{ marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(201,168,76,0.5)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "8px",
            }}
          >
            E-2 Application Dashboard
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontSize: "clamp(26px, 4vw, 38px)",
              color: "#f5f0e8",
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {firstName ? `Welcome to the E2Go family, ${firstName}.` : "Welcome."}
          </h1>
        </div>
        <div
          style={{
            padding: "40px",
            background: "rgba(201,168,76,0.02)",
            border: "1px solid rgba(201,168,76,0.12)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300,
              fontSize: "22px",
              color: "#f5f0e8",
              marginBottom: "12px",
            }}
          >
            Start Your E-2 Application
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(245,240,232,0.58)",
              marginBottom: "24px",
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.65,
              maxWidth: "440px",
              margin: "0 auto 24px",
            }}
          >
            Take the eligibility quiz to confirm you qualify for the E-2 treaty
            investor visa. It takes about 5 minutes and pre-fills your case file.
          </p>
          <a
            href="/quiz"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "#C9A84C",
              color: "#0a0a0a",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none",
            }}
          >
            Take the eligibility quiz →
          </a>
        </div>
      </div>
    );
  }

  // ── Full dashboard — quiz completed, paying customer ──────────────────────
  return (
    <div>
      {/* Zone A — Welcome header */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.5)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: "8px",
          }}
        >
          E-2 Application Dashboard
        </div>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            fontSize: "clamp(26px, 4vw, 38px)",
            color: "#f5f0e8",
            margin: "0 0 6px",
            lineHeight: 1.1,
          }}
        >
          {firstName
            ? `Welcome to the E2Go family, ${firstName}.`
            : "Welcome to the E2Go family."}
        </h1>
        {applicationLabel && (
          <div
            style={{
              fontSize: "13px",
              color: "rgba(245,240,232,0.5)",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            {applicationLabel}
          </div>
        )}
        {generatedDocCount > 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "rgba(201,168,76,0.6)",
              fontFamily: "'DM Sans', sans-serif",
              marginTop: "4px",
            }}
          >
            {generatedDocCount} of 15 documents ready
          </div>
        )}
      </div>

      {/* Profile Intelligence Strip */}
      <ProfileIntelligenceStrip
        archetype={caseArchetype}
        completenessScore={caseCompletenessScore}
        dimensionScores={dimensionScores}
        currentPhase={currentPhase}
      />

      {/* Franchise Navigator banner */}
      {showFranchiseNavigator && (
        <div
          style={{
            marginBottom: "28px",
            padding: "20px 22px",
            background: "rgba(201,168,76,0.03)",
            border: "1px solid rgba(201,168,76,0.25)",
            borderLeft: "3px solid #C9A84C",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#C9A84C",
                fontFamily: "'DM Sans', sans-serif",
                marginBottom: "5px",
              }}
            >
              Recommended next step
            </div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "17px",
                fontWeight: 300,
                color: "#f5f0e8",
                marginBottom: "6px",
              }}
            >
              Find the right business for your E-2
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "rgba(245,240,232,0.55)",
                margin: 0,
                fontFamily: "'DM Sans', sans-serif",
                lineHeight: 1.6,
              }}
            >
              You haven&rsquo;t selected a business yet. The Franchise Navigator
              matches you based on your investment range and background. Free to
              use — brokers are paid by franchisors.
            </p>
          </div>
          <a
            href="/franchise"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              background: "#C9A84C",
              color: "#0a0a0a",
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
              fontFamily: "'DM Sans', sans-serif",
              flexShrink: 0,
            }}
          >
            Launch Navigator →
          </a>
        </div>
      )}

      {/* Zones B + C */}
      <div className="dashboard-grid">
        <CaseCommandPanel
          score={progress}
          currentPhase={currentPhase}
          nextAction={nextAction}
          nextActionWhy={nextActionWhy}
          milestones={milestones}
        />
        <FolderStack
          lifecycle={lifecycle}
          entitlements={entitlements}
          isFranchisePath={isFranchisePath}
          simulatorData={simulatorData}
          sectionCompletionMap={sectionCompletionMap}
          gapScore={caseCompletenessScore}
          fddCount={fddCount}
          generatedDocCount={generatedDocCount}
        />
      </div>

      {/* Gap Priorities Panel — only when dimension scores exist with gaps */}
      {dimensionScores && (
        <GapPrioritiesPanel dimensionScores={dimensionScores} />
      )}

      {/* Simulator Snapshot — only when a completed session exists */}
      {simulatorSnapshot && (
        <SimulatorSnapshotCard snapshot={simulatorSnapshot} />
      )}

      {/* Zone D — Phase Strip */}
      <PhaseStrip phases={phases} />
    </div>
  );
}
