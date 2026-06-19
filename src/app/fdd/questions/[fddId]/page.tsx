'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import type { FddAnalysis } from '@/types/fdd';
import type { GeneratedQuestion, ProfileMatch, QuestionsResult, QuestionAudience } from '@/lib/fdd-questions-engine';

// ============================================================================
// Helpers
// ============================================================================

const AUDIENCE_CONFIG: Record<QuestionAudience, { label: string; color: string }> = {
  franchisor_dev_rep: { label: 'Ask the franchisor', color: 'text-[#C9A84C]' },
  validation_franchisee: { label: 'Ask a current franchisee', color: 'text-emerald-400' },
  former_franchisee: { label: 'Ask a former franchisee', color: 'text-amber-400' },
  attorney: { label: 'Ask your attorney', color: 'text-blue-400' },
};

const IMPORTANCE_ORDER = { critical: 0, important: 1, recommended: 2 };

// ============================================================================
// Question card
// ============================================================================

function QuestionCard({ question, index }: { question: GeneratedQuestion; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const aud = AUDIENCE_CONFIG[question.ask_of];
  const isCritical = question.importance === 'critical';

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${
      isCritical ? 'border-red-500/25' : 'border-white/10'
    }`}>
      <button
        className="w-full text-left px-5 py-4 hover:bg-white/3 transition-colors"
        onClick={() => setExpanded(x => !x)}
      >
        <div className="flex items-start gap-3">
          <span className="text-white/20 text-xs mt-0.5 shrink-0 w-5 text-right">{index + 1}.</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className={`text-xs font-medium ${aud.color}`}>{aud.label}</span>
              {isCritical && (
                <span className="text-red-400 text-xs bg-red-400/10 px-2 py-0.5 rounded">Critical</span>
              )}
              <span className="text-white/25 text-xs">{question.category}</span>
            </div>
            <p className="text-white/80 text-sm leading-relaxed">{question.text}</p>
          </div>
          <span className={`text-white/30 shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-5 py-4 bg-white/2">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">What to listen for</p>
          <p className="text-white/60 text-xs leading-relaxed">{question.what_to_listen_for}</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Profile match panel
// ============================================================================

function ProfileMatchPanel({ match }: { match: ProfileMatch }) {
  const scoreColor = match.overall_score >= 80 ? 'text-emerald-400' :
    match.overall_score >= 60 ? 'text-[#C9A84C]' : 'text-red-400';

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white/60 text-xs uppercase tracking-widest">Profile Match</h2>
        <span className={`text-xl font-light ${scoreColor}`}>
          {match.overall_score}<span className="text-sm">/100</span>
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="text-white/70 text-sm mb-4">{match.recommendation}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Investment', ok: match.investment_match },
            { label: 'Net worth', ok: match.net_worth_match },
            { label: 'Industry', ok: match.industry_fit === 'strong', neutral: match.industry_fit === 'neutral' },
          ].map(({ label, ok, neutral }) => (
            <div key={label} className={`rounded-lg p-3 text-center border ${
              ok ? 'border-emerald-500/20 bg-emerald-500/5' :
              neutral ? 'border-white/10 bg-white/3' :
              'border-red-500/20 bg-red-500/5'
            }`}>
              <div className={`text-xs mb-1 ${ok ? 'text-emerald-400' : neutral ? 'text-white/40' : 'text-red-400'}`}>
                {ok ? '✓' : neutral ? '—' : '✗'}
              </div>
              <div className="text-white/50 text-xs">{label}</div>
            </div>
          ))}
        </div>

        {match.gaps.length > 0 && (
          <div className="space-y-3">
            {match.gaps.map((gap, i) => (
              <div key={i} className="border border-amber-500/15 bg-amber-500/5 rounded-lg px-4 py-3">
                <p className="text-amber-400 text-xs font-medium mb-1">{gap.dimension}</p>
                <p className="text-white/50 text-xs mb-1">{gap.explanation}</p>
                <p className="text-white/40 text-xs italic">{gap.action}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main page
// ============================================================================

export default function FddQuestionsPage() {
  const params = useParams<{ fddId: string }>();
  const router = useRouter();
  const fddId = params.fddId;

  const [analysis, setAnalysis] = useState<FddAnalysis | null>(null);
  const [result, setResult] = useState<QuestionsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [activeAudience, setActiveAudience] = useState<QuestionAudience | 'all'>('all');
  const [copyFeedback, setCopyFeedback] = useState('');

  useEffect(() => {
    if (!fddId) return;
    loadAnalysis();
  }, [fddId]);

  async function loadAnalysis() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { data, error: err } = await supabase
      .from('fdd_analyses')
      .select('*')
      .eq('id', fddId)
      .single();

    if (err || !data) {
      setError('Analysis not found.');
    } else {
      setAnalysis(data as FddAnalysis);
      if (data.questions) {
        const q = data.questions as { questions: GeneratedQuestion[]; priority_questions: GeneratedQuestion[] };
        setResult({
          questions: q.questions ?? [],
          priority_questions: q.priority_questions ?? [],
          total_count: q.questions?.length ?? 0,
          profile_match: (data.profile_match as { score?: number; gaps?: ProfileMatch['gaps']; recommendation?: string; dimensions?: Record<string, unknown> } | null) ? {
            overall_score: (data.profile_match as { score: number }).score,
            investment_match: ((data.profile_match as { dimensions: { investment_match: boolean } }).dimensions?.investment_match) ?? true,
            net_worth_match: ((data.profile_match as { dimensions: { net_worth_match: boolean } }).dimensions?.net_worth_match) ?? true,
            industry_fit: ((data.profile_match as { dimensions: { industry_fit: ProfileMatch['industry_fit'] } }).dimensions?.industry_fit) ?? 'neutral',
            gaps: (data.profile_match as { gaps: ProfileMatch['gaps'] }).gaps ?? [],
            recommendation: (data.profile_match as { recommendation: string }).recommendation ?? '',
          } : null,
        });
      } else {
        runQuestionGeneration();
      }
    }
    setLoading(false);
  }

  async function runQuestionGeneration() {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/fdd/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fdd_id: fddId }),
      });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        throw new Error(json.error || 'Question generation failed');
      }
      const json = await res.json() as QuestionsResult;
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Question generation failed');
    } finally {
      setRunning(false);
    }
  }

  function handleCopyAll() {
    if (!result) return;
    const filtered = activeAudience === 'all'
      ? result.questions
      : result.questions.filter(q => q.ask_of === activeAudience);

    const sorted = [...filtered].sort(
      (a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]
    );

    const text = sorted.map((q, i) => (
      `${i + 1}. [${AUDIENCE_CONFIG[q.ask_of].label.toUpperCase()}]\n${q.text}\n\nWhat to listen for: ${q.what_to_listen_for}`
    )).join('\n\n---\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback('Copied!');
      setTimeout(() => setCopyFeedback(''), 2000);
    }).catch(() => setCopyFeedback('Copy failed'));
  }

  if (loading || running) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-xs">
          <div className="w-10 h-10 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            {running ? 'Generating your due diligence questions...' : 'Loading...'}
          </p>
          {running && (
            <p className="text-white/25 text-xs mt-2 leading-relaxed">
              Mapping FDD flags → targeted questions + LLM bespoke analysis — 15–25 seconds
            </p>
          )}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <button onClick={runQuestionGeneration} className="text-[#C9A84C] text-sm underline underline-offset-4">Try again</button>
        </div>
      </main>
    );
  }

  if (!analysis || !result) return null;

  const franchisorName = (analysis.extracted_fields as { franchisor_legal_name?: { value: string } } | null)
    ?.franchisor_legal_name?.value ?? analysis.original_filename;

  const sortedQuestions = [...result.questions].sort(
    (a, b) => IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance]
  );

  const filteredQuestions = activeAudience === 'all'
    ? sortedQuestions
    : sortedQuestions.filter(q => q.ask_of === activeAudience);

  const audienceCounts = (['franchisor_dev_rep', 'validation_franchisee', 'former_franchisee', 'attorney'] as QuestionAudience[]).reduce(
    (acc, aud) => ({ ...acc, [aud]: result.questions.filter(q => q.ask_of === aud).length }),
    {} as Record<QuestionAudience, number>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-8">

        {/* Header */}
        <div>
          <p className="text-[#C9A84C] text-xs tracking-widest uppercase mb-3">Due Diligence Questions</p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light text-white mb-2">
            {franchisorName}
          </h1>
          <p className="text-white/40 text-sm">
            {result.total_count} questions · {result.priority_questions.length} critical
          </p>
        </div>

        {/* Priority questions callout */}
        {result.priority_questions.length > 0 && (
          <div className="border border-red-500/25 bg-red-500/5 rounded-xl p-5">
            <h2 className="text-red-400 text-xs uppercase tracking-widest mb-3">
              {result.priority_questions.length} Critical Question{result.priority_questions.length !== 1 ? 's' : ''} — Ask Before Proceeding
            </h2>
            <ul className="space-y-2">
              {result.priority_questions.slice(0, 3).map((q, i) => (
                <li key={q.id} className="flex gap-2 text-xs text-white/60">
                  <span className="text-red-400 shrink-0">{i + 1}.</span>
                  <span>{q.text.slice(0, 120)}{q.text.length > 120 ? '...' : ''}</span>
                </li>
              ))}
              {result.priority_questions.length > 3 && (
                <li className="text-red-400/60 text-xs">+ {result.priority_questions.length - 3} more critical questions below</li>
              )}
            </ul>
          </div>
        )}

        {/* Profile match */}
        {result.profile_match && (
          <ProfileMatchPanel match={result.profile_match} />
        )}

        {/* Filter tabs + copy */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveAudience('all')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                activeAudience === 'all'
                  ? 'bg-white/10 text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              All ({result.total_count})
            </button>
            {(Object.entries(audienceCounts) as [QuestionAudience, number][]).map(([aud, count]) => (
              count > 0 && (
                <button
                  key={aud}
                  onClick={() => setActiveAudience(aud)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    activeAudience === aud
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {AUDIENCE_CONFIG[aud].label.replace('Ask ', '').replace('the ', '').replace('a ', '').replace('an ', '')} ({count})
                </button>
              )
            ))}
          </div>
          <button
            onClick={handleCopyAll}
            className="text-[#C9A84C]/70 text-xs hover:text-[#C9A84C] transition-colors"
          >
            {copyFeedback || 'Copy all as text'}
          </button>
        </div>

        {/* Question list */}
        <div className="space-y-3">
          {filteredQuestions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} />
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => router.push(`/fdd/score/${fddId}`)}
            className="flex-1 border border-white/10 text-white/60 py-3 rounded-xl text-sm hover:border-white/20 transition-all"
          >
            ← Back to Score
          </button>
          <button
            onClick={() => router.push(`/fdd/report/${fddId}`)}
            className="flex-1 bg-[#C9A84C] text-[#0a0a0a] font-semibold py-3 rounded-xl text-sm hover:bg-[#d4b55a] transition-colors"
          >
            View Full Report →
          </button>
        </div>

        <p className="text-xs text-white/20 text-center leading-relaxed pb-4">
          Questions generated from FDD data analysis and standard franchise due diligence frameworks.
          These are not a substitute for advice from a licensed franchise attorney.
        </p>
      </div>
    </main>
  );
}
