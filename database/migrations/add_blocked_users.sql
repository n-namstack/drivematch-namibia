-- Migration: Add blocked_users table for content moderation (Apple Guideline 1.2)
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can block others (only as themselves)
CREATE POLICY "insert own blocks"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can see who they have blocked
CREATE POLICY "view own blocks"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can unblock (delete their own blocks)
CREATE POLICY "delete own blocks"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);
