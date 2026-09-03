/**
 * POST /api/faq/ask — Public AI Q&A for E-2 visa questions
 * Session 11: Ask e2go FAQ
 *
 * No auth required. Three-layer retrieval:
 *   Layer 1: pgvector cosine similarity against faq_qa_corpus (pre-answered Q&A)
 *   Layer 2: pgvector against faq_kb_chunks (broader knowledge base)
 *   Layer 3: Model's own knowledge (fallback, scoped by system prompt)
 *
 * Streaming response via OpenRouter (google/gemini-2.5-flash).
 */

import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rate-limit";
import { isKillSwitchEnabled } from "@/lib/kill-switch";
import { buildFaqPrompt } from "@/lib/faq-system-prompt";
import { captureApiError } from "@/lib/capture-error";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const FAQ_MODEL = "google/gemini-2.5-flash";
const EMBEDDING_MODEL = "text-embedding-3-small";
const LAYER1_THRESHOLD = 0.80; // cosine similarity threshold for corpus match
const MAX_QUERY_LENGTH = 500;

// Inappropriate content guard — checked before any API call
const INAPPROPRIATE_PATTERNS = [
  /\b(sex|porn|nude|naked|fuck|shit|ass|bitch|cunt|dick|cock|pussy|rape|kill|murder|suicide|bomb|terrorist|drug|cocaine|heroin|meth|launder|money.?launder)\b/i,
];

function isInappropriate(query: string): boolean {
  return INAPPROPRIATE_PATTERNS.some((p) => p.test(query));
}

// E-2/immigration keyword heuristic for scope guard
const E2_KEYWORDS = [
  "e-2", "e2", "e visa", "e-visa", "treaty investor", "investor visa",
  "treaty country", "investment", "visa", "immigration", "uscis",
  "consulate", "embassy", "ds-160", "ds-156e", "i-129",
  "change of status", "cos", "nonimmigrant", "non-immigrant",
  "spouse", "dependents", "children", "family",
  "business plan", "franchise", "enterprise",
  "renewal", "extension", "green card", "permanent residence",
  "denial", "refusal", "overstay", "violation",
  "canada", "canadian", "toronto",
  "substantial", "at risk", "source of funds",
  "qualif", "eligib", "require", "process", "appli",
  "work", "employ", "hire", "staff",
  "tax", "filing", "return",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Scope guard — quick heuristic to check if query is plausibly E-2 related.
 * Near-free check before any expensive API calls.
 */
function isE2Related(query: string): boolean {
  const lower = query.toLowerCase();
  return E2_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Embed a single text using OpenAI text-embedding-3-small
 */
async function embedQuery(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Layer 1: Search faq_qa_corpus by cosine similarity
 */
async function searchCorpus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  embedding: number[]
): Promise<{ answer: string; sources: string; similarity: number; question_id: string } | null> {
  // The RPC can also reject outright (e.g. PGRST202 when the search functions
  // are missing from the schema cache), so catch as well as check `error` —
  // retrieval must never take the endpoint down, only degrade to Layer 3.
  let data: { id: string; answer: string; sources: string | null; similarity: number }[] | null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (supabase as any).rpc("match_faq_corpus", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: LAYER1_THRESHOLD,
      match_count: 1,
    });
    if (res.error) {
      captureApiError(res.error, { route: 'faq/ask', stage: 'layer1-corpus-search' });
      return null;
    }
    data = res.data;
  } catch (err) {
    captureApiError(err, { route: 'faq/ask', stage: 'layer1-corpus-search' });
    return null;
  }

  if (!data || data.length === 0) return null;

  const match = data[0];
  return {
    answer: match.answer,
    sources: match.sources || "",
    similarity: match.similarity,
    question_id: match.id,
  };
}

/**
 * Layer 2: Search faq_kb_chunks by cosine similarity
 */
async function searchKB(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  embedding: number[]
): Promise<string[] | null> {
  // Same contract as searchCorpus: a failing lookup degrades, never throws out.
  let data: { chunk_text: string }[] | null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (supabase as any).rpc("match_faq_kb", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.65,
      match_count: 3,
    });
    if (res.error) {
      captureApiError(res.error, { route: 'faq/ask', stage: 'layer2-kb-search' });
      return null;
    }
    data = res.data;
  } catch (err) {
    captureApiError(err, { route: 'faq/ask', stage: 'layer2-kb-search' });
    return null;
  }

  if (!data || data.length === 0) return null;

  return data.map((row: { chunk_text: string }) => row.chunk_text);
}

/**
 * Stream generation via OpenRouter (primary)
 */
async function streamViaOpenRouter(
  systemPrompt: string,
  userPrompt: string,
  model: string = FAQ_MODEL
): Promise<ReadableStream> {
  const encoder = new TextEncoder();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "e2go.app",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
      // This route forwards only delta.content. A reasoning model would
      // otherwise spend seconds streaming reasoning deltas we drop on the
      // floor, delaying the first visible token.
      reasoning: { enabled: false },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenRouter generation failed (${response.status}): ${err}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

const FAQ_FALLBACK_MODEL = "xiaomi/mimo-v2.5";

/**
 * Stream generation — primary: gemini-2.5-flash, fallback: mimo-v2.5.
 * Ordered by time-to-first-token: mimo is a reasoning model whose reasoning
 * deltas this route discards, so it stalls ~5s before emitting any answer.
 * Both via OpenRouter. ANTHROPIC_API_KEY is never used here.
 */
async function streamGeneration(
  systemPrompt: string,
  userPrompt: string
): Promise<ReadableStream> {
  try {
    return await streamViaOpenRouter(systemPrompt, userPrompt);
  } catch (err) {
    console.warn("[faq/ask] Primary model failed, falling back to", FAQ_FALLBACK_MODEL, "—", err instanceof Error ? err.message : err);
    return await streamViaOpenRouter(systemPrompt, userPrompt, FAQ_FALLBACK_MODEL);
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    // ---- Rate limit ----
    const ip = getClientIp(req);
    const rateResult = await checkRateLimit(ip);

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limited",
          message:
            "You've asked a lot of questions! Take a look at our eligibility quiz for a fuller picture, or try again in a few minutes.",
          showCTA: true,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(rateResult.reset),
          },
        }
      );
    }

    if (await isKillSwitchEnabled()) {
      return Response.json({ error: 'service_unavailable', message: 'AI features are temporarily unavailable. Please try again shortly.' }, { status: 503 });
    }

    // ---- Parse body ----
    let body: Record<string, unknown>;
    try {
      body = await req.json() as Record<string, unknown>;
    } catch {
      return Response.json({ error: 'invalid_json', message: 'Request body is not valid JSON.' }, { status: 400 });
    }
    const query: string = ((body.query as string) || "").trim();

    if (!query) {
      return Response.json({ error: "missing_query" }, { status: 400 });
    }

    if (query.length > MAX_QUERY_LENGTH) {
      return Response.json(
        { error: "query_too_long", max: MAX_QUERY_LENGTH },
        { status: 400 }
      );
    }

    // ---- Inappropriate content guard (checked first, before scope check) ----
    if (isInappropriate(query)) {
      return Response.json({
        answer: "I'm only able to help with E-2 visa questions.",
        layer: "inappropriate_guard",
      });
    }

    // ---- Scope guard ----
    if (!isE2Related(query)) {
      return Response.json({
        answer:
          "I'm focused on E-2 visa questions — happy to help with anything in that space! Try asking about investment requirements, treaty countries, or the application process.",
        showCTA: true,
        layer: "scope_guard",
      });
    }

    // ---- Supabase (service role) ----
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ---- Embed query ----
    let embedding: number[];
    try {
      embedding = await embedQuery(query);
    } catch (err) {
      captureApiError(err, { route: 'faq/ask', stage: 'embedding' });
      // If embedding fails, fall through to Layer 3 (model knowledge)
      embedding = [];
    }

    // ---- Layer 1: Corpus search ----
    let context: { answer: string; sources: string } | { chunks: string[] } | null = null;
    let matchedLayer = "fallback";
    let matchedQuestionId: string | null = null;
    let similarityScore: number | null = null;

    if (embedding.length > 0) {
      const corpusMatch = await searchCorpus(supabase, embedding);
      if (corpusMatch) {
        context = { answer: corpusMatch.answer, sources: corpusMatch.sources };
        matchedLayer = "corpus";
        matchedQuestionId = corpusMatch.question_id;
        similarityScore = corpusMatch.similarity;
      } else {
        // ---- Layer 2: KB search ----
        const kbChunks = await searchKB(supabase, embedding);
        if (kbChunks && kbChunks.length > 0) {
          context = { chunks: kbChunks };
          matchedLayer = "kb";
        }
      }
    }

    // ---- Build prompt and stream ----
    const { system, user } = buildFaqPrompt(query, context);

    const stream = await streamGeneration(system, user);

    // ---- Log query (async, fire-and-forget) ----
    supabase
      .from("faq_query_log")
      .insert({
        query_text: query,
        matched_layer: matchedLayer,
        matched_question_id: matchedQuestionId,
        similarity_score: similarityScore,
      })
      .then(
        ({ error }) => {
          if (error) captureApiError(error, { route: 'faq/ask', stage: 'query-log' });
        },
        // PostgrestBuilder is a PromiseLike without .catch — the rejection
        // handler has to be the second argument or it goes unhandled.
        (err: unknown) => {
          captureApiError(err, { route: 'faq/ask', stage: 'query-log' });
        }
      );

    // ---- Return streaming response ----
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "X-FAQ-Layer": matchedLayer,
      },
    });
  } catch (err) {
    captureApiError(err, { route: 'faq/ask' });
    return Response.json(
      {
        error: "internal_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
