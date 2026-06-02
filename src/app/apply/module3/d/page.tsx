'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type ScreenState = 'intro' | 'question' | 'generation' | 'completion' | 'resume';

interface CoverLetterData {
  applicantName: string;
  country: string;
  businessName: string;
  businessType: string;
  investmentAmount: string;
  ownershipPercent: string;
}

interface QDAnswers {
  'QD-01'?: string;
  'QD-02'?: string;
  'QD-03'?: string;
  'QD-04'?: string;
  'QD-05'?: string;
  'QD-06'?: string;
}

const QUESTIONS = [
  {
    key: 'QD-01',
    type: 'textarea' as const,
    question: 'How would you describe your professional background in 2–3 sentences?',
    label: 'Tell us about yourself professionally',
    helperText: 'Describe your industry, years of experience, and key achievements. This feeds the opening paragraph of your cover letter — be specific.',
    example: 'I am a 15-year veteran of the food service industry, having managed three successful restaurant locations across Ontario. I have direct experience in operations, staff management, and franchise compliance.',
    required: true,
  },
  {
    key: 'QD-02',
    type: 'textarea' as const,
    question: 'Why are you investing in this specific business?',
    label: 'Your motivation',
    helperText: 'Explain why this business, why now, and why you are the right person to run it. The officer is looking for genuine motivation, not a template answer.',
    required: true,
  },
  {
    key: 'QD-03',
    type: 'textarea' as const,
    question: 'What specific skills and experience do you bring that make you qualified to run this business?',
    label: 'Your qualifications',
    helperText: 'Be specific. Reference your work history, any relevant certifications, industry knowledge, and management experience. Generic answers produce weak cover letters.',
    required: true,
  },
  {
    key: 'QD-04',
    type: 'textarea' as const,
    question: 'What is your plan for the business in the first 12 months?',
    label: 'Your 12-month plan',
    helperText: "Describe your first-year priorities — hiring, operations, revenue targets, and how you will establish the business.",
    required: true,
  },
  {
    key: 'QD-05',
    type: 'textarea' as const,
    question: 'Why do you intend to return to your home country when your E-2 status ends?',
    label: 'Your ties to home',
    helperText: "Describe your ties — family, property, financial interests — and your intention to depart the U.S. when the business ceases to operate or your status ends. This directly addresses the non-immigrant intent requirement.",
    required: true,
  },
  {
    key: 'QD-06',
    type: 'textarea' as const,
    question: 'Is there anything unusual or complex about your case that the cover letter should address directly?',
    label: 'Anything unusual?',
    helperText: 'Examples: a prior visa refusal, an unusual source of funds, a business that changed from the original plan, a gap in employment. Better to address it proactively.',
    hasNAOption: true,
    naLabel: 'No — nothing unusual',
    required: false,
  },
];

const GENERATION_STEPS = [
  'Reviewing your professional background',
  'Incorporating your investment motivation',
  'Structuring your qualifications narrative',
  'Building your 12-month plan section',
  'Addressing non-immigrant intent',
  'Assembling final cover letter...',
];

export default function TabDPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QDAnswers>({});
  const [coverLetterData, setCoverLetterData] = useState<CoverLetterData | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [generationStep, setGenerationStep] = useState(0);
  const [hasComplexCase, setHasComplexCase] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  // Initialize - get application and check saved state
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/d');
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

        // Fetch answers for QD-01 through QD-06
        const { data: answersData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id)
          .in('question_id', QUESTIONS.map(q => q.key));

        const savedAnswers: QDAnswers = {};
        answersData?.forEach(row => {
          (savedAnswers as Record<string, string>)[row.question_id] = row.answer;
        });
        setAnswers(savedAnswers);

        // Check if all questions answered to determine screen state
        const answeredCount = QUESTIONS.filter(q => (savedAnswers as Record<string, string>)[q.key] && (savedAnswers as Record<string, string>)[q.key] !== '').length;

        // Fetch cover letter data (from QA questions)
        const { data: coverData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id)
          .in('question_id', ['QA-01', 'Q0-01', 'QA-51', 'QA-53', 'QA-56', 'QA-55']);

        const coverAnswers: Record<string, string> = {};
        coverData?.forEach(row => {
          coverAnswers[row.question_id] = row.answer;
        });

        const data: CoverLetterData = {
          applicantName: coverAnswers['QA-01'] || 'Applicant',
          country: coverAnswers['Q0-01'] || 'Treaty Country',
          businessName: coverAnswers['QA-51'] || 'Business Name',
          businessType: coverAnswers['QA-53'] || 'enterprise',
          investmentAmount: coverAnswers['QA-56'] || '$0',
          ownershipPercent: coverAnswers['QA-55'] || '100',
        };
        setCoverLetterData(data);

        // Check if letter was already generated and confirmed
        const { data: confirmData } = await supabase
          .from('answers')
          .select('answer')
          .eq('application_id', existingApp.id)
          .eq('question_id', 'QD-CONFIRMED')
          .single();

        const { data: letterData } = await supabase
          .from('answers')
          .select('answer')
          .eq('application_id', existingApp.id)
          .eq('question_id', 'QD-GENERATED-LETTER')
          .single();

        if (confirmData?.answer === 'true') {
          setGeneratedLetter(letterData?.answer || null);
          setScreenState('completion');
        } else if (answeredCount >= QUESTIONS.length && letterData?.answer) {
          setGeneratedLetter(letterData.answer);
          setScreenState('generation');
        } else if (answeredCount > 0) {
          setScreenState('question');
          // Find the first unanswered question
          const firstUnanswered = QUESTIONS.findIndex(q => !(savedAnswers as Record<string, string>)[q.key] || (savedAnswers as Record<string, string>)[q.key] === '');
          setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
        }
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  // Debounced save function
  const saveAnswer = useCallback(async (key: string, value: string) => {
    if (!applicationId) return;

    setSaveStatus('saving');

    const { error } = await supabase
      .from('answers')
      .upsert(
        {
          application_id: applicationId,
          question_id: key,
          answer: value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'application_id,question_id' }
      );

    if (!error) {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } else {
      setSaveStatus('error');
    }
  }, [applicationId, supabase]);

  // Handle answer change with debounce
  const handleAnswerChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveAnswer(key, value);
    }, 800);
  };

  // Handle QD-06 N/A toggle
  const handleQ6NAToggle = () => {
    if (hasComplexCase || !answers['QD-06']) {
      setHasComplexCase(false);
      handleAnswerChange('QD-06', '');
    } else {
      setHasComplexCase(true);
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleContinue = () => {
    if (isLastQuestion) {
      // Start generation
      setScreenState('generation');
      runGeneration();
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleIntroStart = () => {
    setScreenState('question');
    setCurrentIndex(0);
  };

  const handleCompletionNext = () => {
    router.push('/apply/module3/e');
  };

  // Generation process
  const runGeneration = async () => {
    setGenerationStep(0);

    // Animate through steps
    for (let i = 0; i < GENERATION_STEPS.length - 1; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setGenerationStep(i + 1);
    }

    // Call AI API to generate letter
    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'cover-letter',
          data: {
            ...coverLetterData,
            ...answers,
          },
        }),
      });

      const data = await response.json();
      const letter = data.letter || 'Failed to generate letter. Please try again.';

      setGeneratedLetter(letter);

      // Save generated letter
      if (applicationId) {
        await supabase.from('answers').upsert(
          {
            application_id: applicationId,
            question_id: 'QD-GENERATED-LETTER',
            answer: letter,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'application_id,question_id' }
        );
      }

      setGenerationStep(GENERATION_STEPS.length);
    } catch (error) {
      console.error('Generation error:', error);
      setGeneratedLetter('Error generating letter. Please try again.');
      setGenerationStep(GENERATION_STEPS.length);
    }
  };

  // Confirm letter
  const handleConfirmLetter = async () => {
    if (!applicationId) return;

    setSaveStatus('saving');

    await supabase.from('answers').upsert(
      {
        application_id: applicationId,
        question_id: 'QD-CONFIRMED',
        answer: 'true',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'application_id,question_id' }
    );

    setScreenState('completion');
    setSaveStatus('saved');
  };

  // Handle edit request
  const handleEditRequest = () => {
    setScreenState('question');
    // Find first unanswered or go to start
    const firstUnanswered = QUESTIONS.findIndex(q => !(answers as Record<string, string>)[q.key] || (answers as Record<string, string>)[q.key] === '');
    setCurrentIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
  };

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '25%', background: '#0D9488' }} />
        </div>

        {/* Header */}
        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Tab D</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            {/* Large teal icon in circle background */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0D9488' }}>
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
              </svg>
            </div>

            {/* Section name headline */}
            <h1 className="text-2xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600 }}>
              Your Cover Letter
            </h1>

            {/* 2-line description */}
            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              The cover letter is the first thing the consular officer reads. It&apos;s your personal narrative — your story, your investment, your qualifications, your intent. We&apos;ll ask you six questions and generate it from your words.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>6 focused questions</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>AI-generated from your answers</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>Structured to answer every officer concern</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>Review and confirm before it&apos;s locked</span>
            </div>

            {/* Question count */}
            <p className="text-sm mb-6" style={{ color: 'rgba(240,237,230,0.45)', fontSize: '14px' }}>
              This section has {QUESTIONS.length} questions
            </p>

            {/* Let's begin button */}
            <button
              onClick={handleIntroStart}
              className="w-full font-medium rounded-lg transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
            >
              Begin Cover Letter Questions →
            </button>

            {/* Back ghost button */}
            <button
              onClick={() => router.push('/apply/module3/c')}
              className="w-full px-6 py-3 border rounded-lg transition-colors"
              style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,230,0.65)', borderRadius: '8px' }}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==================== GENERATION STATE ====================
  if (screenState === 'generation') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '41%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <h2 className="text-xl font-semibold mb-6 text-center font-playfair" style={{ color: '#f0ede6' }}>
              Generating your cover letter...
            </h2>

            {/* Generation steps */}
            <div className="space-y-3">
              {GENERATION_STEPS.map((step, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{
                    background: index < generationStep ? 'rgba(13,148,136,0.15)' : index === generationStep ? 'rgba(255,255,255,0.05)' : 'transparent',
                    border: index === generationStep ? '1px solid rgba(13,148,136,0.3)' : '1px solid transparent',
                  }}
                >
                  {index < generationStep ? (
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#0D9488' }}>
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : index === generationStep ? (
                    <div className="w-5 h-5 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-5 h-5 border-2 border-[rgba(255,255,255,0.2)] rounded-full" />
                  )}
                  <span style={{ color: index <= generationStep ? '#f0ede6' : 'rgba(240,237,230,0.45)' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>

            {/* Generated letter preview */}
            {generatedLetter && generationStep >= GENERATION_STEPS.length && (
              <div className="mt-8">
                <div className="bg-white rounded-lg p-6 mb-6" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <div style={{ fontFamily: 'Times New Roman, serif', fontSize: '14px', lineHeight: '1.8', color: '#000' }}>
                    <div dangerouslySetInnerHTML={{ __html: generatedLetter.replace(/\n/g, '<br/>') }} />
                  </div>
                </div>

                <p className="text-center mb-4" style={{ color: 'rgba(240,237,230,0.65)' }}>
                  Does this letter accurately reflect your application?
                </p>

                <button
                  onClick={handleConfirmLetter}
                  className="w-full font-medium rounded-lg transition-colors mb-3"
                  style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
                >
                  This looks correct — confirm →
                </button>

                <button
                  onClick={handleEditRequest}
                  className="w-full px-6 py-3 border rounded-lg transition-colors"
                  style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: '#f0ede6', borderRadius: '8px' }}
                >
                  I need to make a change
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ==================== COMPLETION STATE ====================
  if (screenState === 'completion') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '50%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#0D9488' }}>✓ Saved</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            {/* Completion checkmark */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0D9488' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            {/* Headline */}
            <h1 className="text-2xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600 }}>
              Cover Letter Complete
            </h1>

            {/* Confirmation sentence */}
            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Your cover letter has been generated and saved. It will be refined during document generation using everything else you tell us about your application.
            </p>

            {/* NEXT SECTION label */}
            <div className="text-center mb-2">
              <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: '#0D9488' }}>
                NEXT SECTION
              </span>
            </div>

            {/* Next section card */}
            <div className="glass p-4 mb-6 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(13,148,136,0.15)' }}>
                  <span className="font-semibold" style={{ color: '#0D9488' }}>E</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#f0ede6' }}>Ownership Structure</p>
                  <p className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>How your business is owned and controlled</p>
                </div>
              </div>
            </div>

            {/* Continue button - fixed bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'rgba(6,13,31,0.9)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={handleCompletionNext}
                  className="w-full font-medium rounded-lg transition-colors"
                  style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff' }}
                >
                  Continue to Ownership Structure →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUESTION STATE ====================
  return (
    <div className="min-h-screen" style={{ background: '#060d1f' }}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div
          className="h-full transition-all"
          style={{ width: `${((3 + ((currentIndex + 1) / QUESTIONS.length)) / 12) * 100}%`, background: '#0D9488' }}
        />
      </div>

      {/* Sticky header */}
      <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: '#0D9488' }}>
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
              <span style={{ color: '#fca5a5' }}>Save failed</span>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
        {/* Question metadata */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: 'rgba(240,237,230,0.65)' }}>
            QUESTION {currentIndex + 1} OF {QUESTIONS.length}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(13,148,136,0.15)', color: '#0D9488' }}>
            Cover Letter
          </span>
        </div>

        {/* Question card */}
        {currentQuestion && (
          <div className="glass p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            {/* Label */}
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#0D9488', letterSpacing: '0.04em' }}>
              {currentQuestion.label}
            </label>

            {/* Question text */}
            <h2 className="text-xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '26px', fontWeight: 600 }}>
              {currentQuestion.question}
            </h2>

            {/* Helper text */}
            <p className="mb-4" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '14px', lineHeight: '1.6' }}>
              {currentQuestion.helperText}
            </p>

            {/* Example (for QD-01 only) */}
            {currentQuestion.example && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid #0D9488' }}>
                <p className="text-xs mb-1" style={{ color: 'rgba(240,237,230,0.45)' }}>Example:</p>
                <p className="text-sm" style={{ color: 'rgba(240,237,230,0.75)', fontStyle: 'italic' }}>
                  {currentQuestion.example}
                </p>
              </div>
            )}

            {/* N/A option for QD-06 */}
            {currentQuestion.hasNAOption && (
              <div className="mb-4">
                <label className="flex items-center gap-3 cursor-pointer" style={{ color: 'rgba(240,237,230,0.85)' }}>
                  <input
                    type="checkbox"
                    checked={!hasComplexCase && !!answers['QD-06']}
                    onChange={handleQ6NAToggle}
                    className="w-5 h-5 rounded"
                    style={{ accentColor: '#0D9488' }}
                  />
                  <span>{currentQuestion.naLabel}</span>
                </label>
              </div>
            )}

            {/* Textarea input */}
            <textarea
              value={answers[currentQuestion.key as keyof QDAnswers] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.key, e.target.value)}
              disabled={saveStatus === 'saving'}
              placeholder={currentQuestion.hasNAOption && !hasComplexCase ? 'Type here or check the box above...' : 'Type your answer here...'}
              className="w-full rounded-lg p-4 resize-none"
              style={{
                minHeight: '120px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#f0ede6',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '16px',
                outline: 'none',
              }}
            />

            {/* Navigation - bottom bar fixed */}
            <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <button
                onClick={handleBack}
                className="px-6 py-3 border rounded-lg transition-colors"
                style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,230,0.65)', borderRadius: '8px' }}
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={saveStatus === 'saving'}
                className="px-6 py-3 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ minHeight: '56px', background: '#0D9488', color: '#fff', borderRadius: '8px' }}
              >
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : isLastQuestion
                  ? 'Generate Letter'
                  : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
