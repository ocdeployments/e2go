"use client";

import { useCallback, useEffect, useState } from "react";
import type { CaseProfileResponse } from "@/app/api/dashboard/case-profile/route";
import type { CaseCompletionResponse } from "@/app/api/case/completion/route";
import type { CardId } from "@/lib/field-registry";
import type { DocTypeValue } from "@/components/apply/DocumentImportHub";
import DocumentImportHub from "@/components/apply/DocumentImportHub";
import ControlPanel from "@/components/casefile/ControlPanel";
import PartnerInvitePanel from "@/components/dashboard/PartnerInvitePanel";
import CaseHeader from "@/components/casefile/CaseHeader";
import CardGrid from "@/components/casefile/CardGrid";
import CardDrawer from "@/components/casefile/CardDrawer";
import NameEditPanel from "@/components/casefile/NameEditPanel";
import FamilyMembersPanel from "@/components/casefile/FamilyMembersPanel";
import { GOLD, CREAM, INNER } from "@/components/casefile/tokens";

const ARCHETYPE_LABEL: Record<string, string> = {
  buyer: "Franchise Buyer",
  builder: "Business Builder",
  career_switcher: "Career Switcher",
  investor: "Capital Investor",
};

export default function CaseProfileNew() {
  const [data, setData] = useState<CaseProfileResponse | null>(null);
  const [completion, setCompletion] = useState<CaseCompletionResponse | null>(null);
  const [completionFailed, setCompletionFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openCardId, setOpenCardId] = useState<CardId | null>(null);
  const [uploadDocType, setUploadDocType] = useState<DocTypeValue | undefined>(undefined);
  const [uploadSignal, setUploadSignal] = useState(0);

  const reloadCompletion = useCallback(() => {
    fetch("/api/case/completion")
      .then((r) => {
        if (!r.ok) throw new Error("completion fetch failed");
        return r.json();
      })
      .then((json: CaseCompletionResponse) => {
        setCompletion(json);
        setCompletionFailed(false);
      })
      .catch(() => setCompletionFailed(true));
  }, []);

  const reloadProfile = useCallback(() => {
    fetch("/api/dashboard/case-profile")
      .then((r) => r.json())
      .then((profile: CaseProfileResponse) => {
        setData(profile);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    reloadCompletion();
  }, [reloadCompletion]);

  useEffect(() => { reloadProfile(); }, [reloadProfile]);

  if (loading || !data) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "13px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.4)" }}>
          Loading your case…
        </div>
      </div>
    );
  }

  const isFranchise = /franchise|franchis/i.test(data.businessType ?? "");
  const isPartnership = data.applicationTypeRaw === "partnership" || data.applicationTypeRaw === "spousal_partnership";
  const hasSpouse = data.familyMembers.some((m) => m.memberType === "spouse");
  const hasChildren = data.familyMembers.some((m) => m.memberType === "child");
  const packageLabel = data.archetype ? (ARCHETYPE_LABEL[data.archetype] ?? data.archetype) : null;
  const marketAnalysisHref = data.applicationId ? `/market-analysis?applicationId=${data.applicationId}` : "/market-analysis";

  const people = completion?.people ?? [
    { id: "principal", name: `${data.firstName ?? ""} ${data.lastName ?? ""}`.trim() || "You", role: "principal" as const, personCode: null },
  ];

  function handleUploadRequested(docType?: DocTypeValue) {
    setUploadDocType(docType);
    setUploadSignal((n) => n + 1);
  }

  function handleAnswerSaved() {
    reloadCompletion();
  }

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", padding: "32px 24px 80px" }}>
      <div style={{ maxWidth: "1040px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>

        <CaseHeader
          caseCode={data.caseCode}
          packageLabel={packageLabel}
          people={people}
          progressPct={completion?.progressPct ?? 0}
          nextBestAction={completion?.nextBestAction ?? null}
        />

        <NameEditPanel
          firstName={data.firstName}
          middleName={data.middleName}
          lastName={data.lastName}
          onSaved={() => reloadProfile()}
        />

        {completionFailed ? (
          <ControlPanel
            applicationId={data.applicationId}
            isFranchise={isFranchise}
            isPartnership={isPartnership}
            marketAnalysisHref={marketAnalysisHref}
          />
        ) : (
          <CardGrid completion={completion} onCardClick={setOpenCardId} />
        )}

        <FamilyMembersPanel
          isPartnership={isPartnership}
          hasSpouse={hasSpouse}
          hasChildren={hasChildren}
          familyMembersCaseData={data.familyMembers}
          onMembersChanged={() => reloadProfile()}
        />

        <DocumentImportHub
          applicationId={data.applicationId}
          onFieldsApplied={() => reloadProfile()}
          initialDocType={uploadDocType}
          openSignal={uploadSignal}
        />

        {/* ── Renewal Package ──────────────────────────────────────── */}
        <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }}>Renewal</div>
              <div style={{ fontSize: "18px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, color: CREAM, lineHeight: 1.2, marginBottom: "4px" }}>Renewal Package</div>
              <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.4)", lineHeight: 1.6 }}>
                Prepare your E-2 renewal application — actual vs. projected performance, updated cover letter, current ties narrative, and path-specific checklist.
              </div>
            </div>
            <a
              href="/renewal"
              style={{ flexShrink: 0, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "6px", padding: "8px 16px", color: GOLD, fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.02em" }}
            >
              Open →
            </a>
          </div>
        </div>

        {/* ── Partner 2 Information (partnership applications only) ── */}
        {isPartnership && data.applicationId && (
          <div style={{ background: "rgba(201,168,76,0.04)", border: "1px solid rgba(201,168,76,0.15)", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "4px" }}>Partnership</div>
                <div style={{ fontSize: "18px", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 300, color: CREAM, lineHeight: 1.2, marginBottom: "4px" }}>Investor 2 Information</div>
                <div style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.4)", lineHeight: 1.6 }}>
                  Provide Partner 2&apos;s name, nationality, role, source of funds, and qualifications — required to generate Investor 2&apos;s separate document package.
                </div>
              </div>
              <a
                href={`/apply/partner2?applicationId=${data.applicationId}`}
                style={{ flexShrink: 0, background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: "6px", padding: "8px 16px", color: GOLD, fontSize: "12px", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textDecoration: "none", whiteSpace: "nowrap", letterSpacing: "0.02em" }}
              >
                Complete →
              </a>
            </div>
          </div>
        )}

        {/* ── Partner Access (Interview Prep Partnership buyers only) ── */}
        {data.hasInterviewPrepPartnership && (
          <div>
            <div style={{ fontSize: "8px", letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(201,168,76,0.5)", fontFamily: "'DM Sans', sans-serif", marginBottom: "8px" }}>Interview Prep Partnership</div>
            <PartnerInvitePanel existingInvite={data.partnerInvite} />
          </div>
        )}

        <div style={{ textAlign: "center", padding: "24px 0", borderTop: `1px solid ${INNER}`, marginTop: "8px" }}>
          <p style={{ fontSize: "11px", fontFamily: "'DM Sans', sans-serif", color: "rgba(245,240,232,0.18)", lineHeight: 1.7, margin: 0 }}>
            Click any card above to review or answer its remaining fields.
          </p>
        </div>

      </div>

      <CardDrawer
        cardId={openCardId}
        applicationId={data.applicationId}
        people={people}
        onClose={() => setOpenCardId(null)}
        onUploadRequested={handleUploadRequested}
        onAnswerSaved={handleAnswerSaved}
      />
    </div>
  );
}
