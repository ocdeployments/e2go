# Session 15B — Module 4: Follow-Up Conversation
## Status: READY TO EXECUTE
## Date: June 5, 2026

---

## INSTRUCTIONS FOR CLAUDE CODE

Read these files before writing any code:
1. CLAUDE_CONTEXT.md
2. BUILD_TRACKER.md
3. docs/E2_Engine_Knowledge_Base_June3_2026.md
4. src/lib/generation-engine.ts
5. prompts/v1/documents/cover-letter.md

## EXECUTION RULES
- Complete all steps without pausing
- Never ask how to proceed
- Fix errors and continue
- Only report when all steps are done

## MCP SERVERS — USE THESE
- sequential-thinking: plan architecture before any code
- context7: verify Next.js App Router, Supabase patterns
- Playwright: screenshot verification after UI is built

## SKILLS — ACTIVATE THESE
- ui-ux-pro-max
- full-output-enforcement
- e2go-frontend

## DESIGN TOKENS — LOCKED
- Background: #0a0a0a
- Gold: #C9A84C
- Text: #f5f0e8
- Card border: 1px solid rgba(201,168,76,0.12)
- Input border: rgba(201,168,76,0.20)
- Input focus: 1px solid #C9A84C
- Heading: Cormorant Garamond light
- Body: DM Sans 300/400
- Sharp edges — no border radius on buttons or cards
- FORBIDDEN: glassmorphism, teal #0D9488, navy #060d1f

---

## CONTEXT

The document generation engine at src/lib/generation-engine.ts
is fully built and wired to the Anthropic API. It reads from
two tables that do not yet exist:
- applicant_voice_profile (reads voice_profile_text column)
- followup_responses (reads all rows for an application)

This session creates those tables and builds the Module 4 UI
that populates them. Once complete, the generation engine is
fully unblocked.

Module 4 runs AFTER Module 3 is complete and BEFORE generation.

---

## STEP 1 — DATABASE MIGRATION

Create supabase/migrations/[timestamp]_module4_followup.sql

Use current timestamp for the filename.

```sql
-- Voice profile table
-- generation-engine.ts reads voice_profile_text from this table
CREATE TABLE IF NOT EXISTS applicant_voice_profile (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  voice_sample_raw TEXT NOT NULL,
  voice_profile_text TEXT NOT NULL,
  sentence_length_avg INTEGER,
  vocabulary_level TEXT CHECK (vocabulary_level IN (
    'accessible', 'professional', 'technical', 'mixed'
  )),
  formality_register TEXT CHECK (formality_register IN (
    'formal', 'warm_formal', 'conversational', 'mixed'
  )),
  ai_detection_score DECIMAL(4,3),
  ai_detection_passed BOOLEAN DEFAULT FALSE,
  ai_detection_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id)
);

ALTER TABLE applicant_voice_profile
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their voice profile"
  ON applicant_voice_profile FOR ALL
  USING (auth.uid() = user_id);

-- Follow-up responses table
-- generation-engine.ts reads all rows for an application
CREATE TABLE IF NOT EXISTS followup_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id)
    ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  gap_category TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer_text TEXT NOT NULL,
  content_value TEXT CHECK (content_value IN (
    'high', 'medium', 'low', 'none'
  )) DEFAULT 'medium',
  relevant_documents TEXT[] DEFAULT '{}',
  question_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE followup_responses
  ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their followup responses"
  ON followup_responses FOR ALL
  USING (auth.uid() = user_id);

-- Module 4 lifecycle tracking
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS module4_started_at TIMESTAMPTZ;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS module4_completed_at TIMESTAMPTZ;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS voice_sample_collected
    BOOLEAN DEFAULT FALSE;
ALTER TABLE application_lifecycle
  ADD COLUMN IF NOT EXISTS followup_completed
    BOOLEAN DEFAULT FALSE;
```

---

## STEP 2 — TYPESCRIPT TYPES

Create src/types/followup.ts:

```typescript
export interface VoiceProfile {
  application_id: string
  voice_sample_raw: string
  voice_profile_text: string
  sentence_length_avg?: number
  vocabulary_level?: 'accessible' | 'professional' |
    'technical' | 'mixed'
  formality_register?: 'formal' | 'warm_formal' |
    'conversational' | 'mixed'
  ai_detection_score?: number
  ai_detection_passed: boolean
  ai_detection_flagged: boolean
}

export interface FollowupQuestion {
  id: string
  gap_category: string
  question_text: string
  why_it_matters: string
  question_number: number
}

export interface FollowupResponse {
  application_id: string
  gap_category: string
  question_text: string
  answer_text: string
  content_value: 'high' | 'medium' | 'low' | 'none'
  relevant_documents: string[]
  question_number: number
}

export interface FollowupSession {
  application_id: string
  questions: FollowupQuestion[]
  responses: FollowupResponse[]
  voice_sample_collected: boolean
  completed: boolean
  completion_summary: string[]
}
```

---

## STEP 3 — API ROUTES

### Route A: Save Voice Sample
Create src/app/api/followup/save-voice-sample/route.ts

POST endpoint:
1. Authenticate user via Supabase
2. Receive: { applicationId, voiceSampleText }
3. Run AI detection check on the sample text
   Use this simple heuristic if no detection service available:
   Check for AI marker phrases: "it is worth noting",
   "furthermore", "in conclusion", "it should be noted",
   "comprehensive", "crucial", "notably", "delve"
   Score = (count of markers / total sentences)
   Threshold: flag if score > 0.15
4. Build voice_profile_text string for prompt injection:

```
APPLICANT VOICE PROFILE:
Writing style: [detected vocabulary_level], [detected formality]
Characteristic approach: [1 sentence describing their style]
Writing sample (match this voice in all documents):
[full raw text of writing sample]
```

5. Save to applicant_voice_profile table
6. Update application_lifecycle: voice_sample_collected = true
7. Return: { success: true, passed: boolean, flagged: boolean,
             score: number }

Never block saving even if flagged — just set flagged = true.
The UI handles the flagged state.

---

### Route B: Generate Questions
Create src/app/api/followup/generate-questions/route.ts

POST endpoint:
1. Authenticate user
2. Receive: { applicationId }
3. Load Case Brief from case_briefs table
4. Load Module 3 answers from answers table
5. Call Anthropic API with this system prompt:

```
You are helping prepare an E-2 visa application.
Based on the applicant's case brief and answers,
identify information gaps that would strengthen
their application documents if filled.

Generate between 5 and 8 questions maximum.
Each question must:
- Address a specific gap in this specific application
- Be conversational — not interrogative
- Include a "why_it_matters" explanation (one sentence)
- Be answerable in 2-5 sentences
- Target hidden experience the applicant may not
  think to mention

Gap categories to probe (in priority order):
1. Direct experience in this specific industry
2. Management and operations experience with numbers
3. Personal connection to this specific business type
4. Family or community involvement in relevant sector
5. Volunteer or informal experience in relevant field
6. Prior business ownership or management
7. Specific measurable achievements in work history
8. Personal motivation — why this business specifically

Return ONLY a valid JSON array. No other text.
Format:
[
  {
    "id": "q1",
    "gap_category": "category name",
    "question_text": "The actual question",
    "why_it_matters": "One sentence why this matters",
    "question_number": 1
  }
]
```

User message to Claude:
```
CASE BRIEF SUMMARY:
Experience score: [from case brief]
Framing decisions: [from case brief]
Content gaps identified: [from case brief]

BUSINESS TYPE: [from answers]
APPLICANT BACKGROUND SUMMARY: [from answers Tab J]

Generate questions targeting the specific gaps
in this application.
```

6. Parse JSON response
7. Return questions array

If Anthropic API call fails: return 5 default questions
covering the most common gaps. Never return empty array.

Default fallback questions:
```json
[
  {
    "id": "q1",
    "gap_category": "personal_connection",
    "question_text": "What first drew you to this specific type of business?",
    "why_it_matters": "Your personal connection to the business strengthens the credibility of your investment decision",
    "question_number": 1
  },
  {
    "id": "q2",
    "gap_category": "management_experience",
    "question_text": "Can you describe a time when you managed a team or led a project? How many people were involved and what was the outcome?",
    "why_it_matters": "Specific examples of management experience directly support your executive role claim",
    "question_number": 2
  },
  {
    "id": "q3",
    "gap_category": "industry_experience",
    "question_text": "Have you ever worked with, cared for, or spent significant time with the customers this business will serve?",
    "why_it_matters": "Even indirect experience with your target customer base strengthens your qualifications narrative",
    "question_number": 3
  },
  {
    "id": "q4",
    "gap_category": "financial_management",
    "question_text": "Have you ever managed a budget, handled financial decisions for a business, or been responsible for profit and loss?",
    "why_it_matters": "Financial management experience demonstrates readiness to develop and direct the enterprise",
    "question_number": 4
  },
  {
    "id": "q5",
    "gap_category": "motivation",
    "question_text": "What do you want your life to look like in 5 years as a result of this investment?",
    "why_it_matters": "Your long-term vision demonstrates genuine commitment to the enterprise beyond the visa itself",
    "question_number": 5
  }
]
```

---

### Route C: Save Response
Create src/app/api/followup/save-response/route.ts

POST endpoint:
1. Authenticate user
2. Receive: { applicationId, question, answerText,
              questionNumber, gapCategory }
3. Assess content value:
   - If answerText length < 20 chars: 'none'
   - If answerText contains specific numbers, names,
     dates, or places: 'high'
   - Otherwise: 'medium'
4. Determine relevant documents based on gap_category:
   - management_experience → ['cover_letter', 'qualifications']
   - industry_experience → ['cover_letter', 'qualifications']
   - financial_management → ['business_plan', 'qualifications']
   - personal_connection → ['cover_letter']
   - motivation → ['cover_letter']
5. Save to followup_responses table
6. Return: { success: true, contentValue, relevantDocuments }

---

### Route D: Completion Summary
Create src/app/api/followup/completion-summary/route.ts

POST endpoint:
1. Authenticate user
2. Receive: { applicationId }
3. Load all followup_responses for this application
4. Load voice_profile_text
5. Call Anthropic API:

System prompt:
```
Review these follow-up conversation responses from
an E-2 visa applicant. Identify the 3-4 strongest
pieces of evidence or experience that will
strengthen their application.

Return ONLY a valid JSON array of strings.
Each string is one bullet point.
Each bullet must:
- Reference a SPECIFIC fact from their responses
- Connect it to a specific E-2 requirement
- Be 15-25 words maximum
- Start with the specific experience, not a generic claim

Example:
["12 years managing 47-person teams directly supports the executive role and develop-and-direct requirement"]

Return ONLY the JSON array. No other text.
```

6. Parse and return summary bullets
7. Update application_lifecycle: followup_completed = true,
   module4_completed_at = now()

If API fails: return 2 generic bullets based on
the response content without AI processing.

---

## STEP 4 — MODULE 4 UI

Create src/app/apply/module4/page.tsx

4-screen flow. Client component.
All screens use card layout consistent with Module 1 and 2.

### Screen 1 — Introduction

```
Eyebrow: "MODULE 4" — DM Sans 500 10px #C9A84C uppercase
Headline: "Before we write your documents..."
  Cormorant Garamond 42px weight 300 #f5f0e8

Body paragraph 1:
"Your application answers are ready to become
consulate-formatted documents. Before we begin,
two short tasks will make your documents
significantly stronger."

Body paragraph 2:
"First, you will write a few sentences in your
own words. Then we will ask you up to 8 short
questions based on your specific application.
Most applicants finish in 15–20 minutes."

Time estimate badge:
"⏱ Estimated time: 15–20 minutes"
DM Sans 300 13px #C9A84C

CTA: "Let's Begin →"
  Gold primary button
  padding: 14px 32px
  bg #C9A84C color #0a0a0a DM Sans 500
  sharp edges
```

### Screen 2 — Voice Sample

```
Eyebrow: "STEP 1 OF 2 — YOUR VOICE"
Headline: "Tell us about your decision in your own words."
  Cormorant Garamond 36px weight 300

Instruction text:
"Write 3–5 sentences about why you chose this
business and what you hope to build. Write
naturally — as if explaining it to a friend.
We use your writing style to make your documents
sound like you wrote them."
DM Sans 300 15px rgba(245,240,232,0.70)

Textarea:
  min-height: 180px
  bg: rgba(255,255,255,0.03)
  border: 1px solid rgba(201,168,76,0.20)
  focus border: 1px solid #C9A84C
  color: #f5f0e8
  DM Sans 300 16px
  padding: 16px
  placeholder: "I chose this business because..."
  no resize (resize: none)

Word count indicator below textarea:
  Show: "[N] words"
  Target text: "Aim for at least 50 words"
  Color logic:
    < 30 words → rgba(239,68,68,0.80) red
    30-49 words → #F59E0B amber
    50+ words → #C9A84C gold

Submit button: "Save My Writing Sample →"
  Disabled until wordCount >= 30
  Loading state text: "Analyzing your writing style..."
  On click: POST to /api/followup/save-voice-sample

If response.flagged === true:
  Show amber warning card:
  border: 1px solid rgba(245,158,11,0.30)
  bg: rgba(245,158,11,0.06)
  Text: "This writing may have been AI-assisted.
    Your documents will be more credible when
    written in your own natural voice. Please
    write a fresh sample in your own words."
  Allow textarea to be cleared and resubmitted

If response.passed === true:
  Show brief confirmation below button:
  "✓ Voice profile captured"
  DM Sans 300 14px #C9A84C
  Auto-advance to Screen 3 after 1500ms
```

### Screen 3 — Follow-Up Questions

```
On mount:
  Call POST /api/followup/generate-questions
  Show loading state while fetching:
    Eyebrow: "STEP 2 OF 2"
    Text: "Reviewing your application..."
    Animated: three gold dots pulsing
    Cormorant Garamond 24px italic rgba(245,240,232,0.60)

Once questions loaded — render one at a time:

Eyebrow: "STEP 2 OF 2 — QUESTION [current] OF [total]"
DM Sans 500 10px #C9A84C uppercase

Progress bar:
  height: 2px
  bg: rgba(201,168,76,0.15)
  fill: #C9A84C
  width: (currentIndex / total * 100)%
  transition: width 300ms ease
  margin-bottom: 32px

Why it matters card (above question):
  bg: rgba(201,168,76,0.04)
  border-left: 3px solid #C9A84C
  padding: 10px 16px
  margin-bottom: 20px
  Text: "Why we're asking: [why_it_matters]"
  DM Sans 300 13px rgba(245,240,232,0.55) italic

Question text:
  Cormorant Garamond 28px weight 300 #f5f0e8
  margin-bottom: 24px

Answer textarea:
  Same style as Screen 2 textarea
  min-height: 120px
  placeholder: "Your answer..."

Navigation row (space-between):
  Left: "Skip this question"
    DM Sans 300 14px rgba(245,240,232,0.35)
    cursor pointer
    hover: rgba(245,240,232,0.60)
    On click: save empty response, advance
  
  Right: "Next Question →" (or "See My Summary →" on last)
    Gold primary button
    Disabled until textarea has content OR skip was clicked
    On click: POST /api/followup/save-response, then advance

After all questions:
  Auto-advance to Screen 4
```

### Screen 4 — Completion Summary

```
On mount: POST /api/followup/completion-summary
Show loading state while fetching.

Once loaded:

Eyebrow: "READY TO GENERATE"
DM Sans 500 10px #C9A84C uppercase

Headline: "Here is what we found."
Cormorant Garamond 42px weight 300 #f5f0e8

Sub: "These insights will strengthen your documents."
DM Sans 300 16px rgba(245,240,232,0.60)
margin-bottom: 32px

Bullet points from completion summary:
  Each bullet: flex row, gap 12px
  Icon: gold checkmark SVG 16x16px
  Text: DM Sans 400 16px #f5f0e8
  margin-bottom: 16px

Note below bullets:
  "These insights have been added to your
   application profile."
  DM Sans 300 13px rgba(245,240,232,0.40)
  margin-top: 24px

Primary CTA: "Generate My Documents →"
  Gold primary button large
  padding: 16px 40px DM Sans 500 16px
  Links to /apply/generate

Secondary CTA: "Review My Application First"
  Ghost button → /apply/overview
  margin-top: 12px
```

---

## STEP 5 — CONNECT MODULE 3 TO MODULE 4

Check current routing from Module 3 completion:

```bash
grep -r "generate\|module4\|Generate" \
  src/app/apply/ --include="*.tsx" | head -20
```

Find where Module 3 completion routes the user.
Update that route to go to /apply/module4 instead of
directly to generation.

The flow must be:
Module 3 complete → /apply/module4 → /apply/generate

---

## STEP 6 — BUILD VERIFICATION

Run: npm run build
Fix all TypeScript errors.
Zero errors, zero warnings target.

Use Playwright MCP:
1. Unregister service worker first
2. Navigate to http://localhost:3000/apply/module4
3. Screenshot Screen 1
4. Confirm Obsidian Gold design, correct copy
5. Screenshot Screen 2 with textarea visible
6. Screenshot Screen 3 loading state
7. Fix anything wrong before continuing

---

## STEP 7 — COMMIT

```bash
git add supabase/migrations/
git commit -m "Add: Module 4 migration — voice profile and followup tables"

git add src/types/followup.ts
git commit -m "Add: Module 4 TypeScript types"

git add src/app/api/followup/
git commit -m "Add: Module 4 API routes — voice, questions, responses, summary"

git add src/app/apply/module4/
git commit -m "Add: Module 4 UI — follow-up conversation 4-screen flow"

git push origin dev
```

Update BUILD_TRACKER.md:
- Mark Session 15B complete
- Note: applicant_voice_profile and followup_responses
  tables now exist — generation engine fully unblocked
- Next session: 15C — generation engine audit

```bash
git add BUILD_TRACKER.md
git commit -m "Update BUILD_TRACKER — Session 15B complete"
git push origin dev
```

---

## COMPLETION REPORT REQUIRED

Report exactly this when done:
"Session 15B complete.
 Module 4 built — voice sample + follow-up conversation.
 Tables created: applicant_voice_profile, followup_responses.
 Generation engine is now fully unblocked.
 Build: clean / errors: [none or list]
 Playwright: [confirmed screens]
 Ready for Session 15C."
