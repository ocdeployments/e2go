'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { ApplicationProvider, useApplication } from '@/contexts/ApplicationContext';
import TabShell from '@/components/module3/TabShell';
import tabQuestions from '@/data/module3/tab-a.json';

interface QuestionConfig {
  key: string;
  type: 'single' | 'multi' | 'text' | 'number' | 'date';
  question: string;
  tooltip: string;
  options?: { value: string; label: string; helperText?: string }[];
  required: boolean;
  warningTriggers?: { value: string; message: string }[];
}

function TabAPageContent() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<unknown>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
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
        // Safety check: ensure profile exists before creating application
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({ id: authUser.id, email: authUser.email, tier: 'free' })
          .select();

        // If profile upsert fails, log and fail immediately - don't proceed
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

  const handleComplete = async () => {
    if (!applicationId || !user) return;

    await supabase
      .from('application_lifecycle')
      .upsert(
        { application_id: applicationId, module3_started_at: new Date().toISOString() },
        { onConflict: 'application_id' }
      );

    router.push('/apply/module3/b');
  };

  const handleRetry = () => {
    setLoading(true);
    setLoadError(null);
    window.location.reload();
  };

  // Show loading while checking auth
  if (!authChecked || loading) {
    return (
      <TabShell
        tabLetter="A"
        tabTitle="DS-160 Reference"
        tabDescription="Personal information for your visa application"
        questions={tabQuestions as QuestionConfig[]}
        onComplete={() => {}}
        answers={{}}
        onAnswerChange={() => {}}
        saveStatus="idle"
        isLoading={true}
        nextTab={{ letter: 'B', title: 'Investment Details', description: 'Information about your E-2 investment' }}
      />
    );
  }

  // Wrap with ApplicationProvider when we have applicationId
  if (applicationId) {
    return (
      <ApplicationProvider applicationId={applicationId}>
        <TabAWithContext
          loadError={loadError}
          onRetry={handleRetry}
          onComplete={handleComplete}
        />
      </ApplicationProvider>
    );
  }

  // Error state (no applicationId and we have an error)
  return (
    <TabShell
      tabLetter="A"
      tabTitle="DS-160 Reference"
      tabDescription="Personal information for your visa application"
      questions={tabQuestions as QuestionConfig[]}
      onComplete={() => {}}
      answers={{}}
      onAnswerChange={() => {}}
      saveStatus="idle"
      loadError={loadError}
      onRetry={handleRetry}
      nextTab={{ letter: 'B', title: 'Investment Details', description: 'Information about your E-2 investment' }}
    />
  );
}

// Inner component that uses ApplicationContext
function TabAWithContext({
  loadError,
  onRetry,
  onComplete,
}: {
  loadError: string | null;
  onRetry: () => void;
  onComplete: () => void;
}) {
  const { answers, saveStatus, setAnswer } = useApplication();
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [lastQuestionIndex, setLastQuestionIndex] = useState(0);

  // Calculate answered count when answers change
  useEffect(() => {
    if (answers && tabQuestions) {
      let answered = 0;
      let lastIdx = 0;
      (tabQuestions as QuestionConfig[]).forEach((q, idx) => {
        const val = answers[q.key];
        if (val !== undefined && val !== null && val !== '') {
          answered++;
          lastIdx = idx;
        }
      });
      setTotalAnswered(answered);
      setLastQuestionIndex(lastIdx);
    }
  }, [answers]);

  return (
    <TabShell
      tabLetter="A"
      tabTitle="DS-160 Reference"
      tabDescription="Personal information for your visa application"
      questions={tabQuestions as QuestionConfig[]}
      onComplete={onComplete}
      answers={answers}
      onAnswerChange={setAnswer}
      saveStatus={saveStatus}
      loadError={loadError}
      onRetry={onRetry}
      nextTab={{ letter: 'B', title: 'Investment Details', description: 'Information about your E-2 investment' }}
      totalAnswered={totalAnswered}
      lastQuestionIndex={lastQuestionIndex}
    />
  );
}

export default function TabAPage() {
  return <TabAPageContent />;
}