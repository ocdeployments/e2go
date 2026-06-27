# SESSION HANDOFF — E2go.app
**Date:** June 9, 2026
**Prepared by:** Claude.ai planning session
**For:** Next Claude Code agent session
**Branch:** dev
**Project path:** ~/E2-go

---

## READ THESE FIRST — IN ORDER

```bash
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/IDEAS.md
```

Do not start any work until all three are fully read.

---

## CURRENT APP STATE — HONEST SUMMARY

The app is substantially built. Most pages exist and compile.
The critical path to first paying user has specific blockers
that must be resolved in priority order.

**What is working:**
- Landing page — complete rebuild June 9, mobile-verified,
  Obsidian Gold, 12 sections including mistakes, premium cards
- Quiz (Module 0) — global v4.0, 14 core questions, working
- Results page — score, flags, timeline, pricing pre-calc
- Module 3 Tabs A-L — all 12 tabs wired with autosave
- Document generation engine — 15-step pipeline, sequential
- Auth — login, signup, verify all working
- Analysis engine — complete
- Follow-up conversation — complete

**What is broken or incomplete:**
1. Login page — Unsplash image 404 causing 500 error — URGENT
2. Stripe pricing — old amounts ($297 etc), needs update to
   confirmed pricing ($550, $697, $750, $797, $997, $1,297, $1,397)
3. Payments table migration — exists but NOT applied to Supabase
4. Generate page — three known issues (approval gate, React
   setState violation, right column empty boxes)
5. Module 3 UX — needs redesign (see decisions below)
6. Nav removed from layout.tsx — other app pages may lack nav

---

## DESIGN SYSTEM — LOCKED. NEVER DEVIATE.

```
Background:    #0a0a0a
Gold:          #C9A84C
Text:          #f5f0e8
Muted:         rgba(245,240,232,0.55)
Card border:   1px solid rgba(201,168,76,0.12)
Heading font:  Cormorant Garamond weight 300
Body font:     DM Sans
Radius:        0 — no rounded corners anywhere
FORBIDDEN:     glassmorphism, rounded corners, gradients,
               shadows, blur, teal, any blue accent
```

Read docs/DESIGN_REFERENCE.html before any UI work.

---

## API KEY ROUTING — CRITICAL RULE

Two AI keys in .env.local:
- OPENROUTER_API_KEY → ALL app AI features
- ANTHROPIC_API_KEY → document generation ONLY
  (src/lib/generation-engine.ts only)

Never switch existing OpenRouter calls to Anthropic.
Never expose either key in client-side code.

---

## CONFIRMED PRICING — LOCKED

| Tier | Price | Stripe amount (cents) |
|---|---|---|
| Solo Individual | $550 | 55000 |
| Solo + Spouse | $697 | 69700 |
| Solo + Family up to 2 kids | $750 | 75000 |
| Solo + Family 3-5 kids | $797 | 79700 |
| Partnership | $997 | 99700 |
| Partnership Two Couples | $1,297 | 129700 |
| Partnership Two Families | $1,397 | 139700 |
| Each extra child beyond 2 | +$50 | +5000 dynamic |
| Interview Simulator standalone | $197 | 19700 |
| Renewal Package | $497 | 49700 |

Simulator is INCLUDED in all packages AND available standalone.
Per-child surcharge uses dynamic Stripe checkout — no fixed Price ID.

---

## BRAND — LOCKED

**E2go** — capital E, lowercase go. Always.
Domain stays e2go.app (lowercase URL only).
Logo in progress — do not change any display names
until logo is confirmed and owner instructs.

---

## DECISIONS MADE THIS SESSION — APPLY TO ALL WORK

### Module 3 redesign direction [DECIDED — NOT YET BUILT]
The 12 tabs (A-L) are being redesigned. Do NOT build this
yet — wait for the session file. The approved direction is:

Six document-focused sections (not 12 lettered tabs):
1. Your story → feeds cover letter + investor biography
2. Your business → feeds business plan
3. Your investment → feeds source of funds narrative
4. Your qualifications → feeds investor biography + cover letter
5. Your family → feeds dependent section
6. Your ties → feeds non-immigrant intent section

Two-panel layout:
- Left panel: questions in groups of 3-5 (conversational)
- Right panel: document outline filling in as questions answered
  (Phase 1: structured template, not AI-generated)

Phase 2 (after first paying user): live AI paragraph generation
after each cluster — API call per cluster, streams paragraph
into right panel. Cost ~$0.05-$0.75 per user session.

DO NOT BUILD THIS yet — owner will confirm when ready.

### Interview simulator [DECIDED — NOT YET BUILT]
Full spec at docs/INTERVIEW_SIMULATOR_SPEC.md

Voice technology stack (CONFIRMED):
- OpenAI Whisper (whisper-1) — user voice → text
- OpenAI TTS (tts-1-hd, "onyx" voice) — officer voice → speech
- Anthropic — generates officer questions + evaluates answers
- NO ElevenLabs — not needed

Requires: OPENAI_API_KEY in .env.local
Build order:
1. Text conversation engine first
2. Document upload + intake flow (5 questions)
3. Add OpenAI TTS for officer voice
4. Add OpenAI Whisper for user voice
5. Debrief and scoring

DO NOT BUILD THIS yet — wait for session file.

### Landing page — COMPLETE AS OF JUNE 9
HomeClient.tsx is self-contained — no external component imports.
Nav, footer, all sections are inline.
Do NOT import NavBar, JourneyWizard, or FeatureGrid components.
They have been deleted.

### Nav removed from layout.tsx
The agent removed global Nav/Footer from layout.tsx on June 9.
Other app pages (quiz, results, login, dashboard, etc.) may
need their own nav or a shared app-nav component.
Check each page before assuming nav is present.

---

## IMMEDIATE PRIORITY TASKS

### PRIORITY 1 — Fix login page 500 error [URGENT]
File: src/app/login/page.tsx
Issue: Unsplash image URL 404 → 500 error on page load
Fix: Remove Unsplash image. Replace left panel with American
flag SVG (copy from HomeClient.tsx hero section exactly).
Same fade treatment as hero. Mobile: single column, form
centered. Desktop: two columns, flag left, form right.

### PRIORITY 2 — Stripe pricing update
Current state:
- PricingClient.tsx has old amounts ($297 etc) hardcoded
- stripe_price_id fields are empty strings
- .env.local has old Price IDs
- Duplicate STRIPE_PRICE_SOLO entry in .env.local

What to do:
1. Run scripts/stripe-setup.ts after updating amounts
   to confirmed pricing (see table above)
2. Add simulator ($197) and renewal ($497) to script
3. Update .env.local with new Price IDs
4. Remove duplicate STRIPE_PRICE_SOLO entry
5. Update PricingClient.tsx amounts to confirmed pricing
6. Read Price IDs from env vars not hardcoded

### PRIORITY 3 — Apply payments migration
```bash
npx supabase db push
```
File: supabase/migrations/20260605110625_payments_table.sql
Status: exists but never applied to Supabase
Must run before any payment flow works.

### PRIORITY 4 — Generation engine fixes
Three known issues in src/app/generate/[applicationId]/page.tsx
and src/lib/generation-engine.ts:

Issue A: Approval gate not pausing between sequential documents
Issue B: setState-during-render React violation (~line 100)
Issue C: Right column renders multiple empty document boxes
         instead of single active document view

Fix file: docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
Read this file for exact fix instructions.

### PRIORITY 5 — Full end-to-end test
After priorities 1-4 are complete, run a full test:
Quiz → Results → Pricing → Stripe checkout → Dashboard →
Module 3 → Generation → Document download

Test applicant: Michael James Chen
Application UUID: 9f981747-e3e4-4941-9f86-9871f8117b66
SKIP_PAYMENT_WALL=true in .env.local for testing

---

## FILES THAT MUST NOT BE MODIFIED

```
public/data/module0_questions.json — LOCKED v4.0
public/data/module0_scoring_logic.json — LOCKED v1.1
src/app/HomeClient.tsx — complete, working, do not touch
  unless specifically instructed
```

---

## STANDING BUILD RULES

1. Read DESIGN_REFERENCE.html before any UI work
2. Never truncate files — complete output only
3. One commit per logical unit
4. Never DROP TABLE / DROP COLUMN / ALTER column types
5. API keys server-side only — never in browser
6. Supabase: auth.users → public.profiles (never public.users)
7. Every API route verifies auth before processing
8. All DB queries scoped by user_id (RLS)
9. Branch: always dev — never commit to main
10. Ask once: every answer stored once, used everywhere
11. Mobile-first on every UI component — no exceptions
12. No Magic MCP — not available (out of credits)

---

## SESSION LOG — JUNE 9, 2026

### Landing page complete rebuild
- HomeClient.tsx: 616 lines, self-contained, 12 sections
- Deleted: NavBar.tsx, JourneyWizard.tsx, FeatureGrid.tsx
- Removed: global Nav/Footer from layout.tsx
- Mobile audit: 16/16 items pass
- Playwright verified at 390px, 768px, 1440px
- Commits: 191ea7c, 25747e0

### Quiz + Results rebuild (earlier June 9)
- module0_questions.json: v4.0 global, 14 core questions
- quiz/page.tsx: complete rewrite, auth-aware
- results/page.tsx: complete rewrite, score/flags/timeline
- Commits: ce8f25e, 96ce73b

### Design system update
- CLAUDE_CONTEXT.md updated: Obsidian Gold locked
  (was incorrectly showing navy blue / Inter font)
- IDEAS.md updated: sections 13-19 added

---

## WHAT THE OWNER IS WORKING ON IN PARALLEL

- Logo design (in progress — do not update E2go display
  names until logo is confirmed)
- Stripe dashboard — creating new Price IDs manually
  for updated tier amounts
- Content editing in VS Code — landing page copy

Do not change any copy in HomeClient.tsx.
The owner edits copy directly in VS Code.

---

## NEXT PLANNED MAJOR BUILDS (in order)

1. Fix login page 500 error (Priority 1 above)
2. Stripe pricing update (Priority 2 above)
3. Apply payments migration (Priority 3 above)
4. Generation engine fixes (Priority 4 above)
5. Full end-to-end test run (Priority 5 above)
6. Module 3 UX redesign — six sections, two-panel layout
7. Interview simulator — full build with OpenAI voice stack
8. Results page E-2 benefits section (session file exists:
   docs/sessions/SESSION_RESULTS_BENEFITS.md)
9. /learn hub improvements
10. Admin dashboard basic version

---

## USEFUL COMMANDS

```bash
# Start dev server clean
pkill -f "next dev" || true && sleep 2 && rm -rf .next && npm run dev &

# Build check
npm run build 2>&1 | grep -iE "error|✓ Compiled|Failed" | head -10

# Check what's in .env.local (safe — excludes secrets)
grep -v "SECRET\|KEY\|PASSWORD\|TOKEN" .env.local | head -20

# Check Stripe Price IDs
grep "STRIPE_PRICE" .env.local

# Apply Supabase migrations
npx supabase db push

# Check current branch
git branch --show-current

# Recent commits
git log --oneline | head -10
```

---

## END OF HANDOFF

Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md, and docs/IDEAS.md
before starting any work. Report current state and confirm
priorities before touching any files.
