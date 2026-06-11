'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import CaseFileShell from '@/components/apply/CaseFileShell';
import QuestionLabel from '@/components/apply/questions/QuestionLabel';
import HelperText from '@/components/apply/questions/HelperText';
import TextInput from '@/components/apply/questions/TextInput';
import TextArea from '@/components/apply/questions/TextArea';
import OptionButton from '@/components/apply/questions/OptionButton';
import PreFillBadge from '@/components/apply/questions/PreFillBadge';
import AdvisoryBlock from '@/components/apply/questions/AdvisoryBlock';
import ClusterDivider from '@/components/apply/questions/ClusterDivider';

interface FamilyAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

const CLUSTERS = [
  { number: 1, label: 'Spouse information' },
  { number: 2, label: 'Children' },
  { number: 3, label: 'Documents & logistics' },
  { number: 4, label: 'Dependents\' travel' },
];

const DOCUMENTS = [
  { name: 'Marriage Certificate', status: 'waiting' as const },
  { name: 'Birth Certificates', status: 'waiting' as const },
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

const SPOUSE_QUESTIONS: QuestionField[] = [
  { key: 'M3-L-01', type: 'single', label: 'Will your spouse or partner be applying for E-2 dependent status?', required: true, options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No — not applicable' },
    { value: 'undecided', label: 'Not yet decided' },
  ]},
  { key: 'M3-L-02', type: 'text', label: 'Spouse full legal name', required: true, showIf: { key: 'M3-L-01', value: 'yes' } },
  { key: 'M3-L-03', type: 'text', label: 'Spouse date of birth (YYYY-MM-DD)', showIf: { key: 'M3-L-01', value: 'yes' } },
  { key: 'M3-L-04', type: 'text', label: 'Spouse nationality', showIf: { key: 'M3-L-01', value: 'yes' } },
  { key: 'M3-L-05', type: 'text', label: 'Spouse passport number', showIf: { key: 'M3-L-01', value: 'yes' } },
  { key: 'M3-L-06', type: 'single', label: 'Will your spouse apply for U.S. work authorization (EAD)?', showIf: { key: 'M3-L-01', value: 'yes' }, options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
    { value: 'undecided', label: 'Undecided' },
  ]},
];

const CHILDREN_QUESTIONS: QuestionField[] = [
  { key: 'M3-L-07', type: 'single', label: 'Will any children be applying as E-2 dependents?', required: true, options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ]},
  { key: 'M3-L-08', type: 'textarea', label: 'Dependent details — names, dates of birth, and nationalities', showIf: { key: 'M3-L-07', value: 'yes' } },
];

const DOCUMENTS_QUESTIONS: QuestionField[] = [
  { key: 'M3-L-09', type: 'multi', label: 'What relationship documents do you have available?', options: [
    { value: 'marriage', label: 'Marriage certificate' },
    { value: 'civil-union', label: 'Civil union certificate' },
    { value: 'birth-children', label: 'Birth certificates for children' },
    { value: 'adoption', label: 'Adoption certificates' },
    { value: 'passport-copies', label: 'Passport copies for all dependents' },
  ]},
  { key: 'M3-L-10', type: 'single', label: 'Have all dependent documents been officially translated to English?', options: [
    { value: 'yes', label: 'Yes — certified translations complete' },
    { value: 'in-progress', label: 'In progress' },
    { value: 'no', label: 'Not yet started' },
    { value: 'na', label: 'Not applicable — documents are in English' },
  ]},
];

const TRAVEL_QUESTIONS: QuestionField[] = [
  { key: 'M3-L-11', type: 'single', label: 'Will your dependents travel with you to the U.S.?', options: [
    { value: 'yes', label: 'Yes — all dependents will travel together' },
    { value: 'some', label: 'Some will travel, some will not' },
    { value: 'no', label: 'No — dependents will join later' },
  ]},
  { key: 'M3-L-12', type: 'textarea', label: 'If dependents are not traveling together, explain the timeline and arrangements.' },
];

const ALL_QUESTION_SETS = [
  { questions: SPOUSE_QUESTIONS, cluster: 1 },
  { questions: CHILDREN_QUESTIONS, cluster: 2 },
  { questions: DOCUMENTS_QUESTIONS, cluster: 3 },
  { questions: TRAVEL_QUESTIONS, cluster: 4 },
];

export default function FamilyPage() {
  const [loading, setLoading] = useState(true);
  const [activeClusterId, setActiveClusterId] = useState('cluster-1');
  const [answers, setAnswers] = useState<Record<string, FamilyAnswer>>({});
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
          const answerMap: Record<string, FamilyAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = { value: String(row.answer_value), source: row.source as FamilyAnswer['source'] };
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
    const id = `cluster-${cluster.number}`;
    if (!set) return { id, label: cluster.label, status: 'pending' as const };
    const answered = set.questions.filter((q) => {
      if ('showIf' in q && q.showIf) {
        const depAnswer = answers[q.showIf.key]?.value;
        return depAnswer !== q.showIf.value || answers[q.key]?.value !== '';
      }
      return answers[q.key]?.value !== '';
    }).length;
    const visible = set.questions.filter((q) => !('showIf' in q) || !q.showIf || answers[q.showIf.key]?.value === q.showIf.value).length;
    const status: 'complete' | 'active' | 'pending' = answered === visible && visible > 0 ? 'complete' : answered > 0 ? 'active' : 'pending';
    return { id, label: cluster.label, status };
  });

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

  const activeClusterNumber = parseInt(activeClusterId.replace('cluster-', ''), 10);

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
      sectionNumber={5}
      sectionTitle="Your Family"
      clusters={clusterStatuses}
      activeClusterId={activeClusterId}
      onClusterChange={setActiveClusterId}
      buildsDocuments={['Dependent Documents', 'DS-160 Family']}
      nextSectionPath="/apply/ties"
      prevSectionPath="/apply/qualifications"
      isSaving={saveStatus === 'saving'}
      previewContent={previewContent}
    >
      {activeClusterNumber === 1 && (
        <div>
          <ClusterDivider label="Spouse information" />
          {renderQuestions(SPOUSE_QUESTIONS)}

          {answers['M3-L-01']?.value === 'undecided' && (
            <AdvisoryBlock>If you are unsure whether your spouse will apply, you can still complete this section now and update later. Spouse EAD applications can be filed separately or concurrently with your E-2.</AdvisoryBlock>
          )}

          {answers['M3-L-06']?.value === 'yes' && (
            <AdvisoryBlock>EAD applications for E-2 dependents can take 3–5 months to process. Your spouse should file Form I-765 concurrently with or after the I-539. Work authorization is not automatic — your spouse must receive the EAD card before starting work.</AdvisoryBlock>
          )}
        </div>
      )}

      {activeClusterNumber === 2 && (
        <div>
          <ClusterDivider label="Children" />
          {renderQuestions(CHILDREN_QUESTIONS)}
        </div>
      )}

      {activeClusterNumber === 3 && (
        <div>
          <ClusterDivider label="Documents & logistics" />
          {renderQuestions(DOCUMENTS_QUESTIONS)}

          {answers['M3-L-10']?.value === 'no' && (
            <AdvisoryBlock>All foreign-language documents must be accompanied by certified English translations. Translation must include a certificate from the translator attesting to accuracy and completeness. Start translations early — some certified translation services take 1–2 weeks.</AdvisoryBlock>
          )}
        </div>
      )}

      {activeClusterNumber === 4 && (
        <div>
          <ClusterDivider label="Dependents' travel" />
          {renderQuestions(TRAVEL_QUESTIONS)}
        </div>
      )}
    </CaseFileShell>
  );
}
