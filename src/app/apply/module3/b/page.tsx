'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { resolvePrimaryApplicationId } from '@/lib/resolve-application';

type ItemCategory = 'personal' | 'family' | 'investment' | 'entity' | 'franchise' | 'source_of_funds';

interface ChecklistItem {
  id: string;
  name: string;
  obtainLocation: string;
  binderTab: string;
  alwaysRequired: boolean;
  category: ItemCategory;
  condition?: string;
  checked: boolean;
}

const SECTION_CONFIG: Record<ItemCategory, { title: string; description: string }> = {
  personal: {
    title: 'Personal & Government Documents',
    description: 'Required for every applicant — one set per person applying',
  },
  family: {
    title: 'Family & Dependents',
    description: 'Additional documents for spouse and children applying with you',
  },
  investment: {
    title: 'Investment Evidence',
    description: 'Proof that your funds are irrevocably committed to the enterprise',
  },
  entity: {
    title: 'Business Entity Documents',
    description: 'Legal formation and tax registration of your U.S. business entity',
  },
  franchise: {
    title: 'Franchise Documents',
    description: 'Franchisor-provided agreements, disclosures, and training records',
  },
  source_of_funds: {
    title: 'Source of Funds Evidence',
    description: 'Documentation tracing every dollar from its origin to your U.S. business account',
  },
};

const E2GO_GENERATES = [
  { name: 'Cover Letter', tab: 'D', description: 'Narrative addressing all six E-2 treaty investor elements' },
  { name: 'Source of Funds Statement', tab: 'H', description: 'Fund trail from origin account to LLC — with dated chronology' },
  { name: 'Investment Proof', tab: 'B', description: 'At-risk evidence and irrevocability statement' },
  { name: 'Business Plan', tab: 'I', description: 'Five-year projections, staffing plan, and non-marginality evidence' },
  { name: 'Investor Qualifications', tab: 'J', description: 'Professional biography establishing develop-and-direct capacity' },
  { name: 'Substantiality Memorandum', tab: 'E', description: '9 FAM 402.9-6(D) investment proportionality analysis' },
  { name: 'Non-immigrant Intent Statement', tab: 'K', description: 'Home-country ties and intent to depart at end of E-2 status' },
  { name: 'DS-160 / DS-156E Reference Guide', tab: 'A', description: 'Form-field guidance and reference answers' },
];

const ALWAYS_REQUIRED_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  // Personal & Government
  {
    id: 'passport-bio',
    name: 'Passport biographical page (photocopy)',
    obtainLocation: 'Current valid passport',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'passport-photos',
    name: 'Two passport-style photographs',
    obtainLocation: 'Must meet U.S. visa photo standards — see requirements below',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'birth-certificate',
    name: 'Birth certificate (certified copy)',
    obtainLocation: 'Vital records office in your country of birth',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'ds160-confirmation',
    name: 'DS-160 confirmation page (barcode page)',
    obtainLocation: 'Printed from ceac.state.gov',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'ds156e',
    name: 'DS-156E form (completed and signed)',
    obtainLocation: 'Principal applicant only — from ceac.state.gov',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'mrv-fee-receipt',
    name: 'MRV fee receipt',
    obtainLocation: 'From ais.usvisa-info.com',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  {
    id: 'appointment-letter',
    name: 'Appointment confirmation letter',
    obtainLocation: 'From scheduling portal',
    binderTab: 'A',
    alwaysRequired: true,
    category: 'personal',
  },
  // Investment Evidence
  {
    id: 'bank-statements-12mo',
    name: 'Bank statements — 12 consecutive months (all source accounts)',
    obtainLocation: 'Download from online banking or request from branch — must match wire transfer records',
    binderTab: 'B',
    alwaysRequired: true,
    category: 'investment',
  },
  {
    id: 'wire-transfer-confirmation',
    name: 'Wire transfer confirmation(s) to U.S. LLC account',
    obtainLocation: 'From your bank — showing transfer date, amount, sending account, and receiving account',
    binderTab: 'B',
    alwaysRequired: true,
    category: 'investment',
  },
  {
    id: 'us-bank-statement',
    name: 'U.S. business bank statement (LLC account)',
    obtainLocation: 'From your U.S. business bank — showing investment funds on deposit',
    binderTab: 'B',
    alwaysRequired: true,
    category: 'investment',
  },
  // Business Entity
  {
    id: 'articles-of-organization',
    name: 'Articles of Organization / Certificate of Formation',
    obtainLocation: 'From the Secretary of State where the LLC is registered — certified copy',
    binderTab: 'D',
    alwaysRequired: true,
    category: 'entity',
  },
  {
    id: 'ein-letter',
    name: 'EIN Assignment Letter (IRS CP 575)',
    obtainLocation: 'From the IRS — received by mail when EIN was assigned; request a 147C letter if original is lost',
    binderTab: 'D',
    alwaysRequired: true,
    category: 'entity',
  },
  {
    id: 'operating-agreement',
    name: 'LLC Operating Agreement',
    obtainLocation: 'Internal LLC document — signed by all members, showing ownership percentages and management structure',
    binderTab: 'D',
    alwaysRequired: true,
    category: 'entity',
  },
];

const CONDITIONAL_ITEMS: Omit<ChecklistItem, 'checked'>[] = [
  // Family
  {
    id: 'marriage-certificate',
    name: 'Marriage certificate',
    obtainLocation: 'If legally married — from vital records',
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'marital_status = married or common-law',
  },
  {
    id: 'divorce-certificate',
    name: 'Divorce certificate',
    obtainLocation: 'If divorced or legally separated — court records',
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'marital_status = divorced or separated',
  },
  {
    id: 'name-change-doc',
    name: 'Legal name change documentation',
    obtainLocation: 'If name differs from birth record — court order or marriage certificate',
    binderTab: 'A',
    alwaysRequired: false,
    category: 'personal',
    condition: 'other_names_used = yes',
  },
  {
    id: 'spouse-passport',
    name: "Spouse's passport biographical page",
    obtainLocation: 'If spouse is applying — copy of their passport',
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'spouse applying',
  },
  {
    id: 'spouse-birth-cert',
    name: "Spouse's birth certificate",
    obtainLocation: 'If spouse is applying — certified copy',
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'spouse applying',
  },
  {
    id: 'child-passport',
    name: "Children's passport biographical pages",
    obtainLocation: "One per child applying — copies of each child's passport",
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'children applying',
  },
  {
    id: 'child-birth-cert',
    name: "Children's birth certificates",
    obtainLocation: 'One per child applying — certified copies',
    binderTab: 'L',
    alwaysRequired: false,
    category: 'family',
    condition: 'children applying',
  },
  // Franchise documents
  {
    id: 'franchise-agreement',
    name: 'Franchise Agreement (fully executed)',
    obtainLocation: 'From your franchisor — all pages including signature page and any amendments',
    binderTab: 'B',
    alwaysRequired: false,
    category: 'franchise',
    condition: 'business_type = franchise',
  },
  {
    id: 'fdd',
    name: 'Franchise Disclosure Document (FDD)',
    obtainLocation: 'The version you received prior to signing — include Item 7 (Estimated Initial Investment)',
    binderTab: 'C',
    alwaysRequired: false,
    category: 'franchise',
    condition: 'business_type = franchise',
  },
  {
    id: 'training-confirmation',
    name: 'Training confirmation (Discovery Day / initial training)',
    obtainLocation: 'From your franchisor — attendance letter or scheduled training dates with curriculum overview',
    binderTab: 'D',
    alwaysRequired: false,
    category: 'franchise',
    condition: 'business_type = franchise',
  },
  // Property (source of funds)
  {
    id: 'mortgage-statement',
    name: 'Mortgage statement (most recent)',
    obtainLocation: 'For each property you own — from your mortgage lender, showing outstanding balance',
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'owns_property = yes',
  },
  {
    id: 'property-appraisal',
    name: 'Property appraisal or current tax assessment',
    obtainLocation: 'For each property — from a licensed appraiser or your municipal property tax records',
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'owns_property = yes',
  },
  // RRSP/TFSA
  {
    id: 'rrsp-tfsa-statement',
    name: 'RRSP / TFSA redemption or withdrawal statement',
    obtainLocation: 'From your bank or investment institution — showing withdrawal date, withholding tax (RRSP only), and net proceeds',
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'used RRSP or TFSA funds',
  },
  // Gift
  {
    id: 'gift-letter',
    name: 'Gift letter (signed by donor)',
    obtainLocation: "Signed letter from the donor stating: gift amount, your relationship, and that repayment is not expected",
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'received investment funds as gift',
  },
  {
    id: 'donor-bank-statements',
    name: "Donor's bank statements (3 months minimum)",
    obtainLocation: "From the gift donor — showing their capacity to make the gift",
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'received investment funds as gift',
  },
  // Loan/HELOC
  {
    id: 'loan-agreement',
    name: 'Loan agreement or HELOC documentation',
    obtainLocation: 'From your lender — must specify collateral used (personal assets only count for E-2; business loans do not)',
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'borrowed investment funds',
  },
  // Asset sale
  {
    id: 'asset-sale-agreement',
    name: 'Asset sale agreement / closing statement',
    obtainLocation: 'For any property, business, or major asset sold to fund the investment — closing documents showing net proceeds',
    binderTab: 'H',
    alwaysRequired: false,
    category: 'source_of_funds',
    condition: 'sold asset to fund investment',
  },
  // Translation
  {
    id: 'certified-translations',
    name: 'Certified translations (all non-English documents)',
    obtainLocation: 'From a certified translator — one per foreign-language document; check if your consulate requires notarization',
    binderTab: 'A',
    alwaysRequired: false,
    category: 'personal',
    condition: 'any documents not in English',
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
            question_key: `QB-CHECK-${itemId}`,
            answer_value: checked ? 'true' : 'false',
          }, { onConflict: 'application_id,question_key,family_member_id' });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        }
      }, 800);
    };
  }, [applicationId, supabase]);

  // Build checklist based on user answers
  const buildChecklist = useCallback((answers: Record<string, string>) => {
    const items: ChecklistItem[] = ALWAYS_REQUIRED_ITEMS.map(item => ({ ...item, checked: false }));
    const allValues = Object.values(answers).join(' ').toLowerCase();

    // Marital status
    const maritalStatus = answers['Q0-02'] || answers['marital_status'] || '';
    if (maritalStatus.toLowerCase().includes('married') || maritalStatus.toLowerCase().includes('common-law')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'marriage-certificate');
      if (item) items.push({ ...item, checked: false });
    }
    if (maritalStatus.toLowerCase().includes('divorced') || maritalStatus.toLowerCase().includes('separated')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'divorce-certificate');
      if (item) items.push({ ...item, checked: false });
    }

    // Other names
    const otherNames = answers['Q0-03'] || answers['other_names_used'] || '';
    if (otherNames.toLowerCase().includes('yes')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'name-change-doc');
      if (item) items.push({ ...item, checked: false });
    }

    // Dependents
    const dependents = answers['Q0-03'] || answers['dependents'] || '';
    const hasSpouse = dependents.toLowerCase().includes('spouse');
    const hasChildren = /\d+ child/.test(dependents.toLowerCase()) || dependents.toLowerCase().includes('child');

    if (hasSpouse) {
      ['spouse-passport', 'spouse-birth-cert'].forEach(id => {
        const item = CONDITIONAL_ITEMS.find(i => i.id === id);
        if (item) items.push({ ...item, checked: false });
      });
    }

    if (hasChildren) {
      ['child-passport', 'child-birth-cert'].forEach(id => {
        const item = CONDITIONAL_ITEMS.find(i => i.id === id);
        if (item) items.push({ ...item, checked: false });
      });
    }

    // Franchise detection
    const isFranchise = allValues.includes('franchise') ||
      (answers['business_type'] || '').toLowerCase().includes('franchise') ||
      (answers['M3-E-business-type'] || '').toLowerCase().includes('franchise');

    if (isFranchise) {
      ['franchise-agreement', 'fdd', 'training-confirmation'].forEach(id => {
        const item = CONDITIONAL_ITEMS.find(i => i.id === id);
        if (item) items.push({ ...item, checked: false });
      });
    }

    // Property ownership detection
    const ownsProperty = allValues.includes('mortgage') ||
      (answers['owns_property'] || '').toLowerCase() === 'yes' ||
      (answers['property_owned'] || '').toLowerCase() === 'yes';

    if (ownsProperty) {
      ['mortgage-statement', 'property-appraisal'].forEach(id => {
        const item = CONDITIONAL_ITEMS.find(i => i.id === id);
        if (item) items.push({ ...item, checked: false });
      });
    }

    // RRSP/TFSA detection
    if (allValues.includes('rrsp') || allValues.includes('tfsa')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'rrsp-tfsa-statement');
      if (item) items.push({ ...item, checked: false });
    }

    // Gift detection
    if (allValues.includes('gift')) {
      ['gift-letter', 'donor-bank-statements'].forEach(id => {
        const item = CONDITIONAL_ITEMS.find(i => i.id === id);
        if (item) items.push({ ...item, checked: false });
      });
    }

    // Loan/HELOC detection
    if (allValues.includes('loan') || allValues.includes('heloc') || allValues.includes('borrow')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'loan-agreement');
      if (item) items.push({ ...item, checked: false });
    }

    // Asset sale detection
    if (allValues.includes('sale proceed') || allValues.includes('business sale') || allValues.includes('sold my ')) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'asset-sale-agreement');
      if (item) items.push({ ...item, checked: false });
    }

    // Translation detection — non-English speaking countries
    const nationality = (answers['Q0-nationality'] || answers['nationality'] || answers['country_of_birth'] || '').toLowerCase();
    const englishSpeaking = ['canada', 'united states', 'united kingdom', 'australia', 'new zealand', 'ireland'];
    if (nationality && !englishSpeaking.some(c => nationality.includes(c))) {
      const item = CONDITIONAL_ITEMS.find(i => i.id === 'certified-translations');
      if (item) items.push({ ...item, checked: false });
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

      const existingAppId = await resolvePrimaryApplicationId(supabase, authUser.id);
      const existingApp = existingAppId ? { id: existingAppId } : null;

      if (existingApp) {
        setApplicationId(existingApp.id);

        const { data: answersData } = await supabase
          .from('answers')
          .select('question_key, answer_value')
          .eq('application_id', existingApp.id);

        const answers: Record<string, string> = {};
        answersData?.forEach((row: { question_key: string; answer_value: string }) => {
          answers[row.question_key] = row.answer_value;
        });

        const items = buildChecklist(answers);

        const { data: checkData } = await supabase
          .from('answers')
          .select('question_key, answer_value')
          .eq('application_id', existingApp.id)
          .like('question_key', 'QB-CHECK-%');

        const checkedItems = new Set(
          checkData?.filter((a: { answer_value: string; question_key: string }) => a.answer_value === 'true')
            .map((a: { question_key: string }) => a.question_key.replace('QB-CHECK-', '')) || []
        );

        items.forEach(item => {
          item.checked = checkedItems.has(item.id);
        });

        setChecklistItems(items);

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
              <span className="text-xl font-bold" style={{ color: 'var(--gold)', fontFamily: "'Cormorant Garamond', serif" }}>e2go.app</span>
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
              Your Complete Document Checklist
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              We&apos;ve built your personalised list from your answers — covering everything you need to gather, plus a preview of what e2go will generate for you.
            </p>

            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Built from your answers</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>Organised by binder tab</span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)', border: '1px solid rgba(201,168,76,0.3)' }}>★ e2go generates 8 documents</span>
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

            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full transition-all" style={{ width: `${percentComplete}%`, background: 'var(--gold)' }} />
            </div>
          </div>

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
              DOCUMENT CHECKLIST
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
              {checkedCount}/{totalCount} gathered
            </span>
          </div>

          <ChecklistView items={checklistItems} onCheck={handleCheckItem} />

          {/* Photo requirements */}
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
              Most pharmacies offer same-day U.S. visa photos. In Canada: Shoppers Drug Mart, London Drugs, Costco.
            </p>
          </div>

          {/* Translation note */}
          <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.2)' }}>
            <p className="text-sm" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '13px', lineHeight: '20px' }}>
              <span style={{ color: '#f0ede6', fontWeight: 500 }}>Translation note:</span> Any document not in English must include a certified translation. Family members or friends cannot serve as translators — use a professional certified translation service.
            </p>
          </div>

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

            <h1 className="text-2xl font-semibold mb-4" style={{ color: '#f0ede6', fontSize: '24px', fontWeight: 600, fontFamily: "'Cormorant Garamond', serif" }}>
              Documents Identified
            </h1>

            <p className="mb-6" style={{ color: 'rgba(240,237,230,0.65)', fontSize: '16px', lineHeight: '24px' }}>
              We&apos;ve identified {totalCount} documents for your application. Check them off as you gather them — your progress saves automatically.
            </p>

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

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Checklist view — grouped by category
function ChecklistView({ items, onCheck }: { items: ChecklistItem[]; onCheck: (id: string, checked: boolean) => void }) {
  const CATEGORY_ORDER: ItemCategory[] = ['personal', 'family', 'investment', 'entity', 'franchise', 'source_of_funds'];

  const grouped = items.reduce<Partial<Record<ItemCategory, ChecklistItem[]>>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {CATEGORY_ORDER.map(cat => {
        const catItems = grouped[cat];
        if (!catItems || catItems.length === 0) return null;
        const config = SECTION_CONFIG[cat];
        return (
          <div key={cat}>
            <div className="mb-3">
              <h3 className="text-xs uppercase font-semibold mb-0.5" style={{ letterSpacing: '0.08em', color: 'rgba(240,237,230,0.45)' }}>
                ○ {config.title}
              </h3>
              <p className="text-xs" style={{ color: 'rgba(240,237,230,0.3)', fontSize: '12px' }}>
                {config.description}
              </p>
            </div>
            <div className="space-y-2">
              {catItems.map(item => (
                <ChecklistCard key={item.id} item={item} onCheck={onCheck} />
              ))}
            </div>
          </div>
        );
      })}

      {/* e2go Generates — static, no checkboxes */}
      <div>
        <div className="mb-3">
          <h3 className="text-xs uppercase font-semibold mb-0.5" style={{ letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)' }}>
            ★ e2go Generates For You
          </h3>
          <p className="text-xs" style={{ color: 'rgba(240,237,230,0.3)', fontSize: '12px' }}>
            These 8 documents are written by e2go from your answers — you do not need to gather them
          </p>
        </div>
        <div className="space-y-2">
          {E2GO_GENERATES.map(doc => (
            <div
              key={doc.name}
              className="p-4 flex items-start gap-3"
              style={{
                background: 'rgba(201,168,76,0.05)',
                border: '1px solid rgba(201,168,76,0.15)',
                borderRadius: '12px',
              }}
            >
              <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span style={{ color: 'var(--gold)', fontSize: '14px' }}>★</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ color: '#f0ede6', fontSize: '14px', fontWeight: 500 }}>{doc.name}</span>
                  <span className="px-2 py-0.5 rounded text-xs flex-shrink-0" style={{ background: 'rgba(201,168,76,0.15)', color: 'var(--gold)' }}>
                    Tab {doc.tab}
                  </span>
                </div>
                <p style={{ color: 'rgba(240,237,230,0.4)', fontSize: '12px' }}>{doc.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
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
        borderRadius: '12px',
      }}
      onClick={() => onCheck(item.id, !item.checked)}
    >
      <div
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{
          borderColor: item.checked ? 'var(--gold)' : 'rgba(255,255,255,0.3)',
          background: item.checked ? 'var(--gold)' : 'transparent',
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
