/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react/no-unescaped-entities */
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  buildSimulatorContext,
  generateQuestions,
  evaluateAnswer,
  generateCoachingSummary,
  createSimulatorSession,
  saveSimulatorAnswer,
  completeSimulatorSession,
  checkSessionAvailability,
} from '@/lib/simulator-engine';
import { isGroqConfigured } from '@/lib/groq-transcription';
import { speakQuestion } from '@/lib/groq-tts';
import type { SimulatorContext, Question, AnswerEvaluation, CoachingSummary, CompletedSession } from '@/types/simulator';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  const [screen, setScreen] = useState<'start' | 'active' | 'complete'>('start');
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

  // Check auth and load session availability
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      // Get user's latest application
      const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (app) {
        setApplication(app);
        const availability = await checkSessionAvailability(app.id);
        setSessionInfo(availability);

        // Check if the application has sufficient case file data
        // (Module 3 answers + case brief — the minimum the simulator needs)
        const { data: answers } = await supabase
          .from('answers')
          .select('question_id')
          .eq('application_id', app.id)
          .limit(5);

        const { data: caseBrief } = await supabase
          .from('case_briefs')
          .select('id')
          .eq('application_id', app.id)
          .limit(1);

        setHasCaseFile(
          Boolean(answers && answers.length > 0 && caseBrief && caseBrief.length > 0)
        );
      } else {
        // No application at all — cannot use simulator
        setHasCaseFile(false);
      }
    }
    checkAuth();
  }, [router]);

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

  // Handle successful purchase return
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('purchase') === 'success' && application) {
      checkSessionAvailability(application.id).then(avail => setSessionInfo(avail));
      window.history.replaceState({}, '', '/simulator');
    }
  }, [application]);

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
    if (!application || !sessionInfo?.available) return;

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

      // Start 15-minute session timer
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

  // Submit an answer
  const submitAnswer = async () => {
    if (!currentSession || !context || !currentAnswer.trim()) return;

    setLoading(true);
    const question = questions[currentQuestionIndex];

    try {
      const evaluation = await evaluateAnswer(question, currentAnswer, context);
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

      setSubmittedAnswers(prev => [...prev, {
        questionId: question.id,
        questionText: question.text,
        answerText: currentAnswer,
        rating: evaluation.rating,
        feedback: evaluation.feedback,
        specificSuggestion: evaluation.specificSuggestion,
      }]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    if (currentQuestionIndex >= questions.length - 1) {
      // Session complete
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Render based on screen state
  if (!sessionInfo) {
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
        <SimulatorTeaser />
      </div>
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
          voiceDisabled={!isGroqConfigured()}
          error={error}
          onPurchase={handlePurchase}
          purchaseLoading={purchaseLoading}
        />
      )}

      {screen === 'active' && (
        <ActiveSession
          mode={mode}
          questionNumber={currentQuestionIndex + 1}
          totalQuestions={questions.length}
          question={questions[currentQuestionIndex]}
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
        />
      )}

      {screen === 'complete' && coachingSummary && (
        <SessionComplete
          summary={coachingSummary}
          sessionNumber={currentSession?.sessionNumber}
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

        <div style={styles.sessionCount}>
          Sessions used: <strong>{sessionsPurchased - sessionsRemaining}</strong> of <strong>{sessionsPurchased}</strong> included
        </div>

        {!available && (
          <div style={styles.purchaseBanner}>
            <p style={styles.purchaseText}>You have used all your simulator sessions.</p>
            <button
              style={purchaseLoading ? {...styles.purchaseButton, cursor: 'wait'} : styles.purchaseButton}
              onClick={onPurchase}
              disabled={purchaseLoading}
            >
              {purchaseLoading ? 'Redirecting...' : 'Purchase additional sessions — $29.99'}
            </button>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        {available && (
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

        <Link href="/dashboard" style={styles.backLink}>
          ← Back to Dashboard
        </Link>
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
}) {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

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
              <span style={{
                ...styles.timerDisplay,
                color: timerWarning ? 'rgba(239,68,68,0.9)' : 'rgba(245,240,232,0.4)',
              }}>
                {formatTime(sessionTimeLeft)}
              </span>
            </div>
            <div style={styles.progressBar}>
              <div style={{...styles.progressFill, width: `${(questionNumber / totalQuestions) * 100}%`}} />
            </div>
          </div>

          {timerWarning && (
            <div style={styles.timerWarning}>
              2 minutes remaining — complete your current answer
            </div>
          )}

          <div style={styles.questionText}>{question.text}</div>

          {question.context && (
            <div style={styles.questionContext}>
              {question.context}
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
                    <div style={styles.evaluationHeader}>
                      {evaluation.rating === 'strong' && '✓ Strong answer'}
                      {evaluation.rating === 'weak' && '⚠ Needs more detail'}
                      {evaluation.rating === 'inconsistent' && '✗ Inconsistency detected'}
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
            />
          )}
        </div>
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
}: {
  answer: string;
  onAnswerChange: (v: string) => void;
  evaluation: AnswerEvaluation | null;
  onSubmit: () => void;
  onNext: () => void;
  loading: boolean;
  isLastQuestion: boolean;
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
            <div style={styles.evaluationHeader}>
              {evaluation.rating === 'strong' && '✓ Strong answer'}
              {evaluation.rating === 'weak' && '⚠ Needs more detail'}
              {evaluation.rating === 'inconsistent' && '✗ Inconsistency detected'}
            </div>
            <p style={styles.evaluationFeedback}>{evaluation.feedback}</p>
          </div>

          <button style={styles.nextButton} onClick={onNext}>
            {isLastQuestion ? 'Complete session →' : 'Next question →'}
          </button>
        </div>
      )}
    </div>
  );
}

function SessionComplete({
  summary,
  sessionNumber,
  onStartNew,
  onBackToDashboard,
}: {
  summary: CoachingSummary;
  sessionNumber?: number;
  onStartNew: () => void;
  onBackToDashboard: () => void;
}) {
  return (
    <div style={styles.completeContainer}>
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

        {/* Strong Answers */}
        {summary.strongAnswers.length > 0 && (
          <div style={styles.resultSection}>
            <h3 style={styles.resultTitle}>
              <span style={styles.resultIcon}>✓</span> Strong answers
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

        {/* Needs Work */}
        {summary.needsWork.length > 0 && (
          <div style={styles.resultSection}>
            <h3 style={{...styles.resultTitle, color: '#f59e0b'}}>
              <span style={styles.resultIcon}>⚠</span> Needs more detail
            </h3>
            <ul style={styles.resultList}>
              {summary.needsWork.map((item, i) => (
                <li key={i} style={styles.resultItem}>
                  <div style={styles.resultQuestion}>{item.question}</div>
                  <div style={styles.resultSuggestion}>{item.suggestion}</div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Inconsistencies */}
        {summary.inconsistencies.length > 0 && (
          <div style={styles.resultSection}>
            <h3 style={{...styles.resultTitle, color: '#ef4444'}}>
              <span style={styles.resultIcon}>✗</span> Inconsistencies to resolve
            </h3>
            <ul style={styles.resultList}>
              {summary.inconsistencies.map((item, i) => (
                <li key={i} style={styles.resultItem}>
                  <div style={styles.resultQuestion}>{item.question}</div>
                  <div style={styles.resultInconsistent}>
                    Your answer: "{item.spoken}"
                    <br />
                    Filed: {item.filed}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Practice Next */}
        {summary.weakPointsAtRisk.length > 0 && (
          <div style={styles.practiceSection}>
            <h4 style={styles.practiceTitle}>Practice these questions next</h4>
            <ul style={styles.practiceList}>
              {summary.weakPointsAtRisk.slice(0, 3).map((q, i) => (
                <li key={i} style={styles.practiceItem}>{q}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={styles.completeActions}>
          <button style={styles.primaryButton} onClick={onStartNew}>
            Start another session
          </button>
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

function SimulatorTeaser() {
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
          Pressure-Test Your Interview Readiness
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
            To unlock the simulator, complete your case file in Module 3 — your
            business details, investment data, and supporting information. The more
            complete your filing, the more realistic and useful your practice sessions
            will be.
          </p>
        </div>

        {/* CTA */}
        <a
          href="/apply"
          style={{
            display: 'inline-block',
            padding: '16px 32px',
            background: '#C9A84C',
            color: '#0a0a0a',
            fontSize: '15px',
            fontWeight: 500,
            textDecoration: 'none',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Complete your case file →
        </a>

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
    color: 'rgba(245,240,232,0.5)',
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
    color: 'rgba(245,240,232,0.4)',
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
    color: 'rgba(245,240,232,0.5)',
  },
  modeTooltip: {
    fontSize: '11px',
    color: 'rgba(245,240,232,0.4)',
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
    color: 'rgba(245,240,232,0.5)',
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
    color: 'rgba(245,240,232,0.4)',
  },
  wordHint: {
    color: 'rgba(245,240,232,0.3)',
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
    color: 'rgba(245,240,232,0.5)',
    fontStyle: 'italic' as const,
  },
  nextButton: {
    marginTop: '24px',
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