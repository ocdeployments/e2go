# QA results — generated 2026-09-19T10:31:30.645Z

**Overall 79 / 100** (before caps 87.3) · **Coverage 92.8 %** · **Confidence Medium** · **GO with fixes**

Caps applied: 1 open S1 → ≤ 79; 11 open S2 (>= 5) → ≤ 89

> Not measured (weights renormalised): journeys

> Effect classes: only E0 (read-only) and E1 (QA-persona writes) were executed; E2 (e-mail / Stripe / paid LLM / third party) and E3 (irreversible / privileged / cron) are listed for the owner and never sent. Severity (S0-S4) is scored separately from effect class.

## Components

| component | weight | score | evidence items |
|---|---|---|---|
| pages | 0.5 | 85.6 | 201 |
| access | 0.2 | 88.7 | 592 |
| static | 0.15 | 91.1 | 9 |
| journeys | 0.15 | n/a | 0 |

## Coverage

| layer | executed | planned | % |
|---|---|---|---|
| pages (browser) CLICK+PROBE | 219 | 236 | 92.8 |
| gates (HTTP) REDIR | 144 | 144 | 100 |
| API live cells | 64 | 66 | 97 |
| API authenticated probes | 18 | 25 | 72 |
| API static (handler read) | 83 | 83 | 100 |
| IDOR / owner / garbage-cookie probes | 13 | 13 | 100 |
| Server Actions (source review) | 3 | 3 | 100 |
| journeys | 0 | 12 | 0 |
| static checks | 9 | 14 | 64.3 |

| persona | executed | planned | % |
|---|---|---|---|
| anon | 144 | 144 | 100 |
| B | 139 | 145 | 95.9 |
| C | 41 | 41 | 100 |
| D | 39 | 39 | 100 |
| A | 0 | 11 | 0 |

Open findings by severity: S0=0 S1=1 S2=11 S3=33 S4=3

## Findings register

| id | sev | scope | cells | title | evidence |
|---|---|---|---|---|---|
| F-000 | S0 (fixed) | global (0) | 0 | /admin/users/[userId]/view leaked a target user's e-mail and admin data to any signed-in non-admin | Persona B and C fetched each other's data (service-role queries streamed into the 307 body). Fixed: requireAdmin() in the page; re-verified. |
| F-010 | S1 | global (0) | 0 | Public Server Action creates pre-confirmed accounts for any e-mail (SA1) | createAccountFromVerifiedEmail uses the service role with email_confirm:true and no server-side proof the caller owns the e-mail or holds a  |
| A-001 | S2 | sitewide (67) | 164 | Design font does not resolve — text renders in a fallback | "Cormorant Garamond" ×12 → Georgia, serif / "DM Sans" ×38 → system-ui, sans-serif |
| A-002 | S2 | sitewide (18) | 32 | Design font does not resolve — text renders in a fallback | "Cormorant Garamond" ×1 → serif |
| A-003 | S2 | multi-page (3) | 4 | Design font does not resolve — text renders in a fallback | "DM Sans" ×2 → sans-serif |
| F-013 | S2 | multi-page (2) | 2 | Middleware auth guard is dead for /franchise/* and /renewal/* | AUTH_ROUTES lists them, but isExistingGatedPath() (middleware.ts:247) returns early for those paths, so anon gets HTTP 200 shells of /renewa |
| A-004 | S2 | page (1) | 2 | Suspicious text on the page | TODO/TBD: TBD |
| F-001 | S2 | global (0) | 0 | Brand fonts (Cormorant Garamond / DM Sans) do not resolve — text renders in a fallback face sitewide | layout.tsx uses next/font (CSS vars) but ~99 files and globals.css:38 use the literal family names; no @font-face exists. Only machines with |
| F-008 | S2 | global (0) | 0 | /api/franchise/brand-view: anonymous insert, no rate limit; malformed JSON returned 500 | anon POST -> 500. Malformed-JSON + unread insert error FIXED in source (uncommitted; not re-verified at runtime — scratch build predates it) |
| F-009 | S2 | global (0) | 0 | State-changing or costly work behind GET routes | download routes, GET /api/documents/[documentId], /api/case-profile/build, /api/franchise/matches, /api/renewal/intake, /api/market-analysis |
| F-011 | S2 | global (0) | 0 | /api/email/results trusts the e-mail in the request body | Anyone can trigger a results e-mail to any address (3/60 min limit only); req.json() outside try (S4). [Already scored via the automated fin |
| A-005 | S2 | global (0) | 0 | expected 400, got 500 (server error on invalid input) | anon POST /api/franchise/brand-view → 500 expected 400, got 500 (server error on invalid input) |
| A-006 | S2 | global (0) | 0 | valid request always returns 500 (F-015); feature API, no data exposure (hand-verified; was FAIL: status 500) | B GET /api/simulator/case-gaps?applicationId=«B.app» → 500 valid request always returns 500 (F-015); feature API, no data exposure (hand-ver |
| A-007 | S3 | sitewide (58) | 132 | Text below WCAG contrast | 4 element(s); worst 3.28 |
| A-008 | S3 | sitewide (72) | 72 | Tap targets below 44 px on a phone | 7/19 |
| A-009 | S3 | sitewide (18) | 34 | Form controls with a non-zero border-radius | 1 control(s) |
| A-010 | S3 | sitewide (12) | 28 | No visible <h1> | E-2 Visa Eligibility Quiz / E2go.app |
| A-011 | S3 | sitewide (17) | 23 | Clickable control with no observable effect | Sign In |
| A-012 | S3 | sitewide (10) | 22 | Form control labelled only by its placeholder | 3 control(s) |
| A-013 | S3 | sitewide (10) | 21 | Form control without a label | 5 control(s) |
| A-014 | S3 | multi-page (7) | 15 | Suspicious text on the page | coming-soon: Coming Soon |
| A-015 | S3 | sitewide (13) | 13 | Input font < 16 px (iOS zooms on focus) | 1 control(s) |
| A-016 | S3 | multi-page (3) | 4 | Dialog would not close / could not return after a click | What are the E-2 investment re |
| A-017 | S3 | multi-page (2) | 4 | Request answered 4xx | GET /api/renewal/intake → 403 |
| A-018 | S3 | multi-page (2) | 4 | Static resource failed to load | /api/renewal/intake 403 |
| A-019 | S3 | multi-page (2) | 2 | Gate check failed (redirect) | http: prerendered redirect with no Location header (F-014) (hand-verified; was FAIL: expected → /pricing, got ) / manual: prerendered redire |
| A-020 | S3 | page (1) | 2 | Buttons without an accessible name | div>div:nth-of-type(1)>button.border, div>div:nth-of-type(1)>button.border, div>div:nth-of-type(1)>button.border |
| A-021 | S3 | page (1) | 2 | Request answered 4xx | GET https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/quiz_sessions?select=result_json%2Coutcome%2Cemail%2Cfull_name&id=eq.0463c6e8-3f48-4fe7 |
| A-022 | S3 | page (1) | 2 | Request answered 4xx | GET https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/simulator_sessions?select=coaching_notes&user_id=eq.62cb2d39-a937-41ae-8276-801e00b12ba |
| A-023 | S3 | page (1) | 2 | Request answered 4xx | GET https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/applications?select=id%2Capplication_type%2Ctreaty_country%2Cinvestment_sources%2Cprior |
| A-024 | S3 | page (1) | 2 | Static resource failed to load | https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/quiz_sessions?select=result_json%2Coutco… 406 |
| A-025 | S3 | page (1) | 2 | Static resource failed to load | https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/simulator_sessions?select=coaching_notes… 406 / https://cziphinlzfnlqlvynwnm.supabase.co/re |
| A-026 | S3 | page (1) | 1 | Suspicious text on the page | raw-key: Missing required elements: employment_projections, market_evidence, r… |
| A-027 | S3 | page (1) | 1 | Suspicious text on the page | raw-key: Missing required elements: applicant_name |
| A-028 | S3 | page (1) | 1 | Suspicious text on the page | raw-key: Missing required elements: investment_substantiality, proportionality… |
| A-029 | S3 | page (1) | 1 | Suspicious text on the page | raw-key: Missing required elements: total_assets, total_liabilities, net_worth |
| A-030 | S3 | page (1) | 1 | Suspicious text on the page | raw-key: Missing required elements: home_country_ties, return_intent, departur… |
| F-012 | S3 | global (0) | 0 | /api/support/submit is anonymous with no captcha/Turnstile | spam / mail-abuse vector; rate-limit only. |
| F-014 | S3 | global (0) | 0 | /modules and /score are prerendered redirects with no Location header | HTTP 307 with an empty Location for anon /modules and B /score; browsers land nowhere useful. [Already scored via the automated findings/ver |
| F-015 | S3 | global (0) | 0 | GET /api/simulator/case-gaps always returns 500 | persona B with a valid applicationId -> 500 (A-006). [Already scored via the automated findings/verdicts; component=none avoids double count |
| F-016 | S3 | global (0) | 0 | Client-loaded /apply/* pages show a blank or spinner-only screen for seconds; /apply/module3/e and /apply/upload probed as blank (textLen 31) | A-003; no skeleton or loading copy. [Already scored via the automated findings/verdicts; component=none avoids double counting.] |
| F-017 | S3 | global (0) | 0 | Raw field keys shown to users: "Missing required elements: employment_projections, market_evidence, ..." | 5 messages on /documents/[applicationId] (A-032..A-036). [Already scored via the automated findings/verdicts; component=none avoids double c |
| F-018 | S3 | global (0) | 0 | "TBD" copy on /apply/calendar | A-011; needs a content owner decision. [Already scored via the automated findings/verdicts; component=none avoids double counting.] |
| F-019 | S3 | global (0) | 0 | Supabase REST calls from the browser answer 406/400 (quiz_sessions, simulator_sessions, applications) | A-027..A-031; .single() on empty result and a column list the live schema rejects on /simulator/interview-day. [Already scored via the autom |
| F-020 | S3 | global (0) | 0 | /franchise/brand/<unknown-slug> renders 200 instead of a 404 | A-038: soft-404 with the generic Franchise Navigator title. [Already scored via the automated findings/verdicts; component=none avoids doubl |
| A-031 | S3 | global (0) | 0 | 200 title "Franchise Navigator / E2go.app" | anon GET /franchise/brand/does-not-exist-qa → 200 200 title "Franchise Navigator / E2go.app" |
| A-032 | S4 | sitewide (76) | 113 | Interactive targets below 24 px on desktop | 3/22 |
| A-033 | S4 | multi-page (5) | 10 | e-mail / password / tel input without autocomplete | 1 control(s) |
| A-034 | S4 | page (1) | 1 | Form control shorter than 40 px | 1 control(s) |

Dismissed after hand verification: 10 cell finding(s) — R-ERRSCREEN: intentional no-token error state (source read).; R-LANDING: coded client redirects to the sibling section (source read); matrix expectation was stale. Not a defect.; R-CLICK-ERR: write-guard artifact: the harness returns {qa_blocked:true} to non-GET requests so the client read a missing field. Not a product defect.; R-BLANK: probe captured the loading state of client-loaded pages (textLen 31); scored as S3 via F-016 (no skeleton / loading copy) instead of S1.

## Lowest-scoring page cells

| score | cell | findings |
|---|---|---|
| 67 | B.desktop./apply/calendar | R-BTN-NAME, R-INPUT-LABEL, R-TAP, R-CONTRAST, R-FONT, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS |
| 67 | B.mobile./apply/calendar | R-BTN-NAME, R-INPUT-LABEL, R-TAP, R-CONTRAST, R-FONT, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS |
| 73 | C.desktop./documents/[applicationId] | R-TAP, R-CONTRAST, R-FONT, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS, R-SUSPICIOUS |
| 75 | B.mobile./renewal/documents | R-NET4XX, R-RESOURCE, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 76 | anon.mobile./results | R-NET4XX, R-RESOURCE, R-INPUT-AUTOCOMPLETE, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 77 | B.desktop./renewal/documents | R-NET4XX, R-RESOURCE, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 79 | anon.mobile./early-access | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-INPUT-AUTOCOMPLETE, R-INPUT-HEIGHT, R-TAP, R-CONTRAST, R-FONT |
| 80 | anon.mobile./ | R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT, R-CLICK-STUCK |
| 80 | anon.mobile./quiz | R-H1, R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-FONT |
| 80 | B.desktop./quiz | R-H1, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 80 | anon.mobile./support | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 80 | B.mobile./apply/investment | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 80 | B.desktop./apply/module1 | R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS, R-CLICK-NOEFFECT |
| 80 | C.desktop./apply/module1 | R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS, R-CLICK-NOEFFECT |
| 80 | C.desktop./apply/module2 | R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS, R-CLICK-NOEFFECT |
| 80 | B.desktop./apply/module3/a | R-INPUT-LABEL, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-CLICK-NOEFFECT |
| 80 | B.desktop./apply/overview | R-H1, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 80 | B.mobile./apply/qualifications | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 80 | B.mobile./apply/ties | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 80 | B.desktop./case-profile | R-H1, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 80 | C.desktop./case-profile | R-H1, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 80 | D.desktop./case-profile | R-H1, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-SUSPICIOUS |
| 80 | B.desktop./fdd/upload | R-INPUT-LABEL, R-TAP, R-CONTRAST, R-FONT, R-RADIUS, R-CLICK-NOEFFECT |
| 80 | B.mobile./market-analysis | R-INPUT-LABEL, R-INPUT-IOS-ZOOM, R-TAP, R-CONTRAST, R-FONT |
| 80 | B.mobile./simulator/interview-day | R-NET4XX, R-NET4XX, R-RESOURCE, R-TAP, R-FONT |

## Needs hand verification

- anon.desktop./renewal/documents — not redirected — read the page: it must show a sign-in state and no account data | shell renders with no account data for anon, but the middleware never guards it (F-013); the client gate was not observed to complete (hand- | shell renders with no account data for anon, but the middleware never guards it (F-013); the client gate was not observed to complete (hand-
- anon.desktop./renewal/intake — not redirected — read the page: it must show a sign-in state and no account data | shell renders with no account data for anon, but the middleware never guards it (F-013); the client gate was not observed to complete (hand- | shell renders with no account data for anon, but the middleware never guards it (F-013); the client gate was not observed to complete (hand-
- L2-3 anon /api/_sentry-tunnel — tunnelRoute rewrite absent in the scratch build (Sentry env blank): unverifiable here (hand-verified; was FAIL: expected 400, got 404)
- L2-3 anon /api/_sentry-tunnel — tunnelRoute rewrite absent in the scratch build (Sentry env blank): unverifiable here (hand-verified; was FAIL: expected 400, got 404)
- L3-3 B /api/dashboard/change-impact?applicationId=«B.app» — Bearer-token route; the cookie-only runner cannot authenticate it — needs a Bearer runner on re-run (hand-verified; was FAIL: status 401)
- L3-3 B /api/dashboard/consistency-sweep?applicationId=«B.app» — Bearer-token route; the cookie-only runner cannot authenticate it — needs a Bearer runner on re-run (hand-verified; was FAIL: status 401)
- L3-3 B /api/dashboard/outcome?applicationId=«B.app» — Bearer-token route; the cookie-only runner cannot authenticate it — needs a Bearer runner on re-run (hand-verified; was FAIL: status 401)
- L3-3 B /api/dashboard/package-manifest?applicationId=«B.app» — Bearer-token route; the cookie-only runner cannot authenticate it — needs a Bearer runner on re-run (hand-verified; was FAIL: status 401)
- L3-3 B /api/generate/case-brief/«B.app» — 404 — needs parameters or has no data for this persona
- L3-3 B /api/partner2/intake?applicationId=«B.app» — 403 — needs parameters or has no data for this persona
- L3-3 B /api/renewal/intake — 403 — needs parameters or has no data for this persona

## Click-through appendix (blocked writes · native dialogs · window.open)

- anon.desktop./: What are the E-2 investment requirements → POST /api/faq/ask
- anon.desktop./early-access: What are the E-2 investment requirements → POST /api/faq/ask
- anon.mobile./early-access: What are the E-2 investment requirements → POST /api/faq/ask
- anon.desktop./learn: What are the E-2 investment requirements → POST /api/faq/ask
- anon.mobile./learn: What are the E-2 investment requirements → POST /api/faq/ask
- D.desktop./documents/[applicationId]: No thanks → POST /api/profile/outcomes-consent
- B.desktop./franchise/discover: Retail → POST /api/answers · Health & Wellness / Medical / Dental → POST /api/answers · Home Services (cleaning, maid service, h → POST /api/answers
- B.desktop./franchise/matches: YES, CONNECT ME → POST /api/franchise/broker-request
- B.desktop./renewal: Notify me → POST /api/coming-soon-interest
- B.desktop./renewal/documents: Notify me → POST /api/coming-soon-interest
- C.desktop./apply/business: Back to case file → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/application_lifecycle?on_conflict=user_id
- B.desktop./apply/module1: Notify me → POST /api/coming-soon-interest
- C.desktop./apply/module1: Notify me → POST /api/coming-soon-interest
- B.desktop./apply/module2: SAVE → PATCH /api/profile/name · SAVE → POST /api/profile/family-members
- C.desktop./apply/module2: Notify me → POST /api/coming-soon-interest
- B.desktop./apply/module3/c: Something looks wrong — I need to make a → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/answers?on_conflict=application_id%2Cquestion_key%2C
- C.desktop./apply/qualifications: Back to case file → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/application_lifecycle?on_conflict=user_id
- C.desktop./apply/ties: Back to case file → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/application_lifecycle?on_conflict=user_id
- B.desktop./case-profile: SAVE → PATCH /api/profile/name
- C.desktop./case-profile: SAVE → PATCH /api/profile/name
- D.desktop./case-profile: No thanks → POST /api/profile/outcomes-consent
- B.desktop./gap-analysis: ↻ RECALCULATE → POST /api/case-profile/build
- C.desktop./gap-analysis: ↻ RECALCULATE → POST /api/case-profile/build
- D.desktop./gap-analysis: No thanks → POST /api/profile/outcomes-consent · ↻ RECALCULATE → POST /api/case-profile/build
- B.desktop./onboarding: CONNECT ME → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/referral_consents?on_conflict=user_id%2Ccategory
- C.desktop./onboarding: CONNECT ME → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/referral_consents?on_conflict=user_id%2Ccategory
- C.desktop./simulator: Voice Speak your answers → POST https://cziphinlzfnlqlvynwnm.supabase.co/rest/v1/simulator_sessions?select=*,PATCH https://cziphinlzf · Begin interview → → POST /api/simulator/tts
- D.desktop./simulator: No thanks → POST /api/profile/outcomes-consent
- B.desktop./simulator/outcome: Save outcome → POST /api/simulator/outcome

## Not executed (36)

- **probed but not clicked** (6): B.mobile./settings; B.mobile./apply/business; B.desktop./apply/module3/e; B.mobile./case-profile; B.mobile./onboarding; B.mobile./simulator
- **not executed** (18): A.desktop./fdd; A.mobile./fdd; A.desktop./fdd/compare; A.mobile./fdd/compare; A.desktop./fdd/questions/[fddId]; A.desktop./fdd/report/[fddId]; A.desktop./fdd/review/[fddId]; A.desktop./fdd/score/[fddId]; A.desktop./fdd/territory/[fddId]; A.desktop./fdd/upload; A.mobile./fdd/upload; API:POST /api/_sentry-tunnel (live-validation); API:POST /api/coming-soon-interest (live-deny); static:schema-drift; static:brand-casing; static:dead-paths; static:secrets; static:seo
- **journey not executed** (12): J1 First-time visitor: landing -> quiz -> results -> pricing; J2 Sign-up and log-in surfaces (render + validation only); J3 Paid customer: case profile -> every Apply section -> checklist; J4 Document upload -> extraction -> review -> gaps (read-only); J5 Generation and download UI (read-only); J6 Interview simulator; J7 Gap analysis, market analysis and FDD; J8 Franchise discovery and renewal; J9 Settings, consent, terms and account lifecycle; J10 Trust surfaces; J11 Brand-host gate (Host: e2go.app); J12 Admin surface (deny side only)

## Structural gaps

- Persona A (real founder account with FDD data) skipped: FDD pages untested by an owner; no separate FDD, admin, unpaid, sim-only, soft-deleted or unverified persona
- Write-guard blocked every non-GET request: forms, uploads, checkout, generation and all E2 flows were not exercised
- Desktop clicks capped at 10 per page; mobile probe-only (no clicks)
- Login-helper sessions expire after ~1h and do not refresh: real-browser session refresh unverified
- Single browser engine; pane was hidden so LCP/CLS were unmeasurable
- Scratch build shares Supabase and Upstash with production; Sentry, Resend, LLM keys blank
- Static API verdicts rest on guard-order analysis, not a line-by-line handler read

> Input notes: 0 unparsable NDJSON line(s), 0 non-page line(s), 3 record(s) that match no matrix cell (/|anon|desktop; /about|anon|desktop; /account-recovery|anon|desktop).
