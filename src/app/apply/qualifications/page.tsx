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

interface QualAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

const CLUSTERS = [
  { number: 1, label: 'Your background' },
  { number: 2, label: 'Your business experience' },
  { number: 3, label: 'Your role in the business' },
  { number: 4, label: 'Visa history' },
  { number: 5, label: 'Interview prep' },
];

const DOCUMENTS = [
  { name: 'Resume', status: 'waiting' as const },
  { name: 'Credentials', status: 'waiting' as const },
];

interface QuestionField {
  key: string;
  type: 'text' | 'textarea' | 'single' | 'multi' | 'currency';
  label: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  showIf?: { key: string; value: string };
}

const BACKGROUND_QUESTIONS: QuestionField[] = [
  { key: 'M3-Q-01', type: 'single', label: 'Highest level of education completed', required: true, options: [
    { value: 'high-school', label: 'High school diploma or equivalent' },
    { value: 'college', label: 'College or associate degree' },
    { value: 'bachelor', label: 'Bachelor\'s degree' },
    { value: 'master', label: 'Master\'s degree' },
    { value: 'doctorate', label: 'Doctorate or professional degree' },
    { value: 'trade', label: 'Trade or technical certification' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-Q-02', type: 'text', label: 'What did you study?', helperText: 'Degree, diploma, or certification name and institution.' },
  { key: 'M3-Q-03', type: 'single', label: 'English language proficiency', options: [
    { value: 'native', label: 'Native speaker' },
    { value: 'fluent', label: 'Fluent — professional working proficiency' },
    { value: 'conversational', label: 'Conversational' },
    { value: 'limited', label: 'Limited proficiency' },
  ]},
  { key: 'M3-Q-04', type: 'textarea', label: 'What is your professional background — what do you know how to do?' },
  { key: 'M3-Q-05', type: 'text', label: 'How many years of industry experience do you have in the business you are opening?' },
  { key: 'M3-Q-06', type: 'multi', label: 'What relevant skills or experience do you bring to this business?', options: [
    { value: 'management', label: 'Management / leadership' },
    { value: 'sales', label: 'Sales / business development' },
    { value: 'operations', label: 'Operations / logistics' },
    { value: 'finance', label: 'Finance / accounting' },
    { value: 'marketing', label: 'Marketing / branding' },
    { value: 'technical', label: 'Technical / IT' },
    { value: 'industry', label: 'Specific industry expertise' },
    { value: 'none', label: 'No direct experience — first business' },
  ]},
  { key: 'M3-Q-07', type: 'single', label: 'Have you owned or operated a business before?', options: [
    { value: 'yes-current', label: 'Yes — currently own a business' },
    { value: 'yes-past', label: 'Yes — previously owned, now closed or sold' },
    { value: 'no', label: 'No — this is my first business' },
  ]},
];

const BUSINESS_EXPERIENCE_QUESTIONS: QuestionField[] = [
  { key: 'M3-Q-10', type: 'single', label: 'How did you decide on this particular business?', options: [
    { value: 'industry', label: 'Industry knowledge and research' },
    { value: 'fdd', label: 'Reviewed franchise disclosure documents' },
    { value: 'market', label: 'Market research and demand analysis' },
    { value: 'personal', label: 'Personal passion or interest' },
    { value: 'opportunity', label: 'Specific opportunity presented itself' },
    { value: 'other', label: 'Other' },
  ]},
  { key: 'M3-Q-11', type: 'textarea', label: 'Describe the market research or due diligence you conducted before choosing this business.' },
  { key: 'M3-Q-12', type: 'single', label: 'Have you visited the business location or franchise in person?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no-planned', label: 'No — planning to visit' },
    { value: 'no', label: 'No — not applicable (remote business)' },
  ]},
];

const ROLE_QUESTIONS: QuestionField[] = [
  { key: 'M3-Q-20', type: 'text', label: 'Your official title or position in the business', required: true },
  { key: 'M3-Q-21', type: 'multi', label: 'What will your day-to-day responsibilities be?', required: true, options: [
    { value: 'management', label: 'Hiring, firing, managing employees' },
    { value: 'finance', label: 'Financial oversight and bookkeeping' },
    { value: 'sales', label: 'Client/customer relationship management' },
    { value: 'operations', label: 'Day-to-day operations' },
    { value: 'strategy', label: 'Business strategy and growth' },
    { value: 'marketing', label: 'Marketing and customer acquisition' },
    { value: 'procurement', label: 'Supplier/vendor management' },
    { value: 'compliance', label: 'Compliance and legal requirements' },
  ]},
  { key: 'M3-Q-22', type: 'single', label: 'Will you have authority to hire and fire employees?', options: [
    { value: 'yes', label: 'Yes — full authority' },
    { value: 'yes-shared', label: 'Yes — with co-approval required' },
    { value: 'no', label: 'No — handled by someone else' },
  ]},
  { key: 'M3-Q-23', type: 'single', label: 'Will you sign contracts and financial commitments on behalf of the business?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'shared', label: 'Shared with a partner' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'M3-Q-24', type: 'single', label: 'Will you be physically present in the U.S. managing the business?', required: true, options: [
    { value: 'full-time', label: 'Yes — full-time, on-site' },
    { value: 'hybrid', label: 'Yes — primarily on-site with some remote' },
    { value: 'part-time', label: 'Part-time presence, remote management' },
    { value: 'no', label: 'No — remote from outside the U.S.' },
  ]},
  { key: 'M3-Q-25', type: 'textarea', label: 'How many hours per week will you spend on the business? What will a typical week look like?' },
];

const VISA_HISTORY_QUESTIONS: QuestionField[] = [
  { key: 'M3-V-01', type: 'single', label: 'Have you ever been denied a U.S. visa?', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'M3-V-02', type: 'textarea', label: 'If denied, when and what type of visa? What reason was given?', helperText: 'Be specific. Officers will have access to your prior records.', showIf: { key: 'M3-V-01', value: 'yes' } },
  { key: 'M3-V-03', type: 'single', label: 'Have you ever overstayed a U.S. visa or been in the U.S. without authorization?', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'M3-V-04', type: 'textarea', label: 'If yes, provide details: dates, circumstances, how you resolved it.', showIf: { key: 'M3-V-03', value: 'yes' } },
  { key: 'M3-V-05', type: 'single', label: 'Have you ever been in removal or deportation proceedings?', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'M3-V-06', type: 'textarea', label: 'If yes, provide details and outcome.', showIf: { key: 'M3-V-05', value: 'yes' } },
  { key: 'M3-V-07', type: 'single', label: 'Have you previously held any U.S. visa status?', options: [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
  ]},
  { key: 'M3-V-08', type: 'textarea', label: 'List prior U.S. visa statuses, dates, and purpose.', showIf: { key: 'M3-V-07', value: 'yes' } },
];

const INTERVIEW_PREP_QUESTIONS: QuestionField[] = [
  { key: 'M3-I-11', type: 'single', label: 'Which U.S. consulate will you attend for your E-2 interview?', options: [
    { value: 'toronto', label: 'Toronto, Canada' },
    { value: 'other', label: 'Other — specify below' },
  ]},
  { key: 'M3-I-12', type: 'text', label: 'Other consulate location' },
  { key: 'M3-I-13', type: 'single', label: 'Do you have an interview date scheduled?', options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No — not yet scheduled' },
  ]},
  { key: 'M3-I-14', type: 'single', label: 'Are you comfortable answering officer questions about your business plan and investment?', options: [
    { value: 'yes', label: 'Yes — feel prepared' },
    { value: 'somewhat', label: 'Somewhat — need to review' },
    { value: 'no', label: 'No — need coaching' },
  ]},
  { key: 'M3-I-15', type: 'textarea', label: 'What concerns you most about the E-2 interview? What questions are you worried about?' },
];

const ALL_QUESTION_SETS = [
  { questions: BACKGROUND_QUESTIONS, cluster: 1 },
  { questions: BUSINESS_EXPERIENCE_QUESTIONS, cluster: 2 },
  { questions: ROLE_QUESTIONS, cluster: 3 },
  { questions: VISA_HISTORY_QUESTIONS, cluster: 4 },
  { questions: INTERVIEW_PREP_QUESTIONS, cluster: 5 },
];

export default function QualificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeCluster, setActiveCluster] = useState(1);
  const [answers, setAnswers] = useState<Record<string, QualAnswer>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [applicationId, setApplicationId] = useState<string | null>(null);
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
          const answerMap: Record<string, QualAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = { value: String(row.answer_value), source: row.source as QualAnswer['source'] };
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

  const totalQuestions = ALL_QUESTION_SETS.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.value !== '').length;

  const clusterStatuses = CLUSTERS.map((cluster) => {
    const set = ALL_QUESTION_SETS.find((s) => s.cluster === cluster.number);
    if (!set) return { number: cluster.number, label: cluster.label, status: 'empty' as const };
    const answered = set.questions.filter((q) => {
      if ('showIf' in q && q.showIf) {
        const depAnswer = answers[q.showIf.key]?.value;
        return depAnswer !== q.showIf.value || answers[q.key]?.value !== '';
      }
      return answers[q.key]?.value !== '';
    }).length;
    const visible = set.questions.filter((q) => !('showIf' in q) || !q.showIf || answers[q.showIf.key]?.value === q.showIf.value).length;
    const status: 'complete' | 'active' | 'empty' = answered === visible && visible > 0 ? 'complete' : answered > 0 ? 'active' : 'empty';
    return { number: cluster.number, label: cluster.label, status };
  });

  const handleBack = () => {
    if (activeCluster > 1) setActiveCluster(activeCluster - 1);
    else router.push('/apply/investment');
  };

  const handleNext = () => {
    if (activeCluster < CLUSTERS.length) setActiveCluster(activeCluster + 1);
    else router.push('/apply/family');
  };

  const renderQuestions = (questions: QuestionField[]) => (
    <div className="space-y-6">
      {questions.map((q) => {
        if ('showIf' in q && q.showIf) {
          const depAnswer = answers[q.showIf.key]?.value;
          if (depAnswer !== q.showIf.value) return null;
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

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[196px] shrink-0 border-r lg:block" style={{ borderColor: 'rgba(201,168,76,0.12)' }}>
        <SectionSideNav sectionName="Your Qualifications" answeredCount={answeredCount} totalCount={totalQuestions} clusters={clusterStatuses} documents={DOCUMENTS} activeCluster={activeCluster} onClusterClick={setActiveCluster} />
      </aside>

      <div className="fixed top-12 left-0 right-0 z-30 flex overflow-x-auto border-b lg:hidden" style={{ borderColor: 'rgba(201,168,76,0.12)', backgroundColor: '#0a0a0a' }}>
        {CLUSTERS.map((c) => (
          <button key={c.number} onClick={() => setActiveCluster(c.number)} className="shrink-0 border-b px-4 py-2 text-[10px] uppercase tracking-[0.08em]" style={{ borderColor: activeCluster === c.number ? '#C9A84C' : 'transparent', color: activeCluster === c.number ? '#C9A84C' : 'rgba(245,240,232,0.28)', fontFamily: "'DM Sans', sans-serif" }}>
            {c.number}. {c.label}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 pt-12 lg:pt-0">
        <QuestionPanel sectionTitle="Your Qualifications" clusterLabel={CLUSTERS[activeCluster - 1]?.label || ''} saveStatus={saveStatus} answeredCount={answeredCount} totalCount={totalQuestions} onBack={handleBack} onNext={handleNext}>
          {activeCluster === 1 && (
            <div>
              <ClusterDivider label="Your background" />
              {renderQuestions(BACKGROUND_QUESTIONS)}
            </div>
          )}

          {activeCluster === 2 && (
            <div>
              <ClusterDivider label="Your business experience" />
              {renderQuestions(BUSINESS_EXPERIENCE_QUESTIONS)}

              {answers['M3-Q-07']?.value === 'no' && (
                <AdvisoryBlock>As a first-time business owner, your interview preparation is especially important. Officers will scrutinize your preparation more closely. Ensure your business plan is airtight and that you can articulate why this specific business and why now.</AdvisoryBlock>
              )}
            </div>
          )}

          {activeCluster === 3 && (
            <div>
              <ClusterDivider label="Your role in the business" />
              {renderQuestions(ROLE_QUESTIONS)}

              {answers['M3-Q-24']?.value === 'no' && (
                <RiskFlag label="Critical issue">E-2 visa requires you to be present in the US directing and developing the business. Remote management from outside the US does not qualify and is a near-certain denial.</RiskFlag>
              )}

              {answers['M3-Q-24']?.value === 'part-time' && (
                <AdvisoryBlock>E-2 requires you to direct and develop the enterprise. Part-time presence raises questions about whether you are truly directing the business. Your interview preparation should include a detailed explanation of how you will manage remotely while maintaining effective control.</AdvisoryBlock>
              )}
            </div>
          )}

          {activeCluster === 4 && (
            <div>
              <ClusterDivider label="Visa history" />
              {renderQuestions(VISA_HISTORY_QUESTIONS)}

              {answers['M3-V-01']?.value === 'yes' && (
                <AdvisoryBlock>A prior visa denial does not automatically bar you from E-2, but you must be prepared to explain what changed since the denial. The key question officers will ask: &ldquo;What is materially different about your application now?&rdquo;</AdvisoryBlock>
              )}

              {answers['M3-V-03']?.value === 'yes' && (
                <RiskFlag label="Significant risk">Prior overstay or unauthorized presence can trigger bars on re-entry. You need an immigration attorney to assess whether you are subject to a 3-year or 10-year bar before proceeding with your E-2 application.</RiskFlag>
              )}
            </div>
          )}

          {activeCluster === 5 && (
            <div>
              <ClusterDivider label="Interview prep" />
              {renderQuestions(INTERVIEW_PREP_QUESTIONS)}
            </div>
          )}
        </QuestionPanel>
      </div>
    </div>
  );
}
