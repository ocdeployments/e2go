"use client";
import { useState, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface KitFact { label: string; value: string }
interface Strength { heading: string; detail: string }
interface RiskItem { code: string; name: string; test: string; yourPosition: string; whatToSay: string; risk: "high" | "moderate" }
interface Breakdown { item: string; amount: string }
interface KeyDate { event: string; date: string }
interface InterviewQuestion { id: string; question: string; answerFramework: string; keyNumbers: string[]; pitfalls: string }
interface WpProbe { id: string; trigger: string; question: string; answerFramework: string }

interface PrepKit {
  clientName: string;
  businessName: string;
  generatedDate: string;
  section1: { title: string; subtitle: string; facts: KitFact[] };
  section2: { title: string; subtitle: string; strengths: Strength[] };
  section3: { title: string; subtitle: string; highRisk: RiskItem[]; moderateRisk: RiskItem[]; noIssues: string[] };
  section4: { title: string; subtitle: string; businessOverview: string; managementRole: string; staffingPlan: string; marketPosition: string };
  section5: { title: string; subtitle: string; totalInvested: string; breakdown: Breakdown[]; sourceChronology: string; committedAmount: string; fddNote?: string };
  section6: { title: string; subtitle: string; keyDates: KeyDate[]; simulatorFeedback: string; documentsToCarry: string; whatMayHaveChanged: string };
  section7: { title: string; subtitle: string; questions: InterviewQuestion[]; applicableProbes: WpProbe[] };
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <Label>What the officer checks</Label>
                  <Body style={{ fontSize: "12px", color: T.textDim }}>{r.test}</Body>
                </div>
                <div>
                  <Label>Where your case stands</Label>
                  <Body style={{ fontSize: "12px", color: T.textDim }}>{r.yourPosition}</Body>
                </div>
              </div>
              <Divider />
              <Label>What you need to be able to say</Label>
              <Body style={{ fontSize: "12px", color: T.text }}>{r.whatToSay}</Body>
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
          <Body style={{ fontSize: "12px", color: T.textDim }}>{data.sourceChronology}</Body>
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
        <Body style={{ fontSize: "12px", color: T.textDim }}>{data.documentsToCarry}</Body>
      </div>
      <div>
        <Label>What may have changed since you filed</Label>
        <Body style={{ fontSize: "12px", color: T.textDim }}>{data.whatMayHaveChanged}</Body>
      </div>
    </div>
  );
}

function Section7({ data }: { data: PrepKit["section7"] }) {
  return (
    <div style={{ paddingTop: "14px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {data.questions.map((q) => (
        <div key={q.id} style={{ border: `1px solid ${T.border}`, padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
            <span style={{ fontSize: "10px", fontFamily: T.body, color: T.goldLabel, fontWeight: 600, flexShrink: 0, paddingTop: "2px" }}>{q.id}</span>
            <div style={{ fontSize: "14px", fontFamily: T.heading, fontWeight: 300, color: T.text, lineHeight: 1.3 }}>{q.question}</div>
          </div>
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

// ── Upsell gate ───────────────────────────────────────────────────────────────
function PrepKitUpsell() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        padding: "60px 24px",
        maxWidth: "640px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div style={{ ...eyebrow, marginBottom: "16px" }}>Interview Preparation Kit</div>
      <div style={{ fontFamily: T.heading, fontSize: "32px", fontWeight: 300, color: T.text, lineHeight: 1.15, marginBottom: "14px" }}>
        Interview Case Dossier
      </div>
      <div style={{ fontSize: "14px", fontFamily: T.body, color: T.textDim, lineHeight: 1.65, maxWidth: "480px", marginBottom: "32px" }}>
        The Interview Case Dossier is bundled with the Interview Simulator module. It builds a personalised 7-section
        revision document from your case data, tested against all 15 E-2 denial factors — ready to print before you walk in.
      </div>
      <div
        style={{
          border: `1px solid rgba(201,168,76,0.2)`,
          background: "rgba(201,168,76,0.03)",
          padding: "24px 28px",
          marginBottom: "28px",
          textAlign: "left",
          width: "100%",
          maxWidth: "440px",
        }}
      >
        <div style={{ ...eyebrow, marginBottom: "12px" }}>What&apos;s included in the Simulator module</div>
        {[
          "3 unscripted AI consular officer sessions",
          "Interview Case Dossier — 7-section revision document",
          "Personalised answer frameworks for 9 universal questions",
          "Weak-point probes triggered by your lowest D-code scores",
          "Coaching report after each session",
          "Day-of checklist and documents-to-carry list",
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginBottom: "8px" }}>
            <span style={{ color: T.gold, flexShrink: 0, marginTop: "1px" }}>→</span>
            <span style={{ fontSize: "12px", fontFamily: T.body, color: T.text, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
      <a
        href="/simulator"
        style={{
          display: "inline-block",
          padding: "16px 36px",
          background: T.gold,
          color: T.bg,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          fontFamily: T.body,
          textDecoration: "none",
          textTransform: "uppercase",
        }}
      >
        Go to Interview Simulator →
      </a>
      <div style={{ marginTop: "14px", fontSize: "11px", fontFamily: T.body, color: T.textMuted }}>
        Included in all e2go Complete packages · Available as a standalone add-on
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PrepKitPage() {
  const [kit, setKit] = useState<PrepKit | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notEntitled, setNotEntitled] = useState(false);

  const fetchCached = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/simulator/prep-kit");
      if (res.status === 403) {
        setNotEntitled(true);
        return;
      }
      const data = await res.json() as { kit: PrepKit | null; generated_at: string | null };
      setKit(data.kit);
      setGeneratedAt(data.generated_at);
    } catch {
      // no cached kit
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async (force = false) => {
    setGenerating(true);
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
              disabled={generating}
              style={{
                padding: "8px 18px",
                background: generating ? "rgba(201,168,76,0.1)" : T.gold,
                border: `1px solid ${T.gold}`,
                color: generating ? T.goldLabel : "#0a0a0a",
                fontFamily: T.body,
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.7 : 1,
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
            <div style={{ fontSize: "13px", fontFamily: T.body, color: T.textDim }}>
              Analysing your case data and building your dossier…
            </div>
            <div style={{ fontSize: "11px", fontFamily: T.body, color: T.textMuted }}>
              This takes 30–90 seconds
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
            </div>
          </>
        )}

        {/* Empty state — no kit, not loading, not generating */}
        {!loading && !generating && !kit && !error && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "80px 24px",
              border: `1px solid ${T.border}`,
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
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Generate my dossier
            </button>
          </div>
        )}
      </div>
    </>
  );
}
