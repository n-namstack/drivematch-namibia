-- Demand Insights: per-location job demand vs driver supply
-- Run this migration in Supabase SQL Editor

-- RPC function that aggregates open jobs and active drivers per location
CREATE OR REPLACE FUNCTION get_demand_insights()
RETURNS TABLE (
  location_name TEXT,
  open_jobs BIGINT,
  active_drivers BIGINT,
  demand_score NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.name AS location_name,
    COALESCE(j.job_count, 0) AS open_jobs,
    COALESCE(d.driver_count, 0) AS active_drivers,
    ROUND(
      COALESCE(j.job_count, 0)::NUMERIC / GREATEST(COALESCE(d.driver_count, 0), 1),
      2
    ) AS demand_score
  FROM locations l
  LEFT JOIN (
    SELECT location, COUNT(*) AS job_count
    FROM job_posts
    WHERE status = 'open'
    GROUP BY location
  ) j ON j.location = l.name
  LEFT JOIN (
    SELECT location, COUNT(*) AS driver_count
    FROM profiles
    WHERE role = 'driver'
    GROUP BY location
  ) d ON d.location = l.name
  WHERE l.is_active = true
  ORDER BY demand_score DESC, open_jobs DESC;
$$;
