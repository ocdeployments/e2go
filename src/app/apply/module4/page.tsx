'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  id: string;
  gap_category: string;
  question_text: string;
  why_it_matters: string;
  question_number: number;
}

export default function Module4Page() {
  const router = useRouter();
  const [screen, setScreen] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Voice sample state
  const [voiceText, setVoiceText] = useState('');
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const [isFlagged, setIsFlagged] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSavingAnswer, setIsSavingAnswer] = useState(false);

  // Completion state
  const [summary, setSummary] = useState<string[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // Get application ID on mount
  useEffect(() => {
    const getApplication = async () => {
      const { createBrowserSupabaseClient } = await import('@/lib/supabase');
      const supabase = createBrowserSupabaseClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: application } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (application) {
        setApplicationId(application.id);
      }
    };

    getApplication();
  }, [router]);

  const wordCount = voiceText.trim().split(/\s+/).filter(Boolean).length;

  const getWordCountColor = () => {
    if (wordCount < 30) return 'rgba(239,68,68,0.80)';
    if (wordCount < 50) return '#F59E0B';
    return '#C9A84C';
  };

  const handleSaveVoiceSample = async () => {
    if (!applicationId || wordCount < 30) return;

    setIsSavingVoice(true);
    setSaveError(null);

    try {
      const response = await fetch('/api/followup/save-voice-sample', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          voiceSampleText: voiceText,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setVoiceSaved(true);
        setIsFlagged(data.flagged);

        if (data.flagged) {
          // Allow user to re-write
        } else {
          setTimeout(() => {
            setScreen(3);
          }, 1500);
        }
      } else {
        setSaveError(data.error || 'Failed to save');
      }
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setIsSavingVoice(false);
    }
  };

  const handleRegenerateSample = () => {
    setVoiceText('');
    setVoiceSaved(false);
    setIsFlagged(false);
  };

  const handleGenerateQuestions = useCallback(async () => {
    if (!applicationId) return;

    setIsLoadingQuestions(true);

    try {
      const response = await fetch('/api/followup/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (error) {
      console.error('Failed to generate questions:', error);
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [applicationId]);

  const handleSaveAnswer = async (skip = false) => {
    if (!applicationId) return;

    const question = questions[currentQuestionIndex];
    if (!question) return;

    setIsSavingAnswer(true);

    try {
      await fetch('/api/followup/save-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          questionText: question.question_text,
          answerText: skip ? '' : (answers[question.question_number] || ''),
          questionNumber: question.question_number,
          gapCategory: question.gap_category,
        }),
      });
    } catch (error) {
      console.error('Failed to save answer:', error);
    } finally {
      setIsSavingAnswer(false);
    }
  };

  const handleNextQuestion = async () => {
    const question = questions[currentQuestionIndex];
    const hasContent = answers[question?.question_number]?.trim().length > 0;

    await handleSaveAnswer(!hasContent);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setScreen(4);
    }
  };

  const handleSkipQuestion = async () => {
    await handleSaveAnswer(true);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setScreen(4);
    }
  };

  useEffect(() => {
    if (screen === 3 && applicationId && questions.length === 0 && !isLoadingQuestions) {
      handleGenerateQuestions();
    }
  }, [screen, applicationId, questions.length, isLoadingQuestions, handleGenerateQuestions]);

  const handleGetSummary = async () => {
    if (!applicationId) return;

    setIsLoadingSummary(true);

    try {
      const response = await fetch('/api/followup/completion-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();
      setSummary(data.summary || []);
    } catch (error) {
      console.error('Failed to get summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  useEffect(() => {
    if (screen === 4 && applicationId) {
      handleGetSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, applicationId]);

  const currentQuestion = questions[currentQuestionIndex];

  // Screen 1: Introduction
  if (screen === 1) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div className="text-center">
            <p className="text-[#C9A84C] uppercase tracking-wider text-xs font-medium mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              MODULE 4
            </p>

            <h1 className="text-[#f5f0e8] text-[42px] font-light mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Before we write your documents...
            </h1>

            <p className="text-[rgba(245,240,232,0.70)] text-base mb-4 font-light" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Your application answers are ready to become consulate-formatted documents. Before we begin, two short tasks will make your documents significantly stronger.
            </p>

            <p className="text-[rgba(245,240,232,0.70)] text-base mb-8 font-light" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              First, you will write a few sentences in your own words. Then we will ask you up to 8 short questions based on your specific application. Most applicants finish in 15–20 minutes.
            </p>

            <p className="text-[#C9A84C] text-sm mb-10 font-light" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              ⏱ Estimated time: 15–20 minutes
            </p>

            <button
              onClick={() => setScreen(2)}
              className="bg-[#C9A84C] text-[#0a0a0a] px-8 py-3.5 font-medium transition-opacity hover:opacity-90"
              style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
            >
              Let&apos;s Begin →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 2: Voice Sample
  if (screen === 2) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <p className="text-[#C9A84C] uppercase tracking-wider text-xs font-medium mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            STEP 1 OF 2 — YOUR VOICE
          </p>

          <h1 className="text-[#f5f0e8] text-[36px] font-light mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Tell us about your decision in your own words.
          </h1>

          <p className="text-[rgba(245,240,232,0.70)] text-base mb-6 font-light" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            Write 3–5 sentences about why you chose this business and what you hope to build. Write naturally — as if explaining it to a friend. We use your writing style to make your documents sound like you wrote them.
          </p>

          <textarea
            value={voiceText}
            onChange={(e) => setVoiceText(e.target.value)}
            placeholder="I chose this business because..."
            className="w-full resize-none outline-none transition-colors"
            style={{
              minHeight: '180px',
              backgroundColor: 'rgba(201,168,76,0.02)',
              border: '1px solid rgba(201,168,76,0.15)',
              color: '#f5f0e8',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              fontSize: '14px',
              lineHeight: '1.7',
              padding: '14px 16px',
              borderRadius: 0,
            }}
          />

          <div className="flex justify-between items-center mt-3 mb-8">
            <span style={{ color: getWordCountColor(), fontFamily: 'DM Sans, sans-serif', fontSize: '14px', fontWeight: 300 }}>
              {wordCount} words
            </span>
            <span style={{ color: 'rgba(245,240,232,0.40)', fontFamily: 'DM Sans, sans-serif', fontSize: '13px', fontWeight: 300 }}>
              {wordCount < 30 ? 'Aim for at least 50 words' : wordCount >= 50 ? 'Great!' : 'Almost there...'}
            </span>
          </div>

          {isFlagged && !voiceSaved && (
            <div className="border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.06)] p-4 mb-6">
              <p className="text-[#F59E0B] text-sm" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                This writing may have been AI-assisted. Your documents will be more credible when written in your own natural voice. Please write a fresh sample in your own words.
              </p>
            </div>
          )}

          {saveError && (
            <div className="border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.06)] p-4 mb-6">
              <p className="text-red-400 text-sm" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                {saveError}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {isFlagged ? (
              <button
                onClick={handleRegenerateSample}
                disabled={isSavingVoice}
                className="bg-[#C9A84C] text-[#0a0a0a] px-8 py-3.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
              >
                Write in My Own Words →
              </button>
            ) : (
              <button
                onClick={handleSaveVoiceSample}
                disabled={wordCount < 30 || isSavingVoice}
                className="bg-[#C9A84C] text-[#0a0a0a] px-8 py-3.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
              >
                {isSavingVoice ? 'Analyzing your writing style...' : 'Save My Writing Sample →'}
              </button>
            )}

            {voiceSaved && !isFlagged && (
              <p className="text-[#C9A84C] text-sm mt-2" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
                ✓ Voice profile captured
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Screen 3: Follow-Up Questions
  if (screen === 3) {
    if (isLoadingQuestions || questions.length === 0) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-[#C9A84C] uppercase tracking-wider text-xs font-medium mb-6" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              STEP 2 OF 2
            </p>
            <p className="text-[rgba(245,240,232,0.60)] text-lg italic" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Reviewing your application...
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
              <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-pulse" style={{ animationDelay: '200ms' }}></span>
              <span className="w-2 h-2 bg-[#C9A84C] rounded-full animate-pulse" style={{ animationDelay: '400ms' }}></span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <p className="text-[#C9A84C] uppercase tracking-wider text-xs font-medium mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            STEP 2 OF 2 — QUESTION {currentQuestionIndex + 1} OF {questions.length}
          </p>

          <div className="h-0.5 bg-[rgba(201,168,76,0.15)] mb-8">
            <div
              className="h-full bg-[#C9A84C] transition-all duration-300 ease-out"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          <div className="bg-[rgba(201,168,76,0.04)] border-l-2 border-[#C9A84C] p-3 mb-5">
            <p className="text-[rgba(245,240,232,0.55)] text-sm italic" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
              Why we asking: {currentQuestion.why_it_matters}
            </p>
          </div>

          <h2 className="text-[#f5f0e8] text-[28px] font-light mb-6" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            {currentQuestion.question_text}
          </h2>

          <textarea
            value={answers[currentQuestion.question_number] || ''}
            onChange={(e) => setAnswers({ ...answers, [currentQuestion.question_number]: e.target.value })}
            placeholder="Your answer..."
            className="w-full resize-none outline-none transition-colors"
            style={{
              minHeight: '120px',
              backgroundColor: 'rgba(201,168,76,0.02)',
              border: '1px solid rgba(201,168,76,0.15)',
              color: '#f5f0e8',
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 300,
              fontSize: '14px',
              lineHeight: '1.7',
              padding: '14px 16px',
              borderRadius: 0,
            }}
          />

          <div className="flex justify-between items-center mt-6">
            <button
              onClick={handleSkipQuestion}
              className="text-[rgba(245,240,232,0.35)] text-sm cursor-pointer hover:text-[rgba(245,240,232,0.60)] transition-colors"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}
            >
              Skip this question
            </button>

            <button
              onClick={handleNextQuestion}
              disabled={isSavingAnswer || !(answers[currentQuestion.question_number]?.trim())}
              className="bg-[#C9A84C] text-[#0a0a0a] px-8 py-3.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
            >
              {isSavingAnswer ? 'Saving...' : currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'See My Summary →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Screen 4: Completion Summary
  if (screen === 4) {
    if (isLoadingSummary) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-[rgba(245,240,232,0.60)] text-lg italic" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Compiling your insights...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <p className="text-[#C9A84C] uppercase tracking-wider text-xs font-medium mb-4" style={{ fontFamily: 'DM Sans, sans-serif' }}>
            READY TO GENERATE
          </p>

          <h1 className="text-[#f5f0e8] text-[42px] font-light mb-4" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            Here is what we found.
          </h1>

          <p className="text-[rgba(245,240,232,0.60)] text-base mb-8" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            These insights will strengthen your documents.
          </p>

          <div className="mb-6">
            {summary.map((bullet, index) => (
              <div key={index} className="flex items-start gap-3 mb-4">
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
                  fill="#C9A84C"
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <p className="text-[#f5f0e8] text-base" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 400 }}>
                  {bullet}
                </p>
              </div>
            ))}
          </div>

          <p className="text-[rgba(245,240,232,0.40)] text-sm mb-8" style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}>
            These insights have been added to your application profile.
          </p>

          <button
            onClick={() => applicationId && router.push(`/generate/${applicationId}`)}
            className="bg-[#C9A84C] text-[#0a0a0a] px-10 py-4 font-medium transition-opacity hover:opacity-90 w-full mb-3"
            style={{ fontFamily: 'DM Sans, sans-serif', borderRadius: 0 }}
          >
            Generate My Documents →
          </button>

          <button
            onClick={() => router.push('/apply')}
            className="text-[rgba(245,240,232,0.60)] text-sm w-full hover:text-[#f5f0e8] transition-colors"
            style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 300 }}
          >
            Review My Application First
          </button>
        </div>
      </div>
    );
  }

  return null;
}
