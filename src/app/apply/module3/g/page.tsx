'use client';

import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';

const sections: Section[] = [
  {
    id: "business-registration",
    title: "Business Registration",
    fields: [
      { key: "QG-01", type: "select", label: "Has your U.S. business been officially registered?", options: [{value: "Yes — registered and active", label: "Yes — registered and active"}, {value: "Registration in progress", label: "Registration in progress"}, {value: "Not yet registered", label: "Not yet registered"}], required: true, privacy_category: "required" },
      { key: "QG-02", type: "text", label: "What is the primary business activity?", helperText: "Describe what your business does in 2-3 sentences. Plain language not marketing copy.", required: true, privacy_category: "required" },
      { key: "QG-03", type: "select", label: "Does the business have a Federal Employer Identification Number (EIN)?", options: [{value: "Yes", label: "Yes"}, {value: "Applied — pending", label: "Applied — pending"}, {value: "Not yet applied", label: "Not yet applied"}], required: true, privacy_category: "required" }
    ]
  },
  {
    id: "physical-premises",
    title: "Physical Premises",
    fields: [
      { key: "QG-04", type: "select", label: "Does the business have a physical U.S. location?", options: [{value: "Yes — signed lease or owned property", label: "Yes — signed lease or owned property"}, {value: "Yes — franchise location assigned", label: "Yes — franchise location assigned"}, {value: "Not yet — location search in progress", label: "Not yet — location search in progress"}, {value: "Business operates remotely (no physical location)", label: "Business operates remotely (no physical location)"}], required: true, privacy_category: "required" },
      { key: "QG-05", type: "text", label: "What is the business address?", helperText: "If not yet finalized, provide the city and state where the business will operate.", required: false, privacy_category: "amber" },
      { key: "QG-06", type: "select", label: "What type of premises does the business occupy?", options: [{value: "Retail storefront", label: "Retail storefront"}, {value: "Office space", label: "Office space"}, {value: "Industrial or warehouse", label: "Industrial or warehouse"}, {value: "Home office", label: "Home office"}, {value: "Franchise-provided location", label: "Franchise-provided location"}, {value: "Other", label: "Other"}], required: true, privacy_category: "green" },
      { key: "QG-07", type: "select", label: "What is the lease term or ownership status?", options: [{value: "Multi-year lease (2+ years)", label: "Multi-year lease (2+ years)"}, {value: "Month-to-month lease", label: "Month-to-month lease"}, {value: "Owned property", label: "Owned property"}, {value: "Franchise agreement includes location", label: "Franchise agreement includes location"}, {value: "Not yet secured", label: "Not yet secured"}], required: false, privacy_category: "amber" }
    ]
  },
  {
    id: "operating",
    title: "Operating Evidence",
    fields: [
      { key: "QG-08", type: "select", label: "Is the business currently operational?", options: [{value: "Yes — actively operating", label: "Yes — actively operating"}, {value: "Partially — soft launch or pre-revenue", label: "Partially — soft launch or pre-revenue"}, {value: "No — pre-opening stage", label: "No — pre-opening stage"}, {value: "No — investment committed, opening pending", label: "No — investment committed, opening pending"}], required: true, privacy_category: "required" },
      { key: "QG-09", type: "multi_select", label: "Does the business have any customers or clients yet?", options: [{value: "Yes — paying customers", label: "Yes — paying customers"}, {value: "Yes — signed contracts pending start", label: "Yes — signed contracts pending start"}, {value: "No — pre-revenue", label: "No — pre-revenue"}, {value: "Not applicable (franchise pre-opening)", label: "Not applicable (franchise pre-opening)"}], required: true, privacy_category: "green" },
      { key: "QG-10", type: "text", label: "What licenses or permits does the business hold or have applied for?", helperText: "Include business license, industry-specific permits, health certificates, state/local operating permits.", required: false, privacy_category: "green" }
    ]
  }
];

function TabGContent() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Business Evidence"
      tabDescription="Provide details about your registration, physical location, and operations."
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

export default function TabGPage() {
  return (
    <ApplicationProvider>
      <TabGContent />
    </ApplicationProvider>
  );
}
