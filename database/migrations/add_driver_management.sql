-- Driver Management Feature Migration
-- Manages owner-driver financial relationships after hiring
-- Run this migration in Supabase SQL Editor

-- ============================================
-- 1. DRIVER AGREEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.driver_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
  job_interest_id UUID REFERENCES public.job_interests(id) ON DELETE SET NULL,

  -- Contract terms
  contract_type TEXT NOT NULL
    CHECK (contract_type IN ('daily_target', 'revenue_share', 'rent_to_own')),
  daily_target_amount NUMERIC(10,2),
  revenue_share_driver_pct NUMERIC(5,2),
  rent_to_own_total NUMERIC(12,2),
  rent_to_own_target_date DATE,

  -- General terms
  days_off TEXT[] DEFAULT '{}',
  maintenance_responsibility TEXT NOT NULL DEFAULT 'owner'
    CHECK (maintenance_responsibility IN ('owner', 'driver')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'ended')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. DAILY EARNINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.driver_agreements(id) ON DELETE CASCADE,

  -- Financial data
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_earned NUMERIC(10,2) NOT NULL,
  amount_paid_to_owner NUMERIC(10,2) NOT NULL,

  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'disputed')),
  dispute_note TEXT,
  verified_at TIMESTAMPTZ,

  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(agreement_id, date)
);

-- ============================================
-- 3. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_driver_agreements_owner ON public.driver_agreements(owner_id);
CREATE INDEX IF NOT EXISTS idx_driver_agreements_driver ON public.driver_agreements(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_agreements_status ON public.driver_agreements(status);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_agreement ON public.daily_earnings(agreement_id);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_date ON public.daily_earnings(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_agreement_date ON public.daily_earnings(agreement_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_earnings_verification ON public.daily_earnings(agreement_id, verification_status);

-- ============================================
-- 4. AUTO-UPDATE TIMESTAMP TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION public.update_driver_agreement_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_agreement_updated ON public.driver_agreements;
CREATE TRIGGER trg_driver_agreement_updated
  BEFORE UPDATE ON public.driver_agreements
  FOR EACH ROW EXECUTE FUNCTION public.update_driver_agreement_timestamp();

CREATE OR REPLACE FUNCTION public.update_daily_earning_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_daily_earning_updated ON public.daily_earnings;
CREATE TRIGGER trg_daily_earning_updated
  BEFORE UPDATE ON public.daily_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_daily_earning_timestamp();

-- ============================================
-- 5. NOTIFICATION: Driver logs earnings → notify owner
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_earnings_logged()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _driver_name TEXT;
  _owner_id UUID;
BEGIN
  SELECT da.owner_id, p.firstname || ' ' || p.lastname
  INTO _owner_id, _driver_name
  FROM driver_agreements da
  JOIN driver_profiles dp ON dp.id = da.driver_id
  JOIN profiles p ON p.id = dp.user_id
  WHERE da.id = NEW.agreement_id;

  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    _owner_id,
    'earnings',
    'Daily Earnings Logged',
    COALESCE(_driver_name, 'Your driver') || ' logged N$' || NEW.total_earned::TEXT || ' for ' || NEW.date::TEXT,
    jsonb_build_object(
      'agreement_id', NEW.agreement_id,
      'earning_id', NEW.id,
      'date', NEW.date,
      'amount', NEW.total_earned
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_earnings_logged ON public.daily_earnings;
CREATE TRIGGER trg_notify_earnings_logged
  AFTER INSERT ON public.daily_earnings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_earnings_logged();

-- ============================================
-- 6. NOTIFICATION: Owner verifies/disputes → notify driver
--    Driver edits verified entry → notify owner
-- ============================================
CREATE OR REPLACE FUNCTION public.notify_on_earnings_verification()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _notify_user_id UUID;
  _other_name TEXT;
  _title TEXT;
  _message TEXT;
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN

    IF NEW.verification_status = 'verified' THEN
      -- Notify the driver
      SELECT dp.user_id, p.firstname || ' ' || p.lastname
      INTO _notify_user_id, _other_name
      FROM driver_agreements da
      JOIN driver_profiles dp ON dp.id = da.driver_id
      JOIN profiles p ON p.id = da.owner_id
      WHERE da.id = NEW.agreement_id;

      _title := 'Payment Verified';
      _message := COALESCE(_other_name, 'Owner') || ' verified your payment for ' || NEW.date::TEXT;

    ELSIF NEW.verification_status = 'disputed' THEN
      -- Notify the driver
      SELECT dp.user_id, p.firstname || ' ' || p.lastname
      INTO _notify_user_id, _other_name
      FROM driver_agreements da
      JOIN driver_profiles dp ON dp.id = da.driver_id
      JOIN profiles p ON p.id = da.owner_id
      WHERE da.id = NEW.agreement_id;

      _title := 'Payment Disputed';
      _message := COALESCE(_other_name, 'Owner') || ' disputed your entry for ' || NEW.date::TEXT
        || COALESCE(': ' || NEW.dispute_note, '');

    ELSIF NEW.verification_status = 'unverified' AND OLD.verification_status = 'verified' THEN
      -- Driver edited a verified entry → notify owner
      SELECT da.owner_id, p.firstname || ' ' || p.lastname
      INTO _notify_user_id, _other_name
      FROM driver_agreements da
      JOIN driver_profiles dp ON dp.id = da.driver_id
      JOIN profiles p ON p.id = dp.user_id
      WHERE da.id = NEW.agreement_id;

      _title := 'Earnings Entry Updated';
      _message := COALESCE(_other_name, 'Your driver') || ' updated a verified entry for ' || NEW.date::TEXT || ' — please re-verify';

    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      _notify_user_id,
      'earnings',
      _title,
      _message,
      jsonb_build_object(
        'agreement_id', NEW.agreement_id,
        'earning_id', NEW.id,
        'date', NEW.date,
        'status', NEW.verification_status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_earnings_verification ON public.daily_earnings;
CREATE TRIGGER trg_notify_earnings_verification
  AFTER UPDATE ON public.daily_earnings
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_earnings_verification();

-- ============================================
-- 7. ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.driver_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_earnings ENABLE ROW LEVEL SECURITY;

-- driver_agreements: Both parties can view their agreements
CREATE POLICY "Owners can view their agreements"
  ON public.driver_agreements FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Drivers can view their agreements"
  ON public.driver_agreements FOR SELECT
  USING (
    driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can create agreements"
  ON public.driver_agreements FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their agreements"
  ON public.driver_agreements FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their agreements"
  ON public.driver_agreements FOR DELETE
  USING (owner_id = auth.uid());

-- daily_earnings: Both parties can view
CREATE POLICY "Agreement owners can view earnings"
  ON public.daily_earnings FOR SELECT
  USING (
    agreement_id IN (SELECT id FROM driver_agreements WHERE owner_id = auth.uid())
  );

CREATE POLICY "Agreement drivers can view earnings"
  ON public.daily_earnings FOR SELECT
  USING (
    agreement_id IN (
      SELECT id FROM driver_agreements
      WHERE driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
    )
  );

-- Only drivers can create earnings
CREATE POLICY "Drivers can log earnings"
  ON public.daily_earnings FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND agreement_id IN (
      SELECT id FROM driver_agreements
      WHERE driver_id IN (SELECT id FROM driver_profiles WHERE user_id = auth.uid())
    )
  );

-- Drivers can update their own entries (edit amounts)
CREATE POLICY "Drivers can update their earnings"
  ON public.daily_earnings FOR UPDATE
  USING (created_by = auth.uid());

-- Owners can update earnings (for verification_status, dispute_note)
CREATE POLICY "Owners can verify earnings"
  ON public.daily_earnings FOR UPDATE
  USING (
    agreement_id IN (SELECT id FROM driver_agreements WHERE owner_id = auth.uid())
  );

-- ============================================
-- 8. RPC: Dashboard summary (single query)
-- ============================================
CREATE OR REPLACE FUNCTION public.get_agreement_summary(p_agreement_id UUID)
RETURNS TABLE (
  today_earned NUMERIC,
  today_paid NUMERIC,
  week_earned NUMERIC,
  week_paid NUMERIC,
  month_earned NUMERIC,
  month_paid NUMERIC,
  total_paid NUMERIC,
  unverified_count BIGINT,
  unverified_amount NUMERIC,
  disputed_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN de.date = CURRENT_DATE THEN de.total_earned ELSE 0 END), 0) AS today_earned,
    COALESCE(SUM(CASE WHEN de.date = CURRENT_DATE THEN de.amount_paid_to_owner ELSE 0 END), 0) AS today_paid,
    COALESCE(SUM(CASE WHEN de.date >= date_trunc('week', CURRENT_DATE) THEN de.total_earned ELSE 0 END), 0) AS week_earned,
    COALESCE(SUM(CASE WHEN de.date >= date_trunc('week', CURRENT_DATE) THEN de.amount_paid_to_owner ELSE 0 END), 0) AS week_paid,
    COALESCE(SUM(CASE WHEN de.date >= date_trunc('month', CURRENT_DATE) THEN de.total_earned ELSE 0 END), 0) AS month_earned,
    COALESCE(SUM(CASE WHEN de.date >= date_trunc('month', CURRENT_DATE) THEN de.amount_paid_to_owner ELSE 0 END), 0) AS month_paid,
    COALESCE(SUM(de.amount_paid_to_owner), 0) AS total_paid,
    COUNT(*) FILTER (WHERE de.verification_status = 'unverified') AS unverified_count,
    COALESCE(SUM(CASE WHEN de.verification_status = 'unverified' THEN de.amount_paid_to_owner ELSE 0 END), 0) AS unverified_amount,
    COUNT(*) FILTER (WHERE de.verification_status = 'disputed') AS disputed_count
  FROM public.daily_earnings de
  WHERE de.agreement_id = p_agreement_id;
$$;
