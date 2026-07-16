# CLAUDE_CONTEXT.md — E2go
## Master Context for Every Claude Code Session
**⏳ WORKSTREAM IN PROGRESS (July 15, 2026):** Sprint M — Security & Backend Hardening Audit Follow-Through. **Execution contract: `docs/SPRINT_M_SECURITY_AUDIT.md`.** Session 126 ran a grounded two-agent audit (Application Security Engineer + Database Optimizer) against the live codebase — no critical findings, but six scoped gaps turned into ordered tasks M-1…M-6. **M-1 done (Session 127)** — `/api/fdd/report` given a `maxDuration` override; right-sized down from the original "port to async job pattern" plan since that route is single-shot (see Sprint M doc for reasoning). M-2 through M-6 not started — next agent should continue at M-3 (pure documentation, no code risk). Full detail: BUILD_TRACKER.md Sessions 126–127.

**⚡ WORKSTREAM COMPLETE (July 15, 2026):** One-Room Redesign of `/onboarding` + `/case-profile` — Sprints K-0…K-5. **All sprints (K-1 through K-5) are now complete** — registry-driven completion engine, rebuilt `/case-profile` card grid, K-3 triage-intelligence ranking, K-4's dual-document-pipeline verification/prep-kit widening/`/onboarding` payment gate/funnel instrumentation, and K-5's onboarding arrival moment, contextual referrals, evidence-step payoff, and registry-driven triage handoff. Full detail: BUILD_TRACKER.md Session 122 (K-1–K-3), Session 123 (K-4), Session 124 (K-5). `docs/ONE_ROOM_REDESIGN_PLAN.md` is the execution contract this workstream shipped against — no further sprints remain in it. A pre-existing z-index bug (step-tab header vs. `<main>` both `z-10`, silently blocking all step-tab clicks) was found and fixed during K-5.6 verification — see BUILD_TRACKER.md Session 124. Approved visuals: https://claude.ai/code/artifact/83cdbf9c-ec05-44dd-97c7-8281203f4161

**⚡ WORKSTREAM COMPLETE (July 15, 2026):** Simulator UX + Interview Dossier rebuild — Sprints L-1…L-4. **Execution contract: `docs/SPRINT_L_SIMULATOR_DOSSIER.md`.** All four sprints complete and committed on `dev` (`3d70ea9` for L-2/L-3, `2545883` for L-4). L-1 verified the four already-coded simulator UX fixes in browser and committed them separately; L-2 moved every dossier currency figure to server-side computation in the prep-kit route so the LLM never invents numbers; L-3 rewrote dossier voice to first person and swept out placeholder/enum leaks and internal field-name leaks; L-4 rebuilt the print/PDF layout (cover page, break-inside:avoid on every card, financial-statement Section 5, waiting-room cheat card, Obsidian Gold print accents). Two bugs found during live verification and fixed in-sprint: a coach-hint-panel bug (L-1) and a regex phrase-leak surfacing "semantic field rating" text in dossier prose (L-3). Two more bugs found but judged out of Sprint L's file scope and spun off as separate background tasks instead of fixed inline: the pre-existing `interview_prep_kits` cache write failing with `PGRST204` (stale PostgREST schema cache — a migration forcing `NOTIFY pgrst, 'reload schema'` was applied by the spawned task), and a hardcoded `"Canada"` string in the D-15 (214(b)) gap-analysis factor in `src/lib/gap-analysis-engine.ts` that should interpolate the applicant's actual treaty country. Full detail: BUILD_TRACKER.md Session 125. L-4's print CSS was verified via DOM/computed-style inspection, not an actual print-preview screenshot — the harness can't render `@media print` visually, so that's the one acceptance-gate item not pixel-verified.

**Version:** July 2, 2026 — Session 107 (Phase 1 + Phase 2, both complete). Document extraction routes to the correct person — principal, spouse, or child. Every DS-160 filer now has their own Security & Background, Travel Companions, and U.S. Point of Contact sections via a shared person-agnostic question-set registry (`src/lib/ds160-question-sets.ts`) + generic runner (`QuestionSetRunner.tsx`), reachable from `/case-profile` (`MemberCard` CTA + `ControlPanel` tiles) and `/apply/security/[personId]` / `/apply/dependent/[familyMemberId]`. Schema: `answers.family_member_id` + 3-column unique index, `uploaded_documents.doc_type` CHECK widened 6→13. Build clean. **Critical fix this session**: the Phase 1 migration had never actually been applied to production despite being reported as verified — `/api/answers` writes were silently failing for everyone. Resolved by running the migration SQL directly in the Supabase dashboard; verified post-fix. `/api/answers` also had a latent bug where `family_member_id` was referenced in `onConflict` but never written — now fixed. Full detail: BUILD_TRACKER.md Session 107.

## SPRINT STATUS
- OPS-1 (API Cost Intelligence): ✅ COMPLETE — llm_cost_log, cost logging in callLLM(), /admin/cost page
- OPS-2 (System Health): ✅ COMPLETE — health-watchdog cron (5 min), /admin/system-status, kill switch, cron_log
- OPS-3 (Admin Command Center): ✅ COMPLETE — /admin rebuilt, /admin/users/[userId], tier override, admin_audit_log
- OPS-4 (Revenue Intelligence): ✅ COMPLETE — /admin/revenue, MoM, projection, churn signals, funnel
- OPS-5 (Quality & Growth): ✅ COMPLETE — /admin/quality + NPS + simulator metrics + doc download rate + mobile QA pass (S66)
- ENG-1 (Engine Quality Priority): ✅ COMPLETE — KB→docgen, coaching memory, multi-turn probing all confirmed built
- ENG-2 (Engine Quality Advanced): ✅ COMPLETE — FDD prompt tuning (+1.0pts), adaptive difficulty (+0.3pts), Q0-08c/Q0-08d quiz branches, archetype classifier Q0-08a primary signal (S67)
- INFRA-1 (Infrastructure Hardening): ✅ COMPLETE — FAQ Anthropic violation fixed, SSE backoff + existing-job skip + UI state restore (S66), connection pooler N/A confirmed
- Sprint E-1 (Critical breaks): ✅ COMPLETE — 10 dead-end fixes (login, ToS, Save & Exit, pricing, upload, calendar, navigator, simulator)
- Sprint E-2 (Paywall): ✅ COMPLETE — middleware server-side gates on /apply/* + /gap-analysis + /fdd/* + Nav greyed lock icons
- Sprint E-3 (Results page): ✅ COMPLETE — full E-3 restructure, Perplexity-reference layout, DocumentTabPreview, attorney price anchor, module cards
- Sprint E-4 (Quiz fixes): ✅ COMPLETE — question rewording, multi-select, conditional logic, cookie banner
- Sprint E-5 (Dashboard overhaul): ✅ COMPLETE — superseded by Session 80 Case File UI redesign
- Sprint E-6 (Pricing): ✅ COMPLETE — founding member counter removed, auth-aware header, features list updated
- Sprint E-7 (Franchise Navigator): ✅ COMPLETE — brand removal, categories, FDD multi-zip, broker flow
- Sprint G-1 (Dashboard: Intelligence Strip Fix): ✅ COMPLETE — Session 83
- Sprint G-2 (Dashboard: Folder Stack Redesign): ✅ COMPLETE — Session 83
- Sprint G-3 (Interview Preparation Kit): ✅ COMPLETE — Session 84 (/simulator/prep-kit + API + DB migration + 7 collapsible sections)
- Sprint G-4 (Prep-kit data gate + dossier sections): ✅ COMPLETE — Session 87 (data requirements gate, DOSSIER_DATA_SOURCES list, entitlement wiring)
- Sprint F-1 (Section Shell + Sidebar): ✅ COMPLETE — Session 84 (SectionLayout 7-step left rail for /apply + /gap-analysis)
- Sprint F-2 (Section Task Panels): ✅ COMPLETE — Session 84 (collapsible checklist banner per section)
- Sprint H-1 (formatOutcome Bug Fix): ✅ COMPLETE — Session 86 (PROCEED/PROCEED_RISK/ATTORNEY_RECOMMENDED added to vocabulary map)
- Sprint H-2 (Dashboard Header Redesign): ✅ COMPLETE — Session 86 ("Let's build your E-2 application, [name]" + advisory sentence)
- Sprint H-3 (CaseCommandPanel Hierarchy): ✅ COMPLETE — Session 86 (gold CTA dominant; 4-phase roadmap; adaptive franchise/own-business)
- Sprint H-4 (WorkstreamStrip): ✅ COMPLETE — Session 86 (4 macro completion buckets replacing intelligence strip)
- Sprint H-5 (FolderStack Architecture): ✅ COMPLETE — Session 86 (5-tab structure, 3-tier step rows, progressive fading)
- Sprint H-6 (Case Profile — Standalone Page): ✅ COMPLETE — Session 87 (/case-profile full-page record with sidebar nav, 6 sections, 60+ fields, field status system — NOT a dashboard tab as originally planned)
- Sprint H-7 (Case Profile API + DB): ✅ COMPLETE — Session 87 (case_profile_view migration, /api/dashboard/case-profile route, QMA-* market data, FDD + Market intelligence subsections split)
- Gap Analysis noApplication fix: ✅ COMPLETE — Session 87 (quiz done but no application → "Begin onboarding" CTA instead of quiz link)
- Sprint I-1 (Navigation Hub Migration): ✅ COMPLETE — Session 88 (/dashboard retired → redirect to /case-profile; Nav restructured with Application ▾ / Intelligence ▾ dropdowns; Sections 07 + 08 added to /case-profile; all dashboard back-links removed; logo + all auth redirects point to /case-profile)
- Sprint I-2 (Form UX Audit): ✅ COMPLETE — Session 89 (CurrencyInput, quiz prefill for M3-F-02, 5 DS-160 education fields, 12 family/ties question rewrites, auto-save on all sections)
- Sprint I-3 (Apply Section Tab Nav): ✅ COMPLETE — Session 90 (6-tab row in CaseFileShell, live completion state per section from /api/apply/section-completion)
- Sprint I-4 (Document Import Hub v1): ✅ COMPLETE — Session 90 (6 doc types, Anthropic PDF extraction, per-field review, upserts to answers with source=document_upload, uploaded_documents migration)
- Sprint I-4+ (DocumentImportHub Session 91 upgrade): ✅ COMPLETE — Session 91. 11 doc types (+ passport, franchise_agreement, lease_agreement, acquisition_financials, government_form). 80-field FDD schema with extractFDDSections() — no 32K truncation (full PDF, position-based section splice). Auto-detect mode (docType=auto, cheap 20-token LLM classify). SOURCE_PRIORITY map auto-resolves 21 question keys without user intervention. normalizeForComparison strips $/%/, LLC/Inc/Ltd before conflict detection. 5 false conflicts eliminated (removed 3 bad INTAKE_FIELD_MAP entries). Dual counter: "N intake fields · M total fields stored". 12 DOC_TYPE_OPTIONS with bank statement advisory on investment_records. accept attribute expanded to .pdf,.docx,.txt,.csv.
- Sprint J-1 (Case Intelligence Core — "the CPU"): ✅ COMPLETE (Session 94) — All CIC tracks done and live. CIC-0: kb_chunks seeded (949 chunks, 93 docs), match_kb RPC, retrieveDoctrine. CIC-1: document-comprehension-engine.ts (per-doc memo + ledger → document_intelligence), case-intelligence-core.ts (assembleCaseModel → case_model; generateCaseTheory five-expert panel → case_theory with doctrine citations). CIC-2: case_theory brief injected into generation payloads (buildCaseTheoryBrief), LLM-as-critic verifier (cic-verifier.ts, DOC_SECTION_CONTRACTS per doc type), retry loop (max 3 passes, correctionBrief prepended). CIC-P: package manifest (cic-package-manifest.ts), consistency sweep (cic-consistency-sweep.ts, 2-phase: regex + semantic LLM), intra-doc flow directives (in verifier), certification gate (certify-document + request-regeneration APIs), change impact tracking (cic-change-impact.ts). CIC-3: gap analysis consuming CPU ledger (applyCpuContext, LedgerFact, activeDenialCodes), FDD auto-seed from imports (cic-fdd-seed.ts), simulator prep-kit steered by case_theory. CIC-4.1: /documents page rebuilt (certification flow, change-impact banner, package progress strip, manifest-gated download). Decisions: D1 ✅ (case_model merge phase 1), D2 ✅ (quiz-scoring.ts deleted), D3 ✅, D4 ✅ (outcome capture), D5 ⏳ (survey questions — Romy's domain input needed), D6 partial (before-download consent built; signup + terms-update pending). All 10 migrations applied. Full detail: docs/sessions/SPRINT_J1_CASE_INTELLIGENCE_CORE.md.
- Sprint J-1 QA Audit Sweep: ✅ COMPLETE (Session 95) — All 16 audit findings resolved. Security: rate-limit generate profile fails closed (no Upstash = blocked), verify-payment writes paid status immediately (no webhook race). Correctness: answers + faq/ask return 400 invalid_json, case-profile GET honours ?applicationId= param. Performance: waitForApproval replaced with immediate pass-through (5-min server poll eliminated), SSE strips content_text from 2s polls + derives totalDocuments from job.document_types. Verifier: numbers_strategy injected as canonical ground truth (figure checks no longer vibes), null LLM result now warns not silently passes. UX: module3/j + module3/d per-key debounce Map (autosave race fixed), CaseProfilePage.onFieldsApplied → reloadProfile() (was no-op). /fdd list query narrowed (excludes extracted_fields + profile_match JSONB blobs). N1 + N2 migrations applied in Supabase.
- DS-160 Intake Completion — Phase 1 (Document-to-Person Routing): ✅ COMPLETE (Session 107) — `answers.family_member_id` + 3-column unique index, `uploaded_documents.doc_type` CHECK widened 6→13, all 16 onConflict call sites updated. DocumentImportHub reorganized into per-person upload sections with non-blocking identity-mismatch surfacing. `/case-profile` MemberCard shows per-family-member completion + documents. Build clean; regression-verified live, multi-person scenarios need a test-account follow-up.
- Sprint K-0 (One-Room: handoff note to onboarding agent — onFieldsApplied wiring + real ip_hash): ⏳ NOT STARTED — see docs/ONE_ROOM_REDESIGN_PLAN.md
- Sprint K-1 (One-Room: field registry `src/lib/field-registry.ts` + drift test + `/api/case/completion` + manual-provenance un-gate + CaseHeader/StatusChip/ProgressRing): ✅ COMPLETE — verified against 3 QA accounts, drift test passing, build clean
- Sprint K-2 (One-Room: /case-profile rebuild — passport header w/ case_code, stateful card grid replacing TileChips, click-to-populate drawer, cold start, revert flag): ✅ COMPLETE — verified live
- Sprint K-3 (One-Room: triage intelligence — next-best-action ranking, quiz-aware doc-type ordering, contextual referral rules): ✅ COMPLETE (this session) — `src/lib/case-ranking.ts` (rankCards tier-based scoring, rankDocTypes, computeContextualOffers) wired into `/api/case/completion`, `DocumentImportHub.tsx`, `CaseProfileNew.tsx`. 13 unit tests passing (`src/lib/__tests__/case-ranking.test.ts`). Live-verified: cold-start preserved verbatim (test-france, 0% progress → registry order + hardcoded "Tell us your story"); non-cold-start ranking confirmed on test-uk (28% progress) — incomplete intake cards correctly outrank tool/locked cards; docTypeOrdering + contextualOffers confirmed franchise-prioritized across accounts. Full build clean (175/175 jest tests, tsc clean, `npm run build` clean).
- Sprint K-4 (One-Room: de-silo — retire legacy application_documents reads, widen prep-kit case_theory select, middleware-gate /onboarding w/ Stripe race grace path, funnel events): ✅ COMPLETE — see BUILD_TRACKER.md Session 123
- Sprint K-5 (One-Room: onboarding chapter one — arrival moment, contextual referrals, payoff toast, triage handoff via completion API, ip_hash): ✅ COMPLETE — see BUILD_TRACKER.md Session 124. Build clean, 175/175 tests, full browser walkthrough verified. One-Room Redesign workstream fully closed.
- Sprint L-1 (Simulator UX: verify + commit — question variety, mic resilience/skip, scored end-of-session analysis, substantive hints): ✅ COMPLETE — see BUILD_TRACKER.md Session 125. Verified live in browser (test-uk@example.com); a coach-hint-panel bug found during verification was fixed in-sprint. Committed separately from the K-sprint files.
- Sprint L-2 (Dossier accuracy: all currency figures computed server-side in prep-kit route, LLM uses them verbatim, quiz range retired): ✅ COMPLETE — see BUILD_TRACKER.md Session 125. Committed `3d70ea9`.
- Sprint L-3 (Dossier content: first-person voice, resolve placeholder names, enum labels, ban internal field names, no-false-coaching, probe de-dup, "critical gaps" panel): ✅ COMPLETE — see BUILD_TRACKER.md Session 125. A regex phrase-leak bug (raw "semantic field rating" text surfacing in dossier prose) found and fixed during live verification. Committed `3d70ea9`.
- Sprint L-4 (Dossier print/PDF: cover page, break-inside avoid, financial-statement Section 5, waiting-room cheat card, Obsidian Gold print accents): ✅ COMPLETE — see BUILD_TRACKER.md Session 125. Committed `2545883`. Verified via DOM/computed-style inspection, not an actual print-preview screenshot (harness can't render `@media print` visually) — the one acceptance-gate item not pixel-verified. **Known issues found but out of scope, spun off separately:** (1) `interview_prep_kits` cache write fails `PGRST204` (stale PostgREST schema cache) — actual root cause found and fixed in Session 126 (see below): the column never existed at all, not a cache issue. (2) `src/lib/gap-analysis-engine.ts` D-15 (214(b)) factor hardcodes "Canada" in its name/mitigation strings regardless of the applicant's actual treaty country — spawned as a separate task, not yet fixed.
- Session 126 (Commit cleanup + security/infra audit): ✅ COMPLETE — 7 commits landed organizing the FDD PDF-export feature, LLM timeout/token-budget fix, Item 20 null-handling fix, Census ZCTA territory fix, upload-page resumable-check fix, debug scripts, and the real fix for the `interview_prep_kits` `kit_json` column (root cause was a no-op `CREATE TABLE IF NOT EXISTS` against an already-existing table, not a stale schema cache). Followed by a two-agent grounded security/DB audit — see BUILD_TRACKER.md Session 126 and Sprint M above.
- DS-160 Intake Completion — Phase 2 (Missing Sections, shared registry): ✅ COMPLETE (Session 107, same session) — `src/lib/ds160-question-sets.ts` registry (Security & Background × 5 sub-areas, US POC, Travel Companions, Application Contact) + `QuestionSetRunner.tsx` generic runner, reused for principal and every dependent. New routes `/apply/security/[personId]` and `/apply/dependent/[familyMemberId]`. Case Profile entry points wired (MemberCard CTA for spouse/child, ControlPanel tiles). `/api/answers` fixed to actually persist `family_member_id` (was silently always NULL). Legacy `CHILD-{n}-*` backfill script built and verified (no legacy data currently exists to migrate). **Also found + fixed**: Phase 1's migration had never reached production — `/api/answers` was silently broken for all users until the owner ran the migration SQL directly via the Supabase dashboard this session. Not done: Application Contact route (registry exists, no page yet), Security & Background consent/compliance posture (needs product/legal input), deeper per-dependent fields beyond these three sections. Plan: `/Users/owner/.claude/plans/woolly-dancing-crescent.md`. Follow-up: reconcile local `supabase/migrations/` history against remote so `supabase db push` works cleanly again.

## KEY RULES — NEVER BREAK
- ANTHROPIC_API_KEY: ONLY in generation-engine.ts + /api/fdd/* routes
- callLLM(): OpenRouter only — never route through Anthropic SDK
- Simulator routes: ONLY xiaomi/mimo-v2.5 or xiaomi/mimo-v2.5-pro
- Dashboard: server component — never add "use client"
- createServiceClient(): only in server-side API routes
- Branch: dev — never commit to main
**Read this entire file before doing anything.**
**Then read BUILD_TRACKER.md.**

---

## SESSION COMMANDS

### "start session"
When the user types "start session":
1. Read CLAUDE_CONTEXT.md fully
2. Read BUILD_TRACKER.md fully
3. Read docs/DESIGN_REFERENCE.html if any UI work is planned
4. Report:
   - What was completed last session
   - What is currently broken or incomplete
   - What the next priority task is
   - Current route count and any known errors
5. Confirm all standing build rules are loaded
6. Ask: "Ready to confirm and begin?"
Do not start any work until the user confirms.

### "end session"
When the user types "end session":
1. Update BUILD_TRACKER.md:
   - Mark completed items ✅
   - Add new bugs to Known Issues
   - Update Session Log with date, completed work, decisions
   - Update next session priorities
2. Update CLAUDE_CONTEXT.md if any rules changed
3. Run: npm run build — confirm clean
4. Report: "Session complete. Here is what was accomplished: [summary]"
5. Confirm both files saved

---

## AGENT ACTIVATION — MANDATORY

Agency agents are installed at ~/.claude/agents/.
208 agents available. Use exact filename minus .md extension to activate.
Activate by stating the agent name at the very beginning of the prompt.

IMPORTANT: testing-evidence-collector and testing-reality-checker
both require Playwright screenshots internally. DO NOT use these agents
— they reintroduce the $1/screenshot cost we eliminated. Use the
agents listed below instead.

### Every build session — always activate:
**engineering-code-reviewer**
Reads code and confirms logic is correct before marking anything done.
Checks that claimed features are actually implemented, not just compiling.
Proof it requires: correct code logic + curl 200 + DB write confirmed.
"Build clean" alone is never sufficient.

### UI sessions (quiz, case file, results, login, any visual component):
**engineering-frontend-developer**
Enforces the UI build sequence:
Lazyweb research → Firecrawl reference → build → verification.
Reads DESIGN_REFERENCE.html before writing any component.
Enforces Obsidian Gold — zero border-radius, no glassmorphism.

### Surgical fix sessions (individual question fixes, scoring, API routes):
**engineering-minimal-change**
Smallest change that solves the problem. Nothing else touched.
Does not refactor unrelated code. Does not rename while in there.
Does not "improve" things that weren't broken.
Use for: quiz question fixes, scoring changes, bug fixes.

### After major feature additions (new routes, auth changes, DB changes):
**security-appsec-engineer**
Exact filename: security-appsec-engineer.md
Conducts threat modeling, STRIDE analysis, secure code review.
Checks: auth on every route, RLS on every new DB column,
input validation, parameterized queries, no secrets in client code.
Does NOT use Playwright — pure code review and curl verification.
Run after Sessions 3 and 5 of QUIZ_EXECUTION_PLAN.md.
Run any time new API routes, auth logic, or DB writes are added.

### Platform audit sessions:
**security-appsec-engineer** + **engineering-code-reviewer**
Together these two cover: security gaps + false completions.
Use for full platform scans. No screenshots required.

### Planning sessions (prioritisation, scope decisions):
**product-sprint-prioritizer**
Enforces execution order. Says no to scope that doesn't belong.
Use when deciding what to build next, not when building.

### Example session start commands:

Standard build session:
  "Use agents engineering-code-reviewer and
   engineering-frontend-developer.
   Read docs/QUIZ_IMPROVEMENT_MASTER.md..."

Surgical fix session:
  "Use agents engineering-code-reviewer and
   engineering-minimal-change.
   Start session..."

Security/audit session:
  "Use agents security-appsec-engineer and
   engineering-code-reviewer.
   No Playwright. No screenshots.
   Verify everything through code review and curl only..."

---

## PRODUCT OVERVIEW

**App name:** E2go (capital E, lowercase go)
**Domain:** e2go.app
**What it is:** Self-service U.S. E-2 Treaty Investor visa
  preparation platform producing complete, consulate-formatted
  application packages
**Who it serves:** Applicants from all 82 treaty countries globally.
  Primary market: Canadian applicants via Toronto consulate.
**What it replaces:** $6,500–$15,000 immigration attorney engagement
**What it produces:** Complete E-2 application package as .docx files
  (ZIP download). Applicant converts to PDF locally before submitting.
**Legal position:** Preparation and document drafting tool — NOT a
  law firm. Never use language suggesting the app replaces legal counsel.
**Core principle:** "What most people need first isn't a lawyer.
  It's clarity." People arrive confused, not ready for legal services.
  E2go bridges that gap.

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript · Tailwind CSS |
| Database + Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI — App features | OpenRouter (xiaomi/mimo-v2.5 via OPENROUTER_API_KEY) |
| AI — Document generation | Anthropic API direct (ANTHROPIC_API_KEY); non-business-plan docs fall back to OpenRouter (glm-5.2 → mimo → mimo-pro → gemini-2.5-pro) |
| AI — Simulator evaluation | OpenRouter (xiaomi/mimo-v2.5 or mimo-v2.5-pro ONLY via OPENROUTER_API_KEY) |
| AI — FAQ Q&A | OpenRouter (xiaomi/mimo-v2.5 via OPENROUTER_API_KEY) |
| Voice transcription | Groq Whisper (GROQ_API_KEY) |
| Voice TTS | Groq PlayAI TTS (GROQ_API_KEY — same key) |
| FAQ vector search | Supabase pgvector (faq_qa_corpus, faq_kb_chunks) |
| Rate limiting | Upstash Redis (UPSTASH_REDIS_REST_URL/TOKEN) |
| Email | Resend |
| Payments | Stripe (integrated, all 7 tiers live) |
| Hosting | Vercel |
| PWA | Service worker + manifest — installable |

**CRITICAL API KEY RULE — READ EVERY SESSION:**
- OPENROUTER_API_KEY → ALL app AI features (simulator, analysis,
  follow-up, extraction engine, classification)
- ANTHROPIC_API_KEY → document generation AND FDD analysis
  (src/lib/generation-engine.ts AND the FDD engines: extraction, report,
  territory, questions — all via callFDDModel in src/lib/llm-client.ts)
  FDD chain (LOCKED July 3, 2026): claude-opus-4-8 primary →
  claude-sonnet-5 fallback (both Anthropic direct) → z-ai/glm-5.2
  (OpenRouter) last resort. Deliberate Anthropic-primary exception for
  large-context reliability on high-stakes document analysis.
- GROQ_API_KEY → voice transcription + TTS only
  (src/lib/groq-transcription.ts, src/lib/groq-tts.ts,
  src/app/api/simulator/tts/route.ts,
  src/app/api/simulator/transcribe/route.ts)

DO NOT switch any existing OpenRouter calls to the Anthropic API.
FDD routes ARE an approved exception — they already use Anthropic directly.
DO NOT expose any API key in browser/client code.

**SIMULATOR MODEL CONSTRAINT — LOCKED (June 16, 2026; amended July 3, 2026):**
Simulator evaluate, follow-up, and case-summary routes
MUST use ONLY: `xiaomi/mimo-v2.5` or `xiaomi/mimo-v2.5-pro`
NEVER use minimax, deepseek, or any other model for those routes.
Amendment (user directive, July 3, 2026): the `coaching` task — which
serves the interview prep dossier (prep-kit) and coaching-report — now
runs `z-ai/glm-5.2` primary → `xiaomi/mimo-v2.5-pro` →
`google/gemini-2.5-pro`, with `claude-sonnet-5` as the Anthropic-direct
fallback layer. The mimo-only lock still applies to evaluate/follow-up/
case-summary.

---

## PROJECT PATH

```
~/E2-go/
```

Branch: dev (never commit to main directly)
Repo: github.com/ocdeployments/e2go

---

## ROUTE MAP (60 routes as of June 19, 2026)

### Public routes
- / — Landing page (self-contained HomeClient.tsx, FAQ CTA section)
- /quiz — Eligibility quiz v4.0
- /quiz/review — Edit quiz answers (jump-to-question)
- /results — Quiz results with score, flags, timeline
- /pricing — Pricing tiers
- /pricing/success — Post-payment confirmation
- /login — Auth (flag SVG left panel, loading state on submit)
- /signup — Auth
- /forgot-password — Auth
- /verify — Email verification
- /learn — Education hub + Ask E2go FAQ widget (6 SEO articles)
- /learn/[6 sub-pages] — E-2 educational articles
- /about — About page
- /support — Support
- /privacy — Privacy policy
- /terms — Terms of service
- /terms-required — Scroll-to-accept ToS page

### Authenticated routes
- /dashboard — Application dashboard
- /case-profile — Standalone full-page case record (6 sections, 60+ fields, field status inventory, FDD + market intelligence, sidebar nav)
- /settings — Account settings (data deletion, 2-step confirmation + type-to-confirm)
- /score — Application confidence score
- /simulator — Interview simulator (text + voice, teaser if no case file)
- /simulator/quick-start — Standalone simulator document upload intake
- /apply — Case file overview (personalised header, 6 section cards)
- /apply/overview — Redirects to /apply (query-preserving shim)
- /apply/story — Section 01: Your story
- /apply/business — Section 02: Your business
- /apply/investment — Section 03: Your investment
- /apply/qualifications — Section 04: Your qualifications
- /apply/family — Section 05: Your family
- /apply/ties — Section 06: Your ties
- /apply/upload — Document upload (self-preparer intake)
- /apply/upload/processing — Extraction progress (SSE)
- /apply/upload/review — Discrepancy resolution
- /apply/upload/gaps — Gap report
- /apply/module1 — Onboarding + consent
- /apply/module2 — Business type advisor
- /apply/module3 — Module 3 shell (8 tabs: A B C D E I J K)
- /apply/module3/[a,b,c,d,e,i,j,k] — Individual tabs (fallback)
- /apply/module4 — Voice sample / writing style
- /apply/checklist — Document checklist
- /apply/calendar — Compliance calendar
- /generate/[applicationId] — Document generation (SSE pipeline)
- /documents/[applicationId] — Document download

### FDD Intelligence (authenticated, protected by middleware)
- /fdd — FDD index (all analyses, 5-stage progress bars, smart navigation)
- /fdd/upload — PDF upload intake (transaction type, location, drag-and-drop)
- /fdd/review/[fddId] — Extraction review (9 collapsible sections, confidence badges)
- /fdd/score/[fddId] — E-2 scoring dashboard (5 dimensions, ODE model, flags, narrative)
- /fdd/territory/[fddId] — Territory market analysis (Census ACS, category weights, narrative)
- /fdd/questions/[fddId] — Questions generator (flag→question map, profile match, filter by audience)
- /fdd/report/[fddId] — Final report + freemium teaser (hasAccess gate, platform integration)

### Admin (never linked publicly — middleware-gated to role=admin)
- /admin — Command center (10 parallel queries, kill switch, overview cards, cost chart, stuck users, recent payments)
- /admin/revenue — Revenue intelligence (MoM, projection, LTV by tier, churn signals, conversion funnel)
- /admin/quality — Quality & growth (generation quality, FDD extraction, NPS data, prompt version registry)
- /admin/system-status — System health (kill switch toggle, cron log, stuck job remediation, API status)
- /admin/users/[userId] — User detail (profile, payments, AI costs, sim sessions, tier override)
- /admin/cost — Cost intelligence (7-day chart, cost by task, cost by model, top 10 users, burn projection)

---

## DESIGN SYSTEM — LOCKED (Obsidian Gold)

```
Background:    #0a0a0a
Gold accent:   #C9A84C
Text primary:  #f5f0e8
Surface:       rgba(201,168,76,0.03)
Border:        rgba(201,168,76,0.12)
Heading font:  Cormorant Garamond 300 (light + italic weight contrast)
Body font:     DM Sans 300/400/500
Border radius: 0 — NO rounded corners anywhere, ever
```

**MANDATORY before any UI work:**
Read docs/DESIGN_REFERENCE.html — it is the canonical component
library. Never skip this step.

**Violations that are never acceptable:**
- Rounded corners (border-radius > 0)
- Glassmorphism (backdrop-filter: blur)
- Box shadows
- Blue borders on selected states (use gold #C9A84C)
- Gradients on UI elements
- External image URLs (Unsplash etc) — use SVG or local images
- Emoji icons in UI

---

## PRICING — LOCKED (Updated June 9, 2026)

| Tier | Price |
|---|---|
| Solo individual | $550 |
| Solo + spouse | $697 |
| Solo + family (up to 2 kids) | $750 |
| Solo + family (3–5 kids) | $797 |
| Partnership (no families) | $997 |
| Partnership two couples | $1,297 |
| Partnership two families | $1,397 |
| Extra child surcharge | +$50 (dynamic Stripe, no fixed Price ID) |
| Interview Simulator standalone | $197 |
| Simulator additional sessions | $29.99 |
| Renewal package | $497 |

Simulator included in all packages AND available standalone.
All Stripe Price IDs live in .env.local as STRIPE_PRICE_* vars.
Current live Price IDs (June 10, 2026):
- STRIPE_PRICE_SOLO_NONE: price_1TgewyF7Ggk3LUEyIkxlp1ry
- STRIPE_PRICE_SOLO_SPOUSE: price_1TgewyF7Ggk3LUEybTTTUG95
- STRIPE_PRICE_SOLO_FAMILY_SMALL: price_1TgewzF7Ggk3LUEym0UKbRa0
- STRIPE_PRICE_SOLO_FAMILY_LARGE: price_1TgewzF7Ggk3LUEyjErIbBO8
- STRIPE_PRICE_PARTNERSHIP_NONE: price_1TgewzF7Ggk3LUEyUbjuK8R4
- STRIPE_PRICE_PARTNERSHIP_COUPLES: price_1Tgex0F7Ggk3LUEyPEleDScH
- STRIPE_PRICE_PARTNERSHIP_FAMILIES: price_1Tgex0F7Ggk3LUEyJJD6U7ot
- STRIPE_PRICE_SIMULATOR_3PACK: price_1Tgex0F7Ggk3LUEyhOhKvmKz
- STRIPE_PRICE_RENEWAL: price_1Tgex1F7Ggk3LUEykVcoLswI
- STRIPE_PRICE_CHILD_SURCHARGE: price_1Tgex1F7Ggk3LUEymMJnQQH5

---

## KEY DATA FILES — READ BEFORE TOUCHING

| File | What it is | Rule |
|---|---|---|
| public/data/module0_questions.json | Quiz questions v4.0 | Read before touching quiz |
| public/data/module0_scoring_logic.json | Scoring engine | Read before touching results |
| docs/DESIGN_REFERENCE.html | Canonical UI components | Read before any UI work |
| docs/DOCUMENT_UPLOAD_SPEC.md | Document upload spec | Read before touching upload |
| docs/INTERVIEW_SIMULATOR_SPEC.md | Simulator spec | Read before touching simulator |
| docs/sessions/ | All session files | Reference before building |
| docs/IDEAS.md | All product decisions | Reference for context |
| docs/sessions/SESSION_CASEFILE_REDESIGN.md | Case file redesign full spec | Read before touching any /apply/* section |

---

## STANDING BUILD RULES (confirm every session)

### RULE 0 — VERIFICATION APPROACH
Never use Playwright for screenshots — it pulls Gemini via OpenRouter
and costs approximately $1 per screenshot. This is not acceptable.

Verify with these free methods instead:

1. Build check — must be clean, zero errors:
   npm run build

2. TypeScript check — no type errors:
   npx tsc --noEmit

3. Page renders — confirms no runtime crash:
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/[route]
   Must return 200.

4. API route responds:
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/[route]

5. Data writes — confirm answer/record saved to Supabase:
   npx supabase db query "SELECT * FROM [table] ORDER BY created_at DESC LIMIT 3"

6. Open for owner visual check:
   open http://localhost:3000/[route]
   Owner confirms visually in Chrome. This is the only step
   that requires human eyes — agent handles everything else.

The agent must never mark a task complete based only on
"build clean." Each task requires the appropriate verification
from the list above before being marked done.

### RULE 1 — DESIGN SYSTEM COMPLIANCE
Read docs/DESIGN_REFERENCE.html before writing any component.
Zero border-radius everywhere. No glassmorphism. No blue selection
borders. No rounded corners. No external image URLs in UI.

### RULE 1A — NEW TABLES (added S63–S64)
Four new tables are live in Supabase:
- llm_cost_log — per-call AI cost tracking (model, route, tokens, cost_usd, latency_ms)
- cron_log — cron execution audit (job_name, status, duration_ms, error)
- admin_audit_log — admin action log (action, admin_user_id, target_user_id, resource)
- nps_scores — NPS responses (user_id, score 0–10, comment, trigger_event) — 7-day rate limit enforced server-side
All four have RLS enabled. Read via service role client only.

### RULE 2 — API KEY ROUTING
OPENROUTER_API_KEY → all app AI features.
ANTHROPIC_API_KEY → generation-engine.ts ONLY.
GROQ_API_KEY → transcription and TTS ONLY.
Never expose any key in browser code.

### RULE 3 — DOCUMENT GENERATION PIPELINE
Generate ONE document at a time. Never parallel.
Checkpointed — save to DB before next document starts.
15-step pipeline in exact order (see BUILD_TRACKER.md).
Cover Letter always first (Step 1) and finalised last (Step 15).
Steps 11-14 enhanced per Spec4: humanization retry loop (3 attempts, threshold 0.35),
REQUIRED_ELEMENTS completeness check, CONSISTENCY_FIELDS cross-doc validation,
metadata sanitization logging, 5-checkbox acknowledgment gate before download.
Pipeline audit trail written to generation_pipeline_log table.
S15 (Document Package Download) — ✅ COMPLETE. Full pipeline feature-complete.

### RULE 3A — QUALITY-GATE FAILURE HANDLING (added June 13, 2026)

A check that fails on EVERY run regardless of input quality is not a
check — it's a bug. Before any quality-gate check is added or
modified, confirm it can distinguish a genuinely bad document from a
correct one. If a "failure" cannot be explained in terms of what's
WRONG with the document (only in terms of "this number isn't equal to
that other number"), the check is measuring the wrong thing.

When a check DOES fail for real reasons, failures fall into three
types — handle each differently, never with silent overwrite:

- TYPE 0 (the check itself is wrong) — fix the check. Never "fix" the
  document to satisfy a bad check.
- TYPE 1 (data exists elsewhere in the case file, just not in this
  prompt's context) — fix the prompt-builder to include it. No
  applicant involvement.
- TYPE 2 (data genuinely doesn't exist yet — only the applicant has
  it) — becomes a `[bracketed placeholder]` in the output (existing
  mechanism), or a ONE-ROUND applicant clarification if the gap
  blocks generation entirely (Category A, Spec1). One round only,
  then resolve to bracket — never loop indefinitely.

If a re-prompted document comes back with the LLM declining to
proceed / asking for clarification rather than producing corrected
content — that response is a SIGNAL the check fired on a TYPE 0 case,
or a real gap needs human/applicant input. NEVER treat that response
as if it were a finished replacement document and overwrite
`content_text` with it. The previous good `content_text` stays unless
a genuinely improved version is produced.

**Tone, whenever the system surfaces ANY question to the applicant**
(pre-generation confirmation, clarification, revision): the person on
the other side may be tired, doing this late at night, or simply not
recall an exact figure. Every prompt is a consultant double-checking
before drafting — never an error message, never implying the
applicant did something wrong. State the consequence honestly (e.g.
"every document will use this exact figure") rather than manufacturing
urgency. If the applicant confirms an unusual answer once, accept it
and move on — do not ask again.

See `Spec1_Analysis_Engine.md` (Category A + "Display to User") for
the pre-generation application of this rule, and
`Spec4_Quality_Gate_Pipeline.md` Stage 4 for the post-generation
application.

### RULE 4 — DATABASE SAFETY
Never DROP TABLE. Always CREATE TABLE IF NOT EXISTS.
Always ALTER TABLE ... ADD COLUMN IF NOT EXISTS.
Never modify existing column types — add new columns only.
All tables must have RLS enabled.

### RULE 5 — ANSWER AUTOSAVE
Every Module 3 / case file answer saved within 2 seconds.
Debounce: 800ms. Never let an answer be lost.

### RULE 6 — MOBILE FIRST
Every component tested at 390px before 1440px.
Minimum touch target: 44px height.
No horizontal scroll at any breakpoint.

### RULE 7 — FULL OUTPUT
Never truncate file output. Always write the complete file.
If a file is long, write it in sections — never use "..." or
"rest of file unchanged."

### RULE 8 — NO PLAYWRIGHT, NO MAGIC MCP
Do not use Playwright — costs ~$1 per screenshot via OpenRouter/Gemini.
Use the free verification stack in Rule 0 instead.
Do not invoke Magic MCP — out of credits.
Build components manually using DESIGN_REFERENCE.html.

### RULE 9 — LIFECYCLE TRACKING
Every significant user action updates application_lifecycle table.
Key events: quiz_started, quiz_completed, payment_completed,
module completion timestamps, generation triggered/completed,
simulator sessions, interview_date, outcome.

### RULE 10 — BUILD TRACKER UPDATE
At end of every session ("end session"):
- Mark completed items ✅
- Add new bugs to Known Issues
- Update Session Log
- Update next session priorities (top 5)
- Run npm run build — must be clean

### RULE 11 — CASE FILE DATA PROTECTION
When rebuilding any /apply/* section page, audit all data hooks
before touching any code. Document every useEffect, onChange, and
auto-save call. Verify answers table writes still fire after rebuild.
Never commit a section page without confirming data writes work.

### RULE 12 — VOICE INPUT SCOPE
useSpeechInput hook applies to TextArea component in /apply/* sections only.
Never add mic button to /apply/module4 — that page has its own
separate voice/writing sample system with AI detection.

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Rule |
|---|---|
| Paywall timing | After Module 3, before document generation |
| Document format | .docx output (not PDF) — applicant converts locally |
| Document generation | Sequential, checkpointed, 15-step pipeline |
| Cover letter | Always Step 1, finalised Step 15 |
| Page limit | 50 pages per TAB (not 50 total) — Toronto consulate |
| AI model | claude-opus-4-8 for document generation (from app_settings) |
| Voice profile | Raw writing sample text passed directly — no JSON extraction |
| Experience scoring | 9-dimension keyword-based scoring (pure functions, no LLM) |
| Experience framing | Three-layer: Layer 0 (targeted follow-up) → Layer 1 (AI framing) → Layer 2 (standing backstop) |
| AI detection threshold | 0.35 — below this = pass |
| Prompt storage | /prompts/v1/documents/ |
| Partnership routing | Two separate independent packages |
| Module 3 old tabs | Kept as fallback — never delete a-e, i, j, k |
| Module 3 new sections | Six case file sections at /apply/* are primary |
| Quiz questions | module0_questions.json is source of truth — do not hardcode |
| Case file layout | Two-panel desktop · drawer tablet · overlay mobile |
| Voice input in case file | Web Speech API — mic on all textareas in /apply/* sections, NOT on /apply/module4 |

---

## MODULE 3 — CASE FILE STRUCTURE

The Document Interview was redesigned from 12 tabs (A–L) into
6 document-building sections. Old tabs A, B, C, D, E, I, J, K
remain as fallback. Old tabs F, G, H, L were deleted June 10
(superseded by new case file sections).

**New six-section structure:**
- /apply/story — Section 01: Cover letter + Biography
- /apply/business — Section 02: Business plan + Visa letter
- /apply/investment — Section 03: Source of funds + Investment proof
- /apply/qualifications — Section 04: Biography + Org chart
- /apply/family — Section 05: Dependents + DS-160 family
- /apply/ties — Section 06: Non-immigrant intent + Interview prep

**Module 3 shell (/apply/module3):**
Now has 8 tabs: A B C D E I J K (router.push dynamic).
F, G, H, L removed from TABS array June 10.

---

## CASE FILE UX REDESIGN — COMPLETE (June 10, 2026)

**Status:** ✅ Built and committed. Commits a9dfcb9–9172b2c.

All 6 section pages rebuilt with two-panel layout.
CaseFileShell.tsx shared component — desktop/tablet/mobile responsive.
Voice input working. Mic permission bug fixed.
All variants preserved: partnership, COS, family sub-paths.
Data writes verified on all 6 sections.

---

## DOCUMENT UPLOAD — SELF-PREPARER INTAKE

Self-preparers can upload existing documents at the start of the
case file. The platform extracts structured answers, detects
discrepancies (hard gate — must resolve before proceeding),
and shows a gap report.

**Three self-preparer profiles:**
- Independent preparer (drafting documents, no lawyer yet)
- Pre-lawyer preparer (near-complete, about to engage attorney)
- Lawyer dropout (has partial professional docs, stopped)

**Pricing:** Same as from-scratch applicants — no new tier.

**Flow:** /apply/upload → /apply/upload/processing →
  /apply/upload/review (if discrepancies) → /apply/upload/gaps → /apply

**Pre-fill badge variants:**
- "From your eligibility check" — gold (from quiz)
- "From your documents" — amber (high confidence upload)
- "From your documents — please verify" — amber-orange (medium)
- Low confidence → no pre-fill, hint text shown below field

---

## THREE-MODULE PRODUCT ARCHITECTURE (Locked June 16, 2026)

Three purchasable modules — each standalone or bundled:

| Module | Route | Status |
|---|---|---|
| Interview Simulator | /simulator | Built |
| Gap Analysis | /gap-analysis | Designed — not yet built |
| Document Generation | /generate/[appId] | Built |

### Case Intelligence Profile (CIP) — shared data model

A single unified data object fed by all intake sources and consumed by all
three modules. Ensures gap analysis intelligence benefits document generation
and simulator question quality.

**CIP data sources:** document extraction (any format) + quiz answers + follow-up Q&A + case file answers

**Not yet built** — this is the target architecture. Current state: data lives in separate tables (answers, quiz_sessions, followup_responses, case_briefs).

### Adaptive Intake Pattern (locked June 16, 2026)

1. Accept any document format (formal docs, rough drafts, notes — LLM normalizes)
2. Extract all extractable fields → show pre-filled confirmation card
3. For missing fields: "Do you have a document for X?" before asking the question directly
4. Ask bare questions ONLY for data that can't be extracted or documented
5. Never duplicate questions already answered in uploaded documents

### Gap Analysis — planned architecture (not yet built)

Six E-2 evidence categories with scoring weights:
- Source of Funds — 25%
- Management Role — 25%
- Business Plan & Viability — 20%
- Investment Amount — 15%
- Employment Creation — 10%
- Business Operations — 5%

Goal: bridge the case from current state to a state with a reasonable
chance of approval. Scores existing evidence → identifies gaps → prompts
for documents first → asks questions if no document → recalculates.

---

## INTERVIEW SIMULATOR

Route: /simulator
Two modes: text and voice.
Voice: Groq Whisper transcription + Orpheus (canopylabs/orpheus-v1-english) TTS.
⚠️ Voice blocked until owner accepts Groq terms at console.groq.com
Session limit: 2 included, $29.99 additional sessions.
Timer: 15 minutes per session. Fixed bottom bar with depleting progress bar.
Turns red with pulse animation at < 2 minutes. Applies to BOTH voice and text modes.
Timer starts when user clicks "Begin interview" — NOT on mount.
Evaluation: OpenRouter xiaomi/mimo-v2.5 rates answers strong/weak/inconsistent.
Debrief: readiness indicator + strong answers + needs-work + inconsistencies.
Post-session coaching report: deep analysis via xiaomi/mimo-v2.5-pro (Session 22).

**Phase flow (Session 21 — locked):**
'ready' → 'intro' → 'questions'
- ready: Pre-session screen with speaker/mic test, "Begin interview" button
- intro: Officer Williams warm welcome, "please introduce yourself"
- questions: Formal E-2 interview questions with VAD recording

**TTS audio (fixed Session 21):**
- `groq-tts.ts`: MIME type is `data:audio/wav;base64,` (was mp3 — silent failure)
- `tts/route.ts`: `response_format: 'wav'` (Orpheus only accepts wav)
- Browser autoplay unlock: silent 44-byte WAV played synchronously during "Begin interview" click

**Question generation (Session 22 — locked):**
- 9 universal questions (UQ-01 → UQ-09) each have a pool of 3-4 alternative phrasings
- `pick<T>()` randomly selects one phrasing per session → questions never feel identical
- `shuffle<T>()` Fisher-Yates shuffles business-type pools; caller takes first 3 of 5-6
- Business type categories: food/beverage, healthcare, retail, franchise, cleaning,
  IT/consulting, transport/logistics, construction + generic fallback
- New WP-05 probe added for immigrant intent risk (fires when flag = moderate/high)
- Business type questions personalized with context vars (investment amount, business name)

**Post-session coaching report (Session 22):**
- Route: POST `/api/simulator/coaching-report`
- Model: `xiaomi/mimo-v2.5-pro`, max_tokens: 2400, timeout: 90s
- Fires non-blocking after session completes; updates coaching cards progressively
- Returns `QuestionCoaching[]`: `questionId`, `whatOfficerExpected`, `whatWasMissing`,
  `keyPoints[]`, `modelAnswer` (first-person, uses real business details), `documentReference`
- Model answer disclaimer: "This is a guide to the level of detail and structure expected
  — not a script. Officers can tell when answers are memorized."
- Falls back to original `specificSuggestion` silently if API fails

**Evaluate route prompt (Session 22 fix):**
- Previously had "2 sentences max" / "1 sentence" constraints → shallow generic feedback
- Now: 3-sentence feedback (officer expectation + answer quality + specific gap)
- Suggestion: 2 sentences (exactly what to say differently + how to frame correctly)
- max_tokens raised to 400

**Standalone path:** /simulator/quick-start — for users without a completed
case file. Upload documents (cover letter, business plan) → extraction
engine populates answers → simulator generates questions from those answers.
Uses source='simulator_standalone' on applications table.

**Nervousness/delivery detection (Session 22 — conceptual, not yet built):**
- Can flag: filler words (um/uh/like/you know), very short answers (<30 words),
  hedging language (I think/maybe/probably) from existing transcripts
- Frame as "delivery confidence coaching" — NOT lie detection (pseudoscience)
- Would add `deliveryNotes` field to `AnswerEvaluation` type and evaluate route
- No new API cost (uses existing transcript text)

**TTS in Module 3 intake (Session 22 — conceptual, feasibility confirmed):**
- Technically reusable from existing Groq pipeline
- Uses Groq tokens (TTS + STT) — not free; daily TPD limit is 3,600/day on free tier
- Worth adding if intake completion rate is a problem; defer until post-launch

---

## MIDDLEWARE AUTH PROTECTION

Protected routes (require Supabase session):
/dashboard, /apply/, /admin, /simulator, /score,
/settings, /generate/, /documents/, /fdd/

Rate limits (production only):
- /login: 5 per 15 min per IP
- /api/quiz/submit, /api/email/results: 3 per hour per IP
- /api/generate/*, /api/analysis/*: 50 per day per user

---

## KNOWN ISSUES (Updated June 16, 2026)

| Issue | Priority | Status |
|---|---|---|
| **Groq TTS audio MIME + format** | **FIXED** | Session 21 — groq-tts.ts now uses `data:audio/wav;base64,`, tts/route.ts uses `response_format: 'wav'` |
| **Browser autoplay blocking TTS** | **FIXED** | Session 21 — silent WAV unlock on "Begin interview" click; ready phase gates auto-start |
| **Simulator loading flicker** | **FIXED** | Session 21 — loading guard now `!sessionInfo \|\| hasCaseFile === null` |
| **Groq TTS voice mode still blocked (owner action)** | **HIGH** | `canopylabs/orpheus-v1-english` returns 400 model_terms_required — org admin must accept at console.groq.com/playground?model=canopylabs%2Forpheus-v1-english |
| **seed-test-applicant.ts grabs current auth user** | **HIGH** | Do NOT run until a `--user-id` param is added — will re-break account linkage |
| **004_answers_source_update.sql not applied** | **MEDIUM** | Document upload source tracking broken until migration applied in Supabase SQL Editor |
| **FAQ corpus not confirmed seeded** | **MEDIUM** | Run `npx tsx scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts`; until done, all FAQ queries hit LLM fallback only |
| **getSession() security warnings** | MEDIUM | Multiple files use `.getSession()` — Supabase recommends `.getUser()`; sweep needed |
| Generation engine: approval gate, setState, empty boxes | MEDIUM | docs/sessions/SESSION_PLAN_GENERATION_FIXES.md |
| Bracket highlighting regex + checklist builder | MEDIUM | Regex only matches [BRACKET FORMAT] tags, not descriptive brackets like [passport number] |
| Supabase CLI defaults to wrong local migrations dir | **FIXED (Session 119u, July 3 2026)** | Root cause found: a stale, unrelated `/Users/owner/supabase/` directory (own `config.toml`, project_id "owner", only 2 old migration files) is what the CLI reads by default for `db push`/`migration list` — even when cwd is `/Users/owner/E2-go` — because it's linked to the *same* remote project (`cziphinlzfnlqlvynwnm`/"E2Go-App"). This makes the CLI see almost the entire real migration history as "missing locally" and suggest a destructive `migration repair --status reverted <~70 ids>` — do NOT run that, it would mark real applied migrations as reverted. Fix: always pass `--workdir /Users/owner/E2-go` explicitly, e.g. `supabase db push --workdir /Users/owner/E2-go` / `supabase migration list --workdir /Users/owner/E2-go`. Confirmed this resolves it cleanly (74-migration history, only genuinely new migrations shown pending). Stale `/Users/owner/supabase/` dir left untouched, not investigated for cleanup. |
| Resend domain verification unknown | MEDIUM | Check Resend dashboard; if e2go.app verified, revert sender to results@e2go.app |
| Stripe API version outdated (2024-06-20) | LOW | Upgrade apiVersion in scripts/stripe-setup.ts |
| Quiz nationality selector curl/browser verification | LOW | Works in browser |
| Fast Refresh occasional hot reload errors | LOW | Non-blocking |

---

## REFERRAL PARTNERS — STATUS

| Partner | Programme | Status |
|---|---|---|
| Mercury | Bank account opening — remote | Apply now (self-serve) |
| Wise | CAD→USD transfer affiliate | Apply now (self-serve) |
| Relay | Bank account opening — backup | Apply now (self-serve) |
| East West Bank | Cross-border banking | Apply at 10 users |
| Knightsbridge FX | Currency transfer | Apply at launch |
| OFX | Currency transfer | Apply at launch |
| RBC / TD cross-border | Banking referral | Apply at 50 users |
| Immigration attorneys | Warm leads (no fee) | Email now |
| Franchise brokers | FranNet, IFPG, FranChoice | Email now |
| Cross-border CPAs | MNP, BDO | Formalise at 20 users |

---

## SESSION LOG (summary — see BUILD_TRACKER.md for full log)

**June 9–10, 2026 — Full build session — ALL BLOCKERS RESOLVED:**
- Quiz v4.0 → v6.0: all 30 bugs fixed, test fixtures written
- Interview simulator: complete — Groq TTS, transcription, timer,
  $29.99 purchase, design fixes
- Module 3 case file redesign: 6 sections, all components, pre-fill
- Document upload: Session A (extraction) + Session B (UI) complete
- Auth image slider: Unsplash URLs removed, flag SVG
- Route cleanup: 53 → 47 routes, dead pages removed, middleware hardened
- Pricing updated: $550–$1,397 (old founding member pricing retired)
- E2go rebrand: capital E, lowercase go throughout
- Stripe Price IDs recreated at new amounts — all 10 tiers live
- Payments migration applied ✅
- Login page flag gradient fixed — left panel now visible
- Voice-to-text input built + mic bug fixed (getUserMedia pre-check)
- Case file UX redesign COMPLETE — two-panel layout, voice input,
  all variants preserved, data writes verified, build clean
  Commits: a9dfcb9 → 9172b2c

**June 10, 2026 — Auth, Quiz, Results — Session 1 (commit 400d1dc):**
- Auth: magic link removed, remember me, first/last name at signup
- Email verification enforced in middleware
- Navbar shows first name when logged in
- Results page personalised, score/flags contradiction fixed
- Smart post-login routing by application state
- Quiz questions: Q0-05, Q0-06, Q0-08c/d, Q0-09, Q0-10 updated
- Email results button: loading/success/error states
- Draft expiry: 7 days → 24 hours

**June 12, 2026 — Security fixes (42 fixes, 6 groups):**
- Groups 1-6: Auth bypass removed, API auth added, admin gating,
  input validation, Stripe tier validation, accessibility,
  generation engine fixes, email/RLS/scoring fixes
- Commits: 7741935, 7821b8b, 78f5d26, 5bf7623, a6a2d04, f6138bd

**June 12, 2026 — Post-verification-wall cleanup (Groups 5-14):**
- Warning timing, double-click debounce, email validation,
  session linking, Q0-03a simplification, Stripe success fix,
  post-login UX improvements, CI cleanup
- Commits: 6c72ee0, aab6c10, 61d8be8, 90de0a8, 00fdb14

**June 12, 2026 — Group 15: Terms-required dead-end fixed:**
- Rewrote /terms-required with scroll-to-accept UI
- Middleware now passes ?next param through terms gate
- ToS acceptance recorded at email-verify account creation
- Commit: 6edf6dc

**June 13, 2026 — Session 7: Three-Layer Experience/Framing Pipeline:**
- Layer 0: Targeted follow-up questions when experience_score = WEAK/CRITICAL
  - Fixed business-type lookup (Q0-business-type key + quiz_sessions fallback)
  - Added targeted experience-gap question using operational-needs table
  - Stays within Spec2's 8-question cap
- Layer 1: 9-dimension experience scoring + OpenRouter AI framing calls
  - calculateExperienceScore() — 9 pure dimension scorer functions
  - generateFramingDecisions() — real OpenRouter call (deepseek/deepseek-chat)
  - Graceful degradation: empty/failed → proceeds, doesn't block
- Layer 2: Hardened generation prompt with standing backstop instruction
  - qualifications.md updated: Layer 1 framing interpolation + standing instruction
  - Spec3 updated to match
- business-operational-needs.ts created — 12 franchise categories
- experience-pipeline-fixtures.ts — 5 synthetic fixtures, all pass
- Files: analysis-engine.ts, followup/generate-questions/route.ts,
  business-operational-needs.ts, qualifications.md, Spec3_Generation_Prompts.md
- Build: clean ✅

**June 13, 2026 — Session 8: Cover Page Data Source Fix:**
- Fixed personal_info JSONB query (column doesn't exist) → real column sources
- applicantName: `applications.principal_name`
- businessName: `applications.business_name`
- nationality: `quiz_sessions.result_json.country`
- passportNumber: not collected — bracket placeholder remains correct
- File: `src/app/api/generate/download/[applicationId]/route.ts`
- Commit: 6da0f6d
- Build: clean ✅

**June 13, 2026 — Session 9: Post-Generation Package Summary:**
- 5-section summary screen on `/documents/[applicationId]` (permanent section, NOT a gate)
- Sections: strength bars, strengths, gaps, suggestions, mandatory disclaimer
- Bonus: denial risk awareness section (WATCH/FLAG/CRITICAL only)
- Zero denial-prediction language — all text uses "may" framing
- Chen verified: experience STRONG, not flagged
- Fixture 5 verified: WEAK surfaced gracefully, actionable suggestion given
- Files created: `PackageSummary.tsx`, `case-brief/[applicationId]/route.ts`, `package-summary-verification.ts`
- File modified: `documents/[applicationId]/page.tsx`
- Build: clean ✅

**June 12, 2026 — Walsh & Pollard citation fix:**
- Removed incorrect "Matter of Walsh and Pollard, 8 I&N Dec. 288"
  from live prompt (cover_letter.md), spec (Spec3), and docs
- Replaced with 9 FAM 402.9-6(D) proportionality standard
- Deleted 6 dead hyphenated prompt files
- Grep sweep: zero remaining incorrect citations in live files
- Build: clean ✅

**June 13, 2026 — Session 10: Closeout gaps from Sessions 7-9:**
- Live framing call test (Fixture 3, Fixture 5) — Layer 1 verified
- Section 5.5 denial-language audit confirmed clean
- Chen franchise_training_offset verified correct per spec
- TODO/placeholder scan across Sessions 4-9 code
- Build: clean ✅

**June 13, 2026 — Session 11: Ask E2go FAQ Widget:**
- 355 Q&A pairs embedded via pgvector (faq_qa_corpus table)
- 3-layer retrieval: corpus cosine similarity → KB → model fallback
- Streaming responses via xiaomi/mimo-v2.5 via OpenRouter
- Rate limiting: 10 req/min per IP via Upstash Redis
- FaqWidget.tsx on homepage (later moved to /learn)
- API route: /api/faq/ask
- Build: clean ✅

**June 13, 2026 — Session 12: Login + Simulator UX:**
- Login submit flicker fixed — full-panel loading state from click to redirect
- Simulator teaser page — "complete case file" or "upload documents" paths
- IDEAS.md 12G gating logic unchanged
- Build: clean ✅

**June 13, 2026 — Session 13: Account Linkage Investigation:**
- Investigated account ↔ Chen application linkage
- Application ownership via user_id confirmed working
- Build: clean ✅

**June 13, 2026 — Session 14: Standalone Simulator Upload:**
- Quick-start route: /simulator/quick-start
- Document upload → extraction → answers → simulator question generation
- Reuses existing extraction engine (no rebuild)
- source='simulator_standalone' on applications table
- application_documents + document_discrepancies tables created
- Migration: 20260613240000_simulator_quick_start_tables.sql
- Build: clean ✅

**June 13, 2026 — Sessions 15-18: FAQ Widget Polish:**
- Session 15: Widget moved from homepage to /learn, homepage gets CTA
- Session 16: Animated gradient border at idle, thinking indicator during stream
- Session 17: Widget moved to top of /learn page
- Session 18: Scrollable answer container (max-height + overflow)
- Build: clean ✅

**June 13, 2026 — Session 19: Commit Audit:**
- All Sessions 14-18 changes committed and pushed
- Migration filename collision check confirmed distinct
- Build: clean ✅

**June 13, 2026 — Sessions 25-30: UX fixes:**
- Session 25: Nav on authenticated layouts
- Session 26: Login quiz-session linkage fix
- Sessions 27-29: Dashboard loading state, Supabase singleton fix
- Sessions 28-30: Simulator loading state, duplicate GoTrueClient resolved
- Build: clean ✅

**June 15, 2026 — Session 20: Simulator Enhancement:**
- DBA/franchise naming: `operatingName` added to SimulatorContext (types + engine); `targetState` null-safe
- Evaluate route: DBA-aware `businessLine` in prompt; explicit instruction not to flag trade-name divergence
- Case-summary route: enriched with `operatingName`, `targetState`, `businessCategory`, `investmentAmount`
- CaseFileSummary.tsx: full dossier redesign — cover page (file ref, classification grid), lettered Exhibits, Roman-numeral sections
- Gap-resolution flow: `simulator-gaps.ts`, `CaseGapsForm.tsx`, `case-gaps/` route; case-file page shows gap form first
- TTS migration: `playai-tts` (decommissioned) → `canopylabs/orpheus-v1-english` (Orpheus) with 200-char chunking; `groq-transcription.ts` deleted; voice-status endpoint added; timer/warning display restricted to voice mode only
- Tier separation: simulator-only dashboard + middleware block on /apply, /generate/, /documents/
- Homepage copy updated; simulator scored 4/10 — Tier 1/2/3 roadmap delivered
- Build: clean ✅ | ⚠️ TTS voice mode blocked — see KNOWN ISSUES

**June 16, 2026 — Session 22: Simulator Coaching System + Question Variety:**
- Evaluate route prompt rewritten: removed "2 sentences max" → 3-sentence coaching-quality
  feedback; 2-sentence suggestions with specific E-2 framing direction; max_tokens → 400
- New `/api/simulator/coaching-report` route: POST, xiaomi/mimo-v2.5-pro, 2400 tokens,
  90s timeout; processes all weak/inconsistent answers together; returns `QuestionCoaching[]`
  with `whatOfficerExpected`, `whatWasMissing`, `keyPoints[]`, `modelAnswer`, `documentReference`
- Model answer added to coaching cards: first-person, uses real business details, disclaimer
  shown: "guide to level of detail — not a script"
- Question variety: `pick()` + `shuffle()` helpers; 9 universal questions now have pools of
  3-4 phrasings; business type pools expanded to 5-6 per category, randomly sampled to 3
- New WP-05 probe for immigrant intent risk; 8 business type categories with personalized vars
- Timer redesign: both voice (ConversationalSession.tsx) and text (page.tsx) now show
  `position: fixed, bottom: 0` bar with depleting gold progress bar + 22px digital countdown;
  turns red + pulses at < 2 minutes; paddingBottom: 56px added to page containers
- `CoachingSummary` type: `needsWork[]` and `inconsistencies[]` now include `questionId` and
  `originalAnswer`; `QuestionCoaching` type now includes `modelAnswer: string`
- `fetchCoachingReport()` added to page.tsx: non-blocking async, fires after session complete,
  progressively updates via setCoachingSummary; coachingLoading state threads to SessionComplete
- `generateCoachingSummary()` type declarations fixed to match enriched interface
- Build: clean ✅

**June 19, 2026 — Session 36: Phase C complete (FDD-1 through FDD-5):**
- FDD-1: FDD upload + SSE extraction pipeline + review UI (commit 6441f5e)
- FDD-2: 5-dimension E-2 scoring engine (pure TS) + ODE model + LLM narrative + score dashboard (commit 59faec6)
- FDD-3: Territory market analysis — Census ACS 5-year ZCTA API, category-specific weights and radii, Google Places graceful degradation, LLM narrative (commit e16043b)
- FDD-4: Questions generator — 15 flag→question templates, 8 standard, data-gap triggers, 5 LLM bespoke, CaseProfile match score (0-100), filter tabs by audience, copy-all (commit 1d8e0a5)
- FDD-5: Final report (6 sections LLM), freemium teaser (hasAccess gate + 3 locked questions), 8 answer keys written to user's application, FDD index page with 5-stage progress bars (commit 4d58970)
- Lint/middleware: all ESLint errors resolved, /fdd/ added to middleware, clean build 119 pages (commit ec37352)
- BUILD_TRACKER updated: FDD-3/4/5 marked complete with full session log (commit 144ec48)
- Branch: dev. Build clean ✅.

**June 19, 2026 — Session 35: Phase A + B complete (EU-3 through PT-2):**
- EU-3: ARCHETYPE_WEIGHTS in scoreCase(); 4 archetypes × 6 categories; franchise/pre-start override priority; all 3 callers updated — Commits 5d083a5
- EU-4: Fire-and-forget buildCaseProfile() at 5 events + POST /api/profile/rebuild route — Commit e4a5281
- EU-5: PartialProfileTeaser component — 4 locked score cards + upgrade CTA on simulator-only dashboard — Commit c4f5729
- EU-6: Results completeness bar + confidence tier labels (quiz-derived / case-file-reported / document-confirmed / fully-verified) — Commit 74b5194
- PT-1: /settings rebuilt with 2-step confirmation + type-to-confirm; POST /api/account/delete wipes 16 tables + Supabase Auth user + Resend confirmation email — Commit 55a7c1b
- PT-2: Inline privacy notices at document upload (UploadClient) and case file first visit (apply/page.tsx) — Commit 835987e
- All builds clean. Branch: dev. Phase D (QA) is next.

**June 16, 2026 — Session 21: Audio Fix + Ready Screen + Architecture:**
- TTS audio FIXED: `groq-tts.ts` MIME type changed to `data:audio/wav;base64,`; `tts/route.ts` `response_format` changed to `'wav'` (Orpheus only accepts wav)
- Browser autoplay policy FIXED: added 'ready' phase to ConversationalSession; silent 44-byte WAV unlock on "Begin interview" click permanently unlocks audio for the page session
- Simulator loading flicker FIXED: loading guard in page.tsx now `!sessionInfo || hasCaseFile === null`
- Pre-interview ready screen: speaker test, mic test, "Begin interview" button; session timer now starts on button click (not on mount)
- Three-module product architecture locked: Simulator | Gap Analysis | Document Generation
- Case Intelligence Profile (CIP) concept locked: shared data model fed by all intake sources, consumed by all modules
- Adaptive intake pattern locked: document-first extraction → pre-filled confirmation → "do you have a document for X?" → bare questions last
- Gap Analysis architecture planned: 6 evidence categories, scoring weights, remediation loop
- Process flow widget designed (HTML/JS); React component conversion pending
- Build: clean ✅

**June 24, 2026 — Session 69: Page transitions + login animation:**
- PageTransition component: fade+slide on every route change (220ms, Framer Motion v12 `motion/react`)
- Login animated submit overlay: AnimatePresence fade-in over form, GenerationProgress with 3 auth steps
- motion.button with whileTap scale on Sign In button; animated error message slide-in
- GenerationProgress 9-state audit: 6 upgraded, 3 kept as spinners; QA-UX-01–08 added to FEATURE_INVENTORY
- Commits: 3b92519, 527bd8c — Build: clean ✅

**Next session priorities (as of June 19, 2026 — Phase A + B + C complete):**

**Owner actions (pending — unblock these before launch):**
1. [USER ACTION] Accept Groq TTS terms at console.groq.com — voice mode blocked
2. [USER ACTION] Run SQL: `UPDATE pricing SET stripe_price_id = 'price_1Tim5fF7Ggk3LUEy2JGRRKrB', amount_cents = 2999 WHERE tier_id = 'simulator_3pack';`
3. [USER ACTION] Update Vercel env STRIPE_PRICE_SIMULATOR_3PACK → price_1Tim5fF7Ggk3LUEy2JGRRKrB
4. [USER ACTION] Refund $197 test charge in Stripe dashboard
5. [USER ACTION] Run FAQ seed scripts: `npx tsx scripts/seed-faq-corpus.ts` + `seed-faq-kb-chunks.ts`
6. [USER ACTION] Confirm FDD pricing (placeholder $297 in teaser) — unblocks FDD freemium gate wiring
7. [USER ACTION] Add GOOGLE_PLACES_API_KEY to .env.local — enables real competitor data in territory analysis

**Code sessions (in order):**
1. Phase D — QA-A: Public pages audit (/, /quiz, /results, /pricing, /learn, auth pages)
2. Phase D — QA-B: Authenticated case file audit (dashboard, /apply/*, /settings, /score)
3. Phase D — QA-C: Simulator + generation + API routes audit
4. FDD freemium gate: wire hasAccess in /fdd/report/[fddId]/page.tsx to payment check
5. Generation engine fixes — docs/sessions/SESSION_PLAN_GENERATION_FIXES.md
6. SESSION22_SENTRY_ERROR_TRACKING (pre-launch blocker — no error visibility)

**Unexecuted sessions from prior audit (never built, no session files yet):**
- SESSION21_INTERVIEW_PREP_KIT — now REPLACED by the coaching report system (Session 22)
- SESSION22_SENTRY_ERROR_TRACKING — error monitoring, pre-launch requirement
- SESSION23_UPTIME_MONITORING — uptime monitoring
- MODULE4_FOLLOWUP_UI — Module 4 follow-up conversation UI (Spec2_Followup_Conversation.md)

---

## MASTER SPRINT PLAN (Approved June 19, 2026)

See BUILD_TRACKER.md section "MASTER SPRINT PLAN" for full detail.

### Phase A — Engine Unification — ✅ COMPLETE (June 19, 2026)

| ID | Status | What it does |
|---|---|---|
| EU-1 | ✅ | Expanded `buildCaseProfile()` — reads answers + docs + sim sessions; completeness_score, data_state, dimension scores |
| EU-2 | ✅ | Archetype-aware question pools + gap-targeted probes in interview-prep |
| EU-3 | ✅ | `ARCHETYPE_WEIGHTS` per archetype in `scoreCase()`; franchise/pre-start overrides take priority |
| EU-4 | ✅ | Fire-and-forget `buildCaseProfile()` triggers at 5 events + `POST /api/profile/rebuild` route |
| EU-5 | ✅ | `PartialProfileTeaser` — 4 locked score cards + upgrade CTA on simulator-only dashboard |
| EU-6 | ✅ | Completeness bar + confidence tier labels on results page (quiz-derived → fully verified) |

**Rule:** All connections fall back gracefully to current behavior if profile is sparse.

### Phase B — Privacy & Trust — ✅ COMPLETE (June 19, 2026)

| ID | Status | What it does |
|---|---|---|
| PT-1 | ✅ | `/settings` rebuilt with 2-step deletion UI (type-to-confirm); `POST /api/account/delete` wipes 16 tables + Auth user; Resend confirmation email |
| PT-2 | ✅ | Inline privacy notices at document upload (`UploadClient`) and case file first visit (`apply/page.tsx`) |

### Phase C — FDD Intelligence — ✅ COMPLETE (June 19, 2026)

Separate paid add-on. Franchise clients upload FDD (Franchise Disclosure Document) for AI-powered E-2 analysis.

| ID | Status | What it does |
|---|---|---|
| FDD-DESIGN | ✅ | 50-field extraction schema, 5-dimension scoring rubric, ODE model, territory spec, questions spec |
| FDD-1 | ✅ | PDF ingestion + 4-pass chunked extraction + SSE stream + staleness/registration gate + DB schema + upload/review UI |
| FDD-2 | ✅ | 5-dimension E-2 scoring engine (pure TS, no LLM for numerics) + ODE model + LLM narrative + score dashboard |
| FDD-3 | ✅ | Territory market analysis: Census ACS 5-year + Google Places (graceful degradation) + category weights + narrative |
| FDD-4 | ✅ | Questions generator: 15 flag→question templates + 8 standard + data-gap triggers + 5 LLM bespoke + CaseProfile match |
| FDD-5 | ✅ | Final report + freemium teaser (hasAccess gate) + 8 answer keys written back to user's application |

**Freemium gate:** `hasAccess` in `/fdd/report/[fddId]/page.tsx` is currently `true` for all auth users. Wire to payment check when FDD pricing is confirmed ($297 placeholder in teaser). Gate structure is built.
**Google Places:** `GOOGLE_PLACES_API_KEY` not in .env.local — competition scoring uses neutral fallback (score 50). Add key to enable real competitor data.
**Multi-FDD comparison:** deprioritized, not built.

### Phase D — QA (3 sprints, run AFTER EU-1 through EU-6 are complete)

Agent writes expected behavior spec from BUILD_TRACKER + spec files before executing — no separate doc from owner needed.

| ID | What it covers |
|---|---|
| QA-A | All public routes (/, /quiz, /results, /pricing, /learn, /about, /login, /signup, etc.) — render, links, form submissions, hard stops, copy quality, mobile 390px, console errors |
| QA-B | All authenticated case file routes (/dashboard, /apply/*, /score, /settings) — auth gates, data display, autosave, pre-fill, empty states. Requires seeded test account. |
| QA-C | Simulator + generation + API routes (/simulator, /gap-analysis, /generate/*, /documents/*, all /api/*) — voice/text modes, document pipeline, ZIP download, payment gating, API auth on every route |

Deliverable per sprint: report listing ✅ pass / ⚠️ issue / ❌ broken per page and item with reproduction steps.

### Phase E — Legal & Compliance

| ID | What it is | Priority |
|---|---|---|
| LC-1 | PIPEDA compliance review — audit /privacy against Canadian law; add explicit "no AI training on your data" statement; GDPR awareness for EU treaty country users. Build with PT-2. | BEFORE LAUNCH |
| LC-SOC2 | SOC 2 — DEFERRED. Not needed until first enterprise client (law firm, corporate immigration dept, franchise broker network) asks for it. Cost: $15K–$50K. Tool when ready: Vanta or Drata. Revisit 12-18 months post-launch. | DEFERRED |
