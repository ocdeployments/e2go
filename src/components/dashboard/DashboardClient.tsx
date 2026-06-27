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
      contentData: {
        outcome: quizOutcome ?? "",
        done: quizCompleted,
      },
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
      contentData: {
        done: m2,
        archetype: caseArchetype,
      },
      isCurrentPhase: currentPhaseName === "Business Profile",
    },
    {
      id: "investment",
      number: "04",
      title: "Investment & Docs",
      contentType: "investment",
      contentData: {
        done: m3,
        investmentRange,
      },
      isCurrentPhase: currentPhaseName === "Investment & Documents",
    },
    {
      id: "gap",
      number: "05",
      title: "Gap Analysis",
      contentType: "gap",
      contentData: {
        done: m4,
        completenessScore: caseCompletenessScore,
      },
      isCurrentPhase: currentPhaseName === "Gap Analysis",
    },
    {
      id: "generation",
      number: "06",
      title: "Generation",
      contentType: "generation",
      contentData: {
        done: generatedDocCount > 0,
        docCount: generatedDocCount,
      },
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

  // ── Simulator-only branch ────────────────────────────────────────────────────
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

  // ── No quiz state ────────────────────────────────────────────────────────────
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

  // ── Full dashboard — quiz completed, paying customer ─────────────────────────
  return (
    <div>
      {/* Zone A — Welcome header */}
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
              marginTop: "6px",
              letterSpacing: "0.01em",
            }}
          >
            {generatedDocCount} of 15 documents ready
          </div>
        )}
      </div>

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

      {/* Zones B + C — Two-column, stacks to single on mobile */}
      <div className="dashboard-grid">
        {/* Zone B — Case Command Panel */}
        <CaseCommandPanel
          score={progress}
          currentPhase={currentPhase}
          nextAction={nextAction}
          nextActionWhy={nextActionWhy}
          milestones={milestones}
        />

        {/* Zone C — Folder Stack */}
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

      {/* Zone D — Phase Strip */}
      <PhaseStrip phases={phases} />
    </div>
  );
}
