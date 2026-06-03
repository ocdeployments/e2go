'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

type ScreenState = 'intro' | 'question' | 'orgchart' | 'completion' | 'resume';

interface OrgChartData {
  applicantName: string;
  applicantTitle: string;
  ownershipPercent: string;
  partnerName?: string;
  partnerTitle?: string;
  partnerOwnership?: string;
  employeeRoles: string[];
}

interface QJAnswers {
  'QJ-01'?: string; // JSON string for education
  'QJ-02'?: string;
  'QJ-03'?: string; // JSON string for work history
  'QJ-04'?: string;
  'QJ-05'?: string;
  'QJ-05a'?: string;
  'QJ-06'?: string;
  'QJ-06a'?: string;
}

const QUESTIONS = [
  {
    key: 'QJ-01',
    type: 'education' as const,
    question: 'Please list your educational qualifications, starting with your most recent.',
    label: 'Your education',
    helperText: 'Add each degree or certification you have earned.',
    minEntries: 1,
    maxEntries: 5,
  },
  {
    key: 'QJ-02',
    type: 'textarea' as const,
    question: 'Do you hold any professional certifications, licences, or designations relevant to this business?',
    label: 'Professional certifications',
    helperText: 'Examples: Certified Food Manager, Red Seal trades certificate, provincial contractor licence, CPA, PMP, nursing registration.',
    hasNAOption: true,
    naLabel: 'I do not hold relevant professional certifications',
  },
  {
    key: 'QJ-03',
    type: 'workhistory' as const,
    question: 'Please describe your work history for the past 10 years, most recent first.',
    label: 'Your work history',
    helperText: 'Focus on management responsibilities — budgeting, staff oversight, client relationships, operations. These are what the officer looks for.',
    minEntries: 1,
    maxEntries: 7,
  },
  {
    key: 'QJ-04',
    type: 'textarea' as const,
    question: 'What specific experience do you have that directly prepares you to run this type of business?',
    label: 'Your relevant experience',
    helperText: 'This is the most important question in Tab J. Connect your history directly to this specific business. If you are opening a restaurant, describe your food service management experience. If buying a cleaning franchise, describe operations and service delivery experience.',
  },
  {
    key: 'QJ-05',
    type: 'select' as const,
    question: 'Have you ever owned or operated a business before?',
    label: 'Business ownership history',
    options: [
      { value: 'Yes', label: 'Yes' },
      { value: 'No', label: 'No' },
    ],
  },
  {
    key: 'QJ-05a',
    type: 'textarea' as const,
    question: 'Describe the business, your role, and for how long you operated it.',
    label: 'Prior business details',
    showIf: 'QJ-05=Yes',
  },
  {
    key: 'QJ-06',
    type: 'select' as const,
    question: 'Have you ever managed a team of employees?',
    label: 'Managing people',
    options: [
      { value: 'Yes - fewer than 5', label: 'Yes — fewer than 5 people' },
      { value: 'Yes - 5 to 20', label: 'Yes — 5 to 20 people' },
      { value: 'Yes - more than 20', label: 'Yes — more than 20 people' },
      { value: 'No', label: 'No, I have not managed employees' },
    ],
  },
  {
    key: 'QJ-06a',
    type: 'textarea' as const,
    question: 'Describe the nature of the team and your management responsibilities.',
    label: 'Team management details',
    showIf: 'QJ-06!=No',
  },
];

const DOC_CHECKLIST_ITEMS = [
  { id: 'cv', name: 'CV / résumé', always: true, note: 'You will prepare this from your work history above' },
  { id: 'degrees', name: 'Degree certificates or transcripts', condition: 'QJ-01 has entries' },
  { id: 'certs', name: 'Professional licence or certification documents', condition: 'QJ-02 not N/A' },
  { id: 'references', name: 'Reference letters from prior employers', always: false, note: 'Recommended always' },
  { id: 'prior-biz', name: 'Prior business registration or ownership documents', condition: 'QJ-05 = Yes' },
];

export default function TabJPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QJAnswers>({});
  const [orgChartData, setOrgChartData] = useState<OrgChartData | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [showNoMgmtAdvisory, setShowNoMgmtAdvisory] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentQuestion = QUESTIONS[currentIndex];
  const isLastQuestion = currentIndex === QUESTIONS.length - 1;

  // Initialize
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/j');
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

        // Fetch QJ answers
        const { data: answersData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id)
          .in('question_id', QUESTIONS.map(q => q.key));

        const savedAnswers: QJAnswers = {};
        answersData?.forEach(row => {
          (savedAnswers as Record<string, string>)[row.question_id] = row.answer;
        });
        setAnswers(savedAnswers);

        // Parse education and work history if saved (stored but not used currently)
        if (savedAnswers['QJ-01']) {
          try {
            JSON.parse(savedAnswers['QJ-01']);
          } catch { /* ignore parse errors */ }
        }
        if (savedAnswers['QJ-03']) {
          try {
            JSON.parse(savedAnswers['QJ-03']);
          } catch { /* ignore parse errors */ }
        }

        // Check for branches
        setShowNoMgmtAdvisory(savedAnswers['QJ-06'] === 'No');

        // Fetch org chart data
        const { data: orgData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id)
          .in('question_id', ['QA-01', 'QA-54', 'QA-55', 'QE-08', 'QE-09', 'QI-04']);

        const orgAnswers: Record<string, string> = {};
        orgData?.forEach(row => {
          orgAnswers[row.question_id] = row.answer;
        });

        const { data: bizData } = await supabase
          .from('answers')
          .select('answer')
          .eq('application_id', existingApp.id)
          .eq('question_id', 'QA-51')
          .single();

        setBusinessName(bizData?.answer || 'your business');

        setOrgChartData({
          applicantName: orgAnswers['QA-01'] || 'Applicant',
          applicantTitle: orgAnswers['QA-54'] || 'Owner / Managing Director',
          ownershipPercent: orgAnswers['QA-55'] || '100',
          partnerName: orgAnswers['QE-08'],
          partnerTitle: 'Co-Owner / Director',
          partnerOwnership: orgAnswers['QE-09'],
          employeeRoles: orgAnswers['QI-04'] ? orgAnswers['QI-04'].split(',').filter(Boolean) : [],
        });

        // Check if completed
        const { data: confirmData } = await supabase
          .from('answers')
          .select('answer')
          .eq('application_id', existingApp.id)
          .eq('question_id', 'QJ-ORG-CONFIRMED')
          .single();

        if (confirmData?.answer === 'true') {
          setScreenState('completion');
        }
      }

      setLoading(false);
    };

    init();
  }, [router, supabase]);

  // Debounced save
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

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers(prev => ({ ...prev, [key]: value }));

    // Handle branch visibility - just update advisory for QJ-06
    if (key === 'QJ-06') {
      setShowNoMgmtAdvisory(value === 'No');
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveAnswer(key, value), 800);
  };

  // Navigation handlers
  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleContinue = () => {
    if (isLastQuestion) {
      setScreenState('orgchart');
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleIntroStart = () => {
    setScreenState('question');
    setCurrentIndex(0);
  };

  const handleCompletionNext = () => {
    router.push('/apply/module3/k');
  };

  const handleConfirmOrgChart = async () => {
    if (!applicationId) return;
    setSaveStatus('saving');

    await supabase.from('answers').upsert(
      {
        application_id: applicationId,
        question_id: 'QJ-ORG-CONFIRMED',
        answer: 'true',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'application_id,question_id' }
    );

    setScreenState('completion');
    setSaveStatus('saved');
  };

  const handleEditAnswers = () => {
    setScreenState('question');
    setCurrentIndex(0);
  };

  // Render current question
  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const showThisQuestion = !currentQuestion.showIf ||
      (currentQuestion.showIf.startsWith('QJ-05') && currentQuestion.showIf.includes('=') && answers['QJ-05'] === currentQuestion.showIf.split('=')[1]) ||
      (currentQuestion.showIf.startsWith('QJ-06') && currentQuestion.showIf.includes('!=') && answers['QJ-06'] !== currentQuestion.showIf.split('!=')[1]) ||
      (currentQuestion.showIf.startsWith('QJ-06') && currentQuestion.showIf.includes('=') && answers['QJ-06']?.startsWith(currentQuestion.showIf.split('=')[1]));

    if (!showThisQuestion) return null;

    if (currentQuestion.type === 'select') {
      return (
        <div className="space-y-3">
          {currentQuestion.options?.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleAnswerChange(currentQuestion.key, opt.value)}
              className="w-full text-left p-4 rounded-lg transition-all"
              style={{
                background: (answers as Record<string, string>)[currentQuestion.key] === opt.value ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${(answers as Record<string, string>)[currentQuestion.key] === opt.value ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: '#f0ede6',
              }}
            >
              {(answers as Record<string, string>)[currentQuestion.key] === opt.value && (
                <span className="float-right" style={{ color: 'var(--gold)' }}>✓</span>
              )}
              {opt.label}
            </button>
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'textarea') {
      return (
        <>
          {currentQuestion.hasNAOption && (
            <div className="mb-4">
              <label className="flex items-center gap-3 cursor-pointer" style={{ color: 'rgba(240,237,230,0.85)' }}>
                <input
                  type="checkbox"
                  checked={!(answers as Record<string, string>)[currentQuestion.key] && (answers as Record<string, string>)[currentQuestion.key] !== undefined}
                  onChange={(e) => handleAnswerChange(currentQuestion.key, e.target.checked ? currentQuestion.naLabel || 'N/A' : '')}
                  style={{ accentColor: 'var(--gold)' }}
                />
                <span>{currentQuestion.naLabel}</span>
              </label>
            </div>
          )}
          <textarea
            value={(answers as Record<string, string>)[currentQuestion.key] || ''}
            onChange={(e) => handleAnswerChange(currentQuestion.key, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full rounded-lg p-4"
            style={{
              minHeight: '120px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f0ede6',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '16px',
            }}
          />
        </>
      );
    }

    return null;
  };

  // Render document checklist
  const renderDocChecklist = () => (
    <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--gold)', letterSpacing: '0.04em' }}>DOCUMENT CHECKLIST</h3>
      <div className="space-y-2">
        {DOC_CHECKLIST_ITEMS.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-2 rounded" style={{ background: item.always ? 'rgba(201,168,76,0.1)' : 'transparent', border: item.always ? '1px solid rgba(201,168,76,0.3)' : 'none' }}>
            <div className="w-5 h-5 rounded border flex items-center justify-center mt-0.5" style={{ borderColor: item.always ? 'var(--gold)' : 'rgba(255,255,255,0.3)', background: item.always ? 'var(--gold)' : 'transparent' }}>
              {item.always && <svg className="w-3 h-3" fill="white" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
            </div>
            <div>
              <p style={{ color: '#f0ede6', fontSize: '14px' }}>{item.name}</p>
              {item.note && <p style={{ color: 'rgba(240,237,230,0.45)', fontSize: '12px' }}>{item.note}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render org chart
  const renderOrgChart = () => {
    if (!orgChartData) return null;

    return (
      <div className="mt-8">
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--gold)', letterSpacing: '0.04em' }}>ORGANIZATIONAL CHART</h3>

        {/* Solo applicant */}
        {!orgChartData.partnerName ? (
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', minWidth: '200px' }}>
              <p style={{ color: '#f0ede6', fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', fontWeight: 600 }}>{orgChartData.applicantName}</p>
              <p style={{ color: 'rgba(240,237,230,0.65)', fontSize: '13px' }}>{orgChartData.applicantTitle}</p>
              <p style={{ color: 'var(--gold)', fontSize: '12px' }}>({orgChartData.ownershipPercent}%)</p>
            </div>
            <div className="w-px h-8" style={{ background: 'var(--gold)' }} />
            <div className="flex gap-4">
              {orgChartData.employeeRoles.length > 0 ? orgChartData.employeeRoles.slice(0, 3).map((role, i) => (
                <div key={i} className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', minWidth: '100px' }}>
                  <p style={{ color: 'rgba(240,237,230,0.85)', fontSize: '13px' }}>{role}</p>
                </div>
              )) : (
                <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.2)', minWidth: '100px' }}>
                  <p style={{ color: 'rgba(240,237,230,0.35)', fontSize: '12px' }}>To be hired — Year 1</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Partnership */
          <div className="flex justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', minWidth: '120px' }}>
                <p style={{ color: '#f0ede6', fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', fontWeight: 600 }}>{orgChartData.applicantName}</p>
                <p style={{ color: 'rgba(240,237,230,0.65)', fontSize: '11px' }}>Co-Owner ({orgChartData.ownershipPercent}%)</p>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="p-4 rounded-xl text-center" style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', minWidth: '120px' }}>
                <p style={{ color: '#f0ede6', fontFamily: "'Cormorant Garamond', serif", fontSize: '14px', fontWeight: 600 }}>{orgChartData.partnerName}</p>
                <p style={{ color: 'rgba(240,237,230,0.65)', fontSize: '11px' }}>Co-Owner ({orgChartData.partnerOwnership}%)</p>
              </div>
            </div>
          </div>
        )}

        {renderDocChecklist()}

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleConfirmOrgChart}
            className="flex-1 font-medium rounded-lg"
            style={{ minHeight: '56px', background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
          >
            This looks correct →
          </button>
          <button
            onClick={handleEditAnswers}
            className="px-6 py-3 border rounded-lg"
            style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,230,0.65)', borderRadius: '8px' }}
          >
            Edit my answers
          </button>
        </div>
      </div>
    );
  };

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '75%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
            </div>
            <div className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Tab J</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600 }}>
              Your Qualifications
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Tab J answers the officer&apos;s question: why are you the right person to run this business? We&apos;ll build your qualifications narrative and organizational chart from your work history, education, and experience.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Work history</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Education and certifications</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Org chart generated automatically</span>
              <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Directly feeds your cover letter</span>
            </div>

            <p className="text-sm mb-6" style={{ color: 'rgba(240,237,230,0.45)', fontSize: '14px' }}>
              This section has {QUESTIONS.filter(q => !q.showIf).length} questions
            </p>

            <button
              onClick={handleIntroStart}
              className="w-full font-medium rounded-lg transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
            >
              Begin Qualifications →
            </button>

            <button
              onClick={() => router.push('/apply/module3/i')}
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

  // ==================== ORGCHART STATE ====================
  if (screenState === 'orgchart') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '91%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <h2 className="text-xl font-semibold mb-6 text-center font-playfair" style={{ color: '#f0ede6' }}>
              Your Qualifications & Org Chart
            </h2>

            {renderOrgChart()}
          </div>
        </main>
      </div>
    );
  }

  // ==================== COMPLETION STATE ====================
  if (screenState === 'completion') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '100%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--gold)' }}>✓ Saved</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600 }}>
              Qualifications Complete
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Your qualifications narrative and organizational chart are ready. These feed directly into your cover letter and Tab J of your application binder.
            </p>

            <div className="text-center mb-2">
              <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: 'var(--gold)' }}>
                NEXT SECTION
              </span>
            </div>

            <div className="glass p-4 mb-6 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)' }}>
                  <span className="font-semibold" style={{ color: 'var(--gold)' }}>K</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#f0ede6' }}>Business Plan</p>
                  <p className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Your detailed operational and financial plan</p>
                </div>
              </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'rgba(6,13,31,0.9)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="max-w-2xl mx-auto">
                <button
                  onClick={handleCompletionNext}
                  className="w-full font-medium rounded-lg transition-colors"
                  style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff' }}
                >
                  Continue to Business Plan →
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
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full transition-all" style={{ width: `${((9 + ((currentIndex + 1) / QUESTIONS.filter(q => !q.showIf).length)) / 12) * 100}%`, background: 'var(--gold)' }} />
      </div>

      <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
          </div>
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--gold)' }}>
            {saveStatus === 'saving' ? (
              <>
                <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
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
            QUESTION {currentIndex + 1} OF {QUESTIONS.filter(q => !q.showIf).length}
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
            Qualifications
          </span>
        </div>

        {currentQuestion && (
          <div className="glass p-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--gold)', letterSpacing: '0.04em' }}>
              {currentQuestion.label}
            </label>

            <h2 className="text-xl font-semibold mb-4 font-playfair" style={{ color: '#f0ede6', fontSize: '26px', fontWeight: 600 }}>
              {currentQuestion.question.replace('[Business Name]', businessName)}
            </h2>

            {currentQuestion.helperText && (
              <p className="mb-4" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '14px', lineHeight: '1.6' }}>
                {currentQuestion.helperText}
              </p>
            )}

            {/* No management advisory */}
            {showNoMgmtAdvisory && (
              <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(217,119,6,0.15)', border: '1px solid rgba(217,119,6,0.35)' }}>
                <p style={{ color: 'var(--gold)', fontSize: '13px' }}>
                  No direct staff management experience isn&apos;t disqualifying — but your business plan should show a gradual staffing plan. We&apos;ll frame your transferable skills and your plan for managing growth.
                </p>
              </div>
            )}

            {renderQuestion()}

            <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <button
                onClick={handleBack}
                className="px-6 py-3 border rounded-lg"
                style={{ minHeight: '56px', borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(240,237,230,0.65)', borderRadius: '8px' }}
              >
                Back
              </button>
              <button
                onClick={handleContinue}
                disabled={saveStatus === 'saving'}
                className="px-6 py-3 font-medium rounded-lg disabled:opacity-50"
                style={{ minHeight: '56px', background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
              >
                {saveStatus === 'saving' ? 'Saving...' : isLastQuestion ? 'Review Org Chart' : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
