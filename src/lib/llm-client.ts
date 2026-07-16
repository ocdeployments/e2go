/**
 * Shared LLM client with two-provider fallback:
 * Layer 1 — OpenRouter with per-task models array (handles model-level fallback)
 * Layer 2 — Anthropic direct (different provider entirely)
 *
 * Security rule: ANTHROPIC_API_KEY is only used here and in generation-engine.ts.
 * NEVER route simulator/FAQ calls through OpenRouter with Anthropic models.
 *
 * Cost logging: every successful call writes one row to llm_cost_log (fire-and-forget).
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/nextjs';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type TaskType = 'evaluate' | 'coaching' | 'faq' | 'prep' | 'extract' | 'general';

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  task: TaskType;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  signal?: AbortSignal;
  userId?: string;
  route?: string;
  timeoutMs?: number;
}

// Per-task model chains — OpenRouter tries each in order on failure.
// Tier 3 (evaluate/coaching/prep — Simulator, Gap Analysis, field-quality):
// mimo-v2.5 stays first since these are high-volume interactive calls where
// cost compounds fast; GLM 5.2 and the Anthropic sonnet-4-6 fallback below
// only fire when mimo fails, so the cheap path stays the common case.
const OPENROUTER_MODELS: Record<TaskType, string[]> = {
  evaluate: ['xiaomi/mimo-v2.5', 'z-ai/glm-5.2'],
  coaching: ['xiaomi/mimo-v2.5', 'z-ai/glm-5.2'],
  faq:      ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash'],
  prep:     ['xiaomi/mimo-v2.5', 'z-ai/glm-5.2'],
  extract:  ['google/gemini-2.5-pro', 'z-ai/glm-5.2'],
  // Generic assistant route (cover-letter drafts, follow-up question/summary
  // generation) — GLM 5.2 primary, mimo-v2.5 as the OpenRouter fallback.
  general:  ['z-ai/glm-5.2', 'xiaomi/mimo-v2.5'],
};

// Anthropic fallback models per task
const ANTHROPIC_MODELS: Record<TaskType, string> = {
  evaluate: 'claude-sonnet-4-6',
  coaching: 'claude-sonnet-4-6',
  faq:      'claude-haiku-4-5-20251001',
  prep:     'claude-sonnet-4-6',
  extract:  'claude-haiku-4-5-20251001',
  general:  'claude-sonnet-4-6',
};

// Reasoning models (e.g. gemini-2.5-pro) deduct hidden "thinking" tokens from
// the same max_tokens budget as the visible answer, and some OpenRouter
// endpoints make reasoning mandatory (cannot be disabled). Without headroom,
// a small max_tokens budget gets consumed entirely by reasoning and the
// model returns empty content — this silently broke document extraction
// (max_tokens: 20 for type detection could never produce output). Every
// OpenRouter call reserves this much extra budget for reasoning, capped via
// the `reasoning` param so it can't run away either; non-reasoning models
// ignore the field.
const REASONING_TOKEN_BUDGET = 1500;

// Per-task request timeout. Document extraction budgets more headroom
// (larger prompts, reasoning-capped models) than short simulator calls.
const DEFAULT_TIMEOUT_MS: Record<TaskType, number> = {
  evaluate: 30_000,
  coaching: 30_000,
  faq:      30_000,
  prep:     30_000,
  extract:  45_000,
  general:  30_000,
};

// Model pricing: USD per 1M tokens (input / output). Verified June 17, 2026.
const MODEL_COSTS: Record<string, { in: number; out: number }> = {
  'xiaomi/mimo-v2.5':          { in: 0.14,  out: 0.28  },
  'xiaomi/mimo-v2.5-pro':      { in: 0.435, out: 0.87  },
  'z-ai/glm-5.2':              { in: 1.30,  out: 1.85  },
  'google/gemini-2.5-flash':   { in: 0.30,  out: 2.50  },
  'google/gemini-2.5-pro':     { in: 1.25,  out: 10.00 },
  'claude-haiku-4-5-20251001': { in: 0.80,  out: 4.00  },
  'claude-sonnet-4-6':         { in: 3.00,  out: 15.00 },
  // Pricing unverified — claude-sonnet-5 has no published rate card yet.
  // Reusing sonnet-4-6 rates as a placeholder; correct this in llm_cost_log
  // once Anthropic publishes actual pricing for this model.
  'claude-sonnet-5':           { in: 3.00,  out: 15.00 },
  'claude-opus-4-8':           { in: 15.00, out: 75.00 },
};

function calcCost(model: string, tokensIn: number, tokensOut: number): number {
  const rates = MODEL_COSTS[model];
  if (!rates) return 0;
  return (tokensIn * rates.in + tokensOut * rates.out) / 1_000_000;
}

function logCost(entry: {
  userId?: string;
  task: string;
  route?: string;
  provider: string;
  model: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  latencyMs: number;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fire-and-forget — never block the main response path
  supabase.from('llm_cost_log').insert({
    user_id:    entry.userId  ?? null,
    task:       entry.task,
    route:      entry.route   ?? null,
    provider:   entry.provider,
    model:      entry.model,
    tokens_in:  entry.tokensIn,
    tokens_out: entry.tokensOut,
    cost_usd:   entry.costUsd,
    latency_ms: entry.latencyMs,
  }).then(() => {}, () => {});
}

// Calls a single OpenRouter model. Loops in callOpenRouter() below so a
// model returning HTTP 200 with empty content (e.g. reasoning starvation)
// is treated as a failure and advances to the next model — OpenRouter's own
// built-in `models` array fallback only triggers on hard errors, not on a
// technically-successful-but-empty response, which is exactly the failure
// mode that silently broke document extraction.
interface LLMResult {
  content: string;
  model: string;
}

async function callOpenRouterModel(model: string, options: LLMOptions, timeoutMsOverride?: number): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    timeoutMsOverride ?? options.timeoutMs ?? DEFAULT_TIMEOUT_MS[options.task]
  );

  // Compose with any caller-supplied signal
  const onExternalAbort = () => timeoutController.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutId);
      timeoutController.abort();
    } else {
      options.signal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const contentBudget = options.max_tokens ?? 700;
  const t0 = Date.now();
  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer':  'https://e2go.app',
        'X-Title':       'e2go Interview Simulator',
      },
      body: JSON.stringify({
        model,
        messages:    options.messages,
        temperature: options.temperature ?? 0.3,
        // Total budget must cover hidden reasoning tokens PLUS the visible
        // answer — see REASONING_TOKEN_BUDGET comment above.
        max_tokens:  contentBudget + REASONING_TOKEN_BUDGET,
        reasoning:   { max_tokens: REASONING_TOKEN_BUDGET },
        stream:      false,
      }),
      signal: timeoutController.signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${response.status} (${model})${errBody ? `: ${errBody.slice(0, 300)}` : ''}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`OpenRouter returned empty content (${model}, finish_reason=${data.choices?.[0]?.finish_reason ?? 'unknown'})`);

    const resolvedModel = data.model ?? model;
    const tokensIn  = data.usage?.prompt_tokens     ?? 0;
    const tokensOut = data.usage?.completion_tokens ?? 0;
    logCost({
      userId: options.userId, task: options.task, route: options.route,
      provider: 'openrouter', model: resolvedModel, tokensIn, tokensOut,
      costUsd: calcCost(resolvedModel, tokensIn, tokensOut),
      latencyMs: Date.now() - t0,
    });

    return { content, model: resolvedModel };
  } finally {
    clearTimeout(timeoutId);
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

// Tries every model in the task's OpenRouter chain in order, falling
// through on any failure (HTTP error, timeout, or empty content).
async function callOpenRouter(options: LLMOptions, deadline: number): Promise<LLMResult> {
  const models = OPENROUTER_MODELS[options.task];
  let lastErr: unknown = new Error('No OpenRouter models configured');

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const message = `Deadline exceeded before trying ${model} (task=${options.task})`;
      lastErr = new Error(message);
      console.warn(`[llm-client] ${message}`);
      break;
    }
    // Cap each attempt to the task's baseline timeout so one slow model
    // can't consume the whole remaining deadline and starve the rest of
    // the chain (see callLLMWithMeta for the shared deadline).
    const attemptTimeout = Math.min(options.timeoutMs ?? DEFAULT_TIMEOUT_MS[options.task], remaining);
    try {
      return await callOpenRouterModel(model, options, attemptTimeout);
    } catch (err) {
      lastErr = err;
      console.warn(`[llm-client] ${model} failed for task=${options.task}:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastErr;
}

async function callAnthropicModel(
  model: string,
  options: { messages: LLMMessage[]; max_tokens?: number; task: string; userId?: string; route?: string; timeoutMs?: number; signal?: AbortSignal },
): Promise<LLMResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });

  const systemMsg       = options.messages.find(m => m.role === 'system')?.content ?? '';
  const conversationMsgs = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const t0 = Date.now();
  // Without an explicit timeout the SDK defaults to 10 minutes (plus
  // retries) — that silently turned "all providers failed" into "hangs
  // for minutes" whenever this fallback fired. See callAnthropic below.
  const response = await anthropic.messages.create(
    {
      model,
      max_tokens: options.max_tokens ?? 700,
      system:     systemMsg || undefined,
      messages:   conversationMsgs,
    },
    { timeout: options.timeoutMs, signal: options.signal },
  );

  // Content can include non-text blocks first (e.g. extended-thinking blocks
  // on reasoning-capable models) — take the first text block, not index 0.
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!textBlock) throw new Error('Anthropic returned no text block');

  const tokensIn  = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  logCost({
    userId: options.userId, task: options.task, route: options.route,
    provider: 'anthropic', model, tokensIn, tokensOut,
    costUsd: calcCost(model, tokensIn, tokensOut),
    latencyMs: Date.now() - t0,
  });

  return { content: textBlock.text, model };
}

async function callAnthropic(options: LLMOptions, deadline: number): Promise<LLMResult> {
  // Give the fallback a working floor even if the OpenRouter chain consumed
  // most of the overall deadline — handing it ~0ms just guarantees failure.
  const timeoutMs = Math.max(deadline - Date.now(), 15_000);
  return callAnthropicModel(ANTHROPIC_MODELS[options.task], { ...options, timeoutMs });
}

// ============================================================================
// FDD analysis chain — Anthropic-primary (Opus is the whole point: FDD
// extraction/scoring/report/territory/questions all read dense, high-stakes
// documents where a wrong number is a real legal-risk surface, unlike the
// static Word-doc pipeline). Falls through Opus -> Sonnet -> GLM 5.2 so a
// single provider outage or an Opus rate-limit doesn't take FDD analysis
// down entirely.
// ============================================================================
// 'fdd' isn't a TaskType, so DEFAULT_TIMEOUT_MS has no entry for it —
// callAnthropicModel must get an explicit timeoutMs or the SDK rejects the
// request ('timeout' in options with value undefined fails validation).
const FDD_TIMEOUT_MS = 120_000;

const FDD_CHAIN = ['claude-opus-4-8', 'claude-sonnet-5'] as const;
const FDD_OPENROUTER_FALLBACK = 'z-ai/glm-5.2';
// Final fallback after Opus, Sonnet 5, and GLM 5.2 have all failed — an
// extra Anthropic tier so a GLM outage doesn't take the whole chain down.
const FDD_FINAL_ANTHROPIC_FALLBACK = 'claude-sonnet-4-6';

export interface FddCallOptions {
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
  route?: string;
  userId?: string;
}

/**
 * Call the FDD analysis chain: claude-opus-4-8 -> claude-sonnet-5 -> z-ai/glm-5.2 (OpenRouter) -> claude-sonnet-4-6.
 * Returns the model's text response and which model produced it, or null if every tier fails.
 */
export async function callFDDModel(options: FddCallOptions): Promise<LLMResult | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  for (const model of FDD_CHAIN) {
    try {
      return await callAnthropicModel(model, {
        messages, max_tokens: options.max_tokens, task: 'fdd',
        userId: options.userId, route: options.route, timeoutMs: FDD_TIMEOUT_MS,
      });
    } catch (err) {
      console.warn(`[llm-client] ${model} failed for task=fdd:`, err instanceof Error ? err.message : err);
    }
  }

  try {
    const result = await callOpenRouterModel(FDD_OPENROUTER_FALLBACK, {
      task: 'extract', // reuses the 'extract' timeout/reasoning budget — closest existing profile for dense-document analysis
      messages,
      temperature: options.temperature,
      max_tokens: options.max_tokens,
      userId: options.userId,
      route: options.route,
    });
    console.info('[llm-client] GLM 5.2 fallback succeeded for task=fdd');
    return result;
  } catch (err) {
    console.warn('[llm-client] GLM 5.2 fallback failed for task=fdd:', err instanceof Error ? err.message : err);
  }

  try {
    const result = await callAnthropicModel(FDD_FINAL_ANTHROPIC_FALLBACK, {
      messages, max_tokens: options.max_tokens, task: 'fdd',
      userId: options.userId, route: options.route, timeoutMs: FDD_TIMEOUT_MS,
    });
    console.info('[llm-client] Sonnet 4.6 final fallback succeeded for task=fdd');
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[llm-client] All FDD chain tiers failed:', message);
    Sentry.captureException(err, { extra: { task: 'fdd', route: options.route } });
  }

  return null;
}

// ============================================================================
// Generic tiered chain for the CIC / comprehension pipeline. These engines
// used to all share the 'extract' TaskType chain regardless of how much a
// mistake there actually costs — Case Intelligence Core (decides the case
// theory everything else inherits) was on the same chain as CIC Verifier
// (a QC pass over already-generated text). Split by actual importance:
//   Tier 1 — claude-opus-4-8 -> claude-sonnet-5 -> z-ai/glm-5.2 -> claude-sonnet-4-6
//   Tier 2 — claude-sonnet-5 -> z-ai/glm-5.2 -> claude-sonnet-4-6
// ============================================================================
const TIER1_ANTHROPIC_CHAIN = ['claude-opus-4-8', 'claude-sonnet-5'] as const;
const TIER2_ANTHROPIC_CHAIN = ['claude-sonnet-5'] as const;
const TIER_OPENROUTER_FALLBACK = 'z-ai/glm-5.2';
const TIER_FINAL_ANTHROPIC_FALLBACK = 'claude-sonnet-4-6';

export interface TieredCallOptions {
  system: string;
  user: string;
  max_tokens?: number;
  timeoutMs?: number;
  route?: string;
  userId?: string;
  task: string; // label only — used for cost-log attribution and the OpenRouter reasoning/timeout profile
}

async function callTieredChain(
  options: TieredCallOptions,
  anthropicChain: readonly string[],
): Promise<string | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  for (const model of anthropicChain) {
    try {
      const result = await callAnthropicModel(model, {
        messages, max_tokens: options.max_tokens, task: options.task,
        userId: options.userId, route: options.route, timeoutMs: options.timeoutMs,
      });
      return result.content;
    } catch (err) {
      console.warn(`[llm-client] ${model} failed for task=${options.task}:`, err instanceof Error ? err.message : err);
    }
  }

  try {
    const result = await callOpenRouterModel(TIER_OPENROUTER_FALLBACK, {
      task: 'extract', // reuses the 'extract' reasoning/timeout profile
      messages,
      max_tokens: options.max_tokens,
      userId: options.userId,
      route: options.route,
      timeoutMs: options.timeoutMs,
    });
    console.info(`[llm-client] GLM 5.2 fallback succeeded for task=${options.task}`);
    return result.content;
  } catch (err) {
    console.warn(`[llm-client] GLM 5.2 fallback failed for task=${options.task}:`, err instanceof Error ? err.message : err);
  }

  try {
    const result = await callAnthropicModel(TIER_FINAL_ANTHROPIC_FALLBACK, {
      messages, max_tokens: options.max_tokens, task: options.task,
      userId: options.userId, route: options.route, timeoutMs: options.timeoutMs,
    });
    console.info(`[llm-client] Sonnet 4.6 final fallback succeeded for task=${options.task}`);
    return result.content;
  } catch (err) {
    console.error(`[llm-client] All chain tiers failed (task=${options.task}):`, err instanceof Error ? err.message : err);
    Sentry.captureException(err, { extra: { task: options.task, route: options.route } });
  }

  return null;
}

/** Tier 1: claude-opus-4-8 -> claude-sonnet-5 -> z-ai/glm-5.2 -> claude-sonnet-4-6. */
export async function callTier1Model(options: TieredCallOptions): Promise<string | null> {
  return callTieredChain(options, TIER1_ANTHROPIC_CHAIN);
}

/** Tier 2: claude-sonnet-5 -> z-ai/glm-5.2 -> claude-sonnet-4-6. */
export async function callTier2Model(options: TieredCallOptions): Promise<string | null> {
  return callTieredChain(options, TIER2_ANTHROPIC_CHAIN);
}

// ============================================================================
// Document-generation fallback chain — non-business-plan documents only.
// Opus (with Anthropic prompt caching) stays primary inside
// generation-engine.ts; this chain only runs after both Opus attempts fail.
// business_plan must NEVER reach this chain: the June 2026 eval showed
// glm-5.2 produces ~half the required business-plan length and mimo fails
// outright, so business plans fail loudly rather than ship degraded.
// Gift-letter-class documents passed on all three OpenRouter model families.
// ============================================================================
const DOCGEN_FALLBACK_CHAIN = [
  'z-ai/glm-5.2',
  'xiaomi/mimo-v2.5',
  'xiaomi/mimo-v2.5-pro',
  'google/gemini-2.5-pro',
];

// Long-form documents need far more generation time than the per-task
// simulator timeouts allow.
const DOCGEN_TIMEOUT_MS = 120_000;

export interface DocGenFallbackOptions {
  system: string;
  user: string;
  max_tokens?: number;
  temperature?: number;
  route?: string;
  userId?: string;
}

/**
 * OpenRouter fallback for document generation when Anthropic is unavailable:
 * z-ai/glm-5.2 -> xiaomi/mimo-v2.5 -> xiaomi/mimo-v2.5-pro -> google/gemini-2.5-pro.
 * Returns the model's text response and which model produced it, or null if
 * every model fails.
 */
export async function callDocGenFallback(options: DocGenFallbackOptions): Promise<LLMResult | null> {
  const messages: LLMMessage[] = [
    { role: 'system', content: options.system },
    { role: 'user', content: options.user },
  ];

  for (const model of DOCGEN_FALLBACK_CHAIN) {
    try {
      const result = await callOpenRouterModel(model, {
        task: 'extract', // task only labels the cost log here; route carries the real attribution
        messages,
        temperature: options.temperature,
        max_tokens: options.max_tokens,
        userId: options.userId,
        route: options.route,
        timeoutMs: DOCGEN_TIMEOUT_MS,
      });
      console.info(`[llm-client] docgen fallback succeeded on ${model}`);
      return result;
    } catch (err) {
      console.warn(`[llm-client] ${model} failed for docgen fallback:`, err instanceof Error ? err.message : err);
    }
  }

  Sentry.captureException(new Error('All docgen fallback models failed'), {
    extra: { route: options.route },
  });
  return null;
}

/**
 * Call the LLM with automatic provider fallback.
 * Returns the model's text response, or null if all providers fail.
 * Pass userId and route for cost attribution in llm_cost_log.
 */
export async function callLLM(options: LLMOptions): Promise<string | null> {
  const result = await callLLMWithMeta(options);
  return result?.content ?? null;
}

/**
 * Same two-provider fallback as callLLM, but also returns which model
 * actually produced the response — needed by callers that persist
 * `model_used` (e.g. interview_prep_kits) rather than hardcoding a guess.
 */
export async function callLLMWithMeta(options: LLMOptions): Promise<LLMResult | null> {
  // options.timeoutMs (or the task default) is the deadline for the WHOLE
  // operation — every OpenRouter attempt plus the Anthropic fallback share
  // this clock, so a slow first model can't silently consume the entire
  // budget and starve the rest of the chain. Each OpenRouter attempt is
  // additionally capped to DEFAULT_TIMEOUT_MS[task] — see callOpenRouter.
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS[options.task]);

  // Layer 1: OpenRouter (handles model-level fallback via models array)
  try {
    return await callOpenRouter(options, deadline);
  } catch (err) {
    console.warn(`[llm-client] OpenRouter failed for task=${options.task}:`, err instanceof Error ? err.message : err);
  }

  // Layer 2: Anthropic direct (different provider — survives OpenRouter outages)
  try {
    const result = await callAnthropic(options, deadline);
    console.info(`[llm-client] Anthropic fallback succeeded for task=${options.task}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[llm-client] All providers failed for task=${options.task}:`, message);
    Sentry.captureException(err, { extra: { task: options.task, route: options.route } });
  }

  return null;
}
