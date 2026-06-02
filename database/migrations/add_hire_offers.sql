-- Direct hire offers: owners can send a formal hire offer to any driver
-- Driver can accept or decline; both sides receive push notifications via DB triggers

CREATE TABLE IF NOT EXISTS hire_offers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT,
  job_type    TEXT CHECK (job_type IN ('permanent', 'temporary', 'contract')),
  start_date  DATE,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'viewed', 'accepted', 'rejected', 'withdrawn')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: owners see their own sent offers; drivers see offers addressed to them
ALTER TABLE hire_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own offers"
  ON hire_offers FOR ALL
  USING (owner_id = auth.uid());

CREATE POLICY "drivers view and respond to their offers"
  ON hire_offers FOR ALL
  USING (driver_id = auth.uid());

-- Auto-update updated_at on any change
CREATE OR REPLACE FUNCTION set_hire_offer_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hire_offer_updated_at
  BEFORE UPDATE ON hire_offers
  FOR EACH ROW EXECUTE FUNCTION set_hire_offer_updated_at();

-- Notify driver when a new offer arrives
CREATE OR REPLACE FUNCTION notify_hire_offer()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.driver_id,
    'New Hire Offer',
    'You have received a direct hire offer',
    'hire_offer',
    jsonb_build_object('offer_id', NEW.id, 'owner_id', NEW.owner_id)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_hire_offer
  AFTER INSERT ON hire_offers
  FOR EACH ROW EXECUTE FUNCTION notify_hire_offer();

-- Notify owner when driver responds (accepted or rejected)
CREATE OR REPLACE FUNCTION notify_hire_offer_response()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('accepted', 'rejected')
     AND OLD.status NOT IN ('accepted', 'rejected') THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.owner_id,
      CASE WHEN NEW.status = 'accepted' THEN 'Offer Accepted 🎉' ELSE 'Offer Declined' END,
      CASE WHEN NEW.status = 'accepted'
           THEN 'A driver accepted your hire offer'
           ELSE 'A driver declined your hire offer' END,
      'hire_offer_response',
      jsonb_build_object('offer_id', NEW.id, 'driver_id', NEW.driver_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_hire_offer_response
  AFTER UPDATE ON hire_offers
  FOR EACH ROW EXECUTE FUNCTION notify_hire_offer_response();
