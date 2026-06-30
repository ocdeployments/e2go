/**
 * Case Intelligence Core — Faculty 2 (GROUND)
 *
 * Typed retrieval over the full E-2 doctrine corpus (kb_chunks, 177 docs),
 * embedded by scripts/seed-kb-corpus.ts. The CPU calls retrieveDoctrine() to
 * ground its reasoning in the law + our research instead of generic training.
 *
 * Server-only (uses the service-role Supabase client + OPENAI_API_KEY).
 * Mirrors the embedding pattern in generation-engine.ts:fetchFAQKBContext.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { WebSocket as WSPolyfill } from 'ws';

// Node <22 has no native WebSocket; @supabase/supabase-js's RealtimeClient
// constructor throws without one even though this module never uses realtime.
if (!globalThis.WebSocket) (globalThis as unknown as Record<string, unknown>).WebSocket = WSPolyfill;

const EMBEDDING_MODEL = 'text-embedding-3-small';

export interface DoctrineChunk {
  id: string;
  sourceFile: string;
  content: string;
  dimension: string | null;
  similarity: number;
}

let _client: SupabaseClient | null = null;
function serviceClient(): SupabaseClient {
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  return _client;
}

async function embedQuery(query: string): Promise<number[] | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: query }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { embedding: number[] }[] };
  return json.data?.[0]?.embedding ?? null;
}

interface MatchKbRow {
  id: string;
  source_file: string;
  content: string;
  dimension: string | null;
  similarity: number;
}

/**
 * Retrieve the most relevant doctrine chunks for a natural-language query.
 *
 * @param query        what the CPU wants to know (e.g. "rebut marginality for a low-revenue consulting startup")
 * @param options.dimension  optional filter — only retrieve chunks tagged with this dimension
 *                           (denial | consulate | source_of_funds | franchise | interview | ...)
 * @param options.matchCount number of chunks to return (default 6)
 * @param options.minSimilarity drop chunks below this cosine similarity (default 0 = keep all returned)
 *
 * Returns [] gracefully when OPENAI_API_KEY is missing, the corpus is empty,
 * or the RPC errors — callers should treat empty as "no grounding available."
 */
export async function retrieveDoctrine(
  query: string,
  options: { dimension?: string; matchCount?: number; minSimilarity?: number } = {}
): Promise<DoctrineChunk[]> {
  const { dimension, matchCount = 6, minSimilarity = 0 } = options;
  try {
    const embedding = await embedQuery(query);
    if (!embedding) return [];

    const { data, error } = await serviceClient().rpc('match_kb', {
      query_embedding: JSON.stringify(embedding),
      match_count: matchCount,
      filter_dimension: dimension ?? null,
    });
    if (error || !data) return [];

    return (data as MatchKbRow[])
      .filter((r) => r.similarity >= minSimilarity)
      .map((r) => ({
        id: r.id,
        sourceFile: r.source_file,
        content: r.content,
        dimension: r.dimension,
        similarity: r.similarity,
      }));
  } catch {
    return [];
  }
}

/**
 * Convenience: format retrieved chunks into a citation-tagged block for an LLM
 * prompt. Each chunk is prefixed with [KB:source_file#id] so the CPU's output
 * can cite its grounding (hard boundary: every strategic claim cites a chunk).
 */
export function formatDoctrineForPrompt(chunks: DoctrineChunk[]): string {
  if (chunks.length === 0) return '';
  return chunks
    .map((c) => `[KB:${c.sourceFile} · sim ${c.similarity.toFixed(2)}]\n${c.content}`)
    .join('\n\n---\n\n');
}
