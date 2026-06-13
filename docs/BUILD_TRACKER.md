# e2go.app — Build Tracker & Session Handoff

**Last Updated:** June 13, 2026 — End of Session 10
**App Name:** e2go.app
**Stack:** Next.js 14 · TypeScript · Tailwind CSS · Supabase · MiniMax M1 via OpenRouter
**Dev Server:** localhost:3000
**Project Path:** ~/E2-go

---

## HOW TO USE THIS DOCUMENT

- Read this at the START of every Claude Code session
- Update STATUS column as features are completed
- Add new features discovered during the session to the New Features section
- Save updated version to ~/E2-go/BUILD_TRACKER.md after every session
- This is the single source of truth for the entire project

---

## SESSION COMMANDS

**To start any session:** type `start session`
**To end any session:** type `end session`

### "start session" behavior
Claude Code must:
1. Read CLAUDE_CONTEXT.md completely
2. Read BUILD_TRACKER.md completely
3. Report: what was completed last session, what is broken, next priority task, current app status
4. Confirm all 10 standing build rules are loaded
5. Ask: "Ready to confirm and begin?" — do not start work until confirmed

### "end session" behavior
Claude Code must:
1. Update BUILD_TRACKER.md — mark completions ✅, add bugs, add new features, update session log, update Session 2 priorities
2. Update CLAUDE_CONTEXT.md if any standing rules changed
3. Run npm run build — confirm clean
4. Report: "Session complete. Here is what was accomplished: [summary]"
---

## OVERALL PROGRESS

| Phase | Status | Notes |
|---|---|---|
| Design Library (Stitch) | ✅ COMPLETE | 10 screens in docs/stitch/ |
| Next.js Scaffold | ✅ COMPLETE | App Router, TypeScript, Tailwind |
| Landing Page | ✅ COMPLETE | All sections built and compiling |
| Quiz (Module 0) | ✅ COMPLETE | JSON-driven, webpack error resolved |
| Results Page | ✅ COMPLETE | Reads localStorage, all 4 outcomes |
| Pricing Page | ✅ COMPLETE | 4 tiers, Stripe placeholder |
| Dashboard | ✅ COMPLETE | Static demo data (Alex, 35%, 74/100) |
| Nav + Footer Components | ✅ COMPLETE | Shared across all pages |
| Supabase Connection | ✅ COMPLETE | {"connected":true} confirmed |
| Database Schema | ✅ COMPLETE | 17 tables, RLS policies, profiles trigger |
| Auth (Login/Signup) | ✅ COMPLETE | Supabase auth wired, middleware protected |
| Module 1–6 (Core App) | 🔄 IN PROGRESS | Module 3 tabs partially built |
| AI Features (MiniMax) | 🔄 IN PROGRESS | OpenRouter client built, analysis engine live |
| PDF Export | ⬜ NOT STARTED | |
| Stripe Integration | ⬜ NOT STARTED | After company incorporated + HST registered |
| Referral Engine | ⬜ NOT STARTED | Design now, build after core app |
| B2B Subscriptions | ⬜ NOT STARTED | Phase 2 |
| Deployment (Vercel) | ⬜ NOT STARTED | |

---

## ARCHITECTURE DECISIONS — LOCKED

| Decision | Detail |
|---|---|
| Paywall timing | MOVED — triggers AFTER Module 3 data collection, before document generation. Show 1–2 page preview of real output. Free to collect answers, pay to download. |
| Interview session limit | 2 sessions included per application (shared for family). Additional: $9.99 per 3-session bundle. |
| Document generation | Sequential — ONE document at a time. Checkpointed. Crash recovery. Never parallel. |
| Supabase users | Use auth.users — create public.profiles instead of public.users |
| AI routing | All MiniMax calls server-side only. API key never in browser. |
| Document ownership | Each piece of information lives in exactly one document. No repetition across tabs. |
| Form terminology | All questions use exact DS-160 / government form terminology — no paraphrasing. |

---

## DESIGN LIBRARY — STITCH FILES

All files in ~/E2-go/docs/stitch/

| File | Screen | Status |
|---|---|---|
| landing.html | Landing page desktop | ✅ Ready |
| landing-mobile.html | Landing page mobile | ✅ Ready |
| quiz.html | Module 0 quiz shell | ✅ Ready |
| results.html | Eligibility results + paywall | ✅ Ready |
| interview-engine.html | Single question screen | ✅ Ready |
| dashboard.html | Post-login dashboard | ✅ Ready |
| pricing.html | Pricing tiers + testimonials | ✅ Ready |
| sources.html | Official sources section | ✅ Ready |
| testimonials.html | Testimonials section | ✅ Ready |
| features.html | Full feature list section | ✅ Ready |

**Stitch screens still needed:**
- /learn education hub page
- Module 1 referral consent screen (5 categories)
- Document generation narrative progress screen
- Attorney portal dashboard (Phase 2)
- Franchise broker portal dashboard (Phase 2)

---

## PAGES — BUILD STATUS

| Page | Route | Status | Notes |
|---|---|---|---|
| Landing Page | / | ✅ COMPLETE | All sections, flag background, features |
| Quiz | /quiz | ✅ COMPLETE | JSON-driven, all question types |
| Results | /results | ✅ COMPLETE | All 4 outcomes, 6-pillar display |
| Pricing | /pricing | ✅ COMPLETE | 4 tiers, Stripe placeholder |
| Dashboard | /dashboard | ✅ COMPLETE | Static demo, real data after auth |
| Login | /login | ✅ COMPLETE | Supabase auth, error handling |
| Sign Up | /signup | ✅ COMPLETE | Supabase auth, profile auto-created |
| Apply / Tab A | /apply/tab-a | ⬜ NOT STARTED | |
| Apply / Tabs B–L | /apply/[tab] | ⬜ NOT STARTED | Dynamic route |
| Confidence Score | /score | ⬜ NOT STARTED | |
| Interview Simulator | /simulator | ⬜ NOT STARTED | |
| PDF Export | /export | ⬜ NOT STARTED | |
| Document Generation | /generating | ✅ COMPLETE | Sequential, checkpointed, 15-file ZIP |
| Package Summary | /documents/[appId] | ✅ COMPLETE | Post-generation score + gaps + disclaimer (Session 9) |
| Support | /support | ⬜ NOT STARTED | |
| Support — New Ticket | /support/new | ⬜ NOT STARTED | |
| Support — My Tickets | /support/tickets | ⬜ NOT STARTED | |
| Admin Panel | /admin | ⬜ NOT STARTED | Hidden, role-protected |
| Education Hub | /learn | ⬜ NOT STARTED | SEO foundation |
| Learn — What is E-2 | /learn/what-is-e2-visa | ⬜ NOT STARTED | |
| Learn — Requirements | /learn/requirements | ⬜ NOT STARTED | |
| Learn — Investment | /learn/investment | ⬜ NOT STARTED | |
| Learn — Businesses | /learn/businesses | ⬜ NOT STARTED | |
| Learn — Process | /learn/process | ⬜ NOT STARTED | |
| Learn — Canada | /learn/canada | ⬜ NOT STARTED | |
| Learn — E-2 vs EB-5 | /learn/e2-vs-eb5 | ⬜ NOT STARTED | |
| Blog Hub | /blog | ⬜ NOT STARTED | MDX, 26-post calendar |
| Blog Post | /blog/[slug] | ⬜ NOT STARTED | Dynamic route |
| Partner Portal — Attorney | /partner/attorney | ⬜ NOT STARTED | Phase 2 |
| Partner Portal — Broker | /partner/broker | ⬜ NOT STARTED | Phase 2 |

---

## MODULE 0 — FREE ELIGIBILITY QUIZ

| Feature | Status | Notes |
|---|---|---|
| Question engine (JSON-driven) | ✅ COMPLETE | Reads module0_questions.json |
| One question at a time | ✅ COMPLETE | |
| Auto-advance on select | ✅ COMPLETE | |
| Back button | ✅ COMPLETE | |
| Progress bar + section label | ✅ COMPLETE | |
| Conditional questions (show_if) | ✅ COMPLETE | |
| Tooltip per question | ✅ COMPLETE | |
| Hard stop screens (PR-01–PR-09) | ✅ COMPLETE | |
| Currency question Q0-05 | ✅ COMPLETE | |
| CAD/USD live conversion | ⬜ NOT STARTED | Real-time with 0.73 rate |
| Proportionality warning (W-PROP) | ⬜ NOT STARTED | Inline as user types |
| Multiselect questions | ✅ COMPLETE | |
| Email capture (Q0-21) | ✅ COMPLETE | |
| CASL opt-in checkbox | ⬜ NOT STARTED | |
| Scoring engine | ✅ COMPLETE | module0_scoring_logic.json wired |
| Non-immigrant intent composite | ✅ COMPLETE | 4 outcomes calculated |
| Save result to localStorage | ✅ COMPLETE | e2go_quiz_result key |
| Save quiz_session to Supabase | ✅ COMPLETE | After final Q, saves outcome |
| Redirect to /results | ✅ COMPLETE | router.push on completion |

---

## MODULE 1 — ONBOARDING + CONSENT

| Feature | Status | Notes |
|---|---|---|
| Account creation flow | ⬜ | Requires Supabase auth |
| Application type routing (solo/partnership) | ⬜ | |
| ToS acceptance + consent log | ⬜ | PIPEDA compliant |
| CASL marketing consent | ⬜ | Separate from ToS, logged |
| Family composition setup | ⬜ | |
| Referral consent screen (5 categories) | ⬜ | See Referral Engine section |
| Application record creation in DB | ⬜ | |

---

## MODULE 2 — BUSINESS TYPE ADVISOR

| Feature | Status | Notes |
|---|---|---|
| Background questionnaire | ⬜ | Experience, budget, state preference |
| Business category cards | ⬜ | Complexity badges (green/amber/red) |
| Incompatible business detection | ⬜ | Cannabis, passive RE, marginal |
| Investment amount warning | ⬜ | Business-type-specific minimums |
| Business shortlist (save up to 5) | ⬜ | |
| Franchise/broker referral trigger | ⬜ | Consent-based, see Referral Engine |
| Experience gap detection trigger | ⬜ | Feeds into Module 3 probe questions |

---

## MODULE 3 — DOCUMENT INTERVIEW ENGINE

**Rule:** All questions must use DS-160 terminology. All questions must be descriptive (see Form Standards section).

| Tab | Questions | Status | Spec File |
|---|---|---|---|
| Tab A: DS-160 Reference | ~25–30 | ⬜ | module3_tab_a.md |
| Tab B: Personal Information | ~15–20 | ⬜ | module3_tabs_b_e.md |
| Tab C: Visa Category Confirmation | ~5–8 | ⬜ | Auto-generated |
| Tab D: Cover Letter | ~20–25 | ⬜ | AI-generated narrative |
| Tab E: Ownership Structure | ~10–15 | ⬜ | module3_tabs_b_e.md |
| Tab F: Investment Proof | ~25–35 | ⬜ | module3_tabs_f_i.md + Template 1 |
| Tab G: Real Business Evidence | ~15–20 | ⬜ | module3_tabs_f_i.md |
| Tab H: Funds Flow | ~20–30 | ⬜ | module3_tabs_f_i.md + Template 1 |
| Tab I: Non-Marginality Evidence | ~20–25 | ⬜ | module3_tabs_f_i.md |
| Tab J: Qualifications + Org Chart | ~20–25 | ⬜ | module3_tabs_j_l.md + Template 4 |
| Tab K: Business Plan | ~30–40 | ⬜ | module3_tabs_j_l.md + Template 2 |
| Tab L: Family Dependents | ~15–20 | ⬜ | module3_tabs_j_l.md |
| **TOTAL** | **~220–270** | ⬜ | |

**Spreadsheet Templates:**

| Template | Purpose | Status |
|---|---|---|
| Template 1 | Source & Path of Funds | ⬜ |
| Template 2 | Business Financial Projections | ⬜ |
| Template 3 | Business Asset & Expense Register | ⬜ |
| Template 4 | Organizational Chart Data | ⬜ |
| Template 5 | Employment & Hiring Plan | ⬜ |

**Adaptive Case-Building Features:**

| Feature | Status | Notes |
|---|---|---|
| Experience gap detection engine | ⬜ | Per business type |
| Probe question bank (8 categories) | ⬜ | See Adaptive System section |
| Probe cascade per gap type | ⬜ | 5–7 questions, obvious → non-obvious |
| Case-building context object builder | ⬜ | Feeds document generation |
| Answer auto-save (every question, 2s) | ⬜ | Critical — never lose progress |
| Session resume on return | ⬜ | "Welcome back. You left off at..." |

---

## MODULE 4 — APPLICATION CONFIDENCE SCORE

| Feature | Status | Notes |
|---|---|---|
| 8-dimension scoring engine | ⬜ | Spec: Vol3 Section 7.5 |
| Investment Substantiality (0–25pts) | ⬜ | |
| Source & Path of Funds (0–20pts) | ⬜ | |
| Non-Marginality (0–20pts) | ⬜ | |
| Active Direction & Development (0–15pts) | ⬜ | |
| Business Plan Quality (0–10pts) | ⬜ | |
| Investor Qualifications (0–5pts) | ⬜ | |
| Real & Operating Enterprise (0–5pts) | ⬜ | |
| Immigrant Intent Risk (modifier) | ⬜ | |
| Traffic light dashboard UI | ⬜ | |
| Per-dimension fix recommendations | ⬜ | |
| Score recalculation on answer edit | ⬜ | |
| Score history tracking | ⬜ | |
| Cross-tab consistency checker | ⬜ | |

---

## MODULE 5 — INTERVIEW SIMULATOR

**Key rules:**
- 10–12 questions per session, max 15 minutes (mirrors real Toronto consulate interview)
- Questions personalized to user's specific application — never generic
- 2 sessions included per application (shared for family)
- Additional sessions: $9.99 per 3-session bundle
- Score framing: always constructive — never lead with a number

| Feature | Status | Notes |
|---|---|---|
| Spec file | ⬜ | Create docs/INTERVIEW_SIMULATOR_SPEC.md |
| User context object builder | ⬜ | Built from Module 3 answers |
| Universal questions (9) | ⬜ | Injected with user's actual data |
| Business-type conditional questions | ⬜ | Per category — see spec |
| Profile-flag conditional questions | ⬜ | Prior denial, sold home, etc. |
| Question personalization injection | ⬜ | Business name, amount, sources in question text |
| Session randomization | ⬜ | Mix changes per session |
| MiniMax answer evaluation | ⬜ | Per-answer feedback |
| Completeness scoring | ⬜ | Yes / Partial / No |
| Consistency check vs. filed application | ⬜ | Key differentiator |
| Strength rating | ⬜ | Strong / Acceptable / Weak / Concerning |
| Stronger answer framework | ⬜ | Uses user's specific details |
| E-2 principle being tested | ⬜ | Per question footnote |
| End-of-session readiness report | ⬜ | |
| Score trend across sessions | ⬜ | Visible improvement tracking |
| "Interview Ready" achievement | ⬜ | All questions = Strong |
| Session limit enforcement | ⬜ | 2 included, block + upsell after |
| Additional session purchase | ⬜ | $9.99 / 3-session bundle via Stripe |
| Voice mode (Whisper API) | ⬜ | Post-MVP |
| Filler word detection | ⬜ | Post-MVP |

---

## MODULE 6 — DOCUMENT GENERATION PIPELINE

**Key rules:**
- Generate ONE document at a time — never parallel
- Save to database immediately after each document completes
- Never regenerate a document already saved and complete
- User never sees a document below quality threshold

### Generation Order

```
Step 1  → Cover Letter (Tab D)        → save → continue
Step 2  → Source of Funds (Tab H)     → save → continue
Step 3  → Investment Proof (Tab F)    → save → continue
Step 4  → Business Plan (Tab K)       → save → continue
Step 5  → Qualifications (Tab J)      → save → continue
Step 6  → DS-160 Reference (Tab A)    → save → continue
Step 7  → Gap analysis (all docs)     → save gap report
Step 8  → Repetition checker          → save clean versions
Step 9  → Consistency checker         → lock final versions
Step 10 → Quality gate                → pass/fail per document
Step 11 → Package preview unlocked
```

### Crash Recovery

| Scenario | Behavior |
|---|---|
| A — Transient (timeout, network blip) | Auto-retry 3x: 30s → 2min → 5min. User sees nothing. |
| B — One document fails persistently | Others complete. Failed doc retries every 15min for 24hrs. Email user when recovered. |
| C — Complete failure | All completed docs preserved. User sees: "We'll email you when ready." Support ticket auto-created. Human review if not recovered in 2 hours. |

### Feature Build Status

| Feature | Status | Notes |
|---|---|---|
| Sequential generation engine | ✅ COMPLETE | One doc at a time, checkpointed |
| Checkpoint DB table | ✅ COMPLETE | document_generation_jobs |
| Server-Sent Events progress updates | ⬜ | Real-time step display |
| Narrative progress screen | ⬜ | Not a spinner — show each step |
| Conversational gap-fill interface | ⬜ | Chat UI during generation |
| Gap analysis engine (rule-based) | ✅ COMPLETE | Requirements matrix per document |
| Repetition checker (AI) | ⬜ | Flags cross-document repetition |
| Consistency checker (rule-based) | ⬜ | Same facts stated identically everywhere |
| Quality gate | ⬜ | Completeness, specificity, tone, length |
| Re-prompt on quality fail | ⬜ | MiniMax retry with feedback |
| Human review flag | ⬜ | Admin queue for persistent failures |
| Cover letter generation | ✅ COMPLETE | Tab D — AI narrative via generation-engine |
| Source of funds chronology | ✅ COMPLETE | Tab H — from Template 1 |
| Investment proof narrative | ✅ COMPLETE | Tab F |
| Business plan | ✅ COMPLETE | Tab K — full document |
| Qualifications narrative | ✅ COMPLETE | Tab J |
| DS-160 reference sheet | ✅ COMPLETE | Tab A — pre-filled |
| 5-year financial projections | ⬜ | From Template 2 |
| Capital allocation table | ⬜ | |
| Job creation narrative + chart | ⬜ | From Template 5 |
| Organizational chart | ⬜ | From Template 4 |
| Binder assembly guide | ✅ COMPLETE | Personalized per-tab (Session 4) |
| PDF export (3 per application) | ⬜ | Anti-sharing |
| 70-page limit enforcement | ⬜ | Toronto consulate limit |
| Export log with timestamp | ⬜ | |
| Preview — strongest sections first | ⬜ | Cover Letter → Qualifications → Plan |
| "Help me improve this" section button | ⬜ | Triggers targeted re-ask |

---

## COMPLETE TIER MODULES

| Module | Feature | Status | Notes |
|---|---|---|---|
| Module 7 | LLC Formation Wizard (50-state) | ⬜ | |
| Module 8 | U.S. Banking Setup Guide | ⬜ | Cross-border specialists |
| Module 9 | Canadian Departure Tax Planner | ⬜ | RRSP, departure returns, FBAR |
| Module 10 | Interview Simulator Voice Mode | ⬜ | Whisper API |
| Module 11 | Full Referral Engine UI | ⬜ | All 5 categories with consent flow |

---

## POST-APPROVAL MODULES

| Module | Feature | Status | Price |
|---|---|---|---|
| Module 12 | Compliance Calendar | ⬜ | $29/year — auto-enroll on approval |
| Module 13 | Renewal Module | ⬜ | $97–$147 |
| Module 14 | Green Card Pathway Roadmap | ⬜ | TBD |
| Module 15 | Community Forum | ⬜ | TBD |

---

## INFRASTRUCTURE & BACKEND

| Feature | Status | Notes |
|---|---|---|
| Supabase project setup | ✅ COMPLETE | Connected, keys in .env.local |
| Database schema | 🔄 IN PROGRESS | users → profiles fix needed |
| Auth (email + magic link) | ⬜ | |
| Row-level security (RLS) | ⬜ | All tables |
| RLS policies | ⬜ | Users access own rows only |
| Admin role bypasses RLS | ⬜ | |
| Answer auto-save | ⬜ | Every question, 2s delay |
| Session resume | ⬜ | Return to last answered question |
| Session persistence (cross-device) | ⬜ | |
| Device fingerprinting | ⬜ | 3+ devices → alert |
| PDF export logging | ⬜ | Timestamp per export |
| Outcome tracking | ⬜ | CEAC verification integration |
| Consent log (PIPEDA) | ⬜ | Per action with timestamp |
| CASL compliance | ⬜ | Opt-in logged per category |
| OpenRouter/MiniMax client | ✅ COMPLETE | src/lib/ai.ts + analysis-engine.ts |
| AI API route | ✅ COMPLETE | src/app/api/ai/route.ts |
| Email service (Resend) | ⬜ | Transactional + newsletter |
| Re-engagement email sequence | ⬜ | Days 3, 7, 14, 30 |

### Database Tables

| Table | Status | Notes |
|---|---|---|
| profiles | ⬜ | Replaces public.users — extends auth.users |
| applications | ⬜ | |
| answers | ⬜ | Every answer, auto-saved |
| quiz_sessions | ⬜ | Module 0 results |
| consent_log | ⬜ | PIPEDA + CASL |
| pdf_exports | ⬜ | 3 per application limit |
| ai_usage_log | ⬜ | Token tracking per feature |
| document_generation_jobs | ⬜ | Checkpoint table |
| simulation_sessions | ⬜ | |
| simulation_answers | ⬜ | With feedback JSON |
| tickets | ⬜ | Support ticketing |
| ticket_replies | ⬜ | |
| admin_users | ⬜ | Separate from regular users |
| feature_flags | ⬜ | Module on/off without deploy |
| referral_consents | ⬜ | Per category, per user |
| referral_leads | ⬜ | Lead sent to which partner |
| referral_partners | ⬜ | Attorney/broker/banking/CPA/RE |
| partner_subscriptions | ⬜ | B2B subscription billing |
| partner_leads | ⬜ | Which lead went to which subscriber |
| partner_agreements | ⬜ | Signed DPA per subscriber |

---

## PAYMENTS — STRIPE

| Feature | Status | Notes |
|---|---|---|
| Stripe account setup | ⬜ | After company incorporated |
| HST/GST registration | ⬜ | Canadian tax requirement |
| B2C pricing tiers wired | ⬜ | $247–$647 |
| Payment success → unlock modules | ⬜ | |
| Add-on: extra dependents | ⬜ | +$25/dependent |
| Add-on: extra export bundle | ⬜ | +$19/3 exports |
| Add-on: extra simulator sessions | ⬜ | $9.99/3-session bundle |
| Renewal module purchase | ⬜ | $97–$147 |
| Compliance calendar subscription | ⬜ | $29/year |
| B2B attorney subscriptions | ⬜ | $299–$799/month |
| B2B broker subscriptions | ⬜ | $399–$999/month |
| Payment failure handling | ⬜ | Calm message + retry + recovery email |
| Failed payment admin notification | ⬜ | |

---

## SECURITY & COMPLIANCE

| Feature | Status | Notes |
|---|---|---|
| Security headers (next.config.mjs) | ⬜ | CSP, X-Frame-Options, etc. — Session 2 |
| Rate limiting — login | ⬜ | 5 attempts → 15min lockout |
| Rate limiting — AI API | ⬜ | 50 calls/user/day |
| Rate limiting — quiz | ⬜ | 3 attempts/IP/hour |
| Input sanitization | ⬜ | All text fields |
| Session timeout | ⬜ | 24hr inactivity |
| Concurrent session detection | ⬜ | Alert on 2+ active sessions |
| Device fingerprinting | ⬜ | 3+ devices in 7 days → alert |
| PII encryption at rest | ⬜ | Supabase encryption |
| IP address hashing | ⬜ | PIPEDA — never store raw IPs |
| Admin 2FA | ⬜ | Required for /admin access |
| Admin audit log | ⬜ | Every admin action timestamped |
| Sentry error monitoring | ⬜ | |
| Dependency scanning | ⬜ | npm audit in CI |
| HTTPS enforced | ⬜ | Vercel handles this |
| CORS restricted | ⬜ | App domain only |
| PIPEDA compliance | ⬜ | Answers only, no raw documents |
| CASL compliance | ⬜ | Opt-in logged, unsubscribe on every email |
| Cookie consent banner | ⬜ | Minimal cookies only |
| Privacy Policy | ⬜ | Vol3 Section 8.2 |
| Terms of Service | ⬜ | Vol3 Section 8.1 |
| In-app disclaimer variants (7) | ⬜ | Vol3 Section 8.3 |

---

## SEO

| Feature | Status | Notes |
|---|---|---|
| Meta title + description (all pages) | ⬜ | Session 2 |
| Open Graph tags | ⬜ | Session 2 |
| Canonical URLs | ⬜ | Session 2 |
| Sitemap.xml (auto-generated) | ⬜ | Session 2 |
| Robots.txt | ⬜ | Session 2 |
| JSON-LD — Organization schema | ⬜ | Session 2 |
| JSON-LD — FAQ schema | ⬜ | Session 2 |
| JSON-LD — Article schema (blog) | ⬜ | Session 3 |
| JSON-LD — BreadcrumbList | ⬜ | Session 2 |
| Blog infrastructure (MDX) | ⬜ | Session 3 |
| Blog post dynamic route | ⬜ | /blog/[slug] |
| 26-post content calendar | ⬜ | Vol3 Section 10.4 |
| Google Search Console setup | ⬜ | After deployment |
| Google Analytics 4 (privacy) | ⬜ | After deployment |
| Core Web Vitals optimization | ⬜ | Session 4 |

**Primary keyword targets:**
- "E-2 visa Canada"
- "E-2 visa for Canadians"
- "how much to invest E-2 visa"
- "E-2 visa requirements Canada"
- "Toronto consulate E-2 visa"
- "E-2 visa businesses that qualify"

---

## SUPPORT TICKETING

Routes: /support · /support/new · /support/tickets
Priority: MEDIUM — build after core app complete (Session 4–5)

| Feature | Status | Notes |
|---|---|---|
| "Get Help" button (fixed position, all pages) | ⬜ | |
| Ticket submission form | ⬜ | Subject, description, category, screenshot |
| Category options | ⬜ | Technical / Application Question / Billing / Other |
| Email confirmation on submission | ⬜ | Via Resend |
| Ticket status tracking | ⬜ | Open / In Review / Resolved |
| User ticket history | ⬜ | /support/tickets |
| Admin reply (triggers email to user) | ⬜ | From admin panel |
| Auto-ticket on generation failure | ⬜ | Scenario C crash behavior |

---

## ADMIN PANEL

Route: /admin — hidden, admin-role protected, not linked anywhere public
Priority: MEDIUM — build after core app complete (Session 4–5)

| Feature | Status | Notes |
|---|---|---|
| Admin role in Supabase | ⬜ | Separate from user auth |
| Route protection middleware | ⬜ | Role check, not just auth |
| Admin audit log | ⬜ | Every action timestamped |
| 2FA required for admin | ⬜ | |
| **Dashboard / Overview** | | |
| Total users (all time, 30d, 7d) | ⬜ | |
| Total paid applications by tier | ⬜ | |
| Revenue (total + MRR equivalent) | ⬜ | |
| Conversion rate (quiz → paid) | ⬜ | |
| Quiz completion rate | ⬜ | Started vs finished |
| Hard stop frequency by PR code | ⬜ | Which codes hitting most |
| Attorney referral rate | ⬜ | |
| Active sessions today | ⬜ | |
| **Applications** | | |
| Full searchable list with filters | ⬜ | Tier, status, date, route |
| Per-application detail view | ⬜ | All answers, flags, score |
| CSV export | ⬜ | |
| **Users** | | |
| Full user list with search | ⬜ | |
| Per-user detail view | ⬜ | Account, application, tickets |
| Manual tier / module unlock | ⬜ | For support cases |
| **Tickets** | | |
| All open tickets by priority | ⬜ | |
| Reply to ticket (sends email) | ⬜ | |
| Status change | ⬜ | |
| **API Credit Monitoring** | | |
| Total MiniMax tokens (all time, 30d, today) | ⬜ | |
| Average tokens per user session | ⬜ | |
| Average tokens per module | ⬜ | Which modules cost most |
| Cost estimate in USD | ⬜ | Tokens × OpenRouter rate |
| Daily burn rate chart (30 days) | ⬜ | |
| Projected monthly cost | ⬜ | At current usage |
| Alert threshold | ⬜ | Flag if daily spend > $X |
| Per-user token usage | ⬜ | Identify heavy users |
| Token breakdown by feature | ⬜ | Generation vs simulator vs education |
| **Revenue** | | |
| Transaction list (post-Stripe) | ⬜ | |
| Revenue by tier breakdown | ⬜ | |
| B2B subscription revenue | ⬜ | |
| **Analytics** | | |
| Attorney flag frequency by question | ⬜ | Which questions cause most flags |
| Confidence score distribution | ⬜ | All applications |
| **App Health** | | |
| Error log (Sentry) | ⬜ | |
| PDF export count | ⬜ | |
| Database size | ⬜ | |
| **Settings** | | |
| Manage admin users | ⬜ | Add/remove |
| Maintenance mode toggle | ⬜ | |
| Feature flags per module | ⬜ | On/off without deploy |

---

## REFERRAL ENGINE

Priority: MEDIUM — design now, build after core app
CASL: Explicit opt-in per category. One introduction per category per applicant.
Consent: Module 1 consent screen — 5 categories. Logged in referral_consents.
Double opt-in: Contact details released only after applicant responds to intro email.

### 5 Referral Categories

| Category | Trigger | Fee Structure | Partner Type |
|---|---|---|---|
| Business Opportunity | Module 2 — no business selected | $150–$300/intro or 10–15% revenue share | Franchise/business brokers |
| Immigration Attorney | Attorney flag in quiz | $200–$400/intro | E-2 specialist law firms |
| Cross-Border Banking | Module 8 or no US account | $100–$200/opened account | RBC, TD, East West Bank |
| Cross-Border CPA | Module 9 or post-approval | $150–$250/intro | MNP, BDO, boutique firms |
| Real Estate | Tab G (commercial) / Post-approval (residential) | See below | Commercial + residential brokers |

### Real Estate Sub-Categories

| Type | Trigger | Fee | Notes |
|---|---|---|---|
| Commercial premises | Tab G — no location secured | $300–$500/intro or 15% commission | State-specific brokers |
| Residential rental | Post-approval Day 1 | $150–$300/intro | Flag: Canadian / no US credit |
| Residential purchase | Post-approval Month 12 | $500–$1,000/intro or 20% commission | Buyer's agents in target markets |

### Relocation Layer (post-approval)

| Service | Fee | Notes |
|---|---|---|
| Cross-border moving | $150–$300/lead | Canada → U.S. specialists |
| U.S. vehicle purchase | $200–$400/lead | Dealers working with new arrivals |
| Health insurance | $200–$500/lead | Needs legal review per state before building |
| U.S. phone plan | Co-marketing only | Google Fi, T-Mobile new arrival plans |

### Lead Package (sent to partner)
```
First name only (until double opt-in confirmed)
Province, Canada
Investment range (from quiz)
Business category (from Module 2)
Business stage: Exploring / Specific opportunity / Ready
Timeline: 3mo / 6mo / 12mo / Not sure
Eligibility: Strong / Moderate
Canadian flag: No U.S. credit history (RE referrals)
Contact: Released only after applicant responds to intro email
```

### Lifetime Referral Value Per Applicant
```
Franchise broker (if closed):      $1,500–$3,000
Attorney review:                    $200–$400
Banking setup:                      $100–$200
CPA engagement:                     $150–$250
Commercial lease (if closed):       $650–$970
Residential purchase (Year 2):      $2,000–$2,400
Total per fully-referred applicant: $4,600–$7,220
```
Plus: $247–$647 application + $29/year compliance + $97 renewal

---

## FRANCHISE BROKERAGE — DIRECT REVENUE

e2go can operate as a franchise broker/consultant directly.
**No license required** in most U.S. states and Canadian provinces.
Fee paid by FRANCHISOR — not client — typically $12,000–$25,000 per closed deal.

### Two Paths

| Path | Description | Margin | Speed |
|---|---|---|---|
| Path A | Join broker network (FranChoice, Frannet, etc.) | 50% fee split | Fast to start |
| Path B | Direct franchisor agreements | 100% fee kept | Slower to build |

**Recommendation:** Start Path A, move high-value brands to Path B as volume grows.

### Legal Requirements
- No franchise broker license required federally or most states
- Avoid passive investment / securities-adjacent franchises (securities law)
- FTC Franchise Rule: FDD disclosure is franchisor's obligation — understand it, never push to sign before 14-day window
- Canadian provincial franchise laws (AB, ON, PEI, NB, MB, BC): franchisor's disclosure obligation
- PIPEDA: Module 1 consent covers franchise brand data sharing
- Required per deal: written referral agreement with exclusivity clause (protects fee on delayed closings)

### Action Items
- ⬜ Decide: Path A or Path B to start
- ⬜ If Path A: research FranChoice, Frannet, Franchise Consulting Company
- ⬜ If Path B: identify top 10 franchise brands relevant to E-2 investors
- ⬜ Draft standard referral agreement template with exclusivity clause
- ⬜ Update Module 1 consent to explicitly cover franchise brand data sharing

---

## B2B SUBSCRIPTION PRODUCTS

Priority: PHASE 2 — after core app stable and first 50 applicants through.
Consent architecture changes required: IMMEDIATE — update Module 1 before launch.

### Product 1 — e2go Legal (Attorney Subscriptions)

Pre-qualified E-2 leads with structured case summaries. Attorney flag triggered → lead enters feed. Matching: specialty + jurisdiction + capacity + performance score.

| Tier | Price | Leads/Month |
|---|---|---|
| Starter | $299/month | 10 leads |
| Growth | $499/month | 25 leads |
| Practice | $799/month | Unlimited + API access |

### Product 2 — e2go Broker (Franchise Broker Subscriptions)

Pre-qualified investor profiles with investment + preference data. Module 2 exploring trigger → profile enters feed. Matching: territory + category + investment range + capacity.

| Tier | Price | Profiles/Month |
|---|---|---|
| Starter | $399/month | 15 profiles |
| Growth | $699/month | 40 profiles |
| Agency | $999/month | Unlimited + territory exclusivity |

### Key Design Rules
- One lead → one subscriber (never broadcast to all)
- 48-hour response window before lead rotates to next match
- Double opt-in before contact details released to subscriber
- Partner agreement (DPA) required before dashboard access
- Territory exclusivity available as premium upsell (2–3x base rate)

### What Subscribers See

**Attorney sees:**
```
LEAD #4721 — Attorney Review Flagged
Flag reason: Prior visa refusal (B-2, 2019)
Investment: $175,000–$200,000 USD
Business type: Senior care franchise
Fund sources: Employment savings + property sale
Timeline: 6 months — Ontario → Florida
Risk profile: Moderate — addressable with counsel
Consented: Yes
[Reveal Contact Details →] (triggers double opt-in)
```

**Broker sees:**
```
INVESTOR PROFILE #2847
Investment range: $150,000–$200,000 USD
Business preference: Senior care / Healthcare
Target state: Texas or Florida
Timeline: 4–6 months
Background: Management, healthcare adjacent
Family: Couple — spouse EAD eligible
Consented: Yes
[Reveal Contact Details →] (triggers double opt-in)
```

### Revenue Projections
```
Year 1 target:
  20 attorney × $499/month = $9,980/month
  15 broker × $699/month  = $10,485/month
  Total B2B MRR: ~$20,000/month = $240,000/year

Year 2 target:
  50 attorney × $499/month = $24,950/month
  40 broker × $699/month  = $27,960/month
  Total B2B MRR: ~$53,000/month = $636,000/year
```

### Database Tables Needed
- partner_subscriptions
- partner_leads (which lead → which subscriber)
- partner_agreements (signed DPA)
- lead_responses (response rate tracking per partner)

### Build Status
- ⬜ Update Module 1 consent language (one intro per category)
- ⬜ Attorney portal (/partner/attorney)
- ⬜ Broker portal (/partner/broker)
- ⬜ Lead matching algorithm
- ⬜ Partner onboarding + agreement signing
- ⬜ Partner billing (Stripe subscriptions)
- ⬜ Partner admin management

---

## UX RESILIENCE — CRITICAL EXPERIENCE MOMENTS

### 1. Answer Auto-Save
- Every answer saved to Supabase within 2 seconds of advancing
- Never rely on end-of-tab or end-of-session saves
- On return: "Welcome back. You left off at Tab F, Question 8. Ready to continue?"
- One button — immediately back in

### 2. Payment Failure Handling
- Stripe failure: calm message + retry (not generic error)
- Stripe down: "Payment temporarily unavailable. Your application is saved."
- Card decline: specific message + alternative payment prompt
- Recovery email within 15 minutes: "Your package is ready. Complete your purchase here."
- Admin notified of all failed payments

### 3. Hard Stop Experience (redesign from cold error)
- Explain in plain English what the issue is and WHY it matters
- Tell them exactly what type of attorney to look for and what to say
- Offer attorney referral immediately
- With consent: send quiz results summary to partner attorney as warm lead
- Follow-up email at 48 hours: "Did you find the right help?"
- If situation changes: they can restart — app welcomes them back

### 4. Document Preview Quality
- Quality gate must pass before ANY preview shown
- Show strongest sections first: Cover Letter → Qualifications → Business Plan
- "Help me improve this" button per section (subtle — not a complaint button)
- Flag triggers: re-ask relevant questions → regenerate that section only
- User never sees generic output — if it's generic, regenerate first

### 5. Post-Payment Experience
- Celebration screen — not just a download button
- Shows everything unlocked (all documents + features checklist)
- Clear first action: "Here's what to do next — in order"
- Welcome email within 2 minutes with complete next steps
- Dashboard immediately reflects paid status + all modules unlocked

### 6. Interview Simulator Score Framing
- Never lead with a number — lead with what was strong
- "You've identified 4 areas to strengthen" not "You scored 40%"
- First simulation score private — not shown on dashboard
- Feedback: what was good FIRST, then what was missing
- Always end with specific action: "Practice these 3 questions next"
- Score trend shown across sessions — improvement visible

### 7. Post-Submission Waiting Period
- Compliance calendar active with interview date
- Weekly email: "Your interview is in X days. Here's one thing to review."
- Interview simulator available for practice (within limits)
- "What to expect on interview day" guide unlocked after payment
- Extra sessions: frictionless purchase

### 8. Outcome Recording
User records result after interview:
- ✅ Approved → celebration + share prompt + renewal reminder (18 months) + compliance calendar enrollment
- ⏳ Administrative Processing → check-in email in 30 days
- ❌ Refused → compassionate response + attorney referral + "what to tell your attorney" summary

### 9. Re-Engagement Email Sequence
Triggered: account created but Module 1 not completed
```
Day 3:  "Your eligibility results are saved. Here's what's waiting."
Day 7:  "Three things you can do this week to prepare."
Day 14: [Use "The Preparation Paralysis" copy — see Content Library]
Day 30: "Your saved application expires in 7 days. Log in to continue."
```

---

## NEWSLETTER — "THE E-2 INSIDER"

**Cadence:** Every 2 weeks
**Format:** Max 400 words · One genuine value item · One soft CTA
**Platform:** Resend (recommended — developer-friendly, CASL compliant)
**CASL:** Opt-in only · Unsubscribe on every email · Consent logged with timestamp

### Segments

| Segment | Audience | Content Focus |
|---|---|---|
| Pre-Application | Signed up, not yet paid | E-2 news, tips, processing times, business spotlights |
| In Application | Paid, building package | Progress encouragement, document tips, consulate updates |
| Post-Approval | Visa approved | Tax deadlines, renewal prep, FBAR, hiring rules, expansion |
| Referred Out | Hit hard stop | Immigration news, "when you're ready", attorney Q&A |

### 5 Content Pillars
1. **Consulate Intelligence** — Processing time updates, officer behavior, document request trends at Toronto
2. **Regulatory Updates** — State Dept policy changes, treaty updates, USCIS guidance changes
3. **Business Intelligence** — Sector spotlights, franchise opportunities, market trends in target states
4. **Applicant Stories** — Anonymized success stories, lessons learned, "what I wish I'd known"
5. **Compliance Reminders** (post-approval only) — FBAR deadlines, renewal windows, employment rules, tax dates

### Infrastructure Needed
- ⬜ Resend integration
- ⬜ Subscriber table with segment field
- ⬜ Auto-segment assignment based on application status
- ⬜ Segment transition automation (pre-app → in-app on payment)
- ⬜ Unsubscribe handler (DB + Resend)
- ⬜ CASL consent timestamp per subscriber
- ⬜ Admin newsletter management in admin panel
- ⬜ Analytics: open rate, click rate, unsubscribe per segment

---

## EDUCATION HUB — /learn

Purpose: Top-of-funnel SEO. Captures researchers not yet ready to apply.
Tone: Educational, calm, trustworthy. No sales language.
Priority: MEDIUM — build after core app stable.

### Pages

| Route | Topic | SEO Target Keyword |
|---|---|---|
| /learn | E-2 information hub | "E-2 visa Canada" |
| /learn/what-is-e2-visa | Plain English explanation | "what is E-2 visa" |
| /learn/requirements | 5 eligibility requirements | "E-2 visa requirements Canada" |
| /learn/investment | How much to invest | "how much to invest E-2 visa" |
| /learn/businesses | What businesses qualify | "E-2 visa businesses that qualify" |
| /learn/process | Timeline step by step | "E-2 visa process Canada" |
| /learn/canada | Canada-specific guidance | "E-2 visa for Canadians" |
| /learn/e2-vs-eb5 | Visa comparison | "E-2 vs EB-5" |

### /learn Hub Page Structure
1. Hero: "Everything you need to know about the U.S. E-2 Treaty Investor Visa" — no hard CTA
2. What is E-2 — plain English, 2 paragraphs
3. The 5 Requirements — 5 cards, plain English titles
4. Investment amounts — table by business type
5. Timeline — visual 6-step from decision to approval
6. Current trends — 3 stat cards (real government data only)
7. Soft CTA: "Ready to check your eligibility? 10 minutes. It's free."

### Stitch Screen Needed
- /learn hub page design (same design system, educational tone)

---

## ADAPTIVE CASE-BUILDING QUESTION SYSTEM

Purpose: Surface hidden relevant experience to strengthen investor qualifications.
Rule: Every question must have a "why does this help the case?" answer. If it doesn't — cut it.

### 4-Layer Architecture
```
Layer 1 — Business Category Matrix
  Maps each business type to its known consular concerns
  Defines which gap categories matter most per type

Layer 2 — Experience Gap Detection
  After basic profile questions, identifies gaps between
  required business strengths and investor's actual profile
  Triggers targeted probe cascades for each gap found

Layer 3 — Probe Question Bank
  5–7 questions per gap type: obvious → non-obvious
  Each "yes" answer feeds directly into document generation
  No generic questions — every probe has a specific case purpose

Layer 4 — Document Generation Prompt
  Structured context object built from all probe answers
  MiniMax generates specific narrative using actual details
  Never uses templates — always personalized
```

### 10 Gap Categories (universal)
1. Industry / sector knowledge
2. Management & operations experience
3. Sales & client acquisition experience
4. Financial management experience
5. Regulatory & compliance awareness
6. Technical / trade skills (trade businesses)
7. Population-specific experience (care businesses)
8. Business ownership history
9. Relevant education & training
10. Personal motivation & commitment narrative

### Business Type Matrix

| Business Type | Priority Gap Categories |
|---|---|
| Senior Care | 7, 2, 1, 9 |
| Franchise (any) | 2, 4, 3, 6 |
| Daycare | 7, 1, 5, 9 |
| Cleaning Service | 2, 3, 8, 4 |
| HVAC / Duct | 6, 5, 4, 8 |
| Restaurant | 1, 2, 3, 4 |
| Retail | 3, 2, 4, 8 |

### Probe Cascade Example — Senior Care, Gap: Vulnerable Population Experience
```
Q1: Direct experience with elderly/disabled in any context?
    → Yes: describe nature and duration
    → No: Q2
Q2: Cared for elderly parent, relative, or family friend?
    → Yes: how long, what level of care, what did you manage?
    → No: Q3
Q3: Child or dependent with special needs or medical condition?
    → Yes: what has that involvement looked like over time?
    → No: Q4
Q4: Volunteered with elderly, disabled, or vulnerable populations?
    → Yes: which org, how long, what did you do?
    → No: Q5
Q5: Professional work with populations needing extra support?
    → Yes: describe that work
    → No: flag weak investor qualifications
         recommend: personal statement explaining
         motivation and commitment
```

### Build Status
- ⬜ Probe question bank — write for top 8 business categories
- ⬜ Gap detection engine — Module 3
- ⬜ Document generation prompts — one per document type
- ⬜ Context object builder — from all Module 3 answers

---

## FORM & TERMINOLOGY STANDARDS

*Apply to every question, form, and document in the app.*
*Must be enforced before any Module 3 tab is built.*
*Reference: module3_tab_a.md is the gold standard.*

### Standard 1 — Official U.S. Government Terminology

| Use in e2go | Source |
|---|---|
| "E-2 Treaty Investor" | DS-160 / 9 FAM 402.9 |
| "Nonimmigrant status" (not "visa status") | DS-160 |
| "Admitted" (not "entered") | DS-160 |
| "Departed" (not "left") | DS-160 |
| "Refused" (not "denied") | DS-160 uses "refused" |
| Exact security question text | DS-160 verbatim |
| Marital status: Single / Married / Common Law Marriage / Civil Union / Divorced / Legally Separated / Widowed | DS-160 exact options |
| "Date of most recent visit" | DS-160 travel section |

### Standard 2 — Every Question Must Be Descriptive

Every question requires all 5 elements:
```
1. Question text — plain English, specific
   ❌ "Marital status:"
   ✅ "What is your current marital status?"

2. Tooltip — why we're asking, what it feeds
   ✅ "The DS-160 requires your marital status. Select 
      the option that exactly matches your legal status."

3. Option labels — descriptive, not just values
   ❌ [ ] Yes  [ ] No
   ✅ [ ] Yes — I have previously been refused a U.S. visa
      [ ] No  — I have never been refused a U.S. visa

4. Helper text — what the officer looks for
   ✅ "Social media used in last 5 years is mandatory 
      on the DS-160 — do not omit accounts intentionally."

5. Inline warning — where answer has risk implications
   ✅ "A prior refusal must be disclosed. Failure to 
      disclose is treated as misrepresentation."
```

### Standard 3 — Forms Must Look Like Official Forms

```
Section headers: Use DS-160 labels exactly
  ❌ "About You"   ✅ "Personal Information"
  ❌ "Your Trip"   ✅ "Travel Information"
  ❌ "Background"  ✅ "Security Questions"

Date format:     DD/MMM/YYYY (DS-160 standard)
Required:        Asterisk (*) — same as DS-160
Optional:        "(Optional)" label — same as DS-160
N/A:             "Does Not Apply" option where DS-160 has it
Question order:  Match DS-160 page/section groupings exactly
```

### Standard 4 — No Information Repeated Across Documents

```
Investment amount:        Full in Tab F → reference only in Cover Letter
Fund source narrative:    Full in Tab H → one sentence in Cover Letter
Investor qualifications:  Full in Tab J → one paragraph in Cover Letter
Business description:     Full in Tab K → summary in Cover Letter
Non-immigrant intent:     Full in Cover Letter → not repeated elsewhere
Revenue projections:      Full in Tab K → brief reference in Cover Letter
```

### Standard 5 — Professional Document Formatting

```
Font:         Times New Roman 12pt
Margins:      1 inch all sides
Line spacing: 1.5 for narrative · single for tables
Sections:     Roman numerals (I, II, III...)
Dates:        January 15, 2026 (never 01/15/26)
Dollars:      $187,500 USD (always commas + USD)
Header:       Tab reference | Applicant name | Date prepared
Footer:       "Prepared with e2go.app | Not legal advice | 
               For consulate submission purposes only"
Pages:        Numbered bottom center
Letterhead:   No e2go logo on consulate submission documents
```

---

## CONTENT LIBRARY

Reusable pieces for newsletter, landing page, re-engagement emails, and social media.

### PIECE 001 — "The Preparation Paralysis"
**Type:** Emotional / psychological
**Tone:** Warm, honest, non-judgmental
**Core insight:** "The people who are most prepared are often the ones most paralyzed."

**Full text:**
> Something I've been noticing across my DMs this month: The people who are most prepared are often the ones most paralyzed. I've spoken this week with people who have their funds sourced, their business model outlined, a state shortlisted, and a lawyer's number saved in their phone. Everything except the one thing that actually moves things forward — starting. It's not laziness; it's a form of fear that hides within preparation. One more question, one more piece of research, one more person to ask. I'm not judging it. I see it in every case type, every nationality, every income level. The research phase can quietly become a place to live.

**Use in:**
- /learn page — "Are you ready to start?" section
- Day 14 re-engagement email (primary copy)
- Newsletter Issue 3 — Pre-Application segment
- LinkedIn · Reddit r/expats · Twitter/X

**CTA that fits this piece:**
- "Your application is exactly where you left it."
- "The quiz takes 10 minutes."
- "One click to continue."

---

## LIFECYCLE TRACKING SYSTEM

**Purpose:** Track every applicant milestone from first visit to visa approval and beyond. Generates real product statistics, outcome database, and long-term valuation asset.

**Critical rule:** Start collecting from day one. Timestamps you don't capture cannot be recovered.

### Database Table: application_lifecycle

```sql
-- Stage 0: Discovery
first_visit_at, utm_source, utm_medium, utm_campaign

-- Stage 1: Qualification
quiz_started_at, quiz_completed_at, quiz_duration_minutes,
quiz_outcome, hard_stop_code

-- Stage 2: Account & Payment
account_created_at, quiz_to_account_hours,
payment_completed_at, account_to_payment_days, tier_purchased

-- Stage 3: Application Build
module1_started_at, module1_completed_at,
module2_started_at, module2_completed_at,
module3_started_at, module3_completed_at, module3_duration_days,
generation_triggered_at, generation_completed_at,
generation_duration_minutes, preview_viewed_at

-- Stage 4: Interview Prep
simulator_first_run_at, simulator_sessions_total,
simulator_best_score, interview_ready_at

-- Stage 5: Consulate
interview_scheduled_at, interview_date,
app_to_interview_days, outcome_recorded_at,
outcome (approved/refused/processing), refusal_reason

-- Stage 6: Post-Approval
approval_date, total_journey_days,
renewal_reminder_set_at, compliance_enrolled_at,
renewal_started_at
```

### Key Computed Metrics (auto-calculated)
- quiz_to_account_hours
- account_to_payment_days
- module3_duration_days
- generation_duration_minutes
- app_to_interview_days
- total_journey_days (first_visit_at → approval_date)

### User-Facing Timeline (dashboard)
Visual milestone tracker showing all completed stages with dates, current stage with progress bar, estimated days to interview-ready, total days in system.

### Admin Pipeline View
Count of applicants per stage, average days in each stage, conversion rate between stages, drop-off identification, approval rate once data sufficient.

### Outcome Database (long-term moat)
Links confidence score + simulator score to actual visa outcome. After 200+ outcomes: publish approval rate by score range. Use to recalibrate confidence scoring engine.

### Publishable Statistics (after 50+ outcomes)
- Average days from starting app to interview-ready
- Average days from start to visa approval
- Approval rate for e2go applicants
- Average confidence score at interview
- Average simulator sessions before interview

### Build Status
| Feature | Status | Notes |
|---|---|---|
| application_lifecycle table in schema | ⬜ | Add to schema_complete.sql |
| Auto-populate on quiz complete | ⬜ | Session 2 |
| Auto-populate on account create | ⬜ | Session 2 |
| Auto-populate on payment | ⬜ | Session 3 |
| Auto-populate on each module | ⬜ | Session 3 |
| Auto-populate on generation events | ⬜ | Session 4 |
| Auto-populate on simulator events | ⬜ | Session 4 |
| User-facing timeline on dashboard | ⬜ | Session 3 |
| Admin pipeline view | ⬜ | Session 4–5 |
| Outcome recording UI | ⬜ | Session 4 |
| Published statistics page | ⬜ | After 50+ outcomes |

---

## SMART LEAD ROUTING

Business opportunity referrals use two-path routing based on Module 2 outcome.

### Path A — Direct to Franchisor (hot leads)
**Trigger:** business_selected = YES AND business_name known
**Who gets the lead:** Franchise development rep at that specific brand — no broker
**Fee:** Direct referral agreement — $5,000–$15,000 per closed franchise deal
**Advantage:** No broker split, faster for applicant, higher value relationship

### Path B — To Franchise Broker (warm leads)
**Trigger:** business_selected = NO — still exploring category or undecided
**Who gets the lead:** Franchise broker to help them decide
**Fee:** $150–$300 intro OR revenue share on close

### Module 2 Routing Question (dual-purpose)
```
"What is the current stage of your business opportunity?"

○ I have identified a specific business and am ready to invest
  → PATH A — direct to franchisor

○ I have identified a business category and am evaluating options
  → PATH B — to franchise broker

○ I am still researching what type of business to invest in
  → PATH B — to franchise broker
```
Visa purpose: Determines which Tab G documents are required
Commercial byproduct: Routes referral correctly

### Direct Franchisor Partnership Targets
Priority brands for direct referral agreements:
- Jan-Pro (commercial cleaning)
- Anago (commercial cleaning)
- Home Instead (senior care)
- Right at Home (senior care)
- Visiting Angels (senior care)
- Molly Maid (residential cleaning)
- Coverall (commercial cleaning)
- Kumon (education)
- Snap-on Tools (trade)

### Action Items
| Task | Status |
|---|---|
| Add routing question to Module 2 | ⬜ |
| Build routing logic (business_selected flag) | ⬜ |
| Add franchisor_id field to referral_leads table | ⬜ |
| Create direct franchisor outreach email template | ⬜ |
| Establish first 3 direct franchisor agreements | ⬜ Business dev — parallel to build |
| Separate lead package format for direct vs broker routing | ⬜ |

---

## DUAL-PURPOSE QUESTION PRINCIPLE

Every question in Module 2 and Module 3 must pass both tests:
- **Test 1:** Does this strengthen the visa application?
- **Test 2:** Does this also qualify, segment, or route the lead?

If Test 1 only → ask it (visa first, always)
If Test 2 only → do NOT ask it
Commercial insight is always a byproduct of good visa preparation — never the driver.

### Question Documentation Standard
Every question must be documented with:
```
Question: [text]
Visa purpose: [which document/requirement this feeds]
DS-160/consulate reference: [where this appears in official guidance]
Commercial byproduct: [routing/segmentation this enables, if any]
Tooltip: [what the applicant is told about why we're asking]
```

### Module 2 Questions to Add (all dual-purpose)

| Question | Visa Purpose | Commercial Byproduct |
|---|---|---|
| Business stage (4 options) | Determines Tab G document requirements | Routes direct vs broker |
| Franchise brand name | Required on DS-156E, Tab G, Tab K, Cover Letter | Identifies direct franchisor contact |
| FDD review status | Consular officers probe this at interview | Signals lead readiness level |
| Why this specific franchise | Interview prep — most common Toronto question | Answer depth = lead quality signal |
| Target state and city | DS-160, DS-156E, business plan, licensing | Routes commercial RE referral by state |
| Business premises status | Tab G real enterprise evidence | Triggers commercial RE referral if none |
| US business bank account status | Tab G real enterprise evidence | Triggers banking referral if none |

### Module 3 Reviews Required
- Tab G: add commercial RE referral branch when no premises secured
- Tab F: add banking referral branch when no US account
- All tabs: cross-reference against dual-purpose principle before build

---

## STANDING BUILD RULES — SUMMARY

Full details in CLAUDE_CONTEXT.md. These apply to every task every session:

| Rule | Summary |
|---|---|
| 1 — SEO on every page | Metadata + OG tags + JSON-LD added when page is built. Never retrofit. |
| 2 — Database safety | Never DROP TABLE. Never TRUNCATE. Always IF NOT EXISTS. Show SQL before running. |
| 3 — Answer auto-save | Every Module 3 answer saved to Supabase within 2 seconds. Never end-of-tab saves. |
| 4 — No AI keys in browser | All MiniMax calls via /api/ai/route.ts server-side only. |
| 5 — DS-160 terminology | All Module 3 questions use exact government form language. |
| 6 — Descriptive questions | Every question: text + tooltip + descriptive options + helper text + inline warning. |
| 7 — Dual-purpose questions | Visa purpose must justify every question. Commercial byproduct is secondary. |
| 8 — Document generation safety | One at a time. Checkpoint every doc. Quality gate before any preview. |
| 9 — Lifecycle tracking | Every significant user action updates application_lifecycle with timestamp. |
| 10 — Build tracker update | "end session" command updates BUILD_TRACKER.md and CLAUDE_CONTEXT.md. |

---

## KNOWN ISSUES / BUGS

| Issue | File | Priority | Fix |
|---|---|---|---|
| Supabase 406/403 errors on Tab A | src/app/apply | HIGH | Fix applications + profiles RLS policies |
| application_lifecycle table not yet in schema | docs/schema_complete.sql | HIGH | Add to schema |
| Passport number not collected in Module 3 | Module 3 tabs | LOW | Bracket placeholder is correct — data not yet collected |
| Year 3 net income vs investment-total consistency check | quality-gate | LOW | May confuse different field semantics — deferred |

---

## SESSION LOG

### Session 1 — May 29, 2026

**Completed:**
- Full product architecture designed and documented
- Module 0 questions V2.1 finalized — JSON file locked
- Module 0 scoring logic V1.1 finalized — JSON file locked
- Stitch design library completed — 10 screens in docs/stitch/
- Next.js scaffold — App Router, TypeScript, Tailwind
- All 5 core pages built: Landing, Quiz, Results, Pricing, Dashboard
- Nav + Footer shared components
- Supabase connected — {"connected":true} confirmed
- Database schema script generated and run (idempotent — DROP TABLE removed)
- CLAUDE_CONTEXT.md consolidated — single complete file
- BUILD_TRACKER.md consolidated — single complete file
- "start session" / "end session" commands established
- 10 standing build rules documented in CLAUDE_CONTEXT.md

**Key decisions made:**
- Paywall moved to post-Module 3 — free to collect, pay to download
- Interview simulator: 2 sessions included per application, $9.99/bundle extra
- Document generation: sequential + checkpointed, never parallel
- Referral engine: 5 categories — business opportunity, attorney, banking, CPA, real estate
- Smart lead routing: hot leads (business known) → direct to franchisor ($5K–$15K/deal)
- Warm leads (exploring) → to franchise broker ($150–$300/intro)
- Franchise brokerage: e2go can operate as direct broker — no license required in most states
- B2B subscription products: attorney portal + broker portal (Phase 2)
- /learn education hub: 8 SEO-targeted sub-pages
- Form standards: 5 standards, DS-160 terminology alignment required
- Adaptive case-building: 4-layer probe system, 10 gap categories, business type matrix
- Dual-purpose question principle: visa purpose justifies every question, commercial is byproduct
- Lifecycle tracking: application_lifecycle table — collect every milestone from day one
- SEO built into every page at time of build — standing Rule 1, never retrofit
- Newsletter: "The E-2 Insider" — 4 segments, every 2 weeks, Resend platform
- Content library started: "The Preparation Paralysis"
- Support ticketing: /support, /support/new, /support/tickets
- Admin panel: /admin, role-protected, full stats + API credit monitoring
- Cybersecurity plan: rate limiting, device fingerprinting, session management, PIPEDA
- Real estate referral layer: commercial premises + residential rental + residential purchase
- Relocation layer: moving, vehicle, health insurance, phone
- B2B revenue projections: $20K MRR Year 1 → $53K MRR Year 2
- Database safety rule: never DROP TABLE — always IF NOT EXISTS — idempotent scripts only

**Claude Code priorities for Session 2:**
1. Add application_lifecycle table to schema_complete.sql and run in Supabase
2. Fix database schema — confirm all tables created with RLS
3. Wire auth — login/signup pages to Supabase auth
4. Wire middleware — protect /dashboard, /apply/*, /score, /simulator, /export
5. Wire quiz scoring engine to results page (module0_scoring_logic.json)
6. Wire quiz save to Supabase (quiz_sessions + application_lifecycle)
7. Wire answer auto-save on every Module 3 question (2-second delay)
8. Add SEO metadata to all existing pages — Rule 1
9. Add security headers to next.config.mjs
10. Build OpenRouter/MiniMax client (src/lib/ai.ts + /api/ai/route.ts)
11. Test full flow: signup → quiz → results → pricing → dashboard
12. Run npm run build — confirm zero errors

---

## Session 4 — June 8, 2026

**Completed:**
- Package assembly layer: cover page, TOC, tab dividers, 15-file ZIP
- Shared constants module (`docx-package-constants.ts`)
- Cover page builder (`docx-cover-builder.ts`) with safeField() fallback
- TOC builder (`docx-toc-builder.ts`) with dot-leader approach
- Divider builder (`docx-divider-builder.ts`) for all 6 tabs
- Download route updated to assemble 15-file ZIP
- Checklist intro updated
- Build: clean

**Commits:** `9a0ee93`, `d44c2e2`

---

## Session 5 — June 9, 2026

**Completed:**
- Transferable skills pipeline investigation (diagnostic session)
- Identified hardcoded skeleton in analysis-engine.ts
- Found framing-decisions pipeline was a dry-run stub
- Session 7 spec written based on findings

---

## Session 6 — June 9, 2026

**Completed:**
- Real ZIP generation tested end-to-end for Chen (15 files)
- Missing cover-page data variant tested (bracket placeholder fallback)
- Tab subset variant tested
- DOC_DISPLAY_NAMES completeness verified
- Investment_amount column query fix
- Build: clean

**Commits:** `98fe975`

---

## Session 7 — June 10, 2026

**Completed:**
- Three-layer experience/framing pipeline built:
  - Layer 0: Targeted follow-up questions per business category
  - Layer 1: Real structured pipeline (9 dimension scorers + OpenRouter framing call)
  - Layer 2: Hardened generation prompt (standing backstop instruction)
- `calculateExperienceScore()` — real 9-dimension scoring from actual data
- `generateFramingDecisions()` — real OpenRouter call via deepseek-chat
- `loadApplicationAnswers()` — loads from Supabase (answers, followup_responses, voice_profile, quiz_sessions)
- 5-fixture test matrix with dry-run scoring
- Business-operational-needs reference table (12 categories)
- Build: clean

**Commits:** `2a41d80`, `f648643`, `6140a43`, `b54be6f`

---

## Session 8 — June 11, 2026

**Completed:**
- Cover page data source fix (LIVE BUG)
- Replaced broken `personal_info` JSONB query with real column sources
- Applicant name, business name, nationality, state now render correctly
- safeField() bracket placeholder fallback retained for uncollected fields (passport)
- Build: clean

**Commits:** `6da0f6d`

---

## Session 9 — June 12, 2026

**Completed:**
- Post-generation package summary (`/documents/[applicationId]`)
- 5 sections: Package Strength Overview, What's Strong, Where Package May Need More, What Could Help, Mandatory Disclaimer
- Bonus Section 5.5: Areas Officers May Ask About (WATCH/FLAG/CRITICAL)
- Zero denial-prediction language confirmed across all sections
- Chen verified: experience_match correctly shown as STRONG
- Fixture 5 (worst case) verified: WEAK correctly surfaced with constructive suggestion
- Build: clean

**Commits:** `086bebf`, `81b2efb`

---

## Session 10 — June 13, 2026

**Completed:**
- Live framing call test (Fixtures 3 and 5) — both returned well-formed JSON
  - Fixture 3 (warehouse→cleaning): 4 framing decisions found
  - Fixture 5 (recent grad→IT): 2 framing decisions found
- Section 5.5 copy review — zero denial-language issues (all "may" framing)
- Chen's franchise_training_offset verified — correct per spec (PARTIAL, no offset)
- TODO/stub grep sweep — no actionable items found
- Build: clean

---

## Session 11 — June 1, 2026

**Completed:**
- Picked up from crashed session (Tasks 6-10)
- apply/checklist/page.tsx: redesign with glassmorphism
- login/signup: redesign with glassmorphism, preserve auth logic
- module3: TabShell and QuestionRenderer redesign with glassmorphism, preserve all question logic

**Build:** Clean (minor themeColor warnings, non-blocking)
**Tests:** 45/45 passed
**Pushed:** 5 commits to dev

---

## Session 11 Priorities

1. Fix Supabase 406/403 errors on Tab A (applications + profiles RLS)
2. Build /apply/overview orientation page
3. Build /apply/checklist three-phase checklist
4. Wire Tab B-L question configs from updated specs
5. Generate Sarah Mitchell prototype documents (4 Word docs)

---

**Claude Code priorities for Session 2:**
1. Fix database schema (profiles table, all tables with RLS)
2. Wire auth — login/signup pages to Supabase
3. Wire auth middleware — protect /dashboard, /apply/*
4. Wire quiz scoring engine to results page
5. Wire quiz save to Supabase (quiz_sessions table)
6. Wire answer auto-save (every question)
7. Add security headers to next.config.mjs
8. Build OpenRouter/MiniMax client (src/lib/ai.ts)
9. Test full flow: signup → quiz → results → pricing
10. Update this BUILD_TRACKER.md

---

## PRICING REFERENCE

### B2C Application Pricing

| Tier | Coverage | Price |
|---|---|---|
| Solo Individual | 1 investor | $247 |
| Solo Couple | 1 investor + spouse | $297 |
| Solo Family (≤2 kids) | 1 investor + spouse + up to 2 children | $347 |
| Solo Extended (3–5 kids) | 1 investor + spouse + 3–5 children | $397 |
| Partnership — No Families | 2 investors only | $447 |
| Partnership — Two Couples | 2 investors + 2 spouses | $547 |
| Partnership — Two Full Families | 2 investors + 2 spouses + up to 4 kids | $647 |

**Add-ons:**
- +$25 per extra dependent
- +$19 per 3-export bundle (extra PDF exports)
- +$9.99 per 3 additional simulator sessions
- $97–$147 renewal module
- $29/year compliance calendar

### B2B Subscription Pricing

| Product | Tier | Price | Volume |
|---|---|---|---|
| e2go Legal (Attorneys) | Starter | $299/month | 10 leads |
| e2go Legal (Attorneys) | Growth | $499/month | 25 leads |
| e2go Legal (Attorneys) | Practice | $799/month | Unlimited + API |
| e2go Broker (Franchise) | Starter | $399/month | 15 profiles |
| e2go Broker (Franchise) | Growth | $699/month | 40 profiles |
| e2go Broker (Franchise) | Agency | $999/month | Unlimited + territory exclusivity |

---

*This document is the single source of truth for build status.*
*Update it at the end of every session.*
*File location: ~/E2-go/BUILD_TRACKER.md*
