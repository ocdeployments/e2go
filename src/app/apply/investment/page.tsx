'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTrackSectionVisit } from "@/hooks/useTrackSectionVisit";
import { createBrowserSupabaseClient } from '@/lib/supabase';
import CaseFileShell from '@/components/apply/CaseFileShell';
import QuestionLabel from '@/components/apply/questions/QuestionLabel';
import HelperText from '@/components/apply/questions/HelperText';
import TextInput from '@/components/apply/questions/TextInput';
import TextArea from '@/components/apply/questions/TextArea';
import OptionButton from '@/components/apply/questions/OptionButton';
import PreFillBadge from '@/components/apply/questions/PreFillBadge';
import AdvisoryBlock from '@/components/apply/questions/AdvisoryBlock';
import RiskFlag from '@/components/apply/questions/RiskFlag';
import ClusterDivider from '@/components/apply/questions/ClusterDivider';
import ProjectionTable from '@/components/apply/questions/ProjectionTable';

interface InvAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

const CLUSTERS = [
  { number: 1, label: 'Investment overview' },
  { number: 2, label: 'Where the money came from' },
  { number: 3, label: 'The paper trail' },
  { number: 4, label: 'Financial projections' },
  { number: 5, label: 'Non-marginality' },
];

const DOCUMENTS = [
  { name: 'Source of Funds', status: 'waiting' as const },
  { name: 'Investment Proof', status: 'waiting' as const },
];

interface QuestionField {
  key: string;
  type: 'text' | 'textarea' | 'single' | 'multi' | 'currency';
  label: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
}

const INVESTMENT_OVERVIEW_QUESTIONS: QuestionField[] = [
  { key: 'M3-F-01', type: 'single', label: 'Investment type', required: true, options: [
    { value: 'new', label: 'New business' },
    { value: 'acquisition', label: 'Acquisition of existing business' },
    { value: 'franchise', label: 'Franchise' },
  ]},
  { key: 'M3-F-02', type: 'currency', label: 'Total invested to date (USD)', required: true, helperText: 'Pre-filled from your eligibility check — confirm or update if this has changed.' },
  { key: 'M3-F-03', type: 'currency', label: 'Total cost to establish the business (USD)', required: true },
  { key: 'M3-F-04', type: 'multi', label: 'How was the investment deployed?', required: true, options: [
    { value: 'franchise-fee', label: 'Franchise fee' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'leasehold', label: 'Leasehold improvements' },
    { value: 'inventory', label: 'Initial inventory' },
    { value: 'working-capital', label: 'Working capital' },
    { value: 'professional', label: 'Professional fees' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-F-NEW-01', type: 'single', label: 'Are funds actually spent on business expenses?', options: [
    { value: 'yes', label: 'Yes — funds are deployed' },
    { value: 'partial', label: 'Partially — some funds still held' },
    { value: 'no', label: 'No — committed but not yet spent' },
  ]},
  { key: 'M3-F-NET', type: 'currency', label: 'Approximate net worth in CAD (not including primary residence)' },
];

const SOURCE_OF_FUNDS_QUESTIONS: QuestionField[] = [
  { key: 'M3-F-05', type: 'multi', label: 'Source of funds', required: true, options: [
    { value: 'savings', label: 'Personal savings' },
    { value: 'rrsp', label: 'RRSP' },
    { value: 'tfsa', label: 'TFSA' },
    { value: 'lira', label: 'LIRA or pension' },
    { value: 'property-sale', label: 'Sale of property' },
    { value: 'business-sale', label: 'Sale of a business' },
    { value: 'inheritance', label: 'Inheritance or gift' },
    { value: 'crypto', label: 'Cryptocurrency' },
    { value: 'loan', label: 'Loan' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-H-NEW-01', type: 'single', label: 'Can you trace the funds from their origin to the US business account?', options: [
    { value: 'yes', label: 'Yes — complete paper trail' },
    { value: 'partial', label: 'Partial — some gaps' },
    { value: 'no', label: 'No — need to compile' },
  ]},
];

const PAPER_TRAIL_QUESTIONS: QuestionField[] = [
  { key: 'M3-H-01', type: 'textarea', label: 'Walk me through the money. Start from where it sat 12–18 months ago and trace every step to where it is today in the US business account. Include dates and amounts at each step.', required: true },
  { key: 'M3-H-02', type: 'single', label: 'Over what period were funds accumulated?', options: [
    { value: '<1', label: 'Less than 1 year' },
    { value: '1-3', label: '1–3 years' },
    { value: '3-5', label: '3–5 years' },
    { value: '5-10', label: '5–10 years' },
    { value: '10+', label: 'More than 10 years' },
  ]},
  { key: 'M3-H-03', type: 'single', label: 'Were funds held in multiple currencies?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'M3-H-05', type: 'single', label: 'Were any funds a gift or inheritance?', options: [
    { value: 'no', label: 'No — all funds are mine' },
    { value: 'partial-gift', label: 'Yes — partial gift' },
    { value: 'partial-loan', label: 'Yes — partial loan' },
    { value: 'all-gift', label: 'Yes — all funds are a gift or loan' },
  ]},
  { key: 'M3-H-08', type: 'multi', label: 'How were the funds transferred to the U.S. business?', options: [
    { value: 'wire', label: 'Wire transfer to U.S. business account' },
    { value: 'franchise', label: 'Direct franchise fee payment' },
    { value: 'attorney', label: 'Payment to U.S. attorney trust account' },
    { value: 'assets', label: 'Purchase of U.S. business assets' },
    { value: 'multiple', label: 'Multiple transfers over time' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-H-09', type: 'single', label: 'Do you have wire transfer records or payment receipts?', options: [
    { value: 'yes', label: 'Yes — complete records' },
    { value: 'partial', label: 'Partial records' },
    { value: 'no', label: 'No records yet' },
  ]},
  { key: 'M3-H-10', type: 'single', label: 'Were funds converted from a foreign currency?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'M3-B-BANK', type: 'single', label: 'Has your US business bank account been opened?', required: true, options: [
    { value: 'yes', label: 'Yes — account is open' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'no', label: 'No — not yet started' },
  ]},
  { key: 'M3-B-WIRE', type: 'single', label: 'Have you confirmed with your Canadian bank that they can process an international wire?', options: [
    { value: 'yes', label: 'Yes — confirmed' },
    { value: 'no', label: 'No — not yet' },
  ]},
];

const PROJECTIONS_QUESTIONS: QuestionField[] = [
  { key: 'M3-I-03', type: 'multi', label: 'What is the basis for your revenue projections?', options: [
    { value: 'fdd', label: 'FDD Item 19 (franchise disclosure data)' },
    { value: 'historical', label: 'Prior owner financials' },
    { value: 'industry', label: 'Industry benchmarks' },
    { value: 'research', label: 'Market research' },
    { value: 'experience', label: 'Personal experience estimate' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-I-04', type: 'currency', label: 'What will your annual salary or draw from the business be in Year 1?' },
];

const NON_MARGINALITY_QUESTIONS: QuestionField[] = [
  { key: 'M3-I-05', type: 'text', label: 'How many full-time U.S. employees will you hire in Year 1?' },
  { key: 'M3-I-06', type: 'text', label: 'How many part-time U.S. employees will you hire in Year 1?' },
  { key: 'M3-I-07', type: 'textarea', label: 'What are the planned roles for Year 1 hires?' },
  { key: 'M3-I-09', type: 'single', label: 'Does the business produce goods or services for the U.S. market beyond supporting your household?', options: [
    { value: 'yes-direct', label: 'Yes — serves U.S. customers directly' },
    { value: 'yes-b2b', label: 'Yes — provides B2B services to U.S. businesses' },
    { value: 'own-income', label: 'Primarily supports my own income' },
    { value: 'not-operational', label: 'Not yet operational' },
  ]},
  { key: 'M3-I-10', type: 'multi', label: 'What evidence supports your non-marginality argument?', options: [
    { value: 'fdd', label: 'FDD performance data' },
    { value: 'contracts', label: 'Signed client contracts' },
    { value: 'loi', label: 'Letters of intent' },
    { value: 'research', label: 'Market research report' },
    { value: 'prior', label: 'Prior owner financials' },
    { value: 'industry', label: 'Industry association data' },
    { value: 'plan', label: 'Business plan projections' },
  ]},
];

const ALL_QUESTION_SETS = [
  { questions: INVESTMENT_OVERVIEW_QUESTIONS, cluster: 1 },
  { questions: SOURCE_OF_FUNDS_QUESTIONS, cluster: 2 },
  { questions: PAPER_TRAIL_QUESTIONS, cluster: 3 },
  { questions: PROJECTIONS_QUESTIONS, cluster: 4 },
  { questions: NON_MARGINALITY_QUESTIONS, cluster: 5 },
];

export default function InvestmentPage() {
  useTrackSectionVisit("investment");

  const [loading, setLoading] = useState(true);
  const [activeClusterId, setActiveClusterId] = useState('cluster-1');
  const [answers, setAnswers] = useState<Record<string, InvAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [projections, setProjections] = useState<Array<{ year: number; revenue: string; netIncome: string; employees: string }>>([]);
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
        setApplicationId(apps[0].id);

        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('question_key, answer_value, source')
          .eq('application_id', apps[0].id);

        if (existingAnswers) {
          const answerMap: Record<string, InvAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = { value: String(row.answer_value), source: row.source as InvAnswer['source'] };
            }
          });
          setAnswers(answerMap);
        }
        setLoading(false);
      } catch { setLoading(false); }
    };
    loadData();
  }, []);

  const saveAnswer = useCallback(async (key: string, value: string) => {
    if (!applicationId) return;
    const source = answers[key]?.source === 'quiz' && value === answers[key]?.value ? 'quiz' : answers[key]?.source === 'quiz' ? 'user_edited' : 'user_entry';
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
    } catch { setSaveStatus('error'); }
  }, [applicationId, answers]);

  const handleAnswerChange = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: { value, source: prev[key]?.source === 'quiz' ? 'user_edited' : prev[key]?.source || 'user_entry' } }));
    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => saveAnswer(key, value), 800);
  }, [saveAnswer]);

  const clusterStatuses = CLUSTERS.map((cluster) => {
    const set = ALL_QUESTION_SETS.find((s) => s.cluster === cluster.number);
    if (!set) return { id: `cluster-${cluster.number}`, label: cluster.label, status: 'pending' as const };
    const answered = set.questions.filter((q) => answers[q.key]?.value !== '').length;
    const status: 'complete' | 'active' | 'pending' = answered === set.questions.length ? 'complete' : answered > 0 ? 'active' : 'pending';
    return { id: `cluster-${cluster.number}`, label: cluster.label, status };
  });

  const renderQuestions = (questions: QuestionField[]) => (
    <div className="space-y-6">
      {questions.map((q) => {
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
                  <OptionButton key={opt.value} label={opt.label} selected={answer?.value === opt.value} onClick={() => handleAnswerChange(q.key, opt.value)} />
                ))}
              </div>
            ) : q.type === 'textarea' ? (
              <TextArea value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} rows={4} />
            ) : (
              <TextInput value={answer?.value || ''} onChange={(val) => handleAnswerChange(q.key, val)} />
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

  const activeNumber = parseInt(activeClusterId.split('-')[1], 10);
  const isSaving = saveStatus === 'saving';

  const previewContent = (
    <div className="space-y-4">
      {DOCUMENTS.map(doc => (
        <div key={doc.name} className="border p-4" style={{ borderColor: 'rgba(201,168,76,0.12)', backgroundColor: 'rgba(201,168,76,0.01)' }}>
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(245,240,232,0.35)' }}>{doc.name}</span>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '10px', color: 'rgba(245,240,232,0.18)', border: '1px solid rgba(245,240,232,0.08)', padding: '2px 7px' }}>Waiting</span>
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '12px', fontWeight: 300, color: 'rgba(245,240,232,0.18)', fontStyle: 'italic', lineHeight: 1.5 }}>[Answer the questions on the left to fill this in]</p>
        </div>
      ))}
    </div>
  );

  return (
    <CaseFileShell
      sectionNumber={3}
      sectionTitle="Your Investment"
      clusters={clusterStatuses}
      activeClusterId={activeClusterId}
      onClusterChange={setActiveClusterId}
      buildsDocuments={['Source of Funds', 'Investment Proof']}
      nextSectionPath="/apply/qualifications"
      prevSectionPath="/apply/business"
      isSaving={isSaving}
      previewContent={previewContent}
    >
      {activeNumber === 1 && (
        <div>
          <ClusterDivider label="Investment overview" />
          {renderQuestions(INVESTMENT_OVERVIEW_QUESTIONS)}
          {answers['M3-F-02']?.value && Number(answers['M3-F-02'].value) % 1000 === 0 && Number(answers['M3-F-02'].value) > 0 && (
            <AdvisoryBlock>Round investment amounts can draw officer scrutiny. Officers read exact round numbers as threshold calculations, not real investments. If your actual costs break down to an odd figure, use the exact amount.</AdvisoryBlock>
          )}
          {answers['M3-F-02']?.value && answers['M3-F-03']?.value && Number(answers['M3-F-03'].value) > 0 && (Number(answers['M3-F-02'].value) / Number(answers['M3-F-03'].value)) < 0.5 && (
            <AdvisoryBlock>Your invested amount is less than 50% of the total cost to establish the business. You may need to argue substantiality — explain why the remaining costs will be covered and why your investment is already substantial.</AdvisoryBlock>
          )}
        </div>
      )}

      {activeNumber === 2 && (
        <div>
          <ClusterDivider label="Where the money came from" />
          {renderQuestions(SOURCE_OF_FUNDS_QUESTIONS)}

          {answers['M3-F-05']?.value?.includes('rrsp') && (
            <AdvisoryBlock>RRSP withdrawals generate a T4RSP slip and are taxable. You need: (1) proof of RRSP account, (2) withdrawal confirmation, (3) T4RSP slip, (4) bank statement showing deposit, (5) wire confirmation to US account. Consult a CPA about withholding tax implications.</AdvisoryBlock>
          )}

          {answers['M3-F-05']?.value?.includes('tfsa') && (
            <AdvisoryBlock>TFSA withdrawals have no tax slip. The paper trail is: (1) TFSA account statement, (2) withdrawal confirmation, (3) bank statement showing deposit, (4) wire confirmation. Note in your cover letter that TFSA funds are after-tax savings.</AdvisoryBlock>
          )}

          {answers['M3-F-05']?.value?.includes('crypto') && (
            <RiskFlag label="Documentary risk">Cryptocurrency funds require forensic-level tracing: original acquisition method, wallet history, exchange records, conversion to fiat, and wire to US account. Self-custody wallets require additional blockchain trace documentation.</RiskFlag>
          )}

          {answers['M3-F-05']?.value?.includes('inheritance') && (
            <AdvisoryBlock>Can the donor provide documentation showing where their gift funds came from — such as their own bank statements, a property sale, or investment account records? Officers require proof not just of the gift itself, but of the donor&apos;s source of wealth.</AdvisoryBlock>
          )}

          {answers['M3-F-01']?.value === 'acquisition' && (
            <div className="mt-4">
              <QuestionLabel>Is any part of the purchase price being financed by the seller?</QuestionLabel>
              <div className="flex flex-col gap-2">
                <OptionButton label="Yes" selected={answers['M3-H-SELLER']?.value === 'yes'} onClick={() => handleAnswerChange('M3-H-SELLER', 'yes')} />
                <OptionButton label="No" selected={answers['M3-H-SELLER']?.value === 'no'} onClick={() => handleAnswerChange('M3-H-SELLER', 'no')} />
              </div>
              {answers['M3-H-SELLER']?.value === 'yes' && (
                <AdvisoryBlock>The financed portion generally does not count toward your qualifying E-2 investment unless you are personally liable for repayment. The loan must be secured by your personal assets, not just business assets. Consult an attorney on structuring this.</AdvisoryBlock>
              )}
            </div>
          )}
        </div>
      )}

      {activeNumber === 3 && (
        <div>
          <ClusterDivider label="The paper trail" />
          {renderQuestions(PAPER_TRAIL_QUESTIONS)}

          {answers['M3-B-BANK']?.value === 'no' && (
            <AdvisoryBlock>
              Opening a US business bank account requires your LLC to be formed and EIN to be obtained first. Options: Mercury (recommended for remote opening), Relay (Mercury backup), TD Bank or RBC cross-border, or traditional US bank requiring in-person visit. Account must be in the business name.
            </AdvisoryBlock>
          )}

          {answers['M3-B-WIRE']?.value === 'no' && (
            <AdvisoryBlock>TD Bank&apos;s online wire limit is approximately $25,000 CAD. Above that requires branch or phone authorization. Some banks automatically freeze accounts on large outgoing international transfers without advance notice. Call your bank before wiring.</AdvisoryBlock>
          )}

          {answers['M3-H-09']?.value === 'no' && (
            <RiskFlag>Wire transfer records are critical evidence. Without them, officers have no way to verify the funds actually moved to the US business account. Prioritise obtaining these records before your interview.</RiskFlag>
          )}
        </div>
      )}

      {activeNumber === 4 && (
        <div>
          <ClusterDivider label="Financial projections" />
          {renderQuestions(PROJECTIONS_QUESTIONS)}

          <div className="mt-6">
            <QuestionLabel>Financial projections — Year 1 through Year 5</QuestionLabel>
            <ProjectionTable value={projections} onChange={setProjections} />
          </div>

          <div className="mt-6">
            <QuestionLabel>When do you project the business to break even?</QuestionLabel>
            <div className="flex flex-col gap-2">
              {[
                { value: '3-6', label: 'Month 3–6' },
                { value: '7-12', label: 'Month 7–12' },
                { value: 'year-2', label: 'Year 2' },
                { value: 'year-3+', label: 'Year 3 or later' },
              ].map((opt) => (
                <OptionButton key={opt.value} label={opt.label} selected={answers['M3-I-BREAKEVEN']?.value === opt.value} onClick={() => handleAnswerChange('M3-I-BREAKEVEN', opt.value)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeNumber === 5 && (
        <div>
          <ClusterDivider label="Non-marginality evidence" />
          {renderQuestions(NON_MARGINALITY_QUESTIONS)}
        </div>
      )}
    </CaseFileShell>
  );
}
