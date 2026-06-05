'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import FormField from './FormField';
import PreFilledField from '@/components/PreFilledField';
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
  const [confirmationStates, setConfirmationStates] = useState<Record<string, boolean>>({});

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
    const timers = debounceTimers.current;
    const saveTimeout = saveTimeoutRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
      if (saveTimeout) {
        clearTimeout(saveTimeout);
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

  const hasUnconfirmedRequiredFields = fields.some(f => {
    const hasPrefill = f.prefillValue !== null && f.prefillValue !== undefined && f.prefillValue !== '';
    return f.requiresConfirmation && hasPrefill && !confirmationStates[f.key];
  });

  const isSaveDisabled = hasUnconfirmedRequiredFields;
  const showSecuritySubtitle = sectionId === 'security-background';

  return (
    <div id={`section-${sectionId}`} className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
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
          {showSecuritySubtitle && (
            <p className="mt-2 text-sm font-light text-[#f5f0e8]/50 font-[DM_Sans] leading-relaxed max-w-3xl">
              These fields have been pre-filled from your eligibility check. Review each answer carefully and confirm accuracy before proceeding. These declarations will appear in your DS-160 and are subject to consular scrutiny.
            </p>
          )}
        </div>
        <span className="text-sm" style={{ color: 'rgba(245,240,232,0.5)' }}>
          {answeredCount} of {fields.length} answered
        </span>
      </div>

      <div className="space-y-6">
        {fields.map((field) => {
          const hasPrefill = field.prefillValue !== null && field.prefillValue !== undefined && field.prefillValue !== '';

          if (hasPrefill) {
            return (
              <PreFilledField
                key={field.key}
                questionId={field.key}
                label={field.label}
                prefillValue={field.prefillValue!}
                prefillNote={field.prefillNote || null}
                requiresConfirmation={field.requiresConfirmation}
                confirmationText={field.confirmationText}
                isConfirmed={!!confirmationStates[field.key]}
                onConfirmChange={(checked) => {
                  setConfirmationStates(prev => ({ ...prev, [field.key]: checked }));
                }}
              >
                <FormField
                  field={field}
                  value={answers[field.key]}
                  onChange={(value) => handleFieldChange(field.key, value)}
                  onSkip={() => handleSkipField(field.key)}
                  disabled={false}
                />
              </PreFilledField>
            );
          }

          return (
            <FormField
              key={field.key}
              field={field}
              value={answers[field.key]}
              onChange={(value) => handleFieldChange(field.key, value)}
              onSkip={() => handleSkipField(field.key)}
              disabled={false}
            />
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={handleManualSave}
          disabled={saveStatus === 'saving' || isSaveDisabled}
          className="px-6 py-3 rounded-lg transition-all duration-200 border"
          style={{
            borderColor: saveStatus === 'saved' ? '#10B981' : '#C9A84C',
            background: saveStatus === 'saved' ? 'rgba(16,185,129,0.1)' : 'transparent',
            color: saveStatus === 'saved' ? '#10B981' : '#C9A84C',
            cursor: saveStatus === 'saving' || isSaveDisabled ? 'not-allowed' : 'pointer',
            opacity: saveStatus === 'saving' || isSaveDisabled ? 0.7 : 1,
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
          {saveStatus === 'idle' && isSaveDisabled && 'Confirm Required Fields to Save'}
          {saveStatus === 'idle' && !isSaveDisabled && 'Save Section'}
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