-- Phase 5: hierarchical case_code / person_code scheme.
--
-- case_code: short random human-readable reference per application
--   (e.g. E2-K7X2QM), used for document filenames, support lookup, and
--   internal person-referencing in generated documents.
-- person_code: P2/P3/... per family_members row (P1 is the implicit
--   principal, never stored), reusing the existing "P2" naming convention
--   already baked into answer keys (P2-NAME, ...) and document types
--   (resume_p2, declaration_p2, ...).

ALTER TABLE applications ADD COLUMN IF NOT EXISTS case_code text;

CREATE UNIQUE INDEX IF NOT EXISTS applications_case_code_key
  ON applications (case_code) WHERE case_code IS NOT NULL;

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS person_code text;

CREATE UNIQUE INDEX IF NOT EXISTS family_members_user_person_code_key
  ON family_members (user_id, person_code) WHERE person_code IS NOT NULL;

-- Generates a unique E2-XXXXXX code. Alphabet excludes O/0 and I/1 to avoid
-- ambiguity when a code is read aloud or transcribed by support staff.
CREATE OR REPLACE FUNCTION generate_case_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  collision boolean;
BEGIN
  LOOP
    new_code := 'E2-';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    SELECT EXISTS(SELECT 1 FROM applications WHERE case_code = new_code) INTO collision;
    IF NOT collision THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_case_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.case_code IS NULL THEN
    NEW.case_code := generate_case_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_case_code ON applications;
CREATE TRIGGER trg_set_case_code
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_case_code();

-- One-time backfill for existing applications rows.
UPDATE applications SET case_code = generate_case_code() WHERE case_code IS NULL;

-- One-time backfill for existing family_members rows: P2, P3, ... per user,
-- in the same order sort_order/created_at already establishes elsewhere
-- (e.g. ensureCoInvestorId in partner2/intake). NOTE: this assumes the
-- co-investor is the first-added family member for any user whose
-- partnership documents already reference "Investor 2" — verified via a
-- pre-flight audit query before running this in a real environment.
WITH numbered AS (
  SELECT id, 1 + row_number() OVER (
    PARTITION BY user_id ORDER BY sort_order, created_at
  ) AS n
  FROM family_members
  WHERE person_code IS NULL
)
UPDATE family_members fm
SET person_code = 'P' || numbered.n
FROM numbered
WHERE fm.id = numbered.id;

-- Denormalized case reference on support tickets, so tickets can be looked
-- up by case_code without joining through applications.
ALTER TABLE support_tickets
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS case_code text;

CREATE INDEX IF NOT EXISTS idx_support_tickets_case_code
  ON support_tickets (case_code) WHERE case_code IS NOT NULL;
