/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { resolvePrimaryApplication } from '@/lib/resolve-application';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  buildSimulatorContext,
  generateQuestions,
  generateCoachingSummary,
  analyzeDelivery,
  createSimulatorSession,
  saveSimulatorAnswer,
  completeSimulatorSession,
  checkSessionAvailability,
  saveCoachingNotes,
} from '@/lib/simulator-engine';
import { speakQuestion } from '@/lib/groq-tts';
import CaseFileSummary from '@/components/simulator/CaseFileSummary';
import GenerationProgress from '@/components/ui/GenerationProgress';
import ConversationalSession, { type RawVoiceAnswer } from '@/components/simulator/ConversationalSession';
import type { SimulatorContext, Question, AnswerEvaluation, CoachingSummary, CompletedSession, QuestionCoaching, DeliveryNote, QuestionBreakdownItem } from '@/types/simulator';

const supabase = createBrowserSupabaseClient();

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function InterviewSimulator() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [sessionInfo, setSessionInfo] = useState<{
    available: boolean;
    sessionsUsed: number;
    sessionsPurchased: number;
    sessionsRemaining: number;
  } | null>(null);

  const [screen, setScreen] = useState<'start' | 'active' | 'evaluating' | 'complete'>('start');
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [submittedAnswers, setSubmittedAnswers] = useState<any[]>([]);
  const [context, setContext] = useState<SimulatorContext | null>(null);
  const [coachingSummary, setCoachingSummary] = useState<CoachingSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(15 * 60);
  const [timerWarning, setTimerWarning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasCaseFile, setHasCaseFile] = useState<boolean | null>(null);
  const [needsAnalysisOnly, setNeedsAnalysisOnly] = useState(false);
  const [caseFileReviewed, setCaseFileReviewed] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [followUpQuestion, setFollowUpQuestion] = useState<string | null>(null);
  const [isInFollowUp, setIsInFollowUp] = useState(false);
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [coachingLoading, setCoachingLoading] = useState(false);
  const [coachingError, setCoachingError] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  // Captures ?session_id from Stripe redirect before URL is cleaned — processed once application loads
  const [pendingGrantSessionId, setPendingGrantSessionId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    return p.get('purchase') === 'success' ? (p.get('session_id') ?? null) : null;
  });

  // Check auth and load session availability
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      // Capture BEFORE the first await — the URL cleanup effect fires after the
      // first async yield and strips ?purchase=success, so reading window.location
      // after any await always returns false even on a genuine Stripe redirect.
      const hasPendingGrant = typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('purchase') === 'success';

      console.log('[SIM] checkAuth started, hasPendingGrant:', hasPendingGrant);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('[SIM] getUser result:', user ? 'authenticated' : 'no user');
        if (!user) {
          // Set fallback state before redirecting so the loading screen doesn't
          // stay permanently while Next.js processes the navigation.
          if (!cancelled) {
            setHasCaseFile(false);
            setSessionInfo({ available: false, sessionsUsed: 0, sessionsPurchased: 2, sessionsRemaining: 0 });
          }
          router.push('/login');
          return;
        }
        if (!cancelled) setUser(user);

        // Resolve the same primary application every other surface uses,
        // so the simulator always interviews against the case the rest of
        // the app is building.
        const app = await resolvePrimaryApplication<Record<string, any>>(supabase, user.id);

        console.log('[SIM] application result:', app ? 'found' : 'not found');

        if (app) {
          if (!cancelled) setApplication(app);
          if (!hasPendingGrant) {
            const availability = await checkSessionAvailability(app.id);
            console.log('[SIM] session availability:', availability);
            if (!cancelled) setSessionInfo(availability);
          }

          // Check if the application has sufficient case file data
          // Module 3: answers + case brief required
          // Standalone simulator: answers sufficient (no case brief needed)
          const isStandalone = app.source === 'simulator_standalone';

          const { data: answers } = await supabase
            .from('answers')
            .select('question_key')
            .eq('application_id', app.id)
            .limit(5);

          if (isStandalone) {
            // Standalone simulator: answers alone are sufficient
            if (!cancelled) setHasCaseFile(Boolean(answers && answers.length > 0));
          } else {
            // Full Module 3 path: answers + case brief required. Case briefs are
            // produced by running AI analysis on /gap-analysis — a single button,
            // not a reason to send the user back through Module 3 from scratch.
            const { data: caseBrief } = await supabase
              .from('case_briefs')
              .select('id')
              .eq('application_id', app.id)
              .limit(1);

            const hasAnswers = Boolean(answers && answers.length > 0);
            const hasBrief = Boolean(caseBrief && caseBrief.length > 0);
            if (!cancelled) {
              setHasCaseFile(hasAnswers && hasBrief);
              setNeedsAnalysisOnly(hasAnswers && !hasBrief);
            }
          }
        } else {
          // No application at all — cannot use simulator
          if (!cancelled) {
            setHasCaseFile(false);
            setSessionInfo({ available: false, sessionsUsed: 0, sessionsPurchased: 2, sessionsRemaining: 0 });
          }
        }
      } catch (err) {
        console.error('[SIM] checkAuth failed:', err);
        if (!cancelled) {
          setError('We had trouble loading your simulator data. Please refresh the page.');
          setHasCaseFile(false);
          setSessionInfo({ available: false, sessionsUsed: 0, sessionsPurchased: 2, sessionsRemaining: 0 });
        }
      }
    }
    checkAuth();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Check whether voice mode is configured on the server
  useEffect(() => {
    let cancelled = false;
    fetch('/api/simulator/voice-status')
      .then(res => res.ok ? res.json() : { available: false })
      .then(data => { if (!cancelled) setVoiceAvailable(Boolean(data.available)); })
      .catch(() => { if (!cancelled) setVoiceAvailable(false); });
    return () => { cancelled = true; };
  }, []);

  // Clean the ?purchase=success URL params on mount — before application loads —
  // so they're never re-read on subsequent renders.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('purchase') === 'success') {
      window.history.replaceState({}, '', '/simulator');
    }
  }, []);

  // Once application loads, process any pending Stripe session grant.
  // pendingGrantSessionId was captured synchronously from the URL before cleanup.
  useEffect(() => {
    if (!application || !pendingGrantSessionId) return;

    const sessionId = pendingGrantSessionId;
    setPendingGrantSessionId(null);

    async function grantWithRetry() {
      // Retry up to 3 times with 1.5s gaps — covers transient Vercel/Supabase blips.
      // By the time all retries are exhausted the Stripe webhook has very likely
      // fired independently and granted the sessions, so the fallback
      // checkSessionAvailability call will see the correct state.
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500));
        try {
          const res = await fetch('/api/stripe/grant-simulator-sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId }),
          });
          if (res.ok) {
            const avail = await checkSessionAvailability(application.id);
            setSessionInfo(avail);
            return;
          }
        } catch {
          // network error — retry
        }
      }
      // All attempts failed — fall back to reading DB state directly.
      // The Stripe webhook may have already granted the sessions server-side.
      const avail = await checkSessionAvailability(application.id);
      setSessionInfo(avail);
    }

    grantWithRetry();
  }, [application, pendingGrantSessionId]);

  // Purchase handler
  const handlePurchase = async () => {
    if (!application || !user) return;
    setPurchaseLoading(true);
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tierId: 'simulator_3pack',
          applicationId: application.id,
          userId: user.id,
          successUrl: `${window.location.origin}/simulator?purchase=success`,
          cancelUrl: `${window.location.origin}/simulator`,
        }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Purchase error:', err);
    } finally {
      setPurchaseLoading(false);
    }
  };

  // Start a new session
  const startSession = async (selectedMode: 'text' | 'voice') => {
    if (!application) return;

    setLoading(true);
    setError(null);
    setMode(selectedMode);

    try {
      const { sessionId, sessionNumber } = await createSimulatorSession(application.id, selectedMode);

      // Build context and generate questions
      const ctx = await buildSimulatorContext(application.id);
      setContext(ctx);

      const q = generateQuestions(ctx);
      setQuestions(q);

      setCurrentSession({ id: sessionId, sessionNumber });
      setCurrentQuestionIndex(0);
      setCurrentAnswer('');
      setCurrentEvaluation(null);
      setSubmittedAnswers([]);
      setScreen('active');

      // Voice mode: ConversationalSession manages its own timer
      if (selectedMode === 'text') {
        setSessionTimeLeft(15 * 60);
        setTimerWarning(false);
        timerRef.current = setInterval(() => {
          setSessionTimeLeft(prev => {
            if (prev <= 120 && !timerWarning) {
              setTimerWarning(true);
            }
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              completeSession();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      if (err.message === 'SESSION_LIMIT_EXCEEDED') {
        setError('You have used all your simulator sessions. Purchase more to continue practicing.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch a targeted follow-up question after a weak/inconsistent answer.
  // Accepts explicit args to avoid stale-closure issues when called from submitAnswer.
  const fetchFollowUp = async (
    question?: { id: string; text: string; category: string },
    answer?: string,
    evaluation?: AnswerEvaluation | null,
  ) => {
    const q = question ?? questions[currentQuestionIndex];
    const a = answer ?? currentAnswer;
    const ev = evaluation ?? currentEvaluation;
    if (!context || !q || !ev) return;
    setFollowUpLoading(true);
    try {
      const res = await fetch('/api/simulator/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q.id,
          questionText: q.text,
          originalAnswer: a,
          evaluation: ev,
          context,
        }),
      });
      const data = await res.json();
      if (data.followUpQuestion) {
        setFollowUpQuestion(data.followUpQuestion);
        setIsInFollowUp(true);
        setCurrentAnswer('');
        setCurrentEvaluation(null);
      }
    } catch (err) {
      console.error('[SIM] Follow-up generation failed:', err);
    } finally {
      setFollowUpLoading(false);
    }
  };

  // Submit an answer
  const submitAnswer = async () => {
    if (!currentSession || !context || !currentAnswer.trim()) return;

    setLoading(true);
    // When in follow-up mode, evaluate against the follow-up question, not the original
    const question = isInFollowUp && followUpQuestion
      ? { id: `FU-${currentQuestionIndex}`, text: followUpQuestion, category: 'universal' as const }
      : questions[currentQuestionIndex];

    try {
      // Pass up to 3 preceding answers so the evaluator can flag cross-question contradictions
      const priorAnswers = submittedAnswers
        .slice(-3)
        .map(a => ({ questionText: a.questionText, answerText: a.answerText }));

      const evalRes = await fetch('/api/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.text,
          answer: currentAnswer,
          context,
          priorAnswers: priorAnswers.length > 0 ? priorAnswers : undefined,
        }),
      });
      if (!evalRes.ok) {
        throw new Error(`Evaluation failed: ${evalRes.status}`);
      }
      const evaluation = await evalRes.json();
      setCurrentEvaluation(evaluation);

      // Save to database
      await saveSimulatorAnswer(
        currentSession.id,
        question.id,
        question.text,
        currentAnswer,
        evaluation.rating,
        evaluation.feedback,
        evaluation.specificSuggestion,
        evaluation.documentReference
      );

      const deliveryNotes = analyzeDelivery(currentAnswer);
      setSubmittedAnswers(prev => [...prev, {
        questionId: question.id,
        questionText: question.text,
        answerText: currentAnswer,
        rating: evaluation.rating,
        score: evaluation.score,
        feedback: evaluation.feedback,
        specificSuggestion: evaluation.specificSuggestion,
        deliveryNotes: deliveryNotes.length > 0 ? deliveryNotes : undefined,
      }]);

      // Auto-generate follow-up on weak/inconsistent ratings (one level deep — not in follow-up already)
      if ((evaluation.rating === 'weak' || evaluation.rating === 'inconsistent') && !isInFollowUp) {
        fetchFollowUp(question, currentAnswer, evaluation);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    setFollowUpQuestion(null);
    setIsInFollowUp(false);
    if (currentQuestionIndex >= questions.length - 1) {
      completeSession();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
      setCurrentEvaluation(null);
    }
  };

  // Complete the session
  const completeSession = async () => {
    if (!currentSession || !context) return;

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setLoading(true);

    try {
      // Build completed session object
      const completedSession: CompletedSession = {
        id: currentSession.id,
        applicationId: application.id,
        userId: user.id,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        sessionNumber: currentSession.sessionNumber,
        mode,
        readinessIndicator: 'nearly_ready',
        questions: submittedAnswers,
      };

      const summary = generateCoachingSummary(completedSession, context);
      setCoachingSummary(summary);

      await completeSimulatorSession(currentSession.id, summary.readinessIndicator);
      setScreen('complete');
      fetchCoachingReport(summary, context);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch deep coaching report after session ends (async, non-blocking)
  async function fetchCoachingReport(summary: CoachingSummary, ctx: SimulatorContext) {
    const toCoach = [
      ...summary.needsWork.map(w => ({
        questionId: w.questionId,
        questionText: w.question,
        originalAnswer: w.originalAnswer,
        rating: 'weak' as const,
        currentFeedback: w.suggestion,
      })),
      ...summary.inconsistencies.map(inc => ({
        questionId: inc.questionId,
        questionText: inc.question,
        originalAnswer: inc.originalAnswer,
        rating: 'inconsistent' as const,
        currentFeedback: inc.filed,
      })),
    ];

    if (toCoach.length === 0) return;

    // Fetch last 5 prior sessions for trend-aware coaching (non-fatal if absent).
    // The prompt's trend note (coaching-report/route.ts) already generalises to
    // any session count >= 2 — this was the only place capping it at 2.
    type PriorSessionData = { sessionNumber: number; readinessIndicator: string; top3NextSession: string[] };
    const priorSessions: PriorSessionData[] = [];
    if (currentSession && user) {
      try {
        const { data: prevRows } = await supabase
          .from('simulator_sessions')
          .select('session_number, readiness_indicator, coaching_notes')
          .eq('user_id', user.id)
          .lt('session_number', currentSession.sessionNumber)
          .order('session_number', { ascending: false })
          .limit(5);
        if (prevRows) {
          for (const prev of prevRows) {
            const notes = prev.coaching_notes as { top3NextSession?: string[] } | null;
            priorSessions.push({
              sessionNumber: prev.session_number,
              readinessIndicator: prev.readiness_indicator || 'needs_work',
              top3NextSession: notes?.top3NextSession || [],
            });
          }
        }
      } catch {
        // Non-fatal — proceed without prior session context
      }
    }

    setCoachingLoading(true);
    setCoachingError(false);
    try {
      const res = await fetch('/api/simulator/coaching-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: ctx, weakAnswers: toCoach, priorSessions }),
      });
      if (res.ok) {
        const { coaching, top3NextSession, error } = await res.json();
        if (Array.isArray(coaching) && coaching.length > 0) {
          // Build a map by questionId for O(1) lookup; also keep array for index fallback
          const byId = new Map(coaching.map((c: any) => [c.questionId, c]));
          // Remap: if model returned a different key for some item, fall back to array index
          const remapped = toCoach.map((q, i) => byId.get(q.questionId) ?? coaching[i] ?? null).filter(Boolean);
          if (remapped.length > 0) {
            // Ensure questionIds match so the UI lookup (find by questionId) works
            const aligned = remapped.map((c: any, i: number) => ({ ...c, questionId: toCoach[i]?.questionId ?? c.questionId }));
            setCoachingSummary(prev => prev ? {
              ...prev,
              detailedCoaching: aligned,
              ...(top3NextSession?.length ? { top3NextSession } : {}),
            } : prev);
            if (top3NextSession?.length && currentSession?.id) {
              saveCoachingNotes(currentSession.id, top3NextSession).catch(() => {});
            }
          }
        } else if (error) {
          // API explicitly flagged a generation failure (as opposed to the
          // legitimate "no weak answers" empty-array response) — surface it
          // so the user sees a retry option instead of a silently blank report.
          setCoachingError(true);
        }
      } else {
        setCoachingError(true);
      }
    } catch {
      setCoachingError(true);
    } finally {
      setCoachingLoading(false);
    }
  }

  // Evaluate all voice answers in parallel post-session, then build summary
  async function evaluateAndComplete(rawAnswers: RawVoiceAnswer[], sessionNumber: number) {
    if (!context || !currentSession || !application || !user) return;
    setScreen('evaluating');

    const evaluated = await Promise.all(
      rawAnswers.map(async (a, idx) => {
        // Pass up to 3 preceding raw answers so the model can flag cross-question contradictions
        const priorAnswers = rawAnswers
          .slice(Math.max(0, idx - 3), idx)
          .map(p => ({ questionText: p.questionText, answerText: p.answerText }));

        try {
          const res = await fetch('/api/simulator/evaluate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questionId: a.questionId,
              questionText: a.questionText,
              answer: a.answerText,
              context,
              priorAnswers,
            }),
          });
          const ev = await res.json();
          return {
            questionId: a.questionId,
            questionText: a.questionText,
            answerText: a.answerText,
            rating: (ev.rating || 'weak') as 'strong' | 'weak' | 'inconsistent',
            score: typeof ev.score === 'number' ? ev.score : undefined,
            feedback: ev.feedback || 'Answer recorded.',
            specificSuggestion: ev.specificSuggestion || '',
            deliveryNotes: analyzeDelivery(a.answerText),
          };
        } catch {
          return {
            questionId: a.questionId,
            questionText: a.questionText,
            answerText: a.answerText,
            rating: 'weak' as const,
            feedback: 'Answer recorded.',
            specificSuggestion: '',
          };
        }
      })
    );

    // Save all evaluated answers to DB
    await Promise.allSettled(
      evaluated.map(a =>
        saveSimulatorAnswer(
          currentSession.id, a.questionId, a.questionText, a.answerText,
          a.rating, a.feedback, a.specificSuggestion, null
        )
      )
    );

    setSubmittedAnswers(evaluated);
    setCurrentSession((prev: any) => prev ? { ...prev, sessionNumber } : prev);

    const completedSession: CompletedSession = {
      id: currentSession.id,
      applicationId: application.id,
      userId: user.id,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      sessionNumber,
      mode: 'voice',
      readinessIndicator: 'nearly_ready',
      questions: evaluated,
    };

    const summary = generateCoachingSummary(completedSession, context);
    setCoachingSummary(summary);
    await completeSimulatorSession(currentSession.id, summary.readinessIndicator).catch(() => {});
    setScreen('complete');
    fetchCoachingReport(summary, context);
  }

  // Break infinite spinner after 12 s
  useEffect(() => {
    if (sessionInfo && hasCaseFile !== null) return;
    const t = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(t);
  }, [sessionInfo, hasCaseFile]);

  // Render based on screen state
  if (!sessionInfo || hasCaseFile === null) {
    if (loadTimedOut) {
      return (
        <div style={styles.page}>
          <div style={styles.loading}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(245,240,232,0.7)', marginBottom: '16px', fontSize: '14px' }}>
                Having trouble loading your simulator data.
              </p>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#C9A84C', color: '#0a0a0a', border: 'none', padding: '10px 24px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
              >
                Refresh page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading...</div>
      </div>
    );
  }

  // Teaser: user has an application but no case file data yet
  if (hasCaseFile === false) {
    return (
      <div style={styles.page}>
        <SimulatorTeaser needsAnalysisOnly={needsAnalysisOnly} />
      </div>
    );
  }

  // Show the case file summary before letting returning users jump straight
  // into mode selection — gives them confidence in what the app extracted.
  if (screen === 'start' && hasCaseFile && !caseFileReviewed && application?.id) {
    return (
      <CaseFileSummary
        applicationId={application.id}
        continueLabel="Continue to practice modes →"
        onContinue={() => setCaseFileReviewed(true)}
        secondaryAction={{ label: 'Upload more documents first', href: '/simulator/quick-start' }}
      />
    );
  }

  return (
    <div style={styles.page}>
      {screen === 'start' && (
        <StartScreen
          sessionsRemaining={sessionInfo.sessionsRemaining}
          sessionsPurchased={sessionInfo.sessionsPurchased}
          available={sessionInfo.available}
          loading={loading}
          onStartText={() => startSession('text')}
          onStartVoice={() => startSession('voice')}
          voiceDisabled={!voiceAvailable}
          error={error}
          onPurchase={handlePurchase}
          purchaseLoading={purchaseLoading}
        />
      )}

      {screen === 'evaluating' && (
        <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' as const }}>
            <div style={{ width: '36px', height: '36px', border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 20px' }} />
            <p style={{ color: 'rgba(245,240,232,0.6)', fontFamily: "'DM Sans', sans-serif", fontSize: '14px', letterSpacing: '0.06em' }}>
              Analysing your session…
            </p>
          </div>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {screen === 'active' && mode === 'voice' && context && currentSession && user && (
        <ConversationalSession
          context={context}
          session={currentSession}
          questions={questions}
          userId={user.id}
          applicationId={application!.id}
          onComplete={(rawAnswers, sessionNumber) => {
            evaluateAndComplete(rawAnswers, sessionNumber);
          }}
          onExit={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            setScreen('start');
          }}
        />
      )}

      {screen === 'active' && mode === 'text' && (
        <ActiveSession
          mode={mode}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          question={
            isInFollowUp && followUpQuestion
              ? {
                  id: `FU-${currentQuestionIndex}`,
                  text: followUpQuestion,
                  category: 'universal' as const,
                  context: `Follow-up to: "${questions[currentQuestionIndex]?.text.substring(0, 70)}${questions[currentQuestionIndex]?.text.length > 70 ? '...' : ''}"`,
                }
              : questions[currentQuestionIndex]
          }
          answer={currentAnswer}
          onAnswerChange={setCurrentAnswer}
          evaluation={currentEvaluation}
          onSubmit={submitAnswer}
          onNext={nextQuestion}
          loading={loading}
          isLastQuestion={currentQuestionIndex >= questions.length - 1}
          sessionTimeLeft={sessionTimeLeft}
          timerWarning={timerWarning}
          isMobile={isMobile}
          isInFollowUp={isInFollowUp}
          followUpLoading={followUpLoading}
          onGetFollowUp={fetchFollowUp}
        />
      )}

      {screen === 'complete' && coachingSummary && (
        <SessionComplete
          summary={coachingSummary}
          sessionNumber={currentSession?.sessionNumber}
          coachingLoading={coachingLoading}
          coachingError={coachingError}
          onRetryCoaching={() => context && fetchCoachingReport(coachingSummary, context)}
          applicationId={application?.id}
          onStartNew={() => {
            setScreen('start');
            window.location.reload();
          }}
          onBackToDashboard={() => router.push('/dashboard')}
        />
      )}
    </div>
  );
}

// =============================================================================
// SCREEN COMPONENTS
// =============================================================================

function StartScreen({
  sessionsRemaining,
  sessionsPurchased,
  available,
  loading,
  onStartText,
  onStartVoice,
  voiceDisabled,
  error,
  onPurchase,
  purchaseLoading,
}: {
  sessionsRemaining: number;
  sessionsPurchased: number;
  available: boolean;
  loading: boolean;
  onStartText: () => void;
  onStartVoice: () => void;
  voiceDisabled: boolean;
  error: string | null;
  onPurchase: () => void;
  purchaseLoading: boolean;
}) {
  return (
    <div style={styles.startContainer}>
      <div style={styles.startCard}>
        <div style={styles.eyebrow}>INTERVIEW SIMULATOR</div>
        <h1 style={styles.startTitle}>Practice Your Interview</h1>
        <p style={styles.startSubtitle}>
          Each session is 15 minutes. Your simulator has been personalised to your specific application and business type.
        </p>

        {available && sessionsRemaining > 0 && (
          <p style={styles.sessionCount}>{sessionsRemaining} session{sessionsRemaining !== 1 ? 's' : ''} remaining</p>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {!available ? (
          <div style={styles.purchaseBanner}>
            <p style={styles.purchaseText}>You&apos;ve used all your simulator sessions. Purchase another pack to keep practising before your interview.</p>
            <button
              style={styles.purchaseButton}
              onClick={onPurchase}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? 'Loading...' : 'Purchase 3 More Sessions →'}
            </button>
            <p style={styles.purchaseNote}>Sessions never expire · Use anytime before your interview</p>
          </div>
        ) : (
          <div style={styles.modeButtons}>
            <button
              style={styles.modeButton}
              onClick={onStartText}
              disabled={loading}
            >
              <span style={styles.modeTitle}>Text</span>
              <span style={styles.modeDesc}>Type your answers</span>
            </button>

            <button
              style={voiceDisabled ? {...styles.modeButton, ...styles.modeButtonDisabled} : styles.modeButton}
              onClick={onStartVoice}
              disabled={loading || voiceDisabled}
            >
              <span style={styles.modeTitle}>Voice</span>
              <span style={styles.modeDesc}>Speak your answers</span>
              {voiceDisabled && <span style={styles.modeTooltip}>Voice mode requires configuration</span>}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 12 }}>
          <Link href="/simulator/interview-day" style={{ ...styles.backLink, color: '#C9A84C' }}>
            Interview Day Guide →
          </Link>
          <Link href="/dashboard" style={styles.backLink}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ActiveSession({
  mode,
  questionNumber,
  totalQuestions,
  question,
  answer,
  onAnswerChange,
  evaluation,
  onSubmit,
  onNext,
  loading,
  isLastQuestion,
  sessionTimeLeft,
  timerWarning,
  isMobile,
  isInFollowUp,
  followUpLoading,
  onGetFollowUp,
}: {
  mode: 'text' | 'voice';
  questionNumber: number;
  totalQuestions: number;
  question: Question;
  answer: string;
  onAnswerChange: (v: string) => void;
  evaluation: AnswerEvaluation | null;
  onSubmit: () => void;
  onNext: () => void;
  loading: boolean;
  isLastQuestion: boolean;
  sessionTimeLeft: number;
  timerWarning: boolean;
  isMobile: boolean;
  isInFollowUp: boolean;
  followUpLoading: boolean;
  onGetFollowUp: () => void;
}) {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const [showHint, setShowHint] = useState(false);

  useEffect(() => { setShowHint(false); }, [question.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Auto-speak question in voice mode
  useEffect(() => {
    if (mode === 'voice' && question?.text) {
      speakQuestion(question.text).catch(() => {});
    }
  }, [question.text, mode]);

  return (
    <div style={{...styles.activeContainer, padding: isMobile ? '16px' : '24px'}}>
      <div style={{
        ...styles.activeGrid,
        gridTemplateColumns: isMobile ? '1fr' : '40% 60%',
        gap: isMobile ? '16px' : '32px',
      }}>
        {/* Left Panel - Question */}
        <div style={{...styles.questionPanel, padding: isMobile ? '20px' : '32px'}}>
          <div style={styles.questionHeader}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={styles.questionCounter}>Question {questionNumber} of {totalQuestions}</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${(questionNumber / totalQuestions) * 100}%`}} />
            </div>
          </div>

          {isInFollowUp && (
            <div style={styles.followUpLabel}>FOLLOW-UP QUESTION</div>
          )}

          <div style={styles.questionText}>{question.text}</div>

          {question.context && (
            <div style={styles.questionContext}>
              {question.context}
            </div>
          )}

          {question.hint && (
            <div style={{ marginTop: '16px' }}>
              <button style={styles.hintToggle} onClick={() => setShowHint(h => !h)}>
                {showHint ? '▾  Hide coach hint' : '▸  Coach hint — what the officer wants to hear'}
              </button>
              {showHint && (
                <div style={styles.hintPanel}>{question.hint}</div>
              )}
            </div>
          )}

          {mode === 'voice' && (
            <button
              style={styles.replayButton}
              onClick={() => speakQuestion(question.text)}
              title="Replay question"
            >
              Replay
            </button>
          )}
        </div>

        {/* Right Panel - Answer */}
        <div style={{...styles.answerPanel, padding: isMobile ? '16px' : '32px'}}>
          {mode === 'text' && (
            <>
              <textarea
                style={styles.textarea}
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                placeholder="Take your time. Answer as you would in the actual interview."
                disabled={!!evaluation}
              />

              <div style={styles.wordCount}>
                {wordCount} words {wordCount < 50 && <span style={styles.wordHint}>(aim for 50-150)</span>}
              </div>

              {!evaluation ? (
                <button
                  style={styles.submitButton}
                  onClick={onSubmit}
                  disabled={loading || wordCount < 10}
                >
                  {loading ? 'Evaluating...' : 'Submit answer →'}
                </button>
              ) : (
                <div style={styles.evaluationCard}>
                  <div style={{
                    ...styles.evaluationBorder,
                    borderLeftColor: evaluation.rating === 'strong' ? '#22c55e' :
                      evaluation.rating === 'weak' ? '#f59e0b' : '#ef4444'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={styles.evaluationHeader}>
                        {evaluation.rating === 'strong' && '✓ Strong answer'}
                        {evaluation.rating === 'weak' && '⚠ Needs more detail'}
                        {evaluation.rating === 'inconsistent' && '✗ Inconsistency detected'}
                      </div>
                      {evaluation.score != null && (
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: evaluation.score >= 7 ? '#22c55e' : evaluation.score >= 5 ? '#f59e0b' : '#ef4444',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          padding: '2px 10px',
                          letterSpacing: '0.02em',
                        }}>
                          {evaluation.score}/10
                        </div>
                      )}
                    </div>
                    <p style={styles.evaluationFeedback}>{evaluation.feedback}</p>

                    {evaluation.specificSuggestion && (
                      <div style={styles.suggestionBox}>
                        <strong>Suggestion:</strong> {evaluation.specificSuggestion}
                      </div>
                    )}

                    {evaluation.documentReference && (
                      <div style={styles.docRef}>
                        Reference: {evaluation.documentReference}
                      </div>
                    )}
                  </div>

                  {!isInFollowUp && (evaluation.rating === 'weak' || evaluation.rating === 'inconsistent') && (
                    <button
                      style={styles.followUpButton}
                      onClick={onGetFollowUp}
                      disabled={followUpLoading}
                    >
                      {followUpLoading ? 'Generating follow-up...' : '+ Get a follow-up question'}
                    </button>
                  )}

                  <button style={styles.nextButton} onClick={onNext}>
                    {isLastQuestion ? 'Complete session →' : 'Next question →'}
                  </button>
                </div>
              )}
            </>
          )}

          {mode === 'voice' && (
            <VoiceInput
              answer={answer}
              onAnswerChange={onAnswerChange}
              evaluation={evaluation}
              onSubmit={onSubmit}
              onNext={onNext}
              loading={loading}
              isLastQuestion={isLastQuestion}
              isInFollowUp={isInFollowUp}
              followUpLoading={followUpLoading}
              onGetFollowUp={onGetFollowUp}
            />
          )}
        </div>
      </div>

      {/* Session countdown timer — fixed bottom bar */}
      <div style={{
        position: 'fixed',
        bottom: 0, left: 0, right: 0,
        height: '56px',
        background: timerWarning ? 'rgba(30,5,5,0.97)' : 'rgba(10,10,10,0.97)',
        borderTop: timerWarning ? '1px solid rgba(239,68,68,0.35)' : '1px solid rgba(201,168,76,0.12)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 28px',
        backdropFilter: 'blur(12px)',
        zIndex: 200,
        transition: 'background 0.8s ease, border-color 0.8s ease',
      }}>
        <span style={{
          fontSize: '10px',
          letterSpacing: '0.14em',
          textTransform: 'uppercase' as const,
          color: timerWarning ? 'rgba(239,68,68,0.55)' : 'rgba(245,240,232,0.68)',
          whiteSpace: 'nowrap',
        }}>
          {timerWarning ? 'Time running out' : 'Session time'}
        </span>
        <div style={{
          flex: 1,
          height: '3px',
          background: timerWarning ? 'rgba(239,68,68,0.12)' : 'rgba(245,240,232,0.07)',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${(sessionTimeLeft / (15 * 60)) * 100}%`,
            background: timerWarning ? '#ef4444' : '#C9A84C',
            transition: 'width 1s linear, background 0.8s ease',
          }} />
        </div>
        <span style={{
          fontSize: '22px',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          fontWeight: 500,
          color: timerWarning ? 'rgba(239,68,68,0.95)' : '#C9A84C',
          minWidth: '58px',
          textAlign: 'right' as const,
        }}>
          {formatTime(sessionTimeLeft)}
        </span>
      </div>
    </div>
  );
}

function VoiceInput({
  answer,
  onAnswerChange,
  evaluation,
  onSubmit,
  onNext,
  loading,
  isLastQuestion,
  isInFollowUp,
  followUpLoading,
  onGetFollowUp,
}: {
  answer: string;
  onAnswerChange: (v: string) => void;
  evaluation: AnswerEvaluation | null;
  onSubmit: () => void;
  onNext: () => void;
  loading: boolean;
  isLastQuestion: boolean;
  isInFollowUp: boolean;
  followUpLoading: boolean;
  onGetFollowUp: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [recordedText, setRecordedText] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('file', blob, 'recording.webm');

          const response = await fetch('/api/simulator/transcribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const data = await response.json();
          const transcribedText = data.text || '';
          setRecordedText(transcribedText);
          onAnswerChange(transcribedText);
        } catch (err) {
          console.error('Transcription failed:', err);
          setRecordedText('Transcription failed. Please type your answer below.');
        } finally {
          setTranscribing(false);
        }
      };

      mediaRecorder.start(1000);
      setRecording(true);

      // Auto-stop after 3 minutes
      setTimeout(() => {
        if (recording && mediaRecorderRef.current?.state === 'recording') {
          stopRecording();
        }
      }, 180000);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div style={styles.voiceContainer}>
      {!evaluation ? (
        <>
          <button
            style={recording ? {...styles.recordButton, ...styles.recordButtonActive} : styles.recordButton}
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            disabled={transcribing}
          >
            <div style={styles.recordCircle} />
          </button>

          <p style={styles.recordHint}>
            {recording ? 'Recording... Release to stop' : transcribing ? 'Transcribing...' : 'Hold to speak'}
          </p>

          {transcribing && (
            <p style={styles.recordHint}>Transcribing...</p>
          )}

          {recordedText && (
            <div style={styles.transcribedBox}>
              <p style={styles.transcribedText}>{recordedText}</p>
            </div>
          )}

          {answer && !transcribing && (
            <>
              <textarea
                style={styles.textarea}
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                placeholder="Your answer will appear here after recording..."
              />
              <button style={styles.useAnswerButton} onClick={onSubmit} disabled={loading}>
                Use this answer →
              </button>
              <button style={styles.recordAgainButton} onClick={() => { setRecordedText(''); onAnswerChange(''); }}>
                Record again
              </button>
            </>
          )}
        </>
      ) : (
        <div style={styles.evaluationCard}>
          <div style={{
            ...styles.evaluationBorder,
            borderLeftColor: evaluation.rating === 'strong' ? '#22c55e' :
              evaluation.rating === 'weak' ? '#f59e0b' : '#ef4444'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={styles.evaluationHeader}>
                {evaluation.rating === 'strong' && '✓ Strong answer'}
                {evaluation.rating === 'weak' && '⚠ Needs more detail'}
                {evaluation.rating === 'inconsistent' && '✗ Inconsistency detected'}
              </div>
              {evaluation.score != null && (
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: evaluation.score >= 7 ? '#22c55e' : evaluation.score >= 5 ? '#f59e0b' : '#ef4444',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                  padding: '2px 10px',
                }}>
                  {evaluation.score}/10
                </div>
              )}
            </div>
            <p style={styles.evaluationFeedback}>{evaluation.feedback}</p>
          </div>

          {!isInFollowUp && (evaluation.rating === 'weak' || evaluation.rating === 'inconsistent') && (
            <button
              style={styles.followUpButton}
              onClick={onGetFollowUp}
              disabled={followUpLoading}
            >
              {followUpLoading ? 'Generating follow-up...' : '+ Get a follow-up question'}
            </button>
          )}

          <button style={styles.nextButton} onClick={onNext}>
            {isLastQuestion ? 'Complete session →' : 'Next question →'}
          </button>
        </div>
      )}
    </div>
  );
}

function coachingCardWordCount(s: string): number {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

function CoachingCard({ item, coaching, answerKey, correctionNote, correctionSaveStatus, isExpanded, onToggleExpand, onCorrectionChange }: {
  item: { questionId: string; question: string; suggestion: string; originalAnswer: string } | { questionId: string; question: string; filed: string; spoken: string; originalAnswer: string };
  coaching: QuestionCoaching | undefined;
  answerKey?: string;
  correctionNote?: string;
  correctionSaveStatus?: 'idle' | 'saving' | 'saved';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onCorrectionChange?: (answerKey: string, value: string) => void;
}) {
  const isInconsistency = 'spoken' in item;
  const accentColor = isInconsistency ? '#ef4444' : '#f59e0b';
  const correction = correctionNote ?? '';
  const isResolved = isInconsistency && coachingCardWordCount(correction) > 10;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(245,240,232,0.04)',
    border: '1px solid rgba(245,240,232,0.62)',
    color: '#f5f0e8',
    fontSize: '12px',
    fontFamily: "'DM Sans', sans-serif",
    padding: '9px 11px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical' as const,
    lineHeight: 1.6,
    borderRadius: 0,
  };

  return (
    <div style={{
      border: `1px solid ${isResolved ? 'rgba(34,197,94,0.3)' : accentColor + '30'}`,
      background: isResolved ? 'rgba(34,197,94,0.04)' : `${accentColor}06`,
      marginBottom: '20px',
      padding: '24px',
      transition: 'border-color 0.3s ease, background 0.3s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px' }}>
        <div style={{
          display: 'inline-block',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: isResolved ? '#22c55e' : accentColor,
          padding: '3px 8px',
          border: `1px solid ${isResolved ? 'rgba(34,197,94,0.5)' : accentColor + '50'}`,
        }}>
          {isInconsistency ? (isResolved ? 'RESOLVED' : 'INCONSISTENCY') : 'NEEDS WORK'}
        </div>
        {isInconsistency && answerKey && onToggleExpand && (
          <button
            onClick={onToggleExpand}
            style={{
              fontSize: '11px',
              color: isResolved ? 'rgba(34,197,94,0.7)' : '#C9A84C',
              textDecoration: 'underline',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            {isExpanded ? 'Close ↑' : (isResolved ? 'View correction ↓' : 'Correct this ↓')}
          </button>
        )}
      </div>

      <div style={{ fontSize: '15px', color: isResolved ? 'rgba(245,240,232,0.6)' : '#f5f0e8', fontWeight: 500, marginBottom: '16px', lineHeight: 1.4 }}>
        {item.question}
      </div>

      {item.originalAnswer && !isInconsistency && (
        <div style={{
          fontSize: '13px',
          color: 'rgba(245,240,232,0.74)',
          fontStyle: 'italic',
          borderLeft: '2px solid rgba(255,255,255,0.1)',
          paddingLeft: '12px',
          marginBottom: '20px',
          lineHeight: 1.5,
        }}>
          Your answer: &ldquo;{item.originalAnswer.substring(0, 180)}{item.originalAnswer.length > 180 ? '...' : ''}&rdquo;
        </div>
      )}

      {/* Inconsistency: side-by-side comparison (always visible) */}
      {isInconsistency && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ padding: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(239,68,68,0.6)', marginBottom: '8px' }}>
              YOU SAID
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.55, fontStyle: 'italic' }}>
              &ldquo;{(item as { spoken: string }).spoken.substring(0, 200)}{(item as { spoken: string }).spoken.length > 200 ? '...' : ''}&rdquo;
            </div>
          </div>
          <div style={{ padding: '12px', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(201,168,76,0.6)', marginBottom: '8px' }}>
              CASE FILE SAYS
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.55 }}>
              {(item as { filed: string }).filed}
            </div>
          </div>
        </div>
      )}

      {/* Inconsistency: inline correction panel (toggled) */}
      {isInconsistency && isExpanded && answerKey && onCorrectionChange && (
        <div
          style={{ borderTop: '1px solid rgba(245,240,232,0.62)', paddingTop: '16px', marginTop: '4px' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(245,240,232,0.68)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Correction note
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.74)', lineHeight: 1.6, marginBottom: '10px' }}>
            Clarify what you meant or note what you&apos;ll say differently. This is saved to your case file.
          </div>
          <textarea
            value={correction}
            onChange={e => onCorrectionChange(answerKey, e.target.value)}
            placeholder="e.g. I misspoke — the actual figure in my business plan is $240,000, not $180,000. I will clarify this clearly in my interview."
            rows={3}
            style={inputStyle}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <div style={{ fontSize: '10px', color: isResolved ? 'rgba(34,197,94,0.7)' : 'rgba(245,240,232,0.65)' }}>
              {isResolved ? '✓ Correction noted' : `${coachingCardWordCount(correction)} words — add ~10+ words to mark resolved`}
            </div>
            {(correctionSaveStatus ?? 'idle') !== 'idle' && (
              <div style={{ fontSize: '10px', color: correctionSaveStatus === 'saved' ? '#22c55e' : 'rgba(245,240,232,0.68)' }}>
                {correctionSaveStatus === 'saving' ? 'Saving…' : '✓ Saved'}
              </div>
            )}
          </div>
          {isResolved && (
            <div style={{
              marginTop: '10px',
              padding: '10px 12px',
              background: 'rgba(34,197,94,0.06)',
              border: '1px solid rgba(34,197,94,0.2)',
              fontSize: '12px',
              color: 'rgba(34,197,94,0.8)',
              lineHeight: 1.5,
            }}>
              ✓ Correction saved. Your attorney will see this note alongside the original inconsistency.
            </div>
          )}
        </div>
      )}

      {coaching ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(201,168,76,0.7)', marginBottom: '6px' }}>
              WHAT THE OFFICER EXPECTS
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.8)', lineHeight: 1.6 }}>
              {coaching.whatOfficerExpected}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: accentColor + 'aa', marginBottom: '6px' }}>
              WHAT WAS MISSING FROM YOUR ANSWER
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.8)', lineHeight: 1.6 }}>
              {coaching.whatWasMissing}
            </div>
          </div>

          {coaching.keyPoints.length > 0 && (
            <div style={{ marginBottom: coaching.documentReference ? '16px' : '0' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#22c55eaa', marginBottom: '10px' }}>
                WHAT TO SAY IN YOUR INTERVIEW
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {coaching.keyPoints.map((point, i) => (
                  <li key={i} style={{
                    fontSize: '13px',
                    color: 'rgba(245,240,232,0.85)',
                    lineHeight: 1.5,
                    paddingLeft: '16px',
                    borderLeft: '2px solid #22c55e60',
                    marginBottom: '8px',
                  }}>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {coaching.modelAnswer && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: 'rgba(34,197,94,0.04)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(34,197,94,0.6)', marginBottom: '10px' }}>
                WHAT A STRONG ANSWER LOOKS LIKE
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.65, fontStyle: 'italic' }}>
                &ldquo;{coaching.modelAnswer}&rdquo;
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.68)', marginTop: '10px', lineHeight: 1.5 }}>
                This is a guide to the level of detail and structure expected — not a script. Officers can tell when answers are memorized. Use this to understand what to cover, then answer in your own words based on your actual situation.
              </div>
            </div>
          )}

          {coaching.documentReference && (
            <div style={{
              marginTop: '12px',
              padding: '10px 14px',
              background: 'rgba(201,168,76,0.08)',
              border: '1px solid rgba(201,168,76,0.2)',
              fontSize: '12px',
              color: '#C9A84C',
            }}>
              <span style={{ opacity: 0.7, marginRight: '6px' }}>DOCUMENT:</span>
              {coaching.documentReference}
            </div>
          )}
        </>
      ) : (
        !isInconsistency && (
          <div style={{ fontSize: '13px', color: `${accentColor}cc`, lineHeight: 1.6 }}>
            {'suggestion' in item ? item.suggestion : ''}
          </div>
        )
      )}
    </div>
  );
}

const DELIVERY_LABELS: Record<DeliveryNote['type'], { label: string; color: string }> = {
  brevity: { label: 'TOO BRIEF', color: '#60a5fa' },
  fillers: { label: 'FILLER WORDS', color: '#a78bfa' },
  hedging: { label: 'HEDGING LANGUAGE', color: '#fb923c' },
  high_hedge_ratio: { label: 'HIGH HEDGE RATIO', color: '#f97316' },
  complex_sentences: { label: 'COMPLEX SENTENCES', color: '#facc15' },
  choppy: { label: 'CHOPPY DELIVERY', color: '#94a3b8' },
};

function DeliveryFlagCard({ flag }: { flag: { questionId: string; questionText: string; notes: DeliveryNote[] } }) {
  return (
    <div style={{
      border: '1px solid rgba(148,163,184,0.15)',
      background: 'rgba(148,163,184,0.03)',
      marginBottom: '16px',
      padding: '20px 24px',
    }}>
      <div style={{ fontSize: '13px', color: 'rgba(245,240,232,0.7)', fontWeight: 500, marginBottom: '14px', lineHeight: 1.4 }}>
        {flag.questionText}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
        {flag.notes.map((note, i) => {
          const { label, color } = DELIVERY_LABELS[note.type];
          return (
            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color,
                padding: '3px 7px',
                border: `1px solid ${color}40`,
                whiteSpace: 'nowrap' as const,
                marginTop: '1px',
                flexShrink: 0,
              }}>
                {label}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.55 }}>
                {note.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuestionBreakdownCard({ index, item }: { index: number; item: QuestionBreakdownItem }) {
  const ratingColor = item.rating === 'strong' ? '#22c55e' : item.rating === 'inconsistent' ? '#ef4444' : '#f59e0b';
  const ratingLabel = item.rating === 'strong' ? 'Strong' : item.rating === 'inconsistent' ? 'Inconsistent' : 'Needs work';
  const scoreColor = item.score === null ? 'rgba(245,240,232,0.55)'
    : item.score >= 75 ? '#22c55e' : item.score >= 55 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{
      border: '1px solid rgba(201,168,76,0.12)',
      background: 'rgba(201,168,76,0.02)',
      padding: '18px 20px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', color: '#f5f0e8', lineHeight: 1.5, flex: 1 }}>
          <span style={{ color: 'rgba(201,168,76,0.7)', marginRight: '8px' }}>Q{index}</span>
          {item.questionText}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <span style={{
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            padding: '3px 10px',
            border: `1px solid ${ratingColor}`,
            background: `${ratingColor}20`,
            color: ratingColor,
            whiteSpace: 'nowrap' as const,
          }}>
            {ratingLabel}
          </span>
          <span style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px',
            fontWeight: 400,
            lineHeight: 1,
            color: scoreColor,
            minWidth: '44px',
            textAlign: 'right' as const,
          }}>
            {item.score !== null ? item.score : '—'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: '12px', color: 'rgba(245,240,232,0.78)', lineHeight: 1.55, marginBottom: item.suggestion ? '8px' : 0 }}>
        {item.feedback}
      </div>
      {item.suggestion && (
        <div style={{
          fontSize: '12px',
          color: 'rgba(245,240,232,0.85)',
          lineHeight: 1.55,
          borderLeft: '2px solid rgba(201,168,76,0.5)',
          paddingLeft: '12px',
        }}>
          <span style={{ color: '#C9A84C', letterSpacing: '0.06em', fontSize: '10px', textTransform: 'uppercase' as const, marginRight: '6px' }}>Improve</span>
          {item.suggestion}
        </div>
      )}
    </div>
  );
}

function SessionComplete({
  summary,
  sessionNumber,
  coachingLoading,
  coachingError,
  onRetryCoaching,
  applicationId,
  onStartNew,
  onBackToDashboard,
}: {
  summary: CoachingSummary;
  sessionNumber?: number;
  coachingLoading: boolean;
  coachingError?: boolean;
  onRetryCoaching?: () => void;
  applicationId?: string;
  onStartNew: () => void;
  onBackToDashboard: () => void;
}) {
  const hasWeakItems = summary.needsWork.length > 0 || summary.inconsistencies.length > 0;
  const [expandedInconsistency, setExpandedInconsistency] = useState<string | null>(null);
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [correctionSaveStatus, setCorrectionSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});
  const correctionDebounceRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleCorrectionChange = useCallback((answerKey: string, value: string) => {
    setCorrections(prev => ({ ...prev, [answerKey]: value }));
    if (!applicationId) return;
    const existing = correctionDebounceRefs.current.get(answerKey);
    if (existing) clearTimeout(existing);
    setCorrectionSaveStatus(prev => ({ ...prev, [answerKey]: 'saving' }));
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/answers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question_key: answerKey, answer_value: value, application_id: applicationId }),
        });
        if (res.ok) {
          setCorrectionSaveStatus(prev => ({ ...prev, [answerKey]: 'saved' }));
          setTimeout(() => setCorrectionSaveStatus(prev => ({ ...prev, [answerKey]: 'idle' })), 1500);
        } else {
          setCorrectionSaveStatus(prev => ({ ...prev, [answerKey]: 'idle' }));
        }
      } catch {
        setCorrectionSaveStatus(prev => ({ ...prev, [answerKey]: 'idle' }));
      }
    }, 800);
    correctionDebounceRefs.current.set(answerKey, timer);
  }, [applicationId]);

  return (
    <div style={styles.completeContainer}>
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          * { color: black !important; border-color: #ccc !important; background: white !important; }
        }
      `}</style>
      <div style={styles.completeCard}>
        <div style={styles.eyebrow}>SESSION {sessionNumber} COMPLETE</div>

        <div style={styles.readinessIndicator}>
          {summary.readinessIndicator === 'ready' && (
            <div style={{...styles.readinessBadge, background: '#22c55e20', borderColor: '#22c55e'}}>
              Interview ready
            </div>
          )}
          {summary.readinessIndicator === 'nearly_ready' && (
            <div style={{...styles.readinessBadge, background: '#f59e0b20', borderColor: '#f59e0b'}}>
              Nearly ready
            </div>
          )}
          {summary.readinessIndicator === 'needs_work' && (
            <div style={{...styles.readinessBadge, background: '#ef444420', borderColor: '#ef4444'}}>
              More preparation needed
            </div>
          )}
        </div>

        {/* Overall session score */}
        {summary.overallScore !== null && (
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '36px',
          }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '64px',
              fontWeight: 300,
              lineHeight: 1,
              color: summary.overallScore >= 75 ? '#22c55e' : summary.overallScore >= 55 ? '#f59e0b' : '#ef4444',
            }}>
              {summary.overallScore}
            </span>
            <span style={{ fontSize: '15px', color: 'rgba(245,240,232,0.55)', letterSpacing: '0.04em' }}>
              / 100 session score
            </span>
          </div>
        )}

        {/* Question-by-question breakdown */}
        {summary.questionBreakdown && summary.questionBreakdown.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#f5f0e8', marginBottom: '6px' }}>
              Question-by-question breakdown
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.72)', marginBottom: '20px', marginTop: 0 }}>
              How a consular officer would score each of your answers, with what to improve.
            </p>
            {summary.questionBreakdown.map((item, i) => (
              <QuestionBreakdownCard key={item.questionId + i} index={i + 1} item={item} />
            ))}
          </div>
        )}

        {/* Strong Answers */}
        {summary.strongAnswers.length > 0 && (
          <div style={styles.resultSection}>
            <h3 style={styles.resultTitle}>
              <span style={styles.resultIcon}>✓</span> Strong answers ({summary.strongAnswers.length})
            </h3>
            <ul style={styles.resultList}>
              {summary.strongAnswers.map((item, i) => (
                <li key={i} style={styles.resultItem}>
                  <div style={styles.resultQuestion}>{item.question}</div>
                  <div style={styles.resultNote}>{item.note}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Coaching Report Section */}
        {hasWeakItems && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#f5f0e8', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                Your interview coaching report
                {coachingLoading && (
                  <span style={{ fontSize: '11px', color: 'rgba(201,168,76,0.7)', fontWeight: 400, letterSpacing: '0.06em' }}>
                    — generating...
                  </span>
                )}
              </h3>
              {!coachingLoading && summary.detailedCoaching && summary.detailedCoaching.length > 0 && (
                <button
                  className="no-print"
                  onClick={() => window.print()}
                  style={{
                    padding: '6px 14px',
                    background: 'transparent',
                    border: '1px solid rgba(201,168,76,0.4)',
                    color: '#C9A84C',
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  Print / Save as PDF
                </button>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.72)', marginBottom: '20px', marginTop: 0 }}>
              Questions where your answer needs strengthening before the real interview.
            </p>

            {coachingLoading && !summary.detailedCoaching && (
              <div style={{
                padding: '32px',
                textAlign: 'center' as const,
                border: '1px solid rgba(201,168,76,0.12)',
                color: 'rgba(245,240,232,0.72)',
                fontSize: '13px',
              }}>
                <div style={{ marginBottom: '8px', fontSize: '20px' }}>⟳</div>
                Analyzing your answers with E-2 expertise...
              </div>
            )}

            {!coachingLoading && coachingError && !summary.detailedCoaching && (
              <div style={{
                padding: '24px',
                textAlign: 'center' as const,
                border: '1px solid rgba(220,120,90,0.25)',
                background: 'rgba(220,120,90,0.06)',
                color: 'rgba(245,240,232,0.85)',
                fontSize: '13px',
              }}>
                <div style={{ marginBottom: '10px' }}>
                  Your detailed coaching report couldn&apos;t be generated. The suggestions below are still available.
                </div>
                {onRetryCoaching && (
                  <button
                    className="no-print"
                    onClick={onRetryCoaching}
                    style={{
                      background: 'transparent',
                      border: '1px solid rgba(201,168,76,0.4)',
                      color: '#C9A84C',
                      fontSize: '12px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {summary.needsWork.map((item) => (
              <CoachingCard
                key={item.questionId}
                item={item}
                coaching={summary.detailedCoaching?.find(c => c.questionId === item.questionId)}
              />
            ))}

            {summary.inconsistencies.map((item) => {
              const answerKey = 'QS-' + item.questionId.replace(/-/g, '');
              return (
                <CoachingCard
                  key={item.questionId}
                  item={item}
                  coaching={summary.detailedCoaching?.find(c => c.questionId === item.questionId)}
                  answerKey={answerKey}
                  correctionNote={corrections[answerKey] ?? ''}
                  correctionSaveStatus={correctionSaveStatus[answerKey] ?? 'idle'}
                  isExpanded={expandedInconsistency === item.questionId}
                  onToggleExpand={() => setExpandedInconsistency(
                    expandedInconsistency === item.questionId ? null : item.questionId
                  )}
                  onCorrectionChange={handleCorrectionChange}
                />
              );
            })}
          </div>
        )}

        {/* Delivery Coaching */}
        {summary.deliveryFlags && summary.deliveryFlags.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#f5f0e8', marginBottom: '6px' }}>
              Delivery coaching
            </h3>
            <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.72)', marginBottom: '20px', marginTop: 0 }}>
              These are presentation patterns detected in your spoken answers — independent of content quality.
            </p>
            {summary.deliveryFlags.map((flag) => (
              <DeliveryFlagCard key={flag.questionId} flag={flag} />
            ))}
          </div>
        )}

        {/* Practice Next */}
        {summary.weakPointsAtRisk.length > 0 && (
          <div style={styles.practiceSection}>
            <h4 style={styles.practiceTitle}>Focus on these questions in your next session</h4>
            <ul style={styles.practiceList}>
              {summary.weakPointsAtRisk.slice(0, 4).map((q, i) => (
                <li key={i} style={styles.practiceItem}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="no-print" style={styles.completeActions}>
          <button style={styles.primaryButton} onClick={onStartNew}>
            Start another session
          </button>
          <Link href="/simulator/interview-day" style={{ ...styles.secondaryButton, textDecoration: 'none', display: 'inline-block', textAlign: 'center' as const }}>
            Interview Day Guide
          </Link>
          <button style={styles.secondaryButton} onClick={onBackToDashboard}>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SIMULATOR TEASER (shown when case file data is insufficient)
// =============================================================================

function SimulatorTeaser({ needsAnalysisOnly = false }: { needsAnalysisOnly?: boolean }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        padding: '48px',
        background: 'rgba(201,168,76,0.02)',
        border: '1px solid rgba(201,168,76,0.12)',
        borderRadius: 0,
        textAlign: 'center' as const,
      }}>
        {/* Icon */}
        <div style={{
          width: '56px',
          height: '56px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(201,168,76,0.08)',
          border: '1px solid rgba(201,168,76,0.2)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" x2="12" y1="19" y2="22" />
          </svg>
        </div>

        <div style={styles.eyebrow}>INTERVIEW SIMULATOR</div>

        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '36px',
          fontWeight: 300,
          color: '#f5f0e8',
          marginBottom: '16px',
          lineHeight: 1.1,
        }}>
          {needsAnalysisOnly ? 'Almost Ready — One Step Left' : 'Pressure-Test Your Interview Readiness'}
        </h1>

        <p style={{
          fontSize: '15px',
          fontWeight: 300,
          color: 'rgba(245,240,232,0.65)',
          lineHeight: 1.7,
          marginBottom: '32px',
          maxWidth: '480px',
          margin: '0 auto 32px',
        }}>
          The Interview Simulator uses <strong style={{ color: 'rgba(245,240,232,0.85)' }}>your specific application data</strong> to
          generate realistic consulate interview questions. It probes weak points in
          your filed package, checks your answers for consistency with your documents,
          and gives you a coaching summary after each session.
        </p>

        {/* Feature bullets */}
        <div style={{
          textAlign: 'left' as const,
          maxWidth: '440px',
          margin: '0 auto 36px',
        }}>
          {[
            'Personalised questions drawn from YOUR business, investment, and case data',
            'Consistency checking against your filed documents',
            'Weak-point probing triggered by low analysis scores',
            'Text and voice modes with 15-minute timed sessions',
            'Post-session coaching summary with focus areas',
          ].map((text, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              marginBottom: '14px',
            }}>
              <span style={{
                color: '#C9A84C',
                fontSize: '14px',
                marginTop: '2px',
                flexShrink: 0,
              }}>→</span>
              <span style={{
                fontSize: '14px',
                color: 'rgba(245,240,232,0.6)',
                lineHeight: 1.5,
              }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Unlock message */}
        <div style={{
          padding: '20px 24px',
          background: 'rgba(201,168,76,0.05)',
          border: '1px solid rgba(201,168,76,0.15)',
          marginBottom: '32px',
        }}>
          <p style={{
            fontSize: '14px',
            color: 'rgba(245,240,232,0.7)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            {needsAnalysisOnly
              ? 'Your case data is in — you just need to run AI analysis so the simulator has a scored case file to interview you against. It takes under a minute.'
              : 'To unlock the simulator, complete your case file in Module 3 — your business details, investment data, and supporting information. The more complete your filing, the more realistic and useful your practice sessions will be.'}
          </p>
        </div>

        {/* Two CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <a
            href={needsAnalysisOnly ? '/gap-analysis' : '/apply'}
            style={{
              display: 'inline-block',
              padding: '16px 32px',
              background: '#C9A84C',
              color: '#0a0a0a',
              fontSize: '15px',
              fontWeight: 500,
              textDecoration: 'none',
              fontFamily: "'DM Sans', sans-serif",
              width: '100%',
              maxWidth: '320px',
              textAlign: 'center' as const,
            }}
          >
            {needsAnalysisOnly ? 'Run AI analysis →' : 'Complete your case file →'}
          </a>

          {!needsAnalysisOnly && (
            <>
              <span style={{
                fontSize: '12px',
                color: 'rgba(245,240,232,0.68)',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                — or —
              </span>

              <a
                href="/simulator/quick-start"
                style={{
                  display: 'inline-block',
                  padding: '14px 32px',
                  background: 'transparent',
                  color: '#C9A84C',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  border: '1px solid rgba(201,168,76,0.3)',
                  width: '100%',
                  maxWidth: '320px',
                  textAlign: 'center' as const,
                }}
              >
                Upload your documents instead →
              </a>

              {/* Document list for upload path */}
              <div style={{
                marginTop: '16px',
                padding: '16px 20px',
                background: 'rgba(201,168,76,0.03)',
                border: '1px solid rgba(201,168,76,0.12)',
                textAlign: 'left' as const,
                maxWidth: '320px',
                width: '100%',
              }}>
                <div style={{
                  fontSize: '9px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: 'rgba(201,168,76,0.65)',
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: '10px',
                }}>
                  Recommended documents to upload
                </div>
                {[
                  'Business plan or executive summary',
                  'Source of funds statement or bank records',
                  'Investment breakdown / proof of investment',
                  'Franchise Disclosure Document (if franchise)',
                  'Lease agreement or letter of intent',
                  'Previous DS-160 or visa petition (if renewal)',
                  'Any prior attorney correspondence',
                ].map((doc, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'flex-start',
                    marginBottom: i < 6 ? '7px' : 0,
                  }}>
                    <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>→</span>
                    <span style={{ fontSize: '12px', color: 'rgba(245,240,232,0.6)', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{doc}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: '24px' }}>
          <a
            href="/dashboard"
            style={{
              color: '#C9A84C',
              fontSize: '14px',
              textDecoration: 'underline',
            }}
          >
            ← Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: 'rgba(245,240,232,0.6)',
  },

  // Start Screen
  startContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  startCard: {
    maxWidth: '560px',
    width: '100%',
    padding: '48px',
    background: 'rgba(201,168,76,0.02)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderRadius: 0,
    textAlign: 'center' as const,
  },
  eyebrow: {
    fontSize: '10px',
    fontWeight: 500,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    marginBottom: '16px',
  },
  startTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '42px',
    fontWeight: 300,
    color: '#f5f0e8',
    marginBottom: '16px',
  },
  startSubtitle: {
    fontSize: '15px',
    fontWeight: 300,
    color: 'rgba(245,240,232,0.65)',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  sessionCount: {
    fontSize: '14px',
    color: 'rgba(245,240,232,0.76)',
    marginBottom: '32px',
  },
  purchaseBanner: {
    padding: '24px',
    background: 'rgba(201,168,76,0.05)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: 0,
    marginBottom: '24px',
  },
  purchaseText: {
    fontSize: '14px',
    color: '#f5f0e8',
    marginBottom: '12px',
  },
  purchaseButton: {
    background: '#C9A84C',
    color: '#0a0a0a',
    border: 'none',
    padding: '14px 28px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  purchaseNote: {
    fontSize: '12px',
    color: 'rgba(245,240,232,0.72)',
    marginTop: '8px',
  },
  error: {
    padding: '12px 16px',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: 0,
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '24px',
  },
  modeButtons: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '24px',
  },
  modeButton: {
    background: 'transparent',
    border: '1px solid rgba(201,168,76,0.3)',
    padding: '32px 24px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  modeButtonDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  modeIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  modeTitle: {
    fontSize: '20px',
    fontWeight: 500,
    color: '#f5f0e8',
  },
  modeDesc: {
    fontSize: '13px',
    color: 'rgba(245,240,232,0.76)',
  },
  modeTooltip: {
    fontSize: '11px',
    color: 'rgba(245,240,232,0.72)',
    marginTop: '4px',
  },
  backLink: {
    color: '#C9A84C',
    fontSize: '14px',
    textDecoration: 'underline',
  },

  // Active Session
  activeContainer: {
    minHeight: '100vh',
    padding: '24px',
  },
  activeGrid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: '40% 60%',
    gap: '32px',
    minHeight: 'calc(100vh - 48px)',
  },
  questionPanel: {
    padding: '32px',
    background: 'rgba(201,168,76,0.02)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderRadius: 0,
  },
  questionHeader: {
    marginBottom: '32px',
  },
  questionCounter: {
    fontSize: '12px',
    fontWeight: 500,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'rgba(245,240,232,0.6)',
  },
  timerDisplay: {
    fontSize: '13px',
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '0.05em',
  },
  timerWarning: {
    padding: '10px 16px',
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.25)',
    color: 'rgba(239,68,68,0.9)',
    fontSize: '12px',
    letterSpacing: '0.06em',
    marginBottom: '16px',
  },
  progressBar: {
    height: '3px',
    background: 'rgba(245,240,232,0.1)',
  },
  progressFill: {
    height: '100%',
    background: '#C9A84C',
    transition: 'width 0.3s ease',
  },
  questionText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '28px',
    fontWeight: 300,
    fontStyle: 'italic',
    color: '#f5f0e8',
    lineHeight: 1.3,
  },
  questionContext: {
    marginTop: '24px',
    padding: '12px 16px',
    background: 'rgba(201,168,76,0.05)',
    border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: 0,
    fontSize: '13px',
    color: 'rgba(245,240,232,0.76)',
  },
  replayButton: {
    marginTop: '16px',
    background: 'transparent',
    border: '1px solid rgba(201,168,76,0.3)',
    color: 'rgba(245,240,232,0.6)',
    fontSize: '12px',
    letterSpacing: '0.08em',
    padding: '6px 12px',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  },
  hintToggle: {
    background: 'transparent', border: 'none', padding: '4px 0',
    color: 'rgba(201,168,76,0.85)', fontSize: '12px', letterSpacing: '0.05em',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", textAlign: 'left' as const,
  },
  hintPanel: {
    marginTop: '10px', padding: '16px 18px',
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.18)',
    borderLeft: '3px solid rgba(201,168,76,0.5)',
    fontSize: '13px', color: 'rgba(245,240,232,0.85)', lineHeight: 1.65,
    whiteSpace: 'pre-line' as const,
  },
  answerPanel: {
    padding: '32px',
  },
  textarea: {
    width: '100%',
    minHeight: '200px',
    padding: '16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: 0,
    color: '#f5f0e8',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical' as const,
    outline: 'none',
  },
  wordCount: {
    marginTop: '8px',
    fontSize: '12px',
    color: 'rgba(245,240,232,0.72)',
  },
  wordHint: {
    color: 'rgba(245,240,232,0.68)',
  },
  submitButton: {
    marginTop: '24px',
    width: '100%',
    padding: '16px 32px',
    background: '#C9A84C',
    color: '#0a0a0a',
    border: 'none',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  evaluationCard: {
    marginTop: '24px',
  },
  evaluationBorder: {
    padding: '20px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(201,168,76,0.15)',
    borderLeftWidth: '3px',
    borderRadius: 0,
  },
  evaluationHeader: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '12px',
  },
  evaluationFeedback: {
    fontSize: '14px',
    color: 'rgba(245,240,232,0.7)',
    lineHeight: 1.6,
  },
  suggestionBox: {
    marginTop: '16px',
    padding: '12px',
    background: 'rgba(245,158,11,0.1)',
    border: '1px solid rgba(245,158,11,0.2)',
    borderRadius: 0,
    fontSize: '13px',
    color: 'rgba(245,240,232,0.8)',
  },
  docRef: {
    marginTop: '12px',
    fontSize: '12px',
    color: 'rgba(245,240,232,0.76)',
    fontStyle: 'italic' as const,
  },
  nextButton: {
    marginTop: '12px',
    width: '100%',
    padding: '16px 32px',
    background: 'transparent',
    color: '#C9A84C',
    border: '1px solid #C9A84C',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  followUpButton: {
    marginTop: '16px',
    width: '100%',
    padding: '12px 24px',
    background: 'rgba(201,168,76,0.08)',
    color: 'rgba(201,168,76,0.9)',
    border: '1px solid rgba(201,168,76,0.25)',
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.04em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'DM Sans', sans-serif",
  },
  followUpLabel: {
    fontSize: '9px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
    color: '#C9A84C',
    marginBottom: '12px',
    padding: '4px 8px',
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.2)',
    display: 'inline-block',
  },

  // Voice Input
  voiceContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '32px',
  },
  recordButton: {
    width: '120px',
    height: '120px',
    borderRadius: 0,
    background: 'transparent',
    border: '2px solid rgba(201,168,76,0.4)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  recordButtonActive: {
    borderColor: '#C9A84C',
    animation: 'pulse 1s infinite',
  },
  recordCircle: {
    width: '48px',
    height: '48px',
    borderRadius: 0,
    background: '#C9A84C',
  },
  recordHint: {
    marginTop: '16px',
    fontSize: '14px',
    color: 'rgba(245,240,232,0.6)',
  },
  transcribedBox: {
    marginTop: '24px',
    padding: '16px',
    background: 'rgba(201,168,76,0.05)',
    border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: 0,
    maxWidth: '400px',
  },
  transcribedText: {
    fontSize: '14px',
    color: 'rgba(245,240,232,0.7)',
    fontStyle: 'italic' as const,
  },
  useAnswerButton: {
    marginTop: '16px',
    padding: '12px 24px',
    background: '#C9A84C',
    color: '#0a0a0a',
    border: 'none',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  recordAgainButton: {
    marginTop: '12px',
    padding: '8px 16px',
    background: 'transparent',
    color: 'rgba(245,240,232,0.6)',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
  },

  // Complete Screen
  completeContainer: {
    minHeight: '100vh',
    padding: '48px 24px',
    overflowY: 'auto' as const,
  },
  completeCard: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '48px',
    background: 'rgba(201,168,76,0.02)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderRadius: 0,
  },
  readinessIndicator: {
    marginBottom: '48px',
  },
  readinessBadge: {
    display: 'inline-block',
    padding: '12px 24px',
    border: '2px solid',
    borderRadius: 0,
    fontSize: '18px',
    fontWeight: 500,
  },
  resultSection: {
    marginBottom: '32px',
    paddingBottom: '32px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#22c55e',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  resultIcon: {
    fontSize: '16px',
  },
  resultList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  resultItem: {
    padding: '16px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(201,168,76,0.1)',
    borderRadius: 0,
    marginBottom: '12px',
  },
  resultQuestion: {
    fontSize: '14px',
    color: '#f5f0e8',
    marginBottom: '8px',
  },
  resultNote: {
    fontSize: '13px',
    color: 'rgba(245,240,232,0.6)',
  },
  resultSuggestion: {
    fontSize: '13px',
    color: 'rgba(245,158,11,0.9)',
  },
  resultInconsistent: {
    fontSize: '13px',
    color: 'rgba(239,68,68,0.9)',
    fontStyle: 'italic' as const,
  },
  practiceSection: {
    padding: '24px',
    background: 'rgba(201,168,76,0.05)',
    border: '1px solid rgba(201,168,76,0.15)',
    borderRadius: 0,
    marginBottom: '32px',
  },
  practiceTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#f5f0e8',
    marginBottom: '12px',
  },
  practiceList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  practiceItem: {
    fontSize: '13px',
    color: 'rgba(245,240,232,0.7)',
    marginBottom: '8px',
    paddingLeft: '16px',
    borderLeft: '2px solid rgba(201,168,76,0.3)',
  },
  completeActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '32px',
  },
  primaryButton: {
    padding: '16px 32px',
    background: '#C9A84C',
    color: '#0a0a0a',
    border: 'none',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '16px 32px',
    background: 'transparent',
    color: '#C9A84C',
    border: '1px solid #C9A84C',
    fontSize: '15px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};