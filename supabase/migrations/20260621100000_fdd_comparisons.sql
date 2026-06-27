-- FDD Comparisons — saved multi-FDD comparison sessions
-- Users can select 2–3 analyses and persist the comparison for later.

CREATE TABLE IF NOT EXISTS fdd_comparisons (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL DEFAULT 'Untitled Comparison',
  fdd_ids     UUID[]  NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fdd_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their comparisons"
  ON fdd_comparisons FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS fdd_comparisons_user_id_idx ON fdd_comparisons(user_id);
