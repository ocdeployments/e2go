'use client';

import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';

const sections: Section[] = [
  {
    id: "revenue-projections",
    title: "Revenue Projections",
    fields: [
      { key: "QI-01", type: "number", label: "What is your projected gross revenue for Year 1?", helperText: "Base this on FDD Item 19 data, market research, or comparable business performance. This figure appears in your business plan.", required: true, privacy_category: "required" },
      { key: "QI-02", type: "number", label: "What is your projected gross revenue for Year 3?", required: true, privacy_category: "required" },
      { key: "QI-03", type: "multiselect", label: "What is the basis for your revenue projections?", options: [{value: "FDD Item 19 (franchise disclosure data)", label: "FDD Item 19 (franchise disclosure data)"}, {value: "Market research", label: "Market research"}, {value: "Prior owner financials", label: "Prior owner financials"}, {value: "Industry benchmarks", label: "Industry benchmarks"}, {value: "Personal experience estimate", label: "Personal experience estimate"}, {value: "Professional business plan", label: "Professional business plan"}, {value: "Other", label: "Other"}], required: true, privacy_category: "required" },
      { key: "QI-04", type: "number", label: "What will your annual salary or draw from the business be in Year 1?", helperText: "Used to calculate the marginality ratio. Must be reasonable relative to revenue.", required: true, privacy_category: "required" }
    ]
  },
  {
    id: "job-creation",
    title: "Job Creation",
    fields: [
      { key: "QI-05", type: "number", label: "How many full-time U.S. employees will you hire in Year 1?", helperText: "Full-time = 35+ hours per week. Officers look for job creation beyond your role.", required: true, privacy_category: "required" },
      { key: "QI-06", type: "number", label: "How many part-time U.S. employees will you hire in Year 1?", required: true, privacy_category: "green" },
      { key: "QI-07", type: "text", label: "What are the planned roles for Year 1 hires?", helperText: "List job titles and approximate wages. Example: 2 × Caregiver ($18/hr), 1 × Coordinator ($22/hr)", required: true, privacy_category: "green" },
      { key: "QI-08", type: "number", label: "What is your Year 3 total employee count projection?", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "economic-contribution",
    title: "Economic Contribution",
    fields: [
      { key: "QI-09", type: "select", label: "Does the business produce goods or services for the U.S. market beyond supporting your household?", options: [{value: "Yes — serves U.S. customers directly", label: "Yes — serves U.S. customers directly"}, {value: "Yes — provides B2B services to U.S. businesses", label: "Yes — provides B2B services to U.S. businesses"}, {value: "Primarily supports my own income", label: "Primarily supports my own income"}, {value: "Not yet operational", label: "Not yet operational"}], required: true, privacy_category: "required" },
      { key: "QI-10", type: "multiselect", label: "What evidence supports your non-marginality argument?", options: [{value: "FDD performance data", label: "FDD performance data"}, {value: "Signed client contracts", label: "Signed client contracts"}, {value: "Letters of intent", label: "Letters of intent"}, {value: "Market research report", label: "Market research report"}, {value: "Prior owner financials", label: "Prior owner financials"}, {value: "Industry association data", label: "Industry association data"}, {value: "Business plan projections", label: "Business plan projections"}], required: true, privacy_category: "green" }
    ]
  }
];

function TabIContent() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Non-Marginality Evidence"
      tabDescription="Provide proof that your business will contribute significantly to the U.S. economy."
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

export default function TabIPage() {
  return (
    <ApplicationProvider>
      <TabIContent />
    </ApplicationProvider>
  );
}
