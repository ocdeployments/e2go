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

type TaskType = 'evaluate' | 'coaching' | 'faq' | 'prep' | 'extract';

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

// Per-task model chains — OpenRouter tries each in order on failure
const OPENROUTER_MODELS: Record<TaskType, string[]> = {
  evaluate: ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
  coaching: ['xiaomi/mimo-v2.5-pro', 'google/gemini-2.5-pro'],
  faq:      ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash'],
  prep:     ['xiaomi/mimo-v2.5', 'xiaomi/mimo-v2.5-pro'],
  extract:  ['google/gemini-2.5-pro', 'z-ai/glm-5.2'],
};

// Anthropic fallback models per task
const ANTHROPIC_MODELS: Record<TaskType, string> = {
  evaluate: 'claude-haiku-4-5-20251001',
  coaching: 'claude-sonnet-4-6',
  faq:      'claude-haiku-4-5-20251001',
  prep:     'claude-haiku-4-5-20251001',
  extract:  'claude-haiku-4-5-20251001',
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

async function callOpenRouterModel(model: string, options: LLMOptions): Promise<LLMResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS[options.task]
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
async function callOpenRouter(options: LLMOptions): Promise<LLMResult> {
  const models = OPENROUTER_MODELS[options.task];
  let lastErr: unknown = new Error('No OpenRouter models configured');

  for (const model of models) {
    try {
      return await callOpenRouterModel(model, options);
    } catch (err) {
      lastErr = err;
      console.warn(`[llm-client] ${model} failed for task=${options.task}:`, err instanceof Error ? err.message : err);
    }
  }

  throw lastErr;
}

async function callAnthropic(options: LLMOptions): Promise<LLMResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });

  const systemMsg       = options.messages.find(m => m.role === 'system')?.content ?? '';
  const conversationMsgs = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const t0 = Date.now();
  const response = await anthropic.messages.create({
    model:      ANTHROPIC_MODELS[options.task],
    max_tokens: options.max_tokens ?? 700,
    system:     systemMsg || undefined,
    messages:   conversationMsgs,
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Anthropic returned non-text block');

  const model     = ANTHROPIC_MODELS[options.task];
  const tokensIn  = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;
  logCost({
    userId: options.userId, task: options.task, route: options.route,
    provider: 'anthropic', model, tokensIn, tokensOut,
    costUsd: calcCost(model, tokensIn, tokensOut),
    latencyMs: Date.now() - t0,
  });

  return { content: block.text, model };
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
  // Layer 1: OpenRouter (handles model-level fallback via models array)
  try {
    return await callOpenRouter(options);
  } catch (err) {
    console.warn(`[llm-client] OpenRouter failed for task=${options.task}:`, err instanceof Error ? err.message : err);
  }

  // Layer 2: Anthropic direct (different provider — survives OpenRouter outages)
  try {
    const result = await callAnthropic(options);
    console.info(`[llm-client] Anthropic fallback succeeded for task=${options.task}`);
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[llm-client] All providers failed for task=${options.task}:`, message);
    Sentry.captureException(err, { extra: { task: options.task, route: options.route } });
  }

  return null;
}
