-- Suppress owner notifications for N$0 day-off entries (auto-logged Sundays
-- and public holidays). Real entries (amount > 0) still notify the owner.

CREATE OR REPLACE FUNCTION notify_entry_logged()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Day-off auto-log entries have amount = 0; don't spam the owner
  IF NEW.amount = 0 THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    NEW.owner_id,
    'Entry to Confirm',
    'Your driver has logged N$' || NEW.amount || ' for ' || NEW.entry_date || '. Please confirm receipt.',
    'entry_confirmation',
    jsonb_build_object('entry_id', NEW.id, 'agreement_id', NEW.agreement_id, 'amount', NEW.amount)
  );
  RETURN NEW;
END;
$$;
