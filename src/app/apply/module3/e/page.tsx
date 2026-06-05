'use client';

import { useEffect, useState } from 'react';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import ContradictionFlag from '@/components/ContradictionFlag';
import { Section, FieldConfig } from '@/types/module3';

const baseSections: Section[] = [
  {
    id: "ownership",
    title: "Ownership & Equity",
    fields: [
      { key: "QE-01", type: "text", label: "What percentage of the U.S. business will you own?", helperText: "You must own more than 50% OR have operational control through other means to qualify as the controlling investor.", required: true, privacy_category: "required" },
      { key: "QE-02", type: "multi_select", label: "How is your ownership documented?", options: [{value: "LLC Membership Agreement", label: "LLC Membership Agreement"}, {value: "Stock Certificate", label: "Stock Certificate"}, {value: "Operating Agreement", label: "Operating Agreement"}, {value: "Partnership Agreement", label: "Partnership Agreement"}, {value: "Articles of Incorporation", label: "Articles of Incorporation"}, {value: "Other", label: "Other"}], required: true, privacy_category: "required" },
      { key: "QE-03", type: "select", label: "Will you have any business partners?", options: [{value: "No — I am the sole owner", label: "No — I am the sole owner"}, {value: "Yes — one partner", label: "Yes — one partner"}, {value: "Yes — two or more partners", label: "Yes — two or more partners"}], required: true, privacy_category: "amber" },
      { key: "QE-04", type: "text", label: "What percentage will your partner(s) own?", helperText: "List each partner and their percentage. All ownership must total 100%.", required: false, privacy_category: "amber" },
      { key: "QE-05", type: "select", label: "Will any partner also apply for E-2 status?", options: [{value: "Yes — joint E-2 application", label: "Yes — joint E-2 application"}, {value: "No — partner is a U.S. citizen or resident", label: "No — partner is a U.S. citizen or resident"}, {value: "No — partner will not be in the U.S.", label: "No — partner will not be in the U.S."}, {value: "Not yet determined", label: "Not yet determined"}], required: false, privacy_category: "amber" }
    ]
  },
  {
    id: "control",
    title: "Control & Management",
    fields: [
      { key: "QE-06", type: "text", label: "What will your official title be in the business?", helperText: "This appears on your organizational chart and cover letter. Use your exact proposed title.", required: true, privacy_category: "required" },
      { key: "QE-07", type: "select", label: "Will you have authority to hire and terminate employees?", options: [{value: "Yes — full authority", label: "Yes — full authority"}, {value: "Yes — with co-approval required", label: "Yes — with co-approval required"}, {value: "No — handled by someone else", label: "No — handled by someone else"}, {value: "Not yet determined", label: "Not yet determined"}], required: true, privacy_category: "required" },
      { key: "QE-08", type: "select", label: "Will you be responsible for day-to-day operational decisions?", options: [{value: "Yes — full operational control", label: "Yes — full operational control"}, {value: "Partially — shared with a manager", label: "Partially — shared with a manager"}, {value: "No — I will focus on strategy only", label: "No — I will focus on strategy only"}], required: true, privacy_category: "required" },
      { key: "QE-09", type: "select", label: "Will you have authority to sign contracts and financial commitments on behalf of the business?", options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}, {value: "Shared with partner", label: "Shared with partner"}], required: true, privacy_category: "required" }
    ]
  },
  {
    id: "corporate",
    title: "Corporate Structure",
    fields: [
      { key: "QE-10", type: "select", label: "What is the legal structure of the U.S. business?", options: [{value: "LLC", label: "LLC"}, {value: "C-Corporation", label: "C-Corporation"}, {value: "S-Corporation", label: "S-Corporation"}, {value: "Sole Proprietorship", label: "Sole Proprietorship"}, {value: "Partnership", label: "Partnership"}, {value: "Other", label: "Other"}], required: true, privacy_category: "required" },
      { key: "QE-11", type: "select", label: "In which U.S. state is or will the business be registered?", options: [], required: true, privacy_category: "required" },
      { key: "QE-12", type: "select", label: "Has the business entity been formed yet?", options: [{value: "Yes — already formed and registered", label: "Yes — already formed and registered"}, {value: "No — formation is in progress", label: "No — formation is in progress"}, {value: "No — not yet started", label: "No — not yet started"}], required: true, privacy_category: "required" },
      { key: "QE-13", type: "text", label: "What is the exact legal name of the U.S. business entity?", helperText: "Must match your formation documents exactly. This name appears across all 11 tabs.", required: false, privacy_category: "required" }
    ]
  }
];

function TabEContent() {
  const { answers, setAnswer } = useApplication();
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    const tabABusinessName = answers["M3-A-51"] as string | undefined;
    const tabAOwnershipPct = answers["M3-A-55"] as string | undefined;

    const enrichedSections = baseSections.map(section => ({
      ...section,
      fields: section.fields.map(field => {
        let enrichedField = { ...field };

        // Business Name pre-fill (Tab A M3-A-51 -> Tab E QE-13)
        if (field.key === "QE-13" && tabABusinessName) {
          enrichedField = {
            ...enrichedField,
            prefillValue: tabABusinessName,
            prefillNote: "From your business details (Tab A)",
          };
        }

        // Ownership % pre-fill (Tab A M3-A-55 -> Tab E QE-01)
        if (field.key === "QE-01" && tabAOwnershipPct) {
          enrichedField = {
            ...enrichedField,
            prefillValue: tabAOwnershipPct,
            prefillNote: "From your business details (Tab A)",
          };
        }

        return enrichedField as FieldConfig;
      }),
    }));

    setSections(enrichedSections);
  }, [answers]);

  return (
    <div>
      {/* Contradiction Flag for Ownership % */}
      {answers["M3-A-55"] && answers["QE-01"] && String(answers["M3-A-55"]) !== String(answers["QE-01"]) && (
        <div className="max-w-4xl mx-auto px-4 mb-4">
          <ContradictionFlag
            fieldALabel="Tab A (Master)"
            fieldAValue={String(answers["M3-A-55"])}
            fieldBLabel="Tab E"
            fieldBValue={String(answers["QE-01"])}
            onUseA={() => setAnswer("QE-01", answers["M3-A-55"])}
            onUseB={() => setAnswer("M3-A-55", answers["QE-01"])}
          />
        </div>
      )}

      <TabPage
        tabTitle="Ownership Structure"
        tabDescription="Define your ownership, corporate structure, and operational authority."
        sections={sections}
        answers={answers}
        onAnswerChange={(key, val) => setAnswer(key, val)}
        onSaveSection={async () => {}}
      />
    </div>
  );
}

export default function TabEPage() {
  return (
    <ApplicationProvider applicationId="dummy-id">
      <TabEContent />
    </ApplicationProvider>
  );
}
