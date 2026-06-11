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

interface TiesAnswer {
  value: string;
  source: 'quiz' | 'user_entry' | 'user_edited' | null;
}

const CLUSTERS = [
  { number: 1, label: 'Property & assets' },
  { number: 2, label: 'Family & community' },
  { number: 3, label: 'Financial obligations' },
  { number: 4, label: 'Return intent' },
  { number: 5, label: 'Cover letter narrative' },
];

const DOCUMENTS = [
  { name: 'Non-immigrant Intent' },
  { name: 'Cover Letter Closing' },
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

const PROPERTY_QUESTIONS: QuestionField[] = [
  { key: 'M3-T-01', type: 'multi', label: 'What property or assets do you own in your home country?', required: true, options: [
    { value: 'home', label: 'Primary residence' },
    { value: 'rental', label: 'Rental/investment property' },
    { value: 'vehicle', label: 'Vehicle(s)' },
    { value: 'investments', label: 'Investment accounts' },
    { value: 'business', label: 'Business in home country' },
    { value: 'none', label: 'No significant property' },
  ]},
  { key: 'M3-T-02', type: 'textarea', label: 'List your major assets in your home country. Include approximate values.', helperText: 'Property deeds, vehicle registrations, investment statements.' },
  { key: 'M3-T-03', type: 'single', label: 'Do you own your primary residence?', options: [
    { value: 'yes', label: 'Yes — owned outright or with mortgage' },
    { value: 'no', label: 'No — renting' },
    { value: 'shared', label: 'Shared ownership with spouse/family' },
  ]},
];

const FAMILY_QUESTIONS: QuestionField[] = [
  { key: 'M3-T-04', type: 'multi', label: 'What family ties remain in your home country?', required: true, options: [
    { value: 'parents', label: 'Parents' },
    { value: 'siblings', label: 'Siblings' },
    { value: 'children', label: 'Children (not applying)' },
    { value: 'extended', label: 'Extended family' },
    { value: 'none', label: 'No significant family ties' },
  ]},
  { key: 'M3-T-05', type: 'textarea', label: 'Describe your family situation and who remains in your home country.' },
  { key: 'M3-T-06', type: 'single', label: 'Are you involved in community organizations or activities in your home country?', options: [
    { value: 'yes', label: 'Yes — active involvement' },
    { value: 'no', label: 'No' },
  ]},
];

const FINANCIAL_QUESTIONS: QuestionField[] = [
  { key: 'M3-T-07', type: 'multi', label: 'What financial obligations do you have in your home country?', options: [
    { value: 'mortgage', label: 'Mortgage payments' },
    { value: 'lease', label: 'Lease agreements' },
    { value: 'loans', label: 'Outstanding loans' },
    { value: 'tuition', label: 'Tuition fees' },
    { value: 'support', label: 'Financial support for family members' },
    { value: 'none', label: 'No ongoing obligations' },
  ]},
  { key: 'M3-T-08', type: 'textarea', label: 'Describe your ongoing financial ties to your home country.' },
];

const RETURN_QUESTIONS: QuestionField[] = [
  { key: 'M3-T-09', type: 'single', label: 'How long do you intend to stay in the U.S. on E-2 status?', required: true, options: [
    { value: '3-5', label: '3–5 years' },
    { value: '5-10', label: '5–10 years' },
    { value: 'indefinite', label: 'Indefinitely (with renewals)' },
  ]},
  { key: 'M3-T-10', type: 'single', label: 'What are your plans when your E-2 status ends?', options: [
    { value: 'renew', label: 'Renew E-2 status' },
    { value: 'return', label: 'Return to home country' },
    { value: 'adjust', label: 'Adjust to another visa status' },
    { value: 'unsure', label: 'Not sure yet' },
  ]},
  { key: 'M3-T-11', type: 'textarea', label: 'Describe your long-term plans. What is your exit strategy from the U.S.?', helperText: 'E-2 is a nonimmigrant visa — officers want to see that you understand this is temporary and have a plan to return.' },
];

const COVER_LETTER_QUESTIONS: QuestionField[] = [
  { key: 'M3-T-12', type: 'textarea', label: 'Draft your opening paragraph — introduce yourself and your business.', helperText: 'Who you are, your nationality, what business you are starting, where, and how much you invested.' },
  { key: 'M3-T-13', type: 'textarea', label: 'Explain why you chose this specific business and this location.', helperText: 'Market research, personal connection, industry knowledge.' },
  { key: 'M3-T-14', type: 'textarea', label: 'Describe how the business will be marginal or non-marginal.', helperText: 'Job creation, economic contribution, market demand.' },
  { key: 'M3-T-15', type: 'textarea', label: 'Explain your ties to your home country and your intent to return.', helperText: 'Property, family, financial obligations, long-term plans.' },
  { key: 'M3-T-16', type: 'textarea', label: 'Anything else the officer should know — address potential concerns proactively.' },
];

const ALL_QUESTION_SETS = [
  { questions: PROPERTY_QUESTIONS, cluster: 1 },
  { questions: FAMILY_QUESTIONS, cluster: 2 },
  { questions: FINANCIAL_QUESTIONS, cluster: 3 },
  { questions: RETURN_QUESTIONS, cluster: 4 },
  { questions: COVER_LETTER_QUESTIONS, cluster: 5 },
];

export default function TiesPage() {
  useTrackSectionVisit("ties");

  const [loading, setLoading] = useState(true);
  const [activeClusterId, setActiveClusterId] = useState('cluster-1');
  const [answers, setAnswers] = useState<Record<string, TiesAnswer>>({});
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
          const answerMap: Record<string, TiesAnswer> = {};
          existingAnswers.forEach((row: { question_key: string; answer_value: string | string[] | number | null; source: string | null }) => {
            if (row.answer_value !== null) {
              answerMap[row.question_key] = { value: String(row.answer_value), source: row.source as TiesAnswer['source'] };
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
    const answered = set.questions.filter((q) => {
      if ('showIf' in q && q.showIf) {
        const depAnswer = answers[q.showIf.key]?.value;
        return depAnswer !== q.showIf.value || answers[q.key]?.value !== '';
      }
      return answers[q.key]?.value !== '';
    }).length;
    const visible = set.questions.filter((q) => !('showIf' in q) || !q.showIf || answers[q.showIf.key]?.value === q.showIf.value).length;
    const status: 'complete' | 'active' | 'pending' = answered === visible && visible > 0 ? 'complete' : answered > 0 ? 'active' : 'pending';
    return { id: `cluster-${cluster.number}`, label: cluster.label, status };
  });

  const activeNumber = parseInt(activeClusterId.replace('cluster-', ''), 10);

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
    <CaseFileShell
      sectionNumber={6}
      sectionTitle="Your Ties"
      clusters={clusterStatuses}
      activeClusterId={activeClusterId}
      onClusterChange={setActiveClusterId}
      buildsDocuments={['Non-immigrant Intent', 'Cover Letter Closing']}
      nextSectionPath="/apply"
      prevSectionPath="/apply/family"
      isSaving={saveStatus === 'saving'}
      previewContent={
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
      }
    >
      {activeNumber === 1 && (
        <div>
          <ClusterDivider label="Property & assets" />
          {renderQuestions(PROPERTY_QUESTIONS)}

          {answers['M3-T-01']?.value?.includes('none') && (
            <RiskFlag>Lack of property ties is one of the strongest indicators of immigrant intent. If you do not own property in your home country, you need strong ties from other categories — family, financial obligations, community involvement — to counterbalance this.</RiskFlag>
          )}
        </div>
      )}

      {activeNumber === 2 && (
        <div>
          <ClusterDivider label="Family & community" />
          {renderQuestions(FAMILY_QUESTIONS)}

          {answers['M3-T-04']?.value?.includes('none') && (
            <RiskFlag>No family ties in your home country significantly weakens your nonimmigrant intent argument. Officers may question why you would return.</RiskFlag>
          )}
        </div>
      )}

      {activeNumber === 3 && (
        <div>
          <ClusterDivider label="Financial obligations" />
          {renderQuestions(FINANCIAL_QUESTIONS)}
        </div>
      )}

      {activeNumber === 4 && (
        <div>
          <ClusterDivider label="Return intent" />
          {renderQuestions(RETURN_QUESTIONS)}

          {answers['M3-T-09']?.value === 'indefinite' && (
            <AdvisoryBlock>Saying you intend to stay indefinitely can raise concerns about immigrant intent. E-2 is a nonimmigrant visa — you need to demonstrate intent to return. Consider framing as &ldquo;I plan to build the business to maturity and then decide based on circumstances at that time.&rdquo;</AdvisoryBlock>
          )}
        </div>
      )}

      {activeNumber === 5 && (
        <div>
          <ClusterDivider label="Cover letter narrative" />
          {renderQuestions(COVER_LETTER_QUESTIONS)}

          <AdvisoryBlock>Your cover letter will be drafted from these answers in Step 15. The narrative should flow naturally and address officer concerns proactively. Do not repeat information already in your documents — use the cover letter to connect the dots.</AdvisoryBlock>
        </div>
      )}
    </CaseFileShell>
  );
}
