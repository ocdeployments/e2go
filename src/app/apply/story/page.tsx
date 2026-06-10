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
import ClusterDivider from '@/components/apply/questions/ClusterDivider';

interface StoryAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
  originalQuizValue?: string;
}

const CLUSTERS = [
  { number: 1, label: 'Who you are' },
  { number: 2, label: 'Your plan' },
  { number: 3, label: 'Administrative' },
  { number: 4, label: 'Travel & history' },
];

const DOCUMENTS = [
  { name: 'Cover Letter', status: 'waiting' as const },
  { name: 'Investor Bio', status: 'waiting' as const },
];

interface QuestionField {
  key: string;
  type: 'text' | 'textarea' | 'single';
  label: string;
  helperText?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  minChars?: number;
}

const CLUSTER_1_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-S1-01',
    type: 'textarea',
    label: "You're going to write a cover letter that a consular officer will read in under three minutes. It needs to tell them who you are in a way that makes this application make sense. Start here: what have you spent your career doing, and what does that have to do with this business?",
    helperText: 'Be specific about roles, industries, and skills. This feeds your cover letter opening and investor biography.',
    minChars: 150,
  },
  {
    key: 'M3-S1-02',
    type: 'textarea',
    label: "Why are you making this move? Not the official reason — the real reason. What is it about this business, this moment, and the United States that brought you to this decision?",
    helperText: 'This feeds your cover letter investment motivation paragraph. Officers read hundreds of applications — generic answers blend together.',
  },
  {
    key: 'M3-S1-03',
    type: 'textarea',
    label: "A consular officer is going to ask: does this person actually know how to run this kind of business? Answer that question directly. Be specific about what you've managed, built, or operated that applies here.",
    helperText: 'The more specific, the stronger your case. This feeds your qualifications paragraph.',
    minChars: 100,
  },
];

const CLUSTER_2_QUESTIONS: QuestionField[] = [
  {
    key: 'M3-S1-04',
    type: 'textarea',
    label: 'What happens in the first 12 months? Describe your first-year priorities — hiring, operations, revenue targets, how you establish the business.',
    helperText: 'This feeds your cover letter non-marginality paragraph. Officers want to see a concrete plan, not a vague intention.',
  },
  {
    key: 'M3-S1-05',
    type: 'textarea',
    label: 'Is there anything about your application that you know a consular officer might question?',
    helperText: 'This is not a trap. Officers respect applicants who proactively acknowledge and address weaknesses. An acknowledged weakness with a credible explanation is more convincing than an application that pretends no weaknesses exist.',
  },
  {
    key: 'M3-S1-05-option',
    type: 'single',
    label: '',
    options: [
      { value: 'na', label: 'Nothing unusual to address' },
    ],
  },
];

const CLUSTER_3_QUESTIONS: QuestionField[] = [
  { key: 'M3-A-01', type: 'text', label: 'Full legal name as it appears on your passport', required: true },
  { key: 'M3-A-02', type: 'single', label: 'Have you ever used any other names?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
  { key: 'M3-A-03', type: 'text', label: 'Date of birth', required: true },
  { key: 'M3-A-04', type: 'text', label: 'Place of birth (City and Country)', required: true },
  { key: 'M3-A-05', type: 'text', label: 'Country of citizenship', required: true, helperText: 'Pre-filled from your eligibility check.' },
  { key: 'M3-A-06', type: 'single', label: 'Do you hold citizenship in any other country?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
  { key: 'M3-A-07', type: 'text', label: 'National identification number (Canadian SIN or equivalent)', helperText: 'This is the number used for tax and employment purposes in your country.' },
  { key: 'M3-A-08', type: 'text', label: 'U.S. Social Security Number or Taxpayer ID (ITIN)', helperText: 'If you do not have one, leave blank — you will apply after arrival.' },
  { key: 'M3-A-09', type: 'text', label: 'Current home address in Canada', required: true },
  { key: 'M3-A-10', type: 'text', label: 'How long have you lived at this address?' },
  { key: 'M3-A-11', type: 'text', label: 'Primary phone number', required: true },
  { key: 'M3-A-12', type: 'text', label: 'Email address', required: true, helperText: 'Pre-filled from your account.' },
  { key: 'M3-A-13', type: 'text', label: 'Social media platforms (list handles or "None")' },
  { key: 'M3-A-14', type: 'text', label: "Parents' full names" },
  { key: 'M3-A-15', type: 'single', label: 'Have you ever lost a passport or had one stolen?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
];

const CLUSTER_4_QUESTIONS: QuestionField[] = [
  { key: 'M3-A-16', type: 'textarea', label: 'List your last 5 trips to the United States with approximate dates and purposes' },
  { key: 'M3-A-17', type: 'text', label: 'Countries visited in the past 5 years' },
  { key: 'M3-A-18', type: 'single', label: 'Do you have any immediate family members living in the United States?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
  { key: 'M3-A-19', type: 'single', label: 'Have you ever applied for a U.S. green card or immigrant visa?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
  { key: 'M3-A-20', type: 'single', label: "Have you ever held a U.S. driver's license?", options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true },
  { key: 'M3-A-21', type: 'single', label: 'Have you held any U.S. visas in the past?', options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }], required: true, helperText: 'Pre-filled from your eligibility check if you indicated prior visa history.' },
];

const ALL_QUESTIONS = [
  ...CLUSTER_1_QUESTIONS,
  ...CLUSTER_2_QUESTIONS,
  ...CLUSTER_3_QUESTIONS,
  ...CLUSTER_4_QUESTIONS,
];

const CLUSTER_QUESTION_RANGES = [
  { start: 0, end: CLUSTER_1_QUESTIONS.length },
  { start: CLUSTER_1_QUESTIONS.length, end: CLUSTER_1_QUESTIONS.length + CLUSTER_2_QUESTIONS.length },
  { start: CLUSTER_1_QUESTIONS.length + CLUSTER_2_QUESTIONS.length, end: CLUSTER_1_QUESTIONS.length + CLUSTER_2_QUESTIONS.length + CLUSTER_3_QUESTIONS.length },
  { start: CLUSTER_1_QUESTIONS.length + CLUSTER_2_QUESTIONS.length + CLUSTER_3_QUESTIONS.length, end: ALL_QUESTIONS.length },
];

export default function StoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeCluster, setActiveCluster] = useState(1);
  const [answers, setAnswers] = useState<Record<string, StoryAnswer>>({});
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
        const appId = apps[0].id;
        setApplicationId(appId);

        const { data: existingAnswers } = await supabase
          .from('answers')
          .select('question_key, answer_value, source')
          .eq('application_id', appId);

        if (existingAnswers) {
          const answerMap: Record<string, StoryAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = {
                value: String(row.answer_value),
                source: row.source as StoryAnswer['source'],
              };
            }
          });
          setAnswers(answerMap);
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
      ? 'quiz'
      : answers[key]?.source === 'quiz'
        ? 'user_edited'
        : 'user_entry';

    setSaveStatus('saving');
    try {
      const res = await fetch('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_key: key,
          answer_value: value,
          application_id: applicationId,
          source,
        }),
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
        originalQuizValue: prev[key]?.originalQuizValue,
      },
    }));

    if (debounceRef.current[key]) clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => saveAnswer(key, value), 800);
  }, [saveAnswer]);

  const answeredCount = Object.keys(answers).filter((k) => answers[k].value !== '').length;
  const totalCount = ALL_QUESTIONS.length;

  const clusterStatuses = CLUSTER_QUESTION_RANGES.map((range, idx) => {
    const questions = ALL_QUESTIONS.slice(range.start, range.end);
    const answered = questions.filter((q) => answers[q.key]?.value !== '').length;
    const status: 'complete' | 'active' | 'empty' = answered === questions.length ? 'complete' : answered > 0 ? 'active' : 'empty';
    return { number: idx + 1, label: CLUSTERS[idx].label, status };
  });

  const handleBack = () => {
    if (activeCluster > 1) setActiveCluster(activeCluster - 1);
    else router.push('/apply');
  };

  const handleNext = () => {
    if (activeCluster < CLUSTERS.length) setActiveCluster(activeCluster + 1);
    else router.push('/apply/business');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <p className="text-sm" style={{ color: 'rgba(245,240,232,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
          Loading...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop only */}
      <aside
        className="hidden w-[196px] shrink-0 border-r lg:block"
        style={{ borderColor: 'rgba(201,168,76,0.12)' }}
      >
        <SectionSideNav
          sectionName="Your Story"
          answeredCount={answeredCount}
          totalCount={totalCount}
          clusters={clusterStatuses}
          documents={DOCUMENTS}
          activeCluster={activeCluster}
          onClusterClick={setActiveCluster}
        />
      </aside>

      {/* Mobile cluster strip */}
      <div
        className="fixed top-12 left-0 right-0 z-30 flex overflow-x-auto border-b lg:hidden"
        style={{ borderColor: 'rgba(201,168,76,0.12)', backgroundColor: '#0a0a0a' }}
      >
        {CLUSTERS.map((cluster) => {
          const status = clusterStatuses.find((c) => c.number === cluster.number)?.status || 'empty';
          return (
            <button
              key={cluster.number}
              onClick={() => setActiveCluster(cluster.number)}
              className="shrink-0 border-b px-4 py-2 text-[10px] uppercase tracking-[0.08em] transition-colors"
              style={{
                borderColor: activeCluster === cluster.number ? '#C9A84C' : 'transparent',
                color: activeCluster === cluster.number ? '#C9A84C' : 'rgba(245,240,232,0.28)',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {status === 'complete' ? '✓' : `${cluster.number}.`} {cluster.label}
            </button>
          );
        })}
      </div>

      {/* Question panel */}
      <div className="min-w-0 flex-1 pt-12 lg:pt-0">
        <QuestionPanel
          sectionTitle="Your Story"
          clusterLabel={CLUSTERS[activeCluster - 1].label}
          saveStatus={saveStatus}
          answeredCount={answeredCount}
          totalCount={totalCount}
          onBack={handleBack}
          onNext={handleNext}
        >
          {/* Cluster 1 — Who you are */}
          {activeCluster === 1 && (
            <div className="space-y-8">
              <ClusterDivider label="Who you are" />
              {CLUSTER_1_QUESTIONS.map((q) => {
                const answer = answers[q.key];
                const isOriginal = answer?.source === 'quiz';
                return (
                  <div key={q.key}>
                    {isOriginal && <PreFillBadge isOriginal={true} />}
                    {answer?.source === 'user_edited' && <PreFillBadge isOriginal={false} />}
                    <QuestionLabel required={q.required}>{q.label}</QuestionLabel>
                    <TextArea
                      value={answer?.value || ''}
                      onChange={(val) => handleAnswerChange(q.key, val)}
                      rows={4}
                    />
                    {q.helperText && <HelperText>{q.helperText}</HelperText>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cluster 2 — Your plan */}
          {activeCluster === 2 && (
            <div className="space-y-8">
              <ClusterDivider label="Your plan" />
              {CLUSTER_2_QUESTIONS.map((q) => {
                const answer = answers[q.key];
                if (q.type === 'single' && q.key === 'M3-S1-05-option') {
                  return (
                    <div key={q.key} className="mt-4">
                      <OptionButton
                        label="Nothing unusual to address"
                        selected={answer?.value === 'na'}
                        onClick={() => handleAnswerChange(q.key, 'na')}
                      />
                    </div>
                  );
                }
                const isOriginal = answer?.source === 'quiz';
                return (
                  <div key={q.key}>
                    {isOriginal && <PreFillBadge isOriginal={true} />}
                    {answer?.source === 'user_edited' && <PreFillBadge isOriginal={false} />}
                    <QuestionLabel required={q.required}>{q.label}</QuestionLabel>
                    <TextArea
                      value={answer?.value || ''}
                      onChange={(val) => handleAnswerChange(q.key, val)}
                      rows={4}
                    />
                    {q.helperText && <HelperText>{q.helperText}</HelperText>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Cluster 3 — Administrative */}
          {activeCluster === 3 && (
            <div className="space-y-6">
              <ClusterDivider label="Administrative details — used for your DS-160 reference sheet" />
              {CLUSTER_3_QUESTIONS.map((q) => {
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

              {/* SSN routing question */}
              <div className="mt-6">
                <QuestionLabel>Do you currently have a U.S. Social Security Number?</QuestionLabel>
                <div className="flex flex-col gap-2">
                  <OptionButton
                    label="Yes — enter it above"
                    selected={!!answers['M3-A-08']?.value}
                    onClick={() => {}}
                  />
                  <OptionButton
                    label="No — I'll apply after arrival"
                    selected={!answers['M3-A-08']?.value}
                    onClick={() => handleAnswerChange('M3-A-08', '')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cluster 4 — Travel & history */}
          {activeCluster === 4 && (
            <div className="space-y-6">
              <ClusterDivider label="Travel and history" />
              {CLUSTER_4_QUESTIONS.map((q) => {
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
                        rows={3}
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

              <AdvisoryBlock>
                E-2 interviews at Toronto are scheduled through the CGI Federal
                portal at ais.usvisa-info.com/en-ca/niv. You will need your
                DS-160 confirmation number and MRV fee receipt. Current wait
                times at Toronto are approximately 4 months — factor this into
                your timeline.
              </AdvisoryBlock>
            </div>
          )}
        </QuestionPanel>
      </div>
    </div>
  );
}
