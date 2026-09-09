'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useAutosaveFlush } from '@/lib/use-autosave-flush';
import type { QuestionField } from '@/lib/ds160-question-sets';
import QuestionLabel from '@/components/apply/questions/QuestionLabel';
import HelperText from '@/components/apply/questions/HelperText';
import TextInput from '@/components/apply/questions/TextInput';
import TextArea from '@/components/apply/questions/TextArea';
import PhoneInput from '@/components/apply/questions/PhoneInput';
import DateInput from '@/components/apply/questions/DateInput';
import OptionButton from '@/components/apply/questions/OptionButton';
import PreFillBadge from '@/components/apply/questions/PreFillBadge';

interface RunnerAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

interface QuestionSetRunnerProps {
  questions: QuestionField[];
  applicationId: string;
  familyMemberId: string | null;
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export default function QuestionSetRunner({ questions, applicationId, familyMemberId, onSaveStatusChange }: QuestionSetRunnerProps) {
  const [answers, setAnswers] = useState<Record<string, RunnerAnswer>>({});
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});
  const flushRef = useRef<Record<string, () => void>>({});
  useAutosaveFlush(debounceRef, flushRef);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const supabase = createBrowserSupabaseClient();
      let query = supabase
        .from('answers')
        .select('question_key, answer_value')
        .eq('application_id', applicationId);
      query = familyMemberId ? query.eq('family_member_id', familyMemberId) : query.is('family_member_id', null);
      const { data } = await query;
      if (cancelled) return;
      if (data) {
        const answerMap: Record<string, RunnerAnswer> = {};
        data.forEach((row: { question_key: string; answer_value: string | string[] | number | null }) => {
          if (row.answer_value !== null) {
            answerMap[row.question_key] = { value: String(row.answer_value), source: null };
          }
        });
        setAnswers(answerMap);
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [applicationId, familyMemberId]);

  const saveAnswer = useCallback(async (key: string, value: string) => {
    onSaveStatusChange?.('saving');
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_key: key, answer_value: value, application_id: applicationId, family_member_id: familyMemberId }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSaveStatusChange?.('saved');
      setTimeout(() => onSaveStatusChange?.('idle'), 2000);
    } catch {
      onSaveStatusChange?.('error');
    }
  }, [applicationId, familyMemberId, onSaveStatusChange]);

  const handleAnswerChange = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: { value, source: prev[key]?.source ?? null } }));
    flushRef.current[key] = () => saveAnswer(key, value);
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => { saveAnswer(key, value); delete flushRef.current[key]; }, 800);
  }, [saveAnswer]);

  if (loading) {
    return <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', color: 'rgba(245,240,232,0.5)' }}>Loading...</p>;
  }

  return (
    <div className="space-y-6">
      {questions.map((q) => {
        if (q.showIf) {
          const depAnswer = answers[q.showIf.key]?.value;
          if (depAnswer !== q.showIf.value) return null;
        }
        const answer = answers[q.key];
        return (
          <div key={q.key}>
            {answer?.source === 'quiz' && <PreFillBadge isOriginal={true} />}
            {answer?.source === 'user_edited' && <PreFillBadge isOriginal={false} />}
            <QuestionLabel required={q.required}>{q.label}</QuestionLabel>
            {q.type === 'single' ? (
              <div className="flex flex-col gap-2">
                {q.options?.map((opt) => (
                  <OptionButton key={opt.value} label={opt.label} selected={answer?.value === opt.value} onClick={() => handleAnswerChange(q.key, opt.value)} />
                ))}
              </div>
            ) : q.type === 'multi' ? (
              <div className="flex flex-col gap-2">
                {q.options?.map((opt) => {
                  let currentValues: string[] = [];
                  try {
                    const parsed = JSON.parse(answer?.value || '[]');
                    if (Array.isArray(parsed)) currentValues = parsed;
                  } catch { /* empty */ }
                  const isSelected = currentValues.includes(opt.value);
                  return (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      selected={isSelected}
                      onClick={() => {
                        let vals: string[] = [];
                        try {
                          const p = JSON.parse(answer?.value || '[]');
                          if (Array.isArray(p)) vals = p;
                        } catch { /* empty */ }
                        const next = vals.includes(opt.value)
                          ? vals.filter((v) => v !== opt.value)
                          : [...vals, opt.value];
                        handleAnswerChange(q.key, JSON.stringify(next));
                      }}
                    />
                  );
                })}
              </div>
            ) : q.type === 'textarea' ? (
              <TextArea value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} rows={4} />
            ) : q.type === 'phone' ? (
              <PhoneInput value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} />
            ) : q.type === 'date' ? (
              <DateInput value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} />
            ) : (
              <TextInput value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} />
            )}
            {q.helperText && <HelperText>{q.helperText}</HelperText>}
          </div>
        );
      })}
    </div>
  );
}
