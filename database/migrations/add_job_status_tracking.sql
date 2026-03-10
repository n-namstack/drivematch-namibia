-- Add updated_at to job_interests so we know when status last changed
ALTER TABLE job_interests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_job_interests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_interests_updated_at ON job_interests;
CREATE TRIGGER trg_job_interests_updated_at
  BEFORE UPDATE ON job_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_job_interests_updated_at();

-- Status history table for timeline view
CREATE TABLE IF NOT EXISTS job_interest_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID NOT NULL REFERENCES job_interests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_interest
  ON job_interest_status_history(interest_id);

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION log_job_interest_status_change()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO job_interest_status_history (interest_id, old_status, new_status)
    VALUES (NEW.id, NULL, NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO job_interest_status_history (interest_id, old_status, new_status)
    VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_status_change ON job_interests;
CREATE TRIGGER trg_log_status_change
  AFTER INSERT OR UPDATE ON job_interests
  FOR EACH ROW
  EXECUTE FUNCTION log_job_interest_status_change();

-- Backfill: create initial history entries for existing records
INSERT INTO job_interest_status_history (interest_id, old_status, new_status, changed_at)
SELECT id, NULL, status, created_at
FROM job_interests
WHERE NOT EXISTS (
  SELECT 1 FROM job_interest_status_history h WHERE h.interest_id = job_interests.id
);

-- Enable RLS
ALTER TABLE job_interest_status_history ENABLE ROW LEVEL SECURITY;

-- Drivers can read their own history
CREATE POLICY "Drivers read own status history"
  ON job_interest_status_history FOR SELECT
  USING (
    interest_id IN (
      SELECT ji.id FROM job_interests ji
      JOIN driver_profiles dp ON dp.id = ji.driver_id
      WHERE dp.user_id = auth.uid()
    )
  );

-- Owners can read history for their job posts
CREATE POLICY "Owners read status history for their jobs"
  ON job_interest_status_history FOR SELECT
  USING (
    interest_id IN (
      SELECT ji.id FROM job_interests ji
      JOIN job_posts jp ON jp.id = ji.job_post_id
      WHERE jp.owner_id = auth.uid()
    )
  );
