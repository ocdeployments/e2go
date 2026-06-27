# SESSION 10 — Closeout: Remaining Minor Gaps from Sessions 7-9

**Branch:** dev
**Priority:** 🟡 Cleanup before moving to next major task — these are
all SMALL, SPECIFIC items surfaced during Sessions 7-9's reviews. No
new features, no scope expansion. Each item below is independently
small; do them in order, report each.
**Agent:** engineering-minimal-change + engineering-code-reviewer
**No Playwright.** Direct calls, code review, copy review.
**Read before starting:** Session 7 and Session 9 completion reports
(above)

---

## ITEM 1 — Live end-to-end test of Layer 1's framing call (Session 7 gap)

Session 7's Fixture matrix was a DRY RUN — `generateFramingDecisions()`
(Step 3's real OpenRouter call) was never actually executed, so
`transferable_skills_identified` was ABSENT on all 5 fixtures by
construction, not by genuine absence of connections.

### Fix

Run Step 3's REAL call (OpenRouter, cheap) for:
- Fixture 3 (warehouse supervisor → cleaning franchise) — Layer 1
  SHOULD find scheduling/logistics/team-management connections
- Fixture 5 (recent grad, no relevant background → IT services) —
  confirm Layer 1 genuinely returns `[]` or thin output (not an error
  masquerading as empty)

For each: report the actual `framing_decisions.experience` JSON
returned, confirm it's well-formed per Step 3's schema
(`operational_demand`, `applicant_evidence`, `connection`,
`framing_instruction`), and confirm `transferable_skills_identified`
now scores correctly (CONFIRMED/PARTIAL/INFERRED for Fixture 3 if
connections found, ABSENT for Fixture 5 if genuinely none).

If Fixture 3's call returns `[]` (no connections found despite obvious
warehouse→cleaning logistics overlap) — THIS IS A BUG in Step 3's
prompt/call, not an acceptable result. Investigate and fix the prompt
construction or the call itself.

---

## ITEM 2 — Read Section 5.5's actual copy against the denial-language rule

Session 9 added "Areas Officers May Ask About" (Section 5.5,
WATCH/FLAG/CRITICAL D-code awareness) — not in the original spec, and
self-reported as "CONFIRMED CLEAN" against the zero-denial-language rule,
but not independently read.

### Fix

`view` the actual rendered copy for Section 5.5 in
`src/components/PackageSummary.tsx` — every string the user would see
for WATCH/FLAG/CRITICAL states. Check specifically for:
- Any phrase implying probability/likelihood of denial/approval
  ("likely", "risk of denial", "could be denied", percentages)
- Any phrase that reads as a prediction rather than "an area an officer
  may focus on"
- Confirm tone matches Section 3/4's "may" framing per Step 3's
  original finding

If ANY language crosses the line — rewrite using the SAME "may"/
"officers sometimes ask about"/constructive framing already confirmed
clean in sections 3-4. Do not remove Section 5.5 entirely unless the
owner asks — it's useful content, just needs the same tone discipline.

Quote the BEFORE and AFTER text for any changes made.

---

## ITEM 3 — Chen's franchise_training_offset (Session 7 flag)

Session 7 noted: `franchise_training_offset` correctly requires
CONFIRMED (not PARTIAL) per spec, so Chen's WEAK experience_match did
NOT get the offset. This is "correct per spec" but flagged as
potentially making Chen's score look weaker than warranted.

### Fix (verification, likely no code change)

1. Check Chen's actual Tab K / quiz data — does it state a CONFIRMED
   franchise training program (Kumon FDD Item 11 training), or only
   PARTIAL/implied?
2. If CONFIRMED exists in Chen's data but the dimension scorer isn't
   picking it up — THIS IS A BUG, fix the scorer's data lookup.
3. If Chen's data genuinely only shows PARTIAL/implied franchise
   training (not explicitly confirmed) — this is CORRECT behavior per
   spec, no fix needed. Confirm Chen's Session 9 package summary
   (`/documents/9f981747-e3e4-4941-9f86-9871f8117b66`) doesn't
   misleadingly suggest his package is weak overall because of this one
   dimension — his overall_strength should still reflect his STRONG
   substantiality/intent/marginality scores appropriately.
4. Report which case applies. Do NOT lower the CONFIRMED threshold to
   PARTIAL globally (Session 7 explicitly scoped this as future work,
   not this session) unless Chen's actual data shows a clear bug.

---

## ITEM 4 — Scan for any other "TODO"/stub/placeholder left by Sessions 4-9

Quick grep sweep — these sessions touched many new files. Confirm
nothing was left half-done:

```bash
grep -rn "TODO\|FIXME\|not implemented\|placeholder\|stub" \
  src/lib/business-operational-needs.ts \
  src/lib/analysis-engine.ts \
  src/lib/docx-cover-builder.ts \
  src/lib/docx-toc-builder.ts \
  src/lib/docx-divider-builder.ts \
  src/lib/docx-package-constants.ts \
  src/components/PackageSummary.tsx \
  src/app/api/generate/case-brief/[applicationId]/route.ts \
  src/app/api/generate/download/[applicationId]/route.ts \
  2>/dev/null
```

For each hit — assess: genuinely future-scoped work (note in
BUILD_TRACKER, leave as-is) vs. accidentally-left incomplete code that
affects Sessions 4-9's actual deliverables (fix now, small only).

---

## ITEM 5 — BUILD_TRACKER.md update

Update BUILD_TRACKER.md to reflect Sessions 4, 6, 7, 8, 9's completed
work (it currently only reflects through Session 3/Group 15 per the
last full update). Add to the relevant tables/sections:

- Package assembly (cover page, TOC, dividers, 15-file ZIP) — ✅ COMPLETE
- Cover page data source fix — ✅ COMPLETE
- Three-layer experience/framing pipeline — ✅ COMPLETE (with Item 1's
  live-test result noted)
- Post-generation package summary (`/documents/[appId]` permanent
  section) — ✅ COMPLETE
- Update "Next Session Priorities" — remove completed items, add
  whatever remains from Items 1-4 above (if anything became a genuine
  follow-up rather than fixable now)
- Update Known Issues table similarly

---

## ITEM 6 — FINAL COMMIT AND PUSH

Once Items 1-5 are done:
1. `npm run build` — clean
2. Commit all changes from this session (group logically — e.g. one
   commit for code fixes from Items 1-4, one for BUILD_TRACKER from
   Item 5)
3. `git push`
4. `git status` — confirm clean working tree, branch up to date with
   origin/dev

---

## COMPLETION REPORT

```
SESSION 10 — Closeout complete.

ITEM 1 — Live framing call test:
  Fixture 3 (warehouse→cleaning): framing_decisions.experience = [...]
    transferable_skills_identified now scores: [...]
  Fixture 5 (recent grad→IT): framing_decisions.experience = [...]
    transferable_skills_identified now scores: [...]
  Bug found/fixed: [none / describe]

ITEM 2 — Section 5.5 copy review:
  Issues found: [none / list with before/after quotes]
  Changes made: [none / describe]

ITEM 3 — Chen's franchise_training_offset:
  Chen's actual data: [CONFIRMED / PARTIAL / implied]
  Bug or correct-per-spec: [...]
  Chen's overall package summary still appropriate: [yes/no]

ITEM 4 — TODO/stub sweep:
  Hits found: [none / list]
  Fixed now: [list]
  Deferred to BUILD_TRACKER: [list]

ITEM 5 — BUILD_TRACKER.md updated: [yes — sections updated: list]

ITEM 6 — Final commit/push:
  Commits: [list with hashes]
  Build: clean
  git status: clean, up to date with origin/dev

OVERALL: All Session 7-9 known gaps closed. Ready for next major task.
```
