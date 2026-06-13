# SESSION 17 — /learn Page Order Fix + Widget Streaming Layout Jump

**Branch:** dev
**Priority:** 🟡 Two follow-ups from Session 15/16
**Agent:** engineering-frontend-developer + engineering-code-reviewer
**Read before starting:** Session 15's completion report (where exactly
the widget was placed relative to `/learn`'s existing hero/heading),
`src/components/landing/FaqWidget.tsx`

---

## ITEM 1 — WIDGET MUST BE THE FIRST THING ON /learn

### Problem
Session 15 placed the Ask E2go widget below `/learn`'s existing
hero/heading section, with the 6-article grid below the widget. Current
order: **hero → widget → articles**.

Owner wants: **widget → hero → articles** (or **widget → articles**, if
the hero content is redundant with the widget's own heading — see below).

### Fix
1. View `/learn`'s page component — identify the existing
   hero/heading section's content (likely a page title like "Learn"
   or "E-2 Visa Education Hub" + intro copy, per Session S26's original
   6-card grid page)
2. Move `<FaqWidget />` to be the FIRST element on the page — above
   this hero/heading
3. **Check for redundant headings**: `FaqWidget.tsx` itself has its own
   heading ("Got questions about the E-2 visa?" per the Session 11
   screenshot — "ASK E2GO" label + "Got questions about the E-2 visa?"
   heading + intro line). If `/learn`'s existing hero ALSO has a similar
   "Learn about E-2" style heading immediately below the widget, this
   could read as two headings stacked back-to-back awkwardly.
   - If redundant: agent's judgment — either trim `/learn`'s original
     hero to something that transitions into the article grid (e.g.
     "Or browse our guides below" / "Explore E-2 topics in depth") rather
     than repeating a top-level heading, OR keep both if they read fine
     in context. Report which.
   - If NOT redundant (e.g. `/learn`'s hero specifically introduces the
     ARTICLES, not the page generally): keep as-is, just reordered below
     the widget

### Verify
- `/learn` page order: widget (with its own heading/intro/chips/input)
  → [adjusted hero if needed] → 6-article grid
- No jarring double-heading effect
- Mobile + desktop

---

## ITEM 2 — WIDGET BOX RESIZES/JUMPS DURING STREAMING

### Problem
As the streamed answer renders token-by-token, the widget's answer area
grows in height incrementally, causing the whole widget box to visibly
"jump" — resize awkwardly as content streams in. This looks unnatural.

### Fix
Reserve stable space for the answer area so streaming growth is smooth,
not jumpy. Approaches (agent: combine as appropriate):

1. **Min-height on the answer container**: set a `min-height` on the
   area where the streamed answer renders, sized to comfortably fit a
   typical answer (per Session 11/4's system prompt — "2-4 sentences
   typically"). This means short-to-medium answers render WITHOUT any
   height change at all — the space is already there, just empty before
   streaming starts.

2. **Smooth height transition for the overflow case**: for answers that
   exceed the min-height (longer responses), apply a CSS `transition` on
   the container's height/max-height so any growth beyond the reserved
   space animates smoothly (e.g. `transition: height 0.2s ease-out` or
   similar) rather than snapping instantly on each token batch.

3. **Avoid layout shift on the THINKING state too** (Session 16's
   addition) — the thinking-state area and the answer-rendering area
   should ideally occupy the SAME reserved space, so the transition from
   "thinking" → "streaming answer" doesn't itself cause a jump. If
   they're currently separate elements with different heights, consider
   unifying into one container with consistent min-height across both
   states.

### What NOT to do
- Don't cap the answer area at a fixed MAX height with internal
  scrolling (e.g. `overflow-y: auto` in a short box) — per Session
  11/4's brevity-focused system prompt, answers are meant to be short;
  a scrollable answer box would be an odd pattern for "2-4 sentences."
  The min-height + smooth-transition approach should be sufficient for
  the expected answer lengths. If the agent finds answers are frequently
  exceeding what feels reasonable, that's a signal to revisit the system
  prompt's brevity instruction (Session 11/4) — flag this rather than
  solving it with scroll bars.

### Verify
- Test with a short answer (1-2 sentences) — widget shows NO visible
  size change from idle → thinking → answer (space was reserved)
- Test with a longer answer (if one of the 355 corpus answers produces a
  longer rewrite) — any growth beyond reserved space is SMOOTH (animated
  transition), not a sudden jump
- Thinking state → streaming transition doesn't itself cause a jump
- Mobile + desktop (mobile is more height-constrained — confirm reserved
  space doesn't push starter chips/input off-screen awkwardly on small
  viewports)

---

## ITEM 3 — HERO COPY UPDATE

Replace the widget's current heading/sub-copy with the new direction
(owner-approved, addresses the "everyone's E-2 experience online is
contradictory" sentiment):

- Eyebrow: `ASK E2GO` (unchanged)
- Heading: **"E-2 advice is everywhere. Straight answers aren't."**
- Sub: **"Every forum thread has a different story. Ask your specific
  question and get one clear, consistent answer — drawn from 350+ vetted
  Q&A pairs and our complete knowledge base."**
- Disclaimer line at bottom of widget ("Informational only — not legal
  advice. e2go is not a law firm.") — UNCHANGED, keep as-is

Apply Cormorant Garamond / DM Sans per existing widget typography —
no structural change to heading hierarchy, just the text content.

---

## ITEM 4 — INPUT FIELD VISUAL PROMINENCE

### Problem
The text input ("Ask about E-2 visa requirements, process, countries...")
is visually too subtle — doesn't read as "the interactive element, click
here." Likely cause: it's using the same low-opacity border treatment as
passive card/container chrome (`rgba(201,168,76,0.12)` per
CLAUDE_CONTEXT's border token) — appropriate for decorative borders, too
faint for the PRIMARY interactive element on the page.

### Fix
Make the input field visually distinct from surrounding card chrome —
within Obsidian Gold constraints (flat, zero border-radius, no
glassmorphism):

1. **Stronger border on the input itself** — increase opacity
   significantly above the `0.12` card-border token (e.g. into the
   `0.4-0.6` range) so the input reads as a distinct interactive
   boundary, not part of the card's outline
2. **Subtle fill** — consider a faint background fill on the input
   (e.g. `rgba(201,168,76,0.05-0.08)`) to further distinguish it from
   the card's near-transparent surface
3. **Focus state** — on click/focus, border brightens further (toward
   `#C9A84C` full opacity) — clear "you're now typing" feedback
4. **Submit button (gold arrow square)** — review whether it's
   appropriately prominent relative to the now-more-visible input; adjust
   if the balance looks off after the input changes

Apply consistently in both idle and (per Item 2 / Session 16) thinking
states — the input's prominence shouldn't disappear when the
thinking-state border animation kicks in.

### Verify
- Input field is immediately recognizable as "the place to type" without
  needing to hover/click first
- Focus state gives clear visual feedback
- Still flat/zero-radius/no-glassmorphism — consistent with rest of app
- Mobile + desktop

---

## DO NOT IN THIS SESSION

- Do not modify retrieval, system prompt, or rate limiting
- Do not add scroll bars to the answer area (see "what not to do" above)
- Do not remove `/learn`'s 6-article grid
- Do not change the disclaimer line text

---

## COMPLETION REPORT

```
SESSION 17 — /learn order fix, layout jump, hero copy, input prominence
complete.

ITEM 1: New /learn order: [widget → ... → articles, describe exactly]
  Redundant heading found: [yes/no]
  If yes, resolution: [...]
  Files modified: [...]

ITEM 2: Layout jump fix
  Min-height applied to: [...] sized for: [...]
  Smooth transition: [CSS property + duration]
  Thinking/answer state unification: [yes/no, describe]
  Files modified: [...]

ITEM 3: Hero copy updated
  New heading: "E-2 advice is everywhere. Straight answers aren't."
  New sub-copy: [confirm matches spec]
  Disclaimer line: [unchanged, confirmed]
  Files modified: [...]

ITEM 4: Input field prominence
  Border opacity: [old value] → [new value]
  Fill added: [yes/no, value]
  Focus state: [describe]
  Submit button adjustment: [yes/no, describe]
  Files modified: [...]

VERIFY:
  /learn order correct, no double-heading issue: [yes/no]
  Short answer — no visible size change: [yes/no]
  Long answer — smooth growth, no jump: [yes/no]
  Thinking→answer transition smooth: [yes/no]
  Hero copy renders correctly: [yes/no]
  Input field immediately recognizable as interactive: [yes/no]
  Focus state visible: [yes/no]
  Mobile/desktop: [confirmed]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
