-- Add per-agreement work-schedule columns to driver_agreements.
-- off_sundays: driver does not log (and is not expected to work) on Sundays.
-- off_public_holidays: driver does not log on Namibian public holidays.
-- Both default to TRUE to preserve existing agreement behaviour.

ALTER TABLE driver_agreements
  ADD COLUMN IF NOT EXISTS off_sundays         BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS off_public_holidays BOOLEAN NOT NULL DEFAULT TRUE;
