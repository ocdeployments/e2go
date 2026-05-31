'use client';

import { useState } from 'react';
import QuestionRenderer from './QuestionRenderer';

interface QuestionConfig {
  key: string;
  type: 'single' | 'multi' | 'text' | 'number' | 'date';
  question: string;
  tooltip: string;
  options?: { value: string; label: string; helperText?: string }[];
  required: boolean;
  warningTriggers?: { value: string; message: string }[];
}

interface TabShellProps {
  tabLetter: string;
  tabTitle: string;
  tabDescription: string;
  questions: QuestionConfig[];
  onComplete: () => void;
  answers: Record<string, string | string[] | number | null>;
  onAnswerChange: (key: string, value: string | string[] | number | null) => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isLoading?: boolean;
  loadError?: string | null;
  onRetry?: () => void;
}

const TABS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export default function TabShell({
  tabLetter,
  tabTitle,
  tabDescription,
  questions,
  onComplete,
  answers,
  onAnswerChange,
  saveStatus,
  isLoading,
  loadError,
  onRetry,
}: TabShellProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const tabIndex = TABS.indexOf(tabLetter);

  const isCurrentAnswered = currentQuestion
    ? currentQuestion.type === 'multi'
      ? Array.isArray(answers[currentQuestion.key]) &&
        (answers[currentQuestion.key] as string[]).length > 0
      : answers[currentQuestion.key] !== undefined && answers[currentQuestion.key] !== null
    : false;

  const canContinue = currentQuestion?.required ? isCurrentAnswered : true;

  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (tabIndex > 0) {
      // Navigate to previous tab (placeholder for now)
      window.location.href = `/apply/module3/${TABS[tabIndex - 1].toLowerCase()}`;
    }
  };

  const handleContinue = () => {
    if (isLastQuestion) {
      onComplete();
    } else if (canContinue) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] p-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress bar skeleton */}
          <div className="flex gap-1 mb-8">
            {TABS.map((tab) => (
              <div
                key={tab}
                className={`h-2 flex-1 rounded ${
                  tab === tabLetter ? 'bg-[#004ac6]' : 'bg-[#c3c6d7]'
                }`}
              />
            ))}
          </div>
          {/* Content skeleton */}
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-8">
            <div className="h-8 bg-[#e2e8f0] rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-4 bg-[#e2e8f0] rounded w-2/3 mb-8 animate-pulse" />
            <div className="space-y-4">
              <div className="h-12 bg-[#e2e8f0] rounded animate-pulse" />
              <div className="h-12 bg-[#e2e8f0] rounded animate-pulse" />
              <div className="h-12 bg-[#e2e8f0] rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-[#f8f9ff] p-4 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0b1c30] mb-2">
            Failed to load answers
          </h2>
          <p className="text-[#434655] mb-6">{loadError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-[#004ac6] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#00337d] transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress bar */}
        <div className="flex gap-1 mb-6">
          {TABS.map((tab) => (
            <div
              key={tab}
              className={`h-2 flex-1 rounded ${
                tab === tabLetter
                  ? 'bg-[#004ac6]'
                  : TABS.indexOf(tab) < tabIndex
                  ? 'bg-[#22c55e]'
                  : 'bg-[#c3c6d7]'
              }`}
              title={`Tab ${tab}`}
            />
          ))}
        </div>

        {/* Save status indicator */}
        <div className="flex justify-end mb-4">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-[#737686] text-sm">
              <div className="w-4 h-4 border-2 border-[#004ac6] border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Saved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <span className="w-2 h-2 bg-red-600 rounded-full" />
              <span>Save failed — will retry</span>
            </div>
          )}
        </div>

        {/* Tab header */}
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6 mb-6">
          <h1 className="text-xl font-bold text-[#0b1c30] mb-2">
            Tab {tabLetter}: {tabTitle}
          </h1>
          <p className="text-[#434655]">{tabDescription}</p>
          <p className="text-sm text-[#737686] mt-2">
            Question {currentIndex + 1} of {questions.length}
          </p>
        </div>

        {/* Question */}
        {currentQuestion && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.key]}
              onChange={(value) => onAnswerChange(currentQuestion.key, value)}
              disabled={saveStatus === 'saving'}
            />

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#e2e8f0]">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-[#c3c6d7] text-[#434655] rounded-lg hover:bg-[#f8f9ff] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue || saveStatus === 'saving'}
                className="px-6 py-3 bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : isLastQuestion
                  ? 'Complete'
                  : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
