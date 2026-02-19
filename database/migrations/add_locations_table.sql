-- Locations Table
-- Stores Namibia towns/cities so they can be managed without app updates.
-- The app fetches from this table and caches locally.

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  region text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Everyone can read locations
CREATE POLICY "Anyone can read locations"
  ON public.locations FOR SELECT
  USING (true);

-- Only admins can manage locations
CREATE POLICY "Admins can manage locations"
  ON public.locations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_locations_name ON public.locations (name);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations (is_active) WHERE is_active = true;

-- Seed with comprehensive Namibia locations
INSERT INTO public.locations (name, region) VALUES
  ('Windhoek', 'Khomas'),
  ('Walvis Bay', 'Erongo'),
  ('Swakopmund', 'Erongo'),
  ('Oshakati', 'Oshana'),
  ('Rundu', 'Kavango East'),
  ('Katima Mulilo', 'Zambezi'),
  ('Otjiwarongo', 'Otjozondjupa'),
  ('Keetmanshoop', 'Karas'),
  ('Ondangwa', 'Oshana'),
  ('Okahandja', 'Otjozondjupa'),
  ('Rehoboth', 'Hardap'),
  ('Gobabis', 'Omaheke'),
  ('Grootfontein', 'Otjozondjupa'),
  ('Mariental', 'Hardap'),
  ('Tsumeb', 'Oshikoto'),
  ('Outjo', 'Kunene'),
  ('Karibib', 'Erongo'),
  ('Usakos', 'Erongo'),
  ('Omaruru', 'Erongo'),
  ('Henties Bay', 'Erongo'),
  ('Luderitz', 'Karas'),
  ('Opuwo', 'Kunene'),
  ('Ongwediva', 'Oshana'),
  ('Eenhana', 'Ohangwena'),
  ('Nkurenkuru', 'Kavango West'),
  ('Divundu', 'Kavango East'),
  ('Otavi', 'Otjozondjupa'),
  ('Oshikango', 'Ohangwena'),
  ('Ruacana', 'Omusati'),
  ('Khorixas', 'Kunene'),
  ('Bethanie', 'Karas'),
  ('Aranos', 'Hardap'),
  ('Stampriet', 'Hardap'),
  ('Maltahohe', 'Hardap'),
  ('Aus', 'Karas'),
  ('Karasburg', 'Karas'),
  ('Aroab', 'Karas'),
  ('Warmbad', 'Karas'),
  ('Tses', 'Karas'),
  ('Gibeon', 'Hardap'),
  ('Outapi', 'Omusati'),
  ('Omuthiya', 'Oshikoto'),
  ('Okongo', 'Ohangwena'),
  ('Tsandi', 'Omusati'),
  ('Bagani', 'Kavango East'),
  ('Kongola', 'Zambezi'),
  ('Bukalo', 'Zambezi'),
  ('Arandis', 'Erongo'),
  ('Witvlei', 'Omaheke'),
  ('Leonardville', 'Omaheke'),
  ('Aminuis', 'Omaheke'),
  ('Epukiro', 'Omaheke'),
  ('Kombat', 'Otjozondjupa'),
  ('Otjinene', 'Omaheke'),
  ('Kamanjab', 'Kunene'),
  ('Fransfontein', 'Kunene'),
  ('Sesfontein', 'Kunene'),
  ('Bergsig', 'Kunene'),
  ('Helmeringhausen', 'Hardap'),
  ('Gochas', 'Hardap')
ON CONFLICT (name) DO NOTHING;
