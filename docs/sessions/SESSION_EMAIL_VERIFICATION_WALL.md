# SESSION — Email Verification Wall on Results + Name Capture
**Date:** June 11, 2026
**Branch:** dev
**Agents:** engineering-frontend-developer, engineering-minimal-change,
            engineering-code-reviewer
**Estimated time:** 2–3 hours

---

## WHAT THIS SESSION DOES

1. Quiz completion no longer shows results directly to anonymous users.
   It asks for email, sends a verification link, and shows
   "Check your email" — no results visible yet.

2. Clicking the verification link unlocks the results page for that
   quiz session. Results render fully.

3. On first verified visit, results page asks for first/last name
   (NOT email — email is already verified). Submitting this creates
   the Supabase auth account using the verified email + name.

4. On subsequent visits (session/cookie present), results page shows
   results directly — no email, no name prompt.

5. Bundled small fix: Q0-08b helper text — franchise broker no-cost
   clarification.

---

## CONSTRAINTS

- No Playwright. No screenshots.
- Verify with: curl, npm run build, Supabase query, open for visual check
- engineering-minimal-change: reuse existing infrastructure —
  email_verifications table, /verify page, /api/email/results route
  already exist from a prior session. Extend, don't rebuild.
- One commit per group.

---

## READ FIRST

```
cat CLAUDE_CONTEXT.md
cat BUILD_TRACKER.md
cat src/app/quiz/page.tsx
cat src/app/results/page.tsx
cat src/app/verify/page.tsx
cat src/app/api/email/results/route.ts
npx supabase db query "
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'email_verifications'
  ORDER BY column_name
"
```

Report what currently exists in each file before changing anything.
Specifically confirm:
- What email_verifications table currently stores (token, quiz_session_id, etc.)
- What /verify currently does when a valid token is clicked
- Whether results page currently checks for any verification state

---

## GROUP 1 — Quiz completion: replace direct results with email gate

**File:** src/app/quiz/page.tsx

Find the quiz completion handler (the function that currently saves
the quiz_session and routes to /results).

**For anonymous users (no Supabase session):**

After saving the quiz_session with the result_json:

1. Show a screen — NOT the results page — with:
   - Heading: "Your results are ready"
   - Body: "Enter your email and we'll send you a link to view them."
   - Email input field
   - Button: "Send my results"

2. On submit:
   - Call /api/email/results with email, quiz_session_id, result_json
     (the route already exists — confirm it generates a token and
     stores it in email_verifications linked to quiz_session_id)
   - Show confirmation: "Check your email — click the link to view
     your results."
   - Do NOT route to /results yet.

**For authenticated users (Supabase session exists):**

Skip the email gate entirely. Route directly to /results as before —
they're already verified by virtue of being logged in.

---

## GROUP 2 — Verification link unlocks results

**File:** src/app/verify/page.tsx

Read the current implementation. It currently validates a token —
confirm what it does after validation (the prior session notes say
"forced signup" — read exactly what this means in the current code).

**New behaviour when token is valid:**

1. Mark the email_verifications row as verified (set verified_at timestamp)
2. Store a marker (cookie or localStorage) indicating this
   quiz_session_id is verified — e.g., a signed cookie
   `verified_session=<quiz_session_id>` or similar
3. Redirect to `/results?session=<quiz_session_id>`

Do NOT force signup at this step — that happens on the results page
via name capture (Group 3), which is gentler and happens at the
moment the user actually sees value (their results).

If the token is invalid or expired:
   Show: "This link has expired. [Resend results] button" which
   re-triggers /api/email/results for the same quiz_session_id.

---

## GROUP 3 — Results page: verification check + name capture

**File:** src/app/results/page.tsx

### 3A — Verification check on load

On page load, for anonymous users:

```typescript
// Check for verified session marker
const verifiedSession = getCookie('verified_session') // or however stored
const quizSessionId = searchParams.get('session') || verifiedSession

if (!quizSessionId) {
  // No verification — show locked state
  // "Enter your email to view your results" — same as quiz completion gate
  // (handles direct navigation to /results without going through quiz)
}
```

For authenticated users: skip this check entirely, load results as normal.

### 3B — Name capture (first verified visit only)

After verification confirmed, check if this email already has an
account (query profiles by email, or attempt via Supabase).

If NO account exists for this email:

Show results AND, above or alongside the results content, a
lightweight card:

```
Heading: "One last thing"
Body: "What's your name? We'll use this for your application documents."
[First name] [Last name]
Button: "Continue"
```

On submit:
- Create Supabase auth user with the verified email
  (use Supabase admin/service client — email is pre-verified,
  so set email_confirm: true at creation)
- Upsert first_name, last_name to profiles
- Link the quiz_session_id to this new user_id
- Set a password reset / magic link so the user can set a password
  later, OR show a "Set a password" field as part of this same form
  (simpler — one less email)

Decision: include a password field in this same "one last thing"
form, so account creation is complete in one step:
```
[First name] [Last name]
[Password] [Confirm password]
Button: "Continue"
```

After successful creation: user is logged in, results remain visible,
quiz_session_id is now linked to their account.

If an account ALREADY exists for this email (returning user who
verified a new quiz session while having an old account):
   Show: "We found an account with this email. [Log in] to link
   this result to your account, or continue viewing as guest."
   Results remain visible either way.

### 3C — Subsequent visits

If a valid Supabase session exists (user is logged in):
   Show results directly. No email gate. No name capture.

---

## GROUP 4 — Q0-08b helper text fix

**File:** public/data/module0_questions.json

Find Q0-08b. Change helper_text from:
"Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range. Introductions made only with your consent."

To:
"Based on your profile, we can connect you with E-2 specialist franchise brokers in your investment range — free to you, as brokers are paid by the franchisor, not by you."

---

## VERIFICATION

```bash
npm run build
npx tsc --noEmit

# Quiz page renders:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/quiz
# Must return 200

# Verify page renders:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/verify
# Must return 200

# Results page without verification — should show gate, not results:
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/results
# Must return 200 (renders gate, not error)

# Check email_verifications has verified_at column:
npx supabase db query "
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'email_verifications'
  ORDER BY column_name
"

# Confirm Q0-08b helper text updated:
grep -A1 '"id": "Q0-08b"' public/data/module0_questions.json | grep helper_text
```

Owner visual checks:
  □ Complete quiz anonymously → see "enter email" screen, NOT results
  □ Submit email → see "check your email" confirmation
  □ Click verification link (check email/Resend logs) → results unlock
  □ "One last thing" name+password form appears on first verified visit
  □ Submit name+password → account created, results remain visible
  □ Navigate to /results directly (no session) → see email gate, not results
  □ Logged-in user → results show directly, no gate, no name prompt
  □ Q0-08b helper text shows the no-cost franchise broker clarification

---

## COMMIT

```bash
git add src/app/quiz/ src/app/results/ src/app/verify/ \
  src/app/api/email/ public/data/module0_questions.json
git commit -m "feat: email verification wall on results + name capture for account creation; fix Q0-08b helper text"
git push origin dev
```

---

## REPORT FORMAT

```
Email verification wall complete.

Group 1 — Quiz completion email gate: DONE
Group 2 — Verification link unlocks results: DONE
Group 3 — Name capture creates account: DONE
Group 4 — Q0-08b helper text: DONE

Existing infrastructure reused:
  - email_verifications table: [confirmed/extended]
  - /verify page: [confirmed/extended]
  - /api/email/results route: [confirmed/extended]

Build: clean
Commit: [hash]
```
