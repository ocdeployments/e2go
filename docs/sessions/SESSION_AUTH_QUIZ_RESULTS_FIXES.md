# SESSION — Auth, Quiz & Results Fixes
**Date:** June 10, 2026
**Branch:** dev
**Priority:** HIGH — affects every user's first experience
**Estimated time:** 4–5 hours
**Triggered by:** Manual walkthrough revealing 13 issues across
  login, signup, quiz questions, results page logic, and routing

---

## RULES FOR THIS SESSION

1. Read CLAUDE_CONTEXT.md and BUILD_TRACKER.md first.
2. Read docs/DESIGN_REFERENCE.html before touching any UI file.
3. Read public/data/module0_questions.json fully before
   touching any quiz question or scoring logic.
4. Read public/data/module0_scoring_logic.json fully before
   touching scoring or results page.
5. Complete every step in order. Do not skip steps.
6. npm run build must be clean before any commit.
7. Never truncate file output. Complete files only.
8. One commit per logical group of changes.
9. Update BUILD_TRACKER.md at end of session.

---

## PART A — AUTH FIXES (4 changes)

### A1 — Remove magic link. Email + password only.

Find: src/app/login/page.tsx
Read the full file.

Remove the magic link section entirely — the input field,
the "Send magic link" button, and any associated handler.

The login page must have:
- Email input
- Password input
- "Remember me" checkbox (see A2)
- "Forgot password?" link → /forgot-password
- "Sign in" button → calls Supabase signInWithPassword()
- "Don't have an account? Sign up" link → /signup
- No magic link. No passwordless option.

Supabase magic link is disabled — email+password only.

### A2 — Add "Remember me" checkbox to login.

On login form, add a checkbox: "Remember me on this browser"
Default: unchecked.

Behaviour:
- Unchecked: default Supabase session (browser session only)
- Checked: call supabase.auth.signInWithPassword() with
  options: { data: {}, persistSession: true }
  and set the session expiry to 30 days via:
  supabase.auth.setSession() after sign-in if needed,
  OR pass expiresIn to the session. Use whichever Supabase
  v2 supports — check the Supabase JS client docs pattern.

Style: Obsidian Gold checkbox — gold border, gold checkmark,
no rounded corners. DM Sans 300 12px label.

### A3 — Collect first name and last name at signup.

Find: src/app/signup/page.tsx
Read the full file.

Add two fields above the email field:
- First name (required)
- Last name (required)

On signup:
1. Call supabase.auth.signUp() with email + password
2. Immediately after, upsert to the profiles table:
   { id: user.id, first_name, last_name, email }
   Use: supabase.from('profiles').upsert({ ... })

The profiles table already has first_name and last_name columns.
If it does not, add them:
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_name text;

### A4 — Enforce email verification before granting access.

Find: src/middleware.ts
Read the full file.

Currently unverified accounts can access protected routes.
Fix: In the middleware auth check, after getting the session,
also check user.email_confirmed_at.

If user is authenticated but email_confirmed_at is null:
  Redirect to /verify regardless of which protected route
  they're trying to access.

Exception: /verify itself and /api/auth/* routes must not
redirect (would cause infinite loop).

---

## PART B — PERSONALISATION FIXES (3 changes)

### B1 — Show user's name in navbar when logged in.

Find: the Nav component (likely src/components/Nav.tsx or
src/components/layout/Nav.tsx).
Read the full file.

Currently the navbar shows no auth state when logged in.

When user is authenticated:
- Fetch profile from profiles table on mount
- Show "Hi, [first_name]" or just the first name in the
  top-right of the nav
- Add a small dropdown or link: "Dashboard" + "Sign out"
- When not authenticated: show "Log in" and "Sign up" links

Use a client component with useEffect to load auth state.
Do not block rendering — show nothing until state resolves.

### B2 — Personalise the results page with user's name.

Find: src/app/results/page.tsx
Read the full file.

When user is logged in:
- Show "[First name], here are your results" as the heading
  instead of a generic heading
- Show a confirmation message below the score:
  "Your profile has been saved. You can return to these
   results any time from your dashboard."
- The save confirmation must only show when the user is
  logged in AND the quiz session was successfully saved
  to Supabase

When user is not logged in:
- Show generic heading: "Your eligibility results"
- Show: "Create a free account to save these results"
  with a link to /signup

### B3 — Post-login routing based on application state.

Find: src/app/login/page.tsx (after successful sign-in)
Find: src/app/dashboard/page.tsx

After successful login, route based on state:

1. User has no quiz session in Supabase → /quiz
2. User has quiz session but no application record → /results
   (so they can proceed to pricing from there)
3. User has application record, payment not complete → /pricing
4. User has paid, application in progress:
   Read application_lifecycle table for the most recent
   last_visited_section (a column to add — see below)
   Route to /apply/[last_visited_section] if it exists,
   otherwise /apply
5. User has paid, no sections started → /apply

Add column to applications table (if not exists):
  ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS last_visited_section text;

Update this column every time a user navigates to a
case file section — in each section page's useEffect on mount:
  supabase.from('applications').update({
    last_visited_section: 'story' // or 'business' etc.
  }).eq('id', applicationId)

---

## PART C — QUIZ QUESTION FIXES (5 changes)

Read public/data/module0_questions.json fully before making
any changes. All changes are to this file and quiz/page.tsx.

### C1 — Q0-06 Funding sources: simplify options.

Current question asks about funding sources with many options.
Each option must drive a distinct downstream document requirement
in the Source of Funds tab (Tab H). Remove any option that does
not produce a different document requirement.

Simplified options (replace existing Q0-06 options with these):

Question text: "What is the primary source of your investment funds?"
Type: multiselect (user can select multiple)
Options:
  - Personal savings or investments (bank/brokerage accounts)
  - Sale of a property or business
  - Registered accounts (RRSP, TFSA, LIRA, pension)
  - Gift or inheritance
  - Loan (personal, home equity, or third-party)
  - Multiple sources combined

Each option maps to a document requirement in Tab H.
Personal savings → bank statements.
Property/business sale → closing documents + proceeds trail.
Registered accounts → withdrawal statements + tax implications.
Gift/inheritance → gift letter + donor source evidence.
Loan → loan agreement + collateral documentation.
Multiple → all of the above for each source.

Remove any options not in this list from the JSON.
Update scoring_logic references if any old option IDs are used.

### C2 — Q0-08 Franchise sub-question: add "identified, no contact" path.

Current Q0-08 asks about business situation.
One option is: "I have a specific business or franchise identified."

This option needs a sub-question (show_if: Q0-08 = that option):

Sub-question ID: Q0-08c
Question: "Have you made contact with the franchisor or business owner yet?"
Type: single select
Options:
  - Yes — I've been in contact and have information
  - No — I know which one I want but haven't reached out yet
  - This is a business, not a franchise

If answer = "No — I know which one I want but haven't reached out yet":
  Show a follow-up: Q0-08d
  Question: "Would you like us to connect you with this franchisor
             on your behalf?"
  Type: single select
  Options:
    - Yes, please connect me
    - No, I'll reach out myself

If Q0-08d = "Yes, please connect me":
  Set flag: franchise_referral_requested = true
  Save to quiz_sessions: franchise_referral_requested = true
  This triggers the referral notification (see C2-notification below)

C2-notification: When franchise_referral_requested = true,
the system must send an email notification to the admin.
Use Resend to send to the admin email address stored in
environment variable ADMIN_EMAIL (add this to .env.local
with value: romy@e2go.app or whatever the correct address is).

Email subject: "New franchise referral request"
Email body: plain text —
  "A new user has requested a franchise connection.
   Quiz session ID: [session_id]
   Email: [user email if available, otherwise 'anonymous']
   Business/franchise identified: [answer from Q0-08 text field
   if captured, otherwise 'not specified']
   Date: [timestamp]"

Create API route: src/app/api/notifications/franchise-referral/route.ts
Called from results page when franchise_referral_requested = true
in the quiz session data.

### C3 — Q0-09 Immigration history: reframe question.

Current question: "Does any of the following apply to your
immigration history?"
Current options include "No — clean history" as a selectable option.

Replace entirely with:

Question text: "Do you have anything to disclose about your
immigration history?"
Type: single select
Options:
  - No — clean history
  - Yes — I have something to disclose

If "Yes — I have something to disclose":
  Show sub-question Q0-09a (already exists):
  "What applies to your situation?" (multiselect)
  Options (keep existing):
    - Prior visa refusal or denial
    - Prior removal, deportation, or exclusion
    - Overstay of a previous visa or status
    - Criminal conviction or arrest
    - Immigration violation or status issue
    - I am not sure

The scoring logic for Q0-09a options must remain unchanged —
all existing attorney flags and hard stops still fire on
the same sub-options. Only the framing of the parent question
changes.

### C4 — Q0-10 Home ties: reduce to meaningful options.

Current Q0-10 asks "What ties do you maintain in your home country?"
with too many options.

Replace with:

Question text: "What ties will you maintain in your home country?"
Type: multiselect
Options (5 options only):
  - Property I own and plan to keep
  - Close family remaining in Canada (spouse, children, parents)
  - Active financial obligations (business, investments, pension)
  - Professional licence, employment, or ongoing contract
  - None of the above

Scoring mapping (update module0_scoring_logic.json):
  Each confirmed tie above: +5 points (non-immigrant intent positive)
  "None of the above" selected alone: attorney_flag W-NI-NONE
    (no ties to home country is a non-immigrant intent red flag)

Remove all other tie options not in this list.
Update scoring_logic.json references accordingly.

### C5 — Q0-05 COS question: clarify purpose.

Current Q0-05 asks "Where are you applying from?" with options
including "I am inside the US and my status may not be valid."

This question is about Change of Status (COS) vs consular
processing. The current wording is confusing.

Replace Q0-05 options with:

Question text: "Where will you be applying for your E-2 visa?"
Options:
  - From Canada — through a Canadian consulate (most common)
  - From another country — through a local U.S. consulate
  - From inside the United States — Change of Status (COS)
  - I am inside the US but I am not sure of my current status

Option 3 ("Change of Status") gets a tooltip or helper text:
"Change of Status means filing with USCIS while remaining
in the US, rather than attending a consulate interview.
This is a different process with different requirements."

Option 4 triggers attorney_flag immediately with message:
"Your current immigration status in the US needs to be
confirmed before proceeding. We recommend speaking with
an attorney before filing anything."

---

## PART D — RESULTS PAGE FIXES (3 changes)

### D1 — Fix score/flags contradiction.

Find: src/app/results/page.tsx
Find: src/lib/scoring logic or wherever getScore() is computed.

Current bug: A user can score 100/100 AND receive attorney
flags saying their profile has "complexity requiring legal review."
This is contradictory and destroys trust.

Fix the scoring logic:

Each attorney_flag deducts 10 points from the base score.
Each risk_flag deducts 5 points from the base score.
Minimum score is 45 (even with many flags — the user can
still proceed, they just need guidance).

Score → verdict mapping (replace existing):

  90–100: "Strong eligibility profile"
    Sub: "Your answers indicate a straightforward E-2 path.
    Proceed with confidence."
    No complexity warning shown.

  75–89: "Good eligibility profile"
    Sub: "Your profile is solid with one or two areas to
    address during preparation."
    Show risk flags only (not attorney flags at this tier
    unless attorney_flags > 0).

  60–74: "Eligible with preparation needed"
    Sub: "Your profile qualifies but has complexity that
    your documents must address directly."
    Show all flags. Show attorney referral as optional.

  45–59: "Complex case — legal guidance recommended"
    Sub: "Your situation has factors that significantly
    benefit from professional legal review before proceeding."
    Show attorney referral prominently. Still allow proceeding
    with acknowledgment gate.

  Below 45: Should not be reachable if scoring is calibrated
    correctly. If reached, treat as ATTORNEY_RECOMMENDED.

The verdict and the score must always be consistent.
If attorney_flags > 0, the score cannot be 90+.
If attorney_flags > 2, the score cannot be 75+.

### D2 — Fix "Email me this result" button.

The button fires but nothing happens — the Resend email route
is either failing silently or the API key is not configured.

Find: the email results API route (likely
src/app/api/email/results/route.ts or similar).

Step 1: Check if RESEND_API_KEY is in .env.local
  grep "RESEND" .env.local

Step 2: Read the email route fully. Find where it's failing.
  Add proper error logging: console.error(error) at every
  catch block.

Step 3: Test the route directly:
  curl -X POST http://localhost:3000/api/email/results \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","score":85}'

Step 4: Fix whatever is failing. If RESEND_API_KEY is missing,
  add a placeholder and note it in the session report.

The button on the results page must:
- Show a loading state while the request is in flight
- Show "Sent! Check your inbox" on success
- Show "Something went wrong — try again" on failure
- Never silently fail

### D3 — Fix stale localStorage draft contaminating results.

Current bug: If a user selected "I have something to disclose"
in a previous quiz session, that answer is saved in localStorage.
When they start a new quiz session, the old answer pre-loads and
the results page shows incorrect flags.

Fix in src/app/quiz/page.tsx:

On quiz page MOUNT (not on completion — on mount):
  Check if there is a saved draft in localStorage.
  If the draft is older than 24 hours, clear it:
    localStorage.removeItem('quiz_draft')
    localStorage.removeItem('quiz_draft_timestamp')

On quiz COMPLETION:
  Always clear the draft:
    localStorage.removeItem('quiz_draft')
    localStorage.removeItem('quiz_draft_timestamp')

On quiz HARD STOP:
  Always clear the draft.

Also: the draft timestamp must be saved every time the draft
is updated. Format: ISO string Date.now().

---

## PART E — BUILD AND VERIFICATION

### E1 — Build check

npm run build
Must be clean — zero errors.

### E2 — Manual verification checklist

Test each fix in Chrome:

Auth:
  □ Login page has no magic link section
  □ Login page has email + password fields
  □ "Remember me" checkbox present and styled gold
  □ Signup page has first name + last name fields
  □ After signup, profiles table has first_name and last_name

Personalisation:
  □ After login, navbar shows "Hi, [name]"
  □ Results page shows "[Name], here are your results" when logged in
  □ Results page shows "profile saved" confirmation when logged in

Quiz:
  □ Q0-05 shows new COS wording
  □ Q0-06 shows 6 simplified funding options
  □ Q0-08 franchise path shows "Have you made contact?" sub-question
  □ Q0-08 "connect me" path sends admin notification email
  □ Q0-09 shows "Do you have anything to disclose?" framing
  □ Q0-10 shows 5 simplified tie options

Results:
  □ Score 100/100 does NOT show "complexity" warning
  □ Attorney flags reduce the score appropriately
  □ "Email me this result" button shows loading, then success/error
  □ Taking quiz twice does not show stale flags from first session

### E3 — Commit sequence

git add src/app/login/page.tsx src/app/signup/page.tsx
git commit -m "fix: auth — remove magic link, add remember me, collect name at signup"
git push origin dev

git add src/middleware.ts
git commit -m "fix: enforce email verification before granting route access"
git push origin dev

git add src/components/Nav.tsx (or wherever Nav lives)
git commit -m "feat: navbar — show first name and auth state when logged in"
git push origin dev

git add src/app/results/page.tsx src/app/login/page.tsx
git commit -m "feat: personalised results page, post-login routing by application state"
git push origin dev

git add public/data/module0_questions.json
git commit -m "fix: quiz questions — funding simplified, franchise sub-question, history reframed, ties reduced, COS clarified"
git push origin dev

git add src/app/quiz/page.tsx
git commit -m "fix: quiz — stale localStorage draft cleared on mount if >24h, cleared on complete/stop"
git push origin dev

git add src/app/results/page.tsx public/data/module0_scoring_logic.json
git commit -m "fix: results — score/flags consistent, attorney flags reduce score, email button error handling"
git push origin dev

git add src/app/api/notifications/franchise-referral/route.ts
git commit -m "feat: franchise referral notification — admin email via Resend on referral request"
git push origin dev

---

## COMPLETION REPORT

When done, report:

```
Auth/Quiz/Results fixes complete.

Auth:
  - Magic link removed ✓
  - Remember me checkbox added ✓
  - First/last name collected at signup ✓
  - Email verification enforced in middleware ✓

Personalisation:
  - Navbar shows first name when logged in ✓
  - Results page personalised with name ✓
  - Post-login routing by application state ✓

Quiz questions updated:
  - Q0-05: COS wording clarified ✓
  - Q0-06: Funding sources reduced to 6 options ✓
  - Q0-08c/d: Franchise "identified, no contact" sub-question added ✓
  - Q0-09: Immigration history reframed ✓
  - Q0-10: Home ties reduced to 5 options ✓

Results page:
  - Score/flags contradiction fixed ✓
  - Email button error handling fixed ✓
  - Stale localStorage draft fix ✓

Franchise referral notification:
  - API route created ✓
  - Admin email fires on referral request ✓

Build: clean
Commits: [list all]
```

---

## PASTE THIS INTO CLAUDE CODE TO START:

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/DESIGN_REFERENCE.html.
Read public/data/module0_questions.json fully.
Read public/data/module0_scoring_logic.json fully.
Read docs/sessions/SESSION_AUTH_QUIZ_RESULTS_FIXES.md
and execute exactly as written.
Confirm skills active: ui-ux-pro-max, full-output-enforcement.
Report current state before writing any code.
Ask "Ready to confirm and begin?" — do not start until confirmed.
```
