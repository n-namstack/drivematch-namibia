-- Migration: Show all drivers to owners (not just verified)
-- Run this in your Supabase SQL Editor

-- 1. Update search_drivers function to show ALL drivers (not just verified)
-- Verified drivers still sort first in results
CREATE OR REPLACE FUNCTION search_drivers(
  p_location TEXT DEFAULT NULL,
  p_min_experience INTEGER DEFAULT NULL,
  p_availability TEXT DEFAULT NULL,
  p_vehicle_types TEXT[] DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_has_pdp BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  firstname TEXT,
  lastname TEXT,
  profile_image TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  availability TEXT,
  vehicle_types TEXT[],
  has_pdp BOOLEAN,
  location TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  verification_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.user_id,
    p.firstname,
    p.lastname,
    p.profile_image,
    dp.bio,
    dp.years_of_experience,
    dp.availability,
    dp.vehicle_types,
    dp.has_pdp,
    p.location,
    dp.rating,
    dp.total_reviews,
    dp.verification_status
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.user_id
  WHERE
    p.is_active = true
    AND (p_location IS NULL OR p.location ILIKE '%' || p_location || '%')
    AND (p_min_experience IS NULL OR dp.years_of_experience >= p_min_experience)
    AND (p_availability IS NULL OR dp.availability = p_availability)
    AND (p_vehicle_types IS NULL OR dp.vehicle_types && p_vehicle_types)
    AND (p_min_rating IS NULL OR dp.rating >= p_min_rating)
    AND (p_has_pdp IS NULL OR dp.has_pdp = p_has_pdp)
  ORDER BY dp.verification_status = 'verified' DESC, dp.is_featured DESC, dp.rating DESC, dp.total_reviews DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 2. Update RLS policy to allow viewing all driver profiles (not just verified)
DROP POLICY IF EXISTS "Anyone can view verified driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Anyone can view all driver profiles" ON driver_profiles;
CREATE POLICY "Anyone can view all driver profiles"
ON driver_profiles FOR SELECT
USING (true);
