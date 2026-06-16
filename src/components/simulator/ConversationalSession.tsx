/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { speakQuestion, resumeAudioContext } from '@/lib/groq-tts';
import { saveSimulatorAnswer, completeSimulatorSession, generateCoachingSummary } from '@/lib/simulator-engine';
import type { SimulatorContext, Question, AnswerEvaluation, CoachingSummary, CompletedSession } from '@/types/simulator';

// =============================================================================
// TYPES
// =============================================================================

type Phase = 'ready' | 'intro' | 'questions';

type ConvState =
  | 'speaking'     // AI is speaking
  | 'listening'    // Mic is open, VAD active
  | 'processing'   // Audio captured, transcribing
  | 'evaluating'   // Transcript received, evaluating (questions phase only)
  | 'feedback'     // Evaluation returned (questions phase only)
  | 'error';

interface ConversationalSessionProps {
  context: SimulatorContext;
  session: { id: string; sessionNumber: number };
  questions: Question[];
  userId: string;
  applicationId: string;
  onComplete: (summary: CoachingSummary, sessionNumber: number) => void;
  onExit: () => void;
}

// VAD tuning
const SILENCE_THRESHOLD = 16;
const SPEECH_THRESHOLD = 22;
const SILENCE_AFTER_SPEECH_MS = 2000;
const MIN_RECORDING_BYTES = 2000;
const MAX_RECORDING_MS = 180_000;

// =============================================================================
// INTRO SCRIPT BUILDERS
// =============================================================================

function buildWelcomeText(ctx: SimulatorContext): string {
  const h = new Date().getHours();
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const location = ctx.targetState || 'the United States';
  return `Good ${tod}. Welcome, and please take a seat. My name is Officer Williams, and I will be conducting your E-2 visa interview today. I understand you are here in connection with a business based in ${location}. Before we begin the formal portion of the interview, I would like to get to know you a little. Could you please introduce yourself? Just tell me your name and give me a brief overview of your business.`;
}

function buildAcknowledgmentText(ctx: SimulatorContext): string {
  const bizName = ctx.businessName || 'your business';
  return `Thank you, I appreciate that. I can see your application relates to ${bizName}. I have had an opportunity to review your file, and I have a series of questions to go through with you today. Please take your time with each answer and be as specific as you can. Let us begin.`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function ConversationalSession({
  context,
  session,
  questions,
  userId,
  applicationId,
  onComplete,
  onExit,
}: ConversationalSessionProps) {
  // Phase management
  const [phase, setPhaseState] = useState<Phase>('ready');
  const phaseRef = useRef<Phase>('ready');
  function setPhase(p: Phase) {
    phaseRef.current = p;
    setPhaseState(p);
  }

  const [convState, setConvState] = useState<ConvState>('speaking');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [evaluation, setEvaluation] = useState<AnswerEvaluation | null>(null);
  const submittedAnswersRef = useRef<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [autoAdvanceSec, setAutoAdvanceSec] = useState<number | null>(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(15 * 60);
  const [timerWarning, setTimerWarning] = useState(false);
  const [vadLevel, setVadLevel] = useState(0);
  const [muted, setMuted] = useState(false);
  const [micBlocked, setMicBlocked] = useState(false);

  // Ready screen state
  const [speakerTested, setSpeakerTested] = useState(false);
  const [speakerTesting, setSpeakerTesting] = useState(false);
  const [micTested, setMicTested] = useState(false);
  const [micTestError, setMicTestError] = useState(false);
  const [speakerConfirmPending, setSpeakerConfirmPending] = useState(false);
  const [micTesting, setMicTesting] = useState(false);
  const [micTestLevel, setMicTestLevel] = useState(0);
  const [micTestPeakDetected, setMicTestPeakDetected] = useState(false);

  // What the officer is currently saying (displayed as subtitles in intro phase)
  const [introOfficerText, setIntroOfficerText] = useState('');

  // Audio refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const hasSpeechRef = useRef(false);
  const recordingStartRef = useRef<number>(0);
  const mtStreamRef = useRef<MediaStream | null>(null);
  const mtCtxRef = useRef<AudioContext | null>(null);
  const mtAnimRef = useRef<number | null>(null);

  // Timer refs
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoAdvanceRef = useRef<NodeJS.Timeout | null>(null);

  const deadRef = useRef(false);
  const mutableMuted = useRef(muted);
  useEffect(() => { mutableMuted.current = muted; }, [muted]);

  const question = questions[questionIdx];
  const isLastQuestion = questionIdx >= questions.length - 1;

  // ─── Mount / unmount ────────────────────────────────────────────────────────
  // Timer is started inside handleBeginInterview when the user explicitly begins.
  useEffect(() => {
    deadRef.current = false;
    return () => {
      deadRef.current = true;
      stopMic();
      stopMicTest();
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
      if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Question phase driver — fires when questionIdx or phase changes ────────
  useEffect(() => {
    if (phaseRef.current !== 'questions') return;
    if (deadRef.current) return;

    setConvState('speaking');
    setTranscript('');
    setEvaluation(null);
    setErrorMsg(null);
    setAutoAdvanceSec(null);

    let cancelled = false;

    async function run() {
      if (!mutableMuted.current) {
        try { await speakQuestion(question.text); } catch { /* silent */ }
      }
      if (cancelled || deadRef.current) return;
      await openMic();
    }

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionIdx, phase]);

  // ─── Intro flow ────────────────────────────────────────────────────────────
  async function runIntro() {
    if (deadRef.current) return;

    // Step 1: Officer gives welcome + asks them to introduce themselves
    const welcomeText = buildWelcomeText(context);
    setIntroOfficerText(welcomeText);
    setConvState('speaking');

    if (!mutableMuted.current) {
      try { await speakQuestion(welcomeText); } catch { /* silent */ }
    }
    if (deadRef.current) return;

    // Step 2: Open mic — user introduces themselves
    await openMic();
    // openMic returns immediately; handleRecordingComplete will take over
    // When recording ends, phaseRef.current === 'intro' → triggers acknowledgment + transition
  }

  // ─── Ready screen handlers ─────────────────────────────────────────────────

  async function handleTestSpeaker() {
    setSpeakerTesting(true);
    setSpeakerConfirmPending(false);
    try {
      // Resume the shared TTS AudioContext during this user gesture — unlocks it for the session
      await resumeAudioContext();
      // Play a local 440 Hz tone: instant, no network call, proves speakers work
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
      await new Promise<void>(resolve => {
        osc.onended = () => { ctx.close().catch(() => {}); resolve(); };
      });
    } catch { /* silent */ } finally {
      setSpeakerTesting(false);
      setSpeakerConfirmPending(true);
    }
  }

  async function handleTestMic() {
    setMicTestError(false);
    setMicTestPeakDetected(false);
    setMicTestLevel(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mtStreamRef.current = stream;
      setMicTesting(true);

      const ctx = new AudioContext();
      mtCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);

      const dataArr = new Uint8Array(analyser.frequencyBinCount);
      let peakDetected = false;

      function mtTick() {
        if (!mtStreamRef.current) return;
        analyser.getByteFrequencyData(dataArr);
        const rms = Math.sqrt(dataArr.reduce((s, v) => s + v * v, 0) / dataArr.length);
        const level = Math.min(1, rms / 80);
        setMicTestLevel(level);
        if (rms > SPEECH_THRESHOLD && !peakDetected) {
          peakDetected = true;
          setMicTestPeakDetected(true);
        }
        mtAnimRef.current = requestAnimationFrame(mtTick);
      }

      mtAnimRef.current = requestAnimationFrame(mtTick);
    } catch {
      setMicTestError(true);
    }
  }

  function stopMicTest() {
    if (mtAnimRef.current) { cancelAnimationFrame(mtAnimRef.current); mtAnimRef.current = null; }
    if (mtStreamRef.current) { mtStreamRef.current.getTracks().forEach(t => t.stop()); mtStreamRef.current = null; }
    if (mtCtxRef.current) { try { mtCtxRef.current.close(); } catch { /* ignore */ } mtCtxRef.current = null; }
    setMicTestLevel(0);
  }

  function handleMicTestDone() {
    stopMicTest();
    setMicTesting(false);
    setMicTested(true);
  }

  function handleBeginInterview() {
    // Resume the shared TTS AudioContext during this user gesture.
    // Once resumed, it stays 'running' regardless of async gaps — bypasses Chrome autoplay policy.
    resumeAudioContext().catch(() => {});
    // Start the 15-minute timer now (not on mount)
    sessionTimerRef.current = setInterval(() => {
      setSessionTimeLeft(prev => {
        if (prev <= 121) setTimerWarning(true);
        if (prev <= 1) {
          if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
          finishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setPhase('intro');
    runIntro();
  }

  // ─── Mic utilities ─────────────────────────────────────────────────────────
  function stopMic() {
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch { /* ignore */ } audioCtxRef.current = null; }
    setVadLevel(0);
  }

  async function openMic() {
    if (deadRef.current) return;
    stopMic();
    setConvState('listening');

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicBlocked(true);
      setErrorMsg('Microphone access denied. Please allow access in your browser settings, then refresh.');
      setConvState('error');
      return;
    }

    if (deadRef.current) { stream.getTracks().forEach(t => t.stop()); return; }

    streamRef.current = stream;

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);

    chunksRef.current = [];
    hasSpeechRef.current = false;
    silenceStartRef.current = null;
    recordingStartRef.current = Date.now();

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (!deadRef.current) handleRecordingComplete();
    };

    recorder.start(100);

    const dataArr = new Uint8Array(analyser.frequencyBinCount);

    function vadTick() {
      if (deadRef.current || recorder.state === 'inactive') return;

      if (Date.now() - recordingStartRef.current > MAX_RECORDING_MS) { recorder.stop(); return; }

      analyser.getByteFrequencyData(dataArr);
      const rms = Math.sqrt(dataArr.reduce((s, v) => s + v * v, 0) / dataArr.length);
      const level = Math.min(1, rms / 80);
      setVadLevel(level);

      if (rms > SPEECH_THRESHOLD) {
        hasSpeechRef.current = true;
        silenceStartRef.current = null;
      } else if (rms < SILENCE_THRESHOLD && hasSpeechRef.current) {
        if (!silenceStartRef.current) silenceStartRef.current = Date.now();
        if (Date.now() - silenceStartRef.current >= SILENCE_AFTER_SPEECH_MS) {
          recorder.stop();
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(vadTick);
    }

    animFrameRef.current = requestAnimationFrame(vadTick);
  }

  // ─── After recording ends ─────────────────────────────────────────────────
  async function handleRecordingComplete() {
    setVadLevel(0);
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

    if (blob.size < MIN_RECORDING_BYTES) {
      if (!deadRef.current) await openMic();
      return;
    }

    // ── INTRO PHASE: skip evaluation, speak acknowledgment, transition ──
    if (phaseRef.current === 'intro') {
      const ackText = buildAcknowledgmentText(context);
      setIntroOfficerText(ackText);
      setConvState('speaking');

      if (!mutableMuted.current) {
        try { await speakQuestion(ackText); } catch { /* silent */ }
      } else {
        // Even muted, show text for ~2s so the user knows to expect questions
        await new Promise(r => setTimeout(r, 2000));
      }

      if (deadRef.current) return;
      setPhase('questions');
      return;
    }

    // ── QUESTIONS PHASE: full transcribe → evaluate → feedback flow ──
    setConvState('processing');

    let answerText = '';
    try {
      const form = new FormData();
      form.append('file', blob, 'answer.webm');
      const res = await fetch('/api/simulator/transcribe', { method: 'POST', body: form });
      if (!res.ok) throw new Error('transcription failed');
      const data = await res.json();
      answerText = (data.text || '').trim();
    } catch {
      setErrorMsg('Transcription failed. Tap "Try again" to re-record.');
      setConvState('error');
      return;
    }

    if (!answerText || answerText.split(' ').length < 3) {
      if (!deadRef.current) await openMic();
      return;
    }

    setTranscript(answerText);
    if (deadRef.current) return;

    setConvState('evaluating');
    let evalData: AnswerEvaluation;
    try {
      const res = await fetch('/api/simulator/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: question.id,
          questionText: question.text,
          answer: answerText,
          context,
        }),
      });
      if (!res.ok) throw new Error('evaluation failed');
      evalData = await res.json();
    } catch {
      setErrorMsg('Evaluation failed. Tap "Try again" to re-record.');
      setConvState('error');
      return;
    }

    try {
      await saveSimulatorAnswer(
        session.id, question.id, question.text, answerText,
        evalData.rating, evalData.feedback, evalData.specificSuggestion, evalData.documentReference,
      );
    } catch { /* non-fatal */ }

    submittedAnswersRef.current = [...submittedAnswersRef.current, {
      questionId: question.id, questionText: question.text, answerText,
      rating: evalData.rating, feedback: evalData.feedback, specificSuggestion: evalData.specificSuggestion,
    }];

    if (deadRef.current) return;
    setEvaluation(evalData);
    setConvState('feedback');

    let sec = 6;
    setAutoAdvanceSec(sec);
    autoAdvanceRef.current = setInterval(() => {
      sec -= 1;
      setAutoAdvanceSec(sec);
      if (sec <= 0) advance();
    }, 1000);
  }

  // ─── Advance to next question ──────────────────────────────────────────────
  const advance = useCallback(() => {
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    setAutoAdvanceSec(null);
    if (isLastQuestion) { finishSession(); } else { setQuestionIdx(prev => prev + 1); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastQuestion, questionIdx]);

  // ─── Finish session ────────────────────────────────────────────────────────
  function finishSession() {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (autoAdvanceRef.current) clearInterval(autoAdvanceRef.current);
    stopMic();

    const completedSession: CompletedSession = {
      id: session.id, applicationId, userId,
      startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
      sessionNumber: session.sessionNumber, mode: 'voice',
      readinessIndicator: 'nearly_ready', questions: submittedAnswersRef.current,
    };
    const summary = generateCoachingSummary(completedSession, context);
    completeSimulatorSession(session.id, summary.readinessIndicator).catch(() => {});
    setTimeout(() => onComplete(summary, session.sessionNumber), 50);
  }

  // ─── Manual controls ────────────────────────────────────────────────────────
  function handleManualStop() {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  function handleReplay() {
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    stopMic();
    setEvaluation(null);
    setTranscript('');
    setConvState('speaking');
    speakQuestion(question.text)
      .catch(() => {})
      .finally(() => { if (!deadRef.current) openMic(); });
  }

  function handleSkip() {
    if (autoAdvanceRef.current) { clearInterval(autoAdvanceRef.current); autoAdvanceRef.current = null; }
    stopMic();
    advance();
  }

  function handleRetry() {
    setErrorMsg(null);
    if (!deadRef.current) openMic();
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const stateLabel: Record<ConvState, string> = {
    speaking: 'Officer is speaking…',
    listening: 'Listening…',
    processing: 'Transcribing…',
    evaluating: 'Evaluating your answer…',
    feedback: '',
    error: '',
  };

  const ratingColor: Record<string, string> = {
    strong: '#22c55e', weak: '#f59e0b', inconsistent: '#ef4444',
  };
  const ratingLabel: Record<string, string> = {
    strong: '✓ Strong answer', weak: '⚠ Needs more detail', inconsistent: '✗ Inconsistency detected',
  };

  // ─── Listening bars ─────────────────────────────────────────────────────────
  const BAR_COUNT = 7;
  function ListeningBars() {
    return (
      <div style={bars.container}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const active = convState === 'listening';
          const phase_v = i / BAR_COUNT;
          const amplitude = active ? Math.max(0.08, vadLevel * (0.5 + 0.5 * Math.sin(phase_v * Math.PI))) : 0.08;
          return (
            <div key={i} style={{
              ...bars.bar,
              height: `${8 + amplitude * 56}px`,
              background: active ? `rgba(201,168,76,${0.3 + amplitude * 0.7})` : 'rgba(201,168,76,0.2)',
              transition: active ? 'height 0.08s ease, background 0.08s ease' : 'none',
            }} />
          );
        })}
      </div>
    );
  }

  const MIC_BAR_COUNT = 7;
  function MicMeter({ level }: { level: number }) {
    return (
      <div style={bars.container}>
        {Array.from({ length: MIC_BAR_COUNT }).map((_, i) => {
          const phaseV = i / MIC_BAR_COUNT;
          const amplitude = Math.max(0.08, level * (0.5 + 0.5 * Math.sin(phaseV * Math.PI)));
          return (
            <div key={i} style={{
              ...bars.bar,
              height: `${8 + amplitude * 56}px`,
              background: `rgba(201,168,76,${0.3 + amplitude * 0.7})`,
              transition: 'height 0.08s ease, background 0.08s ease',
            }} />
          );
        })}
      </div>
    );
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* ── Top bar ── */}
      <div style={styles.topBar}>
        <div style={styles.topBarLeft}>
          <span style={styles.eyebrow}>INTERVIEW SIMULATOR</span>
          {phase === 'ready' ? (
            <span style={styles.introPill}>PRE-SESSION</span>
          ) : phase === 'intro' ? (
            <span style={styles.introPill}>INTRODUCTION</span>
          ) : (
            <span style={styles.questionPill}>Q {questionIdx + 1} / {questions.length}</span>
          )}
        </div>
        <div style={styles.topBarRight}>
          <button style={styles.muteButton} onClick={() => setMuted(m => !m)} title={muted ? 'Unmute officer voice' : 'Mute officer voice'}>
            {muted ? '🔇' : '🔊'}
          </button>
          {phase !== 'ready' && (
            <span style={{ ...styles.timerLabel, color: timerWarning ? 'rgba(239,68,68,0.9)' : 'rgba(245,240,232,0.4)' }}>
              {fmt(sessionTimeLeft)}
            </span>
          )}
          <button style={styles.endButton} onClick={() => { stopMic(); onExit(); }}>
            End session
          </button>
        </div>
      </div>

      {/* ── Progress bar (hidden during intro) ── */}
      <div style={styles.progressTrack}>
        {phase === 'questions' && (
          <div style={{ ...styles.progressFill, width: `${((questionIdx + 1) / questions.length) * 100}%` }} />
        )}
      </div>

      {timerWarning && (
        <div style={styles.timerBanner}>2 minutes remaining — wrap up your current answer</div>
      )}

      {/* ── Main content ── */}
      <div style={styles.main}>

        {/* ══════════════════════════════════════════════════════════
            READY PHASE — device check + begin button
        ══════════════════════════════════════════════════════════ */}
        {phase === 'ready' && (
          <div style={styles.readyContainer}>
            {/* Officer preview */}
            <div style={styles.officerHeader}>
              <div style={styles.officerAvatar}>OW</div>
              <div>
                <div style={styles.officerName}>Officer Williams</div>
                <div style={styles.officerTitle}>U.S. Embassy — E-2 Visa Division</div>
              </div>
            </div>

            <div>
              <div style={styles.readyHeading}>Before we begin</div>
              <p style={styles.readySubtext}>
                Officer Williams will open the session by voice and ask you to
                introduce yourself. Check that your speakers and microphone are
                ready before starting.
              </p>
            </div>

            <div style={styles.deviceChecks}>
              {/* Speaker: idle → playing → confirm → done */}
              {!speakerTesting && !speakerTested && !speakerConfirmPending && (
                <button style={styles.checkButton} onClick={handleTestSpeaker}>
                  ♪  Test speakers
                </button>
              )}
              {speakerTesting && (
                <div style={styles.checkButtonActive}>♪  Playing tone…</div>
              )}
              {speakerConfirmPending && !speakerTested && (
                <div style={styles.confirmCard}>
                  <p style={styles.confirmPrompt}>Did you hear the tone?</p>
                  <div style={styles.confirmRow}>
                    <button style={styles.confirmYes} onClick={() => { setSpeakerConfirmPending(false); setSpeakerTested(true); }}>
                      Yes, heard it
                    </button>
                    <button style={styles.confirmNo} onClick={() => setSpeakerConfirmPending(false)}>
                      No — try again
                    </button>
                  </div>
                </div>
              )}
              {speakerTested && (
                <div style={styles.checkButtonDone}>✓  Speaker confirmed</div>
              )}

              {/* Mic: idle → testing (live meter) → done */}
              <div>
                {!micTesting && !micTested && (
                  <button style={styles.checkButton} onClick={handleTestMic}>
                    🎙  Test microphone
                  </button>
                )}
                {micTesting && (
                  <div style={styles.micTestCard}>
                    <div style={styles.micTestLabel}>
                      {micTestPeakDetected ? '✓  Voice detected' : 'Speak a few words…'}
                    </div>
                    <MicMeter level={micTestLevel} />
                    <button style={styles.micDoneButton} onClick={handleMicTestDone}>
                      Done →
                    </button>
                  </div>
                )}
                {micTested && (
                  <div style={styles.checkButtonDone}>✓  Microphone ready</div>
                )}
                {micTestError && !micTesting && !micTested && (
                  <p style={styles.micError}>
                    Microphone access denied. Allow mic access in your browser
                    settings, then try again.
                  </p>
                )}
              </div>
            </div>

            <div style={styles.readyActions}>
              <button style={styles.beginButton} onClick={handleBeginInterview}>
                Begin interview →
              </button>
              <p style={styles.readyNote}>
                The 15-minute session timer starts when you click Begin.
              </p>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            INTRO PHASE
        ══════════════════════════════════════════════════════════ */}
        {phase === 'intro' && (
          <div style={styles.introContainer}>
            {/* Officer identity */}
            <div style={styles.officerHeader}>
              <div style={styles.officerAvatar}>OW</div>
              <div>
                <div style={styles.officerName}>Officer Williams</div>
                <div style={styles.officerTitle}>U.S. Embassy — E-2 Visa Division</div>
              </div>
            </div>

            {/* Officer's speech — displayed as a dialog bubble */}
            {introOfficerText && (
              <div style={styles.officerBubble}>
                <p style={styles.officerBubbleText}>{introOfficerText}</p>
              </div>
            )}

            {/* State indicator */}
            <div style={styles.stateArea}>
              {convState !== 'error' && (
                <div style={styles.stateLabel}>{stateLabel[convState]}</div>
              )}
              {(convState === 'listening' || convState === 'speaking') && <ListeningBars />}

              {convState === 'listening' && (
                <div style={styles.introListeningHint}>
                  Introduce yourself — speak naturally
                </div>
              )}

              {convState === 'error' && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{errorMsg}</p>
                  {!micBlocked && (
                    <button style={styles.retryButton} onClick={handleRetry}>Try again →</button>
                  )}
                </div>
              )}
            </div>

            {/* Manual done speaking (intro) */}
            {convState === 'listening' && (
              <div style={styles.controls}>
                <div style={styles.voiceControls}>
                  <button style={styles.controlStop} onClick={handleManualStop}>
                    ■ Done speaking
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            QUESTIONS PHASE
        ══════════════════════════════════════════════════════════ */}
        {phase === 'questions' && (
          <>
            {/* Question card */}
            <div style={styles.questionCard}>
              <div style={styles.questionCategory}>
                {question.category === 'weak_point_probe' ? 'PROBE QUESTION' :
                 question.category === 'investment_source' ? 'INVESTMENT' :
                 question.category === 'profile_flag' ? 'FLAG' : 'GENERAL'}
              </div>
              <p style={styles.questionText}>{question.text}</p>
              {question.context && (
                <p style={styles.questionContext}>{question.context}</p>
              )}
            </div>

            {/* State display */}
            <div style={styles.stateArea}>
              {convState !== 'feedback' && convState !== 'error' && (
                <div style={styles.stateLabel}>{stateLabel[convState]}</div>
              )}

              {(convState === 'listening' || convState === 'speaking') && <ListeningBars />}

              {(convState === 'processing' || convState === 'evaluating') && (
                <div style={styles.spinnerRow}><div style={styles.spinner} /></div>
              )}

              {transcript && (convState === 'evaluating' || convState === 'feedback') && (
                <div style={styles.transcriptBox}>
                  <div style={styles.transcriptLabel}>YOUR ANSWER</div>
                  <p style={styles.transcriptText}>{transcript}</p>
                </div>
              )}

              {convState === 'feedback' && evaluation && (
                <div style={{ ...styles.feedbackCard, borderLeftColor: ratingColor[evaluation.rating] }}>
                  <div style={{ ...styles.feedbackRating, color: ratingColor[evaluation.rating] }}>
                    {ratingLabel[evaluation.rating]}
                  </div>
                  <p style={styles.feedbackText}>{evaluation.feedback}</p>
                  {evaluation.specificSuggestion && (
                    <div style={styles.suggestionBox}>
                      <strong>Suggestion:</strong> {evaluation.specificSuggestion}
                    </div>
                  )}
                  {evaluation.documentReference && (
                    <p style={styles.docRef}>Reference: {evaluation.documentReference}</p>
                  )}
                </div>
              )}

              {convState === 'error' && (
                <div style={styles.errorBox}>
                  <p style={styles.errorText}>{errorMsg}</p>
                  {!micBlocked && (
                    <button style={styles.retryButton} onClick={handleRetry}>Try again →</button>
                  )}
                </div>
              )}
            </div>

            {/* Controls */}
            <div style={styles.controls}>
              {convState === 'feedback' && (
                <div style={styles.autoAdvanceRow}>
                  {autoAdvanceSec !== null && autoAdvanceSec > 0 && (
                    <span style={styles.autoAdvanceHint}>Next question in {autoAdvanceSec}s</span>
                  )}
                  <button style={styles.nextNowButton} onClick={advance}>
                    {isLastQuestion ? 'Complete session →' : 'Next question →'}
                  </button>
                </div>
              )}

              {(convState === 'listening' || convState === 'speaking') && (
                <div style={styles.voiceControls}>
                  <button style={styles.controlGhost} onClick={handleReplay}>↻ Replay question</button>
                  {convState === 'listening' && (
                    <button style={styles.controlStop} onClick={handleManualStop}>■ Done speaking</button>
                  )}
                  <button style={styles.controlGhost} onClick={handleSkip}>Skip →</button>
                </div>
              )}

              {convState === 'processing' && (
                <p style={styles.processingHint}>Processing your answer…</p>
              )}
            </div>
          </>
        )}
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
    display: 'flex',
    flexDirection: 'column',
    paddingTop: '64px',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(201,168,76,0.08)',
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: '16px' },
  topBarRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  eyebrow: {
    fontSize: '10px', fontWeight: 500, letterSpacing: '0.18em',
    textTransform: 'uppercase' as const, color: '#C9A84C',
  },
  questionPill: { fontSize: '11px', color: 'rgba(245,240,232,0.4)', letterSpacing: '0.06em' },
  introPill: {
    fontSize: '10px', fontWeight: 500, letterSpacing: '0.14em',
    textTransform: 'uppercase' as const, color: 'rgba(245,240,232,0.35)',
  },
  muteButton: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '4px', opacity: 0.7 },
  timerLabel: { fontSize: '13px', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' },
  endButton: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
    color: 'rgba(245,240,232,0.5)', fontSize: '11px', letterSpacing: '0.06em',
    padding: '6px 12px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  progressTrack: { height: '2px', background: 'rgba(245,240,232,0.06)' },
  progressFill: { height: '100%', background: '#C9A84C', transition: 'width 0.4s ease' },
  timerBanner: {
    padding: '10px 24px', background: 'rgba(239,68,68,0.07)',
    borderBottom: '1px solid rgba(239,68,68,0.2)', fontSize: '12px',
    color: 'rgba(239,68,68,0.85)', letterSpacing: '0.06em', textAlign: 'center' as const,
  },
  main: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 24px 40px', maxWidth: '680px', margin: '0 auto', width: '100%',
  },

  // ── Ready ──
  readyContainer: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '32px',
    animation: 'fadeIn 0.5s ease',
  },
  readyHeading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '34px', fontWeight: 300, color: '#f5f0e8',
    lineHeight: 1.1, marginBottom: '12px',
  },
  readySubtext: {
    fontSize: '15px', fontWeight: 300, color: 'rgba(245,240,232,0.55)',
    lineHeight: 1.65, margin: 0,
  },
  deviceChecks: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  checkButton: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.25)',
    color: 'rgba(245,240,232,0.5)', fontSize: '13px', letterSpacing: '0.06em',
    padding: '14px 20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    textAlign: 'left' as const, width: '100%',
  },
  checkButtonActive: {
    background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.2)',
    color: '#C9A84C', fontSize: '13px', letterSpacing: '0.06em',
    padding: '14px 20px', cursor: 'wait', fontFamily: "'DM Sans', sans-serif",
    textAlign: 'left' as const, width: '100%',
  },
  checkButtonDone: {
    background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.25)',
    color: 'rgba(34,197,94,0.85)', fontSize: '13px', letterSpacing: '0.06em',
    padding: '14px 20px', cursor: 'default', fontFamily: "'DM Sans', sans-serif",
    textAlign: 'left' as const, width: '100%',
  },
  micError: {
    fontSize: '12px', color: 'rgba(239,68,68,0.75)',
    margin: '6px 0 0', lineHeight: 1.5,
  },
  confirmCard: {
    padding: '16px 20px',
    background: 'rgba(201,168,76,0.04)',
    border: '1px solid rgba(201,168,76,0.2)',
  },
  confirmPrompt: {
    fontSize: '13px', color: 'rgba(245,240,232,0.6)',
    margin: '0 0 12px', letterSpacing: '0.04em',
  },
  confirmRow: { display: 'flex', gap: '10px' },
  confirmYes: {
    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
    color: 'rgba(34,197,94,0.85)', fontSize: '13px', padding: '8px 18px',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em',
  },
  confirmNo: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
    color: 'rgba(245,240,232,0.4)', fontSize: '13px', padding: '8px 18px',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em',
  },
  micTestCard: {
    padding: '16px 20px',
    background: 'rgba(201,168,76,0.03)',
    border: '1px solid rgba(201,168,76,0.15)',
    display: 'flex', flexDirection: 'column' as const, gap: '12px',
  },
  micTestLabel: {
    fontSize: '12px', color: 'rgba(245,240,232,0.5)', letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  micDoneButton: {
    alignSelf: 'flex-start' as const,
    background: 'transparent', border: '1px solid rgba(201,168,76,0.3)',
    color: '#C9A84C', fontSize: '12px', letterSpacing: '0.06em',
    padding: '8px 16px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  readyActions: {
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  beginButton: {
    background: '#C9A84C', border: 'none', color: '#0a0a0a',
    fontSize: '16px', fontWeight: 500, padding: '18px 40px',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    letterSpacing: '0.02em',
  },
  readyNote: {
    fontSize: '11px', color: 'rgba(245,240,232,0.25)', margin: 0,
    letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  },

  // ── Intro ──
  introContainer: {
    width: '100%', display: 'flex', flexDirection: 'column', gap: '32px',
    animation: 'fadeIn 0.5s ease',
  },
  officerHeader: {
    display: 'flex', alignItems: 'center', gap: '16px',
  },
  officerAvatar: {
    width: '48px', height: '48px', borderRadius: '50%',
    background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', fontWeight: 600, color: '#C9A84C', letterSpacing: '0.04em',
    flexShrink: 0,
  },
  officerName: { fontSize: '15px', fontWeight: 500, color: '#f5f0e8', letterSpacing: '0.02em' },
  officerTitle: { fontSize: '11px', color: 'rgba(245,240,232,0.35)', letterSpacing: '0.04em', marginTop: '2px' },
  officerBubble: {
    padding: '28px 32px',
    background: 'rgba(201,168,76,0.03)',
    border: '1px solid rgba(201,168,76,0.12)',
    borderLeft: '3px solid rgba(201,168,76,0.4)',
  },
  officerBubbleText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: '24px', fontWeight: 300, fontStyle: 'italic' as const,
    color: '#f5f0e8', lineHeight: 1.5, margin: 0,
  },
  introListeningHint: {
    fontSize: '12px', color: 'rgba(245,240,232,0.25)', letterSpacing: '0.08em',
    textAlign: 'center' as const, marginTop: '4px',
  },

  // ── Question ──
  questionCard: {
    width: '100%', padding: '32px',
    background: 'rgba(201,168,76,0.02)', border: '1px solid rgba(201,168,76,0.12)',
    marginBottom: '40px',
  },
  questionCategory: {
    fontSize: '9px', fontWeight: 600, letterSpacing: '0.18em',
    textTransform: 'uppercase' as const, color: 'rgba(201,168,76,0.5)', marginBottom: '14px',
  },
  questionText: {
    fontFamily: "'Cormorant Garamond', serif", fontSize: '30px', fontWeight: 300,
    fontStyle: 'italic' as const, color: '#f5f0e8', lineHeight: 1.35, margin: 0,
  },
  questionContext: {
    marginTop: '16px', padding: '12px 16px',
    background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.08)',
    fontSize: '12px', color: 'rgba(245,240,232,0.45)', lineHeight: 1.6, margin: '16px 0 0',
  },

  // ── State area (shared) ──
  stateArea: {
    width: '100%', minHeight: '200px',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '24px',
  },
  stateLabel: {
    fontSize: '12px', fontWeight: 400, letterSpacing: '0.1em',
    color: 'rgba(245,240,232,0.35)', textTransform: 'uppercase' as const,
  },

  spinnerRow: { display: 'flex', justifyContent: 'center', padding: '8px 0' },
  spinner: {
    width: '28px', height: '28px',
    border: '2px solid rgba(201,168,76,0.15)', borderTop: '2px solid #C9A84C',
    borderRadius: '50%', animation: 'spin 1s linear infinite',
  },

  transcriptBox: {
    width: '100%', padding: '20px 24px',
    background: 'rgba(245,240,232,0.03)', border: '1px solid rgba(245,240,232,0.08)',
  },
  transcriptLabel: {
    fontSize: '9px', fontWeight: 600, letterSpacing: '0.16em',
    textTransform: 'uppercase' as const, color: 'rgba(245,240,232,0.3)', marginBottom: '10px',
  },
  transcriptText: {
    fontSize: '15px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.65, margin: 0, fontStyle: 'italic' as const,
  },

  feedbackCard: {
    width: '100%', padding: '24px',
    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(201,168,76,0.1)',
    borderLeft: '3px solid #C9A84C',
  },
  feedbackRating: { fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em', marginBottom: '10px' },
  feedbackText: { fontSize: '14px', color: 'rgba(245,240,232,0.7)', lineHeight: 1.65, margin: 0 },
  suggestionBox: {
    marginTop: '14px', padding: '12px 16px',
    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)',
    fontSize: '13px', color: 'rgba(245,240,232,0.75)', lineHeight: 1.6,
  },
  docRef: { marginTop: '10px', fontSize: '11px', color: 'rgba(245,240,232,0.35)', fontStyle: 'italic' as const },

  errorBox: {
    width: '100%', padding: '24px',
    background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)',
    textAlign: 'center' as const,
  },
  errorText: { fontSize: '14px', color: 'rgba(239,68,68,0.8)', lineHeight: 1.6, margin: '0 0 16px' },
  retryButton: {
    background: 'transparent', border: '1px solid rgba(239,68,68,0.4)',
    color: 'rgba(239,68,68,0.8)', fontSize: '13px', padding: '8px 20px',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },

  controls: { width: '100%', marginTop: '32px' },
  voiceControls: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const },
  controlGhost: {
    background: 'transparent', border: '1px solid rgba(201,168,76,0.2)',
    color: 'rgba(245,240,232,0.5)', fontSize: '12px', letterSpacing: '0.06em',
    padding: '10px 20px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  controlStop: {
    background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.35)',
    color: '#C9A84C', fontSize: '13px', letterSpacing: '0.04em',
    padding: '12px 28px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
  },
  autoAdvanceRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '20px', flexWrap: 'wrap' as const,
  },
  autoAdvanceHint: { fontSize: '12px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.04em' },
  nextNowButton: {
    background: '#C9A84C', border: 'none', color: '#0a0a0a',
    fontSize: '14px', fontWeight: 500, padding: '14px 32px',
    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
  },
  processingHint: { textAlign: 'center' as const, fontSize: '12px', color: 'rgba(245,240,232,0.3)', letterSpacing: '0.08em' },
};

const bars = {
  container: { display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center', height: '72px' } as React.CSSProperties,
  bar: { width: '4px', borderRadius: '2px', minHeight: '8px' } as React.CSSProperties,
};
