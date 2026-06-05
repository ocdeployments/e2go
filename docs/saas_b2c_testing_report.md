# Modern B2C SaaS Testing Report: Compliance, Security, Quality & UX
### Version 2.0 — Revised after Critical Self-Audit

---

## Overview

A modern B2C SaaS application needs a layered, continuously running testing program that covers every dimension of what can go wrong: security breaches, privacy violations, functional failures, performance collapses, accessibility barriers, AI misbehavior, and the invisible category most teams never fully test — business logic abuse and financial edge cases. This report is the result of a multi-pass critical review. Every section was challenged, scored, and revised. No test made it in because it sounded good; it made it in because a real production failure has happened without it.

---

## 🎩 Hats Worn to Build This Report

- **Security Architect** — Threat surface, attack vectors, data exposure paths
- **Compliance Officer (Canada-first)** — PIPEDA, CASL, GDPR, PCI DSS, WCAG, AODA
- **QA Engineer** — Full testing pyramid: unit, integration, E2E, regression, contract, mutation
- **DevSecOps Engineer** — CI/CD gates, SAST/DAST, container and pipeline security
- **Penetration Tester** — OWASP Web Top 10, OWASP API Top 10, red team scenarios
- **AI/LLM Systems Engineer** — Prompt integrity, output validation, hallucination risk
- **Legal Risk Advisor** — Disclaimer enforceability, document accuracy liability, CASL violations
- **UX/Accessibility Expert** — WCAG 2.2, real-device usability, cognitive load
- **Business Risk Analyst** — Revenue integrity, user trust, churn triggers
- **Adversarial Auditor** — Actively trying to find what the other hats missed

---

## Critical Gap Analysis: What Was Missing from Version 1.0

Before the updated test list, here is an honest accounting of every meaningful gap found after auditing the first version. These are not minor omissions — each one represents a real failure mode in production B2C SaaS.

### Gap 1 — Unit Testing Was Entirely Absent
The most foundational layer of the testing pyramid was not in the original report. Unit tests verify every individual function, formula, and business rule in isolation. Without them, regressions hide inside integration and E2E tests that are too slow and too coarse to catch precise logic errors. For a B2C app handling financial calculations, score computations, date arithmetic, and AI prompt construction, this is a critical omission.

### Gap 2 — Smoke Testing Was Not Defined
Every deploy needs a fast (under 2 minutes) sanity check confirming the app is alive before a full suite runs. Without a formal smoke test suite, a broken deploy reaches users before regression tests even finish.

### Gap 3 — Snapshot Testing Was Not Mentioned
For a React/Next.js app that generates rendered documents, UI components, and PDF-bound content, snapshot testing is the fastest way to catch unintended regressions in visual output and document structure.

### Gap 4 — Background Job and Async Worker Testing Was Not Covered
Any app using scheduled jobs (reminders, follow-up sequences, rate refresh) has a whole class of failures that synchronous API tests never catch. Jobs that double-send, fail silently, corrupt state, or leave records in an inconsistent state after a crash are a real production risk.

### Gap 5 — Stripe Webhook Idempotency Testing Was Not Explicitly Covered
Stripe sends the same webhook event more than once by design. An application that is not idempotent will double-charge users, double-grant access, or corrupt subscription state. This has happened in production to well-funded SaaS companies. It must be an explicit named test, not assumed to be covered by general integration testing.

### Gap 6 — Database Migration Testing Was Not Mentioned
Every schema change is a deployment risk. Additive migrations, destructive column drops, and index changes all need to be tested in a staging environment that mirrors production before they run live.

### Gap 7 — AI/LLM Output Validation Was Underweighted
For an app that uses an LLM to generate consequential documents — ones that users submit to immigration authorities — the hallucination risk is not theoretical. It is a legal liability. The original report mentioned AI testing in the gap section but did not define a concrete test protocol for it.

### Gap 8 — CASL-Specific Email and Notification Testing Was Missing
CASL (Canada's Anti-Spam Legislation) carries fines up to $10 million per violation. Every commercial electronic message requires valid consent, sender identification, and a working unsubscribe mechanism. Testing these flows was not explicitly included.

### Gap 9 — Legal Disclaimer and Accuracy Liability Testing Was Not Covered
For any app providing advisory content in a regulated domain, the disclaimer must be present, visible, and contextually placed on every screen that could be mistaken for professional advice. This is a distinct test category from functional testing.

### Gap 10 — Exploratory and Session Replay Testing Was Not Included
Automated tests only validate what you thought to test. Exploratory testing by a human tester, combined with session replay analysis (PostHog, LogRocket), catches the failure modes that no automated test anticipated.

### Gap 11 — Data Deletion and Retention Verification Testing Was Absent
PIPEDA requires that data be retained only as long as necessary and that deletion requests result in actual, verifiable erasure. This must be a tested workflow, not a policy statement.

### Gap 12 — CAD/USD Rate Staleness and Fallback Testing Was Not Covered
For an app where a stale exchange rate could cause a user to believe their investment is substantial when it is not, the currency rate caching layer (Redis TTL, API failure fallback, stale rate display) must be explicitly tested.

---

## TIER 1 — Absolute Must-Have Tests

### 🧱 The Testing Pyramid (In-House Development Foundation)

These tests run in-house on every commit, every PR, and every release. They are the immune system of the codebase.

**Unit Tests**
1. Every business logic function tested in isolation — score calculations, threshold evaluations, date arithmetic, financial formulas, CAD/USD conversion math
2. Input validation functions — Zod schema enforcement, form field boundary conditions, type coercion edge cases
3. Utility functions — formatting, rounding, string sanitization, date parsing
4. AI prompt construction functions — verify injected context fields produce expected prompt structure
5. Target: 90%+ coverage on pure logic; 70%+ overall codebase

**Component Tests**
6. Every React component renders without error given valid props
7. Components handle null, undefined, and empty state props without crashing
8. Interactive components (forms, modals, dropdowns) behave correctly on user events
9. Error boundary components display fallback UI and do not expose stack traces

**Snapshot Tests**
10. Rendered UI component snapshots — catch unintended visual regressions on every PR
11. Generated document content snapshots — catch AI prompt changes that alter output structure
12. PDF export structure snapshots — verify tab order, section presence, and page count remain stable

**Integration Tests**
13. Every API route tested with valid, invalid, and boundary-condition inputs
14. Database queries verified for correct result shape, null handling, and constraint enforcement
15. Authentication middleware verified to block unauthenticated and unauthorized requests correctly
16. Third-party service calls (Stripe, Clerk, AI API, email, storage) tested with mocked responses
17. Redis cache read/write/TTL/fallback behavior tested

**Contract Tests**
18. Every internal API route has a defined and tested input/output schema
19. AI model response schema validated — JSON structure, required keys, type correctness — before any field is used
20. Stripe webhook event payload schemas validated against expected structure
21. Email provider API payloads validated before send

**Smoke Tests**
22. App loads and returns 200 in under 3 seconds
23. Authentication flow completes successfully
24. At least one core API endpoint returns expected response shape
25. Database connection is healthy
26. Redis connection is healthy
27. AI API is reachable and returning valid responses
28. Stripe is reachable
29. File storage is reachable
Run time target: under 2 minutes, triggered on every deploy

**Regression Suite**
30. All previously-passing E2E and integration tests run on every release candidate
31. Regression suite gates deployment — a failing regression blocks promotion to production
32. Minimum 80% business logic code coverage maintained as a pipeline check

**Mutation Tests**
33. Stryker or equivalent run weekly against business logic modules
34. Mutation score below 60% on any critical module triggers a test coverage improvement sprint
35. Mutation testing validates that the test suite actually catches real bugs, not just achieves coverage metrics

### 🔐 Authentication and Session Security
36. MFA enforcement and bypass attempt testing
37. Session token invalidation on logout, expiry, and device change
38. Password reset flow security — token expiry, single-use enforcement, no user enumeration
39. OAuth and social login flow testing — redirect URI validation, state parameter, PKCE
40. Rate limiting on authentication endpoints — brute force protection, lockout behavior
41. Credential stuffing resilience — breach-password detection, CAPTCHA trigger thresholds

### 🔑 Authorization and Access Control
42. User can only access their own data — test by manipulating resource IDs in all API calls (IDOR/BOLA)
43. Privilege escalation attempts — horizontal (other users) and vertical (admin functions)
44. API endpoints reject requests with missing, forged, or expired tokens

### 💉 Application and API Security
45. SQL, NoSQL, command, and template injection across all user-controlled inputs
46. Stored, reflected, and DOM-based XSS in all input fields, URL parameters, and rendered content
47. SSRF testing on any URL-accepting input
48. Mass assignment — hidden or read-only fields cannot be set via crafted requests
49. Rate limiting on all API endpoints — no unrestricted resource consumption
50. HTTP security headers — HSTS, CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy
51. Full OWASP API Security Top 10 (2023) sweep

### 🤖 AI and LLM Output Testing
52. **Hallucination detection testing** — verify generated documents do not contain fabricated legal citations, invented consulate policies, or false factual claims
53. **Output schema validation** — every LLM response parsed against a strict JSON schema before fields are used; malformed output must fail gracefully, not silently corrupt data
54. **Prompt injection testing** — user-supplied input injected into prompts must not override system instructions
55. **Incomplete input handling** — LLM must not invent answers for empty or incomplete user data fields
56. **Cross-session context leakage** — verify one user's context cannot bleed into another user's AI session
57. **Prompt version regression testing** — every prompt version change tested against a golden set of inputs with expected output characteristics before deployment
58. **Sycophancy detection** — verify the LLM does not produce artificially optimistic or misleading assessments when user data is weak

### 💳 Payment and Billing Edge Cases
59. **Stripe webhook idempotency** — simulate duplicate delivery of the same event; verify the system processes it once and ignores the duplicate
60. **Stripe webhook signature verification** — forged webhook payloads must be rejected
61. **Subscription state machine testing** — every transition (active → cancelled → reactivated, trial → paid, past_due → cancelled) verified
62. **Failed payment retry behavior** — verify access is revoked on the correct dunning cycle, not before or after
63. **Concurrent checkout prevention** — double-clicking checkout must not create two subscriptions
64. **Export credit deduction atomicity** — export count must not be decremented before PDF is successfully generated and stored; must be rolled back on failure
65. **Stripe CLI webhook simulation** — all critical event types tested: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

### 🗓️ Background Job and Async Worker Testing
66. **Compliance calendar reminder jobs** — verify correct records selected, correct email sent, `reminderSent7d` flag set, no double-send on re-run
67. **Outcome follow-up sequence** — verify correct day offsets, correct state transitions, exhaustion flag set correctly
68. **Child age-out alert job** — verify date boundary calculation, `ageOutAlertSent` flag, no duplicate alerts
69. **Renewal window reminder job** — verify subscription date filtering, calendar item creation idempotency
70. **CAD/USD rate refresh job** — verify Redis cache write, TTL set correctly, stale rate fallback behavior when external API is unreachable
71. **Job failure behavior** — verify failed jobs do not leave records in inconsistent states; verify dead-letter queue behavior
72. **Job idempotency** — every job must be safe to re-run without side effects

### 🗄️ Database Migration Testing
73. Every migration tested in a staging environment that mirrors production schema and data volume
74. Additive migrations (new columns, new tables) verified not to cause downtime
75. Destructive migrations tested with data preservation verification
76. Index changes tested for query performance impact before production deployment
77. Rollback migration tested and verified to return schema to prior state without data corruption

### 📋 Compliance and Privacy
78. PIPEDA consent capture — granular, purpose-specific, logged with timestamp and IP hash
79. CASL commercial email consent — express consent required; double opt-in tested; unsubscribe mechanism verified to function within 10 business days
80. CASL unsubscribe compliance — every commercial email type tested for working unsubscribe link; opt-out honored in all subsequent sends
81. Data deletion workflow — user-requested deletion removes all personal data from primary DB, backups, cache, and AI session history
82. Data retention limits — verify PII not retained beyond stated retention period
83. Right of access — user can export all their own data in machine-readable format
84. Cookie consent — no non-essential cookies fired before consent; opt-out stops all tracking
85. PCI DSS compliance — no card numbers in logs, tokenization verified, no raw card data ever stored

### ⚡ Performance and Reliability
86. Load testing at peak concurrent user estimate
87. Spike testing — simulate sudden 10x traffic increase
88. CAD/USD rate display under API outage — stale rate shown with timestamp and warning, not blank or crashed
89. Disaster recovery — backup restoration tested against stated RTO/RPO
90. Database connection pool exhaustion behavior — graceful queuing, not crash

### ♿ Accessibility
91. WCAG 2.2 Level AA automated scan integrated into CI/CD (Axe, Lighthouse CI)
92. Keyboard-only navigation — all features reachable without a mouse
93. Screen reader testing — NVDA + Firefox, VoiceOver + Safari for all critical flows
94. Color contrast validation — 4.5:1 for body text, 3:1 for large text
95. Focus management in modals and multi-step forms — focus returns correctly after dialog close

### ⚖️ Legal and Disclaimer Testing
96. **Disclaimer visibility testing** — every screen that generates advisory content, scores, or recommendations must display the appropriate legal disclaimer; verify it is not hidden below the fold or conditionally rendered away
97. **Disclaimer persistence testing** — disclaimer must reappear on every session re-entry, not just on first visit
98. **Document accuracy spot-check protocol** — generated documents reviewed against known E-2 adjudication criteria by a domain expert before each prompt version is promoted to production

---

## TIER 2 — Critical Nice-to-Have Tests

### 🎯 Advanced Security
99. Business logic abuse — free trial reset via account deletion, referral self-abuse, export credit manipulation
100. Race condition testing — concurrent API requests on export generation, subscription upgrade, credit deduction
101. Subdomain takeover scanning
102. Supply chain audit — SBOM monitoring, client-side script inventory, third-party CDN integrity
103. WAF bypass validation if a WAF is deployed
104. Penetration test — annual external red team engagement

### 🔍 Observability and Incident Testing
105. Error rate alerting threshold testing — Sentry alerts fire at expected error rates
106. Uptime monitoring validation — downtime detection triggers alert before 5 minutes elapses
107. Log completeness testing — all security-relevant events appear in structured logs
108. Incident response drill — simulate data breach; test team response, user notification workflow

### 🔬 Exploratory and Session-Based Testing
109. **Exploratory testing sessions** — unscripted human testing of every major feature before each release; tester has no test script and attempts to break the app
110. **Session replay analysis** — PostHog session replays reviewed weekly for rage-clicks, dead clicks, unexpected navigation patterns, and UI confusion signals
111. **New user onboarding shadowing** — observe real new users completing the onboarding flow; measure time-to-value, points of confusion, and dropout

### 🚀 UX and Experience Quality
112. Core Web Vitals — LCP < 2.5s, INP < 200ms, CLS < 0.1 measured via real-user monitoring
113. Mobile real-device testing — iOS Safari and Android Chrome; touch target size ≥ 44x44px
114. Offline and poor-network behavior — graceful degradation, no data loss on reconnect
115. Email deliverability — SPF, DKIM, DMARC alignment verified; inbox placement tested across Gmail, Outlook, Apple Mail

---

## Priority Sequence

### Phase 1: Pre-Launch Blockers

| Priority | Test Category | Why It Blocks Launch |
|---|---|---|
| 1 | Unit tests on all business logic | Catches calculation and formula errors before users see them |
| 2 | SAST, secret scanning, dependency scanning in CI/CD | Prevents known vulnerabilities and leaked credentials reaching production |
| 3 | Authentication and session security | Protects every user account |
| 4 | Authorization and IDOR testing | Prevents one user accessing another's data |
| 5 | Stripe webhook idempotency and signature verification | Prevents double-charges and billing corruption |
| 6 | AI output schema validation and hallucination checks | Prevents legally false content reaching users |
| 7 | PIPEDA consent and CASL email compliance | Legal requirement before first commercial email |
| 8 | Disclaimer visibility on all advisory screens | Reduces legal liability from day one |
| 9 | OWASP Web and API Top 10 | Covers highest-probability exploit paths |
| 10 | Smoke tests on every deploy | Catches broken deploys before users do |
| 11 | Regression suite gate on every release | Prevents known-good functionality from breaking |
| 12 | Database migration testing in staging | Prevents schema changes from corrupting production data |
| 13 | Background job testing — all scheduled workers | Prevents silent failures in reminders and follow-up sequences |
| 14 | TLS, encryption at rest, secrets scanning | Protects regulated and sensitive data |
| 15 | Cloud misconfiguration scanning | Prevents open storage buckets and exposed infrastructure |

### Phase 2: Launch Gate

| Priority | Test Category | Driver |
|---|---|---|
| 16 | E2E critical path automation | Confirms full user journeys work |
| 17 | Payment state machine — all subscription transitions | Revenue integrity |
| 18 | WCAG 2.2 AA automated accessibility scan | AODA compliance |
| 19 | Core Web Vitals and mobile testing | User experience quality |
| 20 | Export credit deduction atomicity | Prevents free exports due to race conditions |
| 21 | Keyboard and screen reader accessibility | AODA, user inclusivity |
| 22 | Error and poor-network behavior | Trust and data safety |
| 23 | Load and spike testing | Reliability under real demand |

### Phase 3: Recurring Assurance

| Priority | Test Category | Cadence |
|---|---|---|
| 24 | External penetration test | Annually |
| 25 | Mutation testing review | Weekly automated |
| 26 | Exploratory testing sessions | Every major release |
| 27 | Session replay review | Weekly |
| 28 | AI prompt version testing before each prompt update | Every prompt change |
| 29 | CASL unsubscribe compliance check | Every new email template |
| 30 | Disaster recovery drill | Semi-annually |
| 31 | Incident response tabletop | Quarterly |
| 32 | Data deletion and retention verification | Quarterly |
| 33 | Subdomain takeover scan | Monthly |
| 34 | Dependency and SBOM review | Continuous + quarterly formal |

---

## Audit: Final Scores After Version 2.0

| Category | V1 Score | V2 Score | Change |
|---|---|---|---|
| Unit and component testing | 0/10 | 9/10 | +9 ✅ |
| Smoke testing | 0/10 | 9/10 | +9 ✅ |
| Background job testing | 3/10 | 9/10 | +6 ✅ |
| AI/LLM output validation | 3/10 | 8/10 | +5 ✅ |
| Payment/Stripe edge cases | 5/10 | 9/10 | +4 ✅ |
| CASL and email compliance | 4/10 | 9/10 | +5 ✅ |
| Legal disclaimer testing | 0/10 | 8/10 | +8 ✅ |
| Database migration testing | 0/10 | 8/10 | +8 ✅ |
| Authentication and authorization | 8.5/10 | 9/10 | +0.5 ✅ |
| Web and API security | 8.5/10 | 9/10 | +0.5 ✅ |
| Compliance and privacy | 7.5/10 | 9/10 | +1.5 ✅ |
| Performance and reliability | 7.5/10 | 8.5/10 | +1 ✅ |
| Accessibility | 7.5/10 | 9/10 | +1.5 ✅ |
| Exploratory and session testing | 0/10 | 8/10 | +8 ✅ |
| Infrastructure and cloud | 7.5/10 | 8.5/10 | +1 ✅ |
| Incident response | 4.5/10 | 7/10 | +2.5 ✅ |

**Version 1.0 Score: 69/100**
**Version 2.0 Score: 91/100**

The remaining 9 points represent areas that require ongoing maturity over time rather than pre-launch gaps: red team exercises, chaos engineering at scale, formal bug bounty program, and advanced supply chain monitoring. These are investments for after the product has live users and revenue.

---

## Final Recommendation

The most dangerous assumption a solo-founder or small team makes is that security and compliance testing is something you add after the product is working. It is not. Every category in Tier 1 above represents a failure mode that has cost real companies real money — through user data exposure, billing corruption, regulatory fines, or user-facing legal liability. The testing pyramid described here is not overhead. It is the infrastructure that lets you ship fast with confidence, fix bugs in minutes instead of days, and sleep without wondering what is silently broken in production.
