#!/bin/sh
# QA helper — (re)build the isolated QA instance from the current repo state.
#
#   sh scripts/qa/setup-scratch.sh <scratch-dir>
#
# 1. rsync the repo into <scratch-dir> (no .git, no node_modules, no env files, no docs/tests)
# 2. symlink the repo's node_modules (read-only use)
# 3. derive an isolated .env.local (no Sentry/Upstash/Resend/LLM; Turnstile always-pass keys) — never printed
# 4. add the in-page harness + collector route to the SCRATCH copy only
# 5. production build (own .next) — the repo's .next / dev server are never touched
#
# Start it afterwards with the `qa-scratch` config in .claude/launch.json (port 3020, loopback only).
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SCRATCH="${1:-}"
if [ -z "$SCRATCH" ]; then echo "usage: sh scripts/qa/setup-scratch.sh <scratch-dir>" >&2; exit 1; fi
mkdir -p "$SCRATCH"
SCRATCH="$(cd "$SCRATCH" && pwd)"
if [ "$SCRATCH" = "$ROOT" ]; then echo "refusing: scratch dir is the repo" >&2; exit 1; fi

# Root-level clutter is anchored with a leading "/" so app assets under public/ (which include .png files) are still copied.
rsync -a --delete \
  --exclude '.git' --exclude '.next' --exclude 'node_modules' --exclude '.env*' --exclude '.vercel' \
  --exclude 'docs' --exclude 'tests' --exclude 'test-results' --exclude 'playwright-report' \
  --exclude '.claude' --exclude 'qa-results.ndjson' --exclude '*.log' --exclude '.DS_Store' \
  --exclude '/*.png' --exclude '/.playwright-mcp' --exclude '/.lazyweb' --exclude '/.swc' --exclude '/.husky' \
  --exclude '/docx-output' --exclude '/docx-verification-output' --exclude '/e2go-test' --exclude '/screenshots' \
  --exclude '/scratchpad' --exclude '/demo-studio' --exclude '/supabase/.temp' --exclude '/scripts/qa' \
  "$ROOT/" "$SCRATCH/"

ln -sfn "$ROOT/node_modules" "$SCRATCH/node_modules"
node "$ROOT/scripts/qa/make-qa-env.mjs" "$SCRATCH" >/dev/null
node "$ROOT/scripts/qa/patch-scratch.mjs" "$SCRATCH"

cd "$SCRATCH"
NEXT_TELEMETRY_DISABLED=1 node node_modules/next/dist/bin/next build
echo "scratch build OK: $SCRATCH"
