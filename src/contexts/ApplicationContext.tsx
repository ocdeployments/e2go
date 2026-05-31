'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ApplicationContextType {
  answers: Record<string, string | string[] | number | null>;
  applicationId: string | null;
  saveStatus: SaveStatus;
  navigationBlocked: boolean;
  setAnswer: (key: string, value: string | string[] | number | null) => void;
  lastSaved: Date | null;
  error: string | null;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function ApplicationProvider({ children, applicationId }: { children: ReactNode; applicationId: string | null }) {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [answers, setAnswers] = useState<Record<string, string | string[] | number | null>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const navigationBlocked = saveStatus === 'saving';

  // Fetch existing answers on mount
  useEffect(() => {
    const fetchAnswers = async () => {
      if (!applicationId) return;

      const { data, error: fetchError } = await supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', applicationId);

      if (fetchError) {
        console.error('Failed to fetch answers:', fetchError);
        return;
      }

      if (data) {
        const answersMap: Record<string, string | string[] | number | null> = {};
        data.forEach((row) => {
          answersMap[row.question_key] = row.answer_value;
        });
        setAnswers(answersMap);
      }
    };

    fetchAnswers();
  }, [applicationId, supabase]);

  // Save answer to API
  const saveAnswer = useCallback(async (key: string, value: string | string[] | number | null) => {
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

  // Set answer with debounce
  const setAnswer = useCallback((key: string, value: string | string[] | number | null) => {
    // Update local state immediately
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError(null);

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Debounce save by 2 seconds
    const timer = setTimeout(() => {
      saveAnswer(key, value);
    }, 2000);

    setDebounceTimer(timer);
  }, [debounceTimer, saveAnswer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <ApplicationContext.Provider
      value={{
        answers,
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
