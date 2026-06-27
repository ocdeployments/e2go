-- Add role column to profiles for admin enforcement
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
