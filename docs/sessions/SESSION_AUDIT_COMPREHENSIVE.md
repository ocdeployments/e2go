# E2go Platform Audit — June 10, 2026
# Based on: SaaS B2C Testing Report v2.0
# Agents: security-appsec-engineer, engineering-code-reviewer,
#          testing-api-tester, testing-workflow-optimizer,
#          testing-performance-benchmarker, testing-accessibility-auditor,
#          data-privacy-officer, engineering-senior-developer,
#          finance-financial-analyst, engineering-prompt-engineer

## CONSTRAINTS
- No Playwright. No screenshots. No image processing.
- All verification through: code review, curl, npm commands,
  npx supabase db query, grep, file reads.
- Report findings only. Fix nothing over 3 lines.
- Do not commit anything.
- Cost: regular tokens only via OpenRouter.

## HOW TO RUN
Paste this entire file into Claude Code:
  cat docs/sessions/SESSION_AUDIT_COMPREHENSIVE.md

---

## AGENT ASSIGNMENTS BY AUDIT BLOCK

The SaaS B2C v2.0 framework defines 34 test categories across
3 phases. Below is the mapping of available agents to each category,
covering Phase 1 (pre-launch blockers) completely and Phase 2
(launch gate) where agents exist.

### BLOCK 1 — Identity and Access
Agent: security-appsec-engineer
Framework categories: Auth, session management, IDOR, BOLA, BFLA,
tenant isolation (SaaS B2C Phase 1, priorities 2–3)

Read src/middleware.ts fully.
Read src/app/login/page.tsx fully.
Read src/app/signup/page.tsx fully.
Read src/app/api/auth/ (all routes if present).
Read src/app/verify/page.tsx.

Verify:
1. Every protected route in middleware requires Supabase session.
   Curl each without auth header — must return 302 or 401, not 200:
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/apply
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/generate/test
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/simulator
     curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin

2. Session management:
   - Supabase session tokens have expiry set
   - Remember me correctly extends to 30 days
   - No session fixation: new token issued on login

3. Password reset flow:
   - Reset token expires (check forgot-password route)
   - No weak password acceptance

4. Tenant isolation — IDOR test:
   Read src/app/api/answers/ routes.
   Confirm every query is scoped by authenticated user_id.
   A user must not be able to read another user's answers
   by changing the applicationId in the URL.
   Read src/app/api/generate/ routes — same check.

5. Admin endpoint protection:
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin
   Must require auth. Must never be publicly reachable.

6. Email verification enforcement:
   Confirm unverified users redirect to /verify.
   Confirm /verify itself does not trigger the redirect
   (infinite loop check). Read middleware.ts carefully.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 2 — Application and API Security
Agent: security-appsec-engineer
Framework categories: Injection, XSS, SSRF, mass assignment,
rate limiting (SaaS B2C Phase 1, priority 4)

Read all API routes in src/app/api/ — list every file first:
  find src/app/api -name "route.ts" | sort

For each route, check:

1. Injection — SQL/NoSQL:
   All database queries must use Supabase parameterized client.
   grep -r "\.rpc\|\.from\|raw(" src/app/api/ --include="*.ts"
   Flag any raw string concatenation going into a query.

2. Prompt injection:
   Read src/lib/generation-engine.ts.
   Confirm user answers are wrapped in XML tags before insertion
   into AI prompts. Check src/lib/prompt-sanitizer.ts exists
   and is called before every AI API call.

3. Mass assignment:
   In quiz session save route and answers routes — confirm only
   explicitly allowlisted fields are written. User cannot set
   outcome, payment_status, or admin fields via body injection.

4. Rate limiting:
   Read middleware.ts — confirm rate limits exist for:
   /login (5 per 15 min), /api/quiz/submit (3 per hour),
   /api/generate/* (50 per day).
   Confirm these are production-only (NODE_ENV check present).

5. SSRF:
   Check franchise referral route and email results route.
   Neither should make outbound HTTP calls to user-supplied URLs.

6. Secret exposure:
   grep -r "OPENROUTER_API_KEY\|ANTHROPIC_API_KEY\|GROQ_API_KEY\|STRIPE_SECRET" \
     src/app/ src/components/ --include="*.ts" --include="*.tsx" | \
     grep -v "process.env"
   Any hit is a critical finding — API key in client code.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 3 — Data Protection and Compliance
Agent: data-privacy-officer + security-appsec-engineer
Framework categories: Encryption, secrets, PIPEDA, CASL,
consent, PCI DSS (SaaS B2C Phase 1, priorities 5 and 7)

1. Secrets management:
   grep -r "sk_live\|sk_test\|whsec_\|rk_live\|rk_test" \
     . --include="*.ts" --include="*.tsx" --include="*.json" \
     --exclude-dir=node_modules
   Any Stripe secret key in source = critical finding.

   grep -r "RESEND_API_KEY\|SUPABASE_SERVICE_ROLE" \
     src/app/ src/components/ --include="*.ts" --include="*.tsx"
   Must only appear as process.env references, never hardcoded.

2. PIPEDA / consent:
   Read src/app/apply/module1/page.tsx.
   Confirm: explicit consent captured with timestamp.
   Confirm: consent logged to consent_log table with user_id and datetime.

3. CASL compliance:
   grep -r "casl_consent\|email_opt" src/ --include="*.ts" | head -20
   Confirm quiz saves casl_consent = true/false.
   Confirm marketing emails only sent when casl_consent = true.

4. PCI DSS:
   Confirm no card data stored anywhere in our DB.
   grep -r "card_number\|cvv\|cvc\|expiry" src/ --include="*.ts"
   Must return zero results.
   Confirm Stripe handles all card data — we only store
   stripe_customer_id and stripe_subscription_id.

5. Data exposure in API responses:
   Read the answers API route — confirm password hashes,
   internal IDs, and service role keys never appear in responses.
   Read quiz session save route — confirm only safe fields returned.

6. Cookie consent:
   Read src/app/layout.tsx or cookie consent component.
   Confirm cookie consent banner exists and respects opt-out.

7. Document branding:
   grep -r "e2go\|E2go\|e2go\.app" \
     src/lib/generation-engine.ts src/lib/prompt-sanitizer.ts
   E2go branding must never appear in generated document prompts.
   Documents must be submitted without platform attribution.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 4 — AI Feature Security
Agent: engineering-prompt-engineer + security-appsec-engineer
Framework category: AI/LLM security (SaaS B2C v2.0 added gap)

E2go uses AI in 4 places: document generation (Anthropic),
simulator evaluation (OpenRouter), document extraction (OpenRouter),
quiz hints (if any). Each must be audited.

1. Prompt injection prevention:
   Read src/lib/generation-engine.ts fully.
   Read src/lib/prompt-sanitizer.ts if it exists.
   Confirm: user-supplied content (Module 3 answers, voice sample,
   follow-up responses) is sanitized before insertion into prompts.
   Confirm: XML wrapping applied around all user content.
   Confirm: injection patterns blocked ("ignore previous instructions",
   "you are now", "remove all disclaimers", etc.)

2. AI detection gate:
   Read the AI detection step in generation-engine.ts.
   Confirm: threshold is 0.35.
   Confirm: documents above threshold are flagged, not silently passed.
   Confirm: max 3 humanization attempts before flagging for review.

3. Output validation:
   Read the quality gate step in generation-engine.ts.
   Confirm: generated documents are checked for:
   - Legal conclusions ("your application qualifies" must not appear)
   - E2go branding in document content
   - Empty sections
   - Hallucinated dates or amounts not from user answers

4. API key routing:
   grep -r "ANTHROPIC_API_KEY" src/ --include="*.ts" | \
     grep -v "generation-engine"
   Any hit outside generation-engine.ts = critical finding.
   grep -r "OPENROUTER_API_KEY" src/lib/generation-engine.ts
   Must return zero results — generation engine uses Anthropic only.

5. Model version pinning:
   grep -r "claude-\|model:" src/lib/generation-engine.ts | head -10
   Confirm model is explicitly pinned (claude-opus-4-8 or equivalent).
   Never use "latest" — model updates can break document quality.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 5 — Payment and Business Logic
Agent: finance-financial-analyst + security-appsec-engineer
Framework categories: Payment state machine, business logic abuse,
race conditions (SaaS B2C Phase 1 priorities 10–11, Phase 2 priority 17)

1. Stripe webhook security:
   Read src/app/api/stripe/webhook/route.ts fully.
   Confirm: Stripe signature verified before any processing.
   Confirm: idempotency via processed_webhook_events table.
   Confirm: event type allowlist (only handle known event types).
   Confirm: replay attack prevention (timestamp tolerance).

2. Payment wall enforcement:
   curl -s -o /dev/null -w "%{http_code}" \
     http://localhost:3000/generate/test-app-id
   Must return 302 (redirect to pricing), not 200.
   Read the generate page — confirm payment status check fires
   before any generation starts.

3. Pricing integrity:
   Read src/app/pricing/PricingClient.tsx.
   Confirm all 10 Price IDs match CLAUDE_CONTEXT.md exactly.
   Confirm amounts displayed match: $550/$697/$750/$797/
   $997/$1,297/$1,397/$197/$29.99/$497.
   User must not be able to manipulate Price ID in checkout request.

4. Business logic abuse — subscription:
   Can a user start document generation without paying?
   Can a user access another user's generated documents?
   Can a user trigger the simulator without purchasing sessions?
   Read the relevant route handlers and confirm gates exist.

5. Child surcharge:
   Read how +$50 per extra child is calculated in checkout.
   Confirm it cannot be bypassed by omitting the child count.

6. Refund and webhook edge cases:
   Read webhook handler for: payment_intent.payment_failed,
   customer.subscription.deleted, charge.refunded.
   Confirm access is revoked on refund/cancellation.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 6 — Functional Correctness
Agent: engineering-code-reviewer + engineering-senior-developer
Framework categories: E2E critical path, regression baseline
(SaaS B2C Phase 1 priority 8, Phase 2 priority 16)

This block confirms the platform works correctly as a system —
not just that it compiles.

1. Quiz scoring correctness:
   Read the scoring implementation (results/page.tsx or scoring lib).
   Trace through: 0 flags = 100 points, 1 attorney flag = 90 points,
   2 attorney flags = 80 points, floor at 45.
   Confirm score band → verdict → CTA are all consistent.
   No score of 90+ can coexist with an attorney flag.

2. Auto-save on all 6 case file sections:
   Read each page: story, business, investment, qualifications,
   family, ties.
   grep -n "debounce\|setTimeout\|autosave\|auto_save" \
     src/app/apply/story/page.tsx \
     src/app/apply/business/page.tsx \
     src/app/apply/investment/page.tsx \
     src/app/apply/qualifications/page.tsx \
     src/app/apply/family/page.tsx \
     src/app/apply/ties/page.tsx
   Must find debounce logic in every file.

3. Document generation pipeline:
   Read src/lib/generation-engine.ts.
   Confirm 15 steps execute sequentially — no parallel generation.
   Confirm cover letter is Step 1.
   Report exact state of 3 known issues with file + line:
     Issue A: approval gate timing
     Issue B: setState-during-render violation
     Issue C: empty right column boxes

4. Pre-fill from quiz to case file:
   Read src/lib/prefill.ts or equivalent.
   Confirm quiz answers (citizenship, investment, family) pre-fill
   the correct Module 3 fields with source badge.

5. Module 3 denial gaps — read each section page:
   For each gap in QUIZ_IMPROVEMENT_MASTER.md Section 8:
     Report: EXISTS / MISSING / PARTIAL
   Gap 1: Your Investment — funds spent on expenses question
   Gap 2: Your Investment — paper trail gap checklist
   Gap 3: Your Business — hiring plan structured repeating group
   Gap 4: Your Business — projection table with assumption source
   Gap 5: Your Ties — structured tie categories

6. Voice input:
   Read src/hooks/useSpeechInput.ts.
   Confirm getUserMedia pre-check exists before SpeechRecognition.start().
   Confirm module4 does NOT have mic button.
   grep -r "useSpeechInput\|SpeechRecognition" \
     src/app/apply/module4/ --include="*.tsx"
   Must return zero results.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 7 — API Testing
Agent: testing-api-tester
Framework categories: API inventory, deprecated endpoints,
shadow endpoints (SaaS B2C Phase 1 priority 4)

1. Full API inventory:
   find src/app/api -name "route.ts" | sort
   List every route. Confirm each is intentional — no orphaned
   or forgotten endpoints.

2. HTTP methods:
   For each route, confirm only the required HTTP methods are
   exported. A GET-only route must not accept POST.

3. Response codes:
   Curl each API route without auth:
     Must return 401 or 403, not 200 or 500.
   Curl each API route with malformed body:
     Must return 400 with validation error, not 500.

4. Error messages:
   API error responses must not expose:
   - Stack traces
   - Database table names
   - Internal file paths
   - API keys or tokens
   grep -r "console.error\|stack\|trace" \
     src/app/api/ --include="*.ts" | head -20
   Confirm errors are logged server-side, not returned to client.

5. Deprecated endpoint check:
   Compare current route list against any old route references
   in CLAUDE_CONTEXT.md. Confirm deleted routes are truly gone.
   curl -s -o /dev/null -w "%{http_code}" \
     http://localhost:3000/api/module3/save
   Old endpoints must return 404, not 200.

Report: each check as PASS / FAIL / PARTIAL.

---

### BLOCK 8 — Workflow and Process Integrity
Agent: testing-workflow-optimizer
Framework categories: Background jobs, email deliverability,
consent workflow (SaaS B2C Phase 1 priorities 13–14)

1. Email routes:
   Read src/app/api/email/results/route.ts.
   Read src/app/api/notifications/franchise-referral/route.ts.
   Confirm: auth required before sending any email.
   Confirm: recipient is always either the authenticated user
   or ADMIN_EMAIL — never a user-supplied address.
   Confirm: Resend API key is server-side only.

2. Email content:
   grep -r "sendEmail\|resend\|createEmail" \
     src/ --include="*.ts" | grep -v node_modules | head -20
   For each email send: confirm subject and body do not contain
   API keys, internal IDs, or stack traces.

3. CASL compliance in email:
   Confirm marketing emails (not transactional) only send
   when casl_consent = true on the user's record.
   Transactional emails (password reset, verify) are exempt.

4. Lifecycle tracking:
   grep -r "application_lifecycle\|lifecycle" \
     src/ --include="*.ts" | grep -v node_modules | head -20
   Confirm key events are tracked:
   quiz_completed, payment_completed, section visits, generation triggered.

5. Franchise referral workflow:
   Read franchise referral route.
   Confirm: saves franchise_referral_requested to quiz_sessions.
   Confirm: sends admin email via Resend.
   Confirm: cannot be triggered without a valid quiz session.
   Confirm: admin email address comes from env var, not hardcoded.

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 9 — Database and Infrastructure
Agent: security-appsec-engineer + engineering-senior-developer
Framework categories: RLS, migrations, cloud misconfiguration
(SaaS B2C Phase 1 priorities 5–6)

1. RLS on all new columns:
   npx supabase db query "
     SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_name IN (
       'quiz_sessions', 'applications', 'profiles',
       'answers', 'application_lifecycle'
     )
     AND column_name IN (
       'readiness_stage', 'business_type', 'last_visited_section',
       'working_target_date', 'first_name', 'last_name'
     )
     ORDER BY table_name, column_name
   "
   Confirm all expected columns exist.

2. RLS policies:
   npx supabase db query "
     SELECT tablename, policyname, cmd, qual
     FROM pg_policies
     WHERE schemaname = 'public'
     ORDER BY tablename
   "
   Every table with user data must have at least one RLS policy.
   Flag any table that has no policy.

3. Migration safety:
   grep -r "DROP TABLE\|DROP COLUMN\|TRUNCATE" \
     supabase/migrations/ --include="*.sql"
   Must return zero results. No destructive migrations allowed.

4. Service role key exposure:
   grep -r "SUPABASE_SERVICE_ROLE\|service_role" \
     src/app/ src/components/ --include="*.ts" --include="*.tsx"
   Service role key must only appear in server-side API routes.
   Any client component with service role key = critical finding.

5. Environment variable audit:
   cat .env.local | grep -v "^#" | grep "=" | \
     sed 's/=.*/=***/' | sort
   List all env var names (not values). Confirm no unexpected vars.
   Confirm all required vars are present:
   OPENROUTER_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY,
   RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
   SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL

Report: each check as PASS / FAIL / PARTIAL with file and line.

---

### BLOCK 10 — Performance Baseline
Agent: testing-performance-benchmarker
Framework categories: Core Web Vitals proxy, build size,
bundle analysis (SaaS B2C Phase 2 priority 19)
Note: no Lighthouse, no browser — code-level proxies only.

1. Build output size:
   npm run build 2>&1 | tail -30
   Report: total routes, any routes over 250kb first load JS.
   Flag any route with unusually large bundle.

2. Image optimization:
   grep -r "<img " src/ --include="*.tsx" | grep -v "next/image"
   Any raw <img> tag instead of Next.js Image component
   will hurt Core Web Vitals (LCP). Flag each one.

3. API response time proxy:
   time curl -s http://localhost:3000/api/health > /dev/null
   time curl -s http://localhost:3000/quiz > /dev/null
   time curl -s http://localhost:3000/ > /dev/null
   Report response times. Flag anything over 2 seconds.

4. Large dependencies:
   cat package.json | grep -E '"[^"]+": "[^"]+"' | head -30
   Check for: duplicate utility libraries, multiple date libraries,
   unused heavy dependencies.

5. Database query efficiency:
   grep -r "\.from\(" src/app/api/ --include="*.ts" | \
     grep -v "select\|limit\|eq\|filter" | head -10
   Flag any query without a WHERE clause or LIMIT —
   potential full table scan.

Report: each finding with file, estimated impact, priority.

---

### BLOCK 11 — Accessibility Baseline
Agent: testing-accessibility-auditor
Framework categories: WCAG 2.2 AA, keyboard navigation,
form accessibility (SaaS B2C Phase 2 priority 18)
Note: no browser tools — code-level audit only.

1. Form labels:
   grep -r "<input\|<textarea\|<select" \
     src/components/ src/app/ --include="*.tsx" | \
     grep -v "aria-label\|htmlFor\|id=" | head -20
   Any input without a label association = WCAG 2.2 failure.

2. Button accessibility:
   grep -r "<button" src/ --include="*.tsx" | \
     grep -v "aria-label\|children\|type=" | head -10
   Buttons must have visible text or aria-label.

3. Color contrast — design tokens:
   The Obsidian Gold design uses:
   Background #0a0a0a, text #f5f0e8, accent #C9A84C
   These combinations must meet WCAG AA (4.5:1 for normal text).
   Calculate contrast ratios:
   #f5f0e8 on #0a0a0a = ~18:1 ✅
   #C9A84C on #0a0a0a = ~7.5:1 ✅
   rgba(245,240,232,0.35) on #0a0a0a ≈ 5.2:1 — borderline, flag.
   Muted text below 4.5:1 must not be used for meaningful content.

4. Focus indicators:
   grep -r "outline: none\|outline:none\|focus:outline-none" \
     src/ --include="*.tsx" --include="*.css" | head -10
   Removing focus outlines without replacement = WCAG failure.
   Flag each instance.

5. Alt text on images:
   grep -r "<Image\|<img" src/ --include="*.tsx" | \
     grep -v "alt=" | head -10
   All images must have alt text or aria-hidden if decorative.

6. Semantic HTML:
   grep -r "<div onClick\|<span onClick" \
     src/ --include="*.tsx" | head -10
   Clickable divs and spans are not keyboard accessible.
   Must use <button> or role="button" with keyboard handler.

Report: each finding with WCAG criterion, file, line, severity.

---

### BLOCK 12 — Legal and Compliance
Agent: data-privacy-officer
Framework categories: Legal disclaimer, document accuracy liability,
PIPEDA (SaaS B2C v2.0 added gap — legal disclaimer testing)

E2go has specific legal exposure: it produces visa application
documents. Any statement in the app claiming legal compliance
is met is a liability.

1. Legal disclaimers in generated documents:
   grep -r "qualifies\|meets the requirement\|satisfies\|approved\|guaranteed" \
     src/lib/generation-engine.ts \
     src/lib/prompt-sanitizer.ts \
     prompts/ 2>/dev/null | head -20
   Any of these phrases in a document generation prompt
   is a critical legal finding.

2. UI disclaimer language:
   grep -r "not a law firm\|not legal advice\|preparation tool" \
     src/ --include="*.tsx" | head -10
   Confirm the platform's legal position is stated clearly
   in the UI — at minimum on the results page and generate page.

3. Terms of service:
   curl -s -o /dev/null -w "%{http_code}" \
     http://localhost:3000/terms
   Must return 200. Terms must exist.
   Read src/app/terms/page.tsx — confirm it addresses:
   document preparation only, not legal advice, limitation of liability.

4. Privacy policy:
   curl -s -o /dev/null -w "%{http_code}" \
     http://localhost:3000/privacy
   Must return 200.
   grep -r "PIPEDA\|personal information\|data retention" \
     src/app/privacy/ --include="*.tsx" | head -5
   PIPEDA compliance must be referenced.

5. Attorney referral disclaimers:
   grep -r "attorney_recommended\|attorney flag\|legal review" \
     src/app/results/ --include="*.tsx" | head -10
   Confirm attorney-recommended outcome shows appropriate
   disclaimer before the user proceeds to payment.

Report: each finding with legal risk level (Critical/High/Medium).

---

### FINAL STEPS

npm run build
Confirm: clean build, zero errors.

Count routes:
  find src/app -name "page.tsx" -o -name "route.ts" | wc -l

Smoke test — curl all public routes:
  for route in "/" "/quiz" "/results" "/pricing" "/login" \
    "/signup" "/learn" "/about" "/privacy" "/terms" "/support"; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
      "http://localhost:3000$route")
    echo "$route: $STATUS"
  done
All must return 200.

---

### FINAL REPORT FORMAT

Group findings by block.
For each finding:
  File: [path]
  Line: [number if applicable]
  Finding: [what is wrong]
  Severity: Critical / High / Medium / Low
  Framework: [SaaS B2C category it maps to]

End with:
  Total findings by severity
  Top 5 recommended fixes in priority order
  Estimated current security/quality posture vs. SaaS B2C v2.0
  Phase 1 pre-launch blockers: PASS / FAIL count
