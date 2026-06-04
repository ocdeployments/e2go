'use client';

import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';

const sections: Section[] = [
  {
    id: "business-desc",
    title: "Business Description",
    fields: [
      { key: "QK-01", type: "text", label: "Describe your business in 2-3 sentences.", helperText: "Plain language. What does it do, who does it serve, where does it operate?", required: true, privacy_category: "required" },
      { key: "QK-02", type: "text", label: "What is your target market?", helperText: "Who are your customers? Be specific — demographics, location, needs.", required: true, privacy_category: "required" },
      { key: "QK-03", type: "text", label: "Who are your main competitors and what is your competitive advantage?", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "ops-plan",
    title: "Operations Plan",
    fields: [
      { key: "QK-04", type: "text", label: "How will the business operate day-to-day?", helperText: "Describe main activities, who does what, how services/products are delivered.", required: true, privacy_category: "required" },
      { key: "QK-05", type: "text", label: "What are the key operational milestones for Year 1?", helperText: "Example: Month 1 — secure location, Month 3 — hire first employee, Month 6 — launch.", required: true, privacy_category: "green" },
      { key: "QK-06", type: "text", label: "What equipment, inventory, or technology does the business require?", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "financial-projections",
    title: "Financial Projections",
    fields: [
      { key: "QK-07", type: "text", label: "What are your startup costs broken down by category?", helperText: "Example: Franchise fee $45,000, Equipment $30,000, Working capital $72,500. Total must match your investment amount.", required: true, privacy_category: "required" },
      { key: "QK-08", type: "text", label: "What is your projected monthly revenue for months 1-6?", helperText: "Month-by-month breakdown showing ramp-up. Must align with your Year 1 total in Tab I.", required: true, privacy_category: "required" },
      { key: "QK-09", type: "text", label: "What are your projected monthly operating expenses?", helperText: "Rent, payroll, supplies, royalties, insurance, utilities, etc.", required: true, privacy_category: "required" },
      { key: "QK-10", type: "select", label: "When do you project the business will reach break-even?", options: [{value: "Within 6 months", label: "Within 6 months"}, {value: "6-12 months", label: "6-12 months"}, {value: "12-18 months", label: "12-18 months"}, {value: "18-24 months", label: "18-24 months"}, {value: "More than 24 months", label: "More than 24 months"}], required: true, privacy_category: "green" }
    ]
  },
  {
    id: "market-analysis",
    title: "Market Analysis",
    fields: [
      { key: "QK-11", type: "text", label: "What is the size of your target market?", helperText: "Use data where possible — industry reports, census data, franchise disclosure data.", required: true, privacy_category: "green" },
      { key: "QK-12", type: "text", label: "What market trends support your business?", helperText: "Why is now a good time for this business? Demographic trends, regulatory changes, demand shifts.", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "growth-strategy",
    title: "Growth Strategy",
    fields: [
      { key: "QK-13", type: "text", label: "What is your 3-year growth plan?", helperText: "Where will the business be in Year 3? Revenue, employees, locations, market position.", required: true, privacy_category: "green" },
      { key: "QK-14", type: "select", label: "Are there plans to expand beyond the initial location?", options: [{value: "Yes — multi-unit expansion planned", label: "Yes — multi-unit expansion planned"}, {value: "Possibly — evaluating after Year 1", label: "Possibly — evaluating after Year 1"}, {value: "No — single location focus", label: "No — single location focus"}], required: true, privacy_category: "green" }
    ]
  }
];

function TabKContent() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Business Plan"
      tabDescription="Provide a comprehensive operational and financial blueprint."
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

export default function TabKPage() {
  return (
    <ApplicationProvider>
      <TabKContent />
    </ApplicationProvider>
  );
}
