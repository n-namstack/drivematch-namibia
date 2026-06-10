-- Track how much of an entry's shortfall has been paid via subsequent entries.
-- outstanding_shortfall = max(0, daily_amount - amount - shortfall_paid)
ALTER TABLE agreement_entries
  ADD COLUMN IF NOT EXISTS shortfall_paid NUMERIC(10,2) NOT NULL DEFAULT 0;
