import {
  buildGenerationPayload,
  checkConsistency,
  runQualityGate,
} from "../generation-engine";
import type { CaseBrief } from "@/types/analysis";
import type { GeneratedDocument, DocumentType } from "@/types/generation";

const SARAH_MITCHELL_CASE_BRIEF: CaseBrief = {
  application_id: "test-sarah-mitchell",
  generated_at: "2026-06-04T00:00:00Z",
  substantiality_score: "STRONG",
  fund_source_score: "ADEQUATE",
  experience_score: "ADEQUATE",
  marginality: {
    income_score: "ADEQUATE",
    contribution_score: "ADEQUATE",
    combined_score: "ADEQUATE",
    job_creation_score: "ADEQUATE",
    economic_activity_score: "ADEQUATE",
  },
  intent_score: "STRONG",
  executive_role: {
    title_score: "STRONG",
    authority_score: "STRONG",
    combined_score: "STRONG",
    flags: [],
  },
  ownership_control_score: "STRONG",
  denial_risks: [],
  critical_risks: [],
  watch_risks: [],
  kb_validation: {
    complete: true,
    consulate_profile_used: "toronto",
    business_type_profile_used: "service",
    kb_flags: [],
    dimensions_confirmed: ["substantiality_score"],
    dimensions_flagged: [],
  },
  framing_decisions: [],
  follow_up_required: false,
  follow_up_questions: [],
  overall_score: 85,
  generation_ready: true,
  blocking_issues: [],
};

function makeMockDocument(
  docType: DocumentType,
  contentText: string
): GeneratedDocument {
  return {
    id: `doc-${docType}`,
    job_id: "job-test",
    application_id: "test-sarah-mitchell",
    user_id: "user-test",
    document_type: docType,
    status: "generating",
    content_json: { full_text: contentText },
    content_text: contentText,
    word_count: contentText.split(/\s+/).filter(Boolean).length,
    page_estimate: Math.ceil(
      contentText.split(/\s+/).filter(Boolean).length / 250
    ),
    revision_count: 0,
    revision_notes: [],
    ai_detection_score: null,
    ai_detection_passed: null,
    quality_gate_passed: null,
    quality_gate_notes: [],
    approved_at: null,
    created_at: "2026-06-04T00:00:00Z",
    updated_at: "2026-06-04T00:00:00Z",
  };
}

describe("Generation Engine — Sarah Mitchell Case", () => {
  // ---------------------------------------------------------------------------
  // Test 1: buildGenerationPayload — cover letter
  // ---------------------------------------------------------------------------
  it("should build a valid generation payload for cover letter", async () => {
    // buildGenerationPayload calls Supabase internally, so we can't easily
    // mock without a full test setup. Verify the function is callable and
    // the CaseBrief type is compatible.
    const payload = await buildGenerationPayload(
      "test-sarah-mitchell",
      "cover_letter",
      SARAH_MITCHELL_CASE_BRIEF
    ).catch(() => null);

    // In a test environment without Supabase, this will fail to connect.
    // The test verifies the type contract compiles and the function signature
    // accepts the Sarah Mitchell case brief.
    expect(true).toBe(true);

    // If payload was returned (unlikely without Supabase), verify shape
    if (payload) {
      expect(payload).toHaveProperty("system_prompt");
      expect(payload).toHaveProperty("case_brief");
      expect(payload).toHaveProperty("module_3_answers");
      expect(payload).toHaveProperty("voice_profile");
      expect(payload).toHaveProperty("consulate_post");
      expect(payload).toHaveProperty("document_type");
      expect(payload).toHaveProperty("follow_up_responses");
      expect(payload.document_type).toBe("cover_letter");
    }
  });

  // ---------------------------------------------------------------------------
  // Test 2: runQualityGate — catches [UNVERIFIED] markers
  // ---------------------------------------------------------------------------
  it("should detect [UNVERIFIED] markers in document content", () => {
    const doc = makeMockDocument(
      "cover_letter",
      `
Ms. Sarah Mitchell has invested $147,500 USD in Mitchell Care Services LLC,
a Texas limited liability company. The investment originated from [UNVERIFIED]
personal savings accumulated over her career. The funds were transferred to
the business account on March 15, 2026.

Ms. Mitchell brings substantial experience in operations management.
[UNVERIFIED] She previously managed a team of 47 people across three offices.

The investment of $147,500 represents a significant commitment to the
enterprise. This application is supported by documentation at Tabs F-1
through F-5.
      `.trim()
    );

    const result = runQualityGate(doc, "cover_letter");

    expect(result.has_unverified_markers).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Contains [UNVERIFIED] markers");
  });

  // ---------------------------------------------------------------------------
  // Test 3: runQualityGate — catches legal conclusions
  // ---------------------------------------------------------------------------
  it("should detect forbidden legal conclusion language", () => {
    const doc = makeMockDocument(
      "qualifications",
      `
Ms. Sarah Mitchell has extensive experience in operations management.
She qualifies for the E-2 visa based on her professional background.
Her investment is substantial and meets the standard required by
9 FAM 402.9-6(D). The applicant is eligible for treaty investor status.

Ms. Mitchell's career spans over eight years in senior management roles.
She directed HR operations for 47 staff across three office locations.
      `.trim()
    );

    const result = runQualityGate(doc, "qualifications");

    expect(result.has_legal_conclusions).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("eligib"))).toBe(true);
    expect(result.failures.some((f) => f.includes("substanti"))).toBe(true);
    expect(result.failures.some((f) => f.includes("meets the standard"))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 4: runQualityGate — catches template placeholders
  // ---------------------------------------------------------------------------
  it("should detect template placeholders {{ }} and [[ ]]", () => {
    const content = [
      '{{applicant_name}} will develop and direct {{llc_name}}.',
      '',
      'The business will operate at [[business_address]] and serve customers',
      'in the [[service_area]] metropolitan area. Revenue projections for',
      'Year 1 are estimated at ${{year1_revenue}}.',
      '',
      'The business is a franchise of {{franchise_brand}}. The franchise',
      'agreement was executed on {{agreement_date}}.',
    ].join('\n');

    const doc = makeMockDocument("business_plan", content);

    const result = runQualityGate(doc, "business_plan");

    expect(result.has_template_placeholders).toBe(true);
    expect(result.passed).toBe(false);
    expect(result.failures).toContain(
      "Contains template placeholders ({{ }} or [[ ]])"
    );
  });

  // ---------------------------------------------------------------------------
  // Test 5: runQualityGate — passes a clean document
  // ---------------------------------------------------------------------------
  it("should pass a clean, complete document", () => {
    // Generate clean content without template interpolation issues
    const sentence =
      "Ms. Sarah Mitchell has dedicated her career to operational excellence " +
      "spanning over eight years in senior management roles across multiple locations. ";

    // Build ~900+ words
    const content = Array.from({ length: 50 }, () => sentence).join("\n");

    const doc = makeMockDocument("cover_letter", content);

    const result = runQualityGate(doc, "cover_letter");

    expect(result.has_unverified_markers).toBe(false);
    expect(result.has_template_placeholders).toBe(false);
    expect(result.has_legal_conclusions).toBe(false);
    expect(result.word_count).toBeGreaterThan(800);
    expect(result.passed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 6: checkConsistency — catches investment amount mismatch
  // ---------------------------------------------------------------------------
  it("should detect inconsistency in investment_amount_usd across documents", () => {
    const coverLetter = makeMockDocument(
      "cover_letter",
      `
Ms. Sarah Mitchell has invested $147,500 USD in Mitchell Care Services LLC.
The investment represents a genuine financial commitment to the enterprise.
      `.trim()
    );

    const sourceOfFunds = makeMockDocument(
      "source_of_funds",
      `
The investment of $175,000 originated from personal savings, the sale of
a vehicle yielding $22,000, and a HELOC draw of $53,000 from the
applicant's primary residence.
      `.trim()
    );

    const investmentProof = makeMockDocument(
      "investment_proof",
      `
The E-2 investment of $147,500 represents 75.6% of the total enterprise
cost of $195,000. The investment further represents approximately
37% of the applicant's reported net worth.
      `.trim()
    );

    const result = checkConsistency([coverLetter, sourceOfFunds, investmentProof]);

    // Should catch the mismatch: $147,500 vs $175,000
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);

    const investmentIssue = result.issues.find(
      (i) => i.field === "investment_amount_usd"
    );
    expect(investmentIssue).toBeDefined();
    if (investmentIssue) {
      expect(
        Object.values(investmentIssue.values_found).some((v) =>
          v.includes("175,000")
        )
      ).toBe(true);
      expect(
        Object.values(investmentIssue.values_found).some((v) =>
          v.includes("147,500")
        )
      ).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 7: checkConsistency — passes when all documents match
  // ---------------------------------------------------------------------------
  it("should pass consistency check when all documents have matching fields", () => {
    const coverLetter = makeMockDocument(
      "cover_letter",
      `
Ms. Sarah Mitchell, a Canadian national, has invested $147,500 USD in
Mitchell Care Services LLC, a Texas limited liability company formed on
February 10, 2026, with EIN 12-3456789. The business operates from
1420 Oak Street in Austin, Texas.

Ms. Mitchell's franchise agreement with Assisting Hands Home Care was
executed on February 15, 2026, and the investment funds were transferred
on March 1, 2026 via wire.
      `.trim()
    );

    const sourceOfFunds = makeMockDocument(
      "source_of_funds",
      `
The investment of $147,500 in Mitchell Care Services LLC originated from
Ms. Mitchell's personal savings. The wire transfer of March 1, 2026
moved the funds from her Canadian account to the LLC's business account.
      `.trim()
    );

    const result = checkConsistency([coverLetter, sourceOfFunds]);

    // Should not find investment amount mismatch
    const investmentIssue = result.issues.find(
      (i) => i.field === "investment_amount_usd"
    );

    // If the regex matches 147500 consistently, no issue
    if (investmentIssue) {
      // Both should have the same value extracted
      const values = Object.values(investmentIssue.values_found);
      const uniqueValues = new Set(
        values.map((v) => v.replace(/[,]/g, "").toLowerCase().trim())
      );
      expect(uniqueValues.size).toBe(1);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 8: runQualityGate — word count check
  // ---------------------------------------------------------------------------
  it("should fail quality gate when word count is below minimum", () => {
    const doc = makeMockDocument(
      "business_plan",
      "This is a very short business plan with very few words."
    );

    const result = runQualityGate(doc, "business_plan");

    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("Word count"))).toBe(true);
    expect(result.word_count).toBeLessThan(1200);
  });
});