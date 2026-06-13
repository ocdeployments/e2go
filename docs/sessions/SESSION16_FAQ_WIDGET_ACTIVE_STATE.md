# SESSION 16 — Ask E2go Widget: Ambient/Active Feel + Thinking Indicator

**Branch:** dev
**Priority:** 🟡 Polish — addresses two related issues: (1) the widget
currently looks static/inert at rest ("too faint... fading out"), and
(2) after submitting a question there's NO visual feedback during the
wait for the streamed response — it "just goes dark," which reads as
broken even though it's working.
**Agent:** engineering-frontend-developer + engineering-code-reviewer
**Read before starting:** `docs/animated-gradient-border.md` (existing
component — REUSE this pattern, don't invent a new visual language),
`src/components/landing/FaqWidget.tsx` (Session 11)

---

## CONTEXT

Owner's feedback: the widget looks faint/inert at rest, and during the
wait for a streamed answer there's no indication anything is happening —
bad UX, looks frozen/broken.

**Brand constraint**: avoid generic "chatbot" visual tropes (literal
bouncing `•••` typing dots, generic spinners) — this needs to stay
consistent with the "luxury legal / private wealth / authority" Obsidian
Gold positioning. The codebase ALREADY HAS an animated gold gradient
border component (`docs/animated-gradient-border.md` — primary #8B6914,
secondary #C9A84C, accent #E8D5A3, used on pricing card / landing CTA /
Module 3 sidebar). REUSE this component/pattern for both fixes below
rather than introducing new animation styles — this keeps the "alive"
treatment consistent across the app.

This session does NOT change `/api/faq/ask`, retrieval logic, streaming
mechanics, or rate limiting — purely the widget's VISUAL states.

---

## PART 1 — IDLE/AMBIENT STATE ("looks too faint, looks like it's fading")

### Problem
At rest, the widget container looks static and low-contrast against the
dark background — doesn't draw the eye or signal "this is interactive."

### Fix
Apply the animated gradient border component (or its CSS pattern —
`@keyframes gradient-rotate` + `@property --gradient-angle`, per
`docs/animated-gradient-border.md`) to the widget's outer container
border, at a SLOW speed (the doc specifies speed presets — pricing card
uses 10, CTA button 6, sidebar 12; for an ambient/idle widget border,
something in the 12-15 range — slow and subtle, not attention-grabbing).

This gives the widget a continuous, subtle "alive" signal at rest without
being distracting — consistent with how the pricing card and CTA button
already behave.

### Verify
- Widget border shows the slow gold gradient animation at rest
- Animation speed matches the "ambient/subtle" end of the existing
  presets — should not compete visually with the input field or chips
- No layout shift/jank introduced by the border treatment

---

## PART 2 — THINKING/LOADING INDICATOR (the "goes dark" problem)

### Problem
Between submitting a question and the first token of the streamed
response arriving, there is a gap with NO visual feedback. This is the
more important fix — silence during a wait reads as "broken," not "slow."

### Fix
Add an explicit "thinking" state, shown from the moment of submission
until the first streamed token arrives:

1. **Immediately on submit**: the input area transitions to a visibly
   "active/processing" state — options (agent: pick what fits best with
   existing component structure, or combine):
   - The animated gradient border (Part 1) SPEEDS UP during this state
     (e.g. from ~12-15 down to ~5-6, matching the CTA-button-speed
     preset) — same visual language, just intensified to signal "working"
   - A brief on-brand status line appears where the answer will render —
     e.g. "Thinking..." or a short rotating phrase ("Searching E-2
     knowledge base...", "Drafting your answer...") in the gold/muted
     text color, Cormorant Garamond or DM Sans per existing widget
     typography
   - Avoid: generic spinners, bouncing dot ellipses (`...`), skeleton
     loaders that don't match Obsidian Gold's flat/line-art aesthetic

2. **First token arrives**: thinking state is replaced by the streaming
   answer text (as it already streams in, per Session 11) — gradient
   border returns to ambient/idle speed (Part 1's state)

3. **Error case**: if the request fails (rate limit, scope guard
   redirect, actual error) — thinking state is replaced by the
   appropriate message (existing Session 11 behavior for these cases),
   gradient border returns to idle speed

### Verify
- Submit a question → immediately see the "thinking" state (border
  speeds up + status text/phrase) — no gap of silence
- First token arrives → thinking state replaced smoothly by streaming
  answer, border returns to ambient speed
- Test rate-limit case (12th request in 10 min, per Session 11's Upstash
  setup) → thinking state replaced by the friendly rate-limit message,
  not left hanging
- Test scope-guard redirect (off-topic question) → same — thinking state
  resolves to the redirect message promptly (this path should be FAST
  since it's a heuristic check, not an LLM call — confirm the thinking
  state doesn't linger unnecessarily here)

---

## DO NOT IN THIS SESSION

- Do not modify `/api/faq/ask`, the 3-layer retrieval, system prompt, or
  rate limiting (Session 11) — visual states only
- Do not introduce a new animation pattern — reuse the existing animated
  gradient border component/CSS
- Do not use generic chatbot visual tropes (bouncing dots, generic
  spinners) — keep it on-brand
- Do not change starter chips, input field structure, or CTA placement —
  only add the ambient border + thinking state

---

## COMPLETION REPORT

```
SESSION 16 — Ask E2go widget ambient + thinking states complete.

PART 1: Animated gradient border applied to widget container
  Speed used: [...] (compare to existing presets: pricing=10, CTA=6,
    sidebar=12)
  Files modified: [...]

PART 2: Thinking state implementation
  Trigger: [on submit, before first token]
  Visual treatment: [border speed-up to X + status text: "..."]
  Resolution: [replaced by streaming text on first token / error
    message on failure]
  Files modified: [...]

VERIFY:
  Idle ambient animation visible: [yes/no]
  Thinking state appears immediately on submit: [yes/no]
  Smooth transition to streaming answer: [yes/no]
  Rate-limit case handled (thinking → friendly message): [yes/no]
  Scope-guard case handled (fast resolution, no lingering): [yes/no]
  No layout shift/jank: [yes/no]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
