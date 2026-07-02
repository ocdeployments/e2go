'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';

const sections: Section[] = [
  {
    id: 'investment-summary',
    title: 'Investment Summary',
    fields: [
      {
        key: 'QF-01',
        type: 'text',
        label: 'Total investment committed to the U.S. business (USD)',
        helperText: 'Confirm or update the amount from your investment overview. Include all amounts spent or irrevocably committed.',
        required: true,
        privacy_category: 'required',
      },
    ],
  },
  {
    id: 'commitment-documentation',
    title: 'Commitment Documentation',
    fields: [
      {
        key: 'QF-02',
        type: 'select',
        label: 'Has a purchase agreement, franchise agreement, or similar commitment document been signed?',
        helperText: 'A signed agreement is strong evidence the investment is irrevocably committed — a core E-2 requirement.',
        options: [
          { value: 'signed', label: 'Yes — signed and dated' },
          { value: 'loi', label: 'Yes — letter of intent signed' },
          { value: 'in-negotiation', label: 'In negotiation — not yet signed' },
          { value: 'pre-commitment', label: 'No — pre-commitment stage' },
        ],
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-03',
        type: 'select',
        label: 'Do you have the signed agreement available to include in your submission?',
        options: [
          { value: 'yes', label: 'Yes — have the signed document' },
          { value: 'obtain', label: 'Yes — but need to obtain from counsel' },
          { value: 'no', label: 'No — not yet signed' },
        ],
        required: false,
        privacy_category: 'green',
      },
    ],
  },
  {
    id: 'wire-evidence',
    title: 'Wire Transfer Evidence',
    fields: [
      {
        key: 'QF-04',
        type: 'select',
        label: 'Do you have wire transfer confirmations or payment receipts showing the investment moved to the U.S.?',
        helperText: 'Wire records are among the most critical documents in an E-2 submission. Officers want to see the money physically move.',
        options: [
          { value: 'complete', label: 'Yes — full wire records available for all transfers' },
          { value: 'partial', label: 'Partial — some transfers not yet documented' },
          { value: 'none', label: 'No — transfers pending or records not yet compiled' },
        ],
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-05',
        type: 'textarea',
        label: 'List the wire transfers — dates, amounts, and recipient accounts',
        helperText: 'Example: "Wire 1: May 3, 2026 — $45,000 USD from RBC account to Subway Corporation franchise fee account." Include every significant transfer.',
        required: false,
        privacy_category: 'amber',
      },
    ],
  },
  {
    id: 'bank-statement-chain',
    title: 'Bank Statement Chain',
    fields: [
      {
        key: 'QF-06',
        type: 'select',
        label: 'Do you have bank statements showing the investment funds leaving your Canadian account?',
        helperText: 'The bank statement chain shows funds accumulating over time, then being deployed. Gaps in this chain raise officer questions.',
        options: [
          { value: '12-plus', label: 'Yes — 12+ months of statements covering the full timeline' },
          { value: '6-12', label: 'Yes — 6–12 months available' },
          { value: 'partial', label: 'Partial — less than 6 months' },
          { value: 'none', label: 'No — need to compile' },
        ],
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-07',
        type: 'select',
        label: 'Do you have statements for the U.S. business bank account showing funds received?',
        options: [
          { value: 'yes', label: 'Yes — account statement showing receipt available' },
          { value: 'open-no-statement', label: 'Account is open but no statement yet' },
          { value: 'no-account', label: 'U.S. business account not yet opened' },
        ],
        required: true,
        privacy_category: 'required',
      },
    ],
  },
  {
    id: 'source-of-wealth',
    title: 'Source of Wealth Documentation',
    fields: [
      {
        key: 'QF-08',
        type: 'textarea',
        label: 'What source-of-wealth documents do you currently have assembled?',
        helperText: 'Check all that apply: personal bank statements (12+ months), T4 or income records, business financials (self-employed), property sale closing statement, investment account statements, RRSP/TFSA withdrawal records + T4RSP slip, inheritance documentation, FX conversion records.',
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-09',
        type: 'select',
        label: 'If any funds were received as a gift or inheritance, do you have a signed gift letter?',
        helperText: 'Gift letters must include the donor relationship, amount, a statement no repayment is required, and ideally the donor\'s own source of funds.',
        options: [
          { value: 'yes', label: 'Yes — signed gift letter with donor details' },
          { value: 'in-progress', label: 'In preparation' },
          { value: 'na', label: 'Not applicable — no gift funds' },
        ],
        required: false,
        privacy_category: 'amber',
      },
    ],
  },
  {
    id: 'at-risk-confirmation',
    title: 'At-Risk Confirmation',
    fields: [
      {
        key: 'QF-10',
        type: 'select',
        label: 'Have funds been deployed — actually spent on business assets or expenses?',
        helperText: 'Under 9 FAM 402.9, investment capital must be "at risk" — irrevocably committed, not sitting in an account that can be recalled without consequence.',
        options: [
          { value: 'fully', label: 'Yes — fully deployed and at risk' },
          { value: 'partial', label: 'Partially deployed — balance committed but not yet spent' },
          { value: 'committed', label: 'Committed but not yet deployed' },
        ],
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-11',
        type: 'textarea',
        label: 'What specific evidence confirms the funds are at risk?',
        helperText: 'Examples: franchise fee paid (non-refundable), equipment purchased, leasehold improvements paid, lease signed with personal guarantee, attorney trust account holding funds for pending purchase.',
        required: true,
        privacy_category: 'required',
      },
    ],
  },
  {
    id: 'documentary-gaps',
    title: 'Documentary Gaps',
    fields: [
      {
        key: 'QF-12',
        type: 'select',
        label: 'Are there any gaps or complications in your investment paper trail?',
        helperText: 'Acknowledged gaps with explanations are far less damaging than gaps an officer finds on their own.',
        options: [
          { value: 'none', label: 'No — trail is clean and complete' },
          { value: 'minor', label: 'Minor gaps — some records need to be obtained' },
          { value: 'significant', label: 'Significant gaps — need guidance on documentation' },
        ],
        required: true,
        privacy_category: 'required',
      },
      {
        key: 'QF-13',
        type: 'textarea',
        label: 'Describe the gaps and what steps you are taking to address them',
        helperText: 'This answer shapes the documentary gap guidance in your case file.',
        required: false,
        privacy_category: 'amber',
      },
    ],
  },
];

function TabFContent() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Investment Evidence"
      tabDescription="Confirm what documentary evidence you have assembled to prove your investment is real and at risk."
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

export default function TabFPage() {
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const appId = await resolvePrimaryApplicationId(supabase, user.id);
      const app = appId ? { id: appId } : null;
      if (app) setApplicationId(app.id);
    };
    load();
  }, []);

  if (!applicationId) {
    return (
      <div style={{ color: 'rgba(245,240,232,0.72)', padding: '48px 24px', textAlign: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        Loading...
      </div>
    );
  }

  return (
    <ApplicationProvider applicationId={applicationId}>
      <TabFContent />
    </ApplicationProvider>
  );
}
