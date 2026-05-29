# E2PATHWAY — MASTER PRODUCT DOCUMENT
## Volume 4 of 4: Technical Architecture, Database Schema & Developer Handoff
**Version 1.0 | Session Date: May 28, 2026 | Status: Pre-Build**

---

## 11.1 Technology Stack

### Guiding Principles

The stack is chosen for:
1. Solo-founder buildability — one person can maintain it
2. Managed infrastructure — minimal DevOps burden
3. Proven ecosystem — large communities, good documentation
4. Cost efficiency at low volume — cheap to start, scales without re-architecture
5. TypeScript throughout — single language front-to-back

---

### Recommended Stack

#### Frontend
- Framework: Next.js 14+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- UI Components: shadcn/ui (Radix UI primitives)
- State Management: Zustand (lightweight, no boilerplate)
- Forms: React Hook Form + Zod (validation)
- PDF Rendering: react-pdf or PDFKit (server-side generation)
- Charts / Progress: Recharts (score dashboard, progress bars)
- Voice (Interview Simulator): browser MediaRecorder API

Rationale: Next.js handles SSR for SEO-critical marketing pages and
CSR for the app itself. shadcn/ui gives professional UI components
without a heavy design system dependency.

#### Backend
- Runtime: Node.js via Next.js API routes (serverless)
- Language: TypeScript
- ORM: Prisma
- Validation: Zod (shared with frontend — single schema source)
- Authentication: Clerk (handles email/password, social login,
  session management, device tracking)
- Email: Resend + React Email (transactional and nurture)
- File Storage: Cloudflare R2 (PDF exports — cheap, S3-compatible)
- Background Jobs: Trigger.dev or Inngest (compliance calendar
  notifications, follow-up sequences, referral tracking)
- Rate Limiting: Upstash Redis

Rationale: Serverless functions via Next.js API routes keep
infrastructure simple. Clerk eliminates auth complexity entirely.
Resend + React Email gives professional transactional email
with beautiful templates.

#### Database
- Primary: PostgreSQL via Neon (serverless Postgres — free tier,
  autoscales, branching for dev/staging/prod)
- Caching: Upstash Redis (rate limiting, session caching,
  live CAD/USD rate caching)

Rationale: Neon's serverless Postgres requires zero database
management. Branching enables clean dev/staging separation.

#### AI / LLM
- Document Generation: Anthropic Claude Sonnet via API
  (cover letters, business plans, variance narratives)
- Interview Evaluation: Same — Claude evaluates interview answers
  in structured JSON response
- Voice Transcription: OpenAI Whisper API
- Prompts: Stored in /prompts directory as versioned .md files
  (not hardcoded in application logic)

Rationale: Claude Sonnet produces the highest quality long-form
professional document output. Whisper is the industry standard
for speech-to-text accuracy.

#### Payments
- Stripe (subscriptions, one-time purchases, referral credits,
  PayPal-equivalent payouts via Stripe Connect)

#### Analytics
- PostHog (self-hosted or cloud — full product analytics,
  session replay, feature flags, A/B testing)
- No Google Analytics — PIPEDA and CASL-sensitive audience

#### Deployment
- Vercel (Next.js native, zero-config deployment, preview
  deployments per PR, edge functions)
- Domain / DNS: Cloudflare
- Environment secrets: Vercel environment variables

#### Monitoring
- Error tracking: Sentry
- Uptime: Better Uptime or Checkly
- Logging: Vercel log drain → Axiom

---

### Infrastructure Cost Estimate (Early Stage, <1,000 Users)

| Service | Plan | Monthly Cost (USD) |
|---|---|---|
| Vercel | Pro | $20 |
| Neon (Postgres) | Free → Launch | $0–$19 |
| Upstash Redis | Pay-per-use | $0–$5 |
| Clerk (Auth) | Pro | $25 |
| Resend (Email) | Pro | $20 |
| Cloudflare R2 (Storage) | Pay-per-use | $0–$5 |
| Anthropic API | Pay-per-use ~$0.003/1K tokens | $20–$60 |
| OpenAI Whisper | Pay-per-use ~$0.006/min | $5–$15 |
| Stripe | 2.9% + $0.30 per transaction | Variable |
| PostHog | Free (1M events) | $0 |
| Sentry | Free tier | $0 |
| Trigger.dev / Inngest | Free tier | $0 |
| **TOTAL** | | **~$95–$169/month** |

At 100 paying subscribers ($197 avg), monthly revenue = ~$19,700.
Infrastructure costs represent <1% of revenue at this scale.

---

## 11.2 Database Schema

### Schema Overview

The database is organized into 8 logical domains:
1. Users & Authentication
2. Applications
3. Questionnaire Data (Module 3 responses)
4. Generated Documents
5. Compliance Calendar
6. Interview Simulator
7. Referrals
8. Outcomes

---

### Domain 1 — Users

```sql
-- users (managed primarily by Clerk; mirrored in DB for relational joins)
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id         TEXT UNIQUE NOT NULL,
  email                 TEXT UNIQUE NOT NULL,
  full_name             TEXT,
  province              TEXT,
  marketing_consent     BOOLEAN DEFAULT FALSE,
  marketing_consent_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

-- subscriptions
CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),
  stripe_subscription_id TEXT,
  stripe_customer_id    TEXT,
  plan_tier             TEXT NOT NULL,  -- 'solo' | 'family' | 'partnership' | 'renewal'
  status                TEXT NOT NULL,  -- 'active' | 'cancelled' | 'past_due'
  current_period_start  TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  cos_addon             BOOLEAN DEFAULT FALSE,
  exports_used          INTEGER DEFAULT 0,
  exports_included      INTEGER DEFAULT 3,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- devices (for anti-sharing fingerprint tracking)
CREATE TABLE user_devices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),
  fingerprint_hash      TEXT NOT NULL,
  ip_hash               TEXT,
  user_agent            TEXT,
  first_seen_at         TIMESTAMPTZ DEFAULT now(),
  last_seen_at          TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 2 — Applications

```sql
-- applications (one per subscription slot)
CREATE TABLE applications (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id),
  subscription_id           UUID REFERENCES subscriptions(id),
  applicant_legal_name      TEXT,
  applicant_name_locked     BOOLEAN DEFAULT FALSE,
  business_name             TEXT,
  business_name_locked      BOOLEAN DEFAULT FALSE,
  application_type          TEXT,  -- 'solo' | 'partnership'
  processing_path           TEXT,  -- 'consular' | 'cos'
  partner_user_id           UUID REFERENCES users(id),
  module_1_complete         BOOLEAN DEFAULT FALSE,
  module_2_complete         BOOLEAN DEFAULT FALSE,
  module_3_complete         BOOLEAN DEFAULT FALSE,
  confidence_score          INTEGER,
  confidence_score_at       TIMESTAMPTZ,
  certification_name        TEXT,
  certification_at          TIMESTAMPTZ,
  interview_date            DATE,
  target_consulate          TEXT DEFAULT 'Toronto',
  status                    TEXT DEFAULT 'in_progress',
  sharing_suspected         BOOLEAN DEFAULT FALSE,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- dependents
CREATE TABLE dependents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  relationship          TEXT,  -- 'spouse' | 'child'
  full_name             TEXT,
  date_of_birth         DATE,
  passport_number_enc   TEXT,  -- AES-256 encrypted
  passport_expiry       DATE,
  age_out_alert_sent    BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 3 — Questionnaire Responses

```sql
-- module_responses (stores all Module 1, 2, 3 answers)
CREATE TABLE module_responses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  module_group          TEXT NOT NULL,   -- '1' | '2' | '3A' | '3B' ... '3I'
  question_id           TEXT NOT NULL,   -- e.g. 'Q3B-05'
  answer_type           TEXT NOT NULL,   -- 'text' | 'number' | 'date' | 'multiselect' | 'boolean'
  answer_text           TEXT,
  answer_number         NUMERIC,
  answer_date           DATE,
  answer_array          TEXT[],          -- for multi-select
  answer_boolean        BOOLEAN,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  UNIQUE(application_id, question_id)
);

-- funds_timeline (for Template 1 chronology builder)
CREATE TABLE funds_timeline_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  event_date            DATE NOT NULL,
  description           TEXT NOT NULL,
  amount_cad            NUMERIC,
  amount_usd            NUMERIC,
  institution           TEXT,
  account_last4         TEXT,
  sort_order            INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- assets (for Template 3)
CREATE TABLE business_assets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  category              TEXT,
  description           TEXT,
  quantity              INTEGER DEFAULT 1,
  unit_cost_usd         NUMERIC,
  total_cost_usd        NUMERIC,
  status                TEXT,  -- 'paid' | 'ordered' | 'planned'
  sort_order            INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- hiring_plan (for Template 5)
CREATE TABLE hiring_plan (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  job_title             TEXT NOT NULL,
  employment_type       TEXT,  -- 'ft' | 'pt'
  hire_month            INTEGER,  -- months after business opens
  annual_salary_usd     NUMERIC,
  benefits              TEXT,
  year                  INTEGER,  -- 1 | 2 | 3 | 4 | 5
  created_at            TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 4 — Generated Documents

```sql
-- generated_documents
CREATE TABLE generated_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  document_type         TEXT NOT NULL,
  -- 'cover_letter' | 'source_of_funds' | 'business_plan' |
  -- 'asset_register' | 'org_chart' | 'hiring_plan' | 'ds160_ref' |
  -- 'spouse_ds160' | 'tab_l' | 'renewal_cover_letter' | 'actual_vs_projected'
  content_json          JSONB,           -- structured section data
  content_text          TEXT,            -- full rendered text
  llm_model             TEXT,            -- model used for generation
  llm_prompt_version    TEXT,
  generation_tokens     INTEGER,
  generated_at          TIMESTAMPTZ DEFAULT now(),
  last_edited_at        TIMESTAMPTZ,
  user_edited           BOOLEAN DEFAULT FALSE
);

-- pdf_exports
CREATE TABLE pdf_exports (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  export_number         INTEGER NOT NULL,   -- 1, 2, 3...
  r2_storage_key        TEXT,               -- Cloudflare R2 path
  watermark_doc_id      TEXT UNIQUE,        -- embedded in PDF
  file_size_bytes       INTEGER,
  exported_at           TIMESTAMPTZ DEFAULT now(),
  expires_at            TIMESTAMPTZ         -- signed URL expiry
);
```

---

### Domain 5 — Compliance Calendar

```sql
-- calendar_items
CREATE TABLE calendar_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  item_key              TEXT NOT NULL,      -- e.g. 'license_application_start'
  title                 TEXT NOT NULL,
  description           TEXT,
  due_date              DATE,
  priority              TEXT,               -- 'critical' | 'high' | 'medium'
  phase                 TEXT,               -- 'pre_interview' | 'post_approval' | 'renewal'
  status                TEXT DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'complete' | 'overdue' | 'not_applicable'
  user_note             TEXT,
  reminder_sent_7d      BOOLEAN DEFAULT FALSE,
  reminder_sent_3d      BOOLEAN DEFAULT FALSE,
  overdue_alert_sent    BOOLEAN DEFAULT FALSE,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 6 — Interview Simulator

```sql
-- simulation_sessions
CREATE TABLE simulation_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID REFERENCES applications(id),
  mode                  TEXT NOT NULL,      -- 'text' | 'voice'
  question_count        INTEGER,
  session_duration_sec  INTEGER,
  overall_score_pct     INTEGER,
  strong_count          INTEGER,
  partial_count         INTEGER,
  weak_count            INTEGER,
  completed_at          TIMESTAMPTZ DEFAULT now()
);

-- simulation_answers
CREATE TABLE simulation_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            UUID REFERENCES simulation_sessions(id),
  question_id           TEXT NOT NULL,
  question_text         TEXT NOT NULL,
  question_category     TEXT,
  answer_text           TEXT,
  answer_duration_sec   INTEGER,
  filler_word_count     INTEGER,
  quality_rating        TEXT,              -- 'strong' | 'partial' | 'weak'
  feedback_json         JSONB,             -- structured feedback from LLM
  llm_tokens_used       INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- community_questions (crowd-sourced interview question bank)
CREATE TABLE community_questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text         TEXT NOT NULL,
  business_category     TEXT,
  consulate             TEXT DEFAULT 'Toronto',
  reported_count        INTEGER DEFAULT 1,
  verified              BOOLEAN DEFAULT FALSE,
  first_reported_at     TIMESTAMPTZ DEFAULT now(),
  last_reported_at      TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 7 — Referrals

```sql
-- referral_codes (for subscriber referral program)
CREATE TABLE referral_codes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),
  code                  TEXT UNIQUE NOT NULL,  -- UUID token in URL
  clicks                INTEGER DEFAULT 0,
  conversions           INTEGER DEFAULT 0,
  total_earned_usd      NUMERIC DEFAULT 0,
  tier                  TEXT DEFAULT 'referrer',
  created_at            TIMESTAMPTZ DEFAULT now()
);

-- referral_conversions
CREATE TABLE referral_conversions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id      UUID REFERENCES referral_codes(id),
  referred_user_id      UUID REFERENCES users(id),
  reward_usd            NUMERIC,
  reward_status         TEXT DEFAULT 'pending',
  -- 'pending' | 'credited' | 'paid_out'
  converted_at          TIMESTAMPTZ DEFAULT now(),
  paid_out_at           TIMESTAMPTZ
);

-- partner_referrals (for attorney / CPA / franchise / banking referrals)
CREATE TABLE partner_referrals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id),
  application_id        UUID REFERENCES applications(id),
  referral_type         TEXT NOT NULL,
  -- 'franchise' | 'attorney' | 'cpa' | 'banking'
  partner_id            TEXT,
  consent_version       TEXT,
  fields_shared         TEXT[],
  payload_hash          TEXT,
  transmission_status   TEXT DEFAULT 'pending',
  outcome_status        TEXT DEFAULT 'unknown',
  revenue_usd           NUMERIC,
  consented_at          TIMESTAMPTZ DEFAULT now(),
  transmitted_at        TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT now()
);
```

---

### Domain 8 — Outcomes

```sql
-- applicant_outcomes
CREATE TABLE applicant_outcomes (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id            UUID REFERENCES applications(id) UNIQUE,
  interview_date            DATE,
  outcome_state             TEXT,
  -- 'approved' | 'refused' | 'administrative_processing' |
  -- '221g_document_request' | 'unknown' | 'withdrawn'
  outcome_reported_at       TIMESTAMPTZ,
  visa_received_date        DATE,
  interview_duration_bucket TEXT,
  spouse_approved           BOOLEAN,
  children_approved_count   INTEGER,
  family_approved           TEXT,
  denial_reason_codes       TEXT[],
  doc_request_codes         TEXT[],
  questions_asked           TEXT[],
  notes_free_text           TEXT,
  testimonial_text          TEXT,
  testimonial_opt_in        BOOLEAN DEFAULT FALSE,
  testimonial_identity      TEXT,
  testimonial_approved      BOOLEAN DEFAULT FALSE,
  verification_level        INTEGER DEFAULT 1,
  ceac_status_confirmed     TEXT,
  ceac_confirmed_at         TIMESTAMPTZ,
  application_id_match      BOOLEAN,
  follow_up_exhausted       BOOLEAN DEFAULT FALSE,
  follow_up_1_sent_at       TIMESTAMPTZ,
  follow_up_2_sent_at       TIMESTAMPTZ,
  follow_up_3_sent_at       TIMESTAMPTZ,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);
```

---

### Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_module_responses_application ON module_responses(application_id);
CREATE INDEX idx_calendar_items_due_date ON calendar_items(due_date);
CREATE INDEX idx_calendar_items_status ON calendar_items(status);
CREATE INDEX idx_simulation_sessions_application ON simulation_sessions(application_id);
CREATE INDEX idx_outcomes_outcome_state ON applicant_outcomes(outcome_state);
CREATE INDEX idx_outcomes_verification_level ON applicant_outcomes(verification_level);
CREATE INDEX idx_partner_referrals_type ON partner_referrals(referral_type);
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(fingerprint_hash);
```

---

## 11.3 API Route Architecture

### Route Organization (Next.js App Router)

```
/app
  /api
    /auth
      /webhook            POST  Clerk webhook → sync user to DB
    /applications
      /                   POST  Create new application
      /[id]               GET   Get application state
      /[id]               PATCH Update application fields
    /modules
      /[id]/responses     POST  Save module answer(s)
      /[id]/responses     GET   Get all responses for application
      /[id]/generate      POST  Trigger document generation
    /documents
      /[id]               GET   Get generated document
      /[id]               PATCH Save user edits to document
      /[id]/export        POST  Generate PDF export (watermarked)
    /calendar
      /[id]               GET   Get all calendar items for application
      /[id]/[itemId]      PATCH Update calendar item status
    /simulator
      /[id]/session       POST  Start simulation session
      /[id]/answer        POST  Submit answer + get feedback
      /[id]/report        GET   Get session report
    /outcomes
      /[id]               POST  Submit outcome data
      /[id]               PATCH Update outcome (CEAC verification)
    /referrals
      /consent            POST  Record referral consent + transmit payload
      /[code]/click       POST  Record referral link click
    /scores
      /[id]               GET   Calculate + return confidence score
    /payments
      /checkout           POST  Create Stripe checkout session
      /webhook            POST  Stripe webhook → update subscription
    /admin
      /outcomes           GET   Admin outcome metrics dashboard
      /referrals          GET   Admin referral metrics
```

---

## 11.4 LLM Prompt Architecture

### Prompt Storage Strategy

All LLM prompts are stored as versioned Markdown files in /prompts.
They are never hardcoded in application logic. This allows:
- Prompt updates without code deploys
- A/B testing different prompt versions
- Easy audit trail of what prompt generated which document

```
/prompts
  /v1
    /documents
      cover-letter.md
      source-of-funds.md
      business-plan-executive-summary.md
      business-plan-market-analysis.md
      business-plan-operations.md
      business-plan-financials.md
      org-chart-narrative.md
      hiring-plan-impact.md
      variance-narrative.md
      renewal-cover-letter.md
    /simulator
      answer-evaluation.md
      follow-up-question.md
    /calendar
      (no LLM — rule-based generation)
    /score
      (no LLM — rule-based calculation)
```

### Prompt Template Pattern

Each prompt file uses a structured injection pattern:

```markdown
# SYSTEM PROMPT — Cover Letter Generator

You are a professional document writer specializing in U.S. E-2 Treaty
Investor visa applications. You write in formal but warm English.
Your goal is to produce a cover letter that addresses every consular
evaluation criterion clearly and specifically.

## APPLICANT CONTEXT
Name: {{applicant_name}}
Business: {{business_name}}
Business type: {{business_category}}
Investment amount: {{investment_amount_usd}} USD
Investment source: {{source_summary}}
Business location: {{city}}, {{state}}
Investor role: {{investor_role}}
Qualifications summary: {{qualifications_summary}}
Immigrant intent risk: {{immigrant_intent_risk}}
Canadian property status: {{canadian_property_status}}

## INSTRUCTIONS
Write paragraphs 1–8 of the cover letter as defined below.
Each paragraph must reference the applicant's specific details above.
Do not use generic language. Do not invent information.
If a field is empty, omit that element from the relevant paragraph.

## PARAGRAPH SPECIFICATIONS
[paragraph-by-paragraph instructions...]

## OUTPUT FORMAT
Return a JSON object with keys: para_1, para_2, ... para_8
Each value is the full paragraph text.
Do not return markdown formatting within paragraph values.
```

### LLM Call Pattern (TypeScript)

```typescript
async function generateCoverLetter(
  applicationId: string,
  context: ApplicationContext
): Promise<CoverLetterOutput> {

  const promptTemplate = await fs.readFile(
    'prompts/v1/documents/cover-letter.md', 'utf-8'
  );

  const prompt = injectContext(promptTemplate, context);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const output = JSON.parse(extractJSON(response.content[0].text));

  await db.generatedDocuments.upsert({
    where: { application_id_document_type: {
      application_id: applicationId,
      document_type: 'cover_letter'
    }},
    update: {
      content_json: output,
      content_text: Object.values(output).join('

'),
      llm_model: 'claude-sonnet-4-5',
      llm_prompt_version: 'v1',
      generation_tokens: response.usage.input_tokens + response.usage.output_tokens,
      generated_at: new Date()
    },
    create: { ... }
  });

  return output;
}
```

---

## 11.5 Security Architecture

### Data Encryption

PASSPORT NUMBERS:
- Encrypted with AES-256-GCM before database insert
- Encryption key stored in Vercel environment variable (never in code)
- Decrypted only at document generation time, held in memory only
- Never logged, never displayed in full in UI

FINANCIAL ACCOUNT REFERENCES:
- Only last 4 digits stored — no full account numbers accepted by the app

PASSWORDS:
- Managed entirely by Clerk — E2Pathway never sees or stores passwords

PDF WATERMARKS:
- watermark_doc_id is a UUID generated at export time
- Embedded as invisible metadata + visible diagonal text in PDF
- Stored in pdf_exports table for traceability

### Authentication & Authorization

- Clerk handles authentication (JWT sessions)
- Every API route verifies Clerk session token before processing
- Authorization check: every database query scopes by user_id
  (users cannot access other users' application data)
- Admin routes protected by Clerk role: 'e2pathway_admin'

### Anti-Sharing Enforcement

Device fingerprint check on every authenticated request:
```typescript
async function checkDeviceAnomaly(userId: string, fingerprint: string) {
  const recentDevices = await db.userDevices.findMany({
    where: {
      user_id: userId,
      first_seen_at: { gte: subDays(new Date(), 7) }
    }
  });

  const knownFingerprints = new Set(recentDevices.map(d => d.fingerprint_hash));

  if (!knownFingerprints.has(fingerprint)) {
    await db.userDevices.create({ data: { user_id: userId, fingerprint_hash: fingerprint, ... }});
    if (recentDevices.length >= 2) {
      // 3rd+ distinct device in 7 days — flag
      await db.applications.updateMany({
        where: { user_id: userId },
        data: { sharing_suspected: true }
      });
      await sendSharingAlert(userId);
    }
  }
}
```

---

## 11.6 Background Job Specifications

### Job: compliance-calendar-reminders
Runs: Daily at 8:00 AM EST
Logic:
1. Query calendar_items WHERE due_date = TODAY + 7 AND reminder_sent_7d = FALSE
2. For each: send push + email reminder; mark reminder_sent_7d = TRUE
3. Repeat for TODAY + 3 with reminder_sent_3d
4. Query WHERE due_date < TODAY AND status NOT IN ('complete', 'not_applicable')
   AND overdue_alert_sent = FALSE
5. For each: send overdue alert; mark overdue_alert_sent = TRUE

### Job: outcome-followup-sequence
Runs: Daily at 9:00 AM EST
Logic:
1. Query applications WHERE interview_date = TODAY - 1
   AND outcome reported = FALSE → send Stage 2 prompt (24-hour)
2. Query WHERE interview_date = TODAY - 4
   AND outcome = NULL → send Day 4 follow-up
3. Query WHERE interview_date = TODAY - 10 → Day 10 follow-up
4. Query WHERE interview_date = TODAY - 21 → Day 21 final reminder
5. Query WHERE interview_date < TODAY - 30
   AND outcome = NULL → mark follow_up_exhausted = TRUE

### Job: child-age-out-alerts
Runs: Daily at 7:00 AM EST
Logic:
1. Query dependents WHERE relationship = 'child'
   AND date_of_birth BETWEEN (TODAY - 365) - 30 AND (TODAY - 365)
   (approaching 20 years old — 12 months before age 21)
2. For each not yet alerted: send age-out alert email + push
   Mark age_out_alert_sent = TRUE

### Job: renewal-window-reminder
Runs: Monthly on 1st at 8:00 AM EST
Logic:
1. Query subscriptions WHERE plan includes visa expiry date
   AND visa_expiry BETWEEN TODAY + 12 months AND TODAY + 18 months
2. For each: send renewal planning email + add renewal calendar items
   if not already present

### Job: cad-usd-rate-refresh
Runs: Every 4 hours
Logic:
1. Fetch CAD/USD rate from Exchange Rate API (free tier)
2. Store in Upstash Redis with 4-hour TTL:
   SET cad_usd_rate [rate] EX 14400
3. All investment conversion displays read from cache

---

## 11.7 PDF Generation Architecture

### Generation Flow

1. User clicks "Generate Package" or "Export PDF"
2. API route /api/documents/[id]/export called
3. Check: exports_used < exports_included (or charge $9 add-on)
4. Retrieve all generated document content from DB
5. Assemble PDF using PDFKit (server-side Node.js):
   - Cover page
   - Table of contents
   - Tab A through L content (pre-formatted)
   - DS-160 reference sheet
   - All 5 templates
6. Inject watermark layer:
   - Generate watermark_doc_id (UUID)
   - Diagonal text: user email + generation date + doc ID (10% opacity gray)
   - Embed doc ID as PDF metadata
7. Upload to Cloudflare R2:
   Key: exports/{application_id}/{export_number}/{watermark_doc_id}.pdf
8. Generate signed URL (expires 24 hours)
9. Record in pdf_exports table
10. Return signed URL to frontend → browser triggers download

### PDF Structure

```
E2Pathway Application Package
[Applicant Name] | [Business Name] | Generated [date]
Document ID: [watermark_doc_id]

TABLE OF CONTENTS
  Tab A  DS-160 Confirmation Reference
  Tab B  Personal Documents Checklist
  Tab C  Visa Category Confirmation Letter
  Tab D  Cover Letter
  Tab E  Proof of Nationality Checklist
  Tab F  Proof of Investment
  Tab G  Evidence Business is Real and Operating
  Tab H  Source and Path of Funds
  Tab I  Non-Marginality Evidence
  Tab J  Investor Qualifications
  Tab K  Business Plan
  Tab L  Dependent Information

[Tab divider pages between sections]
[Each section contains generated content + exhibit checklists]
```

---

## 11.8 Launch Readiness Checklist

### Legal & Compliance
[ ] Terms of Service reviewed by Canadian legal counsel
[ ] Privacy Policy reviewed by Canadian legal counsel
[ ] PIPEDA compliance confirmed by counsel
[ ] CASL consent mechanics reviewed by counsel
[ ] All in-app disclaimer language approved
[ ] Business plan certification flow legally reviewed
[ ] Referral disclosure language approved
[ ] Entity incorporated (federally or provincially in Canada)
[ ] Business bank account opened
[ ] Stripe account approved and connected

### Product
[ ] All Module 1–3 questions functional in app
[ ] All 5 templates generating correctly from test data
[ ] PDF export generating correctly with watermark
[ ] Compliance calendar populating correctly
[ ] Interview simulator functional (text + voice)
[ ] Confidence score calculating correctly
[ ] Referral consent flow working end-to-end
[ ] Outcome capture flow working end-to-end
[ ] Stripe checkout working (all 3 tiers)
[ ] Anti-sharing device fingerprinting active
[ ] Email sequences configured in Resend/Loops

### Infrastructure
[ ] Production database live (Neon)
[ ] Redis cache live (Upstash)
[ ] R2 storage bucket configured (Cloudflare)
[ ] Background jobs deployed and tested (Trigger.dev)
[ ] Sentry error tracking active
[ ] Uptime monitoring active
[ ] Vercel deployment pipeline working
[ ] Environment secrets confirmed in Vercel

### Content
[ ] Homepage copy complete
[ ] Pricing page live
[ ] 3 cornerstone blog posts published
[ ] Privacy policy and Terms pages live and linked in footer
[ ] Email nurture sequence loaded and tested
[ ] Waitlist email list imported to email platform

### Pre-Launch Testing
[ ] End-to-end test: full application from Module 1 → PDF export
[ ] End-to-end test: partnership application path
[ ] End-to-end test: COS add-on path
[ ] End-to-end test: referral program (click → signup → conversion)
[ ] End-to-end test: outcome capture → CEAC verification
[ ] End-to-end test: compliance calendar → email notification
[ ] Device fingerprint sharing detection tested
[ ] PDF watermark verified in exported document
[ ] Stripe webhook tested (subscription created, cancelled, failed payment)
[ ] Mobile responsiveness verified (iOS Safari + Android Chrome)

---

*End of Volume 4 — Technical Architecture, Database Schema & Developer Handoff*

---

# E2PATHWAY — MASTER PRODUCT DOCUMENT
## COMPLETE — All 4 Volumes

Volume 1: Market Research & Competitive Analysis
Volume 2: Product Architecture & Feature Specification (Part 1)
Volume 3: E-2 Visa Knowledge Base, Module Specs, Legal, Pricing & GTM
Volume 4: Technical Architecture, Database Schema & Developer Handoff

Status: Pre-Build | Version 1.0 | May 28, 2026
