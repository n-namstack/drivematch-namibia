-- Hiring Pipeline Extension Migration
-- Simplifies pipeline: removes evaluation period (kept/dismissed)
-- Adds positions_available to job_posts for multi-hire support
--
-- Run this in Supabase SQL Editor BEFORE deploying app changes.
--
-- Status lifecycle:
--   pending → viewed → shortlisted → accepted
--   At any pre-hire stage: → rejected

-- 0. Migrate any existing evaluation-period rows before changing constraint
UPDATE public.job_interests SET status = 'accepted' WHERE status = 'kept';
UPDATE public.job_interests SET status = 'rejected' WHERE status = 'dismissed';

-- 1. Drop old CHECK constraint
ALTER TABLE public.job_interests
  DROP CONSTRAINT IF EXISTS job_interests_status_check;

-- 2. Add new CHECK constraint (no kept/dismissed)
ALTER TABLE public.job_interests
  ADD CONSTRAINT job_interests_status_check
  CHECK (status IN ('pending', 'viewed', 'shortlisted', 'accepted', 'rejected'));

-- 3. Add composite index for common pipeline queries
CREATE INDEX IF NOT EXISTS idx_job_interests_status
  ON public.job_interests(job_post_id, status);

-- 4. Add positions_available column to job_posts (default 1 for existing posts)
ALTER TABLE public.job_posts
  ADD COLUMN IF NOT EXISTS positions_available INTEGER NOT NULL DEFAULT 1;
