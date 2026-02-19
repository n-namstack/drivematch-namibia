-- Job Board Feature Migration
-- Allows car owners to post "looking for a driver" listings
-- and drivers to express interest in those opportunities.

-- 1. Job Posts table
CREATE TABLE IF NOT EXISTS public.job_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  vehicle_types TEXT[] DEFAULT '{}',
  experience_level TEXT DEFAULT 'any'
    CHECK (experience_level IN ('any', 'beginner', 'intermediate', 'experienced')),
  availability_type TEXT DEFAULT 'full_time'
    CHECK (availability_type IN ('full_time', 'part_time', 'weekends_only')),
  salary_range TEXT,  -- e.g. "N$3,000 - N$5,000 / month"
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'filled')),
  interest_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Job Interests table (driver expresses interest in a job)
CREATE TABLE IF NOT EXISTS public.job_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_post_id UUID NOT NULL REFERENCES public.job_posts(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  message TEXT,  -- optional short intro from the driver
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_post_id, driver_id)  -- a driver can only express interest once per job
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_job_posts_owner ON public.job_posts(owner_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_location ON public.job_posts(location);
CREATE INDEX IF NOT EXISTS idx_job_posts_created ON public.job_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_interests_job ON public.job_interests(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_interests_driver ON public.job_interests(driver_id);

-- 4. Auto-update updated_at on job_posts
CREATE OR REPLACE FUNCTION public.update_job_post_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_post_updated ON public.job_posts;
CREATE TRIGGER trg_job_post_updated
  BEFORE UPDATE ON public.job_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_job_post_timestamp();

-- 5. Auto-update interest_count when interests are added/removed
CREATE OR REPLACE FUNCTION public.update_job_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.job_posts
    SET interest_count = interest_count + 1
    WHERE id = NEW.job_post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.job_posts
    SET interest_count = GREATEST(interest_count - 1, 0)
    WHERE id = OLD.job_post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_job_interest_count ON public.job_interests;
CREATE TRIGGER trg_job_interest_count
  AFTER INSERT OR DELETE ON public.job_interests
  FOR EACH ROW EXECUTE FUNCTION public.update_job_interest_count();

-- 6. Notification trigger: notify owner when a driver expresses interest
CREATE OR REPLACE FUNCTION public.notify_job_interest()
RETURNS TRIGGER AS $$
DECLARE
  _driver_name TEXT;
  _job_title TEXT;
BEGIN
  -- Get driver name
  SELECT p.firstname || ' ' || p.lastname INTO _driver_name
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.user_id
  WHERE dp.id = NEW.driver_id;

  -- Get job title
  SELECT title INTO _job_title
  FROM job_posts
  WHERE id = NEW.job_post_id;

  -- Create notification for the job owner
  INSERT INTO public.notifications (user_id, type, title, message, data)
  SELECT
    jp.owner_id,
    'job_interest',
    'New Interest in Your Job Post',
    COALESCE(_driver_name, 'A driver') || ' is interested in "' || COALESCE(_job_title, 'your job post') || '"',
    jsonb_build_object(
      'job_post_id', NEW.job_post_id,
      'driver_id', NEW.driver_id,
      'interest_id', NEW.id
    )
  FROM job_posts jp
  WHERE jp.id = NEW.job_post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DROP TRIGGER IF EXISTS trg_notify_job_interest ON public.job_interests;
CREATE TRIGGER trg_notify_job_interest
  AFTER INSERT ON public.job_interests
  FOR EACH ROW EXECUTE FUNCTION public.notify_job_interest();

-- 7. Row Level Security
ALTER TABLE public.job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_interests ENABLE ROW LEVEL SECURITY;

-- Job Posts: anyone authenticated can read open posts; owners manage their own
CREATE POLICY "Anyone can view open job posts"
  ON public.job_posts FOR SELECT
  USING (status = 'open' OR owner_id = auth.uid());

CREATE POLICY "Owners can create job posts"
  ON public.job_posts FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their own job posts"
  ON public.job_posts FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their own job posts"
  ON public.job_posts FOR DELETE
  USING (owner_id = auth.uid());

-- Job Interests: drivers manage their own; job owners can view interests on their posts
CREATE POLICY "Drivers can view their own interests"
  ON public.job_interests FOR SELECT
  USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
    OR
    job_post_id IN (SELECT id FROM job_posts WHERE owner_id = auth.uid())
  );

CREATE POLICY "Drivers can create interests"
  ON public.job_interests FOR INSERT
  WITH CHECK (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Drivers can delete their own interests"
  ON public.job_interests FOR DELETE
  USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Job owners can update interest status"
  ON public.job_interests FOR UPDATE
  USING (
    job_post_id IN (SELECT id FROM job_posts WHERE owner_id = auth.uid())
  );
