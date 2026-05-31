'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuestionRenderer from './QuestionRenderer';

interface QuestionConfig {
  key: string;
  type: 'single' | 'multi' | 'text' | 'number' | 'date';
  question: string;
  tooltip: string;
  options?: { value: string; label: string; helperText?: string }[];
  required: boolean;
  sensitivity?: 'high' | 'medium' | 'low';
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
  nextTab?: { letter: string; title: string; description: string };
  totalAnswered?: number;
  lastQuestionIndex?: number;
}

const TABS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

type ScreenState = 'intro' | 'question' | 'completion' | 'resume';

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
  nextTab,
  totalAnswered = 0,
  lastQuestionIndex = 0,
}: TabShellProps) {
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const tabIndex = TABS.indexOf(tabLetter);

  // Determine initial screen state based on props
  useEffect(() => {
    if (!isLoading && !loadError) {
      if (totalAnswered > 0 && lastQuestionIndex > 0 && lastQuestionIndex < questions.length - 1) {
        setScreenState('resume');
        setCurrentIndex(lastQuestionIndex);
      } else if (totalAnswered >= questions.length) {
        setScreenState('completion');
      } else {
        setScreenState('intro');
      }
    }
  }, [isLoading, loadError, totalAnswered, lastQuestionIndex, questions.length]);

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
      window.location.href = `/apply/module3/${TABS[tabIndex - 1].toLowerCase()}`;
    }
  };

  const handleContinue = () => {
    if (isLastQuestion) {
      setScreenState('completion');
    } else if (canContinue) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleStartOver = () => {
    setCurrentIndex(0);
    setScreenState('question');
  };

  const handleResume = () => {
    setScreenState('question');
  };

  const handleIntroStart = () => {
    setScreenState('question');
    setCurrentIndex(0);
  };

  const handleCompletionNext = () => {
    if (nextTab) {
      window.location.href = `/apply/module3/${nextTab.letter.toLowerCase()}`;
    } else {
      onComplete();
    }
  };

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        {/* Progress bar - thin teal at very top */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E2E8F0] z-40">
          <div
            className="h-full bg-[#0D9488] transition-all"
            style={{ width: `${((tabIndex) / TABS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <header className="fixed top-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
              </svg>
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
            <div className="text-sm text-[#45464d]">Tab {tabLetter}</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
            {/* Large teal icon in circle background */}
            <div className="w-20 h-20 bg-[#dce9ff] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#0D9488]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>

            {/* Section name headline */}
            <h1 className="text-2xl font-semibold text-[#0b1c30] mb-4" style={{ fontSize: '24px', fontWeight: 600 }}>
              {tabTitle}
            </h1>

            {/* 2-line description */}
            <p className="text-[#45464d] mb-8" style={{ fontSize: '16px', lineHeight: '24px' }}>
              {tabDescription}
            </p>

            {/* Question count */}
            <p className="text-sm text-[#45464d] mb-8" style={{ fontSize: '14px' }}>
              This section has {questions.length} questions
            </p>

            {/* Let's begin button */}
            <button
              onClick={handleIntroStart}
              className="w-full bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors mb-6"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500 }}
            >
              Let&apos;s begin →
            </button>

            {/* Back ghost button */}
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-[#45464d] text-[#45464d] rounded-lg hover:bg-[#f8f9ff] transition-colors"
              style={{ minHeight: '56px' }}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==================== RESUME STATE ====================
  if (screenState === 'resume') {
    const percentComplete = Math.round((totalAnswered / questions.length) * 100);

    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        {/* Progress bar - thin teal at very top */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E2E8F0] z-40">
          <div
            className="h-full bg-[#0D9488] transition-all"
            style={{ width: `${((tabIndex + (totalAnswered / questions.length)) / TABS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <header className="fixed top-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
              </svg>
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
            <div className="text-sm text-[#45464d]">Tab {tabLetter}</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
            {/* Teal circular progress ring */}
            <div className="w-24 h-24 rounded-full border-4 border-[#0D9488] flex items-center justify-center mx-auto mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#0D9488]">{percentComplete}%</div>
                <div className="text-xs text-[#45464d] uppercase" style={{ letterSpacing: '0.04em' }}>Complete</div>
              </div>
            </div>

            {/* Welcome back headline */}
            <h1 className="text-2xl font-semibold text-[#0b1c30] mb-4" style={{ fontSize: '24px', fontWeight: 600 }}>
              Welcome back
            </h1>

            {/* Resume message */}
            <p className="text-[#45464d] mb-8" style={{ fontSize: '16px', lineHeight: '24px' }}>
              You left off at question {lastQuestionIndex + 1} of {questions.length}. Your progress has been saved automatically.
            </p>

            {/* Continue button */}
            <button
              onClick={handleResume}
              className="w-full bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500 }}
            >
              Continue where you left off →
            </button>

            {/* Start over ghost button */}
            <button
              onClick={handleStartOver}
              className="w-full px-6 py-3 border border-[#45464d] text-[#45464d] rounded-lg hover:bg-[#f8f9ff] transition-colors"
              style={{ minHeight: '56px' }}
            >
              Start this section over
            </button>

            {/* Info card */}
            <div className="mt-6 p-4 bg-[#dce9ff] rounded-xl flex gap-3 text-left">
              <svg className="w-5 h-5 text-[#0D9488] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-[#45464d]" style={{ fontSize: '14px' }}>
                All previous answers remain valid. Starting over will clear entries for this specific sub-section only.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== COMPLETION STATE ====================
  if (screenState === 'completion') {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        {/* Progress bar - thin teal at very top */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E2E8F0] z-40">
          <div
            className="h-full bg-[#0D9488] transition-all"
            style={{ width: `${((tabIndex + 1) / TABS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <header className="fixed top-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
              </svg>
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#0D9488]">✓ Saved</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8 text-center">
            {/* Completion checkmark */}
            <div className="w-20 h-20 bg-[#dce9ff] rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-[#0D9488]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            {/* Headline */}
            <h1 className="text-2xl font-semibold text-[#0b1c30] mb-4" style={{ fontSize: '24px', fontWeight: 600 }}>
              Your {tabTitle} section is complete
            </h1>

            {/* Confirmation sentence */}
            <p className="text-[#45464d] mb-6" style={{ fontSize: '16px', lineHeight: '24px' }}>
              Great work. All {questions.length} questions have been answered.
            </p>

            {/* NEXT SECTION label */}
            {nextTab && (
              <div className="text-center mb-2">
                <span className="text-xs uppercase text-[#0D9488] font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600 }}>
                  NEXT SECTION
                </span>
              </div>
            )}

            {/* Next section card */}
            {nextTab && (
              <div className="bg-white rounded-xl border border-[#E2E8F0] p-4 mb-6 text-left shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#dce9ff] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-[#004ac6] font-semibold">{nextTab.letter}</span>
                  </div>
                  <div>
                    <p className="font-medium text-[#0b1c30]">{nextTab.title}</p>
                    <p className="text-sm text-[#45464d]">{nextTab.description}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Continue button - fixed bottom */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={handleCompletionNext}
                  className="w-full bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors"
                  style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500 }}
                >
                  {nextTab ? `Continue to ${nextTab.title} →` : 'Complete →'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUESTION STATE ====================

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9ff]">
        {/* Progress bar skeleton */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-[#E2E8F0] z-40">
          <div className="h-full bg-[#0D9488] transition-all" style={{ width: `${(tabIndex / TABS.length) * 100}%` }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <Link href="/" className="flex items-center gap-2">
              <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
              </svg>
              <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
            </Link>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-8">
            <div className="h-8 bg-[#E2E8F0] rounded w-1/3 mb-4 animate-pulse" />
            <div className="h-4 bg-[#E2E8F0] rounded w-2/3 mb-8 animate-pulse" />
            <div className="space-y-4">
              <div className="h-12 bg-[#E2E8F0] rounded animate-pulse" />
              <div className="h-12 bg-[#E2E8F0] rounded animate-pulse" />
              <div className="h-12 bg-[#E2E8F0] rounded animate-pulse" />
            </div>
          </div>
        </main>
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
          <h2 className="text-xl font-bold text-[#0b1c30] mb-2">Failed to load answers</h2>
          <p className="text-[#45464d] mb-6">{loadError}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-[#004ac6] text-white font-medium py-3 px-6 rounded-lg hover:bg-[#00337d] transition-colors"
              style={{ minHeight: '56px' }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // QUESTION STATE - Main rendering
  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Progress bar - thin teal at very top */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-[#E2E8F0] z-40">
        <div
          className="h-full bg-[#0D9488] transition-all"
          style={{ width: `${((tabIndex + ((currentIndex + 1) / questions.length)) / TABS.length) * 100}%` }}
        />
      </div>

      {/* Sticky header */}
      <header className="fixed top-1 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <svg className="w-6 h-6 text-[#004ac6]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" />
            </svg>
            <span className="text-xl font-bold text-[#004ac6]">e2go.app</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-[#0D9488]">
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : saveStatus === 'saved' || saveStatus === 'idle' ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>Saved</span>
              </>
            ) : (
              <span className="text-red-600">Save failed</span>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
        {/* Question metadata */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs uppercase text-[#45464d] font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600 }}>
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <span className="px-2 py-0.5 bg-[#dce9ff] text-[#004ac6] rounded text-xs font-medium">
            Building: {tabTitle}
          </span>
        </div>

        {/* Question card */}
        {currentQuestion && (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-6">
            <QuestionRenderer
              question={currentQuestion}
              value={answers[currentQuestion.key]}
              onChange={(value) => onAnswerChange(currentQuestion.key, value)}
              disabled={saveStatus === 'saving'}
            />

            {/* Navigation - bottom bar fixed */}
            <div className="flex justify-between mt-8 pt-6 border-t border-[#E2E8F0]">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-[#45464d] text-[#45464d] rounded-lg hover:bg-[#f8f9ff] transition-colors"
                style={{ minHeight: '56px' }}
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!canContinue || saveStatus === 'saving'}
                className="px-6 py-3 bg-[#004ac6] text-white font-medium rounded-lg hover:bg-[#00337d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '56px' }}
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
      </main>
    </div>
  );
}