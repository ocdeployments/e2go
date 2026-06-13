# SESSION 15 — Merge Ask E2go Widget into /learn Page

**Branch:** dev
**Priority:** 🟡 UX placement fix — Session 11's widget is currently at the
bottom of the homepage, easy to miss. This session gives it a proper home
on `/learn`, alongside the existing 6-article education hub, and replaces
its homepage placement with a lightweight CTA.
**Agent:** engineering-frontend-developer + engineering-code-reviewer
**Read before starting:** Session 11's completion report (FaqWidget.tsx
location and props), the existing `/learn` page structure (6-card grid,
Session S26)

---

## CONTEXT

Session 11 built `src/components/landing/FaqWidget.tsx` and embedded it
at the bottom of `HomeClient.tsx`. Owner found it there but it was too
easy to miss — buried below the fold, last section on a long page.

Rather than make it a persistent/floating widget (rejected — crowds
mobile alongside the cookie banner and nav, and reads as "salesy chatbot"
against the Obsidian Gold "luxury legal/private wealth" positioning), the
better fit is: `/learn` already exists as the "education hub" — a natural,
existing home for "ask anything about E-2" content. This session merges
them.

---

## STEP 1 — MOVE FaqWidget TO /learn

1. Locate `/learn`'s page component (per CLAUDE_CONTEXT: "Education hub
   (6 SEO articles)" — likely `src/app/learn/page.tsx` or
   `LearnClient.tsx` with the 6-card grid from Session S26)
2. Remove `<FaqWidget />` from `HomeClient.tsx` (Session 11's placement)
3. Add `<FaqWidget />` to `/learn`'s page, positioned ABOVE the existing
   6-article grid — i.e. page order becomes:
   - `/learn` page heading/intro (if any exists)
   - **Ask E2go widget** (Session 11's component, unchanged —
     streaming, starter chips, soft quiz CTA, all behavior identical)
   - 6-article grid (unchanged)
4. Confirm `FaqWidget.tsx` itself requires NO changes — it's a
   self-contained component, only its PARENT/location changes. If it has
   hardcoded styling assumptions about its container (e.g. expects to be
   full-bleed homepage width vs `/learn`'s container width), adjust
   container/wrapper styling only — not the component's internals.

---

## STEP 2 — HOMEPAGE: REPLACE WITH CTA

Where `<FaqWidget />` used to sit on the homepage, replace with a simple,
on-brand CTA section:

- Heading/text along the lines of: "Got questions about the E-2 visa?"
  (reuse Session 11's existing copy/heading if it fits) with a brief
  line, then a button/link: **"Ask E2go →"** → links to `/learn`
  (or `/learn#ask` if an anchor makes sense for direct-scroll, agent's
  choice)
- Keep this lightweight — a few lines + one CTA button, NOT a scaled-down
  version of the widget itself (no chips, no input field on the homepage —
  that's the whole point of moving it)
- Obsidian Gold styling consistent with surrounding homepage sections

---

## STEP 3 — NAV / DISCOVERABILITY CHECK

`/learn` is already in the nav (per CLAUDE_CONTEXT route list). Confirm:
1. Nav label is still appropriate — "Learn" likely still fits (it's now
   "ask a question OR read articles"), but if the agent thinks a label
   tweak (e.g. "Learn" → "Learn & Ask") meaningfully improves clarity,
   propose it — don't change without noting the reasoning
2. `/learn` page's SEO metadata (title/description, per Session S26)
   should be reviewed — if it previously described only "educational
   articles," consider whether it should now also mention "ask
   questions" for SEO purposes. Small copy tweak only if it doesn't
   require new keyword research.

---

## DO NOT IN THIS SESSION

- Do not modify FaqWidget's internal logic, streaming behavior, retrieval,
  rate limiting, or system prompt — Session 11's implementation is
  unchanged, only its location moves
- Do not turn this into a floating/sticky/persistent widget — explicitly
  rejected
- Do not remove or restructure the existing 6-article grid — widget is
  ADDED above it, articles remain as-is
- Do not duplicate the widget on both homepage and /learn — homepage gets
  the CTA only

---

## VERIFY

1. Homepage (`/`) no longer shows the full FAQ widget — shows the new
   "Ask E2go →" CTA section instead, styled consistently
2. CTA links correctly to `/learn`
3. `/learn` shows: widget (functional — test a starter chip click,
   confirm streaming response still works) ABOVE the 6-article grid
4. 6-article grid unchanged/functional
5. Mobile + desktop rendering of both pages
6. npm run build clean (and remember: `rm -rf .next` if switching
   between build/dev)

---

## COMPLETION REPORT

```
SESSION 15 — Merge Ask E2go widget into /learn complete.

STEP 1: FaqWidget moved from: [HomeClient.tsx location]
  to: [/learn page file] — positioned above 6-article grid: [confirmed]
  Container/wrapper adjustments needed: [none / describe]

STEP 2: Homepage CTA section added — file: [...]
  Copy used: [...]
  Links to: [/learn or /learn#anchor]

STEP 3: Nav label: [unchanged / changed to: ...]
  /learn SEO metadata: [unchanged / updated to: ...]

VERIFY:
  Homepage no longer shows full widget, shows CTA: [yes/no]
  CTA → /learn link works: [yes/no]
  /learn shows widget above article grid, widget functional
    (starter chip test): [yes/no]
  6-article grid unchanged: [yes/no]
  Mobile/desktop: [confirmed]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
