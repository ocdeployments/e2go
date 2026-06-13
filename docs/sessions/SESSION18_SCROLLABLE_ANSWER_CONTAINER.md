# SESSION 18 — Ask E2go Widget: Scrollable Answer Container (Supersedes
Session 17 Item 2's approach)

**Branch:** dev
**Priority:** 🟡 Direct follow-up — Session 17's min-height + smooth
transition approach did NOT fully resolve the jumping. Owner has
confirmed: a contained scroll area within the widget is the correct fix.

**Agent:** engineering-frontend-developer
**Read before starting:** `src/components/landing/FaqWidget.tsx`
(Session 17's current state — `min-h-[180px]` + `transition: min-height
0.25s ease-out` on the messages container)

---

## CONTEXT

Session 17 Item 2 tried "reserve space + smooth transition" — didn't
fully stop the jump (likely because real answers, possibly combined with
the thinking-state content, exceed the 180px reservation more often than
assumed). Owner has explicitly requested the more standard fix: give the
answer area a FIXED/MAX height with internal scroll, so the WIDGET's
outer box never changes size — long answers scroll within a contained
window instead of growing the container.

This is a standard, sound pattern for this kind of content — not the
"generic chatbot trope" concern raised earlier (that was about visual
style like bouncing dots, not about scrollable content areas, which are
just correct layout engineering for variable-length content).

---

## FIX

1. On the messages/answer container (currently
   `min-h-[180px]` + `transition: min-height 0.25s ease-out`, per Session
   17):
   - Replace with a FIXED height or `max-height` (e.g. `max-h-[280px]`
     or similar — pick a height that comfortably shows a short-to-medium
     answer without feeling cramped, but caps growth for longer ones;
     agent's judgment, but keep it large enough that MOST short answers
     don't show a scrollbar at all)
   - Add `overflow-y-auto` (or equivalent) so content beyond this height
     scrolls WITHIN the container
   - Remove the `transition: min-height` — no longer needed since height
     is now fixed/capped

2. **Auto-scroll to bottom as content streams**: as new tokens arrive
   during streaming, the scroll position should automatically follow the
   bottom of the growing content — so the user watches the answer being
   "written" in real-time at the visible bottom edge, rather than having
   to manually scroll down after streaming completes. (Standard pattern:
   `ref.scrollTop = ref.scrollHeight` on each content update, or
   `scrollIntoView` on a bottom-anchor element — agent's choice)

3. **Scroll affordance when content overflows**: when the answer is long
   enough to require scrolling, add a subtle visual cue that more content
   exists below — a soft gradient fade at the bottom edge of the
   container (fading to the container's background color) is a common,
   unobtrusive pattern. Keep it subtle — gold-toned fade consistent with
   Obsidian Gold, not a jarring scrollbar-styling change. (Custom
   scrollbar styling itself is optional/nice-to-have — don't over-invest
   if it's fighting browser defaults awkwardly; the gradient fade cue is
   the priority)

4. **Thinking state**: per Session 17's unification, thinking-state
   content and streaming-answer content share this same container — both
   should respect the new fixed/max-height + scroll behavior consistently

---

## VERIFY

This time, ACTUAL VISUAL VERIFICATION is required — not curl/build-output
checks. If dev server port conflicts recur (per Session 17's note), run:
`lsof -ti:3000 | xargs kill -9` (or equivalent) before `npm run dev`, and
`rm -rf .next` if switching from a prior `npm run build`.

1. Submit a question expected to produce a SHORT answer — confirm:
   - No scrollbar appears (content fits within the max-height)
   - Widget's outer box does NOT change size
2. Submit a question expected to produce a LONGER answer (try a few of
   the starter chips / corpus questions if needed to find one) — confirm:
   - Content scrolls WITHIN the container, auto-scrolling to follow new
     tokens as they stream
   - Widget's outer box STILL does not change size — no page jump
   - Bottom-fade affordance visible when content overflows
3. Confirm thinking state also respects the container — no separate jump
   when transitioning thinking → answer
4. Mobile + desktop

---

## COMPLETION REPORT

```
SESSION 18 — Scrollable answer container complete.

Container height: [fixed/max-height value] — replaces Session 17's
  min-h-[180px] + transition
Overflow: [overflow-y-auto or equivalent]
Auto-scroll-to-bottom: [implementation approach]
Overflow affordance: [gradient fade / scrollbar styling / none — describe]
Thinking state: [confirmed shares same container behavior]

VERIFY (VISUAL — Playwright or manual with screenshots):
  Short answer — no scrollbar, no outer resize: [yes/no]
  Long answer — scrolls within container, auto-follows stream,
    outer box unchanged: [yes/no]
  Overflow affordance visible when needed: [yes/no]
  Thinking state consistent: [yes/no]
  Mobile/desktop: [confirmed]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
