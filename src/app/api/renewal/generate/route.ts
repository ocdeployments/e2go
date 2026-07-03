import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase-service';
import { checkRateLimit } from '@/lib/rate-limit';
import { isKillSwitchEnabled } from '@/lib/kill-switch';
import { callLLM } from '@/lib/llm-client';
import { computeRenewalReconciliation } from '@/lib/renewal-reconciliation';

// POST /api/renewal/generate
// Generates the renewal document package (cover letter, BP update, Template 6, checklist)
// from the completed intake. Stores result in renewal_intakes.documents.

interface ProjectionRow {
  year: number;
  revenue: string;
  netIncome: string;
  employees: string;
}

interface RenewalAnswers {
  path?: string;
  'RQ-01-Y1'?: string; 'RQ-01-Y2'?: string; 'RQ-01-Y3'?: string;
  'RQ-01-NI-Y1'?: string; 'RQ-01-NI-Y2'?: string; 'RQ-01-NI-Y3'?: string;
  'RQ-02'?: string; 'RQ-03'?: string;
  'RQ-04'?: string; 'RQ-05'?: string; 'RQ-06'?: string;
  'RQ-07'?: string; 'RQ-08'?: string; 'RQ-08-detail'?: string;
  'RQ-09'?: string; 'RQ-10'?: string;
  'RQ-11'?: string; 'RQ-12'?: string; 'RQ-13'?: string;
  'RQ-14'?: string; 'RQ-15'?: string; 'RQ-15-detail'?: string;
  'RQ-B01'?: string; 'RQ-B02'?: string; 'RQ-B03'?: string;
  [key: string]: string | undefined;
}

function buildTemplate6(answers: RenewalAnswers, projections: ProjectionRow[], reconciliationSummary: string): string {
  const years = projections.length > 0 ? projections : [
    { year: 1, revenue: '', netIncome: '', employees: '' },
    { year: 2, revenue: '', netIncome: '', employees: '' },
    { year: 3, revenue: '', netIncome: '', employees: '' },
  ];

  const fmt = (v: string | undefined) => v ? `$${v}` : '—';

  const rows = years.map(row => {
    const actualRev   = answers[`RQ-01-Y${row.year}`];
    const actualNI    = answers[`RQ-01-NI-Y${row.year}`];
    const actualFT    = row.year === 1 ? answers['RQ-02'] : null;
    const actualPT    = row.year === 1 ? answers['RQ-03'] : null;

    return `YEAR ${row.year}
  Revenue:        Projected: ${fmt(row.revenue)}    Actual: ${fmt(actualRev)}
  Net Income:     Projected: ${fmt(row.netIncome)}    Actual: ${fmt(actualNI)}
  FT Employees:   Projected: ${row.employees || '—'}          Actual: ${actualFT ?? '—'}
  PT Employees:   Projected: —                    Actual: ${actualPT ?? '—'}`;
  }).join('\n\n');

  const ftNow = answers['RQ-02'] ?? 'not provided';
  const ptNow = answers['RQ-03'] ?? 'not provided';

  return `TEMPLATE 6 — ACTUAL VS. PROJECTED PERFORMANCE
E-2 Visa Renewal — Business Performance Summary

${rows}

CURRENT STAFFING (at time of renewal)
  Full-time U.S. employees: ${ftNow}
  Part-time U.S. employees: ${ptNow}

Note: Projected figures are from the original E-2 application business plan.
Actual figures are self-reported by the applicant for this renewal cycle.

PROMISE VS. DELIVERY
${reconciliationSummary}`;
}

function buildChecklist(path: string): string {
  if (path === 'uscis') {
    return `E-2 RENEWAL CHECKLIST — PATH B (USCIS I-129)

FORMS
  ☐ Form I-129 (Petition for Nonimmigrant Worker) — current edition
  ☐ E Classification Supplement to Form I-129
  ☐ Form I-539 (if extending status for dependants in derivative E-2S)

SUPPORTING DOCUMENTS
  ☐ Copy of valid passport (all pages with stamps)
  ☐ Copy of I-94 (current status record from CBP website)
  ☐ Copy of prior E-2 visa and I-797 approval notices (if applicable)
  ☐ Copy of articles of incorporation / LLC operating agreement
  ☐ Evidence of at least 50% ownership (cap table, operating agreement, stock cert)
  ☐ 3 years of business tax returns (or all available if <3 years)
  ☐ Current bank statements (most recent 3 months, business + personal)
  ☐ Business financial statements (P&L, balance sheet — current year)
  ☐ Evidence of active operations (invoices, contracts, lease, payroll records)
  ☐ Payroll records or evidence of U.S. employees (W-2s, paystubs)

E2GO GENERATED DOCUMENTS (include in submission)
  ☐ Updated cover letter (E-2 renewal narrative)
  ☐ Template 6 — Actual vs. Projected Performance table
  ☐ Business plan update (condensed — current operations + forward projections)

FILING INSTRUCTIONS
  • File with the appropriate USCIS Service Center per Form I-129 instructions
  • Do NOT travel internationally after filing without Advance Parole (or re-entry risk)
  • Processing time: 3–6 months regular; 15 business days premium ($2,805 fee)
  • File at least 4–6 months before current I-94 expiry`;
  }

  return `E-2 RENEWAL CHECKLIST — PATH A (TORONTO CONSULATE)

FORMS
  ☐ DS-160 Online Nonimmigrant Visa Application (new submission required)
  ☐ DS-156E Nonimmigrant Treaty Trader/Investor Application

APPOINTMENT
  ☐ Schedule interview at U.S. Consulate General Toronto (ustraveldocs.com/ca)
  ☐ Pay MRV application fee ($205 USD)
  ☐ Prepare for biometrics appointment (if required)

CONSULATE BINDER — ARRANGE IN THIS ORDER
  Tab 1:  DS-160 confirmation page + interview appointment letter
  Tab 2:  Valid passport (and prior passport with E-2 stamps if available)
  Tab 3:  e2go cover letter (updated for renewal)
  Tab 4:  Template 6 — Actual vs. Projected Performance table
  Tab 5:  3 years of business tax returns (most recent year on top)
  Tab 6:  Current business bank statements (3 months)
  Tab 7:  Business financial statements (P&L + balance sheet)
  Tab 8:  Evidence of business operations (invoices, contracts, lease)
  Tab 9:  Payroll records / evidence of U.S. employees
  Tab 10: Updated business plan (condensed renewal version)
  Tab 11: Evidence of home-country ties (property, accounts, family)
  Tab 12: Articles of incorporation / LLC operating agreement
  Tab 13: Evidence of ownership (cap table or operating agreement)

TIPS
  • Arrive 15 minutes early — no phones or laptops inside the consulate
  • Bring originals AND photocopies of all documents
  • Officer may ask you to demonstrate the business is still actively operating
  • Renewal interview is typically shorter than original — focus on performance data`;
}

async function generateCoverLetter(answers: RenewalAnswers, businessName: string, applicantName: string, reconciliationSummary: string): Promise<string | null> {
  const profitLabel: Record<string, string> = {
    'yes': 'consistently profitable',
    'yes-recently': 'recently profitable',
    'breakeven': 'operating at break-even',
    'not-yet': 'in growth phase (pre-profitability)',
    'loss': 'operating at a loss (explained in context)',
  };

  const hiringLabel: Record<string, string> = {
    'exceeded': 'exceeded original hiring projections',
    'met': 'met original hiring projections',
    'short': 'fell short of original hiring projections',
    'na': 'does not apply to this business model',
  };

  const prompt = `You are a senior U.S. immigration attorney drafting an E-2 visa renewal cover letter for a Canadian investor.

INVESTOR: ${applicantName || 'the applicant'}
BUSINESS: ${businessName || 'the business'}
RENEWAL PATH: ${answers.path === 'uscis' ? 'USCIS I-129 Status Extension (Path B)' : 'U.S. Consulate Toronto (Path A)'}
CURRENT PROFITABILITY: ${profitLabel[answers['RQ-07'] ?? ''] ?? 'not specified'}
HIRING: ${hiringLabel[answers['RQ-10'] ?? ''] ?? 'not specified'}
FULL-TIME EMPLOYEES NOW: ${answers['RQ-02'] ?? 'not provided'}
PART-TIME EMPLOYEES NOW: ${answers['RQ-03'] ?? 'not provided'}

BUSINESS GROWTH NARRATIVE:
${answers['RQ-04'] ?? 'Not provided.'}

CHALLENGES ADDRESSED:
${answers['RQ-05'] ?? 'None noted.'}

ADDITIONAL INVESTMENT SINCE ORIGINAL: $${answers['RQ-06'] ?? '0'}

CURRENT ROLE:
${answers['RQ-09'] ?? 'Not provided.'}

CANADIAN TIES:
${answers['RQ-13'] ?? 'Not provided.'}

PROMISE VS. DELIVERY (cite these exact figures where relevant — do not invent others):
${reconciliationSummary}

Write a formal E-2 renewal cover letter (600–800 words). The letter must:
1. Open by identifying the applicant, business, and that this is a renewal of E-2 treaty investor status
2. Summarise business performance — growth since original application, current profitability status, employees. Where the promise-vs-delivery figures above are available, state the original projection next to the actual result explicitly (an officer checks this first).
3. Address the develop-and-direct element — investor's active management role (use the current role description above)
4. Address non-immigrant intent — Canadian ties retained (use the ties section above)
5. Close with a request for renewal and statement of continued compliance

Format: formal business letter style, no markdown, no bullets inside the body. Use paragraph breaks only.
Do not use placeholder brackets — if information is missing, write around it naturally.`;

  return callLLM({
    task: 'coaching',
    messages: [
      { role: 'system', content: 'You are a senior immigration attorney. Write formal, precise legal correspondence. No filler language. Every sentence earns its place.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });
}

async function generateBPUpdate(answers: RenewalAnswers, businessName: string, reconciliationSummary: string): Promise<string | null> {
  const prompt = `You are an immigration consultant writing a condensed business plan update for an E-2 visa renewal.

BUSINESS: ${businessName || 'the business'}
RENEWAL PATH: ${answers.path === 'uscis' ? 'USCIS I-129 Extension' : 'Toronto Consulate Renewal'}

PERFORMANCE DATA:
- Year 1 actual revenue: $${answers['RQ-01-Y1'] ?? 'not provided'}
- Year 2 actual revenue: $${answers['RQ-01-Y2'] ?? 'not provided'}
- Year 3 actual revenue: $${answers['RQ-01-Y3'] ?? 'not provided'}
- Current employees (FT/PT): ${answers['RQ-02'] ?? '?'} / ${answers['RQ-03'] ?? '?'}
- Profitability: ${answers['RQ-07'] ?? 'not specified'}
- Growth narrative: ${answers['RQ-04'] ?? 'not provided'}
- Challenges: ${answers['RQ-05'] ?? 'none noted'}
- Additional investment made: $${answers['RQ-06'] ?? '0'}
- Ownership changes: ${answers['RQ-08'] === 'no' ? 'None' : answers['RQ-08-detail'] ?? 'None'}

PROMISE VS. DELIVERY (cite these exact figures where relevant — do not invent others):
${reconciliationSummary}

Write a condensed 4-section business plan update (approximately 500 words total):

SECTION 1 — BUSINESS OVERVIEW (current state)
Describe what the business does today, its current operating status, and how it has evolved since the original E-2 application.

SECTION 2 — PERFORMANCE SUMMARY
Summarise actual financial and employment performance vs. original projections, citing the promise-vs-delivery figures above explicitly. Explain any variances honestly and professionally.

SECTION 3 — CURRENT OPERATIONS
Describe current operations, staffing, management structure, and market position.

SECTION 4 — FORWARD PROJECTIONS (next 2–3 years)
Realistic projections based on current trajectory. Keep this brief and grounded.

Format: plain text, section headers in CAPS, no markdown bullets inside sections. Professional business writing tone.`;

  return callLLM({
    task: 'coaching',
    messages: [
      { role: 'system', content: 'You are a professional business writer specialising in immigration document preparation. Write clear, credible, factual content. No exaggeration.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 900,
  });
}

export async function POST(request: NextRequest) {
  const auth = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await auth.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await checkRateLimit(user.id, 'generate');
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait before generating again.' }, { status: 429 });
  }

  if (await isKillSwitchEnabled()) {
    return NextResponse.json({ error: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }

  const body = await request.json() as { intakeId: string };
  const { intakeId } = body;
  if (!intakeId) {
    return NextResponse.json({ error: 'Missing intakeId' }, { status: 400 });
  }

  const svc = createServiceClient();

  // Verify payment
  const { data: payment } = await svc
    .from('payments')
    .select('id')
    .eq('user_id', user.id)
    .eq('payment_type', 'renewal')
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return NextResponse.json({ error: 'Renewal not purchased' }, { status: 403 });
  }

  // Load intake and verify ownership
  const { data: intake } = await svc
    .from('renewal_intakes')
    .select('id, path, answers, application_id, user_id')
    .eq('id', intakeId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!intake) {
    return NextResponse.json({ error: 'Intake not found' }, { status: 404 });
  }

  if (!intake.path) {
    return NextResponse.json({ error: 'Renewal path not selected. Please choose Path A or Path B in the intake.' }, { status: 400 });
  }

  // Mark as generating
  await svc
    .from('renewal_intakes')
    .update({ status: 'generating' })
    .eq('id', intakeId);

  const answers = (intake.answers ?? {}) as RenewalAnswers;

  // Fetch baseline projections and business name from original application
  let projections: ProjectionRow[] = [];
  let businessName = '';
  let applicantName = '';

  if (intake.application_id) {
    const { data: ansRows } = await svc
      .from('answers')
      .select('question_key, answer_value')
      .eq('application_id', intake.application_id)
      .in('question_key', ['M3-I-PROJECTIONS', 'M3-E-01', 'M3-J-01', 'Q0-10']);

    for (const row of ansRows ?? []) {
      if (row.question_key === 'M3-I-PROJECTIONS' && row.answer_value) {
        try { projections = JSON.parse(row.answer_value); } catch { /* skip */ }
      }
      if (row.question_key === 'M3-E-01' && row.answer_value) businessName = row.answer_value;
      if ((row.question_key === 'M3-J-01' || row.question_key === 'Q0-10') && row.answer_value && !applicantName) {
        applicantName = row.answer_value;
      }
    }

    // Fallback: get business_name from applications table
    if (!businessName) {
      const { data: app } = await svc
        .from('applications')
        .select('business_name')
        .eq('id', intake.application_id)
        .maybeSingle();
      if (app?.business_name) businessName = app.business_name;
    }
  }

  try {
    const reconciliation = computeRenewalReconciliation(projections, answers);

    // Generate 3 LLM documents in parallel + build 2 programmatically
    const [coverLetter, bpUpdate] = await Promise.all([
      generateCoverLetter(answers, businessName, applicantName, reconciliation.summary),
      generateBPUpdate(answers, businessName, reconciliation.summary),
    ]);

    const template6 = buildTemplate6(answers, projections, reconciliation.summary);
    const checklist = buildChecklist(intake.path);

    const documents = {
      cover_letter: coverLetter ?? '',
      bp_update: bpUpdate ?? '',
      template6,
      checklist,
      reconciliation,
      generated_at: new Date().toISOString(),
      path: intake.path,
    };

    await svc
      .from('renewal_intakes')
      .update({
        documents,
        status: 'generated',
        generated_at: new Date().toISOString(),
      })
      .eq('id', intakeId);

    return NextResponse.json({ generated: true, documents });
  } catch (error) {
    console.error('[renewal/generate] Pipeline error:', error);
    await svc
      .from('renewal_intakes')
      .update({ status: 'complete' })
      .eq('id', intakeId);
    return NextResponse.json({ error: 'Generation failed. Your intake is saved — please try again.' }, { status: 500 });
  }
}
