# SESSION 12 — Login Transition Flicker + Simulator Gating UX

**Branch:** dev
**Priority:** 🟡 Two small, independent UX fixes — both affect first
impressions (login is universal, simulator nav link is a common
exploration path)
**Agent:** engineering-minimal-change + engineering-frontend-developer
(for Item 2's redesigned messaging) + engineering-code-reviewer
**Read before starting:** Session S23 notes (BUILD_TRACKER — auth image
slider, US-themed images including flag), IDEAS.md 12G (simulator reads
filed package — this is LOCKED, do not change the gating logic itself)

---

## ITEM 1 — LOGIN TRANSITION FLICKER (affects ALL logins)

### Problem
After clicking the login submit button, there's a visible lag/flicker:
the US-themed auth image slider (flag image, per Session S23) is briefly
visible, THEN a loading state appears, before the redirect completes. This
is jarring — feels broken even though login succeeds.

### Investigation
1. Find the login page (`src/app/login/page.tsx` or `LoginClient.tsx`) and
   its submit handler
2. Identify what happens between "submit clicked" and "redirect completes":
   - Is there a loading/spinner state set immediately on submit?
   - Does the AuthImageSlider (Session S23,
     `src/components/auth/AuthImageSlider.tsx`) continue rendering/
     animating during the auth call, only to be abruptly replaced?
   - Is the redirect using `router.push` vs `window.location` — the
     former should be smoother but may show the OLD page (with slider)
     until the new page's data is ready
3. Likely root cause patterns to check:
   - Submit button doesn't immediately show a loading/disabled state —
     so the slider just keeps animating normally while the auth request
     is in flight, THEN a loading state appears only AFTER auth resolves,
     right before redirect — creating the "flag, then loading, then
     redirect" sequence
   - The slider's crossfade animation (1000ms per S23) may be
     mid-transition when the loading state kicks in, creating visual
     conflict

### Fix
On submit:
1. IMMEDIATELY (synchronously, before the auth API call) — show a
   full-panel loading state that REPLACES or OVERLAYS the entire
   left-panel slider + right-panel form, not just a button spinner.
   Use Obsidian Gold styling — gold spinner/loading indicator on
   `#0a0a0a`, consistent with the rest of the app's loading states
   (check `/generate/[applicationId]` or other existing loading screens
   for the established pattern — reuse it, don't invent a new one)
2. This loading state stays visible for the ENTIRE duration: auth call →
   redirect. No gap where the slider reappears.
3. If the auth call FAILS (wrong password etc.) — loading state is
   replaced by the form again WITH the error message, slider can resume
   normally at that point (this is the only case where reverting to the
   slider view is correct)

Apply the same fix to signup if it has the same pattern (check
`src/app/signup/page.tsx`).

### Verify
- Manual test: submit login with correct credentials — confirm smooth,
  single loading state from click to dashboard, no flag flash, no
  flicker
- Manual test: submit login with WRONG credentials — confirm form
  reappears with error, slider resumes normally
- Repeat for signup if applicable

---

## ITEM 2 — SIMULATOR NAV LINK: EXPLAIN THE GATING, DON'T JUST REDIRECT

### Problem
Per IDEAS.md 12G (LOCKED — do not change this underlying logic): the
simulator requires the filed package (Module 3 case file data) to
function — it has nothing to simulate against on a blank account.
Currently, clicking "Simulator" in the nav with no case file redirects to
`/dashboard` with a generic "continue your application" prompt — with NO
indication that this is WHY, or that the simulator is a real, built
feature waiting for them.

A new visitor exploring the app via the nav bar experiences this as: "I
clicked Simulator, nothing happened, I'm just on the dashboard again." It
looks broken, not gated.

### Fix — DO NOT change the redirect/gating logic itself (12G is locked).
Change what the user SEES when this gate fires.

Options (agent: pick the one that fits existing patterns best, or propose
a small variant):

**Option A — Dashboard banner with context:**
When `/simulator` redirects to `/dashboard` due to missing case file data,
add a query param (e.g. `?from=simulator`) and show a one-time banner on
the dashboard: "The Interview Simulator uses your case file to ask
realistic questions about YOUR application. Complete your case file first
to unlock it." with a CTA to continue the application. Dismissible.

**Option B — Simulator preview/teaser page:**
`/simulator` itself (when accessed without sufficient case file data)
renders a SHORT teaser explaining what the simulator does (per
INTERVIEW_SIMULATOR_SPEC.md — pressure-tests the filed package, probes
weak points, coaching summary) with a "Complete your case file to unlock
→" CTA — rather than redirecting away from /simulator entirely. This
keeps the user ON the page they clicked into, with an explanation, instead
of bouncing them elsewhere.

RECOMMENDATION: Option B — it directly addresses "I clicked Simulator and
landed somewhere else with no explanation" by keeping them on /simulator
with context. Option A is a smaller change if Option B's routing
adjustment is non-trivial. Report which was chosen and why.

### What "sufficient case file data" means
Check INTERVIEW_SIMULATOR_SPEC.md / 12G for the minimum data threshold
(likely: Module 3 substantially complete, case brief exists). Use the
SAME check the current redirect logic already uses — this fix changes the
PRESENTATION when that check fails, not the check itself.

### Verify
- Test with a blank/no-case-file account (per owner's test account): click
  "Simulator" in nav → confirm the new teaser/banner explains the
  simulator and what's needed to unlock it, with a clear path forward
- Test with an account that HAS sufficient case file data: confirm
  `/simulator` works normally, unaffected by this change
- No change to underlying gating logic — confirm 12G's "simulator reads
  filed package, never re-collects data" principle intact

---

## DO NOT IN THIS SESSION

- Do not change the simulator's data requirements or gating threshold
  (12G locked)
- Do not change simulator functionality itself — text/voice modes,
  evaluation, coaching summary all unchanged
- Do not modify the AuthImageSlider's images/timing/crossfade behavior —
  only how/when it's covered by the loading state

---

## COMPLETION REPORT

```
SESSION 12 — Login transition + simulator gating UX complete.

ITEM 1 — Login transition flicker:
  Root cause identified: [...]
  Fix: [describe loading state implementation]
  Files modified: [list]
  Signup had same issue: [yes/no, fixed if yes]
  Manual test (correct creds): smooth, no flicker: [yes/no]
  Manual test (wrong creds): error shown, slider resumes: [yes/no]

ITEM 2 — Simulator gating UX:
  Option chosen: [A/B/other] — reasoning: [...]
  "Sufficient case file data" check: [confirmed same as existing logic]
  Files modified: [list]
  Test (no case file): teaser/banner shows, explains simulator: [yes/no]
  Test (has case file): /simulator works normally: [yes/no]

Build: clean / errors: [list or none]

OVERALL STATUS: [...]
```
