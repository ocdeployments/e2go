# AI Generation Reveal — Blur-Lift Document Cards

**Component:** Blur-lift reveal animation for the document generation progress page.
**Route:** `/generate/[applicationId]` — right panel.
**Commit:** `daf7817` — feat: document generation blur-lift reveal animation
**Written:** June 5, 2026 (post-implementation — see note at bottom).

---

## Purpose

Replace the previous plain streaming text panel on the generation progress page with six discrete document cards. As each document completes in the SSE pipeline, its card reveals with a blur-lift animation — text underneath becomes unblurred as a mask sweeps downward. The user sees exactly which document is being written, which are done, and which are still waiting.

---

## Six Document Cards (Locked Order)

```
1. Cover Letter        (step 1 of 15)
2. Source of Funds     (step 2 of 15)
3. Investment Proof    (step 3 of 15)
4. Business Plan       (step 4 of 15)
5. Qualifications      (step 5 of 15)
6. DS-160 Reference    (step 6 of 15)
```

Order matches the 15-step generation pipeline (Step 1 = Cover Letter always, per architecture decisions). Steps 7–15 are gap analysis, repetition/consistency checks, AI detection, humanization, metadata sanitization, quality gate, acknowledgment, preview unlock — these are tracked in the left-panel step list only, not as document cards.

---

## Visual Behaviour

### Three states per card

| State | Condition | What you see |
|---|---|---|
| Waiting | `documentsComplete < doc.id` AND not current | "Waiting to start..." centred placeholder. Full blur overlay. |
| Generating (isCurrent) | `currentDocument === doc.name` AND not revealed | "GENERATING" gold badge (animated pulse dot). Live streaming text in `<pre>`. Full blur overlay lifting as progress climbs. |
| Complete (isRevealed) | `documentsComplete >= doc.id` | "COMPLETE" gold badge (static dot). Fixed "Document generated and saved" text. No blur overlay. |

### Badges

Both badges share the same styles:
```
border   border-[#C9A84C]/40
text     #C9A84C, [10px], font-medium, uppercase, tracking-wider
padding  px-2 py-0.5
dot      h-1.5 w-1.5 bg-[#C9A84C]
```

The GENERATING badge dot has `animate-pulse` and is `rounded-none` (no rounded corners — Obsidian Gold rule). The COMPLETE badge has no animation.

---

## Blur-Lift Animation

### Motion library

```tsx
import { motion } from "motion/react"
```

Dependency: `motion` v12.40.0 (installed in `daf7817`). Pulls in `framer-motion`, `motion-dom`, `motion-utils` as transitive deps.

### The overlay element

```tsx
<motion.div
  className="absolute inset-0 pointer-events-none backdrop-blur-3xl"
  initial={false}
  animate={{
    clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
    opacity: progress >= 100 ? 0 : 1,
  }}
  transition={{ duration: 1.2, ease: "easeOut" }}
  style={{
    clipPath: `polygon(0 ${progress}%, 100% ${progress}%, 100% 100%, 0 100%)`,
    maskImage: progress === 0
      ? "linear-gradient(to bottom, black -5%, black 100%)"
      : `linear-gradient(to bottom, transparent ${progress - 5}%, transparent ${progress}%, black ${progress + 5}%)`,
    WebkitMaskImage: /* same as maskImage */
  }}
/>
```

### How the blur-lift works

1. A `motion.div` sits absolutely positioned over the entire card (`inset-0`) with `backdrop-blur-3xl` (heavy blur) and `pointer-events-none`.
2. A `clip-path` polygon cuts the blur from the top. The polygon starts at `y = progress%`, so everything above that line is clipped away (invisible) and everything below is visible (the blur covering the content).
3. As `progress` goes from 0 → 100, the polygon moves down, removing the blur from top to bottom — creating the "reveal sweep" effect.
4. At `progress >= 100`, opacity transitions to 0, removing the blur entirely.
5. Transition: 1.2s easeOut — quick enough that it feels snappy, slow enough that the user sees content being revealed.

### Progress prop values

| State | progress | Result |
|---|---|---|
| Waiting | 0 | Polygon at top edge. Mask gradient fully opaque at top, fades over 10% of the card. Blur covers everything. |
| Generating | 0 | Same as waiting (progress is binary — 0 or 100 in the current implementation). |
| Complete | 100 | Polygon at bottom edge. Opacity = 0. Blur overlay invisible. |

---

## Progress Prop Wiring

The blur-lift is wired to the SSE pipeline from the generation engine:

```
src/app/api/generate/progress/[jobId]  →  SSE stream
  ─ SSE message: { documentsComplete: N, status, currentDocument, currentDocumentText, step, error }
```

In the parent component (`GenerateProgressPage`):

1. `documentsComplete` state starts at 0.
2. SSE messages update it via `processMessage()` callback.
3. Each card checks `isRevealed = documentsComplete >= doc.id`.
4. When `documentsComplete` crosses the card's `id` threshold, `progress` flips from 0 → 100, triggering the blur-lift animation.

The animation is binary in the current implementation — it's all-or-nothing per card. Future enhancement could make `progress` a continuous value (tied to actual document generation percentage) for a gradual reveal while each document is being streamed.

---

## isCurrent Detection Logic

```tsx
const isCurrent = currentDocument === doc.name && !isRevealed;
```

- `currentDocument` comes from `msg.currentDocument` in the SSE stream, mapped through `mapDocumentType()` which reads `DOCUMENT_TYPE_LABELS` from `src/types/generation.ts`.
- A card is "current" only while: the SSE stream says that document name is being written AND the card has not yet been marked complete.
- The `!isRevealed` guard is critical — without it, the COMPLETE card would briefly flicker to "GENERATING" when the next SSE message arrives for that same doc name.

---

## Design Tokens Used

All tokens reference `docs/DESIGN_REFERENCE.html` (Obsidian Gold design system):

| Token | Value | Applied to |
|---|---|---|
| Card background | `#0d0d0d` | Card outer div (just slightly lighter than page bg `#0a0a0a`) |
| Border | `white/8` (~3%) | Card outer border, card header divider |
| Document name text | `white/60` (DM Sans, [10px], uppercase, tracking-wider) | Header label |
| Waiting placeholder | `white/20` (DM Sans, [14px]) | "Waiting to start..." text |
| Streaming/pre text | `white/70` (DM Sans monospace, [14px], leading-relaxed) | Live text and saved text |
| Gold accent | `#C9A84C` | Badge borders (`#C9A84C/40`), badge text, badge dots |
| Body font | DM Sans (300/400/500) | All labels, badges, text |
| Border radius | `0` | No rounded corners on any card element (Obsidian Gold hard rule) |

Note: The card background uses `#0d0d0d`, not the page background `#0a0a0a`. This is intentional — a 3% brightness lift creates a subtle depth distinction without violating the Obsidian Gold no-white rule.

---

## File Structure

```
src/app/generate/[applicationId]/page.tsx
  └─ DocumentCard component (lines 36–113, inline)
  └─ DOCUMENTS constant (lines 20–28)
  └─ GenerateProgressPage (parent, lines 115–482)

tests/generation-page.spec.ts
  └─ Playwright test: verifies 6 cards render with blur-lift overlays

package.json
  └─ "motion": "^12.40.0" (dependency)
```

---

## Post-Implementation Note

This spec was written on June 5, 2026, **after** the component was implemented and pushed in commit `daf7817`. The component itself was partially committed in an earlier session (`7cf5a10`) — the `DocumentCard` JSX was present but the `motion` NPM dependency was missing, causing a runtime import error. The final commit (`daf7817`) installed the dependency and added the Playwright verification test.

Per standing build process, specs should be written *before* code. Future component work must follow the Lazyweb → Firecrawl → spec → build → Playwright sequence. This file retroactively documents the implemented state so future sessions have a reference for modifications.

---

## Future Enhancements (Not Yet Built)

- Continuous progress: tie `progress` to actual document streaming percentage instead of binary 0/100.
- Per-document word-count or chunk-count for smoother animation.
- Tap/click card to expand streaming text panel.
- Accessibility: reduce-motion support (respect `prefers-reduced-motion`).
