-- Add rejection fields to agreement_entries
-- Run in Supabase SQL editor before deploying the rejection feature

ALTER TABLE agreement_entries
  ADD COLUMN IF NOT EXISTS owner_rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_notes    TEXT;

-- Notify driver when owner rejects their entry
CREATE OR REPLACE FUNCTION notify_entry_rejected()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_owner_name TEXT;
BEGIN
  IF NEW.owner_rejected_at IS NOT NULL AND OLD.owner_rejected_at IS NULL THEN
    SELECT CONCAT(firstname, ' ', lastname)
      INTO v_owner_name
      FROM profiles
     WHERE id = NEW.owner_id;

    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
      NEW.driver_id,
      'Entry Rejected',
      COALESCE(v_owner_name, 'Your owner') || ' rejected your entry for ' || TO_CHAR(NEW.entry_date::date, 'DD Mon YYYY') || '. Please re-log.',
      'entry_rejected',
      jsonb_build_object('agreement_id', NEW.agreement_id, 'entry_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_entry_rejected ON agreement_entries;
CREATE TRIGGER on_entry_rejected
  AFTER UPDATE ON agreement_entries
  FOR EACH ROW EXECUTE FUNCTION notify_entry_rejected();
