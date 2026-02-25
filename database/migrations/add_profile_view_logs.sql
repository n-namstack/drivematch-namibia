-- Migration: Replace naive profile view counter with unique daily view tracking
-- Run this in your Supabase SQL Editor
--
-- Problem: The old increment_profile_view() blindly increments on every page load.
-- One person refreshing 1000 times = 1000 views. That's wrong.
--
-- Solution: Log each view with (viewer_id, driver_id, viewed_date) uniqueness.
-- Only count unique viewers per day, and never count self-views.

-- =============================================
-- 1. Clean up if previous attempt partially ran
-- =============================================
DROP TABLE IF EXISTS profile_view_logs CASCADE;
DROP FUNCTION IF EXISTS record_profile_view(UUID, UUID);
DROP FUNCTION IF EXISTS increment_profile_view(UUID);

-- =============================================
-- 2. Create profile_view_logs table
-- =============================================
CREATE TABLE profile_view_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  viewed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per viewer per driver per day
  CONSTRAINT unique_view_per_day UNIQUE (viewer_id, viewed_driver_id, viewed_date)
);

-- Index for querying views by driver (e.g. "who viewed my profile")
CREATE INDEX idx_profile_views_driver
  ON profile_view_logs(viewed_driver_id, viewed_at DESC);

-- Index for querying views by viewer (e.g. "profiles I viewed")
CREATE INDEX idx_profile_views_viewer
  ON profile_view_logs(viewer_id, viewed_at DESC);

-- =============================================
-- 3. RLS policies
-- =============================================
ALTER TABLE profile_view_logs ENABLE ROW LEVEL SECURITY;

-- Drivers can see who viewed their profile
CREATE POLICY "Drivers can view their own profile views"
  ON profile_view_logs FOR SELECT
  USING (
    viewed_driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- Users can see their own viewing history
CREATE POLICY "Users can view their own viewing history"
  ON profile_view_logs FOR SELECT
  USING (viewer_id = auth.uid());

-- Authenticated users can insert views (the RPC function handles this, but just in case)
CREATE POLICY "Authenticated users can log views"
  ON profile_view_logs FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- =============================================
-- 4. Create the smart view tracking function
-- =============================================
CREATE OR REPLACE FUNCTION record_profile_view(p_viewer_id UUID, p_driver_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
  driver_owner_id UUID;
BEGIN
  -- Don't count self-views: look up who owns this driver profile
  SELECT user_id INTO driver_owner_id
  FROM driver_profiles
  WHERE id = p_driver_id;

  -- If viewer is the driver themselves, skip entirely
  IF p_viewer_id = driver_owner_id THEN
    RETURN false;
  END IF;

  -- Try to insert a view log for today
  -- ON CONFLICT means this viewer already viewed this driver today → just update timestamp
  INSERT INTO profile_view_logs (viewer_id, viewed_driver_id, viewed_date, viewed_at)
  VALUES (p_viewer_id, p_driver_id, CURRENT_DATE, now())
  ON CONFLICT ON CONSTRAINT unique_view_per_day
  DO UPDATE SET viewed_at = now();

  -- Update the cached counter with total unique viewers
  UPDATE driver_profiles
  SET profile_views = (
    SELECT COUNT(DISTINCT viewer_id)
    FROM profile_view_logs
    WHERE viewed_driver_id = p_driver_id
  )
  WHERE id = p_driver_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. Reset profile_views since old counts were inflated
-- =============================================
UPDATE driver_profiles SET profile_views = 0;
