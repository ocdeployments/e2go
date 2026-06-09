'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { getPreFill } from '@/lib/prefill';
import _PreFilledField from '@/components/PreFilledField';

// Types
type ScreenState = 'intro' | 'question' | 'completion' | 'resume';

interface PreFilledQuestion extends Question {
  prefillValue?: string | string[] | null;
  prefillNote?: string | null;
  requiresConfirmation?: boolean;
  confirmationText?: string;
}

// Question data
interface Question {
  id: string;
  question: string;
  type: 'select' | 'currency' | 'multiselect' | 'text' | 'textarea';
  options?: string[];
  tooltip?: string;
  branch?: Record<string, string>;
  subQuestions?: Question[];
}

const QUESTIONS: Question[] = [
  {
    id: 'QF-01',
    question: 'Has the investment been made into an existing business, or are you starting a new business from scratch?',
    type: 'select',
    options: [
      'Existing business (acquiring an existing operation)',
      'New business (starting from scratch)',
      'Franchise (purchasing a franchise license and building the operation)'
    ],
    tooltip: 'This determines the document requirements for your investment proof.'
  },
  {
    id: 'QF-02',
    question: 'What is the total amount invested to date (in USD)?',
    type: 'currency',
    tooltip: 'Pre-filled from your Module 0 application — confirm and finalize.'
  },
  {
    id: 'QF-03',
    question: 'What is the total cost to establish or acquire the business (in USD)?',
    type: 'currency',
    tooltip: 'This is the denominator for the proportionality test. If total business cost is $150,000 and you have invested $150,000, you have invested 100% which is clearly substantial.'
  },
  {
    id: 'QF-04',
    question: 'In what form has the investment been made?',
    type: 'multiselect',
    options: [
      'Cash transferred to U.S. business bank account',
      'Equipment purchased',
      'Inventory purchased',
      'Franchise fees paid',
      'Leasehold improvements (renovations/build-out)',
      'Professional fees paid (legal, accounting, consulting)',
      'Intellectual property transferred',
      'Other tangible assets'
    ]
  },
  {
    id: 'QF-05',
    question: 'What is the source of your investment funds?',
    type: 'multiselect',
    options: [
      'Personal savings',
      'Sale of property',
      'Sale of a business',
      'Inheritance or gift received',
      'Loan secured by personal assets',
      'Proceeds from investments (stocks, bonds, mutual funds)',
      'Other'
    ],
    tooltip: 'Select all that apply. Each source may require specific documentation.'
  },
  {
    id: 'QF-NEW-01',
    question: 'Of the funds transferred to the business, how much has been spent on actual business expenses — franchise fees, equipment, deposits, build-out?',
    type: 'currency',
    tooltip: 'Funds sitting in a business bank account without being deployed may not satisfy the E-2 at-risk requirement.'
  },
  {
    id: 'QF-NEW-02',
    question: 'Confirm: your loan is secured against your personal assets, not the business assets. Can you provide the loan agreement?',
    type: 'select',
    options: [
      'Yes — secured against personal assets, I have the agreement',
      'Yes — but I do not have the agreement yet',
      'I am not certain how it is secured'
    ]
  },
  {
    id: 'QF-06',
    question: 'Can you show a continuous paper trail from your personal account to the business account in the United States?',
    type: 'select',
    options: [
      'Yes — complete, documented trail',
      'Mostly — there are some steps I can document',
      'No — there are gaps in the trail'
    ],
    tooltip: 'Every step in the funds trail should be documented with bank statements or transfer records.'
  },
  {
    id: 'QF-07',
    question: 'What is the name and address of the U.S. business bank account?',
    type: 'text',
    tooltip: 'Include bank name, branch location, and account type.'
  }
];

// Document checklist based on answers
interface ChecklistItem {
  id: string;
  name: string;
  obtainLocation: string;
  binderTab: string;
  condition?: string;
  checked: boolean;
}

export default function TabFPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [_confirmationStates, _setConfirmationStates] = useState<Record<string, boolean>>({});
  const [prefilledQuestions, setPrefilledQuestions] = useState<PreFilledQuestion[]>([]);

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    getUserData();
  }, [supabase]);

  useEffect(() => {
    // Convert static QUESTIONS to PrefilledQuestions on userEmail change
    if (userEmail !== undefined) {
      setPrefilledQuestions(
        (QUESTIONS as PreFilledQuestion[]).map(q => {
          const prefill = getPreFill(q.id, userEmail);
          if (prefill.value !== null) {
            return { ...q, ...prefill };
          }
          return q;
        })
      );
    }
  }, [userEmail]);

  // Build document checklist based on answers
  const checklistItems = useMemo((): ChecklistItem[] => {
    const items: ChecklistItem[] = [
      { id: 'us-bank-statements', name: 'U.S. business bank account statements', obtainLocation: 'From your U.S. business bank', binderTab: 'F', checked: false },
      { id: 'wire-records', name: 'Wire transfer records or deposit receipts', obtainLocation: 'From your bank or money transfer service', binderTab: 'F', checked: false },
      { id: 'source-bank-statements', name: 'Canadian bank statements showing source of funds', obtainLocation: '12-24 months of statements', binderTab: 'F', checked: false },
      { id: 'net-worth-statement', name: 'Net worth statement from certified professional accountant', obtainLocation: 'CPA-prepared statement (required by Toronto consulate)', binderTab: 'F', checked: false },
    ];

    // Add conditional items based on answers
    const investmentType = answers['QF-01'] || '';
    const sourceOfFunds = answers['QF-05'] || '';

    if (investmentType.toLowerCase().includes('existing')) {
      items.push({
        id: 'purchase-agreement',
        name: 'Purchase agreement or asset purchase agreement',
        obtainLocation: 'Signed purchase agreement with seller',
        binderTab: 'F',
        checked: false
      });
      items.push({
        id: 'business-valuation',
        name: 'Business valuation or appraisal',
        obtainLocation: 'Certified business appraiser report',
        binderTab: 'F',
        checked: false
      });
    }

    if (investmentType.toLowerCase().includes('franchise')) {
      items.push({
        id: 'franchise-agreement',
        name: 'Franchise agreement',
        obtainLocation: 'Signed franchise agreement',
        binderTab: 'F',
        checked: false
      });
      items.push({
        id: 'fdd',
        name: 'Franchise disclosure document (FDD)',
        obtainLocation: 'From franchisor',
        binderTab: 'F',
        checked: false
      });
    }

    if (sourceOfFunds.toLowerCase().includes('loan')) {
      items.push({
        id: 'loan-agreement',
        name: 'Loan agreement and security documentation',
        obtainLocation: 'Loan agreement showing personal asset security',
        binderTab: 'F',
        checked: false
      });
    }

    if (sourceOfFunds.toLowerCase().includes('property') || sourceOfFunds.toLowerCase().includes('sale of property')) {
      items.push({
        id: 'property-sale-docs',
        name: 'Property sale closing documents',
        obtainLocation: 'Closing statement from property sale',
        binderTab: 'F',
        checked: false
      });
    }

    if (sourceOfFunds.toLowerCase().includes('investment') || sourceOfFunds.toLowerCase().includes('stocks')) {
      items.push({
        id: 'investment-account',
        name: 'Investment account statements showing liquidation',
        obtainLocation: 'Broker statements showing sale and transfer',
        binderTab: 'F',
        checked: false
      });
    }

    if (sourceOfFunds.toLowerCase().includes('inheritance') || sourceOfFunds.toLowerCase().includes('gift')) {
      items.push({
        id: 'inheritance-docs',
        name: 'Inheritance or gift documentation',
        obtainLocation: 'Legal documents showing source and receipt',
        binderTab: 'F',
        checked: false
      });
    }

    return items;
  }, [answers]);

  // Debounced save
  const saveTimeoutRef = useCallback(() => {
    let timeout: NodeJS.Timeout;
    return (questionId: string, value: string) => {
      clearTimeout(timeout);
      setSaveStatus('saving');
      timeout = setTimeout(async () => {
        if (applicationId) {
          await supabase.from('answers').upsert({
            application_id: applicationId,
            question_id: questionId,
            answer: value,
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 800);
    };
  }, [applicationId, supabase]);

  // Load user data
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/f');
        return;
      }

      // Get application
      const { data: existingApp } = await supabase
        .from('applications')
        .select('id')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingApp) {
        setApplicationId(existingApp.id);

        // Fetch existing answers
        const { data: answersData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id);

        const existingAnswers: Record<string, string> = {};
        answersData?.forEach(row => {
          existingAnswers[row.question_id] = row.answer;
        });

        setAnswers(existingAnswers);

        // Check if we should resume or show completion
        const answeredCount = prefilledQuestions.filter(q => existingAnswers[q.id]).length;
        if (answeredCount >= prefilledQuestions.length) {
          setScreenState('completion');
        } else if (answeredCount > 0) {
          setScreenState('resume');
          // Find first unanswered question
          const firstUnanswered = prefilledQuestions.findIndex(q => !existingAnswers[q.id]);
          setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
        }
      }

      setLoading(false);
    };

    init();
  }, [router, supabase, prefilledQuestions]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    saveTimeoutRef()(questionId, value);
  };

  const handleNext = () => {
    if (currentQuestionIndex < prefilledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      setScreenState('completion');
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const currentQuestion = prefilledQuestions[currentQuestionIndex] || QUESTIONS[0];
  const answeredCount = prefilledQuestions.filter(q => answers[q.id]).length;
  const progress = prefilledQuestions.length > 0 ? Math.round((answeredCount / prefilledQuestions.length) * 100) : 0;

  // Advisory cards based on answers
  const renderAdvisories = () => {
    const advisories: React.ReactNode[] = [];

    // QF-06 advisory (W-06)
    const paperTrail = answers['QF-06'] || '';
    if (paperTrail.includes('Mostly')) {
      advisories.push(
        <div key="qf06-amber" className="mb-4 p-4 rounded-lg border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#f59e0b' }}>
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l.09.15a.96.96 0 00.945.699h1.95c.965 0 1.737.707 1.872 1.67.165.982.36 1.965.572 2.941.176.808.342 1.614.485 2.387.088.472.17.94.24 1.399.055.355.107.707.156 1.055.014.105.028.21.04.315.019.163.036.324.052.485.055.495.097.981.126 1.455.02.338.035.66.044.945a.96.96 0 01-.569 1.02c-.42.259-.952.259-1.372 0a.96.96 0 01-.569-1.02c.009-.285.024-.607.044-.945.029-.474.071-.96.126-1.455.016-.161.033-.322.052-.485.012-.105.026-.21.04-.315.05-.348.101-.7.156-1.055.07-.459.152-.927.24-1.399.143-.773.309-1.579.485-2.387.212-.976.407-1.959.572-2.941.135-.963.907-1.67 1.872-1.67h1.95c.53 0 1.01-.323 1.217-.82l.09-.15c.273-.495.506-1.003.697-1.518.096-.259.186-.521.27-.786.044-.138.085-.278.124-.42a2.47 2.47 0 00-.672-1.852 2.5 2.5 0 00-1.837-.767 2.48 2.48 0 00-1.852.672 2.49 2.49 0 00-.767 1.837c-.039.142-.08.282-.124.42-.084.265-.174.527-.27.786-.191.515-.424 1.023-.697 1.518z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm mb-1" style={{ color: '#f59e0b' }}>Note</p>
              <p className="text-sm" style={{ color: 'rgba(240,237,230,0.8)' }}>You mentioned there are some gaps in your paper trail. Gather as much documentation as possible for each step.</p>
            </div>
          </div>
        </div>
      );
    } else if (paperTrail.includes('No')) {
      advisories.push(
        <div key="qf06-red" className="mb-4 p-4 rounded-lg border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#ef4444' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm mb-1" style={{ color: '#ef4444' }}>Attorney Consultation Recommended</p>
              <p className="text-sm" style={{ color: 'rgba(240,237,230,0.8)' }}>Gaps in the funds trail are one of the most common E-2 denial triggers. Consider consulting an attorney about how to address documentation gaps before your interview.</p>
            </div>
          </div>
        </div>
      );
    }

    // QF-NEW-01 advisory (D-02)
    const fundsDeployed = answers['QF-NEW-01'] || '';
    const deployedAmount = parseFloat(fundsDeployed.replace(/[^0-9.]/g, '')) || 0;
    if (fundsDeployed && deployedAmount === 0) {
      advisories.push(
        <div key="qfnew01-red" className="mb-4 p-4 rounded-lg border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#ef4444' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm mb-1" style={{ color: '#ef4444' }}>Funds Not Yet Deployed</p>
              <p className="text-sm" style={{ color: 'rgba(240,237,230,0.8)' }}>Funds sitting idle in a business bank account are NOT considered &quot;at risk&quot; and are one of the most common E-2 denial reasons. The investment must be spent or irrevocably committed to specific expenses.</p>
            </div>
          </div>
        </div>
      );
    }

    // QF-NEW-02 advisory (D-12)
    const loanSecurity = answers['QF-NEW-02'] || '';
    if (loanSecurity.includes('not certain')) {
      advisories.push(
        <div key="qfnew02-red" className="mb-4 p-4 rounded-lg border" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#ef4444' }}>
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-medium text-sm mb-1" style={{ color: '#ef4444' }}>Attorney Consultation Recommended</p>
              <p className="text-sm" style={{ color: 'rgba(240,237,230,0.8)' }}>E-2 loans must be secured against personal assets, not business assets. Uncertain loan security should be clarified with the lender or an attorney.</p>
            </div>
          </div>
        </div>
      );
    }

    return advisories;
  };

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '16.67%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>E2go.app</span>
            </div>
            <div className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Tab F</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
              Investment Proof
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              Document what you&apos;ve invested, how it&apos;s structured, and how it&apos;s documented. This is the most document-heavy section of your application.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Investment amount</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Fund source</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Paper trail</span>
            </div>

            <button
              onClick={() => setScreenState('question')}
              className="w-full font-medium rounded-lg transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
            >
              Start Investment Proof →
            </button>

            <button
              onClick={() => router.push('/apply/module3/e')}
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

  // ==================== RESUME STATE ====================
  if (screenState === 'resume') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: `${16.67 + (progress / 100) * 8.33}%`, background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>E2go.app</span>
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
          <div className="glass p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold mb-2" style={{ color: '#f0ede6', fontFamily: "'Playfair Display', serif" }}>
                Welcome back
              </h1>
              <p style={{ color: 'rgba(240,237,230,0.65)', fontSize: '14px' }}>
                {answeredCount} of {QUESTIONS.length} questions answered
              </p>
            </div>

            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full transition-all" style={{ width: `${progress}%`, background: 'var(--gold)' }} />
            </div>
          </div>

          <button
            onClick={() => {
              const firstUnanswered = QUESTIONS.findIndex(q => !answers[q.id]);
              setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
              setScreenState('question');
            }}
            className="w-full font-medium rounded-lg transition-colors"
            style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
          >
            Continue →
          </button>
        </main>
      </div>
    );
  }

  // ==================== QUESTION STATE ====================
  if (screenState === 'question') {
    return (
      <div className="min-h-screen" style={{ background: '#060d1f' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: `${16.67 + ((currentQuestionIndex + 1) / QUESTIONS.length) * 8.33}%`, background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>E2go.app</span>
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
          {/* Progress indicator */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: 'rgba(240,237,230,0.65)' }}>
              INVESTMENT PROOF
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(13,148,136,0.15)', color: 'var(--gold)' }}>
              {currentQuestionIndex + 1} of {QUESTIONS.length}
            </span>
          </div>

          {/* Question card */}
          <div className="glass p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: '#f0ede6', fontFamily: "'Playfair Display', serif" }}>
              {currentQuestion.question}
            </h2>

            {currentQuestion.tooltip && (
              <p className="text-sm mb-4" style={{ color: 'rgba(240,237,230,0.65)', fontStyle: 'italic' }}>
                {currentQuestion.tooltip}
              </p>
            )}

            {/* Advisories */}
            {renderAdvisories()}

            {/* Answer input */}
            <div className="mt-4">
              {currentQuestion.type === 'select' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option}
                      onClick={() => handleAnswer(currentQuestion.id, option)}
                      className="w-full text-left p-4 rounded-lg transition-all"
                      style={{
                        background: answers[currentQuestion.id] === option ? 'rgba(13,148,136,0.15)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${answers[currentQuestion.id] === option ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        color: '#f0ede6'
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'multiselect' && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option) => {
                    const isSelected = (answers[currentQuestion.id] || '').split(',').includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => {
                          const current = (answers[currentQuestion.id] || '').split(',').filter(Boolean);
                          const newValue = isSelected
                            ? current.filter(v => v !== option)
                            : [...current, option];
                          handleAnswer(currentQuestion.id, newValue.join(','));
                        }}
                        className="w-full text-left p-4 rounded-lg transition-all flex items-center gap-3"
                        style={{
                          background: isSelected ? 'rgba(13,148,136,0.15)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${isSelected ? 'rgba(13,148,136,0.4)' : 'rgba(255,255,255,0.1)'}`,
                          color: '#f0ede6'
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                          style={{
                            borderColor: isSelected ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
                            background: isSelected ? 'var(--gold)' : 'transparent'
                          }}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion.type === 'currency' && (
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(240,237,230,0.65)' }}>$</span>
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 pl-8 rounded-lg"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#f0ede6',
                      outline: 'none'
                    }}
                  />
                </div>
              )}

              {currentQuestion.type === 'text' && (
                <input
                  type="text"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Enter your answer..."
                  className="w-full p-4 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f0ede6',
                    outline: 'none'
                  }}
                />
              )}

              {currentQuestion.type === 'textarea' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Enter your answer..."
                  rows={4}
                  className="w-full p-4 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f0ede6',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              )}
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'rgba(6,13,31,0.9)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="max-w-2xl mx-auto flex gap-3">
              <button
                onClick={handlePrev}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 border rounded-lg transition-colors"
                style={{
                  minHeight: '56px',
                  borderColor: 'rgba(255,255,255,0.1)',
                  color: 'rgba(240,237,230,0.65)',
                  opacity: currentQuestionIndex === 0 ? 0.5 : 1
                }}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 font-medium rounded-lg transition-colors"
                style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
              >
                {currentQuestionIndex === QUESTIONS.length - 1 ? 'Complete →' : 'Next →'}
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
          <div className="h-full transition-all" style={{ width: '25%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>E2go.app</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--gold)' }}>✓ Saved</span>
            </div>
          </div>
        </header>

        <main className="pt-24 pb-24 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(13,148,136,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Playfair Display', serif" }}>
              Investment Proof — Personal Section Complete
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              You&apos;ve identified {checklistItems.length} documents to gather for Tab F. The business-specific questions will be unlocked in Batch 2. You&apos;re now ready to proceed.
            </p>

            {/* Document count */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>{checklistItems.length}</div>
                <div className="text-xs uppercase" style={{ color: 'rgba(240,237,230,0.45)', letterSpacing: '0.04em' }}>Documents</div>
              </div>
            </div>

            {/* Batch 2 placeholder */}
            <div className="mb-8 p-4 rounded-lg text-left" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#f59e0b' }}>
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-sm" style={{ color: '#f59e0b' }}>Business-Specific Questions — Coming Later</p>
                  <p className="text-sm mt-1" style={{ color: 'rgba(240,237,230,0.8)' }}>
                    Once your business structure is confirmed, you&apos;ll return here to complete questions about your acquisition details or franchise agreement. These will be unlocked automatically when you reach that stage.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => router.push('/apply/module3/j')}
              className="w-full font-medium rounded-lg transition-colors"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
            >
              Continue — Unlock Your Application Package
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#060d1f' }}>
      <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}