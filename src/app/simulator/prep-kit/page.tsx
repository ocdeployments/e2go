"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface KitFact { label: string; value: string }
interface Strength { heading: string; detail: string }
interface OfficerConcern {
  code: string;
  name: string;
  concern: string;
  factsToKnow: string[];
  bestShortAnswer: string;
  expandedAnswer: string;
  avoidSaying: string;
  risk: "high" | "moderate";
}
interface Breakdown { item: string; amount: string }
interface KeyDate { event: string; date: string }
interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
  shortAnswer?: string;
  answerFramework: string;
  keyNumbers: string[];
  pitfalls: string;
}
interface WpProbe { id: string; trigger: string; question: string; answerFramework: string }
interface MockRound { name: string; focus: string; sampleQuestions: string[] }

interface PrepKit {
  clientName: string;
  businessName: string;
  generatedDate: string;
  persona?: {
    title: string;
    subtitle: string;
    name: string;
    roleSummary: string;
    backgroundSummary: string;
    caseTheorySummary: string;
    interviewStyleNotes: string[];
  };
  section1: { title: string; subtitle: string; facts: KitFact[] };
  section2: { title: string; subtitle: string; strengths: Strength[] };
  section3: { title: string; subtitle: string; highRisk: OfficerConcern[]; moderateRisk: OfficerConcern[]; noIssues: string[] };
  section4: { title: string; subtitle: string; businessOverview: string; managementRole: string; staffingPlan: string; marketPosition: string };
  section5: { title: string; subtitle: string; totalInvested: string; breakdown: Breakdown[]; sourceChronology: string[]; committedAmount: string; fddNote?: string };
  section6: { title: string; subtitle: string; keyDates: KeyDate[]; simulatorFeedback: string; documentsToCarry: string[]; whatMayHaveChanged: string[]; materialUpdates?: string[] };
  section7: { title: string; subtitle: string; questions: InterviewQuestion[]; applicableProbes: WpProbe[] };
  section8?: { title: string; subtitle: string; rules: string[] };
  section9?: { title: string; subtitle: string; rounds: MockRound[] };
  section10?: { title: string; subtitle: string; checklist: string[] };
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0a0a",
  gold: "#C9A84C",
  goldDim: "rgba(201,168,76,0.12)",
  goldLabel: "rgba(201,168,76,0.65)",
  text: "#f5f0e8",
  textDim: "rgba(245,240,232,0.55)",
  textMuted: "rgba(245,240,232,0.35)",
  border: "rgba(201,168,76,0.15)",
  red: "#C05252",
  amber: "#B87333",
  green: "#3B7D5E",
  surface: "rgba(201,168,76,0.04)",
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'DM Sans', sans-serif",
};

const eyebrow: React.CSSProperties = {
  fontSize: "9px",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: T.goldLabel,
  fontFamily: T.body,
  fontWeight: 500,
};

const sectionTitle: React.CSSProperties = {
  fontFamily: T.heading,
  fontSize: "22px",
  fontWeight: 300,
  color: T.text,
  lineHeight: 1.15,
};

// ── Collapsible section wrapper ────────────────────────────────────────────────
function Section({
  number,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  number: string;
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        marginBottom: "2px",
        pageBreakInside: "avoid",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "16px 20px",
          background: open ? T.surface : "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: T.body,
            color: T.goldLabel,
            background: T.goldDim,
            border: `1px solid rgba(201,168,76,0.2)`,
            padding: "2px 7px",
            letterSpacing: "0.08em",
            flexShrink: 0,
          }}
        >
          {number}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...sectionTitle, fontSize: "18px" }}>{title}</div>
          <div style={{ ...eyebrow, marginTop: "3px", color: T.textMuted, textTransform: "none", letterSpacing: 0 }}>
            {subtitle}
          </div>
        </div>
        <span style={{ color: T.goldLabel, fontSize: "18px", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
          ›
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 20px 20px", borderTop: `1px solid ${T.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return <div style={{ height: "1px", background: T.border, margin: "14px 0" }} />;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ ...eyebrow, marginBottom: "4px" }}>{children}</div>;
}

function Body({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: "13px",
        fontFamily: T.body,
        color: T.text,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function RiskChip({ level }: { level: "high" | "moderate" }) {
  const color = level === "high" ? T.red : T.amber;
  return (
    <span
      style={{
        fontSize: "9px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "2px 7px",
        fontFamily: T.body,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {level}
    </span>
  );
}

// ── Section renderers ─────────────────────────────────────────────────────────

function Section1({ data }: { data: PrepKit["section1"] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "12px",
        paddingTop: "14px",
      }}
    >
      {data.facts.map((f) => (
        <div key={f.label} style={{ borderLeft: `2px solid ${T.goldDim}`, paddingLeft: "10px" }}>
          <Label>{f.label}</Label>
          <Body style={{ fontSize: "14px", fontWeight: 500, color: T.text }}>{f.value}</Body>
        </div>
      ))}
    </div>
  );
}

function Section2({ data }: { data: PrepKit["section2"] }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {data.strengths.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <span style={{ color: T.green, fontSize: "13px", marginTop: "2px", flexShrink: 0 }}>✓</span>
          <div>
            <div style={{ fontSize: "13px", fontFamily: T.body, fontWeight: 500, color: T.text, marginBottom: "2px" }}>
              {s.heading}
            </div>
            <Body style={{ color: T.textDim, fontSize: "12px" }}>{s.detail}</Body>
          </div>
        </div>
      ))}
    </div>
  );
}

function Section3({ data }: { data: PrepKit["section3"] }) {
  const allRisks = [...data.highRisk, ...data.moderateRisk];
  return (
    <div style={{ paddingTop: "14px" }}>
      {allRisks.length === 0 ? (
        <Body style={{ color: T.textDim }}>No significant denial risk factors identified based on your submitted data.</Body>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {allRisks.map((r) => (
            <div key={r.code} style={{ border: `1px solid ${r.risk === "high" ? "rgba(192,82,82,0.25)" : "rgba(184,115,51,0.22)"}`, padding: "14px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", fontFamily: T.body, color: T.goldLabel, fontWeight: 600 }}>{r.code}</span>
                  <span style={{ fontSize: "13px", fontFamily: T.body, color: T.text, fontWeight: 500 }}>{r.name}</span>
                </div>
                <RiskChip level={r.risk} />
              </div>

              <Label>The officer&apos;s concern</Label>
              <Body style={{ fontSize: "12px", color: T.textDim, marginBottom: "10px" }}>{r.concern}</Body>

              {r.factsToKnow?.length > 0 && (
                <>
                  <Label>Facts to know cold</Label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px", marginBottom: "10px" }}>
                    {r.factsToKnow.map((f, i) => (
                      <Body key={i} style={{ fontSize: "12px", color: T.text }}>→ {f}</Body>
                    ))}
                  </div>
                </>
              )}

              <Divider />

              <Label>Best short answer</Label>
              <Body style={{ fontSize: "13px", color: T.gold, fontWeight: 500, marginBottom: "10px" }}>{r.bestShortAnswer}</Body>

              <Label>If they probe further</Label>
              <Body style={{ fontSize: "12px", color: T.text, marginBottom: "10px" }}>{r.expandedAnswer}</Body>

              <Label>Avoid saying</Label>
              <Body style={{ fontSize: "12px", color: "rgba(192,82,82,0.85)" }}>{r.avoidSaying}</Body>
            </div>
          ))}
        </div>
      )}
      {data.noIssues.length > 0 && (
        <div style={{ marginTop: "14px" }}>
          <Label>No concerns on</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
            {data.noIssues.map((s, i) => (
              <span key={i} style={{ fontSize: "10px", fontFamily: T.body, color: T.textMuted, border: `1px solid rgba(245,240,232,0.1)`, padding: "2px 8px" }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section4({ data }: { data: PrepKit["section4"] }) {
  const fields: [string, string][] = [
    ["Business overview", data.businessOverview],
    ["Your management role", data.managementRole],
    ["Staffing plan", data.staffingPlan],
    ["Market position", data.marketPosition],
  ];
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {fields.map(([label, value]) => (
        <div key={label}>
          <Label>{label}</Label>
          <Body style={{ color: T.textDim }}>{value}</Body>
        </div>
      ))}
    </div>
  );
}

function Section5({ data }: { data: PrepKit["section5"] }) {
  return (
    <div style={{ paddingTop: "14px" }}>
      <div style={{ marginBottom: "14px" }}>
        <Label>Total invested</Label>
        <div style={{ fontSize: "22px", fontFamily: T.heading, fontWeight: 300, color: T.gold, lineHeight: 1.1 }}>{data.totalInvested}</div>
      </div>
      {data.breakdown.length > 0 && (
        <>
          <Label>Breakdown</Label>
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {data.breakdown.map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                <Body style={{ fontSize: "12px", color: T.textDim }}>{b.item}</Body>
                <Body style={{ fontSize: "12px", color: T.text, fontWeight: 500 }}>{b.amount}</Body>
              </div>
            ))}
          </div>
          <Divider />
        </>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        <div>
          <Label>Source chronology</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
            {data.sourceChronology.map((step, i) => (
              <Body key={i} style={{ fontSize: "12px", color: T.textDim }}>→ {step}</Body>
            ))}
          </div>
        </div>
        <div>
          <Label>What is committed / deployed</Label>
          <Body style={{ fontSize: "12px", color: T.textDim }}>{data.committedAmount}</Body>
        </div>
      </div>
      {data.fddNote && (
        <>
          <Divider />
          <Label>Franchise (FDD) context</Label>
          <Body style={{ fontSize: "12px", color: T.textDim }}>{data.fddNote}</Body>
        </>
      )}
    </div>
  );
}

function Section6({ data }: { data: PrepKit["section6"] }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {data.keyDates.length > 0 && (
        <div>
          <Label>Key dates</Label>
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {data.keyDates.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                <Body style={{ fontSize: "12px", color: T.textDim }}>{d.event}</Body>
                <Body style={{ fontSize: "12px", color: T.textMuted, fontFamily: T.body }}>{d.date}</Body>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <Label>Last simulator session feedback</Label>
        <Body style={{ fontSize: "12px", color: T.textDim }}>{data.simulatorFeedback}</Body>
      </div>
      <div>
        <Label>Documents to carry to the interview</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
          {data.documentsToCarry.map((doc, i) => (
            <Body key={i} style={{ fontSize: "12px", color: T.textDim }}>→ {doc}</Body>
          ))}
        </div>
      </div>
      <div>
        <Label>What may have changed since you filed</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
          {data.whatMayHaveChanged.map((item, i) => (
            <Body key={i} style={{ fontSize: "12px", color: T.textDim }}>→ {item}</Body>
          ))}
        </div>
      </div>
      {data.materialUpdates && data.materialUpdates.length > 0 && (
        <div>
          <Label>Confirm before you go in</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
            {data.materialUpdates.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: T.goldLabel, fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>☐</span>
                <Body style={{ fontSize: "12px", color: T.textDim }}>{item}</Body>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section7({ data }: { data: PrepKit["section7"] }) {
  const categoryOrder = [
    "Opening questions",
    "Role and operations questions",
    "Investment and financial questions",
    "Hiring and growth questions",
    "Credibility and consistency questions",
    "Challenge questions",
  ];
  const grouped = new Map<string, InterviewQuestion[]>();
  for (const q of data.questions) {
    const cat = q.category || "Other questions";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(q);
  }
  const orderedCategories = [
    ...categoryOrder.filter((c) => grouped.has(c)),
    ...[...grouped.keys()].filter((c) => !categoryOrder.includes(c)),
  ];

  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {orderedCategories.map((cat) => (
        <div key={cat}>
          <div style={{ ...eyebrow, marginBottom: "10px" }}>{cat}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {grouped.get(cat)!.map((q) => (
              <div key={q.id} style={{ border: `1px solid ${T.border}`, padding: "14px 16px" }}>
                <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                  <span style={{ fontSize: "10px", fontFamily: T.body, color: T.goldLabel, fontWeight: 600, flexShrink: 0, paddingTop: "2px" }}>{q.id}</span>
                  <div style={{ fontSize: "14px", fontFamily: T.heading, fontWeight: 300, color: T.text, lineHeight: 1.3 }}>{q.question}</div>
                </div>
                {q.shortAnswer && (
                  <Body style={{ fontSize: "13px", color: T.gold, fontWeight: 500, marginBottom: "10px" }}>{q.shortAnswer}</Body>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", marginTop: "6px" }}>
                  <div>
                    <Label>Answer framework</Label>
                    <Body style={{ fontSize: "12px", color: T.textDim }}>{q.answerFramework}</Body>
                  </div>
                  <div>
                    <div style={{ marginBottom: "10px" }}>
                      <Label>Key numbers to cite</Label>
                      {q.keyNumbers.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "4px" }}>
                          {q.keyNumbers.map((n, i) => (
                            <Body key={i} style={{ fontSize: "11px", color: T.gold }}>→ {n}</Body>
                          ))}
                        </div>
                      ) : (
                        <Body style={{ fontSize: "11px", color: T.textMuted }}>—</Body>
                      )}
                    </div>
                    <Label>Pitfall to avoid</Label>
                    <Body style={{ fontSize: "11px", color: "rgba(192,82,82,0.8)" }}>{q.pitfalls}</Body>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {data.applicableProbes.length > 0 && (
        <>
          <div style={{ ...eyebrow, marginTop: "8px", color: T.amber }}>Weak point probes — may be asked based on your case</div>
          {data.applicableProbes.map((wp) => (
            <div key={wp.id} style={{ border: `1px solid rgba(184,115,51,0.25)`, padding: "14px 16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "8px" }}>
                <span style={{ fontSize: "10px", fontFamily: T.body, color: T.amber, fontWeight: 600, flexShrink: 0, paddingTop: "2px" }}>{wp.id}</span>
                <div style={{ fontSize: "14px", fontFamily: T.heading, fontWeight: 300, color: T.text }}>{wp.question}</div>
              </div>
              <div style={{ marginBottom: "6px" }}>
                <Label>Why you may be asked this</Label>
                <Body style={{ fontSize: "12px", color: T.textDim }}>{wp.trigger}</Body>
              </div>
              <Label>How to answer</Label>
              <Body style={{ fontSize: "12px", color: T.textDim }}>{wp.answerFramework}</Body>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Persona({ data }: { data: NonNullable<PrepKit["persona"]> }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <div>
        <Label>Role</Label>
        <Body style={{ fontSize: "14px", color: T.text, fontWeight: 500 }}>{data.roleSummary}</Body>
      </div>
      <div>
        <Label>Background</Label>
        <Body style={{ color: T.textDim }}>{data.backgroundSummary}</Body>
      </div>
      <div>
        <Label>Case theory — why this case should be approved</Label>
        <Body style={{ color: T.textDim }}>{data.caseTheorySummary}</Body>
      </div>
      {data.interviewStyleNotes?.length > 0 && (
        <div>
          <Label>How to carry yourself</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "6px" }}>
            {data.interviewStyleNotes.map((n, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: T.goldLabel, fontSize: "11px", flexShrink: 0, marginTop: "2px" }}>→</span>
                <Body style={{ fontSize: "12px", color: T.text }}>{n}</Body>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section8({ data }: { data: NonNullable<PrepKit["section8"]> }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
      {data.rules.map((rule, i) => (
        <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
          <span style={{ fontSize: "10px", fontFamily: T.body, color: T.goldLabel, fontWeight: 600, flexShrink: 0, paddingTop: "2px" }}>{String(i + 1).padStart(2, "0")}</span>
          <Body style={{ color: T.text }}>{rule}</Body>
        </div>
      ))}
    </div>
  );
}

function Section9({ data }: { data: NonNullable<PrepKit["section9"]> }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "14px" }}>
      {data.rounds.map((round, i) => (
        <div key={i} style={{ border: `1px solid ${T.border}`, padding: "14px 16px" }}>
          <div style={{ fontSize: "14px", fontFamily: T.heading, fontWeight: 300, color: T.gold, marginBottom: "4px" }}>{round.name}</div>
          <Body style={{ fontSize: "12px", color: T.textDim, marginBottom: "10px" }}>{round.focus}</Body>
          {round.sampleQuestions.length > 0 && (
            <>
              <Label>Practice these</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
                {round.sampleQuestions.map((q, j) => (
                  <Body key={j} style={{ fontSize: "12px", color: T.text }}>→ {q}</Body>
                ))}
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Section10({ data }: { data: NonNullable<PrepKit["section10"]> }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {data.checklist.map((item, i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span style={{ color: T.goldLabel, fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>☐</span>
          <Body style={{ fontSize: "13px", color: T.text }}>{item}</Body>
        </div>
      ))}
    </div>
  );
}

// ── Upsell gate ───────────────────────────────────────────────────────────────
// What the dossier pulls from — shown in the data requirements gate
const DOSSIER_DATA_SOURCES = [
  {
    section: "Business profile",
    what: "Business name, category, operational status, target state",
    where: "/apply/business",
    step: "Step 3 — Business Profile",
  },
  {
    section: "Investment & source of funds",
    what: "Total invested, breakdown of use of funds, traceable origin of capital",
    where: "/apply/investment",
    step: "Step 4 — Investment & Documents",
  },
  {
    section: "Your management role",
    what: "Day-to-day responsibilities, staffing plan, ownership structure",
    where: "/apply/business",
    step: "Step 3 — Business Profile",
  },
  {
    section: "Qualifications & background",
    what: "Work history, relevant skills, industry experience",
    where: "/apply/qualifications",
    step: "Step 5 — Your Qualifications",
  },
  {
    section: "Personal & visa story",
    what: "Country ties, intent to return, visa history",
    where: "/apply/story",
    step: "Step 2 — Onboarding",
  },
];

function PrepKitUpsell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        padding: "48px 24px 80px",
        maxWidth: "700px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ ...eyebrow, marginBottom: "10px" }}>Interview Preparation</div>
        <div style={{ fontFamily: T.heading, fontSize: "32px", fontWeight: 300, color: T.text, lineHeight: 1.1, marginBottom: "12px" }}>
          Interview Case Dossier
        </div>
        <p style={{ fontSize: "14px", fontFamily: T.body, color: T.textDim, lineHeight: 1.7, maxWidth: "580px", margin: 0 }}>
          The Interview Case Dossier is a personalised revision document you read through
          before walking into your consulate interview. It is independent of the Interview Simulator —
          it summarises your candidate story, business, investment, officer concerns, and the key arguments
          of your case in a format designed for study, not practice sessions.
        </p>
      </div>

      {/* What it covers */}
      <div
        style={{
          border: `1px solid ${T.border}`,
          padding: "20px 24px",
          marginBottom: "28px",
          background: T.surface,
        }}
      >
        <div style={{ ...eyebrow, marginBottom: "12px" }}>What the dossier covers</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {[
            "Candidate persona — who you're walking in as",
            "Case snapshot — key facts and figures",
            "Your strongest arguments — evidenced",
            "Officer concerns and response strategy — all 15 E-2 factors",
            "Business narrative — what you will say",
            "Investment breakdown and source chronology",
            "Interview day checklist and documents to carry",
            "Categorised interview question bank with answer frameworks",
            "Interview conduct rules and a 3-round mock interview plan",
            "Final review checklist",
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ color: T.goldLabel, fontSize: "11px", flexShrink: 0, marginTop: "2px" }}>→</span>
              <span style={{ fontSize: "12px", fontFamily: T.body, color: T.text, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Data requirements */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ fontFamily: T.heading, fontSize: "20px", fontWeight: 300, color: T.text, marginBottom: "6px" }}>
          To generate your dossier, we need your case data
        </div>
        <p style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, lineHeight: 1.65, marginBottom: "18px" }}>
          The dossier is built from the information you file in your case. Since your case file isn&apos;t
          complete yet, the dossier cannot generate a meaningful document. Complete the sections below,
          then return here to generate.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {DOSSIER_DATA_SOURCES.map((source) => (
            <a
              key={source.section}
              href={source.where}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "16px",
                alignItems: "center",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.01)",
                border: `1px solid ${T.border}`,
                textDecoration: "none",
              }}
            >
              <div>
                <div style={{ fontSize: "12px", fontFamily: T.body, color: T.text, fontWeight: 500, marginBottom: "2px" }}>
                  {source.section}
                </div>
                <div style={{ fontSize: "11px", fontFamily: T.body, color: T.textMuted, lineHeight: 1.4 }}>
                  {source.what}
                </div>
              </div>
              <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                <div style={{ fontSize: "9px", letterSpacing: "0.06em", textTransform: "uppercase" as const, color: T.goldLabel, fontFamily: T.body, marginBottom: "2px" }}>
                  {source.step}
                </div>
                <span style={{ fontSize: "11px", color: T.goldLabel, fontFamily: T.body }}>Fill in →</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* Alternative path */}
      <div
        style={{
          border: `1px solid rgba(201,168,76,0.12)`,
          padding: "22px 24px",
          background: "rgba(201,168,76,0.02)",
          marginBottom: "24px",
        }}
      >
        <div style={{ fontFamily: T.heading, fontSize: "18px", fontWeight: 300, color: T.text, marginBottom: "8px" }}>
          Already have your documents prepared?
        </div>
        <p style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, lineHeight: 1.65, marginBottom: "18px" }}>
          If your business plan, investment breakdown, or source of funds statement already exists as a file,
          upload it and the system will extract the relevant data. This works best for text-based documents —
          not scanned images. Extracted data pre-fills your case file so you do not need to re-enter it manually.
        </p>

        {/* Accepted formats */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ ...eyebrow, marginBottom: "8px" }}>Accepted formats</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
            {["PDF (text-based)", "DOCX", "DOC", "TXT"].map((fmt) => (
              <span key={fmt} style={{
                fontSize: "10px",
                fontFamily: T.body,
                color: T.text,
                border: `1px solid rgba(201,168,76,0.2)`,
                padding: "3px 10px",
                letterSpacing: "0.04em",
              }}>{fmt}</span>
            ))}
          </div>
        </div>

        {/* What extracts well */}
        <div style={{ marginBottom: "18px" }}>
          <div style={{ ...eyebrow, marginBottom: "8px" }}>Documents that extract reliably</div>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: "5px" }}>
            {[
              "Business plan or executive summary",
              "Investment breakdown / use of funds schedule",
              "Source of funds statement or bank records (text PDF)",
              "Franchise Disclosure Document (FDD)",
              "Lease agreement or letter of intent",
            ].map((doc, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ color: T.green, fontSize: "11px", flexShrink: 0, marginTop: "1px" }}>✓</span>
                <span style={{ fontSize: "12px", fontFamily: T.body, color: T.textDim, lineHeight: 1.4 }}>{doc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Limitation note */}
        <div style={{
          padding: "10px 14px",
          border: "1px solid rgba(184,115,51,0.2)",
          background: "rgba(184,115,51,0.04)",
          marginBottom: "18px",
          fontSize: "11px",
          fontFamily: T.body,
          color: "rgba(184,115,51,0.9)",
          lineHeight: 1.55,
        }}>
          <strong style={{ fontWeight: 600 }}>Note:</strong> Scanned documents (image-only PDFs, photos of bank statements)
          cannot be extracted automatically. Convert them to text-searchable PDFs before uploading,
          or enter the information manually using the case file links above.
        </div>

        <a
          href="/apply/upload"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            background: "transparent",
            border: `1px solid rgba(201,168,76,0.3)`,
            color: T.goldLabel,
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            fontFamily: T.body,
            textDecoration: "none",
          }}
        >
          Upload your documents →
        </a>
      </div>

      <a
        href="/dashboard"
        style={{ fontSize: "12px", fontFamily: T.body, color: T.textMuted, textDecoration: "none" }}
      >
        ← Back to Dashboard
      </a>
    </div>
  );
}

// Real generation runs one LLM call over an 11-section prompt with a 240s
// budget — observed wall-clock time is 2-5 minutes, not the 30-90s the UI
// used to claim. These stages mirror the actual server-side steps (data
// assembly, then a single long drafting call) so the copy stays honest
// rather than inventing granular progress we can't actually observe.
const GENERATION_STAGES: { at: number; text: string }[] = [
  { at: 0, text: "Pulling your case file, documents, and simulator history…" },
  { at: 12, text: "Cross-checking your investment, business, and family data…" },
  { at: 30, text: "Reviewing gap analysis and officer risk areas for your profile…" },
  { at: 50, text: "Drafting your personalised interview dossier…" },
  { at: 150, text: "Still writing — this dossier covers 11 sections, so it takes a few minutes…" },
  { at: 240, text: "Finalising formatting and double-checking your numbers…" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrepKitPage() {
  const [kit, setKit] = useState<PrepKit | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notEntitled, setNotEntitled] = useState(false);
  const [requirements, setRequirements] = useState<{ met: boolean; missing: string[] } | null>(null);

  const fetchCached = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulator/prep-kit");
      if (res.status === 403) {
        setNotEntitled(true);
        return;
      }
      const data = await res.json() as { kit: PrepKit | null; generated_at: string | null; requirements?: { met: boolean; missing: string[] } };
      setKit(data.kit);
      setGeneratedAt(data.generated_at);
      if (data.requirements) setRequirements(data.requirements);
    } catch {
      // no cached kit
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async (force = false) => {
    setGenerating(true);
    setElapsedSec(0);
    setError(null);
    try {
      const res = await fetch("/api/simulator/prep-kit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const data = await res.json() as { kit?: PrepKit; error?: string; generated_at?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Generation failed");
      setKit(data.kit ?? null);
      setGeneratedAt(data.generated_at ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate dossier");
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    fetchCached();
  }, [fetchCached]);

  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [generating]);

  const currentStage = [...GENERATION_STAGES].reverse().find((s) => elapsedSec >= s.at) ?? GENERATION_STAGES[0];

  // During the initial fetch, show nothing — avoids flashing the generate button
  // before we know whether the user is entitled or requirements are met.
  if (loading && !kit) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "12px", fontFamily: T.body, color: T.textMuted, letterSpacing: "0.06em" }}>
          Loading…
        </div>
      </div>
    );
  }

  if (notEntitled) return <PrepKitUpsell />;

  const daysOld = generatedAt
    ? Math.floor((Date.now() - new Date(generatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // ── Print CSS injected once ────────────────────────────────────────────────
  const printStyle = `
    @media print {
      body { background: white !important; color: black !important; }
      .no-print { display: none !important; }
      .print-section { page-break-inside: avoid; }
      * { color: black !important; border-color: #ccc !important; background: white !important; }
      a { display: none !important; }
    }
  `;

  return (
    <>
      <style>{printStyle}</style>
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          padding: "32px 24px 60px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div className="no-print" style={{ marginBottom: "32px" }}>
          <div style={{ ...eyebrow, marginBottom: "6px" }}>Interview Preparation Kit</div>
          <div style={{ fontFamily: T.heading, fontSize: "32px", fontWeight: 300, color: T.text, lineHeight: 1.1, marginBottom: "6px" }}>
            Interview Case Dossier
          </div>
          <div style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, lineHeight: 1.5, maxWidth: "600px" }}>
            Your personalised revision document — everything you need to know cold before you walk in.
            Built from your submitted case data and tested against the 15 E-2 denial factors.
          </div>
        </div>

        {/* Status + actions */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 18px",
            border: `1px solid ${T.border}`,
            background: T.surface,
            marginBottom: "24px",
          }}
        >
          <div>
            {generatedAt ? (
              <div style={{ fontSize: "12px", fontFamily: T.body, color: T.textDim }}>
                Generated {daysOld === 0 ? "today" : `${daysOld} day${daysOld !== 1 ? "s" : ""} ago`}
                {daysOld !== null && daysOld >= 6 && (
                  <span style={{ color: T.amber, marginLeft: "8px" }}>· Case data may have changed</span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "12px", fontFamily: T.body, color: T.textMuted }}>No dossier generated yet</div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            {kit && (
              <button
                onClick={() => window.print()}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  color: T.textDim,
                  fontFamily: T.body,
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                Print / Save as PDF
              </button>
            )}
            <button
              onClick={() => generate(Boolean(kit))}
              disabled={generating || (!kit && requirements !== null && !requirements.met)}
              title={!kit && requirements && !requirements.met ? "Complete the required steps below before generating" : undefined}
              style={{
                padding: "8px 18px",
                background: generating || (!kit && requirements !== null && !requirements.met)
                  ? "rgba(201,168,76,0.1)"
                  : T.gold,
                border: `1px solid ${T.gold}`,
                color: generating || (!kit && requirements !== null && !requirements.met) ? T.goldLabel : "#0a0a0a",
                fontFamily: T.body,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: generating || (!kit && requirements !== null && !requirements.met) ? "not-allowed" : "pointer",
                opacity: generating || (!kit && requirements !== null && !requirements.met) ? 0.5 : 1,
              }}
            >
              {generating ? "Generating…" : kit ? "Regenerate" : "Generate my dossier"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: "12px 16px",
              border: "1px solid rgba(192,82,82,0.3)",
              background: "rgba(192,82,82,0.06)",
              color: "#E07070",
              fontSize: "13px",
              fontFamily: T.body,
              marginBottom: "20px",
            }}
          >
            {error} — please try again or contact support if this persists.
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: T.textMuted, fontFamily: T.body, fontSize: "13px" }}>
            Checking for cached dossier…
          </div>
        )}

        {/* Generating */}
        {generating && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "60px 0",
              gap: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "2px",
                background: T.goldDim,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: "-100%",
                  width: "60%",
                  height: "100%",
                  background: T.gold,
                  animation: "slide 1.4s ease-in-out infinite",
                }}
              />
            </div>
            <style>{`@keyframes slide { 0% { left: -60% } 100% { left: 160% } }`}</style>
            <div style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, textAlign: "center", maxWidth: "420px" }}>
              {currentStage.text}
            </div>
            <div style={{ fontSize: "11px", fontFamily: T.body, color: T.textMuted }}>
              This usually takes 2–5 minutes — please keep this tab open
            </div>
          </div>
        )}

        {/* Dossier */}
        {!loading && !generating && kit && (
          <>
            {/* Print header — only visible when printing */}
            <div style={{ display: "none" }} className="print-header">
              <div style={{ fontFamily: T.heading, fontSize: "28px", marginBottom: "4px" }}>
                E-2 Interview Case Dossier
              </div>
              <div style={{ fontSize: "12px", marginBottom: "24px" }}>
                {kit.clientName} · {kit.businessName} · Generated {kit.generatedDate}
              </div>
            </div>
            <style>{`.print-header { display: none } @media print { .print-header { display: block !important } }`}</style>

            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {kit.persona && (
                <Section number="00" title={kit.persona.title} subtitle={kit.persona.subtitle} defaultOpen>
                  <Persona data={kit.persona} />
                </Section>
              )}
              <Section number="01" title={kit.section1.title} subtitle={kit.section1.subtitle} defaultOpen>
                <Section1 data={kit.section1} />
              </Section>
              <Section number="02" title={kit.section2.title} subtitle={kit.section2.subtitle} defaultOpen>
                <Section2 data={kit.section2} />
              </Section>
              <Section number="03" title={kit.section3.title} subtitle={kit.section3.subtitle} defaultOpen>
                <Section3 data={kit.section3} />
              </Section>
              <Section number="04" title={kit.section4.title} subtitle={kit.section4.subtitle}>
                <Section4 data={kit.section4} />
              </Section>
              <Section number="05" title={kit.section5.title} subtitle={kit.section5.subtitle}>
                <Section5 data={kit.section5} />
              </Section>
              <Section number="06" title={kit.section6.title} subtitle={kit.section6.subtitle}>
                <Section6 data={kit.section6} />
              </Section>
              <Section number="07" title={kit.section7.title} subtitle={kit.section7.subtitle}>
                <Section7 data={kit.section7} />
              </Section>
              {kit.section8 && (
                <Section number="08" title={kit.section8.title} subtitle={kit.section8.subtitle}>
                  <Section8 data={kit.section8} />
                </Section>
              )}
              {kit.section9 && (
                <Section number="09" title={kit.section9.title} subtitle={kit.section9.subtitle}>
                  <Section9 data={kit.section9} />
                </Section>
              )}
              {kit.section10 && (
                <Section number="10" title={kit.section10.title} subtitle={kit.section10.subtitle}>
                  <Section10 data={kit.section10} />
                </Section>
              )}
            </div>
          </>
        )}

        {/* Empty state — no kit, not loading, not generating */}
        {!loading && !generating && !kit && !error && (
          <div
            style={{
              border: `1px solid ${T.border}`,
              overflow: "hidden",
            }}
          >
            {/* Requirements gate — shown when not all modules are complete */}
            {requirements && !requirements.met ? (
              <div style={{ padding: "40px 32px" }}>
                <div style={{ fontFamily: T.heading, fontSize: "24px", fontWeight: 300, color: T.text, marginBottom: "10px" }}>
                  Complete your case file first
                </div>
                <div style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, lineHeight: 1.6, marginBottom: "24px" }}>
                  The dossier is built from your application data. To generate a meaningful document,
                  complete the steps below — the more you&apos;ve filed, the more precise your preparation will be.
                </div>
                <div style={{ marginBottom: "28px" }}>
                  <div style={{ fontSize: "9px", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: T.goldLabel, fontFamily: T.body, marginBottom: "12px" }}>
                    Required before generating
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" as const, gap: "1px" }}>
                    {requirements.missing.map((step, i) => (
                      <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", padding: "10px 14px", background: "rgba(248,113,113,0.04)", border: "1px solid rgba(248,113,113,0.15)" }}>
                        <span style={{ color: "#f87171", fontSize: "12px", flexShrink: 0, marginTop: "1px" }}>○</span>
                        <span style={{ fontSize: "13px", fontFamily: T.body, color: T.text, lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <a
                  href="/apply/story"
                  style={{
                    display: "inline-block",
                    padding: "12px 24px",
                    background: T.gold,
                    color: "#0a0a0a",
                    fontFamily: T.body,
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    textDecoration: "none",
                  }}
                >
                  Continue your case file →
                </a>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "80px 24px",
                  textAlign: "center",
                  gap: "12px",
                }}
              >
                <div style={{ fontFamily: T.heading, fontSize: "24px", fontWeight: 300, color: T.text }}>
                  Your dossier hasn&apos;t been generated yet
                </div>
                <div style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim, maxWidth: "440px", lineHeight: 1.6 }}>
                  Click Generate to build your personalised revision document. The more case data you&apos;ve added,
                  the richer the dossier will be.
                </div>
                <button
                  onClick={() => generate(false)}
                  style={{
                    marginTop: "12px",
                    padding: "12px 28px",
                    background: T.gold,
                    border: "none",
                    color: "#0a0a0a",
                    fontFamily: T.body,
                    fontSize: "12px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase" as const,
                    cursor: "pointer",
                  }}
                >
                  Generate my dossier
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
