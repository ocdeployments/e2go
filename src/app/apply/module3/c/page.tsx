'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type ScreenState = 'intro' | 'question' | 'completion' | 'resume';

interface LetterData {
  applicantName: string;
  country: string;
  businessName: string;
  businessType: string;
  investmentAmount: string;
  ownershipPercent: string;
  processingPath: string;
}

export default function TabCPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [letterData, setLetterData] = useState<LetterData | null>(null);
  const [letterConfirmed, setLetterConfirmed] = useState<boolean | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [needsReview, setNeedsReview] = useState(false);

  // Get user's answers and build letter
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/c');
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

        // Fetch answers needed for letter
        const { data: answersData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id);

        const answers: Record<string, string> = {};
        answersData?.forEach(row => {
          answers[row.question_id] = row.answer;
        });

        // Build letter data from answers
        // QA-01: Full name, Q0-01: Country, QA-51: Business name
        // QA-53: Business type, QA-56: Investment amount, QA-55: Ownership %
        // Q0-03: Processing path
        const data: LetterData = {
          applicantName: answers['QA-01'] || answers['full_name'] || 'Applicant',
          country: answers['Q0-01'] || answers['country'] || 'Treaty Country',
          businessName: answers['QA-51'] || answers['business_name'] || 'Business Name',
          businessType: answers['QA-53'] || answers['business_type'] || 'enterprise',
          investmentAmount: answers['QA-56'] || answers['investment_amount'] || '$0',
          ownershipPercent: answers['QA-55'] || answers['ownership_percent'] || '100',
          processingPath: answers['Q0-03'] || answers['processing_path'] || 'consular processing',
        };

        // Format investment amount with commas
        const amountNum = parseInt(data.investmentAmount.replace(/[^0-9]/g, '')) || 0;
        data.investmentAmount = `$${amountNum.toLocaleString()} USD`;

        setLetterData(data);

        // Check if letter was already confirmed
        const { data: confirmData } = await supabase
          .from('answers')
          .select('answer')
          .eq('application_id', existingApp.id)
          .eq('question_id', 'QC-CONFIRMED')
          .single();

        if (confirmData?.answer === 'true') {
          setLetterConfirmed(true);
          setScreenState('completion');
        } else if (confirmData?.answer === 'false') {
          setLetterConfirmed(false);
          setNeedsReview(true);
        }
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  const handleConfirm = useCallback(async (confirmed: boolean) => {
    if (!applicationId) return;
    setSaveStatus('saving');

    await supabase.from('answers').upsert({
      application_id: applicationId,
      question_id: 'QC-CONFIRMED',
      answer: confirmed ? 'true' : 'false',
    });

    setLetterConfirmed(confirmed);
    setNeedsReview(!confirmed);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);

    if (confirmed) {
      setScreenState('completion');
    }
  }, [applicationId, supabase]);

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get first name for pronouns
  const firstName = letterData?.applicantName?.split(' ')[0] || 'The applicant';
  const pronoun = firstName.toLowerCase().endsWith('s') ? 'They' :
    ['a', 'e', 'i', 'o', 'u'].includes(firstName.toLowerCase()[0]) ? 'They' : 'He/She';

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '25%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Tab C</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0D9488' }}>
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-6h8v2H8v-2zm0-3h8v2H8v-2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
              Visa Category Confirmation Letter
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              This letter confirms you are applying under the E-2 Treaty Investor classification and sits behind Tab C in your binder. It&apos;s generated from your answers — review it and confirm it&apos;s accurate.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>Auto-generated from your profile</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>Formatted for consular review</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(13,148,136,0.15)', color: '#0D9488', border: '1px solid rgba(13,148,136,0.3)' }}>One page — no edits needed</span>
            </div>

            <button
              onClick={() => setScreenState('question')}
              className="w-full font-medium rounded-lg transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
            >
              Generate My Letter →
            </button>

            <button
              onClick={() => router.push('/apply/module3/b')}
              className="px-6 py-3 border rounded-lg transition-colors"
              style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,230,0.65)' }}
            >
              Back
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ==================== QUESTION STATE ====================
  if (screenState === 'question' || (screenState === 'resume' && !letterConfirmed)) {
    if (!letterData) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1f' }}>
          <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    const isConsular = letterData.processingPath.toLowerCase().includes('consular');

    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '25%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: '#0D9488' }}>
              {saveStatus === 'saving' ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: 'rgba(240,237,230,0.65)' }}>
              LETTER PREVIEW
            </span>
          </div>

          {/* Letter preview card */}
          <div className="glass p-6 mb-6" style={{ background: '#fff', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="text-right mb-8" style={{ color: '#000', fontSize: '14px' }}>
              {today}
            </div>

            <div className="mb-6" style={{ color: '#000', fontSize: '14px' }}>
              <strong>Re: E-2 Treaty Investor Visa Application</strong><br />
              {letterData.applicantName}<br />
              {letterData.businessName}
            </div>

            <div className="mb-6" style={{ color: '#000', fontSize: '14px' }}>
              <strong>To Whom It May Concern:</strong>
            </div>

            <div className="mb-6 space-y-3" style={{ color: '#000', fontSize: '14px', lineHeight: '1.8' }}>
              <p>
                {letterData.applicantName} is applying for E-2 Treaty Investor
                nonimmigrant visa status pursuant to the Treaty of Friendship,
                Commerce and Navigation between the United States and {letterData.country}.
              </p>
              <p>
                {firstName} proposes to invest {letterData.investmentAmount}
                to establish and develop {letterData.businessName}, a {letterData.businessType}
                enterprise. {pronoun} will hold {letterData.ownershipPercent}%
                ownership and serve as the principal directing investor
                responsible for the development and direction of the enterprise.
              </p>
              <p>
                This application is being processed via{' '}
                {isConsular ? 'consular processing at the U.S. Embassy' : 'change of status with USCIS'}.
              </p>
              <p>
                This letter is submitted as part of the complete E-2 application
                package for the applicant&apos;s review.
              </p>
            </div>
          </div>

          {/* Confirmation */}
          <div className="glass p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <p className="text-center mb-4" style={{ color: '#f0ede6', fontSize: '15px' }}>
              Does this letter accurately reflect your application?
            </p>

            {needsReview && (
              <div className="mb-4 p-4 rounded-lg text-center" style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.3)' }}>
                <p className="text-sm" style={{ color: '#D97706' }}>
                  Something looks wrong. Please contact your attorney for review.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleConfirm(true)}
                className="w-full font-medium rounded-lg transition-colors"
                style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
              >
                Yes, this is correct
              </button>
              <button
                onClick={() => handleConfirm(false)}
                className="w-full px-6 py-3 border rounded-lg transition-colors"
                style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: '#f0ede6' }}
              >
                Something looks wrong — I need to make a change
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==================== COMPLETION STATE ====================
  if (screenState === 'completion') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '33.33%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#0D9488' }}>✓ Saved</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0D9488' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
              Letter Generated
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Your visa category confirmation letter is ready. It will be included in Tab C of your binder.
            </p>

            <button
              onClick={() => router.push('/apply/module3/d')}
              className="w-full font-medium rounded-lg transition-colors"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
            >
              Continue to Tab D →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Resume state with letter already confirmed
  if (screenState === 'resume' && letterConfirmed) {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '33.33%', background: '#0D9488' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: '#0D9488', fontFamily: "'Playfair Display', serif" }}>e2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: '#0D9488' }}>✓ Confirmed</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#0D9488' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
              Letter Generated
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Your visa category confirmation letter is ready. It will be included in Tab C of your binder.
            </p>

            <button
              onClick={() => router.push('/apply/module3/d')}
              className="w-full font-medium rounded-lg transition-colors"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: '#0D9488', color: '#fff', borderRadius: '8px' }}
            >
              Continue to Tab D →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1f' }}>
      <div className="w-8 h-8 border-2 border-[#0D9488] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
