'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import FormField from './FormField';
import { SectionFormProps } from '@/types/module3';

export default function SectionForm({
  sectionId,
  sectionTitle,
  fields,
  answers,
  onAnswerChange,
  onSave,
  onSkipField,
}: SectionFormProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const answeredCount = fields.filter(f => {
    const answer = answers[f.key];
    if (f.type === 'multi_select' && Array.isArray(answer)) {
      return answer.length > 0;
    }
    return answer !== undefined && answer !== null && answer !== '';
  }).length;

  const handleFieldChange = useCallback((key: string, value: string | string[] | number | null) => {
    onAnswerChange(key, value);

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(() => {
      setSaveStatus('saving');
      onSave().then(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }).catch(() => {
        setSaveStatus('error');
      });
    }, 800);
  }, [onAnswerChange, onSave]);

  const handleSkipField = useCallback((key: string) => {
    if (onSkipField) {
      onSkipField(key);
    }
  }, [onSkipField]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    Object.values(debounceTimers.current).forEach(clearTimeout);

    setSaveStatus('saving');
    try {
      await onSave();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [onSave]);

  return (
    <div id={`section-${sectionId}`} className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-2xl"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontWeight: 300,
            fontStyle: 'italic',
            color: '#f5f0e8'
          }}
        >
          {sectionTitle}
        </h2>
        <span className="text-sm" style={{ color: 'rgba(245,240,232,0.5)' }}>
          {answeredCount} of {fields.length} answered
        </span>
      </div>

      <div className="space-y-6">
        {fields.map((field) => (
          <FormField
            key={field.key}
            field={field}
            value={answers[field.key]}
            onChange={(value) => handleFieldChange(field.key, value)}
            onSkip={() => handleSkipField(field.key)}
            disabled={false}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleManualSave}
          disabled={saveStatus === 'saving'}
          className="px-6 py-3 rounded-lg transition-all duration-200 border"
          style={{
            borderColor: saveStatus === 'saved' ? '#10B981' : '#C9A84C',
            background: saveStatus === 'saved' ? 'rgba(16,185,129,0.1)' : 'transparent',
            color: saveStatus === 'saved' ? '#10B981' : '#C9A84C',
            cursor: saveStatus === 'saving' ? 'wait' : 'pointer',
            opacity: saveStatus === 'saving' ? 0.7 : 1,
          }}
        >
          {saveStatus === 'saving' && (
            <>
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" style={{ animation: 'spin 1s linear infinite' }} />
              Saving...
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <svg className="inline-block w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </>
          )}
          {saveStatus === 'error' && 'Save Failed - Retry'}
          {saveStatus === 'idle' && 'Save Section'}
        </button>
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}