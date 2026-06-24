'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';

const sections: Section[] = [
  {
    id: "business-desc",
    title: "Business Description",
    fields: [
      { key: "QK-01", type: "textarea", label: "Describe your business in 2–3 sentences.", helperText: "Plain language — what it does, who it serves, where it operates.", required: true, privacy_category: "required" },
      { key: "QK-02", type: "textarea", label: "Who is your target market?", helperText: "Be specific — demographics, location, needs.", required: true, privacy_category: "required" },
      { key: "QK-03", type: "textarea", label: "Who are your main competitors?", required: true, privacy_category: "green" },
      { key: "QK-03b", type: "textarea", label: "What is your competitive advantage over them?", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "ops-plan",
    title: "Operations Plan",
    fields: [
      { key: "QK-04", type: "textarea", label: "How will the business operate day-to-day?", helperText: "Main activities, who does what, how services or products are delivered.", required: true, privacy_category: "required" },
      { key: "QK-05", type: "textarea", label: "Key operational milestones for Year 1", helperText: "Example: Month 1 — secure location, Month 3 — hire first employee, Month 6 — launch.", required: true, privacy_category: "green" },
      { key: "QK-06", type: "textarea", label: "Equipment, inventory, or technology required", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "financial-projections",
    title: "Financial Projections",
    fields: [
      { key: "QK-07", type: "textarea", label: "Startup costs by category", helperText: "Example: Franchise fee $45,000, Equipment $30,000, Working capital $72,500. Total must match your investment amount.", required: true, privacy_category: "required" },
      { key: "QK-08", type: "textarea", label: "Projected monthly revenue, months 1–6", helperText: "Month-by-month ramp-up. Must align with your Year 1 total in Tab I.", required: true, privacy_category: "required" },
      { key: "QK-09", type: "textarea", label: "Projected monthly operating expenses", helperText: "Rent, payroll, supplies, royalties, insurance, utilities, etc.", required: true, privacy_category: "required" },
      { key: "QK-10", type: "select", label: "When do you project the business will reach break-even?", options: [{value: "Within 6 months", label: "Within 6 months"}, {value: "6-12 months", label: "6-12 months"}, {value: "12-18 months", label: "12-18 months"}, {value: "18-24 months", label: "18-24 months"}, {value: "More than 24 months", label: "More than 24 months"}], required: true, privacy_category: "green" }
    ]
  },
  {
    id: "market-analysis",
    title: "Market Analysis",
    fields: [
      { key: "QK-11", type: "textarea", label: "Size of your target market", helperText: "Use data where possible — industry reports, census data, franchise disclosure figures. Estimate in dollars or number of potential customers.", required: true, privacy_category: "green" },
      { key: "QK-12", type: "textarea", label: "Market trends that support this business", helperText: "Why is now a good time? Demographic shifts, regulatory changes, demand growth.", required: true, privacy_category: "green" }
    ]
  },
  {
    id: "growth-strategy",
    title: "Growth Strategy",
    fields: [
      { key: "QK-13", type: "textarea", label: "Your 3-year growth plan", helperText: "Revenue, employees, locations, and market position by Year 3.", required: true, privacy_category: "green" },
      { key: "QK-14", type: "select", label: "Are there plans to expand beyond the initial location?", options: [{value: "Yes — multi-unit expansion planned", label: "Yes — multi-unit expansion planned"}, {value: "Possibly — evaluating after Year 1", label: "Possibly — evaluating after Year 1"}, {value: "No — single location focus", label: "No — single location focus"}], required: true, privacy_category: "green" }
    ]
  }
];

function TabKInner() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Business Plan"
      tabDescription="Provide a comprehensive operational and financial blueprint."
      tabLabel="Tab K • Module 3"
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

function TabKContent() {
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: app } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
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
      <TabKInner />
    </ApplicationProvider>
  );
}

export default function TabKPage() {
  return <TabKContent />;
}
