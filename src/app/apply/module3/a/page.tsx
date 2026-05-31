'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
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

interface AnswerState {
  answers: Record<string, string | string[] | number | null>;
  setAnswer: (key: string, value: string | string[] | number | null) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

function useAnswerState(applicationId: string | null): AnswerState {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [answers, setAnswersState] = useState<Record<string, string | string[] | number | null>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Fetch existing answers on mount
  useEffect(() => {
    if (!applicationId) return;

    const fetchAnswers = async () => {
      const { data } = await supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', applicationId);

      if (data) {
        const answersMap: Record<string, string | string[] | number | null> = {};
        data.forEach((row) => {
          answersMap[row.question_key] = row.answer_value;
        });
        setAnswersState(answersMap);
      }
    };

    fetchAnswers();
  }, [applicationId, supabase]);

  const saveAnswer = async (key: string, value: string | string[] | number | null) => {
    if (!applicationId) return;
    setSaveStatus('saving');

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_key: key, answer_value: value, application_id: applicationId }),
      });

      if (!response.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setTimeout(async () => {
        try {
          const retry = await fetch('/api/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_key: key, answer_value: value, application_id: applicationId }),
          });
          if (!retry.ok) throw new Error('Retry failed');
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('error');
        }
      }, 5000);
    }
  };

  const setAnswer = (key: string, value: string | string[] | number | null) => {
    setAnswersState((prev) => ({ ...prev, [key]: value }));
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => saveAnswer(key, value), 2000);
    setDebounceTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [debounceTimer]);

  return { answers, setAnswer, saveStatus };
}

function TabAPageContent() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<unknown>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const { answers, setAnswer, saveStatus } = useAnswerState(applicationId);

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

        if (profileError) {
          console.error('Profile upsert error:', profileError);
        }

        const { data: newApp, error: createError } = await supabase
          .from('applications')
          .insert({ user_id: authUser.id, status: 'in_progress' })
          .select('id')
          .single();

        if (createError) {
          setLoadError('Failed to create application');
          setLoading(false);
          return;
        }
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
      />
    );
  }

  return (
    <TabShell
      tabLetter="A"
      tabTitle="DS-160 Reference"
      tabDescription="Personal information for your visa application"
      questions={tabQuestions as QuestionConfig[]}
      onComplete={handleComplete}
      answers={answers}
      onAnswerChange={setAnswer}
      saveStatus={saveStatus}
      loadError={loadError}
      onRetry={handleRetry}
    />
  );
}

export default function TabAPage() {
  return <TabAPageContent />;
}