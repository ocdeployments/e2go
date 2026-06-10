# E2go — Session: Interview Simulator Completion
## Session file for Claude Code
**Date:** June 9, 2026
**Branch:** dev
**Estimated time:** 3–4 hours
**Status:** Ready to build

---

## BEFORE YOU START — READ IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/INTERVIEW_SIMULATOR_SPEC.md
```

Then read the existing simulator files to understand exactly what is built:

```bash
cat src/app/simulator/page.tsx
cat src/lib/simulator-engine.ts
cat src/lib/groq-transcription.ts
cat src/types/simulator.ts
cat src/app/simulator/layout.tsx
```

Do not write a single line of code until all of the above are read.
Confirm reading complete before proceeding.

---

## GROUND RULES

1. No rounded corners anywhere — zero border-radius on everything.
2. No emoji icons — replace with Tabler icons or text.
3. No glassmorphism, no gradients, no shadows.
4. Design system: #0a0a0a background, #C9A84C gold, #f5f0e8 text.
5. Read DESIGN_REFERENCE.html before touching any styles.
6. Full output on every modified file — no truncation.
7. No Magic MCP — not available.
8. Test at 390px (mobile) before 1440px (desktop).

---

## WHAT IS ALREADY BUILT — DO NOT REBUILD

The following is confirmed complete and working:

- `/simulator` page — all three screens (start, active, complete)
- `simulator-engine.ts` — context building, question generation,
  answer evaluation via OpenRouter (MiniMax), session management,
  coaching summary generation
- `src/types/simulator.ts` — all interfaces complete
- `simulator_sessions` and `simulator_answers` DB tables — migration
  at supabase/migrations/20260605180000_simulator_tables.sql
- `simulator_sessions_used` and `simulator_sessions_purchased` columns
  on applications table — already in migration
- `STRIPE_PRICE_SIMULATOR_3PACK` env var slot — exists in checkout route
- `GROQ_API_KEY` — already in .env.local
- `groq-transcription.ts` — transcribeAudio() and isGroqConfigured()
  already written using whisper-large-v3-turbo

Do not touch the engine logic, the question generation, the answer
evaluation, or the session management functions. They are working.

---

## WHAT THIS SESSION FIXES AND ADDS

Five tasks in order of priority:

1. Wire Groq transcription into VoiceInput
2. Add Groq TTS for officer voice (text-to-speech)
3. Add 15-minute session timer
4. Update pricing to $29.99, wire Stripe purchase flow
5. Fix design system violations

---

## TASK 1 — WIRE GROQ TRANSCRIPTION INTO VOICE INPUT

**File:** `src/app/simulator/page.tsx`

**Current state:** `VoiceInput` component records audio via MediaRecorder
but `onstop` handler has a placeholder comment instead of calling
`transcribeAudio()`.

**Fix:** Import `transcribeAudio` from `@/lib/groq-transcription` and
call it in the `onstop` handler.

Replace the `onstop` handler inside `VoiceInput.startRecording()`:

```typescript
// REMOVE this placeholder:
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  stream.getTracks().forEach(track => track.stop());
  setRecordedText('[Voice recording captured — transcription not yet configured]');
  onAnswerChange('I will describe my business experience...');
};

// REPLACE WITH:
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
  stream.getTracks().forEach(track => track.stop());
  setTranscribing(true);
  try {
    const transcribedText = await transcribeAudio(blob);
    setRecordedText(transcribedText);
    onAnswerChange(transcribedText);
  } catch (err) {
    console.error('Transcription failed:', err);
    setRecordedText('Transcription failed. Please type your answer below.');
  } finally {
    setTranscribing(false);
  }
};
```

Add `transcribing` state to VoiceInput:
```typescript
const [transcribing, setTranscribing] = useState(false);
```

Add import at top of page.tsx:
```typescript
import { transcribeAudio, isGroqConfigured } from '@/lib/groq-transcription';
```

Update `voiceDisabled` prop in the StartScreen render:
```typescript
voiceDisabled={!isGroqConfigured()}
```

Show transcribing state in UI:
```typescript
{transcribing && (
  <p style={styles.recordHint}>Transcribing...</p>
)}
```

Also: the textarea in VoiceInput after transcription should NOT be
readOnly — the user should be able to edit the transcription before
submitting. Remove `readOnly` from that textarea.

---

## TASK 2 — GROQ TTS FOR OFFICER VOICE

**New file:** `src/lib/groq-tts.ts`

Groq TTS uses the same API key. Model: `playai-tts`.
Voice: `Fritz-PlayAI` (deep, authoritative, officer persona).

```typescript
// Groq TTS Service
// Officer voice for interview simulator
// Uses Groq playai-tts model

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export async function speakQuestion(text: string): Promise<void> {
  if (!GROQ_API_KEY) return;

  try {
    const response = await fetch(`${GROQ_BASE_URL}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'playai-tts',
        input: text,
        voice: 'Fritz-PlayAI',
        response_format: 'mp3',
      }),
    });

    if (!response.ok) {
      console.error('TTS error:', response.status);
      return;
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    // Clean up URL after playback
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  } catch (err) {
    console.error('TTS failed:', err);
    // Fail silently — text is still shown on screen
  }
}

export function isGroqTTSConfigured(): boolean {
  return !!GROQ_API_KEY && GROQ_API_KEY.length > 0;
}
```

**Wire TTS into page.tsx:**

In the `ActiveSession` component, when a new question loads,
automatically speak it if voice mode is active.

Add a `useEffect` in `ActiveSession`:
```typescript
useEffect(() => {
  if (mode === 'voice' && question?.text) {
    speakQuestion(question.text).catch(() => {});
  }
}, [question?.id, mode]);
```

Import at top of page.tsx:
```typescript
import { speakQuestion, isGroqTTSConfigured } from '@/lib/groq-tts';
```

Add a small speaker icon button in the question panel so users can
replay the question audio manually:
```typescript
{mode === 'voice' && isGroqTTSConfigured() && (
  <button
    style={styles.replayButton}
    onClick={() => speakQuestion(question.text)}
    title="Replay question"
  >
    ▶ Replay
  </button>
)}
```

Add to styles:
```typescript
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
```

---

## TASK 3 — 15-MINUTE SESSION TIMER

**File:** `src/app/simulator/page.tsx`

Add timer state to the main component:
```typescript
const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(15 * 60); // 15 minutes in seconds
const [timerWarning, setTimerWarning] = useState(false);
const timerRef = useRef<NodeJS.Timeout | null>(null);
```

Start timer when session starts (in `startSession` after `setScreen('active')`):
```typescript
// Start 15-minute session timer
setSessionTimeLeft(15 * 60);
setTimerWarning(false);
timerRef.current = setInterval(() => {
  setSessionTimeLeft(prev => {
    if (prev <= 120 && !timerWarning) {
      setTimerWarning(true); // fire warning at 2 minutes remaining
    }
    if (prev <= 1) {
      // Time's up — force complete
      clearInterval(timerRef.current!);
      completeSession();
      return 0;
    }
    return prev - 1;
  });
}, 1000);
```

Clear timer when session completes (in `completeSession` before setScreen):
```typescript
if (timerRef.current) {
  clearInterval(timerRef.current);
  timerRef.current = null;
}
```

Also clear on component unmount:
```typescript
useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, []);
```

Pass to ActiveSession:
```typescript
<ActiveSession
  ...existing props...
  sessionTimeLeft={sessionTimeLeft}
  timerWarning={timerWarning}
/>
```

Add to ActiveSession props interface:
```typescript
sessionTimeLeft: number;
timerWarning: boolean;
```

Display timer in ActiveSession question header:
```typescript
// Format time as MM:SS
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
```

Add timer display to question header area:
```typescript
<div style={{
  ...styles.timerDisplay,
  color: timerWarning ? 'rgba(239,68,68,0.9)' : 'rgba(245,240,232,0.4)',
}}>
  {formatTime(sessionTimeLeft)}
</div>
```

Add warning banner when timerWarning is true:
```typescript
{timerWarning && (
  <div style={styles.timerWarning}>
    2 minutes remaining — complete your current answer
  </div>
)}
```

Add to styles:
```typescript
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
```

Update StartScreen to show session duration:
Change the existing subtitle to include:
"Each session is 15 minutes. Your simulator has been personalised
to your specific application and business type."

---

## TASK 4 — PRICING UPDATE AND STRIPE PURCHASE FLOW

### 4A — Update pricing in page.tsx

**Current:** "Purchase 3 more sessions — $9.99" (disabled, "Coming soon")
**New:** "Purchase additional sessions — $29.99" (active, wired to Stripe)

Update the purchase button in `StartScreen`:

```typescript
// Replace the disabled purchase button with:
<button
  style={styles.purchaseButton}
  onClick={onPurchase}
  disabled={purchaseLoading}
>
  {purchaseLoading ? 'Redirecting...' : 'Purchase additional sessions — $29.99'}
</button>
```

Add `onPurchase` and `purchaseLoading` to StartScreen props:
```typescript
onPurchase: () => void;
purchaseLoading: boolean;
```

Add to main component state:
```typescript
const [purchaseLoading, setPurchaseLoading] = useState(false);
```

Add purchase handler in main component:
```typescript
const handlePurchase = async () => {
  if (!application) return;
  setPurchaseLoading(true);
  try {
    const response = await fetch('/api/stripe/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tierId: 'simulator_3pack',
        applicationId: application.id,
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
```

Pass to StartScreen:
```typescript
<StartScreen
  ...existing props...
  onPurchase={handlePurchase}
  purchaseLoading={purchaseLoading}
/>
```

### 4B — Handle purchase success return

Add to the main `useEffect` (after auth check):
```typescript
// Handle successful purchase return
const searchParams = new URLSearchParams(window.location.search);
if (searchParams.get('purchase') === 'success') {
  // Refresh session availability
  if (app) {
    const availability = await checkSessionAvailability(app.id);
    setSessionInfo(availability);
  }
  // Clean URL
  window.history.replaceState({}, '', '/simulator');
}
```

### 4C — Update Stripe price

In `.env.local`, `STRIPE_PRICE_SIMULATOR_3PACK` must be set to the
Stripe Price ID for $29.99.

If not yet created: instruct the agent to note this in the build
summary. The Stripe price needs to be created in the dashboard
at $29.99 for "E2go Interview Simulator — Additional Sessions".
The price ID then goes in `.env.local` as `STRIPE_PRICE_SIMULATOR_3PACK`.

Do NOT hardcode a price ID. If the env var is empty, show the
purchase button as disabled with text "Purchase option coming soon".

---

## TASK 5 — DESIGN SYSTEM FIXES

**File:** `src/app/simulator/page.tsx`

### Fix 1 — Remove all border-radius

Find and remove every instance of `borderRadius` in the styles object.
Specifically:
- `recordButton` has `borderRadius: '50%'` — REMOVE
- `readinessBadge` has implicit rounding — audit and remove
- Any other component with rounded corners

The record button should be a square, not a circle. Update the
`recordCircle` inside it to also be square (remove its borderRadius too).

### Fix 2 — Replace emoji icons

The mode buttons use ⌨️ and 🎤 emoji.
Replace with text labels or Tabler icon classes.

Replace:
```typescript
// REMOVE:
<span style={styles.modeIcon}>⌨️</span>
<span style={styles.modeIcon}>🎤</span>

// REPLACE WITH — text only, styled:
// For text mode button: remove the icon span entirely,
// let the modeTitle and modeDesc carry the card.

// Or use unicode that's not emoji:
// Text mode: no icon needed
// Voice mode: no icon needed
```

The cards read fine without icons. Remove the icon spans entirely
and increase the modeTitle font size slightly to compensate.

### Fix 3 — Progress bar color

The `progressFill` style uses `background: '#C9A84C'` — this is
already correct. Verify it is not overridden anywhere.

### Fix 4 — Evaluation border-radius

The `evaluationBorder` style has `borderLeftWidth: '3px'` with no
`borderRadius` — this is correct. Verify no rounding was added.

### Fix 5 — Start card border

`startCard` uses `border: '1px solid rgba(201,168,76,0.12)'` —
correct. But check it has NO border-radius. Add explicitly:
```typescript
startCard: {
  ...existing,
  borderRadius: 0, // explicit, overrides any defaults
},
```

Apply `borderRadius: 0` explicitly to ALL card-like containers:
startCard, questionPanel, answerPanel, completeCard, evaluationBorder,
suggestionBox, purchaseBanner, transcribedBox.

### Fix 6 — Mobile responsiveness

Add media query handling for 390px.

In `activeGrid`, the current `gridTemplateColumns: '40% 60%'`
stacks poorly on mobile. Add responsive handling:

```typescript
// Detect mobile in component
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
```

Or better — use a CSS-in-JS approach with a window resize listener,
or simply apply a className and use Tailwind breakpoints.

Simplest fix — add a `@media` equivalent using inline conditional:
```typescript
activeGrid: {
  maxWidth: '1200px',
  margin: '0 auto',
  display: 'grid',
  gridTemplateColumns: 'min(400px, 40%) 1fr', // collapses naturally
  gap: '32px',
  minHeight: 'calc(100vh - 48px)',
},
```

For true mobile stack: add a viewport width check with useState:
```typescript
const [isMobile, setIsMobile] = useState(false);
useEffect(() => {
  const check = () => setIsMobile(window.innerWidth < 768);
  check();
  window.addEventListener('resize', check);
  return () => window.removeEventListener('resize', check);
}, []);
```

Use in activeGrid:
```typescript
activeGrid: {
  ...styles.activeGrid,
  gridTemplateColumns: isMobile ? '1fr' : '40% 60%',
},
```

Pass `isMobile` to `ActiveSession` and use throughout.

On mobile:
- Question panel comes first, answer panel below
- Both full width
- Minimum padding 16px on mobile vs 32px desktop
- Textarea minimum height 150px
- Submit button full width (already is)

---

## PLAYWRIGHT VERIFICATION

After all five tasks:

```bash
# Start server
pkill -f "next dev" || true && sleep 2 && rm -rf .next && npm run dev &
sleep 15
```

```
Use Playwright to screenshot localhost:3000/simulator at 390px
and 1440px.

Confirm:
- Start screen: no emoji, no rounded corners, timer duration shown,
  purchase button shows correct $29.99 pricing
- Active session: timer visible in question header, question text
  in Cormorant Garamond italic, textarea has no border-radius
- Complete screen: readiness badges have no border-radius,
  action buttons have no border-radius

Test voice mode button click — confirm it is not disabled
(Groq is configured).

Test text mode: type a short answer, submit, confirm evaluation
card appears with feedback.
```

---

## COMMITS

One commit per task:
- `feat: simulator — wire Groq transcription into voice input`
- `feat: simulator — Groq TTS officer voice`
- `feat: simulator — 15-minute session timer with warning`
- `feat: simulator — $29.99 purchase flow wired to Stripe`
- `fix: simulator — design system violations removed`

---

## ON COMPLETION

Update BUILD_TRACKER.md:
- Interview Simulator: ✅ COMPLETE (text + voice modes, TTS, timer, purchase)

Note in build summary:
- If STRIPE_PRICE_SIMULATOR_3PACK is empty in .env.local, the Stripe
  price for $29.99 needs to be created in the Stripe dashboard first.
  Purchase button will show as disabled until this is set.

Run: `npm run build` — must compile clean with zero errors.
