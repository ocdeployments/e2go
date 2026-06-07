# e2go.app — Generation Engine Fix Sessions
## Six fixes before Opus 4.8 upgrade
**Created:** June 7, 2026
**Run in this order. Fixes 5 and 4 can run in parallel first.**

---

## PARALLEL ROUND 1 — Run Fix 5 and Fix 4 simultaneously

---

## FIX 5 — localStorage userId Bug (Agent 1)
**Priority:** FIRST — blocking every test
**Files:** src/app/generate/[applicationId]/page.tsx only
**Time:** 30 minutes

```
Start session. Read CLAUDE_CONTEXT.md only.
Permission granted: src/app/generate/[applicationId]/page.tsx only.
No Magic MCP. No other files.

The generate page has a critical bug. It reads userId from
localStorage.getItem('supabase_user') which never exists.
This causes generation to silently fail with "Not authenticated"
on every page load.

Find this block in src/app/generate/[applicationId]/page.tsx:
  const stored = localStorage.getItem("supabase_user");
  const userId = stored ? JSON.parse(stored).id : null;
  if (!userId) {
    setErrorMessage("Not authenticated");
    return;
  }

Replace it with:
  const supabase = createBrowserSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null
  if (!userId) {
    setErrorMessage("Please log in to continue")
    return
  }

Check how other pages in src/app/ import createBrowserSupabaseClient
and use the same import pattern.

Also find and remove any other references to
localStorage.getItem('supabase_user') in this file.

Run npm run build — must be clean.
Commit: "fix: generate page reads userId from Supabase session not localStorage"
git push origin dev
Report what was changed.
```

---

## FIX 4 — Clean Duplicate Document Rows (Agent 2)
**Priority:** FIRST — run in parallel with Fix 5
**Files:** No source files — Supabase SQL only + one script
**Time:** 20 minutes

```
Start session. Read CLAUDE_CONTEXT.md only.
Permission granted: scripts/cleanup-test-data.ts only.
No Magic MCP.

The generated_documents table has 20+ duplicate rows from
failed generation attempts. The document review page shows
all of them. We need to clean up all test data and ensure
only one set of documents per application per job.

STEP 1 — Run this SQL in Supabase SQL Editor to clean up:

-- Delete all generated documents for the test application
DELETE FROM generated_documents
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66';

-- Delete all generation jobs for the test application
-- except the most recent queued one
DELETE FROM document_generation_jobs
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66'
AND status != 'queued';

-- Reset the remaining job to a clean state
UPDATE document_generation_jobs
SET status = 'queued',
    current_step = 0,
    current_step_label = 'Initializing',
    error_message = null,
    started_at = null,
    completed_at = null
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66';

-- Verify clean state
SELECT id, status, current_step FROM document_generation_jobs
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66';

SELECT COUNT(*) FROM generated_documents
WHERE application_id = '9f981747-e3e4-4941-9f86-9871f8117b66';

STEP 2 — Add a unique constraint to prevent future duplicates:

Run in Supabase SQL Editor:
CREATE UNIQUE INDEX IF NOT EXISTS 
  idx_generated_documents_job_type
  ON generated_documents(job_id, document_type);

This prevents two rows with the same job_id and document_type
from being inserted — eliminates the duplicate problem at the
database level.

STEP 3 — Create scripts/cleanup-test-data.ts
A reusable script that resets the test application to a clean
state for repeated UAT runs:

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TEST_APP_ID = '9f981747-e3e4-4941-9f86-9871f8117b66'

async function cleanup() {
  console.log('Cleaning up test application data...')

  await supabase.from('generated_documents')
    .delete().eq('application_id', TEST_APP_ID)
  console.log('✓ Generated documents deleted')

  await supabase.from('document_generation_jobs')
    .delete()
    .eq('application_id', TEST_APP_ID)
    .neq('status', 'queued')
  console.log('✓ Failed/completed jobs deleted')

  await supabase.from('document_generation_jobs')
    .update({
      status: 'queued',
      current_step: 0,
      current_step_label: 'Initializing',
      error_message: null,
      started_at: null,
      completed_at: null
    })
    .eq('application_id', TEST_APP_ID)
  console.log('✓ Job reset to queued state')

  console.log('Done. Ready for next UAT run.')
}

cleanup().catch(console.error)

Add to .gitignore: scripts/cleanup-test-data.ts

Run npm run build — confirm clean.
Report: confirm documents deleted, unique index created,
cleanup script working.
```

---

## SEQUENTIAL ROUND 2 — Run Fix 3 after Round 1 completes

---

## FIX 3 — Investment Data Mapping (Agent 1 after Fix 5)
**Priority:** SECOND — data must be correct before generating again
**Files:** src/lib/generation-engine.ts, prompts/v1/documents/*.md
**Time:** 1 hour

```
Start session. Read CLAUDE_CONTEXT.md only.
Read src/lib/generation-engine.ts fully.
Read prompts/v1/documents/cover_letter.md.
Permission granted: src/lib/generation-engine.ts and
prompts/v1/documents/*.md only.
No Magic MCP.

PROBLEM:
The cover letter generated for Michael Chen contained this error:
"The investment allocation includes franchise fee ($45,000)"
The actual franchise fee from the test data is $1,000.
The engine is hallucinating investment figures instead of
reading them from the actual answers.

STEP 1 — Audit the data flow:

Read src/lib/generation-engine.ts completely.
Find exactly how Module 3 answers are passed into the prompts.
Specifically find:
  - How QF-02 (total investment amount) is read
  - How investment breakdown data is passed
  - How the case_brief_json is structured and passed
  - What context variables are available in the prompts

List every variable that is passed into the cover letter prompt.
Report before changing anything.

STEP 2 — Fix the investment breakdown passing:

The investment breakdown from the test applicant JSON is:
  franchise_fee: $1,000
  leasehold_improvements: $48,000
  equipment_technology: $22,000
  educational_materials: $18,000
  working_capital: $71,000
  professional_fees: $15,000
  marketing_launch: $10,000
  total: $185,000

This data exists in the answers table as answer_value for
question_id 'investment_breakdown' or similar.

Ensure the generation engine reads this breakdown from the
answers table and passes it explicitly into the prompt context
as a structured variable — not as free text that the model
might hallucinate.

The prompt must reference the exact breakdown data, not
generate its own version.

STEP 3 — Update cover_letter.md prompt:

Add explicit instruction:
"Use ONLY the investment breakdown figures provided in the
context. Do not estimate, round, or substitute any amounts.
The exact figures are: {investment_breakdown}
If any figure is missing, state it is not yet confirmed —
never invent a number."

Apply the same rule to all other prompts that reference
investment amounts:
  source_of_funds.md
  investment_proof.md
  business_plan.md

STEP 4 — Add a data validation step:

Before calling the Anthropic API for any document, validate
that required context variables are present and non-null:
  - applicant_name
  - investment_total
  - investment_breakdown
  - business_name
  - business_address
  - source_of_funds_summary

If any required variable is missing, set the document status
to 'failed' with error message:
"Missing required data: [variable name]. 
Complete Module 3 Tab [X] before generating."

Do not proceed to the API call with missing data.

Run npm run build — confirm clean.
Commit: "fix: generation engine passes exact investment data — no hallucination"
git push origin dev
Report: what data mapping was wrong and what was fixed.
```

---

## FIX 1 — Sequential Document Approval (Agent 2 after Fix 4)
**Priority:** SECOND — architectural change to generation flow
**Files:** src/lib/generation-engine.ts, src/app/generate/[applicationId]/page.tsx,
src/app/api/generate/run/[jobId]/route.ts
**Time:** 3-4 hours — biggest change

```
Start session. Read CLAUDE_CONTEXT.md, BUILD_TRACKER.md.
Read docs/Spec4_Quality_Gate_Pipeline.md fully.
Read src/lib/generation-engine.ts fully.
Read src/app/generate/[applicationId]/page.tsx fully.
Read src/app/api/generate/run/[jobId]/route.ts fully.
Permission granted: the three files listed above only.
No Magic MCP.

Use Sequential Thinking MCP to plan before writing any code.
Think through:
1. Current flow: generate all 6 → show all 6 for approval
2. Required flow: generate 1 → show 1 → wait for approval → generate 2
3. What DB state is needed to track "waiting for approval"
4. How the SSE stream communicates "waiting for approval" to the UI
5. What the approval API endpoint looks like
6. What happens if user requests a revision on document 2 — does it
   affect documents 3-6?
Report the plan before writing code. Wait for no one —
proceed directly based on the plan.

CURRENT PROBLEM:
The generation engine generates all 6 documents sequentially
without pausing. The user only sees them after all 6 are done.
If document 1 (Cover Letter) has an error, all subsequent
documents may be inconsistent with it — wasting 5 API calls.

REQUIRED BEHAVIOUR:
1. Generate Cover Letter
2. Pause — update job status to 'awaiting_approval'
3. Notify UI via SSE: "Cover Letter ready for review"
4. User clicks READ & APPROVE on the Cover Letter
5. Approval triggers next document generation
6. Repeat for all 6 documents
7. After all 6 approved — proceed to quality gate steps 7-15

STEP 1 — Add DB status for awaiting approval:

ALTER TABLE document_generation_jobs
  DROP CONSTRAINT IF EXISTS document_generation_jobs_status_check;
ALTER TABLE document_generation_jobs
  ADD CONSTRAINT document_generation_jobs_status_check
  CHECK (status IN (
    'queued', 'running', 'awaiting_approval',
    'completed', 'failed', 'partial'
  ));

STEP 2 — Update generation engine:

After each document is successfully generated and saved:
  1. Update job status to 'awaiting_approval'
  2. Update job current_step_label to
     '[Document Name] ready — please review and approve'
  3. Send SSE event: { type: 'awaiting_approval', document: docType }
  4. PAUSE — do not generate the next document
  5. Poll the generated_documents table every 5 seconds
     checking if the current document status = 'approved'
  6. When approved: continue to next document

Revision handling:
  If user clicks REVISE instead of APPROVE:
    - Regenerate only that document
    - Do not touch any subsequent documents
    - After regeneration: return to awaiting_approval state

STEP 3 — Update the generate page UI:

When SSE sends awaiting_approval event:
  - Highlight the current document card
  - Show a clear REVIEW & APPROVE button on the card
  - Show the document content inline in the card
    (not just "Document generated and saved")
  - Show word count and estimated page count
  - Show a REVISE button alongside APPROVE

The left panel step indicators:
  - Completed documents: gold checkmark
  - Current document awaiting approval: gold pulsing border
  - Next documents: muted pending state
  - Quality gate steps (7-15): shown but locked until all
    6 documents are approved

STEP 4 — Update document content display:

Currently the cards just say "Document generated and saved."
When a document is in 'under_review' status, show the first
500 characters of the document content in the card with
a "Read full document" expand button.

This gives the user enough to decide approve vs revise
without leaving the generation page.

STEP 5 — Approval API:

The existing /api/generate/documents/[applicationId] PATCH
endpoint should handle approval. Verify it:
  - Sets document status to 'approved'
  - Sets approved_at timestamp
  - Triggers the next document generation by updating
    job status from 'awaiting_approval' back to 'running'

STEP 6 — Quality gate trigger:

After all 6 documents are approved (status = 'approved'):
  Automatically proceed to steps 7-15
  (Gap Analysis, Repetition Check, Consistency Check,
  AI Detection Audit, Humanization Pass, Metadata
  Sanitization, Quality Gate, Acknowledgment Gate,
  Preview Unlocked)
  These run automatically without user approval gates
  since they are quality checks not content decisions.

Run npm run build — must be clean.
Playwright test:
  Navigate to generate page
  Confirm page loads without localStorage workaround
    (Fix 5 should be in place)
  Confirm first document card shows APPROVE button
  Screenshot the awaiting_approval state

Commit: "feat: sequential document approval — generate one review one proceed"
git push origin dev
Report what changed and how the new flow works.
```

---

## FIX 2 — Quality Gate Steps 11-14 (Agent 1 after Fix 3)
**Priority:** THIRD — must run after data mapping is fixed
**Files:** src/lib/generation-engine.ts only
**Time:** 2 hours

```
Start session. Read CLAUDE_CONTEXT.md only.
Read src/lib/generation-engine.ts fully.
Read docs/Spec4_Quality_Gate_Pipeline.md fully.
Permission granted: src/lib/generation-engine.ts only.
No Magic MCP.

PROBLEM:
The generation pipeline skips steps 11-14 entirely:
  Step 11 — Humanization Pass
  Step 12 — Metadata Sanitization
  Step 13 — Quality Gate
  Step 14 — Acknowledgment Gate

These are the most important quality control steps.
Without them documents go out without:
  - AI detection testing and humanization
  - Metadata stripping
  - Legal disclaimer verification
  - Forbidden phrase check

STEP 1 — Find why steps 11-14 are skipped:

Read the generation engine code and find exactly
where steps 11-14 should be implemented.
Are they defined but not called?
Are they called but returning early?
Are they missing entirely?
Report before writing any code.

STEP 2 — Implement Step 11 — Humanization Pass:

For each generated document:
  Take the raw generated text
  Send to Anthropic with this system prompt:
  "You are a humanization specialist. Rewrite the following
  immigration document to sound like it was written by a
  skilled human attorney, not an AI. Maintain all facts
  exactly. Improve sentence variety, eliminate repetitive
  phrasing, add natural transitions, vary paragraph length.
  The document must pass AI detection tools. Do not change
  any names, dates, amounts, or legal arguments."

  Update the document content_text with the humanized version.
  Update content_json with humanized version.

STEP 3 — Implement Step 12 — Metadata Sanitization:

This step runs on the final document text before storage.
Scan for and remove:
  - Any AI tool names: claude, anthropic, chatgpt, gpt, openai
  - Any generation timestamps or internal references
  - Any prompt artifacts or instruction fragments that
    may have leaked into the output
  - Any markdown formatting that should not be in a
    formal legal document (## headers, ** bold, etc.)

Convert to clean plain text or properly formatted document.

STEP 4 — Implement Step 13 — Quality Gate:

Run these checks on each document:

CHECK 1 — Legal disclaimer present:
  Document must contain one of:
  "does not constitute legal advice"
  "not a law firm"
  "prepared using e2go"
  If missing: add the standard disclaimer at the end:
  "This document was prepared using e2go.app and does not
  constitute legal advice. e2go is not a law firm."

CHECK 2 — Forbidden phrases absent:
  Scan for: qualifies, eligible, meets the standard,
  satisfies the requirement, guaranteed, will be approved,
  claude, anthropic, chatgpt, ai generated
  If found: flag for humanization re-run with specific
  instruction to remove the flagged phrase.

CHECK 3 — Investment figures consistent:
  Extract all dollar amounts mentioned in the document.
  Compare against the known investment total from answers.
  If any figure differs by more than 10%: flag as
  potential hallucination. Log to document_generation_log.

CHECK 4 — Applicant name consistent:
  All references to the applicant must use the exact
  legal name from the application.
  No nicknames, abbreviations, or variations.

STEP 5 — Implement Step 14 — Acknowledgment Gate:

Update the job status to signal all quality checks passed.
Set quality_gate_passed = true on all approved documents.
Log results to document_generation_log:
  - Which checks passed
  - Which checks failed and were fixed
  - Final AI detection score if available
  - Word count per document

Run npm run build — must be clean.
Commit: "feat: implement steps 11-14 — humanization, metadata, quality gate, acknowledgment"
git push origin dev
Report: what each step does and confirm they run correctly.
```

---

## FIX 6 + FIX 7 — Model Upgrade + DB Config (after all above complete)
**Run only after Fixes 1-5 are all committed and a clean test generation passes**
**Agent:** Any free agent
**Time:** 1 hour

```
Start session. Read CLAUDE_CONTEXT.md only.
Permission granted: src/lib/generation-engine.ts only
for the model change. For the DB config also create
supabase/migrations/20260607000000_app_settings.sql
No Magic MCP.

TASK 1 — Create app_settings table:

Create supabase/migrations/20260607000000_app_settings.sql:

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON app_settings
  FOR SELECT USING (true);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE tablename = 'app_settings'
    AND policyname = 'Admin write settings') THEN
    CREATE POLICY "Admin write settings" ON app_settings
      FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

INSERT INTO app_settings (key, value, description) VALUES
  ('generation_model', 'claude-opus-4-8',
   'Anthropic model for document generation. Update when deprecated.'),
  ('generation_model_fallback', 'claude-sonnet-4-6',
   'Fallback model if primary unavailable.')
ON CONFLICT (key) DO NOTHING;

Run this migration in Supabase SQL Editor.

TASK 2 — Update generation engine to read model from DB:

In src/lib/generation-engine.ts:
Replace hardcoded 'claude-sonnet-4-20250514' with:

async function getGenerationModel(supabase: SupabaseClient): Promise<string> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'generation_model')
      .single()
    return data?.value ?? 'claude-opus-4-8'
  } catch {
    return 'claude-opus-4-8'
  }
}

Call getGenerationModel() once at the start of the
generation pipeline and use the returned string for
all Anthropic API calls.

TASK 3 — Add deprecation warning capture:

After each Anthropic API call, check if the response
included a deprecation warning in the model field or
headers. If detected:

await supabase.from('app_settings').upsert({
  key: 'model_deprecation_warning',
  value: 'WARNING: Current generation model is deprecated. Update in app_settings.',
  description: 'Auto-set when Anthropic deprecation detected',
  updated_at: new Date().toISOString()
})

This allows the admin dashboard to show a banner
when the model needs updating.

Run npm run build — must be clean.
Commit: "feat: generation model from DB config, claude-opus-4-8, deprecation warning capture"
git push origin dev
Report: confirm model is now claude-opus-4-8 and
reads from app_settings table.
```

---

## EXECUTION ORDER

Round 1 — Parallel:
  Agent 1: Fix 5 (localStorage bug)
  Agent 2: Fix 4 (clean duplicate rows)

Round 2 — After Round 1 complete, parallel:
  Agent 1: Fix 3 (investment data mapping)
  Agent 2: Fix 1 (sequential approval — biggest change)

Round 3 — After Round 2 complete:
  Agent 1: Fix 2 (quality gate steps 11-14)

Round 4 — After clean test generation passes:
  Any agent: Fix 6+7 (model upgrade to Opus 4.8 + DB config)

After Round 4: run one full generation with Opus 4.8.
That is the first production-quality document output.

---

*File: ~/E2-go/docs/SESSION_PLAN_GENERATION_FIXES.md*
