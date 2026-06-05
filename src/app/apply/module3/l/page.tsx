'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import { Section } from '@/types/module3';
import { getPreFill } from '@/lib/prefill';
import { createBrowserSupabaseClient } from '@/lib/supabase';

const sections: Section[] = [
  {
    id: "spouse-info",
    title: "Spouse Information",
    fields: [
      { key: "QL-01", type: "select", label: "Will your spouse or partner be applying for E-2 dependent status?", options: [{value: "Yes", label: "Yes"}, {value: "No — not applicable", label: "No — not applicable"}, {value: "Not yet decided", label: "Not yet decided"}], required: true, privacy_category: "required" },
      { key: "QL-02", type: "text", label: "Spouse full legal name", helperText: "As it appears on their passport.", required: false, privacy_category: "red" },
      { key: "QL-03", type: "text", label: "Spouse date of birth", required: false, privacy_category: "red" },
      { key: "QL-04", type: "select", label: "Spouse nationality", options: [], required: false, privacy_category: "red" },
      { key: "QL-05", type: "text", label: "Spouse passport number", helperText: "Will not be stored after document generation.", required: false, privacy_category: "red" },
      { key: "QL-06", type: "select", label: "Will your spouse apply for U.S. work authorization (EAD)?", options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}, {value: "Undecided", label: "Undecided"}], required: false, privacy_category: "amber" }
    ]
  },
  {
    id: "dependent-children",
    title: "Dependent Children",
    fields: [
      { key: "QL-07", type: "select", label: "Will any children be applying as E-2 dependents?", options: [{value: "Yes", label: "Yes"}, {value: "No", label: "No"}], required: true, privacy_category: "required" },
      { key: "QL-08", type: "text", label: "Dependent details", helperText: "Children must be unmarried and under 21 to qualify as E-2 dependents.", required: false, privacy_category: "red" }
    ]
  },
  {
    id: "relationship-docs",
    title: "Relationship Documents",
    fields: [
      { key: "QL-09", type: "multi_select", label: "What relationship documents do you have available?", options: [{value: "Marriage certificate", label: "Marriage certificate"}, {value: "Civil union certificate", label: "Civil union certificate"}, {value: "Birth certificates for children", label: "Birth certificates for children"}, {value: "Adoption certificates", label: "Adoption certificates"}, {value: "Passport copies for all dependents", label: "Passport copies for all dependents"}], required: true, privacy_category: "amber" },
      { key: "QL-10", type: "select", label: "Have all dependent documents been officially translated to English?", options: [{value: "Yes — certified translations complete", label: "Yes — certified translations complete"}, {value: "In progress", label: "In progress"}, {value: "Not yet started", label: "Not yet started"}, {value: "Not applicable — documents are in English", label: "Not applicable — documents are in English"}], required: true, privacy_category: "green" }
    ]
  }
];

function TabLContent() {
  const { answers, setAnswer } = useApplication();
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getUserEmail = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUserEmail();
  }, []);

  const mappedSections = sections.map(section => ({
    ...section,
    fields: section.fields.map(field => {
      const prefill = getPreFill(field.key, userEmail);
      if (prefill.value !== null) {
        return {
          ...field,
          prefillValue: prefill.value,
          prefillNote: prefill.note,
          requiresConfirmation: prefill.requiresConfirmation,
          confirmationText: prefill.confirmationText,
        };
      }
      return field;
    }),
  }));

  return (
    <TabPage
      tabTitle="Family Dependents"
      tabDescription="Provide information about family members applying as E-2 dependents."
      sections={mappedSections as Section[]}
      answers={answers}
      onAnswerChange={(key, val) => setAnswer(key, val)}
      onSaveSection={async () => {}}
    />
  );
}

function TabLPageContent() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/l');
        return;
      }

      const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingApp) {
        setApplicationId(existingApp.id);
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: authUser.id, email: authUser.email, tier: 'free' })
          .select();

        if (!profileError) {
          const { data: newApp } = await supabase
            .from('applications')
            .insert({ user_id: authUser.id, status: 'in_progress' })
            .select('id')
            .single();
          if (newApp) {
            setApplicationId(newApp.id);
          }
        }
      }
      setLoading(false);
    };

    init();
  }, [router, supabase]);

  if (loading || !applicationId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ApplicationProvider applicationId={applicationId}>
      <TabLContent />
    </ApplicationProvider>
  );
}

export default function TabLPage() {
  return <TabLPageContent />;
}
