# SESSION — Voice-to-Text Input for Case File Sections
**Date:** June 10, 2026
**Branch:** dev
**Priority:** HIGH — friction reduction, affects all six case file sections
**Estimated time:** 2–3 hours

---

## RULES FOR THIS SESSION

1. Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md first. No exceptions.
2. Read docs/DESIGN_REFERENCE.html before touching any UI file.
3. Complete every step in order. Do not skip steps.
4. Fix errors and continue — do not stop and ask.
5. `npm run build` must be clean before committing.
6. Do not modify /apply/module4 — voice sample capture is a separate
   system and must not be touched.
7. Do not create new status files. Update BUILD_TRACKER.md only.
8. Never truncate file output. Write complete files.

---

## WHAT THIS SESSION BUILDS

A reusable `useSpeechInput` hook that wraps the browser's native
Web Speech API, plus a microphone button integrated into the existing
`TextArea` component. When a user clicks the mic, the browser
transcribes their speech and appends it to the textarea in real time.

**Scope:** TextArea component only. No changes to TextInput, select
fields, currency fields, date fields, or repeating group fields.

**Why TextArea only:** Voice input is for narrative, open-ended
answers. Structured fields (amounts, dates, names, dropdowns) must
remain typed input only.

**Why not Module 4:** /apply/module4 captures a writing voice sample
for document humanization. That is a different purpose — it must
stay exactly as built. This session adds friction-reduction speech
input to Module 3 case file sections only.

---

## STEP 1 — RESEARCH

Use Lazyweb MCP to search for:
  "voice input textarea dark UI microphone button"
  "speech to text button inline form field dark theme"
  "web speech API microphone icon pulse animation"

Study the patterns returned. Note:
- Where mic buttons are positioned relative to the textarea
- How active/listening state is communicated visually
- How graceful degradation is handled (unsupported browser)

Use Firecrawl to scrape UI patterns from:
  https://notion.so (voice/dictation input patterns)

Note how the mic affordance is presented without cluttering the form.

---

## STEP 2 — AUDIT EXISTING TEXTAREA COMPONENT

Find and read the existing TextArea component:
```bash
find src -name "*.tsx" | xargs grep -l "TextArea\|textarea" | head -20
grep -r "TextArea" src/components --include="*.tsx" -l
```

Read the full component file. Understand:
- Current props interface
- How it renders
- How onChange is currently handled
- Where the label and helper text are positioned

Report the file path and current prop interface before writing
any code.

---

## STEP 3 — BUILD THE useSpeechInput HOOK

Create: `src/hooks/useSpeechInput.ts`

The hook must:

1. Check browser support on mount:
   ```
   const supported = typeof window !== 'undefined' &&
     ('SpeechRecognition' in window ||
      'webkitSpeechRecognition' in window)
   ```

2. Expose this interface:
   ```typescript
   {
     supported: boolean        // false hides the mic button entirely
     listening: boolean        // true while actively recording
     startListening: () => void
     stopListening: () => void
     transcript: string        // current interim transcript
   }
   ```

3. Configuration:
   - `continuous: true` — keep listening until explicitly stopped
   - `interimResults: true` — show words appearing in real time
   - `lang: 'en-US'`

4. On result:
   - Append final transcript segments to the textarea value
   - Do NOT overwrite existing content — append only
   - Add a single space before appended text if field is not empty

5. On error:
   - `no-speech`: silently stop listening, reset state
   - `not-allowed`: set supported = false, show browser notice
   - All other errors: stop listening, log to console

6. Cleanup:
   - Stop recognition on component unmount
   - Stop recognition if listening = true when hook is called again

---

## STEP 4 — UPDATE THE TEXTAREA COMPONENT

Modify the existing TextArea component (do not create a new one).

Add the microphone button to the top-right corner of the textarea
label row — same line as the label text, right-aligned.

**Mic button design — Obsidian Gold compliant:**
- Position: top-right of the label row (flex row, space-between
  with the label text)
- Size: 28px × 28px
- Background: transparent
- Border: 1px solid rgba(201,168,76,0.25)
- Icon: microphone SVG, 14px, color rgba(245,240,232,0.50)
- No border-radius — square button, Obsidian Gold hard rule

**Listening (active) state:**
- Border: 1px solid #C9A84C
- Icon color: #C9A84C
- Pulse animation: gold glow, 1.5s ease-in-out infinite
  ```css
  @keyframes mic-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
    50% { box-shadow: 0 0 0 6px rgba(201,168,76,0); }
  }
  ```
- "Listening..." helper text appears below textarea in gold,
  DM Sans 300 12px — replaces normal helper text while active

**Unsupported browser state:**
- Hide the mic button entirely (supported = false)
- On first render in an unsupported browser, show one-time
  inline notice below the FIRST textarea on the page only:
  ```
  "Voice input works in Chrome and Edge.
   You can type your answers instead."
  ```
  DM Sans 300 12px rgba(245,240,232,0.40)
  Dismissible with a small × — dismissed state persisted in
  localStorage key: `e2go_voice_notice_dismissed`

**Behavior on click:**
- If not listening: call startListening()
- If listening: call stopListening(), append final transcript
  to textarea value, save via the existing onChange handler

**Textarea live update while listening:**
- Show interim transcript as greyed-out text appended after
  the committed content: rgba(245,240,232,0.40)
- On final result: commit transcript at full opacity

---

## STEP 5 — VERIFY COVERAGE ACROSS ALL SIX SECTIONS

Confirm the updated TextArea component is used in all six sections:

```bash
grep -r "TextArea\|<textarea" \
  src/app/apply/story \
  src/app/apply/business \
  src/app/apply/investment \
  src/app/apply/qualifications \
  src/app/apply/family \
  src/app/apply/ties \
  --include="*.tsx" | grep -v "node_modules"
```

If any section uses a raw `<textarea>` HTML element instead of the
TextArea component, replace it with the TextArea component.

Report which sections have textarea fields and how many each.

---

## STEP 6 — DO NOT TOUCH MODULE 4

Confirm the voice sample component at /apply/module4 is unchanged:
```bash
git diff src/app/apply/module4
```
Must show: no changes.

---

## STEP 7 — BUILD CHECK

```bash
npm run build
```

Fix all TypeScript errors. Zero errors required before committing.

Common issues to watch for:
- SpeechRecognition type not found: add
  `declare global { interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; } }`
  at top of the hook file
- SSR errors: all Web Speech API access must be inside
  `typeof window !== 'undefined'` guards — this is a client-side
  only API

---

## STEP 8 — PLAYWRIGHT VERIFICATION

Use Playwright to:

1. Screenshot localhost:3000/apply/story
   Confirm: mic button visible in top-right of label row on
   textarea fields. Gold border. Correct size.

2. Screenshot localhost:3000/apply/qualifications
   Confirm: mic button present on the QJ-04 textarea
   ("What specific experience do you have...") — the most
   important narrative field in the application.

3. Screenshot localhost:3000/apply/investment
   Confirm: mic button present on source of funds narrative textarea.

4. Screenshot localhost:3000/apply/module4
   Confirm: NO mic button — module 4 is unchanged.

---

## STEP 9 — COMMIT

```bash
git add src/hooks/useSpeechInput.ts
git add src/components/  # TextArea component path
git commit -m "feat: voice-to-text input on all case file textarea fields

- useSpeechInput hook wraps Web Speech API (no cost, no API key)
- Mic button added to TextArea component — top-right of label row
- Obsidian Gold design: square button, gold pulse when listening
- Appends transcript to existing content — never overwrites
- Graceful degradation: mic hidden in Firefox/unsupported browsers
- One-time browser notice with localStorage dismiss
- /apply/module4 voice sample unchanged — separate system
- Coverage: /apply/story, /apply/business, /apply/investment,
  /apply/qualifications, /apply/family, /apply/ties"

git push origin dev
```

---

## COMPLETION REPORT

When done, report exactly:

```
Voice input complete.

Files changed:
- src/hooks/useSpeechInput.ts — new hook
- src/components/[path]/TextArea.tsx — mic button added

TextArea fields with voice input:
- /apply/story: [N] textarea fields
- /apply/business: [N] textarea fields
- /apply/investment: [N] textarea fields
- /apply/qualifications: [N] textarea fields
- /apply/family: [N] textarea fields
- /apply/ties: [N] textarea fields

/apply/module4: unchanged — confirmed

Browser support:
- Chrome/Edge: full voice input
- Firefox/other: mic button hidden, one-time notice shown

Build: clean
Playwright: screenshots saved

Ready for manual test in Chrome.
```

---

## NOTES FOR FUTURE SESSIONS

- The `answers.source` column already exists in the DB
  (added in the document upload session). When a textarea
  answer comes from voice input, set source = 'voice_input'
  rather than 'user_entry'. This is a future enhancement —
  do NOT add it in this session. Flag it in BUILD_TRACKER.md
  as a next-session item.

- Do not add audio recording or audio storage. Transcription
  only. Audio never touches the server.
