'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type AnswerSource = 'quiz' | 'user_entry' | 'user_edited';

interface ApplicationContextType {
  answers: Record<string, string | string[] | number | null>;
  answerSources: Record<string, AnswerSource>;
  applicationId: string | null;
  saveStatus: SaveStatus;
  navigationBlocked: boolean;
  setAnswer: (key: string, value: string | string[] | number | null, source?: AnswerSource) => void;
  lastSaved: Date | null;
  error: string | null;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function ApplicationProvider({ children, applicationId }: { children: ReactNode; applicationId: string | null }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [answers, setAnswers] = useState<Record<string, string | string[] | number | null>>({});
  const [answerSources, setAnswerSources] = useState<Record<string, AnswerSource>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const navigationBlocked = saveStatus === 'saving';

  // Fetch existing answers on mount
  useEffect(() => {
    const fetchAnswers = async () => {
      if (!applicationId) return;

      const { data, error: fetchError } = await supabase
        .from('answers')
        .select('question_key, answer_value, source')
        .eq('application_id', applicationId);

      if (fetchError) {
        console.error('Failed to fetch answers:', fetchError);
        return;
      }

      if (data) {
        const answersMap: Record<string, string | string[] | number | null> = {};
        const sourcesMap: Record<string, AnswerSource> = {};
        data.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: AnswerSource | null }) => {
          answersMap[row.question_key] = row.answer_value;
          if (row.source) sourcesMap[row.question_key] = row.source;
        });
        setAnswers(answersMap);
        setAnswerSources(sourcesMap);
      }
    };

    fetchAnswers();
  }, [applicationId, supabase]);

  // Save answer to API
  const saveAnswer = useCallback(async (key: string, value: string | string[] | number | null, source?: AnswerSource) => {
    if (!applicationId) return;

    setSaveStatus('saving');

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_key: key,
          answer_value: value,
          application_id: applicationId,
          source: source || 'user_entry',
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
      setError(null);

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      // Retry once after 5 seconds
      setTimeout(async () => {
        try {
          const retryResponse = await fetch('/api/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question_key: key,
              answer_value: value,
              application_id: applicationId,
              source: source || 'user_entry',
            }),
          });

          if (!retryResponse.ok) {
            throw new Error('Retry failed');
          }

          setSaveStatus('saved');
          setLastSaved(new Date());
          setError(null);
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch {
          setSaveStatus('error');
          setError('Save failed — will retry');
        }
      }, 5000);
    }
  }, [applicationId]);

  // Set answer with per-key debounce — each key gets its own timer so rapid
  // changes across multiple fields don't cancel each other's pending saves.
  const setAnswer = useCallback((key: string, value: string | string[] | number | null, source?: AnswerSource) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    if (source) {
      setAnswerSources((prev) => ({ ...prev, [key]: source }));
    }
    setError(null);

    if (debounceTimers.current[key]) clearTimeout(debounceTimers.current[key]);
    debounceTimers.current[key] = setTimeout(() => {
      saveAnswer(key, value, source);
    }, 800);
  }, [saveAnswer]);

  // Cleanup all pending timers on unmount
  useEffect(() => {
    const timers = debounceTimers.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  return (
    <ApplicationContext.Provider
      value={{
        answers,
        answerSources,
        applicationId,
        saveStatus,
        navigationBlocked,
        setAnswer,
        lastSaved,
        error,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (!context) {
    throw new Error('useApplication must be used within an ApplicationProvider');
  }
  return context;
}
