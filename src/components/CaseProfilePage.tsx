"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { CaseProfileResponse, CaseTheoryUI, DocumentExtractionUI } from "@/app/api/dashboard/case-profile/route";
import DocumentImportHub, { docTypeLabel } from "@/components/apply/DocumentImportHub";

// ── Design tokens ──────────────────────────────────────────────────────────────
const GOLD    = "#C9A84C";
const CREAM   = "#f5f0e8";
const GREEN   = "#5DCAA5";
const CARD_BG = "#111007";
const BORDER  = "rgba(201,168,76,0.13)";
const INNER   = "rgba(201,168,76,0.07)";

// ── Field status ───────────────────────────────────────────────────────────────
type Status = "have" | "module" | "needed" | "optional";

// ── Family member ──────────────────────────────────────────────────────────────
interface FamilyMemberUI {
  id: string;
  member_type: "co_investor" | "spouse" | "child";
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  gender: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_number: string | null;
  role: string | null;
  sort_order: number;
}

type MemberFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  role: string;
};

interface FieldDef {
  label: string;
  value?: string | null;
  status: Status;
  note: string;
  href?: string;
}

// ── Outcome vocabulary ─────────────────────────────────────────────────────────
const OUTCOME_MAP: Record<string, { label: string; color: string }> = {
  strong:               { label: "Strong — Eligible",                         color: GREEN },
  proceed:              { label: "Strong — Eligible",                         color: GREEN },
  borderline:           { label: "Borderline — Strengthen before filing",     color: GOLD },
  proceed_risk:         { label: "Eligible — strengthen key areas",           color: GOLD },
  caution:              { label: "Caution — Address concerns before filing",  color: "#fbbf24" },
  attorney_recommended: { label: "Complex — Legal guidance recommended",      color: "#fbbf24" },
  ineligible:           { label: "Ineligible — Consult an attorney",          color: "#f87171" },
};

const ARCHETYPE_LABEL: Record<string, string> = {
  buyer:          "Franchise Buyer",
  builder:        "Business Builder",
  career_switcher:"Career Switcher",
  investor:       "Capital Investor",
};

// ── Sidebar nav sections ───────────────────────────────────────────────────────
const NAV_SECTIONS = [
  { id: "investor",    num: "01", label: "The Investor" },
  { id: "business",    num: "02", label: "The Business" },
  { id: "investment",  num: "03", label: "The Investment" },
  { id: "intelligence",num: "04", label: "Case Intelligence" },
  { id: "interview",   num: "05", label: "Interview Readiness" },
  { id: "documents",   num: "06", label: "Documents" },
  { id: "resources",   num: "07", label: "Tools & Learn" },
];

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  return (
    <nav style={{
      position: "sticky",
      top: "88px",
      width: "160px",
      flexShrink: 0,
      alignSelf: "flex-start",
    }}>
      {/* Title */}
      <div style={{
        fontSize: "7px",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.3)",
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: "16px",
        paddingLeft: "12px",
      }}>
        Case Sections
      </div>

      {NAV_SECTIONS.map(({ id, num, label }) => {
        const isActive = active === id;
        return (
          <a
            key={id}
            href={`#${id}`}
            style={{
              display: "block",
              textDecoration: "none",
              padding: "9px 12px",
              borderLeft: `2px solid ${isActive ? "rgba(201,168,76,0.6)" : "rgba(245,240,232,0.05)"}`,
              marginBottom: "1px",
              background: isActive ? "rgba(201,168,76,0.04)" : "transparent",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              fontSize: "7px",
              letterSpacing: "0.14em",
              color: isActive ? "rgba(201,168,76,0.7)" : "rgba(245,240,232,0.2)",
              fontFamily: "'DM Sans', sans-serif",
              marginBottom: "2px",
              transition: "color 0.15s",
            }}>
              {num}
            </div>
            <div style={{
              fontSize: "11px",
              fontFamily: "'DM Sans', sans-serif",
              color: isActive ? CREAM : "rgba(245,240,232,0.32)",
              fontWeight: isActive ? 500 : 400,
              lineHeight: 1.35,
              transition: "color 0.15s",
            }}>
              {label}
            </div>
          </a>
        );
      })}

    </nav>
  );
}

// ── Dot indicator ──────────────────────────────────────────────────────────────
function Dot({ status }: { status: Status }) {
  const cfg: Record<Status, { fill: string; border: string }> = {
    have:     { fill: GREEN,            border: GREEN },
    module:   { fill: "transparent",    border: "rgba(201,168,76,0.5)" },
    needed:   { fill: "transparent",    border: "rgba(248,113,113,0.6)" },
    optional: { fill: "transparent",    border: "rgba(245,240,232,0.2)" },
  };
  const { fill, border } = cfg[status];
  return (
    <span style={{
      display: "inline-block",
      width: "5px", height: "5px",
      borderRadius: "50%",
      background: fill,
      border: `1.5px solid ${border}`,
      flexShrink: 0,
      marginTop: "5px",
    }} />
  );
}

// ── Field row ──────────────────────────────────────────────────────────────────
function FieldRow({ label, value, status, note, href }: FieldDef) {
  const textColor: Record<Status, string> = {
    have:     CREAM,
    module:   "rgba(245,240,232,0.28)",
    needed:   "rgba(248,113,113,0.5)",
    optional: "rgba(245,240,232,0.2)",
  };
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: "10px",
      padding: "7px 0",
      borderBottom: `1px solid ${INNER}`,
    }}>
      <Dot status={status} />
      <span style={{
        fontSize: "11px",
        fontFamily: "'DM Sans', sans-serif",
        color: "rgba(245,240,232,0.38)",
        minWidth: "148px",
        flexShrink: 0,
        lineHeight: 1.6,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "12px",
        fontFamily: "'DM Sans', sans-serif",
        color: textColor[status],
        fontStyle: (status === "have" || !note) ? "normal" : "italic",
        flex: 1,
        lineHeight: 1.6,
      }}>
        {status === "have" && value ? value : note}
        {status === "module" && href && (
          <Link href={href} style={{
            marginLeft: "8px",
            color: "rgba(201,168,76,0.38)",
            fontSize: "10px",
            fontStyle: "normal",
            textDecoration: "none",
          }}>→</Link>
        )}
      </span>
      {status === "needed" && (
        <span style={{
          fontSize: "7px",
          fontFamily: "'DM Sans', sans-serif",
          letterSpacing: "0.12em",
          color: "rgba(248,113,113,0.55)",
          border: "1px solid rgba(248,113,113,0.2)",
          padding: "2px 5px",
          flexShrink: 0,
          alignSelf: "center",
        }}>
          REQUIRED
        </span>
      )}
    </div>
  );
}

// ── Subsection ─────────────────────────────────────────────────────────────────
function Sub({ title, fields }: { title: string; fields: FieldDef[] }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        fontSize: "8px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "rgba(201,168,76,0.38)",
        fontFamily: "'DM Sans', sans-serif",
        fontWeight: 600,
        marginBottom: "4px",
        paddingBottom: "4px",
        borderBottom: `1px solid ${INNER}`,
      }}>
        {title}
      </div>
      {fields.map((f, i) => <FieldRow key={i} {...f} />)}
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────
function SectionCard({
  id,
  number,
  title,
  description,
  haveCount,
  totalCount,
  ctaLabel,
  ctaHref,
  children,
}: {
  id: string;
  number: string;
  title: string;
  description: string;
  haveCount: number;
  totalCount: number;
  ctaLabel?: string;
  ctaHref?: string;
  children: React.ReactNode;
}) {
  const pct = totalCount > 0 ? Math.round((haveCount / totalCount) * 100) : 0;
  const barColor = pct >= 75 ? GREEN : pct >= 30 ? GOLD : "rgba(248,113,113,0.6)";

  return (
    <div id={id} style={{ background: CARD_BG, border: `1px solid ${BORDER}`, marginBottom: "12px" }}>
      {/* Header */}
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: `1px solid ${BORDER}`,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: "8px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "rgba(201,168,76,0.4)",
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: "4px",
          }}>
            {number}
          </div>
          <div style={{
            fontSize: "20px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            color: CREAM,
            letterSpacing: "0.01em",
            lineHeight: 1.2,
          }}>
            {title}
          </div>
          <div style={{
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.32)",
            marginTop: "4px",
          }}>
            {description}
          </div>
        </div>

        {/* Completion counter */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{
            fontSize: "18px",
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            color: haveCount > 0 ? GOLD : "rgba(245,240,232,0.2)",
          }}>
            {haveCount}<span style={{ fontSize: "12px", color: "rgba(245,240,232,0.25)" }}>/{totalCount}</span>
          </div>
          <div style={{
            width: "60px",
            height: "2px",
            background: "rgba(245,240,232,0.06)",
            marginTop: "4px",
            marginLeft: "auto",
          }}>
            <div style={{ height: "100%", width: `${pct}%`, background: barColor, transition: "width 0.5s ease" }} />
          </div>
          <div style={{
            fontSize: "9px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.2)",
            marginTop: "3px",
          }}>
            fields collected
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 4px" }}>
        {children}
      </div>

      {/* CTA footer */}
      {ctaLabel && ctaHref && (
        <div style={{ padding: "16px 24px", borderTop: `1px solid ${INNER}` }}>
          <Link href={ctaHref} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            border: `1px solid rgba(201,168,76,0.55)`,
            background: "rgba(201,168,76,0.05)",
            fontSize: "11px",
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            color: GOLD,
            textDecoration: "none",
          }}>
            {ctaLabel} →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Score bar ──────────────────────────────────────────────────────────────────
// ── Extraction transparency — show the client exactly what we pulled from
// their documents and where it goes, so nothing feels like a black box ──────
const EXTRACTION_STATUS_UI: Record<DocumentExtractionUI["extractionStatus"], { label: string; color: string }> = {
  pending:    { label: "Queued",      color: "rgba(245,240,232,0.35)" },
  processing: { label: "Extracting…", color: GOLD },
  complete:   { label: "Extracted",   color: GREEN },
  failed:     { label: "Failed",      color: "#f87171" },
};

const EXTRACTION_DESTINATIONS = [
  { label: "Case Strategy",              detail: "AI reasoning that builds your narrative and denial-risk defense" },
  { label: "Document Generation",        detail: "Cover letters, business plans, and supporting filings" },
  { label: "Gap & Denial-Risk Analysis", detail: "Evidence scoring across every denial risk factor" },
  { label: "Interview Simulator",        detail: "Prep questions grounded in your actual case file" },
];

function ExtractionTransparencyPanel({ documents }: { documents: DocumentExtractionUI[] }) {
  if (documents.length === 0) return null;
  return (
    <div style={{ marginBottom: "28px", padding: "18px 20px", background: CARD_BG, border: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>
        What We&rsquo;ve Extracted From Your Documents
      </div>

      <div style={{ marginBottom: "16px" }}>
        {documents.map(doc => {
          const status = EXTRACTION_STATUS_UI[doc.extractionStatus];
          return (
            <div key={doc.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: `1px solid ${INNER}`, marginBottom: "6px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "11.5px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {doc.fileName}
                </div>
                <div style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.45)", marginTop: "2px" }}>
                  {docTypeLabel(doc.docType)}
                  {doc.extractionStatus === "complete" && doc.fieldsTotal > 0 && (
                    <span> &middot; {doc.fieldsTotal} data point{doc.fieldsTotal !== 1 ? "s" : ""} extracted</span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: "9px", letterSpacing: "0.08em", textTransform: "uppercase", color: status.color, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, flexShrink: 0 }}>
                {status.label}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.38)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: "8px" }}>
        Where This Data Goes
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px", marginBottom: "10px" }}>
        {EXTRACTION_DESTINATIONS.map(d => (
          <div key={d.label} style={{ padding: "8px 10px", background: "rgba(0,0,0,0.2)", border: `1px solid ${INNER}` }}>
            <div style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: GOLD, fontWeight: 600, marginBottom: "2px" }}>
              {d.label}
            </div>
            <div style={{ fontSize: "9.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.42)", lineHeight: 1.5 }}>
              {d.detail}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.32)", lineHeight: 1.6, fontStyle: "italic" }}>
        Each document is parsed once. You never need to re-upload the same document for a different part of your case.
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const color = score == null ? "rgba(245,240,232,0.1)"
    : score >= 75 ? GREEN
    : score >= 50 ? GOLD
    : "#f87171";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.45)" }}>{label}</span>
        <span style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color, fontWeight: 600 }}>
          {score != null ? `${score}%` : "—"}
        </span>
      </div>
      <div style={{ height: "2px", background: "rgba(245,240,232,0.06)" }}>
        <div style={{ height: "100%", width: `${score ?? 0}%`, background: color, transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

// ── Case Theory (CIC-1.3 — read-only reasoning output) ──────────────────────────
const DIMENSION_LABEL: Record<string, string> = {
  identity: "Identity", source_of_funds: "Source of Funds", investment: "Investment",
  business: "Business", location: "Location", franchise: "Franchise",
  operations: "Operations", background: "Background", other: "Other",
};

const VERDICT_STATUS: Record<string, { label: string; color: string }> = {
  proven:        { label: "Proven",        color: GREEN },
  weak:          { label: "Weak",          color: GOLD },
  missing:       { label: "Missing",       color: "#f87171" },
  contradicted:  { label: "Contradicted",  color: "#fb7185" },
};

function CaseTheoryBlock({ theory }: { theory: CaseTheoryUI }) {
  const verdictEntries = Object.entries(theory.dimensionVerdicts);
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.4)", fontFamily: "'DM Sans', sans-serif", marginBottom: "10px" }}>
        Case Theory — AI Strategic Analysis
      </div>

      <div style={{ padding: "16px", background: "rgba(0,0,0,0.3)", border: `1px solid ${INNER}`, marginBottom: "16px" }}>
        <p style={{ fontSize: "12.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.65)", lineHeight: 1.7, margin: 0 }}>
          {theory.narrative}
        </p>
      </div>

      {theory.numbersStrategy.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.38)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: "8px" }}>
            Numbers Strategy
          </div>
          {theory.numbersStrategy.map((n, i) => (
            <div key={i} style={{ padding: "10px 12px", background: "rgba(0,0,0,0.2)", border: `1px solid ${INNER}`, marginBottom: "6px" }}>
              <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 600, marginBottom: "3px" }}>
                {n.figure}: <span style={{ color: GOLD }}>{n.value}</span>
              </div>
              <div style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.45)", lineHeight: 1.5 }}>
                {n.foregroundBecause}
              </div>
              {n.denialRiskAddressed && (
                <div style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(248,113,113,0.5)", marginTop: "3px", fontStyle: "italic" }}>
                  Rebuts: {n.denialRiskAddressed}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {theory.transferableSkills.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.38)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: "8px" }}>
            Transferable Skills
          </div>
          {theory.transferableSkills.map((s, i) => (
            <div key={i} style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 600 }}>{s.skill}</div>
              <div style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.45)", lineHeight: 1.5 }}>{s.framing}</div>
            </div>
          ))}
        </div>
      )}

      {verdictEntries.length > 0 && (
        <div>
          <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.38)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: "8px" }}>
            Per-Dimension Verdicts &amp; Gap-Fill Suggestions
          </div>
          {verdictEntries.map(([dim, v]) => {
            const statusInfo = VERDICT_STATUS[v.status] ?? VERDICT_STATUS.weak;
            return (
              <div key={dim} style={{ padding: "12px 14px", background: "rgba(0,0,0,0.2)", border: `1px solid ${INNER}`, marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11.5px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 600 }}>
                    {DIMENSION_LABEL[dim] ?? dim}
                  </span>
                  <span style={{
                    fontSize: "8px", letterSpacing: "0.1em", textTransform: "uppercase",
                    color: statusInfo.color, border: `1px solid ${statusInfo.color}33`, padding: "2px 7px",
                    fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                  }}>
                    {statusInfo.label}
                  </span>
                </div>
                {v.evidenceSummary && (
                  <p style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.5)", lineHeight: 1.6, margin: "0 0 6px" }}>
                    {v.evidenceSummary}
                  </p>
                )}
                {v.gap && (
                  <p style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(248,113,113,0.6)", lineHeight: 1.6, margin: "0 0 8px", fontStyle: "italic" }}>
                    Gap: {v.gap}
                  </p>
                )}
                {v.gapFillSuggestions?.length > 0 && (
                  <div style={{ marginTop: "6px", paddingTop: "8px", borderTop: `1px solid ${INNER}` }}>
                    {v.gapFillSuggestions.map((g, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", alignItems: "baseline" }}>
                        <span style={{ fontSize: "8px", letterSpacing: "0.06em", color: "rgba(201,168,76,0.45)", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", textTransform: "uppercase" }}>
                          {g.persona}
                        </span>
                        <span style={{ fontSize: "10.5px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.55)", lineHeight: 1.5 }}>
                          {g.suggestion}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {theory.builtAt && (
        <div style={{ fontSize: "9px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.2)", marginTop: "10px" }}>
          Analysis generated {new Date(theory.builtAt).toLocaleDateString()}
          {theory.doctrineCitations.length > 0 ? ` · grounded in ${theory.doctrineCitations.length} doctrine source${theory.doctrineCitations.length === 1 ? "" : "s"}` : ""}
        </div>
      )}
    </div>
  );
}

// ── Milestone ──────────────────────────────────────────────────────────────────
function Milestone({ label, done, active, href }: { label: string; done: boolean; active?: boolean; href: string }) {
  return (
    <Link href={done ? "#" : href} style={{ textDecoration: "none", pointerEvents: done ? "none" : "auto" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        opacity: done ? 0.5 : active ? 1 : 0.42,
      }}>
        <div style={{
          width: "10px", height: "10px",
          borderRadius: "50%",
          background: done ? GREEN : active ? GOLD : "rgba(245,240,232,0.12)",
          border: done ? "none" : active ? `2px solid ${GOLD}` : "1.5px solid rgba(245,240,232,0.2)",
          boxShadow: active ? "0 0 8px rgba(201,168,76,0.5)" : "none",
        }} />
        <span style={{
          fontSize: "9px",
          fontFamily: "'DM Sans', sans-serif",
          color: done ? "rgba(93,202,165,0.7)" : active ? CREAM : "rgba(245,240,232,0.35)",
          textAlign: "center",
          textDecoration: done ? "line-through" : "none",
          maxWidth: "76px",
          lineHeight: 1.4,
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
}

// ── Main page component ────────────────────────────────────────────────────────

export default function CaseProfilePage() {
  const [data, setData]         = useState<CaseProfileResponse | null>(null);
  const [loading, setLoading]   = useState(true);
  const [activeSection, setActiveSection] = useState("investor");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Family / name edit state
  const [members, setMembers]               = useState<FamilyMemberUI[]>([]);
  const [nameEditOpen, setNameEditOpen]     = useState(false);
  const [nameForm, setNameForm]             = useState({ firstName: "", middleName: "", lastName: "" });
  const [nameSaving, setNameSaving]         = useState(false);
  const [nameError, setNameError]           = useState<string | null>(null);
  const [editingMemberId, setEditingMemberId]   = useState<string | null>(null);
  const [addingMemberType, setAddingMemberType] = useState<FamilyMemberUI["member_type"] | null>(null);
  const emptyMemberForm: MemberFormState = { first_name: "", middle_name: "", last_name: "", gender: "", date_of_birth: "", nationality: "", passport_number: "", role: "" };
  const [memberForm, setMemberForm]         = useState<MemberFormState>(emptyMemberForm);
  const [memberSaving, setMemberSaving]     = useState(false);
  const [isMobile, setIsMobile]             = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const reloadProfile = useCallback(() => {
    Promise.all([
      fetch("/api/dashboard/case-profile").then(r => r.json()),
      fetch("/api/profile/family-members").then(r => r.json()),
    ])
      .then(([profile, fam]) => {
        setData(profile);
        setMembers(fam.members ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { reloadProfile(); }, [reloadProfile]);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!data) return;
    observerRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -75% 0px", threshold: 0 }
    );

    NAV_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    observerRef.current = observer;
    return () => observer.disconnect();
  }, [data]);

  // ── Name save ────────────────────────────────────────────────────────────────
  async function handleSaveName() {
    if (!nameForm.firstName.trim() || !nameForm.lastName.trim()) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const res = await fetch("/api/profile/name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: nameForm.firstName.trim(), middleName: nameForm.middleName.trim() || null, lastName: nameForm.lastName.trim() }),
      });
      if (res.ok) {
        const updated = await res.json() as { firstName: string; middleName: string | null; lastName: string };
        setData(d => d ? { ...d, firstName: updated.firstName, middleName: updated.middleName, lastName: updated.lastName } : d);
        setNameEditOpen(false);
      } else {
        setNameError("Could not save — please try again.");
      }
    } catch {
      setNameError("Network error — please try again.");
    }
    setNameSaving(false);
  }

  // ── Member save / delete ─────────────────────────────────────────────────────
  async function handleSaveMember() {
    const isEdit = editingMemberId !== null;
    const memberType = isEdit ? members.find(m => m.id === editingMemberId)?.member_type : addingMemberType;
    if (!memberType) return;
    setMemberSaving(true);
    try {
      const url = isEdit ? `/api/profile/family-members/${editingMemberId}` : "/api/profile/family-members";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { first_name: memberForm.first_name || null, middle_name: memberForm.middle_name || null, last_name: memberForm.last_name || null, gender: memberForm.gender || null, date_of_birth: memberForm.date_of_birth || null, nationality: memberForm.nationality || null, passport_number: memberForm.passport_number || null, role: memberForm.role || null }
        : { member_type: memberType, first_name: memberForm.first_name || null, middle_name: memberForm.middle_name || null, last_name: memberForm.last_name || null, gender: memberForm.gender || null, date_of_birth: memberForm.date_of_birth || null, nationality: memberForm.nationality || null, passport_number: memberForm.passport_number || null, role: memberForm.role || null, sort_order: members.filter(m => m.member_type === memberType).length };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const json = await res.json() as { member: FamilyMemberUI };
        if (isEdit) {
          setMembers(ms => ms.map(m => m.id === editingMemberId ? json.member : m));
        } else {
          setMembers(ms => [...ms, json.member]);
        }
        setEditingMemberId(null);
        setAddingMemberType(null);
        setMemberForm(emptyMemberForm);
      }
    } catch { /* noop */ }
    setMemberSaving(false);
  }

  async function handleDeleteMember(id: string) {
    await fetch(`/api/profile/family-members/${id}`, { method: "DELETE" });
    setMembers(ms => ms.filter(m => m.id !== id));
    if (editingMemberId === id) { setEditingMemberId(null); setMemberForm(emptyMemberForm); }
  }

  function openEditMember(m: FamilyMemberUI) {
    setEditingMemberId(m.id);
    setAddingMemberType(null);
    setMemberForm({ first_name: m.first_name ?? "", middle_name: m.middle_name ?? "", last_name: m.last_name ?? "", gender: m.gender ?? "", date_of_birth: m.date_of_birth ?? "", nationality: m.nationality ?? "", passport_number: m.passport_number ?? "", role: m.role ?? "" });
  }

  function openAddMember(type: FamilyMemberUI["member_type"]) {
    setAddingMemberType(type);
    setEditingMemberId(null);
    setMemberForm(emptyMemberForm);
  }

  function cancelMemberForm() {
    setEditingMemberId(null);
    setAddingMemberType(null);
    setMemberForm(emptyMemberForm);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", letterSpacing: "0.12em", color: "rgba(201,168,76,0.4)", fontFamily: "'DM Sans', sans-serif" }}>
          Loading case file…
        </span>
      </div>
    );
  }

  if (!data) return null;

  // ── Derived state ────────────────────────────────────────────────────────────
  const quizDone      = Boolean(data.quizCompletedAt);
  const m1Done        = Boolean(data.module1CompletedAt);
  const m2Done        = Boolean(data.module2CompletedAt);
  const m3Done        = Boolean(data.module3CompletedAt);
  const m4Done        = Boolean(data.module4CompletedAt);
  const m5Done        = Boolean(data.module5CompletedAt);
  const gapDone       = data.completenessScore != null;
  const simDone       = Boolean(data.lastSimSessionNumber);
  const isFranchise   = /franchise|franchis/i.test(data.businessType ?? "");
  const fullName      = [data.firstName, data.lastName].filter(Boolean).join(" ") || null;
  const archetypeLabel = data.archetype ? (ARCHETYPE_LABEL[data.archetype] ?? data.archetype) : null;
  const outcome       = data.quizOutcome ? (OUTCOME_MAP[data.quizOutcome.toLowerCase()] ?? null) : null;
  const quizAnswers   = data.quizAnswers ?? {};

  // Partnership / family derivation
  const isPartnership = data.applicationTypeRaw === "partnership" || data.applicationTypeRaw === "spousal_partnership";
  const hasSpouse     = data.dependents === "spouse_only" || data.dependents === "spouse_and_children";
  const hasChildren   = data.dependents === "children_only" || data.dependents === "spouse_and_children";

  // Member helpers
  const coInvestors = members.filter(m => m.member_type === "co_investor");
  const spouseList  = members.filter(m => m.member_type === "spouse");
  const childList   = members.filter(m => m.member_type === "child");

  // ── Inline name edit form ──────────────────────────────────────────────────
  const NameEditForm = nameEditOpen ? (
    <div style={{ marginTop: "16px", padding: "16px", background: "rgba(201,168,76,0.04)", border: `1px solid rgba(201,168,76,0.2)` }}>
      <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>Edit Name</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "10px" }}>
        {[
          { label: "First Name *", key: "firstName" as const },
          { label: "Middle Name", key: "middleName" as const },
          { label: "Last Name *",  key: "lastName" as const },
        ].map(({ label, key }) => (
          <div key={key}>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }}>{label}</div>
            <input
              type="text"
              value={nameForm[key]}
              onChange={e => setNameForm(f => ({ ...f, [key]: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "7px 10px", fontSize: "12px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}
            />
          </div>
        ))}
      </div>
      {nameError && <div style={{ fontSize: "11px", color: "#f87171", fontFamily: "'DM Sans', sans-serif", marginBottom: "8px" }}>{nameError}</div>}
      <div style={{ display: "flex", gap: "8px" }}>
        <button onClick={handleSaveName} disabled={nameSaving} style={{ padding: "8px 18px", background: GOLD, color: "#0a0a0a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", border: "none", cursor: nameSaving ? "default" : "pointer", opacity: nameSaving ? 0.6 : 1 }}>
          {nameSaving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => { setNameEditOpen(false); setNameError(null); }} style={{ padding: "8px 14px", background: "transparent", color: "rgba(245,240,232,0.38)", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(245,240,232,0.1)", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  ) : null;

  // ── Inline member form ─────────────────────────────────────────────────────
  function MemberFormBlock({ memberType }: { memberType: FamilyMemberUI["member_type"] }) {
    const genderOptions = [{ v: "", label: "—" }, { v: "male", label: "Male" }, { v: "female", label: "Female" }, { v: "non_binary", label: "Non-binary" }, { v: "prefer_not_to_say", label: "Prefer not to say" }];
    const roleOptions = memberType === "co_investor"
      ? [{ v: "", label: "—" }, { v: "50/50", label: "50/50 equal" }, { v: "majority", label: "Majority investor" }, { v: "minority", label: "Minority investor" }, { v: "silent", label: "Silent partner" }]
      : [];
    return (
      <div style={{ padding: "14px", background: "rgba(201,168,76,0.04)", border: `1px solid rgba(201,168,76,0.2)`, marginTop: "8px" }}>
        <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "12px" }}>
          {editingMemberId ? "Edit" : "Add"} {memberType === "co_investor" ? "Co-Investor" : memberType === "spouse" ? "Spouse / Partner" : "Child"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          {([["First Name", "first_name"], ["Middle Name", "middle_name"], ["Last Name", "last_name"]] as [string, keyof MemberFormState][]).map(([label, key]) => (
            <div key={key}>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>{label}</div>
              <input type="text" value={memberForm[key]} onChange={e => setMemberForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>Date of Birth</div>
            <input type="date" value={memberForm.date_of_birth} onChange={e => setMemberForm(f => ({ ...f, date_of_birth: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
          </div>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>Gender</div>
            <select value={memberForm.gender} onChange={e => setMemberForm(f => ({ ...f, gender: e.target.value }))}
              style={{ width: "100%", background: "#111007", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}>
              {genderOptions.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>Nationality</div>
            <input type="text" value={memberForm.nationality} onChange={e => setMemberForm(f => ({ ...f, nationality: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
          <div>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>Passport Number</div>
            <input type="text" value={memberForm.passport_number} onChange={e => setMemberForm(f => ({ ...f, passport_number: e.target.value }))}
              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }} />
          </div>
          {memberType === "co_investor" && roleOptions.length > 0 && (
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.3)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>Investment Role</div>
              <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
                style={{ width: "100%", background: "#111007", border: "1px solid rgba(201,168,76,0.2)", color: CREAM, padding: "6px 8px", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", outline: "none", boxSizing: "border-box" }}>
                {roleOptions.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleSaveMember} disabled={memberSaving} style={{ padding: "7px 16px", background: GOLD, color: "#0a0a0a", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", border: "none", cursor: memberSaving ? "default" : "pointer", opacity: memberSaving ? 0.6 : 1 }}>
            {memberSaving ? "Saving…" : "Save"}
          </button>
          <button onClick={cancelMemberForm} style={{ padding: "7px 12px", background: "transparent", color: "rgba(245,240,232,0.35)", fontSize: "10px", fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(245,240,232,0.1)", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Member card ────────────────────────────────────────────────────────────
  function MemberCard({ m }: { m: FamilyMemberUI }) {
    const nameStr  = [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(" ") || "—";
    const dobStr   = m.date_of_birth ? new Date(m.date_of_birth + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
    const genderLabel: Record<string, string> = { male: "Male", female: "Female", non_binary: "Non-binary", prefer_not_to_say: "Not disclosed" };
    const roleLabel: Record<string, string> = { "50/50": "50/50 equal", majority: "Majority investor", minority: "Minority investor", silent: "Silent partner" };
    const isEditing = editingMemberId === m.id;
    return (
      <div style={{ marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "9px 0", borderBottom: `1px solid ${INNER}` }}>
          <Dot status="have" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontFamily: "'DM Sans', sans-serif", color: CREAM, fontWeight: 500 }}>{nameStr}</div>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "3px" }}>
              {dobStr    && <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)", fontFamily: "'DM Sans', sans-serif" }}>DOB: {dobStr}</span>}
              {m.gender  && <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)", fontFamily: "'DM Sans', sans-serif" }}>{genderLabel[m.gender] ?? m.gender}</span>}
              {m.nationality && <span style={{ fontSize: "10px", color: "rgba(245,240,232,0.38)", fontFamily: "'DM Sans', sans-serif" }}>{m.nationality}</span>}
              {m.role    && m.member_type === "co_investor" && <span style={{ fontSize: "10px", color: GOLD, fontFamily: "'DM Sans', sans-serif" }}>{roleLabel[m.role] ?? m.role}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <button onClick={() => openEditMember(m)} style={{ fontSize: "9px", color: "rgba(201,168,76,0.6)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "2px 6px" }}>Edit</button>
            <button onClick={() => handleDeleteMember(m.id)} style={{ fontSize: "9px", color: "rgba(248,113,113,0.5)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", padding: "2px 6px" }}>Remove</button>
          </div>
        </div>
        {isEditing && <MemberFormBlock memberType={m.member_type} />}
      </div>
    );
  }

  const eyebrow: React.CSSProperties = {
    fontSize: "8px",
    letterSpacing: "0.18em",
    textTransform: "uppercase" as const,
    color: "rgba(201,168,76,0.4)",
    fontFamily: "'DM Sans', sans-serif",
  };

  // ── SECTION 1: THE INVESTOR ──────────────────────────────────────────────────

  const identityFields: FieldDef[] = [
    {
      label: "Full Name",
      value: fullName,
      status: fullName ? "have" : "module",
      note: "Collected at account creation",
    },
    ...(data.middleName ? [{
      label: "Middle Name",
      value: data.middleName,
      status: "have" as Status,
      note: "",
    }] : []),
    {
      label: "Treaty Nationality",
      value: data.treatyCountry,
      status: data.treatyCountry ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Investor Archetype",
      value: archetypeLabel,
      status: archetypeLabel ? "have" : "module",
      note: "Derived after onboarding is complete",
      href: "/apply/story",
    },
    {
      label: "Date of Birth",
      value: null,
      status: "needed",
      note: "Required on DS-160 visa application form — not yet collected",
    },
    {
      label: "Passport Number",
      value: null,
      status: "needed",
      note: "Required for visa application — not yet collected",
    },
    {
      label: "Passport Expiry",
      value: null,
      status: "needed",
      note: "Must be valid at interview date — not yet collected",
    },
  ];

  const backgroundFields: FieldDef[] = [
    {
      label: "Education Level",
      value: null,
      status: "module",
      note: "Collects from Onboarding — Section 2",
      href: "/apply/story",
    },
    {
      label: "Field of Study",
      value: null,
      status: "module",
      note: "Collects from Onboarding — Section 2",
      href: "/apply/story",
    },
    {
      label: "Years of Relevant Experience",
      value: null,
      status: "module",
      note: "Collects from Onboarding — work history section",
      href: "/apply/story",
    },
    {
      label: "Prior U.S. Visa History",
      value: null,
      status: "module",
      note: "Collects from Onboarding — travel history",
      href: "/apply/story",
    },
    {
      label: "Prior Visa Denials",
      value: null,
      status: "module",
      note: "Collects from Onboarding — consulate asks this at interview",
      href: "/apply/story",
    },
    {
      label: "Criminal History Declaration",
      value: null,
      status: "needed",
      note: "Required self-declaration — not yet a field in our schema",
    },
  ];

  const intentFields: FieldDef[] = [
    {
      label: "Business Path",
      value: isFranchise ? "Franchise purchase" : data.businessType ? "Own business" : null,
      status: data.businessType ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Dependents Applying",
      value: quizAnswers["Q0-dependents"] ?? null,
      status: quizAnswers["Q0-dependents"] ? "have" : "module",
      note: "Collects from Onboarding — affects derivative E-2 applications",
      href: "/apply/story",
    },
    {
      label: "Current Country of Residence",
      value: null,
      status: "module",
      note: "Collects from Onboarding — needed for consulate assignment",
      href: "/apply/story",
    },
    {
      label: "Intended U.S. State / City",
      value: null,
      status: "module",
      note: "Collects from Onboarding — shows intent to direct business",
      href: "/apply/story",
    },
  ];

  const s1Have  = [...identityFields, ...backgroundFields, ...intentFields].filter(f => f.status === "have").length;
  const s1Total = identityFields.length + backgroundFields.length + intentFields.length;

  // ── SECTION 2: APPLICATION PROGRESS (milestones) ─────────────────────────────

  const milestones = [
    { label: "Eligibility Quiz",       done: quizDone, href: "/quiz" },
    { label: "Onboarding",             done: m1Done,   href: "/apply/story" },
    { label: "Business Profile",       done: m2Done,   href: "/apply/business" },
    { label: "Investment & Documents", done: m3Done,   href: "/apply/investment" },
    { label: "Gap Analysis",           done: m4Done,   href: "/gap-analysis" },
    { label: "Document Generation",    done: m5Done,   href: data.applicationId ? `/generate/${data.applicationId}` : "/apply/module4" },
    { label: "Interview Preparation",  done: simDone,  href: "/simulator" },
  ];

  const milestoneDone = milestones.filter(m => m.done).length;
  const activeIndex   = milestones.findIndex(m => !m.done);

  // ── SECTION 3: THE BUSINESS ──────────────────────────────────────────────────

  const entityFields: FieldDef[] = [
    {
      label: "Business Legal Name",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "Entity Type",
      value: null,
      status: "module",
      note: "LLC / S-Corp / C-Corp — Module 2",
      href: "/apply/business",
    },
    {
      label: "EIN (Tax ID)",
      value: null,
      status: "needed",
      note: "Employer Identification Number — required for business plan docs, not yet in schema",
    },
    {
      label: "U.S. Business Address",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "State of Incorporation",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
    {
      label: "Industry / NAICS Code",
      value: null,
      status: "module",
      note: "Collects from Business Profile — Module 2",
      href: "/apply/business",
    },
  ];

  const roleFields: FieldDef[] = [
    {
      label: "Investor's Job Title",
      value: null,
      status: "module",
      note: "Collects from Business Profile — the role you will manage day-to-day",
      href: "/apply/business",
    },
    {
      label: "Day-to-Day Duties",
      value: null,
      status: "module",
      note: "Collects from Business Profile — critical: E-2 requires active management",
      href: "/apply/business",
    },
    {
      label: "Qualifications for Role",
      value: null,
      status: "module",
      note: "Collects from Qualifications section — ties your experience to the business role",
      href: "/apply/qualifications",
    },
    {
      label: "Year 1 U.S. Employee Count",
      value: null,
      status: "module",
      note: "Collects from Business Profile — job creation is a key E-2 requirement",
      href: "/apply/business",
    },
    {
      label: "Non-Marginality Evidence",
      value: null,
      status: "needed",
      note: "Business must generate more than minimal living — narrative not yet in schema",
    },
    {
      label: "Organizational Chart",
      value: null,
      status: "needed",
      note: "Shows management structure to consulate — document upload not yet built",
    },
  ];

  const franchiseFields: FieldDef[] = isFranchise ? [
    {
      label: "Franchise Brand",
      value: null,
      status: "module",
      note: "Collects from FDD upload — or enter in Business Profile",
      href: "/fdd",
    },
    {
      label: "Franchisor Name",
      value: null,
      status: "module",
      note: "Collects from FDD analysis — Module 2",
      href: "/fdd",
    },
    {
      label: "FDD Analyses Run",
      value: data.fddCount > 0 ? `${data.fddCount} FDD ${data.fddCount === 1 ? "analysis" : "analyses"} complete` : null,
      status: data.fddCount > 0 ? "have" : "module",
      note: "Upload your Franchise Disclosure Document to unlock intelligence scoring",
      href: "/fdd",
    },
    {
      label: "Territory / Location",
      value: null,
      status: "module",
      note: "Collects from Market Analysis — territory viability analysis",
      href: "/market-analysis",
    },
    {
      label: "Franchise Agreement Date",
      value: null,
      status: "module",
      note: "Collects from Investment & Documents — Module 3",
      href: "/apply/investment",
    },
    {
      label: "Royalty & Fee Structure",
      value: null,
      status: "module",
      note: "Extracted from FDD during analysis",
      href: "/fdd",
    },
    {
      label: "Franchise Navigator",
      value: null,
      status: "module",
      note: "Explore and compare franchise opportunities ranked by E-2 suitability",
      href: "/franchise",
    },
  ] : [
    {
      label: "Business Description",
      value: null,
      status: "module",
      note: "Collects from Business Profile — what you sell, to whom",
      href: "/apply/business",
    },
    {
      label: "Products / Services",
      value: null,
      status: "module",
      note: "Collects from Business Profile — used in business plan generation",
      href: "/apply/business",
    },
    {
      label: "Target Customer Profile",
      value: null,
      status: "module",
      note: "Collects from Business Profile — essential for market analysis",
      href: "/apply/business",
    },
    {
      label: "Market Territory",
      value: null,
      status: "module",
      note: "Collects from Market Analysis — ZIP / city / metro area",
      href: "/market-analysis",
    },
    {
      label: "Revenue Projections (Y1–Y3)",
      value: null,
      status: "needed",
      note: "Required for business plan — not yet a structured field in schema",
    },
    {
      label: "Competitive Positioning",
      value: null,
      status: "optional",
      note: "Strengthens non-marginality argument — pulls from Market Analysis",
    },
  ];

  const s3Have  = [...entityFields, ...roleFields, ...franchiseFields].filter(f => f.status === "have").length;
  const s3Total = entityFields.length + roleFields.length + franchiseFields.length;

  // ── SECTION 4: THE INVESTMENT ────────────────────────────────────────────────

  const capitalFields: FieldDef[] = [
    {
      label: "Investment Range",
      value: data.investmentRange,
      status: data.investmentRange ? "have" : "module",
      note: "Collects from Eligibility Quiz",
      href: "/quiz",
    },
    {
      label: "Precise Investment Amount",
      value: null,
      status: "module",
      note: "Collects from Investment & Documents — Module 3",
      href: "/apply/investment",
    },
    {
      label: "At-Risk Declaration",
      value: null,
      status: "module",
      note: "Collects from Module 3 — funds must be irrevocably committed to the business",
      href: "/apply/investment",
    },
    {
      label: "Investment Committed Date",
      value: null,
      status: "module",
      note: "Collects from Module 3 — date investment was placed in the business",
      href: "/apply/investment",
    },
  ];

  const breakdownFields: FieldDef[] = [
    {
      label: "Franchise Fee / Purchase Price",
      value: null,
      status: "module",
      note: "Collects from Module 3 — largest single investment line item",
      href: "/apply/investment",
    },
    {
      label: "Equipment & Fixtures",
      value: null,
      status: "module",
      note: "Collects from Module 3 — physical business assets",
      href: "/apply/investment",
    },
    {
      label: "Working Capital",
      value: null,
      status: "module",
      note: "Collects from Module 3 — operating cash reserves for 3–6 months",
      href: "/apply/investment",
    },
    {
      label: "Lease Deposits",
      value: null,
      status: "module",
      note: "Collects from Module 3 — first/last month rent, security deposit",
      href: "/apply/investment",
    },
    {
      label: "Inventory",
      value: null,
      status: "module",
      note: "Collects from Module 3 — initial stock for operations",
      href: "/apply/investment",
    },
    {
      label: "Professional & Legal Fees",
      value: null,
      status: "module",
      note: "Collects from Module 3 — attorney, CPA, franchise consultant fees",
      href: "/apply/investment",
    },
  ];

  const sourceFields: FieldDef[] = [
    {
      label: "Source of Funds Type",
      value: null,
      status: "module",
      note: "Collects from Module 3 — savings / sale of property / gift / loan / inheritance",
      href: "/apply/investment",
    },
    {
      label: "Origin Country of Funds",
      value: null,
      status: "module",
      note: "Collects from Module 3 — required for anti-money-laundering compliance",
      href: "/apply/investment",
    },
    {
      label: "Funds in U.S. Account",
      value: null,
      status: "module",
      note: "Collects from Module 3 — confirms funds are accessible",
      href: "/apply/investment",
    },
    {
      label: "Source Narrative",
      value: null,
      status: "needed",
      note: "Written explanation of funds origin — structured narrative field not yet in schema",
    },
  ];

  const docsFields: FieldDef[] = [
    {
      label: "Bank Statements (6 months)",
      value: null,
      status: "module",
      note: "Upload in Module 3 — primary evidence of funds availability",
      href: "/apply/investment",
    },
    {
      label: "Wire Transfer Confirmations",
      value: null,
      status: "module",
      note: "Upload in Module 3 — proves capital movement into the business",
      href: "/apply/investment",
    },
    {
      label: "Purchase Agreement / LOI",
      value: null,
      status: "module",
      note: "Upload in Module 3 — franchise agreement or business purchase contract",
      href: "/apply/investment",
    },
    {
      label: "Business Appraisal",
      value: null,
      status: "optional",
      note: "Strengthens substantiality argument for existing business acquisition",
    },
    {
      label: "Gift Letter",
      value: null,
      status: "optional",
      note: "Required if source of funds includes a gift from a third party",
    },
  ];

  const s4Have  = [...capitalFields, ...breakdownFields, ...sourceFields, ...docsFields].filter(f => f.status === "have").length;
  const s4Total = capitalFields.length + breakdownFields.length + sourceFields.length + docsFields.length;

  // ── SECTION 5: CASE INTELLIGENCE ────────────────────────────────────────────

  const gapFields: FieldDef[] = [
    {
      label: "Overall Case Readiness",
      value: data.completenessScore != null ? `${data.completenessScore}%` : null,
      status: data.completenessScore != null ? "have" : "module",
      note: "Computed after Gap Analysis — scores your case across 3 dimensions",
      href: "/gap-analysis",
    },
    {
      label: "Source of Funds Score",
      value: data.sourceOfFundsScore != null ? `${data.sourceOfFundsScore}%` : null,
      status: data.sourceOfFundsScore != null ? "have" : "module",
      note: "Measures quality and documentation of funds",
      href: "/gap-analysis",
    },
    {
      label: "Management Role Score",
      value: data.managementRoleScore != null ? `${data.managementRoleScore}%` : null,
      status: data.managementRoleScore != null ? "have" : "module",
      note: "Measures evidence of your day-to-day operational role",
      href: "/gap-analysis",
    },
    {
      label: "Business Plan Score",
      value: data.businessPlanScore != null ? `${data.businessPlanScore}%` : null,
      status: data.businessPlanScore != null ? "have" : "module",
      note: "Scores coherence, viability, and substantiality of business plan",
      href: "/gap-analysis",
    },
    {
      label: "Top Priority Evidence Gap",
      value: null,
      status: gapDone ? "module" : "module",
      note: "Surfaces after Gap Analysis — your single most impactful gap to close",
      href: "/gap-analysis",
    },
    {
      label: "Non-Marginality Assessment",
      value: null,
      status: "needed",
      note: "Structured score for business viability beyond minimal living — not yet in gap engine",
    },
  ];

  // FDD-specific fields — franchise users only
  const fddIntelFields: FieldDef[] = isFranchise ? [
    {
      label: "FDD Item 19 Performance",
      value: data.fddCount > 0 ? "Extracted from FDD" : null,
      status: data.fddCount > 0 ? "have" : "module",
      note: "Financial performance representations from the disclosure document",
      href: "/fdd",
    },
    {
      label: "E-2 Suitability Rating",
      value: null,
      status: "module",
      note: "Computed by FDD analysis engine — rates franchise for E-2 suitability",
      href: "/fdd",
    },
  ] : [];

  // Market analysis fields — all users
  const marketHasData = data.marketScore != null;
  const marketFields: FieldDef[] = [
    {
      label: "Territory Score",
      value: data.marketScore != null ? `${data.marketScore}/100 — ${data.marketRating ?? ""}`.trim() : null,
      status: data.marketScore != null ? "have" : "module",
      note: "Overall viability of your target market for E-2 investment purposes",
      href: "/market-analysis",
    },
    {
      label: "Target ZIP / State",
      value: data.marketZip && data.marketState ? `${data.marketZip}, ${data.marketState}` : (data.marketZip ?? null),
      status: data.marketZip != null ? "have" : "module",
      note: "Geographic target area for your business location",
      href: "/market-analysis",
    },
    {
      label: "Competitor Count (nearby)",
      value: data.marketCompetitorCount != null ? `${data.marketCompetitorCount} in area` : null,
      status: data.marketCompetitorCount != null ? "have" : "module",
      note: "Supports non-marginality argument — number of comparable businesses in your target zone",
      href: "/market-analysis",
    },
    {
      label: "Market Verdict",
      value: marketHasData ? (data.marketVerdict ?? "Analysis complete") : null,
      status: marketHasData ? "have" : "module",
      note: "Plain-language summary of territory viability from the analysis engine",
      href: "/market-analysis",
    },
    {
      label: "Industry Benchmark",
      value: null,
      status: "module",
      note: "Investment comparison against comparable businesses in your market",
      href: "/market-analysis",
    },
    {
      label: "Business Valuation Benchmark",
      value: null,
      status: "optional",
      note: "Comparative valuation strengthens the substantiality of investment argument",
    },
  ];

  const s5Have  = [...gapFields, ...fddIntelFields, ...marketFields].filter(f => f.status === "have").length;
  const s5Total = gapFields.length + fddIntelFields.length + marketFields.length;

  // ── SECTION 6: INTERVIEW READINESS ──────────────────────────────────────────

  const simFields: FieldDef[] = [
    {
      label: "Sessions Completed",
      value: data.lastSimSessionNumber != null ? `${data.lastSimSessionNumber} sessions` : null,
      status: data.lastSimSessionNumber != null ? "have" : "module",
      note: "Start a simulator session — available any time, no case file required",
      href: "/simulator",
    },
    {
      label: "Interview Readiness",
      value: data.simReadiness
        ? data.simReadiness === "ready" ? "Interview ready"
          : data.simReadiness === "nearly_ready" ? "Nearly ready"
          : "Needs more practice"
        : null,
      status: data.simReadiness ? "have" : "module",
      note: "Computed after first simulator session",
      href: "/simulator",
    },
    {
      label: "Primary Coaching Focus",
      value: data.simCoachingNotes ? "See coaching notes below" : null,
      status: data.simCoachingNotes ? "have" : "module",
      note: "Top coaching note surfaces after simulator session",
      href: "/simulator",
    },
    {
      label: "Strong Answer Areas",
      value: null,
      status: "module",
      note: "Identified after 2+ sessions — shows where your case is solid",
      href: "/simulator",
    },
  ];

  const dossierFields: FieldDef[] = [
    {
      label: "Interview Dossier",
      value: data.prepKitId
        ? `Generated ${data.prepKitCreatedAt ? new Date(data.prepKitCreatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}`
        : null,
      status: data.prepKitId ? "have" : "module",
      note: "Requires at least 1 simulator session to generate",
      href: "/simulator/prep-kit",
    },
    {
      label: "Personalised Q&A Set",
      value: null,
      status: data.prepKitId ? "have" : "module",
      note: "Case-specific questions and coached answers — generated with dossier",
      href: "/simulator/prep-kit",
    },
    {
      label: "Red Flag Alert Areas",
      value: null,
      status: "module",
      note: "Case-specific risks the consulate is likely to probe — from your case data",
      href: "/simulator",
    },
  ];

  const s6Have  = [...simFields, ...dossierFields].filter(f => f.status === "have").length;
  const s6Total = simFields.length + dossierFields.length;

  // ── SECTION 7: DOCUMENTS & PACKAGE ─────────────────────────────────────────

  const hasApplication = Boolean(data.applicationId);
  const hasDocs        = data.generatedDocCount > 0;

  const docStatus: Status = hasDocs ? "have" : hasApplication ? "module" : "optional";
  const docNote = (active: string, locked = "Complete your case file first to unlock") =>
    hasApplication ? active : locked;
  const docHref = hasApplication
    ? (hasDocs ? `/documents/${data.applicationId}` : `/generate/${data.applicationId}`)
    : undefined;

  const docPackageFields: FieldDef[] = [
    {
      label: "Business Plan",
      value: hasDocs ? "Generated" : null,
      status: docStatus,
      note: docNote("Generated from your business profile, investment details, and voice profile"),
      href: docHref,
    },
    {
      label: "Cover Letter",
      value: hasDocs ? "Generated" : null,
      status: docStatus,
      note: docNote("Formal letter to the consulate introducing your E-2 petition"),
      href: docHref,
    },
    {
      label: "Personal Statement",
      value: hasDocs ? "Generated" : null,
      status: docStatus,
      note: docNote("First-person narrative — generated from onboarding and voice profile"),
      href: docHref,
    },
    {
      label: "Investment Evidence Memo",
      value: hasDocs ? "Generated" : null,
      status: docStatus,
      note: docNote("Source of funds narrative with evidence trail for the consulate"),
      href: docHref,
    },
    {
      label: "Financial Projections (Y1–Y3)",
      value: hasDocs ? "Generated" : null,
      status: docStatus,
      note: docNote("Three-year revenue and expense model — referenced in the business plan"),
      href: docHref,
    },
  ];

  const pipelineFields: FieldDef[] = [
    {
      label: "Documents Generated",
      value: hasDocs ? `${data.generatedDocCount} of 15 ready` : null,
      status: hasDocs ? "have" : hasApplication ? "module" : "optional",
      note: docNote("Run generation to produce your full document package"),
      href: hasApplication && !hasDocs ? `/generate/${data.applicationId}` : docHref,
    },
    {
      label: "Download Package",
      value: hasDocs ? "Available" : null,
      status: hasDocs ? "have" : hasApplication ? "module" : "optional",
      note: docNote("Download all documents as a ZIP archive"),
      href: hasDocs ? `/documents/${data.applicationId}` : undefined,
    },
  ];

  const s7Have  = [...docPackageFields, ...pipelineFields].filter(f => f.status === "have").length;
  const s7Total = docPackageFields.length + pipelineFields.length;

  // ── SECTION 8: TOOLS & LEARN ────────────────────────────────────────────────

  const toolsFields: FieldDef[] = [
    {
      label: "Submission Checklist",
      value: null,
      status: "module",
      note: "Step-by-step checklist of everything to gather before filing",
      href: "/apply/checklist",
    },
    {
      label: "Case Timeline",
      value: null,
      status: "module",
      note: "Estimated schedule from today to interview day with milestone dates",
      href: "/apply/calendar",
    },
  ];

  const learnFields: FieldDef[] = [
    {
      label: "E-2 Visa Knowledge Hub",
      value: null,
      status: "module",
      note: "6 in-depth guides · FAQ widget · consulate tips — everything you need to know",
      href: "/learn",
    },
    {
      label: "Investment Benchmarks",
      value: null,
      status: "module",
      note: "How much is enough? Industry data and real case examples by business type",
      href: "/learn/how-much-to-invest-e2",
    },
    {
      label: "Denial Reasons & Prevention",
      value: null,
      status: "module",
      note: "The most common E-2 denial reasons and how to address them in your case",
      href: "/learn/e2-visa-denial-reasons",
    },
    {
      label: "Country Guides",
      value: null,
      status: "module",
      note: "Canada, UK, France and more — consulate tips and treaty specifics by nationality",
      href: "/learn",
    },
  ];

  const s8Have  = 0;
  const s8Total = toolsFields.length + learnFields.length;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", paddingBottom: "80px" }}>

      {/* Full-width header area — paddingTop accounts for the fixed main Nav */}
      <div style={{ maxWidth: "1060px", margin: "0 auto", padding: isMobile ? "80px 16px 0" : "80px 32px 0" }}>

        {/* Page header */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ ...eyebrow, marginBottom: "8px" }}>E-2 Investor Case File</div>
          <div style={{
            fontSize: "36px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontWeight: 300,
            color: CREAM,
            lineHeight: 1.15,
            marginBottom: "8px",
          }}>
            {fullName ?? "My Case Profile"}
          </div>
          <div style={{
            fontSize: "13px",
            fontFamily: "'DM Sans', sans-serif",
            color: "rgba(245,240,232,0.38)",
            marginBottom: "12px",
          }}>
            {[
              data.treatyCountry,
              archetypeLabel,
              data.investmentRange && `Investing ${data.investmentRange}`,
              isFranchise ? "Franchise path" : data.businessType ? "Own business" : null,
            ].filter(Boolean).join("  ·  ")}
          </div>
          {outcome && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              border: `1px solid ${outcome.color}28`,
              background: `${outcome.color}0D`,
            }}>
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: outcome.color, display: "inline-block" }} />
              <span style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: outcome.color, fontWeight: 600, letterSpacing: "0.04em" }}>
                {outcome.label}
              </span>
            </div>
          )}
        </div>

        {/* ── Journey progress — the single source of truth ───────────────── */}
        <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, padding: "20px 24px", marginBottom: "12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ ...eyebrow }}>Your Application</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontSize: "13px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.55)" }}>
                Step {activeIndex < 0 ? milestones.length : activeIndex + 1} of {milestones.length}
              </span>
              <span style={{ width: "60px", height: "2px", background: "rgba(245,240,232,0.06)", display: "inline-block" }}>
                <span style={{ display: "block", height: "100%", width: `${Math.round((milestoneDone / milestones.length) * 100)}%`, background: GOLD }} />
              </span>
            </div>
          </div>

          {/* 7-step strip */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", top: "5px", left: "40px", right: "40px", height: "1px", background: "rgba(245,240,232,0.05)" }} />
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${milestones.length}, 1fr)`, gap: "4px" }}>
              {milestones.map((m, i) => (
                <Milestone key={m.label} label={m.label} done={m.done} active={i === activeIndex} href={m.href} />
              ))}
            </div>
          </div>

          {/* Next step action */}
          {activeIndex >= 0 ? (
            <div style={{ marginTop: "20px", padding: "14px 18px", background: "rgba(201,168,76,0.05)", borderLeft: "2px solid rgba(201,168,76,0.45)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "8px", letterSpacing: "0.12em", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "3px" }}>NEXT STEP</div>
                <div style={{ fontSize: "14px", fontFamily: "'DM Sans', sans-serif", color: CREAM }}>{milestones[activeIndex].label}</div>
              </div>
              <Link href={milestones[activeIndex].href} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 22px", background: GOLD, color: "#0a0a0a", fontSize: "11px", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", textDecoration: "none", flexShrink: 0 }}>
                Continue →
              </Link>
            </div>
          ) : (
            <div style={{ marginTop: "20px", padding: "14px 18px", background: "rgba(93,202,165,0.05)", borderLeft: `2px solid ${GREEN}`, fontSize: "13px", fontFamily: "'DM Sans', sans-serif", color: CREAM }}>
              All steps complete — your case file is submission-ready.
            </div>
          )}
        </div>

        {/* ── Import from a document — prominent fast-fill ─────────────────── */}
        <div style={{ marginBottom: "28px" }}>
          <DocumentImportHub
            applicationId={data.applicationId}
            onFieldsApplied={() => reloadProfile()}
          />
        </div>

        <ExtractionTransparencyPanel documents={data.documents} />

        {/* ── Sidebar + content layout ─────────────────────────────────── */}
        <div style={{ display: "flex", gap: "40px", alignItems: "flex-start" }}>

          {/* Sidebar — hidden on mobile (<768px) */}
          {!isMobile && <Sidebar active={activeSection} />}

          {/* Section content */}
          <div style={{ flex: 1, minWidth: 0 }}>

            {/* ── 01 THE INVESTOR ─────────────────────────────────────── */}
            <SectionCard
              id="investor"
              number="01"
              title="The Investor"
              description="Personal identity, treaty eligibility, background, and U.S. intent"
              haveCount={s1Have}
              totalCount={s1Total}
              ctaLabel={m1Done ? "View Onboarding" : "Complete Onboarding"}
              ctaHref="/apply/story"
            >
              {/* Name edit trigger */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                <button
                  onClick={() => {
                    setNameForm({ firstName: data.firstName ?? "", middleName: data.middleName ?? "", lastName: data.lastName ?? "" });
                    setNameEditOpen(v => !v);
                    setNameError(null);
                  }}
                  style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(201,168,76,0.6)", background: "transparent", border: "1px solid rgba(201,168,76,0.2)", padding: "4px 10px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase" }}
                >
                  {nameEditOpen ? "Close" : "Edit Name"}
                </button>
              </div>
              {NameEditForm}

              <Sub title="Identity & Nationality" fields={identityFields} />
              <Sub title="Professional Background" fields={backgroundFields} />
              <Sub title="Business Path & U.S. Intent" fields={intentFields} />

              {/* ── Family Members ─────────────────────────────────────── */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "8px", letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(201,168,76,0.38)", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, marginBottom: "4px", paddingBottom: "4px", borderBottom: `1px solid ${INNER}` }}>
                  Family Members & Co-Applicants
                </div>

                {/* Co-investors (partnerships) */}
                {(isPartnership || coInvestors.length > 0) && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.28)", fontFamily: "'DM Sans', sans-serif", marginBottom: "6px", marginTop: "8px" }}>
                      CO-INVESTOR{coInvestors.length > 1 ? "S" : ""} · Partnership
                    </div>
                    {coInvestors.map(m => <MemberCard key={m.id} m={m} />)}
                    {addingMemberType === "co_investor" && <MemberFormBlock memberType="co_investor" />}
                    {addingMemberType !== "co_investor" && (
                      <button onClick={() => openAddMember("co_investor")} style={{ marginTop: "6px", fontSize: "9px", color: "rgba(201,168,76,0.55)", background: "transparent", border: "1px dashed rgba(201,168,76,0.2)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        + Add Co-Investor
                      </button>
                    )}
                  </div>
                )}

                {/* Spouse */}
                {(hasSpouse || spouseList.length > 0) && (
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.28)", fontFamily: "'DM Sans', sans-serif", marginBottom: "6px", marginTop: "8px" }}>
                      SPOUSE / PARTNER · Derivative E-2
                    </div>
                    {spouseList.map(m => <MemberCard key={m.id} m={m} />)}
                    {addingMemberType === "spouse" && <MemberFormBlock memberType="spouse" />}
                    {spouseList.length === 0 && addingMemberType !== "spouse" && (
                      <button onClick={() => openAddMember("spouse")} style={{ marginTop: "6px", fontSize: "9px", color: "rgba(201,168,76,0.55)", background: "transparent", border: "1px dashed rgba(201,168,76,0.2)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        + Add Spouse
                      </button>
                    )}
                  </div>
                )}

                {/* Children */}
                {(hasChildren || childList.length > 0) && (
                  <div style={{ marginBottom: "4px" }}>
                    <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "rgba(245,240,232,0.28)", fontFamily: "'DM Sans', sans-serif", marginBottom: "6px", marginTop: "8px" }}>
                      CHILDREN · Derivative E-2
                    </div>
                    {childList.map(m => <MemberCard key={m.id} m={m} />)}
                    {addingMemberType === "child" && <MemberFormBlock memberType="child" />}
                    {addingMemberType !== "child" && (
                      <button onClick={() => openAddMember("child")} style={{ marginTop: "6px", fontSize: "9px", color: "rgba(201,168,76,0.55)", background: "transparent", border: "1px dashed rgba(201,168,76,0.2)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        + Add Child
                      </button>
                    )}
                  </div>
                )}

                {/* Empty state for users with no family on record */}
                {!isPartnership && !hasSpouse && !hasChildren && members.length === 0 && (
                  <div style={{ padding: "10px 0" }}>
                    <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.22)", fontStyle: "italic", marginBottom: "10px" }}>
                      No family members or partners added — add them below if applicable.
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(["co_investor", "spouse", "child"] as FamilyMemberUI["member_type"][]).map(type => (
                        addingMemberType !== type && (
                          <button key={type} onClick={() => openAddMember(type)} style={{ fontSize: "9px", color: "rgba(201,168,76,0.55)", background: "transparent", border: "1px dashed rgba(201,168,76,0.2)", padding: "5px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                            + Add {type === "co_investor" ? "Co-Investor" : type === "spouse" ? "Spouse" : "Child"}
                          </button>
                        )
                      ))}
                    </div>
                    {addingMemberType && <MemberFormBlock memberType={addingMemberType} />}
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ── 02 THE BUSINESS ─────────────────────────────────────── */}
            <SectionCard
              id="business"
              number="02"
              title="The Business"
              description={isFranchise
                ? "Franchise entity, investor role, and FDD intelligence"
                : "Business entity, investor role, and market position"}
              haveCount={s3Have}
              totalCount={s3Total}
              ctaLabel={m2Done ? "View Business Profile" : "Complete Business Profile"}
              ctaHref={isFranchise ? "/fdd" : "/apply/business"}
            >
              <Sub title="Entity Overview" fields={entityFields} />
              <Sub title="The Investor's Role" fields={roleFields} />
              <Sub title={isFranchise ? "Franchise Intelligence" : "Business Intelligence"} fields={franchiseFields} />
            </SectionCard>

            {/* ── 03 THE INVESTMENT ───────────────────────────────────── */}
            <SectionCard
              id="investment"
              number="03"
              title="The Investment"
              description="Capital committed, breakdown by category, source of funds, and supporting documentation"
              haveCount={s4Have}
              totalCount={s4Total}
              ctaLabel={m3Done ? "View Investment Details" : "Add Investment Details"}
              ctaHref="/apply/investment"
            >
              <Sub title="Capital Summary" fields={capitalFields} />
              <Sub title="Investment Breakdown" fields={breakdownFields} />
              <Sub title="Source of Funds" fields={sourceFields} />
              <Sub title="Supporting Documentation" fields={docsFields} />
            </SectionCard>

            {/* ── 04 CASE INTELLIGENCE ────────────────────────────────── */}
            <SectionCard
              id="intelligence"
              number="04"
              title="Case Intelligence"
              description="Gap analysis scores, FDD findings, market analysis, and evidence priority map"
              haveCount={s5Have}
              totalCount={s5Total}
              ctaLabel={m4Done ? "View Gap Analysis" : "Run Gap Analysis"}
              ctaHref="/gap-analysis"
            >
              {data.completenessScore != null && (
                <div style={{ marginBottom: "20px", padding: "16px", background: "rgba(0,0,0,0.3)", border: `1px solid ${INNER}` }}>
                  <div style={{ ...eyebrow, marginBottom: "12px" }}>Gap Analysis Results</div>
                  <ScoreBar label="Overall Case Readiness" score={data.completenessScore} />
                  <ScoreBar label="Source of Funds"        score={data.sourceOfFundsScore} />
                  <ScoreBar label="Management Role"        score={data.managementRoleScore} />
                  <ScoreBar label="Business Plan"          score={data.businessPlanScore} />
                </div>
              )}
              {data.caseTheory && <CaseTheoryBlock theory={data.caseTheory} />}
              <Sub title="Gap Analysis" fields={gapFields} />
              {isFranchise && fddIntelFields.length > 0 && (
                <Sub title="FDD Intelligence" fields={fddIntelFields} />
              )}
              <Sub title="Market Analysis" fields={marketFields} />
            </SectionCard>

            {/* ── 05 INTERVIEW READINESS ──────────────────────────────── */}
            <SectionCard
              id="interview"
              number="05"
              title="Interview Readiness"
              description="AI simulator sessions, coaching notes, and personalised interview dossier"
              haveCount={s6Have}
              totalCount={s6Total}
              ctaLabel="Open Simulator"
              ctaHref="/simulator"
            >
              {data.simCoachingNotes && (
                <div style={{ padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: `1px solid ${INNER}`, marginBottom: "16px" }}>
                  <div style={{ ...eyebrow, marginBottom: "6px" }}>Latest Coaching Note</div>
                  <p style={{ fontSize: "12px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.5)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                    {data.simCoachingNotes}
                  </p>
                </div>
              )}
              <Sub title="Simulator" fields={simFields} />
              <Sub title="Interview Dossier" fields={dossierFields} />
            </SectionCard>

            {/* ── 06 DOCUMENTS & PACKAGE ──────────────────────────── */}
            <SectionCard
              id="documents"
              number="06"
              title="Documents & Package"
              description={hasApplication
                ? hasDocs
                  ? "Your document package is ready — review and download below"
                  : "Trigger document generation once your case file sections are complete"
                : "Complete your case file to unlock the document generation pipeline"}
              haveCount={s7Have}
              totalCount={s7Total}
              ctaLabel={hasApplication
                ? hasDocs ? "View Documents" : "Generate Documents"
                : "Start Your Case File"}
              ctaHref={hasApplication
                ? hasDocs ? `/documents/${data.applicationId}` : `/generate/${data.applicationId}`
                : "/apply/story"}
            >
              {!hasApplication && (
                <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.25)", border: `1px solid ${INNER}`, marginBottom: "16px" }}>
                  <div style={{ fontSize: "10px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.28)", lineHeight: 1.7 }}>
                    Document generation unlocks once your case file is started. Complete Sections 02–04 (Investor · Business · Investment) to progress to the generation step.
                  </div>
                </div>
              )}

              <Sub title="Document Package" fields={docPackageFields} />
              <Sub title="Generation Status" fields={pipelineFields} />
            </SectionCard>

            {/* ── 07 TOOLS & LEARN ────────────────────────────────── */}
            <SectionCard
              id="resources"
              number="07"
              title="Tools & Resources"
              description="Submission checklist, case timeline, and E-2 visa knowledge hub with guides and FAQs"
              haveCount={s8Have}
              totalCount={s8Total}
            >
              <Sub title="Case Tools" fields={toolsFields} />
              <Sub title="Knowledge Hub" fields={learnFields} />
            </SectionCard>

            {/* ── 08 RENEWAL ──────────────────────────────────────── */}
            <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', padding: '24px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>08</div>
                  <div style={{ fontSize: '18px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, color: CREAM, lineHeight: 1.2, marginBottom: '4px' }}>Renewal Package</div>
                  <div style={{ fontSize: '11px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)', lineHeight: 1.6 }}>
                    Prepare your E-2 renewal application — actual vs. projected performance, updated cover letter, current ties narrative, and path-specific checklist.
                  </div>
                </div>
                <a
                  href="/renewal"
                  style={{ flexShrink: 0, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '8px 16px', color: '#C9A84C', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}
                >
                  Open →
                </a>
              </div>
            </div>

            {/* ── 09 PARTNER 2 (partnership applications only) ──── */}
            {isPartnership && data.applicationId && (
              <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', padding: '24px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.5)', fontFamily: "'DM Sans', sans-serif", marginBottom: '4px' }}>09 · Partnership</div>
                    <div style={{ fontSize: '18px', fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, color: CREAM, lineHeight: 1.2, marginBottom: '4px' }}>Investor 2 Information</div>
                    <div style={{ fontSize: '11px', fontFamily: "'DM Sans', sans-serif", color: 'rgba(245,240,232,0.4)', lineHeight: 1.6 }}>
                      Provide Partner 2&apos;s name, nationality, role, source of funds, and qualifications — required to generate Investor 2&apos;s separate document package.
                    </div>
                  </div>
                  <a
                    href={`/apply/partner2?applicationId=${data.applicationId}`}
                    style={{ flexShrink: 0, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', padding: '8px 16px', color: '#C9A84C', fontSize: '12px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}
                  >
                    Complete →
                  </a>
                </div>
              </div>
            )}

            {/* Footer note */}
            <div style={{ textAlign: "center", padding: "24px 0", borderTop: `1px solid ${INNER}`, marginTop: "8px" }}>
              <p style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.18)", lineHeight: 1.7, margin: 0 }}>
                Fields marked <span style={{ color: "rgba(248,113,113,0.45)", fontStyle: "italic" }}>Required</span> represent schema gaps — future modules will collect them.{" "}
                Fields marked <span style={{ color: "rgba(201,168,76,0.38)", fontStyle: "italic" }}>Collects from step</span> populate automatically as you complete each module.
              </p>
            </div>

          </div>{/* end content */}
        </div>{/* end sidebar + content */}
      </div>{/* end max-width wrapper */}
    </div>
  );
}
