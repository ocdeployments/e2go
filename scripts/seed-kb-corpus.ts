/**
 * Seed script — Case Intelligence Core, Faculty 2 (GROUND)
 *
 * Chunks + embeds the FULL E-2 knowledge corpus in docs/ into kb_chunks
 * (pgvector), so the CPU can retrieve doctrine on demand via match_kb().
 *
 * This is SEPARATE from seed-faq-kb-chunks.ts (which seeds only the 33-doc
 * FAQ subset into faq_kb_chunks). This script targets the whole corpus.
 *
 * Idempotent: re-running only re-embeds chunks whose content changed
 * (sha256 hash compare), and prunes chunks for files that shrank/were removed.
 *
 * Usage: npx tsx scripts/seed-kb-corpus.ts
 * Requires: OPENAI_API_KEY + Supabase service env in .env.local.
 *           Migration 20260630100000_case_intelligence_core.sql applied.
 */

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { WebSocket as WSPolyfill } from 'ws';
if (!globalThis.WebSocket) (globalThis as unknown as Record<string, unknown>).WebSocket = WSPolyfill;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const DOCS_DIR = join(process.cwd(), 'docs');
const BATCH_SIZE = 20;

const TARGET_CHUNK_TOKENS = 600;
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4; // realistic English-prose average; was 1.3 (~3x undersized chunks + inflated token_count)
const TARGET_CHARS = Math.round(TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN);
const OVERLAP_CHARS = Math.round(CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN);

// Meta / build-tracking docs that are NOT E-2 doctrine — exclude so they don't
// pollute doctrine retrieval. Edit freely. Matched by filename prefix.
const EXCLUDE_PREFIXES = [
  'BUILD_TRACKER', 'FEATURE_INVENTORY', 'IDEAS', 'DOC_INDEX',
  'COMPREHENSION_ENGINE_PLAN', 'SPRINT_', 'SESSION', 'DESIGN_REFERENCE',
  'CONTINUOUS_IMPROVEMENT', 'E2GO_MASTER_STRATEGY_PROMPT', // pricing/strategy, not case doctrine
  'FDD_COMPARISON_BUILD_PLAN', 'FDD_INTELLIGENCE_PLAN', // build plans, not doctrine
  'COMPLIANCE_CALENDAR_SPEC',
];

// Filename heuristics → dimension tag (optional, powers filtered retrieval).
const DIMENSION_RULES: { match: RegExp; dimension: string }[] = [
  { match: /Denial|Part4/i,                          dimension: 'denial' },
  { match: /Consulate/i,                             dimension: 'consulate' },
  { match: /crypto|RegisteredAccounts|SourceOfFunds/i, dimension: 'source_of_funds' },
  { match: /Franchise|FDD/i,                          dimension: 'franchise' },
  { match: /Interview/i,                              dimension: 'interview' },
  { match: /Partnership|partnerships/i,               dimension: 'partnership' },
  { match: /MaterialChange|Renewal/i,                 dimension: 'renewal' },
  { match: /NonStandardFamily|Family/i,               dimension: 'family' },
  { match: /Eligibility|Investment/i,                 dimension: 'investment' },
  { match: /Business/i,                               dimension: 'business_plan' },
];

function dimensionFor(file: string): string | null {
  for (const rule of DIMENSION_RULES) if (rule.match.test(file)) return rule.dimension;
  return null;
}

// ---------------------------------------------------------------------------
// Chunker — heading-aware with overlap (mirrors seed-faq-kb-chunks.ts)
// ---------------------------------------------------------------------------
interface Chunk {
  source_file: string;
  chunk_index: number;
  content: string;
  content_hash: string;
  dimension: string | null;
  token_count: number;
}

function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

// Hard safety net: OpenAI's embedding input cap is 8192 tokens. Real English
// prose runs ~3-4 chars/token, not the conservative 1.3 used for chunk sizing
// above — so cap force-split pieces well under the real limit regardless of
// how a doc is headed.
const HARD_MAX_CHARS = 20000;

function splitToSafeSize(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const paras = text.split(/\n\n+/);
  const pieces: string[] = [];
  let piece = '';
  for (const p of paras) {
    if (p.length > maxChars) {
      if (piece) { pieces.push(piece); piece = ''; }
      for (let i = 0; i < p.length; i += maxChars) pieces.push(p.slice(i, i + maxChars));
      continue;
    }
    if (piece.length + p.length > maxChars && piece.length > 0) {
      pieces.push(piece);
      piece = p;
    } else {
      piece += (piece ? '\n\n' : '') + p;
    }
  }
  if (piece) pieces.push(piece);
  return pieces;
}

function chunkDocument(filePath: string, sourceFile: string): Chunk[] {
  const content = readFileSync(filePath, 'utf-8');
  const dimension = dimensionFor(sourceFile);
  // Split on any heading level (#, ##, ###) — some docs use h1 as their real
  // section divider (e.g. "# PART 1 —"), not just h2.
  const sections = content.split(/(?=^#{1,3} )/m);
  const out: Chunk[] = [];
  let cur = '';
  let idx = 0;

  const push = (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 100) return;
    for (const piece of splitToSafeSize(trimmed, HARD_MAX_CHARS)) {
      out.push({
        source_file: sourceFile,
        chunk_index: idx++,
        content: piece,
        content_hash: sha256(piece),
        dimension,
        token_count: Math.round(piece.length / CHARS_PER_TOKEN),
      });
    }
  };

  for (const section of sections) {
    if (cur.length + section.length > TARGET_CHARS && cur.length > 0) {
      push(cur);
      const overlapStart = Math.max(0, cur.length - OVERLAP_CHARS);
      cur = cur.substring(overlapStart) + '\n\n' + section;
    } else {
      cur += (cur ? '\n\n' : '') + section;
    }
  }
  push(cur);
  return out;
}

// ---------------------------------------------------------------------------
// Embedding
// ---------------------------------------------------------------------------
async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!response.ok) throw new Error(`OpenAI embedding failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data.data
    .sort((a: { index: number }, b: { index: number }) => a.index - b.index)
    .map((item: { embedding: number[] }) => item.embedding);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  if (!OPENAI_API_KEY) { console.error('ERROR: OPENAI_API_KEY not set in .env.local'); process.exit(1); }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error('ERROR: Supabase env not set'); process.exit(1); }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Step 1 — chunk all knowledge docs
  const allMd = readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
  const kbFiles = allMd.filter((f) => !EXCLUDE_PREFIXES.some((p) => f.startsWith(p)));
  console.log(`📄 ${kbFiles.length} knowledge docs (excluded ${allMd.length - kbFiles.length} meta/build docs)`);

  let chunks: Chunk[] = [];
  for (const file of kbFiles) {
    const c = chunkDocument(join(DOCS_DIR, file), file);
    chunks.push(...c);
  }
  console.log(`📊 Total chunks: ${chunks.length}`);

  // Step 2 — idempotency: load existing (source_file, chunk_index) -> hash.
  // PostgREST caps responses at 1000 rows by default — paginate or the
  // orphan-prune step below silently stops seeing rows past row 1000.
  const existing = new Map<string, string>();
  {
    const PAGE = 1000;
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase
        .from('kb_chunks')
        .select('source_file, chunk_index, content_hash')
        .range(offset, offset + PAGE - 1);
      if (error) { console.error('ERROR fetching existing kb_chunks:', error.message); process.exit(1); }
      for (const r of data ?? []) existing.set(`${r.source_file}#${r.chunk_index}`, r.content_hash as string);
      if (!data || data.length < PAGE) break;
    }
  }

  const toUpsert = chunks.filter((c) => existing.get(`${c.source_file}#${c.chunk_index}`) !== c.content_hash);
  console.log(`🔁 ${toUpsert.length} new/changed chunks to embed (${chunks.length - toUpsert.length} unchanged, skipped)`);

  // Step 3 — embed only changed chunks
  const embeddings: number[][] = [];
  for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
    const batch = toUpsert.slice(i, i + BATCH_SIZE);
    embeddings.push(...await embedTexts(batch.map((c) => c.content)));
    console.log(`  embedded ${Math.min(i + BATCH_SIZE, toUpsert.length)}/${toUpsert.length}`);
    if (i + BATCH_SIZE < toUpsert.length) await new Promise((r) => setTimeout(r, 200));
  }

  // Step 4 — upsert changed chunks
  const INSERT_BATCH = 50;
  let upserted = 0;
  for (let i = 0; i < toUpsert.length; i += INSERT_BATCH) {
    const batch = toUpsert.slice(i, i + INSERT_BATCH);
    const emb = embeddings.slice(i, i + INSERT_BATCH);
    const rows = batch.map((c, j) => ({
      source_file: c.source_file,
      chunk_index: c.chunk_index,
      content: c.content,
      content_hash: c.content_hash,
      dimension: c.dimension,
      token_count: c.token_count,
      embedding: JSON.stringify(emb[j]),
    }));
    const { error } = await supabase.from('kb_chunks').upsert(rows, { onConflict: 'source_file,chunk_index' });
    if (!error) {
      upserted += rows.length;
      continue;
    }
    console.error(`  ❌ batch upsert failed at ${i} (code=${error.code}): ${error.message}${error.details ? ` | details: ${error.details}` : ''}${error.hint ? ` | hint: ${error.hint}` : ''}`);
    console.error(`     retrying batch one row at a time to isolate the bad row...`);
    for (const row of rows) {
      const { error: rowError } = await supabase.from('kb_chunks').upsert([row], { onConflict: 'source_file,chunk_index' });
      if (rowError) {
        console.error(`  ❌ row ${row.source_file}#${row.chunk_index} (${row.content.length} chars) failed (code=${rowError.code}): ${rowError.message}${rowError.details ? ` | details: ${rowError.details}` : ''}`);
      } else {
        upserted += 1;
      }
    }
  }
  console.log(`✅ Upserted ${upserted} chunks`);

  // Step 5 — prune orphans (files that shrank or were removed/excluded)
  const liveKeys = new Set(chunks.map((c) => `${c.source_file}#${c.chunk_index}`));
  const orphans = [...existing.keys()].filter((k) => !liveKeys.has(k));
  if (orphans.length) {
    for (const key of orphans) {
      const [sf, ci] = key.split('#');
      await supabase.from('kb_chunks').delete().eq('source_file', sf).eq('chunk_index', Number(ci));
    }
    console.log(`🧹 Pruned ${orphans.length} orphan chunks`);
  }

  const { count } = await supabase.from('kb_chunks').select('*', { count: 'exact', head: true });
  console.log(`\n🎉 kb_chunks now holds ${count} rows.`);
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
