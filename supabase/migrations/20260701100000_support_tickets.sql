-- Support ticket system
-- Replaces the mailto-only /support page with a tracked inbox

CREATE TABLE IF NOT EXISTS support_tickets (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email    text        NOT NULL,
  category      text        NOT NULL DEFAULT 'general',
    CONSTRAINT support_tickets_category_check
      CHECK (category IN ('bug', 'billing', 'document', 'account', 'general', 'other')),
  subject       text        NOT NULL,
  message       text        NOT NULL,
  status        text        NOT NULL DEFAULT 'open',
    CONSTRAINT support_tickets_status_check
      CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority      text        NOT NULL DEFAULT 'normal',
    CONSTRAINT support_tickets_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_notes   text,
  resolved_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can submit tickets (authenticated or anonymous)
CREATE POLICY "Anyone can submit a support ticket"
  ON support_tickets FOR INSERT
  WITH CHECK (true);

-- Users can read their own tickets
CREATE POLICY "Users can read own support tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Admins read/write all tickets via service role (bypasses RLS)

CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON support_tickets (status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id    ON support_tickets (user_id);
