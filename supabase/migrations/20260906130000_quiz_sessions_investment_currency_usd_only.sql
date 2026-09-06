-- USD-only pivot (session 135): quiz_sessions.investment_currency is retired as a
-- multi-currency field. Every money input in the product is now entered in USD,
-- so the only valid values are 'USD' or NULL.
--
-- NOTE: apply this against the live database yourself (supabase db push, or paste
-- into the SQL Editor). Per CLAUDE.md the migration runner is not trusted to have
-- run historical files; unlike `CREATE TABLE IF NOT EXISTS`, the statements below
-- do take effect, but the live schema remains the source of truth — verify after.

-- 1. Normalise any legacy non-USD value to NULL (no dated FX rate is stored, so
--    converting the amount would be fabrication — the value is simply dropped).
UPDATE public.quiz_sessions
SET investment_currency = NULL
WHERE investment_currency IS NOT NULL
  AND investment_currency <> 'USD';

-- 2. Swap the CHECK constraint from ('USD','CAD') to USD-or-NULL.
ALTER TABLE public.quiz_sessions
  DROP CONSTRAINT IF EXISTS quiz_sessions_investment_currency_check;

ALTER TABLE public.quiz_sessions
  ADD CONSTRAINT quiz_sessions_investment_currency_check
  CHECK (investment_currency = 'USD');
