'use client';

import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';

const sections: Section[] = [
  {
    id: "investment-origin",
    title: "Investment Origin",
    fields: [
      { key: "QH-01", type: "currency", label: "What is the total amount invested or committed to the U.S. business?", helperText: "Must match your investment proof documents exactly. Include all funds deployed plus committed.", required: true, privacy_category: "required" },
      { key: "QH-02", type: "multi_select", label: "Where did the investment funds primarily come from?", options: [{value: "Personal savings (bank account)", label: "Personal savings (bank account)"}, {value: "Retirement account (RRSP, 401k, IRA, etc.)", label: "Retirement account (RRSP, 401k, IRA, etc.)"}, {value: "Sale of property", label: "Sale of property"}, {value: "Sale of a business", label: "Sale of a business"}, {value: "Inheritance or gift", label: "Inheritance or gift"}, {value: "Business profits", label: "Business profits"}, {value: "Loan (personal or business)", label: "Loan (personal or business)"}, {value: "Investment portfolio", label: "Investment portfolio"}, {value: "Other", label: "Other"}], required: true, privacy_category: "required" },
      { key: "QH-03", type: "select", label: "Over what time period were these funds accumulated?", options: [{value: "Less than 1 year", label: "Less than 1 year"}, {value: "1-3 years", label: "1-3 years"}, {value: "3-5 years", label: "3-5 years"}, {value: "5-10 years", label: "5-10 years"}, {value: "More than 10 years", label: "More than 10 years"}], required: true, privacy_category: "amber" }
    ]
  },
  {
    id: "paper-trail",
    title: "Paper Trail",
    fields: [
      { key: "QH-04", type: "select", label: "Do you have bank statements showing the funds in your account?", options: [{value: "Yes — 12+ months of statements available", label: "Yes — 12+ months of statements available"}, {value: "Yes — 6-12 months available", label: "Yes — 6-12 months available"}, {value: "Partial — less than 6 months", label: "Partial — less than 6 months"}, {value: "No — funds came from a sale or transfer", label: "No — funds came from a sale or transfer"}], required: true, privacy_category: "required" },
      { key: "QH-05", type: "select", label: "Were any of the funds received as a gift or loan from a third party?", options: [{value: "No — all funds are mine", label: "No — all funds are mine"}, {value: "Yes — partial gift", label: "Yes — partial gift"}, {value: "Yes — partial loan", label: "Yes — partial loan"}, {value: "Yes — all funds are a gift or loan", label: "Yes — all funds are a gift or loan"}], required: true, privacy_category: "red" },
      { key: "QH-06", type: "text", label: "Who provided the gift or loan?", helperText: "Relationship to you and their source of funds will need to be documented.", required: false, privacy_category: "red" },
      { key: "QH-07", type: "select", label: "Is there a signed gift letter or loan agreement?", options: [{value: "Yes — signed and dated", label: "Yes — signed and dated"}, {value: "In preparation", label: "In preparation"}, {value: "Not yet prepared", label: "Not yet prepared"}], required: false, privacy_category: "red" }
    ]
  },
  {
    id: "transfer-path",
    title: "Transfer Path",
    fields: [
      { key: "QH-08", type: "multi_select", label: "How were the funds transferred to the U.S. business?", options: [{value: "Wire transfer to U.S. business account", label: "Wire transfer to U.S. business account"}, {value: "Direct franchise fee payment", label: "Direct franchise fee payment"}, {value: "Payment to U.S. attorney trust account", label: "Payment to U.S. attorney trust account"}, {value: "Purchase of U.S. business assets", label: "Purchase of U.S. business assets"}, {value: "Multiple transfers over time", label: "Multiple transfers over time"}, {value: "Other", label: "Other"}], required: true, privacy_category: "required" },
      { key: "QH-09", type: "select", label: "Do you have wire transfer records or payment receipts?", options: [{value: "Yes — complete records", label: "Yes — complete records"}, {value: "Partial records", label: "Partial records"}, {value: "No records yet", label: "No records yet"}], required: true, privacy_category: "required" },
      { key: "QH-10", type: "select", label: "Were funds converted from a foreign currency?", options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}], required: true, privacy_category: "amber" },
      { key: "QH-11", type: "select", label: "Do you have foreign exchange records showing the conversion?", options: [{value: "Yes — bank FX records available", label: "Yes — bank FX records available"}, {value: "Partial records", label: "Partial records"}, {value: "No records", label: "No records"}], required: false, privacy_category: "amber" }
    ]
  }
];

function TabHContent() {
  const { answers, setAnswer } = useApplication();
  return (
    <TabPage
      tabTitle="Source of Funds"
      tabDescription="Document the lawful origin and transfer path of your investment capital."
      sections={sections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

export default function TabHPage() {
  return (
    <ApplicationProvider>
      <TabHContent />
    </ApplicationProvider>
  );
}
