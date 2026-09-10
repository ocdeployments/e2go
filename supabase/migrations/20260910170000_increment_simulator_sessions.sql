-- RS-6 (Gap G-21): atomic increment/decrement for the simulator pack grant.
-- The webhook previously granted (and refunded) simulator_sessions_purchased
-- via select-then-update, which loses updates under concurrent or redelivered
-- events (two interleaved 3-pack grants net one grant instead of two). This
-- RPC does the adjustment in a single atomic UPDATE instead.
--
-- p_amount may be negative (the refund/revoke path); the result is floored at
-- 0. A NULL column value is treated as the column's own DEFAULT of 2, matching
-- the app-level fallback the webhook used before this migration.
CREATE OR REPLACE FUNCTION increment_simulator_sessions(
  p_application_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_value INTEGER;
BEGIN
  UPDATE applications
  SET simulator_sessions_purchased =
    GREATEST(0, COALESCE(simulator_sessions_purchased, 2) + p_amount)
  WHERE id = p_application_id
  RETURNING simulator_sessions_purchased INTO v_new_value;

  RETURN v_new_value;
END;
$$;
