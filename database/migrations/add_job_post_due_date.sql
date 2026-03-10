-- Add due_date column to job_posts for auto-expiry
ALTER TABLE job_posts
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Index for efficient filtering of expired posts
CREATE INDEX IF NOT EXISTS idx_job_posts_due_date ON job_posts(due_date);
