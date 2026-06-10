'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import SectionSideNav from '@/components/apply/SectionSideNav';
import QuestionPanel from '@/components/apply/QuestionPanel';
import QuestionLabel from '@/components/apply/questions/QuestionLabel';
import HelperText from '@/components/apply/questions/HelperText';
import TextInput from '@/components/apply/questions/TextInput';
import TextArea from '@/components/apply/questions/TextArea';
import OptionButton from '@/components/apply/questions/OptionButton';
import PreFillBadge from '@/components/apply/questions/PreFillBadge';
import AdvisoryBlock from '@/components/apply/questions/AdvisoryBlock';
import RiskFlag from '@/components/apply/questions/RiskFlag';
import ClusterDivider from '@/components/apply/questions/ClusterDivider';
import StartupCostTable from '@/components/apply/questions/StartupCostTable';

interface BizAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

const CLUSTERS = [
  { number: 1, label: 'Entity & registration' },
  { number: 2, label: 'What you do' },
  { number: 3, label: 'Operations' },
  { number: 4, label: 'Licenses & setup' },
  { number: 5, label: 'Franchise (if applicable)' },
  { number: 6, label: 'Startup costs' },
  { number: 7, label: 'Market & competition' },
];

const DOCUMENTS = [
  { name: 'Business Plan', status: 'waiting' as const },
  { name: 'Visa Category Letter', status: 'waiting' as const },
];

interface QuestionField {
  key: string;
  type: 'text' | 'textarea' | 'single' | 'multi';
  label: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  showIf?: { key: string; values: string[] };
}

const ENTITY_QUESTIONS: QuestionField[] = [
  { key: 'M3-E-01', type: 'text', label: 'Business legal name', required: true },
  { key: 'M3-E-02', type: 'single', label: 'Entity type', required: true, options: [
    { value: 'llc', label: 'LLC' },
    { value: 's-corp', label: 'S-Corporation' },
    { value: 'c-corp', label: 'C-Corporation' },
    { value: 'sole', label: 'Sole Proprietorship' },
    { value: 'not-formed', label: 'Not yet formed' },
  ]},
  { key: 'M3-E-03', type: 'text', label: 'State of registration', required: true },
  { key: 'M3-E-04', type: 'text', label: 'EIN (Employer Identification Number)', helperText: 'Canadian applicants can get an EIN without a US Social Security Number by calling the IRS International Line: +1 (267) 941-1099. Have your LLC formation documents ready.' },
  { key: 'M3-E-05', type: 'text', label: 'Date entity formed' },
  { key: 'M3-E-06', type: 'text', label: 'Ownership percentage (%)', required: true },
  { key: 'M3-E-07', type: 'single', label: 'Operating agreement in place?', required: true, options: [
    { value: 'yes', label: 'Yes' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'M3-E-10', type: 'single', label: 'Legal structure', required: true, options: [
    { value: 'llc', label: 'LLC' },
    { value: 'c-corp', label: 'C-Corporation' },
    { value: 's-corp', label: 'S-Corporation' },
    { value: 'sole', label: 'Sole Proprietorship' },
  ]},
  { key: 'M3-E-11', type: 'text', label: 'State of registration' },
  { key: 'M3-E-12', type: 'single', label: 'Has the entity been formed?', required: true, options: [
    { value: 'yes', label: 'Yes — already formed and registered' },
    { value: 'in-progress', label: 'No — formation is in progress' },
    { value: 'no', label: 'No — not yet started' },
  ]},
];

const WHAT_YOU_DO_QUESTIONS: QuestionField[] = [
  { key: 'M3-K-01', type: 'textarea', label: 'Describe your business in three sentences — what it does, who pays for it, and how money flows through it. Write this as you\'d explain it to someone who has never heard of your industry.', required: true },
  { key: 'M3-B-01', type: 'textarea', label: 'Why did you choose this location for your business?', helperText: 'Officers notice when cover letters say nothing about why this specific location. Your answer here produces a sentence most applications are missing.' },
  { key: 'M3-B-02', type: 'text', label: 'Approximate population of the city or metro area', helperText: 'Enter "Not sure yet" if unknown.' },
  { key: 'M3-B-03', type: 'text', label: 'How many direct competitors operate within 5 miles?', helperText: 'Enter "I haven\'t researched this yet" if unknown.' },
];

const OPERATIONS_QUESTIONS: QuestionField[] = [
  { key: 'M3-G-04', type: 'single', label: 'Does the business have a physical U.S. location?', required: true, options: [
    { value: 'yes-lease', label: 'Yes — signed lease or owned property' },
    { value: 'yes-franchise', label: 'Yes — franchise location assigned' },
    { value: 'searching', label: 'Not yet — location search in progress' },
    { value: 'remote', label: 'Business operates remotely (no physical location)' },
  ]},
  { key: 'M3-G-05', type: 'text', label: 'Business address' },
  { key: 'M3-G-08', type: 'single', label: 'Is the business currently operational?', required: true, options: [
    { value: 'yes', label: 'Yes — actively operating' },
    { value: 'partial', label: 'Partially — soft launch or pre-revenue' },
    { value: 'pre-opening', label: 'No — pre-opening stage' },
    { value: 'invested', label: 'No — investment committed, opening pending' },
  ]},
  { key: 'M3-G-08a', type: 'single', label: 'How many days per week will you personally be present at or actively managing this business?', required: true, options: [
    { value: '5', label: '5 days/week — on-site daily' },
    { value: '3-4', label: '3–4 days/week — on-site with some remote oversight' },
    { value: '1-2', label: '1–2 days/week — hiring a manager, strategic oversight' },
  ]},
  { key: 'M3-G-09', type: 'textarea', label: 'Walk me through what happens in the first 90 days after you open. What are the first three milestones?', helperText: 'e.g. Day 1-30: Hire first two employees. Day 31-60: Acquire first 5 clients. Day 61-90: Break even on monthly operating costs.' },
];

const LICENSES_QUESTIONS: QuestionField[] = [
  { key: 'M3-G-10', type: 'textarea', label: 'What licenses or permits does the business hold or have applied for?' },
  { key: 'M3-G-06', type: 'single', label: 'Type of premises', options: [
    { value: 'retail', label: 'Retail storefront' },
    { value: 'office', label: 'Office space' },
    { value: 'industrial', label: 'Industrial or warehouse' },
    { value: 'home', label: 'Home office' },
    { value: 'franchise', label: 'Franchise-provided location' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-G-07', type: 'single', label: 'Lease term or ownership status', options: [
    { value: 'multi-year', label: 'Multi-year lease (2+ years)' },
    { value: 'month-to-month', label: 'Month-to-month lease' },
    { value: 'owned', label: 'Owned property' },
    { value: 'franchise', label: 'Franchise agreement includes location' },
    { value: 'not-secured', label: 'Not yet secured' },
  ]},
  { key: 'M3-G-11', type: 'single', label: 'Have you obtained the required business insurance?', options: [
    { value: 'yes', label: 'Yes — policy in place' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'no', label: 'Not yet' },
  ]},
];

const FRANCHISE_QUESTIONS: QuestionField[] = [
  { key: 'M3-F-09', type: 'text', label: 'Franchise system name' },
  { key: 'M3-F-10', type: 'single', label: 'Has your franchisor provided Item 19 financial performance data in their FDD?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'unsure', label: 'Not sure' },
  ]},
  { key: 'M3-F-11', type: 'single', label: 'Has the franchise agreement been signed?', required: true, options: [
    { value: 'yes', label: 'Yes' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'no', label: 'No' },
  ]},
];

const MARKET_QUESTIONS: QuestionField[] = [
  { key: 'M3-K-02', type: 'textarea', label: 'Who are your target customers?' },
  { key: 'M3-K-11', type: 'textarea', label: 'What is the size of your target market?' },
  { key: 'M3-K-03', type: 'textarea', label: 'Who else is doing this in your area, and why does your business win against them?' },
  { key: 'M3-K-12', type: 'textarea', label: 'What market trends support your business?' },
];

const ALL_QUESTION_SETS = [
  { questions: ENTITY_QUESTIONS, cluster: 1 },
  { questions: WHAT_YOU_DO_QUESTIONS, cluster: 2 },
  { questions: OPERATIONS_QUESTIONS, cluster: 3 },
  { questions: LICENSES_QUESTIONS, cluster: 4 },
  { questions: FRANCHISE_QUESTIONS, cluster: 5 },
  { questions: MARKET_QUESTIONS, cluster: 7 },
];

export default function BusinessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeCluster, setActiveCluster] = useState(1);
  const [answers, setAnswers] = useState<Record<string, BizAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [isFranchise, setIsFranchise] = useState(false);
  const [startupCosts, setStartupCosts] = useState<Array<{ id: string; category: string; description: string; amount: string }>>([]);
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createBrowserSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data: apps } = await supabase
          .from('applications')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!apps || apps.length === 0) { setLoading(false); return; }
        const appId = apps[0].id;
        setApplicationId(appId);

        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('question_key, answer_value, source')
          .eq('application_id', appId);

        if (existingAnswers) {
          const answerMap: Record<string, BizAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = {
                value: String(row.answer_value),
                source: row.source as BizAnswer['source'],
              };
            }
          });
          setAnswers(answerMap);

          // Check franchise type
          const bizType = answerMap['M3-F-01']?.value;
          setIsFranchise(bizType?.toLowerCase().includes('franchise') || false);
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const saveAnswer = useCallback(async (key: string, value: string) => {
    if (!applicationId) return;
    const source = answers[key]?.source === 'quiz' && value === answers[key]?.value
      ? 'quiz' : answers[key]?.source === 'quiz' ? 'user_edited' : 'user_entry';

    setSaveStatus('saving');
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_key: key, answer_value: value, application_id: applicationId, source }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
    }
  }, [applicationId, answers]);

  const handleAnswerChange = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [key]: {
        value,
        source: prev[key]?.source === 'quiz' ? 'user_edited' : prev[key]?.source || 'user_entry',
      },
    }));
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => saveAnswer(key, value), 800);
  }, [saveAnswer]);

  const totalQuestions = ALL_QUESTION_SETS.reduce((sum, s) => sum + s.questions.length, 0) + 1; // +1 for startup cost table
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.value !== '').length;

  const clusterStatuses = CLUSTERS.map((cluster) => {
    if (cluster.number === 6) {
      return { number: 6, label: cluster.label, status: startupCosts.length > 0 ? 'active' as const : 'empty' as const };
    }
    const set = ALL_QUESTION_SETS.find((s) => s.cluster === cluster.number);
    if (!set) return { number: cluster.number, label: cluster.label, status: 'empty' as const };
    const answered = set.questions.filter((q) => answers[q.key]?.value !== '').length;
    const status: 'complete' | 'active' | 'empty' = answered === set.questions.length ? 'complete' : answered > 0 ? 'active' : 'empty';
    return { number: cluster.number, label: cluster.label, status };
  });

  const handleBack = () => {
    if (activeCluster > 1) setActiveCluster(activeCluster - 1);
    else router.push('/apply/story');
  };

  const handleNext = () => {
    if (activeCluster < CLUSTERS.length) setActiveCluster(activeCluster + 1);
    else router.push('/apply/investment');
  };

  const renderQuestionCluster = (questions: QuestionField[]) => (
    <div className="space-y-6">
      {questions.map((q) => {
        if (q.showIf) {
          const depAnswer = answers[q.showIf.key]?.value;
          if (!q.showIf.values.includes(depAnswer || '')) return null;
        }
        const answer = answers[q.key];
        const isOriginal = answer?.source === 'quiz';
        return (
          <div key={q.key}>
            {isOriginal && <PreFillBadge isOriginal={true} />}
            {answer?.source === 'user_edited' && <PreFillBadge isOriginal={false} />}
            <QuestionLabel required={q.required}>{q.label}</QuestionLabel>
            {q.type === 'single' ? (
              <div className="flex flex-col gap-2">
                {q.options?.map((opt) => (
                  <OptionButton
                    key={opt.value}
                    label={opt.label}
                    selected={answer?.value === opt.value}
                    onClick={() => handleAnswerChange(q.key, opt.value)}
                  />
                ))}
              </div>
            ) : q.type === 'textarea' ? (
              <TextArea
                value={answer?.value || ''}
                onChange={(val) => handleAnswerChange(q.key, val)}
                rows={4}
              />
            ) : (
              <TextInput
                value={answer?.value || ''}
                onChange={(val) => handleAnswerChange(q.key, val)}
              />
            )}
            {q.helperText && <HelperText>{q.helperText}</HelperText>}
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[196px] shrink-0 border-r lg:block" style={{ borderColor: 'rgba(201,168,76,0.12)' }}>
        <SectionSideNav
          sectionName="Your Business"
          answeredCount={answeredCount}
          totalCount={totalQuestions}
          clusters={clusterStatuses}
          documents={DOCUMENTS}
          activeCluster={activeCluster}
          onClusterClick={setActiveCluster}
        />
      </aside>

      <div className="fixed top-12 left-0 right-0 z-30 flex overflow-x-auto border-b lg:hidden" style={{ borderColor: 'rgba(201,168,76,0.12)', backgroundColor: '#0a0a0a' }}>
        {CLUSTERS.filter((c) => c.number !== 5 || isFranchise).map((cluster) => (
          <button
            key={cluster.number}
            onClick={() => setActiveCluster(cluster.number)}
            className="shrink-0 border-b px-4 py-2 text-[10px] uppercase tracking-[0.08em]"
            style={{
              borderColor: activeCluster === cluster.number ? '#C9A84C' : 'transparent',
              color: activeCluster === cluster.number ? '#C9A84C' : 'rgba(245,240,232,0.28)',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {cluster.number}. {cluster.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 pt-12 lg:pt-0">
        <QuestionPanel
          sectionTitle="Your Business"
          clusterLabel={CLUSTERS[activeCluster - 1]?.label || ''}
          saveStatus={saveStatus}
          answeredCount={answeredCount}
          totalCount={totalQuestions}
          onBack={handleBack}
          onNext={handleNext}
        >
          {activeCluster === 1 && (
            <div>
              <ClusterDivider label="Entity & registration" />
              {renderQuestionCluster(ENTITY_QUESTIONS)}

              {answers['M3-E-02']?.value === 'not-formed' && (
                <AdvisoryBlock>
                  Your entity should be formed before your interview. Entity formation demonstrates the business is real and in process.
                </AdvisoryBlock>
              )}

              {answers['M3-E-10']?.value === 'llc' && (
                <AdvisoryBlock>
                  Two separate documents are required. Articles of organization (or certificate of formation) is filed with the state to create the LLC. Your operating agreement is the private internal document governing how the LLC operates. Officers want to see both.
                </AdvisoryBlock>
              )}

              <AdvisoryBlock>
                Every US LLC must have a registered agent in the state of registration — a person or company with a physical US address who can receive legal documents on behalf of the business. Canadian investors cannot serve as their own registered agent before moving. Commercial registered agent services cost $50–$200/year.
              </AdvisoryBlock>
            </div>
          )}

          {activeCluster === 2 && (
            <div>
              <ClusterDivider label="What you do" />
              {renderQuestionCluster(WHAT_YOU_DO_QUESTIONS)}

              {(answers['M3-B-02']?.value === '' || !answers['M3-B-02']?.value) && (
                <AdvisoryBlock>
                  Local market data — even rough figures — makes your business plan&apos;s market analysis section credible. Generic market analysis with no local reference is one of the signals officers use to identify AI-generated applications.
                </AdvisoryBlock>
              )}
            </div>
          )}

          {activeCluster === 3 && (
            <div>
              <ClusterDivider label="Operations" />
              {renderQuestionCluster(OPERATIONS_QUESTIONS)}

              {answers['M3-G-04']?.value === 'remote' && (
                <AdvisoryBlock>
                  Online or home-based businesses face a higher evidentiary standard. Officers want to see evidence of customer interaction, physical presence, or a plan to establish a physical location.
                </AdvisoryBlock>
              )}

              {answers['M3-G-08']?.value === 'pre-opening' && (
                <AdvisoryBlock>
                  Businesses in pre-opening stage face a higher evidentiary standard. Your cover letter must clearly articulate the timeline to operational status and what has already been committed.
                </AdvisoryBlock>
              )}

              {answers['M3-G-08a']?.value === '1-2' && (
                <RiskFlag>
                  Denial risk — remote management. An investor who hires a manager to run day-to-day operations and oversees remotely fails the &apos;develop and direct&apos; requirement under 9 FAM 402.9. Your cover letter must clearly articulate your specific management role. Attorney review recommended.
                </RiskFlag>
              )}
            </div>
          )}

          {activeCluster === 4 && (
            <div>
              <ClusterDivider label="Licenses & setup" />
              {renderQuestionCluster(LICENSES_QUESTIONS)}

              {answers['M3-G-11']?.value === 'no' && (
                <AdvisoryBlock>
                  Most commercial leases require proof of general liability insurance before you can take possession. Franchise agreements specify minimum coverage levels. Your checklist will include the required policy types for your business category.
                </AdvisoryBlock>
              )}
            </div>
          )}

          {activeCluster === 5 && isFranchise && (
            <div>
              <ClusterDivider label="Franchise details" />
              {renderQuestionCluster(FRANCHISE_QUESTIONS)}

              {answers['M3-F-10']?.value === 'yes' && (
                <AdvisoryBlock>
                  Use those figures as the basis for your projections below. We&apos;ll note in your business plan that projections are derived from franchisor-disclosed unit economics.
                </AdvisoryBlock>
              )}

              {answers['M3-F-10']?.value === 'no' && (
                <AdvisoryBlock>
                  Your projections need supporting evidence — local market research, industry data, or comparable business financials.
                </AdvisoryBlock>
              )}
            </div>
          )}

          {activeCluster === 6 && (
            <div>
              <ClusterDivider label="Startup costs" />
              <StartupCostTable
                value={startupCosts}
                onChange={setStartupCosts}
                investmentAmount={answers['M3-F-02'] ? Number(answers['M3-F-02'].value) : undefined}
              />
            </div>
          )}

          {activeCluster === 7 && (
            <div>
              <ClusterDivider label="Market & competition" />
              {renderQuestionCluster(MARKET_QUESTIONS)}
            </div>
          )}
        </QuestionPanel>
      </div>
    </div>
  );
}
