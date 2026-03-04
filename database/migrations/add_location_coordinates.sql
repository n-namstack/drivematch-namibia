-- Add GPS coordinates to locations table
-- Source: simplemaps.com/data/na-cities

-- 1. Add coordinate columns
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE public.locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- 2. Populate coordinates for all seeded locations
UPDATE public.locations SET latitude = -22.5700, longitude = 17.0836 WHERE name = 'Windhoek';
UPDATE public.locations SET latitude = -22.9561, longitude = 14.5081 WHERE name = 'Walvis Bay';
UPDATE public.locations SET latitude = -22.6833, longitude = 14.5333 WHERE name = 'Swakopmund';
UPDATE public.locations SET latitude = -17.7833, longitude = 15.6995 WHERE name = 'Oshakati';
UPDATE public.locations SET latitude = -17.9167, longitude = 19.7667 WHERE name = 'Rundu';
UPDATE public.locations SET latitude = -17.5039, longitude = 24.2750 WHERE name = 'Katima Mulilo';
UPDATE public.locations SET latitude = -20.4642, longitude = 16.6528 WHERE name = 'Otjiwarongo';
UPDATE public.locations SET latitude = -26.5786, longitude = 18.1333 WHERE name = 'Keetmanshoop';
UPDATE public.locations SET latitude = -17.9167, longitude = 15.9500 WHERE name = 'Ondangwa';
UPDATE public.locations SET latitude = -21.9833, longitude = 16.9167 WHERE name = 'Okahandja';
UPDATE public.locations SET latitude = -23.3167, longitude = 17.0833 WHERE name = 'Rehoboth';
UPDATE public.locations SET latitude = -22.4333, longitude = 18.9667 WHERE name = 'Gobabis';
UPDATE public.locations SET latitude = -19.5658, longitude = 18.1036 WHERE name = 'Grootfontein';
UPDATE public.locations SET latitude = -24.6333, longitude = 17.9667 WHERE name = 'Mariental';
UPDATE public.locations SET latitude = -19.2500, longitude = 17.7000 WHERE name = 'Tsumeb';
UPDATE public.locations SET latitude = -20.1089, longitude = 16.1547 WHERE name = 'Outjo';
UPDATE public.locations SET latitude = -21.9381, longitude = 15.8544 WHERE name = 'Karibib';
UPDATE public.locations SET latitude = -22.0000, longitude = 15.6000 WHERE name = 'Usakos';
UPDATE public.locations SET latitude = -21.4333, longitude = 15.9333 WHERE name = 'Omaruru';
UPDATE public.locations SET latitude = -22.1184, longitude = 14.2824 WHERE name = 'Henties Bay';
UPDATE public.locations SET latitude = -26.6458, longitude = 15.1539 WHERE name = 'Luderitz';
UPDATE public.locations SET latitude = -18.0556, longitude = 13.8406 WHERE name = 'Opuwo';
UPDATE public.locations SET latitude = -17.7833, longitude = 15.7667 WHERE name = 'Ongwediva';
UPDATE public.locations SET latitude = -17.4658, longitude = 16.3369 WHERE name = 'Eenhana';
UPDATE public.locations SET latitude = -17.6167, longitude = 18.6000 WHERE name = 'Nkurenkuru';
UPDATE public.locations SET latitude = -18.1000, longitude = 21.5500 WHERE name = 'Divundu';
UPDATE public.locations SET latitude = -19.6500, longitude = 17.3333 WHERE name = 'Otavi';
UPDATE public.locations SET latitude = -17.4000, longitude = 15.8833 WHERE name = 'Oshikango';
UPDATE public.locations SET latitude = -17.4000, longitude = 14.2167 WHERE name = 'Ruacana';
UPDATE public.locations SET latitude = -20.3667, longitude = 14.9667 WHERE name = 'Khorixas';
UPDATE public.locations SET latitude = -26.4833, longitude = 17.1500 WHERE name = 'Bethanie';
UPDATE public.locations SET latitude = -24.1333, longitude = 19.1167 WHERE name = 'Aranos';
UPDATE public.locations SET latitude = -24.0833, longitude = 18.3333 WHERE name = 'Stampriet';
UPDATE public.locations SET latitude = -24.8333, longitude = 16.9833 WHERE name = 'Maltahohe';
UPDATE public.locations SET latitude = -26.6667, longitude = 16.2500 WHERE name = 'Aus';
UPDATE public.locations SET latitude = -28.0167, longitude = 18.7500 WHERE name = 'Karasburg';
UPDATE public.locations SET latitude = -26.8000, longitude = 19.6500 WHERE name = 'Aroab';
UPDATE public.locations SET latitude = -28.4500, longitude = 18.7333 WHERE name = 'Warmbad';
UPDATE public.locations SET latitude = -25.8833, longitude = 18.0000 WHERE name = 'Tses';
UPDATE public.locations SET latitude = -25.1167, longitude = 17.7500 WHERE name = 'Gibeon';
UPDATE public.locations SET latitude = -17.5167, longitude = 15.0000 WHERE name = 'Outapi';
UPDATE public.locations SET latitude = -18.3606, longitude = 16.5812 WHERE name = 'Omuthiya';
UPDATE public.locations SET latitude = -17.5667, longitude = 16.7000 WHERE name = 'Okongo';
UPDATE public.locations SET latitude = -17.5833, longitude = 14.9667 WHERE name = 'Tsandi';
UPDATE public.locations SET latitude = -18.1167, longitude = 21.6333 WHERE name = 'Bagani';
UPDATE public.locations SET latitude = -18.2667, longitude = 23.3333 WHERE name = 'Kongola';
UPDATE public.locations SET latitude = -17.8000, longitude = 24.1833 WHERE name = 'Bukalo';
UPDATE public.locations SET latitude = -22.4167, longitude = 14.9667 WHERE name = 'Arandis';
UPDATE public.locations SET latitude = -22.4000, longitude = 18.5167 WHERE name = 'Witvlei';
UPDATE public.locations SET latitude = -23.9667, longitude = 18.5667 WHERE name = 'Leonardville';
UPDATE public.locations SET latitude = -23.7333, longitude = 19.8667 WHERE name = 'Aminuis';
UPDATE public.locations SET latitude = -21.7667, longitude = 19.7167 WHERE name = 'Epukiro';
UPDATE public.locations SET latitude = -19.4833, longitude = 17.6667 WHERE name = 'Kombat';
UPDATE public.locations SET latitude = -21.4500, longitude = 19.6500 WHERE name = 'Otjinene';
UPDATE public.locations SET latitude = -19.6333, longitude = 14.8333 WHERE name = 'Kamanjab';
UPDATE public.locations SET latitude = -20.2000, longitude = 14.2333 WHERE name = 'Fransfontein';
UPDATE public.locations SET latitude = -19.1167, longitude = 13.6167 WHERE name = 'Sesfontein';
UPDATE public.locations SET latitude = -20.5000, longitude = 14.5833 WHERE name = 'Bergsig';
UPDATE public.locations SET latitude = -25.8000, longitude = 16.8333 WHERE name = 'Helmeringhausen';
UPDATE public.locations SET latitude = -24.8333, longitude = 18.5000 WHERE name = 'Gochas';

-- 3. Create index on coordinates for potential spatial queries
CREATE INDEX IF NOT EXISTS idx_locations_coords
  ON public.locations (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- 4. Update the demand insights RPC to include coordinates
DROP FUNCTION IF EXISTS get_demand_insights();
CREATE OR REPLACE FUNCTION get_demand_insights()
RETURNS TABLE (
  location_name TEXT,
  open_jobs BIGINT,
  active_drivers BIGINT,
  demand_score NUMERIC,
  latitude NUMERIC,
  longitude NUMERIC
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
    ) AS demand_score,
    l.latitude,
    l.longitude
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
