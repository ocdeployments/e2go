"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface SectionStep {
  id: string;
  label: string;
  href: string;
  done: boolean;
  sublabel?: string;
}

// ── Path routing ──────────────────────────────────────────────────────────────
// Maps step IDs to the pathname prefixes that activate them
const STEP_PATHS: Record<string, string[]> = {
  eligibility: ["/quiz", "/results"],
  onboarding:  ["/apply/module1"],
  business:    ["/apply/business", "/apply/module2", "/apply/qualifications", "/apply/family", "/apply/ties"],
  investment:  ["/apply/investment", "/apply/module3", "/apply/module4", "/apply/checklist", "/apply/calendar", "/apply/upload"],
  gap:         ["/gap-analysis"],
  generate:    ["/generate/", "/documents/"],
  interview:   ["/simulator"],
};

// Pages where CaseFileShell is present and provides its own navigation.
// On these pages, the SectionLayout sidebar hides itself completely.
const HIDE_SIDEBAR_PREFIXES = [
  "/apply/story",
  "/apply/business",
  "/apply/investment",
  "/apply/qualifications",
  "/apply/family",
  "/apply/ties",
  "/apply/module3",
  "/apply/module4",
  "/apply/upload",
  "/apply/module1",
  "/apply/module2",
  "/apply/checklist",
  "/apply/calendar",
  "/apply/overview",
];

function getActiveStepId(pathname: string): string | null {
  for (const [stepId, paths] of Object.entries(STEP_PATHS)) {
    if (paths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      return stepId;
    }
  }
  return null;
}

function shouldHideSidebar(pathname: string): boolean {
  return HIDE_SIDEBAR_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")
  );
}

// ── Task panel ─────────────────────────────────────────────────────────────────
interface TaskItem { label: string; hint: string }

const SECTION_TASKS: Record<string, { heading: string; tasks: TaskItem[] }> = {
  "/apply": {
    heading: "Application Checklist",
    tasks: [
      { label: "Complete all 6 case file sections", hint: "Business profile, investment, qualifications, family, ties" },
      { label: "Run Gap Analysis after Investment", hint: "Surfaces the top denial risks before document generation" },
      { label: "Generate your 15-document package", hint: "Sequential pipeline — all sections must be filled first" },
    ],
  },
  "/gap-analysis": {
    heading: "Gap Analysis Tasks",
    tasks: [
      { label: "Run the full analysis", hint: "Scores all 15 E-2 denial factors against your submitted data" },
      { label: "Fix the top 3 D-code findings", hint: "Upload evidence or complete the flagged case file sections" },
      { label: "Re-run to confirm improvement", hint: "Score updates immediately after every change" },
    ],
  },
  "/simulator": {
    heading: "Interview Preparation Tasks",
    tasks: [
      { label: "Complete the universal question track", hint: "9 UQ questions + applicable weak-point probes" },
      { label: "Generate your Interview Case Dossier", hint: "Revision document with all 15 D-code findings" },
      { label: "Review your coaching report", hint: "Personalised feedback from your last simulator session" },
    ],
  },
  "/simulator/prep-kit": {
    heading: "Dossier Tasks",
    tasks: [
      { label: "Generate your personalised dossier", hint: "Built from your case data, FDD intelligence, and market scores" },
      { label: "Review all 7 sections", hint: "Pay special attention to Section 03 (Denial Risk Register)" },
      { label: "Print or save as PDF for the interview", hint: "Use the Print button — brings all sections into one printable document" },
    ],
  },
};

function getTasksForPath(pathname: string) {
  // Exact match first, then prefix match
  for (const [key, val] of Object.entries(SECTION_TASKS)) {
    if (pathname === key || pathname.startsWith(key + "/") || pathname.startsWith(key + "?")) {
      // Don't show /simulator tasks on /simulator/prep-kit (more specific key takes priority)
      if (key === "/simulator" && pathname !== "/simulator") continue;
      return val;
    }
  }
  return null;
}

function TaskPanel({ heading, tasks }: { heading: string; tasks: TaskItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        borderBottom: `1px solid rgba(201,168,76,0.10)`,
        background: "rgba(201,168,76,0.025)",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 20px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "rgba(201,168,76,0.55)",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          >
            {heading}
          </span>
          <span
            style={{
              fontSize: "9px",
              fontFamily: "'DM Sans', sans-serif",
              color: "rgba(245,240,232,0.25)",
              background: "rgba(201,168,76,0.08)",
              border: "1px solid rgba(201,168,76,0.12)",
              padding: "1px 6px",
              letterSpacing: "0.06em",
            }}
          >
            {tasks.length} tasks
          </span>
        </div>
        <span
          style={{
            color: "rgba(201,168,76,0.4)",
            fontSize: "12px",
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div
          style={{
            padding: "4px 20px 12px",
            display: "flex",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {tasks.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: "160px", flex: "1 1 160px" }}>
              <span
                style={{
                  width: "14px",
                  height: "14px",
                  border: "1px solid rgba(201,168,76,0.25)",
                  flexShrink: 0,
                  marginTop: "2px",
                  display: "block",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "rgba(245,240,232,0.75)",
                    fontWeight: 500,
                    marginBottom: "2px",
                    lineHeight: 1.3,
                  }}
                >
                  {t.label}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: "'DM Sans', sans-serif",
                    color: "rgba(245,240,232,0.35)",
                    lineHeight: 1.4,
                  }}
                >
                  {t.hint}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  bg:       "#0a0a0a",
  rail:     "#080808",
  gold:     "#C9A84C",
  goldDim:  "rgba(201,168,76,0.12)",
  goldLow:  "rgba(201,168,76,0.06)",
  goldLabel:"rgba(201,168,76,0.55)",
  border:   "rgba(201,168,76,0.10)",
  text:     "#f5f0e8",
  textDim:  "rgba(245,240,232,0.45)",
  textMuted:"rgba(245,240,232,0.22)",
  green:    "#3B7D5E",
  heading:  "'Cormorant Garamond', Georgia, serif",
  body:     "'DM Sans', sans-serif",
};

// ── Step row ──────────────────────────────────────────────────────────────────
function StepRow({
  step,
  active,
  collapsed,
  onClick,
}: {
  step: SectionStep;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const statusColor = step.done ? T.green : active ? T.gold : T.textMuted;
  const icon = step.done ? "✓" : active ? "●" : "○";

  return (
    <Link
      href={step.href}
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: collapsed ? 0 : "10px",
        padding: collapsed ? "10px 0" : "9px 16px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? T.goldLow : "transparent",
        borderLeft: active ? `2px solid ${T.gold}` : "2px solid transparent",
        textDecoration: "none",
        transition: "background 0.12s",
        minHeight: "40px",
      }}
    >
      {/* Status icon */}
      <span
        style={{
          fontSize: step.done ? "11px" : "9px",
          color: statusColor,
          width: "16px",
          textAlign: "center",
          flexShrink: 0,
          fontWeight: step.done ? 700 : 400,
          lineHeight: 1,
        }}
      >
        {icon}
      </span>

      {/* Label + sublabel */}
      {!collapsed && (
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: "11px",
              fontFamily: T.body,
              color: active ? T.gold : step.done ? T.text : T.textDim,
              fontWeight: active ? 500 : 400,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {step.label}
          </div>
          {step.sublabel && (
            <div
              style={{
                fontSize: "9px",
                fontFamily: T.body,
                color: T.textMuted,
                marginTop: "1px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {step.sublabel}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}

// ── Mobile drawer ─────────────────────────────────────────────────────────────
function MobileDrawer({
  steps,
  activeStepId,
  open,
  onClose,
}: {
  steps: SectionStep[];
  activeStepId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.7)",
          zIndex: 200,
        }}
      />
      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "260px",
          background: T.rail,
          borderRight: `1px solid ${T.border}`,
          zIndex: 201,
          display: "flex",
          flexDirection: "column",
          paddingTop: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px 16px" }}>
          <div style={{ fontFamily: T.heading, fontSize: "16px", fontWeight: 300, color: T.text }}>
            Your Journey
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: T.textDim,
              fontSize: "18px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>
        <div style={{ height: "1px", background: T.border, marginBottom: "8px" }} />
        <div style={{ flex: 1, overflowY: "auto" }}>
          {steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              active={step.id === activeStepId}
              collapsed={false}
              onClick={onClose}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ── SectionLayout ─────────────────────────────────────────────────────────────
export default function SectionLayout({
  steps,
  children,
}: {
  steps: SectionStep[];
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const activeStepId = getActiveStepId(pathname);
  const hidden = shouldHideSidebar(pathname);
  const taskConfig = getTasksForPath(pathname);

  // If this page manages its own navigation (CaseFileShell pages), just render children
  if (hidden) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Mobile hamburger — shown at <1024px when sidebar would be present */}
      <button
        onClick={() => setMobileOpen(true)}
        className="section-menu-trigger"
        aria-label="Open journey navigation"
        style={{
          position: "fixed",
          top: "12px",
          left: "12px",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "8px",
          background: T.rail,
          border: `1px solid ${T.border}`,
          cursor: "pointer",
        }}
      >
        <span style={{ width: "16px", height: "1px", background: T.goldLabel, display: "block" }} />
        <span style={{ width: "16px", height: "1px", background: T.goldLabel, display: "block" }} />
        <span style={{ width: "16px", height: "1px", background: T.goldLabel, display: "block" }} />
      </button>

      <style>{`
        .section-menu-trigger { display: none; }
        @media (max-width: 1023px) { .section-menu-trigger { display: flex; } }
        .section-rail { display: flex; }
        @media (max-width: 1023px) { .section-rail { display: none; } }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Left rail — desktop only */}
        <nav
          className="section-rail"
          style={{
            width: "200px",
            flexShrink: 0,
            background: T.rail,
            borderRight: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            position: "sticky",
            top: 0,
            height: "100vh",
            overflowY: "auto",
          }}
        >
          {/* Rail header */}
          <div style={{ padding: "20px 16px 12px" }}>
            <div
              style={{
                fontSize: "9px",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: T.goldLabel,
                fontFamily: T.body,
                fontWeight: 500,
                marginBottom: "4px",
              }}
            >
              E-2 Journey
            </div>
            <div style={{ height: "1px", background: T.border }} />
          </div>

          {/* Steps */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", paddingBottom: "16px" }}>
            {steps.map((step, i) => (
              <div key={step.id}>
                <StepRow step={step} active={step.id === activeStepId} collapsed={false} />
                {/* Connector line between steps */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      width: "1px",
                      height: "8px",
                      background: step.done ? "rgba(59,125,94,0.3)" : T.border,
                      marginLeft: "24px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Rail footer */}
          <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
            <Link
              href="/dashboard"
              style={{
                fontSize: "10px",
                fontFamily: T.body,
                color: T.textMuted,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>←</span>
              <span>Dashboard</span>
            </Link>
          </div>
        </nav>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {taskConfig && <TaskPanel heading={taskConfig.heading} tasks={taskConfig.tasks} />}
          {children}
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        steps={steps}
        activeStepId={activeStepId}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
    </>
  );
}
