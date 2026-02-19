-- Delete User Account Function
-- This function runs with SECURITY DEFINER privileges so it can delete from auth.users.
-- Called from the app via: supabase.rpc('delete_user_account')
-- It deletes ALL user data and then removes the auth.users row.

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _driver_profile_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get driver profile ID if exists
  SELECT id INTO _driver_profile_id
  FROM driver_profiles
  WHERE user_id = _user_id;

  -- Delete driver-related data
  IF _driver_profile_id IS NOT NULL THEN
    DELETE FROM driver_documents WHERE driver_id = _driver_profile_id;
    DELETE FROM work_history WHERE driver_id = _driver_profile_id;
    DELETE FROM driver_reviews WHERE driver_id = _driver_profile_id;
    DELETE FROM engagements WHERE driver_id = _driver_profile_id;
    DELETE FROM driver_profiles WHERE id = _driver_profile_id;
  END IF;

  -- Delete owner-related data
  DELETE FROM saved_drivers WHERE owner_id = _user_id;
  DELETE FROM engagements WHERE owner_id = _user_id;
  DELETE FROM driver_reviews WHERE reviewer_id = _user_id;

  -- Delete messages and notifications
  DELETE FROM messages WHERE sender_id = _user_id;
  DELETE FROM notifications WHERE user_id = _user_id;

  -- Delete profile
  DELETE FROM profiles WHERE id = _user_id;

  -- Delete from auth.users (this is why we need SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- Only allow authenticated users to call this function
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
