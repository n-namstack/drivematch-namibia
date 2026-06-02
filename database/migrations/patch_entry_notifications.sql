-- Fix entry notification direction:
-- Driver logs entry → notify OWNER to confirm receipt
-- Owner confirms receipt → notify DRIVER their entry was confirmed

CREATE OR REPLACE FUNCTION notify_entry_logged()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
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

CREATE OR REPLACE FUNCTION notify_entry_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.owner_confirmed_at IS NOT NULL AND OLD.owner_confirmed_at IS NULL THEN
    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      NEW.driver_id,
      'Entry Confirmed',
      'Owner confirmed receipt of N$' || NEW.amount || ' for ' || NEW.entry_date || '. Entry is now locked.',
      'entry_confirmed',
      jsonb_build_object('entry_id', NEW.id, 'agreement_id', NEW.agreement_id, 'amount', NEW.amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
