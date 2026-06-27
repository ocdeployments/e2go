# SESSION — Security & Quality Fixes (All Three Audits)
**Date:** June 11, 2026
**Branch:** dev
**Agents:** security-appsec-engineer, engineering-minimal-change,
            engineering-code-reviewer
**Estimated time:** 4–5 hours
**Source:** Three audit passes — 49 unique findings synthesised

---

## CONSTRAINTS

- No Playwright. No screenshots.
- Verify with: curl, npm run build, npx tsc --noEmit, grep
- engineering-minimal-change: smallest fix that closes the finding.
  Do not refactor surrounding code. Do not rename. Do not improve
  things not on this list.
- One commit per group. Build must be clean before each commit.
- Update BUILD_TRACKER.md and CLAUDE_CONTEXT.md at end of session.

---

## READ FIRST

```
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat docs/QUIZ_IMPROVEMENT_MASTER.md
```

Confirm you understand:
- ANTHROPIC_API_KEY → generation-engine.ts ONLY
- OPENROUTER_API_KEY → all other AI features
- GROQ_API_KEY → TTS and transcription ONLY
- No Playwright in verification

---

## GROUP 1 — CRITICAL: Authentication on Unprotected Routes
**Priority: Fix first. These are open doors.**

### Fix 1A — Remove Playwright auth bypass (1 line)
File: `src/middleware.ts` line ~78

Find:
```typescript
if (request.headers.get('x-playwright-test') === 'true') {
  return NextResponse.next()
}
```
Delete this block entirely. No replacement needed.
This header bypasses ALL authentication in production.
Any HTTP client can send this header.

Verify:
```bash
grep -n "playwright-test\|x-playwright" src/middleware.ts
# Must return zero results
```

### Fix 1B — Add session auth to all 4 generate API routes

Files to fix:
- `src/app/api/generate/start/route.ts`
- `src/app/api/generate/run/[jobId]/route.ts`
- `src/app/api/generate/documents/[applicationId]/route.ts`
- `src/app/api/generate/progress/[jobId]/route.ts`

Read each file fully before editing.

Pattern to apply at the top of each route handler:
```typescript
const supabase = createClient()
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// Replace any existing userId from request body with: user.id
```

For generate/start and generate/documents: also verify that the
applicationId in the request belongs to the authenticated user:
```typescript
const { data: app } = await supabase
  .from('applications')
  .select('user_id')
  .eq('id', applicationId)
  .single()
if (!app || app.user_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Fix 1C — Add payment wall to generate/start and generate/download

In generate/start/route.ts, after the ownership check:
```typescript
const { data: payment } = await supabase
  .from('applications')
  .select('payment_status')
  .eq('id', applicationId)
  .single()
if (payment?.payment_status !== 'paid') {
  return NextResponse.json(
    { error: 'Payment required' },
    { status: 402 }
  )
}
```

Apply same check to generate/download/[applicationId]/route.ts.

### Fix 1D — Add auth to email/results route

File: `src/app/api/email/results/route.ts`

Read the full file first. Add session check at line 6:
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
// Allow anonymous if they provide a valid quiz_session_id
// that matches their email — check session ownership
// OR: require auth entirely (simpler and safer)
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Also on line ~75: remove token from response body.
Change:
```typescript
return NextResponse.json({ success: true, token })
```
To:
```typescript
return NextResponse.json({ success: true })
```

### Fix 1E — Add auth to simulator/tts and simulator/transcribe

Files:
- `src/app/api/simulator/tts/route.ts`
- `src/app/api/simulator/transcribe/route.ts`

Add auth check at line 6 of each:
```typescript
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Also in transcribe: add file size and type validation:
```typescript
const file = formData.get('file') as File
if (!file || file.size > 25 * 1024 * 1024) { // 25MB max (Groq limit)
  return NextResponse.json({ error: 'Invalid file' }, { status: 400 })
}
const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp3', 'audio/ogg']
if (!allowedTypes.includes(file.type)) {
  return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
}
```

In TTS: add input length validation:
```typescript
const { text } = await req.json()
if (!text || typeof text !== 'string' || text.length > 4000) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
}
```

### Fix 1F — Add auth to franchise-referral route

File: `src/app/api/notifications/franchise-referral/route.ts`

Add auth check at line 13. Also escape HTML in email body:
```typescript
const sanitize = (str: string) =>
  str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
// Apply to sessionId, userEmail, franchiseName before interpolation
```

### Fix 1G — Add auth to all 4 followup routes

Files:
- `src/app/api/followup/completion-summary/route.ts`
- `src/app/api/followup/generate-questions/route.ts`
- `src/app/api/followup/save-response/route.ts`
- `src/app/api/followup/save-voice-sample/route.ts`

Add session auth check at line ~17/40/50/84 of each.
Also verify applicationId ownership against user.id (same pattern as 1B).

### Fix 1H — Add refund access revocation

File: `src/app/api/stripe/webhook/route.ts` lines 127-155

In the handler for `charge.refunded` or `payment_intent.payment_failed`:
```typescript
// Revoke access on refund
await supabase
  .from('applications')
  .update({ payment_status: 'refunded' })
  .eq('stripe_payment_intent_id', paymentIntentId)
```

Verify the generate/start payment wall check (Fix 1C) treats
'refunded' the same as unpaid.

### Fix 1I — Add tierId allowlist to create-checkout

File: `src/app/api/stripe/create-checkout/route.ts` line ~69

```typescript
const VALID_TIER_IDS = [
  'solo_none', 'solo_spouse', 'solo_family_small', 'solo_family_large',
  'partnership_none', 'partnership_couples', 'partnership_families',
  'simulator_3pack', 'renewal', 'child_surcharge'
]
if (!VALID_TIER_IDS.includes(tierId)) {
  return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
}
```

Also add auth check at top of this route.

**Commit after Group 1:**
```bash
npm run build && npx tsc --noEmit
git add src/app/api/ src/middleware.ts
git commit -m "fix: critical auth — remove playwright bypass, add session auth to 12 unprotected routes, payment wall on generation"
git push origin dev
```

---

## GROUP 2 — HIGH: Logic and Revenue Bugs
**Priority: Fix before any paying user.**

### Fix 2A — Remove SKIP_PAYMENT_WALL from .env.local

Open `.env.local` and remove or comment out:
```
SKIP_PAYMENT_WALL=true
```

Also check middleware.ts for any reference to SKIP_PAYMENT_WALL:
```bash
grep -n "SKIP_PAYMENT_WALL" src/middleware.ts .env.local
```
Remove any bypass logic that reads this variable.
This flag must not exist in any deployed environment.

### Fix 2B — Add admin role enforcement

File: `src/app/admin/layout.tsx` (or wherever admin is gated)

Read the file. Add check for admin role:
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()
if (profile?.role !== 'admin') {
  redirect('/')
}
```

If profiles table has no role column:
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
```
Add this to a new migration file.

### Fix 2C — Remove client-controlled systemPrompt from /api/ai

File: `src/app/api/ai/route.ts` lines 77-94

Read the file. The systemPrompt must come from server-side constants,
not from the request body. Remove systemPrompt from the accepted
request body fields. Replace with a hardcoded or environment-based prompt.

### Fix 2D — Remove E2go branding from generated documents

File: `src/lib/generation-engine.ts` lines 521-525, 578

Find the LEGAL_DISCLAIMERS or branding injection.
Find: any string containing "E2go", "e2go", "e2go.app", "prepared using"
Remove it from the document generation prompts.
Documents submitted to consulates must have zero platform attribution.

Verify:
```bash
grep -n "E2go\|e2go\|prepared using\|powered by" \
  src/lib/generation-engine.ts
```
Must return zero results after fix.

### Fix 2E — Fix quiz scoring for attorney flags

Files: `src/app/quiz/page.tsx` lines 151-164,
       `public/data/module0_questions.json` lines 428-452

Read both files fully.

Decision from QUIZ_IMPROVEMENT_MASTER.md: flat deductions.
attorney_flag = -10 points each.
risk_flag = -5 points each.

In the SCORE_WEIGHTS.deductions map in module0_questions.json,
set every attorney flag to -10 and every risk flag to -5.

Also add W-SILENT-PARTNER to the deductions map at -10.

In quiz/page.tsx scoring logic:
Add rule: if attorney_flags.length > 0, cap score at 89.
Add rule: if attorney_flags.length > 2, cap score at 74.

### Fix 2F — Fix email outcome string mismatch

File: `src/app/api/email/results/route.ts` line ~36

Change:
```typescript
if (outcome === 'qualified' || outcome === 'qualified_with_risks')
```
To:
```typescript
if (outcome === 'PROCEED' || outcome === 'PROCEED_RISK')
```

Check all outcome strings against what quiz/page.tsx actually
produces (PROCEED, PROCEED_RISK, ATTORNEY_RECOMMENDED, DO_NOT_PROCEED).

### Fix 2G — Add solo_family_large to pricing-tier.ts

File: `src/lib/pricing-tier.ts` lines 1-7

Read the file. Add solo_family_large tier:
```typescript
'solo_family_large': {
  price: 797,
  stripe_price_id: process.env.STRIPE_PRICE_SOLO_FAMILY_LARGE!,
  label: 'Solo + Family (3–5 kids)',
}
```
This is a $47 revenue loss per affected customer without this fix.

### Fix 2H — Fix Remember Me session extension

File: `src/app/login/page.tsx` lines 37-48

Read the file. The current implementation calls setSession() which
does not extend expiry.

Fix: pass options to signInWithPassword:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: rememberMe ? {
    // Supabase session persists via PKCE — ensure
    // supabase.auth.persistSession = true in client config
  } : {}
})
// After login, if rememberMe:
if (rememberMe && data.session) {
  await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
}
```

Check src/lib/supabase/client.ts — confirm persistSession: true
is set in the Supabase client configuration.

**Commit after Group 2:**
```bash
npm run build && npx tsc --noEmit
git add src/ public/data/
git commit -m "fix: high severity — admin role, E2go doc branding, scoring caps, pricing tier, email outcomes, remember me"
git push origin dev
```

---

## GROUP 3 — MEDIUM: Input Validation and Data Integrity

### Fix 3A — Add prompt sanitization to ai.ts and document-extraction-engine.ts

Files:
- `src/app/api/ai/route.ts` line ~37
- `src/lib/document-extraction-engine.ts` line ~170

Read src/lib/prompt-sanitizer.ts to understand the existing sanitizer.
Apply sanitizeForPrompt() and wrapUserContent() to all user input
before it reaches the AI call in both files.

### Fix 3B — Fix AI detection to block flagged documents

File: `src/lib/generation-engine.ts` lines 828-876, 1293-1300

Currently: AI detection fires but flagged documents proceed silently.
Fix: After detection, if score > 0.35 and attempts < 3, retry
humanization. After 3 attempts, pause the job and flag for review
rather than silently continuing.

```typescript
if (aiScore > AI_DETECTION_THRESHOLD) {
  if (attemptCount < 3) {
    // retry humanization (already exists)
  } else {
    // flag the job, do not proceed
    await updateJob(jobId, {
      status: 'flagged',
      flag_reason: `AI detection score ${aiScore} after 3 attempts`
    })
    return // stop pipeline
  }
}
```

### Fix 3C — Fix child surcharge bypass

File: `src/app/api/stripe/create-checkout/route.ts` lines 107-117

Read the surcharge logic. Validate children_count server-side
against the application record in Supabase — do not trust the
client-supplied value:
```typescript
const { data: app } = await supabase
  .from('applications')
  .select('family_composition')
  .eq('id', applicationId)
  .single()
// Derive children count from DB, not from request body
const childrenCount = deriveChildCount(app?.family_composition)
```

### Fix 3D — Add error message sanitization to 6 routes

Files flagged: test/route.ts:29-31, email/results/route.ts:30,
health/route.ts:29-31, documents/route.ts:129,
documents/extract/route.ts:305, email/schedule/route.ts:51

In each: replace `error.message` / `error.code` / `error.hint`
in response bodies with a generic message:
```typescript
// Instead of:
return NextResponse.json({ error: error.message }, { status: 500 })
// Use:
console.error('[route-name]', error)
return NextResponse.json(
  { error: 'An error occurred. Please try again.' },
  { status: 500 }
)
```

### Fix 3E — Add ownership check to documents/extract

File: `src/app/api/documents/extract/route.ts` lines 68-75

After the service role fetch, verify ownership:
```typescript
if (document.application.user_id !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

### Fix 3F — Create migration for profiles first_name/last_name

Create: `supabase/migrations/[timestamp]_profiles_name_columns.sql`
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;
```
Run: `npx supabase db push`

### Fix 3G — Add UPDATE policy to quiz_sessions

Find the quiz_sessions RLS migration. Add:
```sql
CREATE POLICY "Users can update own quiz sessions"
  ON quiz_sessions FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);
```
Run: `npx supabase db push`

### Fix 3H — Fix email_log RLS policies

Find the email_log migration. Change:
```sql
-- Remove:
WITH CHECK (true)
-- Replace with:
WITH CHECK (auth.uid() = user_id)
```

### Fix 3I — Fix orphaned Q0-09a and Q0-09b

File: `public/data/module0_questions.json`

Read Q0-09a and Q0-09b show_if conditions.
Check what Q0-09 option text actually says.
Update show_if to match the actual option text that exists in Q0-09.

### Fix 3J — Fix dead email button on results page

File: `src/app/results/page.tsx` line ~634

Find the "Email this result" button with no onClick handler.
Add the onClick that calls the email results API:
```typescript
onClick={async () => {
  setEmailLoading(true)
  try {
    await fetch('/api/email/results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome, score })
    })
    setEmailSent(true)
  } catch (e) {
    setEmailError(true)
  } finally {
    setEmailLoading(false)
  }
}}
```

### Fix 3K — Remove debug-env and test routes

Files:
- `src/app/api/debug-env/route.ts`
- `src/app/api/test/route.ts`

Delete both files. These expose operational information.
Check nothing in the codebase imports from them:
```bash
grep -r "debug-env\|api/test" src/ --include="*.ts" --include="*.tsx"
```
Must return zero results after deletion.

### Fix 3L — Fix CASL consent (stop hardcoding true)

File: `src/app/quiz/page.tsx` lines 460-461

Read the current CASL consent implementation.
The consent must reflect what the user actually selected.
Find the CASL opt-in question in the quiz flow.
Wire its answer to the casl_consent field — do not hardcode true.

If no CASL opt-in UI exists in the quiz, add a checkbox at the
email capture step (Q0-21) before completion:
```
□ I agree to receive educational updates about the E-2 visa
  from E2go. (Optional — you can unsubscribe any time.)
```

**Commit after Group 3:**
```bash
npm run build && npx tsc --noEmit
git add src/ supabase/
git commit -m "fix: medium severity — prompt sanitization, AI detection gate, error messages, ownership checks, migrations, CASL"
git push origin dev
```

---

## GROUP 4 — LOW: Cleanup and Configuration

### Fix 4A — Fix .env.local duplicate Stripe Price IDs

Open `.env.local`. Lines 21-30 and 44-53 both define STRIPE_PRICE_*
vars with different values. Remove the first block (lines 21-30)
and keep only the confirmed current Price IDs (lines 44-53).

Confirm correct values from CLAUDE_CONTEXT.md:
```
STRIPE_PRICE_SOLO_NONE=price_1TgewyF7Ggk3LUEyIkxlp1ry
STRIPE_PRICE_SOLO_SPOUSE=price_1TgewyF7Ggk3LUEybTTTUG95
... (all 10 from CLAUDE_CONTEXT.md)
```

### Fix 4B — Add missing env vars to .env.local

Check which of these are missing:
- ANTHROPIC_API_KEY
- RESEND_API_KEY
- ADMIN_EMAIL

If missing, add placeholders with comments:
```
ANTHROPIC_API_KEY=sk-ant-... # Required for document generation
RESEND_API_KEY=re_... # Required for email sending
ADMIN_EMAIL=romy@e2go.app # Required for franchise referral notifications
```

### Fix 4C — Sync .env.example with .env.local

Read .env.local. For every key present, add it to .env.example
with a placeholder value and comment explaining what it is.
.env.example should never have real values — placeholders only.

### Fix 4D — Add RLS to processed_webhook_events

Find the webhook events migration. Add:
```sql
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only"
  ON processed_webhook_events
  USING (false); -- Only accessible via service role key
```

### Fix 4E — Add lifecycle tracking for missing events

Find where quiz_completed and generation_triggered should fire.
In quiz/page.tsx on completion: insert quiz_completed lifecycle event.
In generate/start/route.ts on job creation: insert generation_triggered.

Pattern:
```typescript
await supabase.from('application_lifecycle').insert({
  application_id: applicationId,
  event: 'quiz_completed', // or 'generation_triggered'
  user_id: user.id,
  created_at: new Date().toISOString()
})
```

### Fix 4F — Remove NEXT_PUBLIC_ prefix concern on Stripe

File: `src/app/pricing/PricingClient.tsx` line ~73

Read the file. Check if NEXT_PUBLIC_STRIPE_SECRET_KEY is referenced.
If present: remove it. The secret key must NEVER have NEXT_PUBLIC_ prefix.
Only NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (the public key) should be
exposed to client code.

**Commit after Group 4:**
```bash
npm run build && npx tsc --noEmit
git add src/ supabase/ .env.example
git commit -m "fix: low severity — env cleanup, RLS on webhook events, lifecycle tracking, Stripe key prefix"
git push origin dev
```

---

## GROUP 5 — ACCESSIBILITY: WCAG Baseline

### Fix 5A — Add labels to 15 form inputs

Find inputs without labels:
```bash
grep -rn "<input\|<textarea\|<select" \
  src/components/ src/app/ --include="*.tsx" | \
  grep -v "aria-label\|htmlFor\|id=" | head -20
```

For each: either add a visible `<label htmlFor="inputId">` or
add `aria-label="Description"` to the input itself.

### Fix 5B — Fix 8 clickable divs without keyboard access

```bash
grep -rn "onClick" src/ --include="*.tsx" | \
  grep "<div\|<span" | head -10
```

For each: change `<div onClick={...}>` to `<button onClick={...}>`
or add `role="button" tabIndex={0} onKeyDown={handleKeyDown}`.

### Fix 5C — Restore focus indicators

```bash
grep -rn "outline-none\|outline: none\|outlineStyle: 'none'" \
  src/ --include="*.tsx" --include="*.css" | head -10
```

For each: replace with a visible focus style using the gold accent:
```css
/* Instead of outline: none */
outline: 2px solid #C9A84C;
outline-offset: 2px;
```
In Tailwind: replace `focus:outline-none` with
`focus:ring-2 focus:ring-[#C9A84C] focus:ring-offset-2`

### Fix 5D — Fix cookie banner (add Reject button)

File: wherever CookieBanner.tsx lives.

Add a "Reject non-essential" button alongside the "Accept" button.
When clicked: set consent to false, set cookie `cookie_consent=false`,
do not load any analytics or tracking scripts.

**Commit after Group 5:**
```bash
npm run build && npx tsc --noEmit
git add src/
git commit -m "fix: accessibility — form labels, keyboard access, focus indicators, cookie consent reject"
git push origin dev
```

---

## GROUP 6 — GENERATION ENGINE ISSUES

### Fix 6A — Approval gate: add 5-minute warning before auto-approve

File: `src/lib/generation-engine.ts` lines 935-963

Before the 5-minute auto-approve fires, emit an SSE event warning:
```typescript
// At 4 minutes (240 seconds), emit warning
if (elapsedSeconds >= 240 && !warningSent) {
  emit({ type: 'approval_warning',
         message: 'Auto-approving in 60 seconds if no response' })
  warningSent = true
}
// At 5 minutes, auto-approve with logged reason
if (elapsedSeconds >= 300) {
  await approveDocument(jobId, 'auto_timeout')
  break
}
```

### Fix 6B — Batch setState calls in generate page

File: `src/app/generate/[applicationId]/page.tsx` lines 123-168

Wrap multiple setState calls in a single update using a reducer
or batch update to prevent the 11-calls-per-SSE-tick issue:
```typescript
// Instead of:
setDocuments(...)
setCurrentStep(...)
setProgress(...)
// Use:
setGenerationState(prev => ({
  ...prev,
  documents: ...,
  currentStep: ...,
  progress: ...
}))
```

### Fix 6C — Fix empty quality step span

File: `src/app/generate/[applicationId]/page.tsx` lines 591-606

Add a condition to not render the empty span:
```typescript
{currentQualityStep > 0 && (
  <span className="quality-step-indicator">...</span>
)}
```

**Commit after Group 6:**
```bash
npm run build && npx tsc --noEmit
git add src/lib/generation-engine.ts \
  src/app/generate/
git commit -m "fix: generation engine — approval gate warning, setState batching, empty quality step"
git push origin dev
```

---

## END OF SESSION

### Final verification:
```bash
npm run build
npx tsc --noEmit

# Smoke test public routes:
for route in "/" "/quiz" "/results" "/pricing" "/login" \
  "/signup" "/about" "/privacy" "/terms"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:3000$route")
  echo "$route: $STATUS"
done

# Verify auth bypass is gone:
curl -s -o /dev/null -w "%{http_code}" \
  -H "x-playwright-test: true" \
  http://localhost:3000/apply
# Must return 302 or 401, NOT 200

# Verify payment wall:
curl -s -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:3000/api/generate/start \
  -H "Content-Type: application/json" \
  -d '{"applicationId":"fake-id"}'
# Must return 401, NOT 200 or 500

# Verify E2go branding gone from generation:
grep -n "E2go\|e2go\|prepared using" \
  src/lib/generation-engine.ts
# Must return zero results
```

### Update docs:
```bash
# Update BUILD_TRACKER.md:
# - Add session entry with all fixes
# - Mark each finding as resolved
# - Update Known Issues (clear fixed ones)

# Update CLAUDE_CONTEXT.md:
# - Update known issues section
# - Note: SKIP_PAYMENT_WALL removed from .env.local

git add BUILD_TRACKER.md CLAUDE_CONTEXT.md
git commit -m "docs: security session complete — all critical and high findings resolved"
git push origin dev
```

### Report format:
```
Security fixes complete.

Group 1 (Critical auth): [N] routes fixed
Group 2 (High logic): [N] issues fixed
Group 3 (Medium): [N] issues fixed
Group 4 (Low cleanup): [N] issues fixed
Group 5 (Accessibility): [N] issues fixed
Group 6 (Generation): [N] issues fixed

Critical findings remaining: 0
High findings remaining: 0
Build: clean
Commits: [list]

Next: Run OWASP ZAP against staging to verify fixes
```
