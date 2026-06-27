-- OPS-1: API Cost Intelligence
-- Logs every LLM call with model, tokens, cost, and user attribution.

CREATE TABLE IF NOT EXISTS llm_cost_log (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  task          text        NOT NULL,   -- 'evaluate' | 'coaching' | 'faq' | 'prep' | 'generation' | 'fdd'
  route         text,                   -- e.g. '/api/simulator/evaluate'
  provider      text        NOT NULL,   -- 'openrouter' | 'anthropic'
  model         text        NOT NULL,   -- actual model used (may differ from requested on fallback)
  tokens_in     integer,
  tokens_out    integer,
  cost_usd      numeric(10,6),
  latency_ms    integer,
  success       boolean     DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_llm_cost_log_created_at ON llm_cost_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_cost_log_user_id    ON llm_cost_log (user_id);
CREATE INDEX IF NOT EXISTS idx_llm_cost_log_task       ON llm_cost_log (task);
CREATE INDEX IF NOT EXISTS idx_llm_cost_log_provider   ON llm_cost_log (provider);
