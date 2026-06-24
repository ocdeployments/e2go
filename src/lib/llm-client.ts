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

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type TaskType = 'evaluate' | 'coaching' | 'faq' | 'prep';

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
}

// Per-task model chains — OpenRouter tries each in order on failure
const OPENROUTER_MODELS: Record<TaskType, string[]> = {
  evaluate: ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
  coaching: ['xiaomi/mimo-v2.5-pro', 'google/gemini-2.5-pro'],
  faq:      ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash'],
  prep:     ['xiaomi/mimo-v2.5', 'xiaomi/mimo-v2.5-pro'],
};

// Anthropic fallback models per task
const ANTHROPIC_MODELS: Record<TaskType, string> = {
  evaluate: 'claude-haiku-4-5-20251001',
  coaching: 'claude-sonnet-4-6',
  faq:      'claude-haiku-4-5-20251001',
  prep:     'claude-haiku-4-5-20251001',
};

// Model pricing: USD per 1M tokens (input / output). Verified June 17, 2026.
const MODEL_COSTS: Record<string, { in: number; out: number }> = {
  'xiaomi/mimo-v2.5':          { in: 0.14,  out: 0.28  },
  'xiaomi/mimo-v2.5-pro':      { in: 0.435, out: 0.87  },
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

async function callOpenRouter(options: LLMOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const t0 = Date.now();
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer':  'https://e2go.app',
      'X-Title':       'E2go Interview Simulator',
    },
    body: JSON.stringify({
      models:      OPENROUTER_MODELS[options.task],
      messages:    options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens:  options.max_tokens  ?? 700,
      stream:      false,
    }),
    signal: options.signal,
  });

  if (!response.ok) throw new Error(`OpenRouter HTTP ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty content');

  const model     = data.model ?? OPENROUTER_MODELS[options.task][0];
  const tokensIn  = data.usage?.prompt_tokens     ?? 0;
  const tokensOut = data.usage?.completion_tokens ?? 0;
  logCost({
    userId: options.userId, task: options.task, route: options.route,
    provider: 'openrouter', model, tokensIn, tokensOut,
    costUsd: calcCost(model, tokensIn, tokensOut),
    latencyMs: Date.now() - t0,
  });

  return content;
}

async function callAnthropic(options: LLMOptions): Promise<string> {
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

  return block.text;
}

/**
 * Call the LLM with automatic provider fallback.
 * Returns the model's text response, or null if all providers fail.
 * Pass userId and route for cost attribution in llm_cost_log.
 */
export async function callLLM(options: LLMOptions): Promise<string | null> {
  // Layer 1: OpenRouter (handles model-level fallback via models array)
  try {
    return await callOpenRouter(options);
  } catch (err) {
    console.warn(`[llm-client] OpenRouter failed for task=${options.task}:`, err instanceof Error ? err.message : err);
  }

  // Layer 2: Anthropic direct (different provider — survives OpenRouter outages)
  try {
    const content = await callAnthropic(options);
    console.info(`[llm-client] Anthropic fallback succeeded for task=${options.task}`);
    return content;
  } catch (err) {
    console.error(`[llm-client] All providers failed for task=${options.task}:`, err instanceof Error ? err.message : err);
  }

  return null;
}
