"use client";
import { useState } from "react";
import type { CSSProperties } from "react";

interface PreviewData {
  country: string;
  investment_range: string;
  application_type: string;
  answers: Record<string, string | string[]>;
}

interface DocumentTabPreviewProps {
  data: PreviewData;
  consulateName: string;
  userName: string | null;
}

const TABS = [
  { id: "cover-letter",   label: "Cover Letter",              pages: "12–18 pages" },
  { id: "business-plan",  label: "Business Plan",             pages: "30–45 pages" },
  { id: "source-funds",   label: "Source of Funds",           pages: "6–10 pages"  },
  { id: "qualifications", label: "Qualifications Narrative",  pages: "4–6 pages"   },
  { id: "intent",         label: "Non-Immigrant Intent",      pages: "3–5 pages"   },
];

const st: Record<string, CSSProperties> = {
  badge:    { fontSize: "10px", letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(201,168,76,0.55)", marginBottom: "14px", fontFamily: "'DM Sans', sans-serif" },
  heading:  { fontSize: "12px", fontWeight: 600, color: "#f5f0e8", marginBottom: "8px", marginTop: "12px" },
  para:     { fontSize: "12px", color: "rgba(245,240,232,0.78)", lineHeight: 1.8, marginBottom: "10px" },
  sections: { fontSize: "10px", color: "rgba(245,240,232,0.38)", fontStyle: "italic", lineHeight: 1.7, marginTop: "8px" },
};
const gold: CSSProperties = { color: "#C9A84C" };

function PreviewContent({ tabId, data, consulateName, userName }: { tabId: string; data: PreviewData; consulateName: string; userName: string | null }) {
  const name      = userName || "[Applicant]";
  const firstName = userName ? name.split(" ")[0] : "[Applicant]";
  const country    = data.country || "[Country]";
  const investment = data.investment_range || "[Investment Amount]";
  const bizRaw     = String(data.answers?.["Q0-08a"] || "");
  const isFranchise   = /franchise/i.test(bizRaw);
  const isAcquisition = /acquisition/i.test(bizRaw);
  const bizDesc    = isFranchise ? "franchise business" : isAcquisition ? "business acquisition" : "new enterprise";

  if (tabId === "cover-letter") return (
    <div>
      <div style={st.badge}>Cover Letter — {consulateName}</div>
      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.85)", lineHeight: 1.6, marginBottom: "6px" }}>
        <span style={{ fontWeight: 600, color: "#f5f0e8" }}>RE:</span>{" "}
        E-2 Treaty Investor Visa Application — <span style={gold}>{name}</span>, National of <span style={gold}>{country}</span>
      </div>
      <div style={{ fontSize: "12px", color: "rgba(245,240,232,0.85)", lineHeight: 1.6, marginBottom: "12px" }}>Dear Consular Officer,</div>
      <div style={st.para}>
        I am writing to present the E-2 Treaty Investor visa application of <span style={gold}>{name}</span>, a national of{" "}
        <span style={gold}>{country}</span>, seeking classification as a treaty investor pursuant to the bilateral treaty
        between the United States and {country}.
      </div>
      <div style={st.para}>
        {firstName} has committed capital of <span style={gold}>{investment}</span> toward the establishment and operation
        of a {bizDesc} in the United States. The investment satisfies all statutory and regulatory requirements for E-2
        classification: it is substantial relative to the total enterprise cost, irrevocably committed, and directed toward
        a non-marginal operation that will create meaningful employment.
      </div>
      <div style={st.sections}>
        §1 — Treaty Standing &amp; Nationality · §2 — Investment Substantiality · §3 — Source and Path of Funds ·
        §4 — Non-Marginality · §5 — Active Management Role · §6 — Non-Immigrant Intent · [continues for 12–18 pages]
      </div>
    </div>
  );

  if (tabId === "business-plan") return (
    <div>
      <div style={st.badge}>Business Plan — E-2 Investor Visa Support</div>
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "16px", color: "#f5f0e8", marginBottom: "2px" }}>E-2 Business Plan</div>
      <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.5)", marginBottom: "14px" }}>
        {isFranchise ? "Franchise Acquisition" : isAcquisition ? "Business Acquisition" : "New Enterprise"} · Submitted to {consulateName}
      </div>
      <div style={st.heading}>Executive Summary</div>
      <div style={st.para}>
        This business plan has been prepared in support of the E-2 Treaty Investor visa application of{" "}
        <span style={gold}>{name}</span>. It presents a comprehensive analysis of the proposed {bizDesc}, including
        market position, operational structure, three-year financial projections, and employment creation timeline.
      </div>
      <div style={st.para}>
        The total committed investment of <span style={gold}>{investment}</span> is sufficient to fund full establishment
        and to sustain operations through the initial period. The enterprise is projected to create [X] full-time
        equivalent positions within 24 months of commencement.
      </div>
      <div style={st.sections}>
        §1 — Business Description · §2 — Market Analysis · §3 — Products &amp; Services · §4 — Management Structure ·
        §5 — Operations · §6 — Financial Projections (3-Year) · §7 — Employment Creation Plan · [30–45 pages]
      </div>
    </div>
  );

  if (tabId === "source-funds") return (
    <div>
      <div style={st.badge}>Source and Path of Funds Declaration</div>
      <div style={{ ...st.heading, marginBottom: "12px" }}>
        Declaration of Investment Funds — <span style={gold}>{name}</span>
      </div>
      <div style={st.para}>
        I, <span style={gold}>{name}</span>, a national of <span style={gold}>{country}</span>, declare that the
        investment funds of <span style={gold}>{investment}</span> committed to the proposed E-2 enterprise were
        accumulated through the following documented sources:
      </div>
      <div style={{ marginBottom: "12px" }}>
        {([
          ["Employment income — accumulated savings (2019–2024)", "Bank statements + pay records"],
          ["Business proceeds / asset liquidation",               "Purchase agreement, escrow confirmation"],
          ["Investment account liquidation",                      "Brokerage statements (pre/post)"],
        ] as [string, string][]).map(([source, docs], i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(201,168,76,0.08)", fontSize: "11px" }}>
            <span style={{ color: "rgba(245,240,232,0.8)" }}>{source}</span>
            <span style={{ color: "rgba(245,240,232,0.42)", fontSize: "10px" }}>{docs}</span>
          </div>
        ))}
      </div>
      <div style={st.sections}>
        §2 — Fund Path Chronology · §3 — Banking Trail · §4 — Committed to Enterprise · §5 — Supporting Exhibits · [6–10 pages + exhibits]
      </div>
    </div>
  );

  if (tabId === "qualifications") return (
    <div>
      <div style={st.badge}>Qualifications Narrative — Active Management Role</div>
      <div style={{ ...st.heading, marginBottom: "2px" }}>Professional Qualifications — <span style={gold}>{name}</span></div>
      <div style={{ fontSize: "11px", color: "rgba(245,240,232,0.45)", marginBottom: "14px" }}>Capacity to Develop and Direct the Enterprise</div>
      <div style={st.para}>
        <span style={gold}>{name}</span> brings [X] years of direct management experience in [relevant industry], with
        documented responsibility for operational decisions, financial planning, and personnel management. This narrative
        establishes {firstName}&apos;s qualifications to develop and direct the proposed {bizDesc}.
      </div>
      <div style={st.heading}>Management Experience</div>
      <div style={st.para}>
        Prior to pursuing E-2 investment, {firstName} served as [role] at [company], where responsibilities included
        oversight of [number] employees, management of a [$X] operating budget, and direct decision-making authority
        over [key business functions directly relevant to the proposed enterprise].
      </div>
      <div style={st.sections}>
        §2 — Education and Certifications · §3 — Industry-Specific Experience · §4 — Connection to Proposed Business · [4–6 pages]
      </div>
    </div>
  );

  if (tabId === "intent") return (
    <div>
      <div style={st.badge}>Non-Immigrant Intent Statement</div>
      <div style={{ ...st.heading, marginBottom: "12px" }}>
        Declaration of Non-Immigrant Intent — <span style={gold}>{name}</span>
      </div>
      <div style={st.para}>
        I, <span style={gold}>{name}</span>, declare that I seek entry into the United States solely in the non-immigrant
        capacity of E-2 Treaty Investor, and that I intend to depart upon the expiration or termination of my authorized
        stay or any extension thereof.
      </div>
      <div style={st.heading}>Ties to {country}</div>
      <div style={st.para}>
        My intent to return to <span style={gold}>{country}</span> is supported by the following substantial ties I
        maintain in my home country:
      </div>
      <div style={{ paddingLeft: "14px", marginBottom: "10px" }}>
        {[
          `Property ownership in ${country} — [address and title registration reference]`,
          "Family obligations — [dependents or family members remaining in home country]",
          "Professional license / continuing business interest — [details]",
          `Active financial accounts and ongoing tax residency in ${country}`,
        ].map((tie, i) => (
          <div key={i} style={{ marginBottom: "5px", fontSize: "11px", color: "rgba(245,240,232,0.72)" }}>· {tie}</div>
        ))}
      </div>
      <div style={st.sections}>§3 — E-2 Renewal Plan · §4 — Intent Evidence Exhibits · [3–5 pages + exhibits]</div>
    </div>
  );

  return null;
}

export default function DocumentTabPreview({ data, consulateName, userName }: DocumentTabPreviewProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(201,168,76,0.15)", overflowX: "auto" }}>
        {TABS.map((tab, i) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "10px 18px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === i ? "2px solid #C9A84C" : "2px solid transparent",
              color: activeTab === i ? "#C9A84C" : "rgba(245,240,232,0.42)",
              fontSize: "11px",
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
              flexShrink: 0,
              transition: "color 0.15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ position: "relative", border: "1px solid rgba(201,168,76,0.12)", borderTop: "none", padding: "22px 24px 60px", background: "rgba(10,10,10,0.55)", minHeight: "230px" }}>
        <div style={{ position: "absolute", top: "14px", right: "16px", fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(201,168,76,0.35)", fontFamily: "'DM Sans', sans-serif" }}>
          {TABS[activeTab].pages}
        </div>
        <PreviewContent
          tabId={TABS[activeTab].id}
          data={data}
          consulateName={consulateName}
          userName={userName}
        />
        {/* Fade overlay */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "80px", background: "linear-gradient(to bottom, transparent, #0a0a0a)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "14px", pointerEvents: "none" }}>
          <span style={{ fontSize: "10px", color: "rgba(201,168,76,0.48)", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'DM Sans', sans-serif" }}>
            Full document unlocks after payment
          </span>
        </div>
      </div>
    </div>
  );
}
