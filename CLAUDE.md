## MANDATORY: Read ~/.claude/CLAUDE.md before anything else.
## All global MCP servers are active. Use them per standing orders.

## THIS PROJECT: e2go.app
## Full context lives in these files — read them in order:
## 1. CLAUDE_CONTEXT.md
## 2. BUILD_TRACKER.md
## 3. docs/DESIGN_REFERENCE.html (before any UI work)
## 4. docs/Session_Handoff_June2_MASTER.docx (master decisions)

## QUICK REFERENCE — LOCKED DECISIONS
## Design: Obsidian Gold (#0a0a0a / #C9A84C / Cormorant Garamond / DM Sans)
## Form UX: Category-based layout. Never one-question-at-a-time in Module 3.
## Cover letter: DRAFT Step 1, FINALISE Step 15.
## Voice profile: Pass raw writing sample directly. No JSON extraction.
## Branch: dev — never commit directly to main.
## Build must be clean before every push: npm run build

## DATABASE — the live Supabase schema is the ONLY source of truth.
## Not docs/schema_complete.sql. Not the migration files. Both are known to
## disagree with production: `CREATE TABLE IF NOT EXISTS` silently no-ops
## against a pre-existing table of a different shape, so a migration can
## report success and change nothing. Verify column names against the live
## database before writing or changing any query:
##   set -a && . ./.env.local; set +a && python3 scripts/audit-schema-drift.py --refresh
##
## ALWAYS read the error from a Supabase call. supabase-js does not throw —
## it returns { data, error }. A query naming a column that does not exist
## returns data: null plus a 42703 error, and if nothing reads that error the
## failure is indistinguishable from an empty result. This is how 44 broken
## queries shipped undetected. See docs/SPRINT_S_SCHEMA_DRIFT.md.
