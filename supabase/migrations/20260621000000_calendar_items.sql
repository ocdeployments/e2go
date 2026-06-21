-- Calendar items table for compliance deadline tracking
CREATE TABLE IF NOT EXISTS calendar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, item_type)
);

ALTER TABLE calendar_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar items"
  ON calendar_items
  FOR ALL
  TO authenticated
  USING (application_id IN (SELECT id FROM applications WHERE user_id = auth.uid()))
  WITH CHECK (application_id IN (SELECT id FROM applications WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_calendar_items_application_id ON calendar_items(application_id);
