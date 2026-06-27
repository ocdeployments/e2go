import { useState, useEffect, useRef, useCallback } from 'react';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  answer: Record<string, string | string[] | number | null>;
  applicationId: string | null;
  enabled: boolean;
}

interface UseAutoSaveResult {
  saveStatus: SaveStatus;
  lastSaved: Date | null;
  error: string | null;
  triggerSave: () => void;
}

export default function useAutoSave({
  answer,
  applicationId,
  enabled,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const previousAnswer = useRef<string>('');

  const save = useCallback(async () => {
    if (!applicationId || !enabled) return;

    setSaveStatus('saving');
    setError(null);

    try {
      const response = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_key: Object.keys(answer)[0] || '',
          answer_value: answer[Object.keys(answer)[0] || ''] || null,
          application_id: applicationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Save failed');
      }

      setSaveStatus('saved');
      setLastSaved(new Date());
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setError('Auto-save failed');
    }
  }, [answer, applicationId, enabled]);

  // Watch for answer changes and debounce
  useEffect(() => {
    const answerString = JSON.stringify(answer);
    if (answerString === previousAnswer.current || !enabled || !applicationId) {
      return;
    }

    previousAnswer.current = answerString;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      save();
    }, 2000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [answer, enabled, applicationId, save]);

  return {
    saveStatus,
    lastSaved,
    error,
    triggerSave: save,
  };
}
