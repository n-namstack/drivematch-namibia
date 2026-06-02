-- Driver Agreement & Earnings Ledger
-- Signature flow:
--   1. Owner creates agreement → owner_signed_at set, status = pending_signature
--   2. Driver signs           → driver_signed_at set, status = active
--   3. Owner logs daily entry → owner_confirmed_at set, driver notified
--   4. Driver confirms entry  → driver_confirmed_at set, is_locked = true (immutable)

CREATE TABLE IF NOT EXISTS driver_agreements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id              UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agreement_type         TEXT NOT NULL CHECK (agreement_type IN ('daily_remittance', 'buyout_contract')),
  vehicle_description    TEXT,
  daily_amount           NUMERIC(10,2) NOT NULL,
  owner_percentage       NUMERIC(5,2),
  buyout_target          NUMERIC(10,2),
  service_responsibility TEXT NOT NULL DEFAULT 'owner'
                         CHECK (service_responsibility IN ('owner', 'driver')),
  start_date             DATE NOT NULL,
  end_date               DATE,
  status                 TEXT NOT NULL DEFAULT 'pending_signature'
                         CHECK (status IN ('pending_signature', 'active', 'completed', 'terminated')),
  owner_signed_at        TIMESTAMPTZ DEFAULT NOW(),
  driver_signed_at       TIMESTAMPTZ,
  contract_document_url  TEXT,
  notes                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Daily logbook entries (one per day per agreement)
CREATE TABLE IF NOT EXISTS agreement_entries (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id         UUID NOT NULL REFERENCES driver_agreements(id) ON DELETE CASCADE,
  owner_id             UUID NOT NULL REFERENCES profiles(id),
  driver_id            UUID NOT NULL REFERENCES profiles(id),
  entry_date           DATE NOT NULL,
  amount               NUMERIC(10,2) NOT NULL,
  is_public_holiday    BOOLEAN NOT NULL DEFAULT FALSE,
  notes                TEXT,
  owner_confirmed_at   TIMESTAMPTZ DEFAULT NOW(),
  driver_confirmed_at  TIMESTAMPTZ,
  is_locked            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agreement_id, entry_date)
);

-- RLS: both parties can read/write their own agreements and entries
ALTER TABLE driver_agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties access own agreements"
  ON driver_agreements FOR ALL
  USING (owner_id = auth.uid() OR driver_id = auth.uid());

ALTER TABLE agreement_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parties access own entries"
  ON agreement_entries FOR ALL
  USING (owner_id = auth.uid() OR driver_id = auth.uid());

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_agreement_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_agreement_updated_at
  BEFORE UPDATE ON driver_agreements
  FOR EACH ROW EXECUTE FUNCTION set_agreement_updated_at();

-- Notify driver when owner creates an agreement (needs signature)
CREATE OR REPLACE FUNCTION notify_agreement_created()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.driver_id,
    'New Agreement to Sign',
    'An owner has sent you an agreement. Please review and sign it.',
    'agreement_signature',
    jsonb_build_object('agreement_id', NEW.id, 'owner_id', NEW.owner_id)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_agreement_created
  AFTER INSERT ON driver_agreements
  FOR EACH ROW EXECUTE FUNCTION notify_agreement_created();

-- Notify owner when driver signs the agreement
CREATE OR REPLACE FUNCTION notify_agreement_signed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.driver_signed_at IS NOT NULL AND OLD.driver_signed_at IS NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.owner_id,
      'Agreement Signed ✅',
      'The driver has signed the agreement. It is now active.',
      'agreement_signed',
      jsonb_build_object('agreement_id', NEW.id, 'driver_id', NEW.driver_id)
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_agreement_signed
  AFTER UPDATE ON driver_agreements
  FOR EACH ROW EXECUTE FUNCTION notify_agreement_signed();

-- Notify driver when owner logs a new entry (needs confirmation)
CREATE OR REPLACE FUNCTION notify_entry_logged()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.driver_id,
    'Earnings Entry to Confirm',
    'Please confirm the earnings entry of N$' || NEW.amount || ' for ' || NEW.entry_date || '.',
    'entry_confirmation',
    jsonb_build_object('entry_id', NEW.id, 'agreement_id', NEW.agreement_id, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_entry_logged
  AFTER INSERT ON agreement_entries
  FOR EACH ROW EXECUTE FUNCTION notify_entry_logged();

-- Notify owner when driver confirms an entry
CREATE OR REPLACE FUNCTION notify_entry_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.driver_confirmed_at IS NOT NULL AND OLD.driver_confirmed_at IS NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.owner_id,
      'Entry Confirmed ✅',
      'Driver confirmed the earnings entry of N$' || NEW.amount || ' for ' || NEW.entry_date || '.',
      'entry_confirmed',
      jsonb_build_object('entry_id', NEW.id, 'agreement_id', NEW.agreement_id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_entry_confirmed
  AFTER UPDATE ON agreement_entries
  FOR EACH ROW EXECUTE FUNCTION notify_entry_confirmed();
