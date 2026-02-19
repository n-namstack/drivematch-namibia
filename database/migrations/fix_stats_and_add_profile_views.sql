-- Migration: Fix stats (reviews, rating, work history) and add profile views
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. FIX: Work History RLS - allow anyone to view work history
-- (Currently only visible for 'verified' drivers, blocking stats)
-- =============================================
DROP POLICY IF EXISTS "Anyone can view work history of verified drivers" ON work_history;

CREATE POLICY "Anyone can view work history"
ON work_history FOR SELECT
USING (true);

-- =============================================
-- 2. FIX: Rating trigger - make SECURITY DEFINER so it can
-- update driver_profiles when an owner submits a review
-- Also fix DELETE handling (OLD vs NEW)
-- =============================================
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  target_driver_id UUID;
BEGIN
  -- Handle DELETE (NEW is null) vs INSERT/UPDATE
  target_driver_id := COALESCE(NEW.driver_id, OLD.driver_id);

  UPDATE driver_profiles
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM driver_reviews
      WHERE driver_id = target_driver_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM driver_reviews
      WHERE driver_id = target_driver_id
    )
  WHERE id = target_driver_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 3. Sync existing reviews -> driver_profiles
-- (One-time fix for any reviews already submitted)
-- =============================================
UPDATE driver_profiles dp
SET
  rating = sub.avg_rating,
  total_reviews = sub.review_count
FROM (
  SELECT
    driver_id,
    COALESCE(AVG(rating), 0) AS avg_rating,
    COUNT(*) AS review_count
  FROM driver_reviews
  GROUP BY driver_id
) sub
WHERE dp.id = sub.driver_id;

-- =============================================
-- 4. Add profile_views column to driver_profiles
-- =============================================
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;

-- =============================================
-- 5. RPC function to increment profile views
-- (SECURITY DEFINER so any authenticated user can increment)
-- =============================================
CREATE OR REPLACE FUNCTION increment_profile_view(p_driver_id UUID)
RETURNS VOID
SECURITY DEFINER
AS $$
BEGIN
  UPDATE driver_profiles
  SET profile_views = COALESCE(profile_views, 0) + 1
  WHERE id = p_driver_id;
END;
$$ LANGUAGE plpgsql;
