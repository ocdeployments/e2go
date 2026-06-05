-- Migration: 20260605200000_webhook_events
-- Purpose: Track processed Stripe webhook events to prevent replay attacks
-- Created: 2026-06-05

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stripe_event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at
  ON processed_webhook_events(processed_at);

-- Auto-cleanup: events older than 30 days can be deleted
-- This prevents the table from growing indefinitely
-- Run this periodically: DELETE FROM processed_webhook_events WHERE processed_at < now() - interval '30 days';