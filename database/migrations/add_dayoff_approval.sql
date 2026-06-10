-- Day-off approval workflow
-- pending  = driver requested; awaiting owner decision
-- approved = owner approved; counts as an excused day off (no remittance owed)
-- rejected = owner rejected; driver still owes the full daily remittance for that day
-- NULL     = auto-logged Sunday/holiday (off_sundays / off_public_holidays agreement flag)
ALTER TABLE agreement_entries
  ADD COLUMN IF NOT EXISTS dayoff_status TEXT
    CHECK (dayoff_status IN ('pending', 'approved', 'rejected'));
