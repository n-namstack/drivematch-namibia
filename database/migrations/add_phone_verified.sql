-- Add phone_verified column to profiles
-- New users will default to false (must verify via OTP)
-- Existing users are set to true (already trusted)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Mark all existing users as verified so they aren't blocked
UPDATE profiles SET phone_verified = true;
