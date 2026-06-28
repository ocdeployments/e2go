"use client";
import type { CSSProperties } from "react";

interface DimensionScores {
  sourceOfFunds: number | null;
  managementRole: number | null;
  businessPlan: number | null;
}

interface CaseCommandPanelProps {
  score: number;
  currentPhase: string;
  nextAction: string;
  nextActionWhy?: string;
  applicationLabel: string | null;
  treatyCountry: string | null;
  quizOutcome: string | null;
  investmentRange: string | null;
  generatedDocCount: number;
  dimensionScores: DimensionScores | null;
  isFranchisePath: boolean;
}

// Handles both legacy vocab (strong/borderline) and quiz engine vocab (PROCEED/PROCEED_RISK)
const OUTCOME_MAP: Record<string, { label: string; color: string; borderColor: string }> = {
  strong:               { label: "Strong — Eligible",                        color: "#5DCAA5", borderColor: "rgba(93,202,165,0.25)" },
  borderline:           { label: "Borderline — Review",                      color: "#C9A84C", borderColor: "rgba(201,168,76,0.25)" },
  caution:              { label: "Caution — Concerns",                       color: "#fbbf24", borderColor: "rgba(251,191,36,0.25)" },
  ineligible:           { label: "Ineligible",                               color: "#f87171", borderColor: "rgba(248,113,113,0.25)" },
  proceed:              { label: "Strong — Eligible",                        color: "#5DCAA5", borderColor: "rgba(93,202,165,0.25)" },
  proceed_risk:         { label: "Eligible — strengthen key areas",           color: "#C9A84C", borderColor: "rgba(201,168,76,0.25)" },
  attorney_recommended: { label: "Complex case — legal guidance recommended", color: "#fbbf24", borderColor: "rgba(251,191,36,0.25)" },
};

const PHASE_HREF: Record<string, string> = {
  Onboarding:               "/apply/story",
  "Business Profile":       "/apply/business",
  "Investment & Documents": "/apply/investment",
  "Gap Analysis":           "/gap-analysis",
  "Document Generation":    "/apply/generate",
  "Interview Preparation":  "/simulator",
};

const PHASE_CTA: Record<string, string> = {
  Onboarding:               "Begin Onboarding",
  "Business Profile":       "Add Business Information",
  "Investment & Documents": "Add Investment Details",
  "Gap Analysis":           "Run Gap Analysis",
  "Document Generation":    "Generate Your Documents",
  "Interview Preparation":  "Start Interview Practice",
};

const PHASE_UNLOCK_TEXT: Record<string, string> = {
  Onboarding:               "Pre-fills all 15 documents with your personal details",
  "Business Profile":       "Unlocks Investment section and business plan generation",
  "Investment & Documents": "Unlocks Gap Analysis and Source of Funds statement",
  "Gap Analysis":           "Findings are injected into all 15 generated documents",
  "Document Generation":    "Unlocks Interview Dossier and submission checklist",
  "Interview Preparation":  "Application complete — ready for consulate submission",
};

interface PhaseConfig {
  label: string;
  detail: string;
  unlockCondition: string;
}

const FRANCHISE_PHASES: PhaseConfig[] = [
  { label: "Discovery",     detail: "Franchise selection · expert matching",          unlockCondition: "Available now" },
  { label: "Intelligence",  detail: "Gap analysis · FDD review · Market data",        unlockCondition: "After your case file" },
  { label: "Application",   detail: "15 consulate-formatted documents, auto-generated", unlockCondition: "After intelligence review" },
  { label: "Interview",     detail: "Personalised dossier · AI simulator practice",   unlockCondition: "After application is built" },
];

const OWN_BUSINESS_PHASES: PhaseConfig[] = [
  { label: "Intelligence",  detail: "Gap analysis · Market analysis for your business", unlockCondition: "After your case file" },
  { label: "Application",   detail: "15 consulate-formatted documents, auto-generated",  unlockCondition: "After intelligence review" },
  { label: "Interview",     detail: "Personalised dossier · AI simulator practice",     unlockCondition: "After application is built" },
];

function deriveActivePhaseIndex(currentPhase: string, isFranchisePath: boolean): number {
  if (isFranchisePath) {
    if (currentPhase === "Onboarding" || currentPhase === "Business Profile") return 0;
    if (currentPhase === "Investment & Documents" || currentPhase === "Gap Analysis") return 1;
    if (currentPhase === "Document Generation") return 2;
    return 3;
  }
  if (currentPhase === "Onboarding" || currentPhase === "Business Profile" ||
      currentPhase === "Investment & Documents" || currentPhase === "Gap Analysis") return 0;
  if (currentPhase === "Document Generation") return 1;
  return 2;
}

function scoreColor(s: number): string {
  if (s >= 75) return "#5DCAA5";
  if (s >= 50) return "#C9A84C";
  return "#f87171";
}

const DIMENSION_LABELS: Record<string, string> = {
  sourceOfFunds:  "Source of Funds",
  managementRole: "Management Role",
  businessPlan:   "Business Plan",
};

export default function CaseCommandPanel({
  score,
  currentPhase,
  nextAction: _nextAction,
  nextActionWhy: _nextActionWhy,
  applicationLabel: _applicationLabel,
  treatyCountry,
  quizOutcome,
  investmentRange,
  generatedDocCount,
  dimensionScores,
  isFranchisePath,
}: CaseCommandPanelProps) {
  const eyebrow: CSSProperties = {
    fontSize: "9px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "rgba(245,240,232,0.38)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    marginBottom: "4px",
  };

  const outcomeKey = quizOutcome?.toLowerCase() ?? "";
  const outcome = OUTCOME_MAP[outcomeKey] ?? null;
  const ctaHref = PHASE_HREF[currentPhase] ?? "/apply/story";
  const ctaLabel = PHASE_CTA[currentPhase] ?? "Continue";
  const phaseUnlockText = PHASE_UNLOCK_TEXT[currentPhase] ?? "";

  const phases = isFranchisePath ? FRANCHISE_PHASES : OWN_BUSINESS_PHASES;
  const activePhaseIndex = deriveActivePhaseIndex(currentPhase, isFranchisePath);

  const dims = dimensionScores
    ? Object.entries(dimensionScores)
        .filter(([, v]) => v !== null)
        .map(([k, v]) => ({ key: k, label: DIMENSION_LABELS[k] ?? k, score: v as number }))
        .sort((a, b) => a.score - b.score)
    : [];

  const glanceItems = [treatyCountry, investmentRange].filter(Boolean);
  if (generatedDocCount > 0) glanceItems.push(`${generatedDocCount}/15 documents`);

  return (
    <div
      style={{
        background: "#1C1408",
        border: "1px solid rgba(201,168,76,0.15)",
        padding: "22px 24px 24px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <style>{`
        @keyframes e2go-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>

      {/* Eyebrow */}
      <div style={{
        fontSize: "9px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.5)",
        fontFamily: "'DM Sans', sans-serif",
      }}>
        E-2 Application
      </div>

      {/* ── Primary CTA — dominant element ── */}
      <div>
        <a
          href={ctaHref}
          style={{
            display: "block",
            padding: "14px 18px",
            background: "#C9A84C",
            color: "#0a0a0a",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "'DM Sans', sans-serif",
            textDecoration: "none",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          {ctaLabel} →
        </a>
        {phaseUnlockText && (
          <div style={{
            fontSize: "10px",
            color: "rgba(245,240,232,0.35)",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
            textAlign: "center",
          }}>
            {phaseUnlockText}
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(201,168,76,0.1)" }} />

      {/* ── Case at a glance ── */}
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}>
          <div style={eyebrow}>Case at a glance</div>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%", background: "#5DCAA5",
              display: "inline-block",
              animation: "e2go-pulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: "8px", color: "rgba(93,202,165,0.65)", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.1em" }}>
              Live
            </span>
          </div>
        </div>

        {/* Country · Investment · Doc count inline */}
        {glanceItems.length > 0 && (
          <div style={{
            fontSize: "12px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.6)",
            marginBottom: "8px",
            lineHeight: 1.5,
          }}>
            {glanceItems.join(" · ")}
          </div>
        )}

        {/* Assessment pill */}
        {outcome && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            border: `1px solid ${outcome.borderColor}`,
            background: `${outcome.color}10`,
            marginBottom: "12px",
          }}>
            <span style={{
              width: "5px", height: "5px", borderRadius: "50%",
              background: outcome.color, display: "inline-block", flexShrink: 0,
            }} />
            <span style={{
              fontSize: "10px", fontFamily: "'DM Sans', sans-serif",
              color: outcome.color, fontWeight: 600, letterSpacing: "0.04em",
            }}>
              {outcome.label}
            </span>
          </div>
        )}

        {/* Readiness % — demoted below the CTA and assessment */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
            <span style={{
              fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
              color: "rgba(245,240,232,0.25)", fontFamily: "'DM Sans', sans-serif",
            }}>
              Case Readiness
            </span>
            <span style={{
              fontSize: "14px", fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 300, color: "rgba(245,240,232,0.55)",
            }}>
              {score}%
            </span>
          </div>
          <div style={{ height: "1px", background: "rgba(245,240,232,0.06)", position: "relative" }}>
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${score}%`, background: "#C9A84C", opacity: 0.6,
            }} />
          </div>
          <div style={{ fontSize: "9px", color: "rgba(245,240,232,0.2)", fontFamily: "'DM Sans', sans-serif", marginTop: "4px" }}>
            Rises with each completed step
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "rgba(201,168,76,0.1)" }} />

      {/* ── 4-phase journey roadmap ── */}
      <div>
        <div style={{ ...eyebrow, marginBottom: "12px" }}>Your Journey Ahead</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {phases.map((phase, i) => {
            const isActive = i === activePhaseIndex;
            const isDone = i < activePhaseIndex;
            const isFuture = i > activePhaseIndex;
            const opacity = isDone ? 0.55 : isFuture ? Math.max(0.22, 0.8 - (i - activePhaseIndex) * 0.18) : 1;

            return (
              <div
                key={phase.label}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "9px 10px",
                  background: isActive ? "rgba(201,168,76,0.05)" : "transparent",
                  borderLeft: isActive ? "2px solid rgba(201,168,76,0.5)" : "2px solid transparent",
                  opacity,
                }}
              >
                <div style={{
                  width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0, marginTop: "4px",
                  background: isDone ? "#5DCAA5" : isActive ? "#C9A84C" : "rgba(245,240,232,0.18)",
                  boxShadow: isActive ? "0 0 5px rgba(201,168,76,0.4)" : "none",
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "11px", fontFamily: "'DM Sans', sans-serif",
                    color: isDone ? "rgba(93,202,165,0.9)" : isActive ? "#f5f0e8" : "rgba(245,240,232,0.6)",
                    fontWeight: isActive ? 600 : 400,
                    marginBottom: "2px",
                  }}>
                    {phase.label}
                    {isDone && <span style={{ marginLeft: "6px", fontSize: "9px", color: "rgba(93,202,165,0.65)" }}>✓</span>}
                  </div>
                  <div style={{
                    fontSize: "10px", fontFamily: "'DM Sans', sans-serif",
                    color: "rgba(245,240,232,0.3)", lineHeight: 1.4,
                  }}>
                    {(isActive || isDone) ? phase.detail : phase.unlockCondition}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Case Health — only after gap analysis ── */}
      {dims.length > 0 && (
        <>
          <div style={{ height: "1px", background: "rgba(201,168,76,0.1)" }} />
          <div>
            <div style={{ ...eyebrow, marginBottom: "10px" }}>Case Health</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {dims.map(({ key, label, score: s }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.55)" }}>
                      {label}
                    </span>
                    <span style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: scoreColor(s), fontWeight: 600 }}>
                      {s}%
                    </span>
                  </div>
                  <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", position: "relative" }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${s}%`, background: scoreColor(s), transition: "width 0.6s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
            <a href="/gap-analysis" style={{
              display: "inline-block", marginTop: "10px", fontSize: "9px",
              color: "rgba(201,168,76,0.6)", fontFamily: "'DM Sans', sans-serif",
              textDecoration: "none", letterSpacing: "0.06em",
            }}>
              Full gap analysis →
            </a>
          </div>
        </>
      )}

    </div>
  );
}
