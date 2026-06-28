"use client";
import Link from "next/link";

// ── Design tokens ─────────────────────────────────────────────────────────────
const GOLD = "#C9A84C";
const CREAM = "#f5f0e8";
const BORDER_INNER = "rgba(201,168,76,0.1)";

const ARCHETYPE_LABEL: Record<string, string> = {
  buyer:          "Franchise Buyer",
  builder:        "Business Builder",
  career_switcher:"Career Switcher",
  investor:       "Capital Investor",
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

interface CaseRecordSectionProps {
  firstName: string | null;
  quizOutcome: string | null;
  investmentRange: string | null;
  quizAnswers: Record<string, string>;
  caseArchetype: string | null;
  isFranchisePath: boolean;
  fddCount: number;
  lifecycle: Record<string, string | null> | null;
  caseCompletenessScore: number | null;
  dimensionScores: DimensionScores | null;
  simulatorSnapshot: SimulatorSnapshot | null;
  sectionCompletionMap: { qualifications: boolean; family: boolean; ties: boolean };
  generatedDocCount: number;
  quizCompleted: boolean;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ title, children, href, linkLabel }: {
  title: string;
  children: React.ReactNode;
  href: string;
  linkLabel: string;
}) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER_INNER}` }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "10px",
      }}>
        <span style={{
          fontSize: "8px",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.45)",
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
        }}>
          {title}
        </span>
        <Link href={href} style={{
          fontSize: "8px",
          letterSpacing: "0.08em",
          color: "rgba(201,168,76,0.35)",
          fontFamily: "'DM Sans', sans-serif",
          textDecoration: "none",
          flexShrink: 0,
        }}>
          {linkLabel} →
        </Link>
      </div>
      {children}
    </div>
  );
}

function Narrative({ text, empty }: { text: string | null; empty: string }) {
  return (
    <p style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "12px",
      lineHeight: 1.65,
      color: text ? "rgba(245,240,232,0.7)" : "rgba(245,240,232,0.25)",
      fontStyle: text ? "normal" : "italic",
      margin: 0,
    }}>
      {text ?? empty}
    </p>
  );
}

function MiniBar({ label, score }: { label: string; score: number | null }) {
  const color = score == null ? "rgba(245,240,232,0.12)"
    : score >= 75 ? "#5DCAA5"
    : score >= 50 ? GOLD
    : "#f87171";
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
        <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.45)", fontFamily: "'DM Sans', sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: "10px", color, fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
          {score != null ? `${score}%` : "—"}
        </span>
      </div>
      <div style={{ height: "2px", background: "rgba(255,255,255,0.05)" }}>
        <div style={{
          height: "100%", width: `${score ?? 0}%`,
          background: color, transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CaseRecordSection({
  firstName,
  investmentRange,
  quizAnswers,
  caseArchetype,
  isFranchisePath,
  fddCount,
  lifecycle,
  caseCompletenessScore,
  dimensionScores,
  simulatorSnapshot,
  sectionCompletionMap,
  generatedDocCount,
  quizCompleted,
}: CaseRecordSectionProps) {
  const treatyCountry = quizAnswers["Q0-01"] ?? null;
  const archetypeLabel = caseArchetype ? (ARCHETYPE_LABEL[caseArchetype] ?? caseArchetype) : null;
  const module1Done = Boolean(lifecycle?.module1_completed_at);
  const module2Done = Boolean(lifecycle?.module2_completed_at);
  const module3Done = Boolean(lifecycle?.module3_completed_at);
  const module5Done = Boolean(lifecycle?.module5_completed_at);

  // ── Narrative builders ────────────────────────────────────────────────────

  function buildInvestorNarrative(): string | null {
    if (!quizCompleted) return null;
    const parts: string[] = [];
    if (firstName) parts.push(firstName);
    if (treatyCountry) parts.push(`${treatyCountry} national`);
    if (archetypeLabel) parts.push(`${archetypeLabel} archetype`);
    if (investmentRange) parts.push(`investing ${investmentRange}`);
    if (isFranchisePath) parts.push("in a franchise purchase");
    return parts.length > 0 ? parts.join(" · ") + "." : null;
  }

  function buildBusinessNarrative(): string | null {
    if (!module2Done && !isFranchisePath) return null;
    if (isFranchisePath) {
      if (fddCount > 0) return `Franchise purchase · ${fddCount} FDD ${fddCount === 1 ? "analysis" : "analyses"} complete · territory data available.`;
      return "Franchise purchase · No FDD analysed yet. Upload your FDD to unlock intelligence scoring.";
    }
    return "Own business formation · Business profile complete · Market analysis available.";
  }

  function buildInvestmentNarrative(): string | null {
    if (!investmentRange) return null;
    const parts: string[] = [];
    if (investmentRange) parts.push(investmentRange);
    if (module3Done) parts.push("source of funds documented");
    else parts.push("source of funds not yet documented");
    if (generatedDocCount > 0) parts.push(`${generatedDocCount} of 15 documents ready`);
    return parts.join(" · ") + ".";
  }

  function buildIntelligenceNarrative(): string | null {
    if (caseCompletenessScore == null) return null;
    const dims = [
      { label: "Source of Funds", score: dimensionScores?.sourceOfFunds },
      { label: "Management Role", score: dimensionScores?.managementRole },
      { label: "Business Plan",   score: dimensionScores?.businessPlan },
    ].filter((d) => d.score != null) as { label: string; score: number }[];
    if (dims.length === 0) return `${caseCompletenessScore}% overall readiness.`;
    const weakest = dims.reduce((a, b) => a.score < b.score ? a : b);
    return `${caseCompletenessScore}% overall readiness. ${weakest.label} (${weakest.score}%) is your primary evidence gap.`;
  }

  function buildInterviewNarrative(): string | null {
    if (!simulatorSnapshot) return null;
    const { readinessIndicator, strongCount, needsWorkCount } = simulatorSnapshot;
    const label = readinessIndicator === "ready" ? "Interview ready"
      : readinessIndicator === "nearly_ready" ? "Nearly ready"
      : "Needs more practice";
    return `${label} · ${strongCount} strong answers · ${needsWorkCount} areas to strengthen.`;
  }

  const investorNarrative   = buildInvestorNarrative();
  const businessNarrative   = buildBusinessNarrative();
  const investmentNarrative = buildInvestmentNarrative();
  const intelligenceNarrative = buildIntelligenceNarrative();
  const interviewNarrative  = buildInterviewNarrative();

  const hasIntelligence = caseCompletenessScore != null && dimensionScores != null;

  return (
    <div style={{
      background: "#1C1408",
      border: "1px solid rgba(201,168,76,0.15)",
    }}>
      {/* Label strip */}
      <div style={{
        padding: "10px 20px",
        borderBottom: `1px solid ${BORDER_INNER}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: "8px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(201,168,76,0.4)",
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Case Record
        </span>
        <span style={{
          fontSize: "8px",
          fontFamily: "'DM Sans', sans-serif",
          color: "rgba(245,240,232,0.18)",
          letterSpacing: "0.06em",
        }}>
          Updates as you complete each step
        </span>
      </div>

      {/* ── The Investor ── */}
      <Section title="The Investor" href="/apply/story" linkLabel="Onboarding">
        <Narrative
          text={investorNarrative}
          empty="Complete the eligibility quiz to populate your investor profile."
        />
      </Section>

      {/* ── The Business ── */}
      <Section
        title="The Business"
        href={isFranchisePath ? "/fdd" : "/apply/business"}
        linkLabel={isFranchisePath ? "FDD review" : "Business profile"}
      >
        <Narrative
          text={businessNarrative}
          empty={
            isFranchisePath
              ? "Complete onboarding to activate the FDD intelligence layer."
              : "Complete the business profile section to populate this record."
          }
        />
      </Section>

      {/* ── The Investment ── */}
      <Section title="The Investment" href="/apply/investment" linkLabel="Investment section">
        <Narrative
          text={investmentNarrative}
          empty="Investment details populate after the eligibility quiz."
        />
      </Section>

      {/* ── Case Intelligence ── */}
      <Section title="Case Intelligence" href="/gap-analysis" linkLabel="Full gap analysis">
        {hasIntelligence ? (
          <>
            <Narrative text={intelligenceNarrative} empty="" />
            <div style={{ marginTop: "10px" }}>
              <MiniBar label="Source of Funds"  score={dimensionScores!.sourceOfFunds} />
              <MiniBar label="Management Role"  score={dimensionScores!.managementRole} />
              <MiniBar label="Business Plan"    score={dimensionScores!.businessPlan} />
            </div>
          </>
        ) : (
          <Narrative
            text={null}
            empty="Run Gap Analysis to score your case across 3 evidence dimensions. Findings are injected into all 15 documents."
          />
        )}
      </Section>

      {/* ── Application Progress ── */}
      <Section title="Application Progress" href="/apply/story" linkLabel="My Application">
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {[
            { label: "Eligibility Quiz",       done: quizCompleted,                            href: "/quiz" },
            { label: "Onboarding",             done: module1Done,                              href: "/apply/story" },
            { label: "Business Profile",       done: module2Done,                              href: "/apply/business" },
            { label: "Investment & Documents", done: module3Done,                              href: "/apply/investment" },
            { label: "Qualifications",         done: sectionCompletionMap.qualifications,      href: "/apply/qualifications" },
            { label: "Family & Country Ties",  done: sectionCompletionMap.family && sectionCompletionMap.ties, href: "/apply/family" },
            { label: "Document Generation",    done: module5Done,                              href: "/apply/generate" },
          ].map((step) => (
            <Link
              key={step.label}
              href={step.done ? "#" : step.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
                opacity: step.done ? 0.45 : 1,
              }}
            >
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0,
                background: step.done ? "#5DCAA5" : "rgba(245,240,232,0.12)",
                border: step.done ? "none" : "1px solid rgba(245,240,232,0.2)",
              }} />
              <span style={{
                fontSize: "11px",
                fontFamily: "'DM Sans', sans-serif",
                color: step.done ? "rgba(93,202,165,0.8)" : CREAM,
                textDecoration: step.done ? "line-through" : "none",
              }}>
                {step.label}
              </span>
              {!step.done && (
                <span style={{ marginLeft: "auto", fontSize: "8px", color: "rgba(201,168,76,0.3)", flexShrink: 0 }}>
                  →
                </span>
              )}
            </Link>
          ))}
        </div>
      </Section>

      {/* ── Interview Readiness ── */}
      <Section title="Interview Readiness" href="/simulator" linkLabel="Simulator">
        <Narrative
          text={interviewNarrative}
          empty="The simulator is available at any stage — no case file required. Sessions build coaching notes here."
        />
        {simulatorSnapshot && simulatorSnapshot.top3.length > 0 && (
          <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {simulatorSnapshot.top3.slice(0, 2).map((note, i) => (
              <div key={i} style={{
                fontSize: "10px",
                fontFamily: "'DM Sans', sans-serif",
                color: "rgba(245,240,232,0.35)",
                lineHeight: 1.5,
                paddingLeft: "10px",
                borderLeft: "1px solid rgba(201,168,76,0.15)",
              }}>
                {note}
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  );
}
