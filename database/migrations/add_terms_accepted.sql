-- Migration: Track Terms of Service / EULA acceptance (Apple Guideline 1.2)
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
