# Data Retention Policy

_Last updated: 2026-09-07_

E2go retains personal information only as long as it serves the purpose it was
collected for. No data category is kept indefinitely. This document is the
source of truth for the retention schedule; the public privacy policy
summarises it.

## Legal basis

No law imposes a **minimum** retention period on the documents E2go handles.
E2go is not a HIPAA covered entity and not a law firm, so the 6-year (HIPAA)
and 5–7-year (SOX / legal-hold) schedules do not apply. Applicable privacy law
(CCPA/CPRA, and PIPEDA for any Canadian users) requires the opposite: a
documented, purpose-bound schedule with defined maximum periods, disclosed at
collection, with deletion rights honoured. This policy satisfies that.

## Schedule

| Data category | Where it lives | Retention | Enforced by |
|---|---|---|---|
| **Raw uploaded document files** (bank statements, financial statements, FDDs, leases, business plans, etc.) | `application-documents` Storage bucket | Deleted **30 days after** the document package is generated, **or 90 days after upload** if no package exists — whichever is first. Users may also delete any file immediately from the document manager. | `/api/cron/data-retention` (daily). `file_purged_at` stamped on the row. |
| **Identity documents** (passport, birth certificate, marriage certificate) | — never stored — | The file is processed in memory by `/api/apply/parse-document` and discarded within the request. Only extracted fields (name, DOB, nationality, passport number, expiry) are kept. `/api/documents` rejects these types. | Code path (`file_path: ''`); `IDENTITY_DOC_TYPES` block. |
| **Extracted structured data** (`answers`, `uploaded_documents.extracted_json`, `application_documents.fields_extracted`, `fdd_analyses.extracted_fields`) | Postgres | Life of the account. This is the work product the user is building. **Exception:** for identity documents (passport, birth/marriage certificate, national or government ID, driver's licence) the `extracted_json` copy is overwritten with a redaction marker one day after its fields are accepted into `answers` — the accepted fields remain in `answers`, the redundant PII copy does not. | Account-deletion cascade; `/api/cron/data-retention` `redactAcceptedIdentityDocs` (daily). |
| **Document-access log** (`document_access_log`) | Postgres | Who accessed which uploaded document and when (view / extract / parse / download / delete). Life of the account. Contains no document content. Users may read their own trail. | Account-deletion cascade (`user_id` → `ON DELETE CASCADE`). |
| **Generated document package** (`generated_documents`) | Postgres | Life of the account. The deliverable the user paid for. | Account-deletion cascade. |
| **Account & profile data** (`profiles`, `applications`, `quiz_sessions`, lifecycle) | Postgres | Life of the account. | Account-deletion cascade. |
| **Deleted accounts** | everywhere | 30-day grace period after the user requests deletion (recoverable), then hard purge: every Storage object under the user's prefix is swept and the `auth.users` row is deleted, cascading every table keyed to it. | `/api/cron/data-retention` — `profiles.deleted_at < now() - 30 days`. |
| **Dormant accounts** | everywhere | No login for 24 months → surfaced in the retention cron log for review. Automatic deletion of dormant accounts is **not yet enabled** and needs product sign-off. | `/api/cron/data-retention` — report only. |
| **Operational logs** (`llm_cost_log`, `rate_limit_hits`, Sentry) | Postgres / Sentry | Per each system's own rolling window; contain no uploaded document content. | External + table TTLs. |

## Source-of-funds data — deliberately retained

E-2 petitions require the source and full path of investment funds to be
"traceable and identifiable" (9 FAM 402.9). The financial extraction schemas
therefore **do** capture: account holder name, institution names, account
types, balances, and the source-of-funds narrative. They do **not** capture
full account numbers — those are not needed, and the upload screen tells users
they may redact account-number digits before uploading. This retained data is
covered by the "extracted structured data" row above.

## Third-party sub-processors that see document content

| Sub-processor | What it receives | Arrangement |
|---|---|---|
| Google (Gemini 2.5 Pro) via OpenRouter | Full text of uploaded documents during field extraction | API — used for inference only; confirm zero-retention / no-training terms are in force before each renewal |
| Supabase | Stores the files and the database | DPA in place |
| Vercel | Hosts the app; requests transit its edge | DPA in place |

## Operational checklist

- `node scripts/verify-storage-buckets.mjs` — confirm document buckets are
  private. Run after any Supabase dashboard change and before each deploy.
- The `/api/cron/data-retention` run result is logged daily; a non-empty
  `errors` array on any sub-job (`accounts`, `files`, `identity`) needs
  investigation.
- `document_access_log` is the audit trail for every access to an uploaded
  document. Writes go through `src/lib/document-access-log.ts` (service role);
  reads are RLS-scoped to the owner.
- When the retention windows above change, update this file, the privacy
  policy, and the constants at the top of `src/app/api/cron/data-retention/route.ts`.
