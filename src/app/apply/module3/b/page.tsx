'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface ChecklistItem {
  id: string;
  name: string;
  obtainLocation: string;
  binderTab: string;
  alwaysRequired: boolean;
  condition?: string;
  checked: boolean;
}

const ALWAYS_REQUIRED_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'passport-bio',
    name: 'Passport biographical page (photocopy)',
    obtainLocation: 'Current valid passport',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'passport-photos',
    name: 'Two passport-style photographs',
    obtainLocation: 'Must meet U.S. visa photo standards — see requirements below',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'birth-certificate',
    name: 'Birth certificate (certified copy)',
    obtainLocation: 'Vital records office in your country of birth',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'ds160-confirmation',
    name: 'DS-160 confirmation page (barcode page)',
    obtainLocation: 'Printed from ceac.state.gov',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'ds156e',
    name: 'DS-156E form (completed and signed)',
    obtainLocation: 'Principal applicant only — from ceac.state.gov',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'mrv-fee-receipt',
    name: 'MRV fee receipt',
    obtainLocation: 'From ais.usvisa-info.com',
    binderTab: 'A',
    alwaysRequired: true,
  },
  {
    id: 'appointment-letter',
    name: 'Appointment confirmation letter',
    obtainLocation: 'From scheduling portal',
    binderTab: 'A',
    alwaysRequired: true,
  },
];

const CONDITIONAL_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  {
    id: 'marriage-certificate',
    name: 'Marriage certificate',
    obtainLocation: 'If legally married — from vital records',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'marital_status = married or common-law',
  },
  {
    id: 'divorce-certificate',
    name: 'Divorce certificate',
    obtainLocation: 'If divorced or legally separated — court records',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'marital_status = divorced or separated',
  },
  {
    id: 'name-change-doc',
    name: 'Legal name change documentation',
    obtainLocation: 'If name differs from birth record — court order, marriage certificate',
    binderTab: 'A',
    alwaysRequired: false,
    condition: 'other_names_used = yes',
  },
  {
    id: 'spouse-passport',
    name: "Spouse's passport biographical page",
    obtainLocation: 'If spouse is applying — copy of their passport',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'spouse applying (Q0-16)',
  },
  {
    id: 'spouse-birth-cert',
    name: "Spouse's birth certificate",
    obtainLocation: 'If spouse is applying — certified copy',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'spouse applying (Q0-16)',
  },
  {
    id: 'child-passport',
    name: "Children's passport biographical pages",
    obtainLocation: 'One per child applying — copies of each child\'s passport',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'children applying (Q0-16)',
  },
  {
    id: 'child-birth-cert',
    name: "Children's birth certificates",
    obtainLocation: 'One per child applying — certified copies',
    binderTab: 'L',
    alwaysRequired: false,
    condition: 'children applying (Q0-16)',
  },
];

const PHOTO_REQUIREMENTS = [
  '2×2 inches (51×51mm)',
  'Taken within last 6 months',
  'White or off-white background',
  'Full face, front view, eyes open',
  'No glasses',
  'Neutral expression',
  'Printed on matte or glossy photo paper',
];

type ScreenState = 'intro' | 'question' | 'completion' | 'resume';

export default function TabBPage() {
  const router = useRouter();
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [, setLoading] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Debounced save
  const saveTimeoutRef = useCallback(() => {
    let timeout: NodeJS.Timeout;
    return (itemId: string, checked: boolean) => {
      clearTimeout(timeout);
      setSaveStatus('saving');
      timeout = setTimeout(async () => {
        if (applicationId) {
          await supabase.from('answers').upsert({
            application_id: applicationId,
            question_id: `QB-CHECK-${itemId}`,
            answer: checked ? 'true' : 'false',
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 800);
    };
  }, [applicationId, supabase]);

  // Build checklist based on user answers
  const buildChecklist = useCallback((answers: Record<string, string>) => {
    const items: ChecklistItem[] = ALWAYS_REQUIRED_ITEMS.map(item => ({ ...item, checked: false }));

    // Check marital status
    const maritalStatus = answers['Q0-02'] || answers['marital_status'] || '';
    if (maritalStatus.toLowerCase().includes('married') || maritalStatus.toLowerCase().includes('common-law')) {
      const marriageItem = CONDITIONAL_ITEMS.find(i => i.id === 'marriage-certificate');
      if (marriageItem) items.push({ ...marriageItem, checked: false });
    }
    if (maritalStatus.toLowerCase().includes('divorced') || maritalStatus.toLowerCase().includes('separated')) {
      const divorceItem = CONDITIONAL_ITEMS.find(i => i.id === 'divorce-certificate');
      if (divorceItem) items.push({ ...divorceItem, checked: false });
    }

    // Check other names used
    const otherNames = answers['Q0-03'] || answers['other_names_used'] || '';
    if (otherNames.toLowerCase().includes('yes')) {
      const nameChangeItem = CONDITIONAL_ITEMS.find(i => i.id === 'name-change-doc');
      if (nameChangeItem) items.push({ ...nameChangeItem, checked: false });
    }

    // Check spouse applying (Q0-16)
    const dependents = answers['Q0-16'] || answers['dependents'] || '';
    const hasSpouse = dependents.toLowerCase().includes('spouse');
    const hasChildren = /\d+ child/.test(dependents.toLowerCase()) || dependents.toLowerCase().includes('child');

    if (hasSpouse) {
      const spousePassport = CONDITIONAL_ITEMS.find(i => i.id === 'spouse-passport');
      const spouseBirth = CONDITIONAL_ITEMS.find(i => i.id === 'spouse-birth-cert');
      if (spousePassport) items.push({ ...spousePassport, checked: false });
      if (spouseBirth) items.push({ ...spouseBirth, checked: false });
    }

    if (hasChildren) {
      const childPassport = CONDITIONAL_ITEMS.find(i => i.id === 'child-passport');
      const childBirth = CONDITIONAL_ITEMS.find(i => i.id === 'child-birth-cert');
      if (childPassport) items.push({ ...childPassport, checked: false });
      if (childBirth) items.push({ ...childBirth, checked: false });
    }

    return items;
  }, []);

  // Load user data
  useEffect(() => {
    const init = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login?next=/apply/module3/b');
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

        const answers: Record<string, string> = {};
        answersData?.forEach(row => {
          answers[row.question_id] = row.answer;
        });

        // Build checklist
        const items = buildChecklist(answers);

        // Load saved check states
        const { data: checkData } = await supabase
          .from('answers')
          .select('question_id, answer')
          .eq('application_id', existingApp.id)
          .like('question_id', 'QB-CHECK-%');

        const checkedItems = new Set(
          checkData?.filter(a => a.answer === 'true').map(a => a.question_id.replace('QB-CHECK-', '')) || []
        );

        items.forEach(item => {
          item.checked = checkedItems.has(item.id);
        });

        setChecklistItems(items);

        // Check if we should resume or show completion
        const totalItems = items.length;
        const checkedCount = items.filter(i => i.checked).length;
        if (checkedCount > 0 && checkedCount < totalItems) {
          setScreenState('resume');
        } else if (checkedCount >= totalItems && totalItems > 0) {
          setScreenState('completion');
        }
      }

      setLoading(false);
    };

    init();
  }, [router, supabase, buildChecklist]);

  const handleCheckItem = (itemId: string, checked: boolean) => {
    setChecklistItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, checked } : item
    ));
    saveTimeoutRef()(itemId, checked);
  };

  const checkedCount = checklistItems.filter(i => i.checked).length;
  const totalCount = checklistItems.length;
  const percentComplete = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  // ==================== INTRO STATE ====================
  if (screenState === 'intro') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: '16.67%', background: 'var(--gold)' }} />
        </div>

        <header className="fixed top-1 left-0 right-0 z-50" style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', background: 'rgba(6,13,31,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex justify-between items-center h-16 px-4 md:px-8 max-w-3xl mx-auto">
            <div onClick={() => router.push('/')} className="flex items-center gap-2 cursor-pointer">
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>E2go.app</span>
            </div>
            <div className="text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>Tab B</div>
          </div>
        </header>

        <main className="pt-24 pb-12 px-4 max-w-2xl mx-auto">
          <div className="glass p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
              Your Personal Document Checklist
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              We&apos;ve reviewed your answers and put together a personalised list of every document you&apos;ll need to gather. Nothing extra — only what applies to your application.
            </p>

            {/* Feature highlights */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Generated from your answers</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Organised by binder tab</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Photo requirements included</span>
            </div>

            <button
              onClick={() => setScreenState('question')}
              className="w-full font-medium rounded-lg transition-colors mb-4"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
            >
              View My Checklist →
            </button>

            <button
              onClick={() => router.push('/apply/module3/a')}
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
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: `${16.67 + (percentComplete / 100) * 8.33}%`, background: 'var(--gold)' }} />
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
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(201,168,76,0.15)' }}>
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" />
                </svg>
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ color: '#f0ede6', fontFamily: "'Cormorant Garamond', serif" }}>
                Welcome back
              </h1>
              <p style={{ color: 'rgba(240,237,230,0.65)', fontSize: '14px' }}>
                {checkedCount} of {totalCount} documents checked
              </p>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full transition-all" style={{ width: `${percentComplete}%`, background: 'var(--gold)' }} />
            </div>
          </div>

          {/* Checklist items */}
          <ChecklistView items={checklistItems} onCheck={handleCheckItem} />
        </main>
      </div>
    );
  }

  // ==================== QUESTION STATE ====================
  if (screenState === 'question') {
    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="fixed top-0 left-0 right-0 h-1 z-40" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div className="h-full transition-all" style={{ width: `${16.67 + (percentComplete / 100) * 8.33}%`, background: 'var(--gold)' }} />
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
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs uppercase font-semibold" style={{ letterSpacing: '0.04em', fontSize: '12px', fontWeight: 600, color: 'rgba(240,237,230,0.65)' }}>
              DOCUMENT CHECKLIST
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
              {checkedCount}/{totalCount} gathered
            </span>
          </div>

          {/* Checklist items */}
          <ChecklistView items={checklistItems} onCheck={handleCheckItem} />

          {/* Photo requirements card */}
          <div className="mt-6 glass p-5" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}>
            <h3 className="font-medium mb-3" style={{ color: '#f0ede6', fontFamily: "'Cormorant Garamond', serif", fontSize: '16px' }}>
              U.S. Visa Photo Requirements
            </h3>
            <ul className="space-y-1.5 mb-3">
              {PHOTO_REQUIREMENTS.map((req, i) => (
                <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(240,237,230,0.65)' }}>
                  <span style={{ color: 'var(--gold)' }}>•</span>
                  {req}
                </li>
              ))}
            </ul>
            <p className="text-sm" style={{ color: 'rgba(240,237,230,0.45)', fontSize: '13px' }}>
              Most pharmacies (Shoppers Drug Mart, London Drugs, Costco) offer same-day U.S. visa photos.
            </p>
          </div>

          {/* Continue button */}
          <div className="fixed bottom-0 left-0 right-0 p-4" style={{ background: 'rgba(6,13,31,0.9)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="max-w-2xl mx-auto">
              <button
                onClick={() => setScreenState('completion')}
                className="w-full font-medium rounded-lg transition-colors"
                style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
              >
                Continue to Tab C →
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
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
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
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,168,76,0.15)' }}>
              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
              Documents Identified
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              We&apos;ve identified {totalCount} documents for your application. Check them off as you gather them — your progress saves automatically.
            </p>

            {/* Progress */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>{checkedCount}</div>
                <div className="text-xs uppercase" style={{ color: 'rgba(240,237,230,0.45)', letterSpacing: '0.04em' }}>Checked</div>
              </div>
              <div className="h-10 w-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
              <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#f0ede6' }}>{totalCount}</div>
                <div className="text-xs uppercase" style={{ color: 'rgba(240,237,230,0.45)', letterSpacing: '0.04em' }}>Total</div>
              </div>
            </div>

            <button
              onClick={() => router.push('/apply/module3/c')}
              className="w-full font-medium rounded-lg transition-colors"
              style={{ minHeight: '56px', fontSize: '16px', fontWeight: 500, background: 'var(--gold)', color: '#fff', borderRadius: '8px' }}
            >
              Continue to Tab C →
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Checklist view component
function ChecklistView({ items, onCheck }: { items: ChecklistItem[]; onCheck: (id: string, checked: boolean) => void }) {
  const alwaysRequired = items.filter(i => i.alwaysRequired);
  const conditional = items.filter(i => !i.alwaysRequired);

  return (
    <div className="space-y-6">
      {/* Always Required */}
      <div>
        <h3 className="text-xs uppercase font-semibold mb-3" style={{ letterSpacing: '0.08em', color: 'rgba(240,237,230,0.45)' }}>
          Always Required
        </h3>
        <div className="space-y-2">
          {alwaysRequired.map(item => (
            <ChecklistCard key={item.id} item={item} onCheck={onCheck} />
          ))}
        </div>
      </div>

      {/* Conditional */}
      {conditional.length > 0 && (
        <div>
          <h3 className="text-xs uppercase font-semibold mb-3" style={{ letterSpacing: '0.08em', color: 'rgba(240,237,230,0.45)' }}>
            Required For Your Application
          </h3>
          <div className="space-y-2">
            {conditional.map(item => (
              <ChecklistCard key={item.id} item={item} onCheck={onCheck} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ChecklistCard({ item, onCheck }: { item: ChecklistItem; onCheck: (id: string, checked: boolean) => void }) {
  return (
    <div
      className="glass p-4 flex items-start gap-3 cursor-pointer transition-all"
      style={{
        background: item.checked ? 'rgba(13,148,136,0.1)' : 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px)',
        border: `1px solid ${item.checked ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px'
      }}
      onClick={() => onCheck(item.id, !item.checked)}
    >
      <div
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          borderColor: item.checked ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
          background: item.checked ? 'var(--gold)' : 'transparent'
        }}
      >
        {item.checked && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: '#f0ede6', fontSize: '15px', fontWeight: 500 }}>{item.name}</span>
          <span className="px-2 py-0.5 rounded text-xs flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
            Tab {item.binderTab}
          </span>
        </div>
        <p style={{ color: 'rgba(240,237,230,0.45)', fontSize: '13px' }}>{item.obtainLocation}</p>
      </div>
    </div>
  );
}
