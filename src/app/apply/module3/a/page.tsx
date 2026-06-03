'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabPage from '@/components/module3/TabPage';
import tabQuestions from '@/data/module3/tab-a.json';
import { FieldConfig, Section } from '@/types/module3';

interface QuestionConfig {
  key: string;
  type: 'single' | 'multi' | 'text' | 'number' | 'date';
  question: string;
  tooltip: string;
  options?: { value: string; label: string; helperText?: string }[];
  required: boolean;
  sensitivity?: 'high' | 'medium' | 'low';
  privacy_category?: 'red' | 'amber' | 'green' | 'required';
  skip_advisory?: string;
  warningTriggers?: { value: string; message: string }[];
}

function transformQuestionsToSections(questions: QuestionConfig[]): Section[] {
  const sections: Section[] = [
    {
      id: 'identity-contact',
      title: 'Identity & Contact',
      fields: [],
    },
    {
      id: 'travel-history',
      title: 'Travel History',
      fields: [],
    },
    {
      id: 'immigration-status',
      title: 'Immigration Status',
      fields: [],
    },
    {
      id: 'employment-background',
      title: 'Employment Background',
      fields: [],
    },
    {
      id: 'security-background',
      title: 'Security & Background',
      fields: [],
    },
  ];

  questions.forEach((q, idx) => {
    const field: FieldConfig = {
      key: q.key,
      type: q.type === 'single' || q.type === 'multi' ? 'select' : 'text',
      label: q.question,
      helperText: q.tooltip,
      required: q.required,
      options: q.options?.map(opt => ({
        value: opt.value,
        label: opt.label,
        helperText: opt.helperText,
      })),
      privacy_category: q.privacy_category,
    };

    if (idx < 6) {
      sections[0].fields.push(field);
    } else if (idx < 10) {
      sections[1].fields.push(field);
    } else if (idx < 14) {
      sections[2].fields.push(field);
    } else if (idx < 18) {
      sections[3].fields.push(field);
    } else {
      sections[4].fields.push(field);
    }
  });

  return sections;
}

function TabAPageContent() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setAuthChecked(true);

      if (!authUser) {
        router.push('/login?next=/apply/module3/a');
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

        if (profileError) {
          console.error('CRITICAL: Profile upsert failed:', profileError);
          setLoadError(`Profile creation failed: ${profileError.message}`);
          setLoading(false);
          return;
        }

        console.log('Profile upsert succeeded for user:', authUser.id);

        const { data: newApp, error: createError } = await supabase
          .from('applications')
          .insert({ user_id: authUser.id, status: 'in_progress' })
          .select('id')
          .single();

        if (createError) {
          console.error('CRITICAL: Application insert failed:', createError);
          setLoadError(`Failed to create application: ${createError.message}`);
          setLoading(false);
          return;
        }
        console.log('Application created:', newApp.id);
        setApplicationId(newApp.id);
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    window.location.reload();
  };

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: 'rgba(245,240,232,0.6)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-8 h-8" style={{ color: '#EF4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: '#f5f0e8', fontFamily: "'Cormorant Garamond', serif" }}>
            Something went wrong
          </h2>
          <p className="mb-6" style={{ color: 'rgba(245,240,232,0.6)' }}>{loadError}</p>
          <button
            onClick={handleRetry}
            className="px-6 py-3 rounded-lg transition-all"
            style={{ background: '#C9A84C', color: '#0a0a0a' }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (applicationId) {
    return (
      <ApplicationProvider applicationId={applicationId}>
        <TabAWithContext />
      </ApplicationProvider>
    );
  }

  return null;
}

function TabAWithContext() {
  const { answers, setAnswer } = useApplication();

  const sections = transformQuestionsToSections(tabQuestions as QuestionConfig[]);

  const handleAnswerChange = useCallback((key: string, value: string | string[] | number | null) => {
    setAnswer(key, value);
  }, [setAnswer]);

  const handleSaveSection = useCallback(async (_sectionId: string) => {
    console.log('Section saved:', _sectionId);
  }, []);

  return (
    <TabPage
      tabTitle="DS-160 Reference"
      tabDescription="Personal information for your visa application"
      sections={sections}
      answers={answers}
      onAnswerChange={handleAnswerChange}
      onSaveSection={handleSaveSection}
    />
  );
}

export default function TabAPage() {
  return <TabAPageContent />;
}