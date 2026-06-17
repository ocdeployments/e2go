/**
 * Shared LLM client with two-provider fallback:
 * Layer 1 — OpenRouter with per-task models array (handles model-level fallback)
 * Layer 2 — Anthropic direct (different provider entirely)
 *
 * Security rule: ANTHROPIC_API_KEY is only used here and in generation-engine.ts.
 * NEVER route simulator/FAQ calls through OpenRouter with Anthropic models — use the SDK directly.
 */

import Anthropic from '@anthropic-ai/sdk';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type TaskType = 'evaluate' | 'coaching' | 'faq';

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
}

// Per-task model chains — OpenRouter tries each in order on failure
const OPENROUTER_MODELS: Record<TaskType, string[]> = {
  evaluate: ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
  coaching: ['xiaomi/mimo-v2.5-pro', 'google/gemini-2.5-pro'],
  faq:      ['xiaomi/mimo-v2.5', 'google/gemini-2.5-flash'],
};

// Anthropic fallback models per task
const ANTHROPIC_MODELS: Record<TaskType, string> = {
  evaluate: 'claude-haiku-4-5-20251001',
  coaching: 'claude-sonnet-4-6',
  faq:      'claude-haiku-4-5-20251001',
};

async function callOpenRouter(options: LLMOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://e2go.app',
      'X-Title': 'E2go Interview Simulator',
    },
    body: JSON.stringify({
      models: OPENROUTER_MODELS[options.task],
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.max_tokens ?? 700,
      stream: false,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`OpenRouter HTTP ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned empty content');
  return content;
}

async function callAnthropic(options: LLMOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const anthropic = new Anthropic({ apiKey });

  // Separate system message from conversation messages
  const systemMsg = options.messages.find(m => m.role === 'system')?.content ?? '';
  const conversationMsgs = options.messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODELS[options.task],
    max_tokens: options.max_tokens ?? 700,
    system: systemMsg || undefined,
    messages: conversationMsgs,
    ...(options.temperature !== undefined ? {} : {}), // Anthropic uses temperature differently — omit to use default
  });

  const block = response.content[0];
  if (block.type !== 'text') throw new Error('Anthropic returned non-text block');
  return block.text;
}

/**
 * Call the LLM with automatic provider fallback.
 * Returns the model's text response, or null if all providers fail.
 */
export async function callLLM(options: LLMOptions): Promise<string | null> {
  // Layer 1: OpenRouter (handles model-level fallback via models array)
  try {
    const content = await callOpenRouter(options);
    return content;
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
