-- Migration: Complete app fixes
-- Fixes: storage buckets, RLS policies, indexes, search_drivers conflict,
--        admin notifications, mark-as-read, account deletion support
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. FIX: Create missing storage bucket for profile images
-- The app uploads to 'profile_images' but only 'avatars' exists
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_images', 'Profile Images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile_images (public read, authenticated write)
CREATE POLICY "Public can view profile images"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile_images');

CREATE POLICY "Authenticated users can upload profile images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile_images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own profile images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile_images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own profile images"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile_images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =============================================
-- 2. FIX: Storage policies for chat_attachments (completely missing)
-- =============================================
CREATE POLICY "Chat participants can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat_attachments'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Chat participants can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat_attachments'
  AND auth.role() = 'authenticated'
);

-- =============================================
-- 3. FIX: Storage DELETE policies for all buckets (completely missing)
-- =============================================
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Drivers can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver_documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can delete any documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'driver_documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================
-- 4. FIX: search_drivers function conflict
-- The show_all_drivers.sql overwrites the newer version from add_new_features.sql.
-- This is the definitive version with all parameters.
-- =============================================
CREATE OR REPLACE FUNCTION search_drivers(
  p_location TEXT DEFAULT NULL,
  p_min_experience INTEGER DEFAULT NULL,
  p_availability TEXT DEFAULT NULL,
  p_vehicle_types TEXT[] DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_has_pdp BOOLEAN DEFAULT NULL,
  p_available_now BOOLEAN DEFAULT NULL,
  p_search_text TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  firstname TEXT,
  lastname TEXT,
  profile_image TEXT,
  bio TEXT,
  years_of_experience INTEGER,
  availability TEXT,
  vehicle_types TEXT[],
  has_pdp BOOLEAN,
  location TEXT,
  rating NUMERIC,
  total_reviews INTEGER,
  verification_status TEXT,
  is_featured BOOLEAN,
  is_available_now BOOLEAN,
  phone TEXT,
  languages TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dp.id,
    dp.user_id,
    p.firstname,
    p.lastname,
    p.profile_image,
    dp.bio,
    dp.years_of_experience,
    dp.availability,
    dp.vehicle_types,
    dp.has_pdp,
    p.location,
    dp.rating,
    dp.total_reviews,
    dp.verification_status,
    dp.is_featured,
    dp.is_available_now,
    p.phone,
    dp.languages
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.user_id
  WHERE
    COALESCE(p.is_active, true) = true
    AND (p_search_text IS NULL OR
      p.firstname ILIKE '%' || p_search_text || '%' OR
      p.lastname ILIKE '%' || p_search_text || '%' OR
      p.location ILIKE '%' || p_search_text || '%')
    AND (p_location IS NULL OR p.location ILIKE '%' || p_location || '%')
    AND (p_min_experience IS NULL OR dp.years_of_experience >= p_min_experience)
    AND (p_availability IS NULL OR dp.availability = p_availability)
    AND (p_vehicle_types IS NULL OR dp.vehicle_types && p_vehicle_types)
    AND (p_min_rating IS NULL OR dp.rating >= p_min_rating)
    AND (p_has_pdp IS NULL OR dp.has_pdp = p_has_pdp)
    AND (p_available_now IS NULL OR dp.is_available_now = p_available_now)
  ORDER BY
    dp.is_available_now DESC,
    dp.verification_status = 'verified' DESC,
    dp.is_featured DESC,
    dp.rating DESC,
    dp.total_reviews DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 5. FIX: Missing RLS policies for messages (UPDATE for mark-as-read)
-- =============================================
CREATE POLICY "Participants can update messages"
ON messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = conversation_id
    AND (
      owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM driver_profiles
        WHERE id = driver_id AND user_id = auth.uid()
      )
    )
  )
);

-- =============================================
-- 6. FIX: Missing RLS policy for notifications (INSERT for admin)
-- =============================================
CREATE POLICY "Admins can insert notifications"
ON notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================
-- 7. FIX: Missing DELETE policies for notifications
-- =============================================
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- 8. FIX: Missing DELETE policies for profiles (account deletion)
-- =============================================
CREATE POLICY "Users can delete own profile"
ON profiles FOR DELETE
USING (auth.uid() = id);

-- =============================================
-- 9. FIX: Missing DELETE policy for driver_profiles
-- =============================================
CREATE POLICY "Drivers can delete own driver profile"
ON driver_profiles FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- 10. FIX: Missing DELETE policy for driver_documents
-- =============================================
CREATE POLICY "Drivers can delete own documents"
ON driver_documents FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- =============================================
-- 11. FIX: Missing DELETE policy for driver_reviews
-- =============================================
CREATE POLICY "Reviewers can delete own reviews"
ON driver_reviews FOR DELETE
USING (reviewer_id = auth.uid());

-- =============================================
-- 12. FIX: Missing DELETE policy for messages
-- =============================================
CREATE POLICY "Users can delete own sent messages"
ON messages FOR DELETE
USING (sender_id = auth.uid());

-- =============================================
-- 13. FIX: Engagements table RLS policies (table exists but has zero policies)
-- =============================================
CREATE POLICY "Owners can view their engagements"
ON engagements FOR SELECT
USING (owner_id = auth.uid());

CREATE POLICY "Drivers can view their engagements"
ON engagements FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can create engagements"
ON engagements FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Participants can update engagements"
ON engagements FOR UPDATE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- =============================================
-- 14. FIX: Missing indexes on frequently queried columns
-- =============================================
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_is_featured ON driver_profiles(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_verification_status ON driver_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_rating ON driver_profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_owner_id ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_driver_id ON conversations(driver_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_saved_drivers_owner_id ON saved_drivers(owner_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_work_history_driver_id ON work_history(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_reviews_driver_id ON driver_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);

-- =============================================
-- 15. FIX: Make notification triggers use SECURITY DEFINER
-- (already done in fix_message_trigger.sql, but re-applying to be safe)
-- =============================================
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;

  SELECT firstname || ' ' || lastname INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  IF NEW.sender_id = v_conversation.owner_id THEN
    SELECT user_id INTO v_recipient_id FROM driver_profiles WHERE id = v_conversation.driver_id;
  ELSE
    v_recipient_id := v_conversation.owner_id;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_recipient_id,
    'New Message',
    v_sender_name || ': ' || LEFT(NEW.content, 50),
    'message',
    jsonb_build_object('conversation_id', NEW.conversation_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_driver_user_id UUID;
BEGIN
  SELECT c.owner_id, dp.user_id INTO v_owner_id, v_driver_user_id
  FROM conversations c
  JOIN driver_profiles dp ON dp.id = c.driver_id
  WHERE c.id = NEW.conversation_id;

  IF NEW.sender_id = v_owner_id THEN
    UPDATE conversations
    SET last_message_at = NOW(),
        driver_unread_count = driver_unread_count + 1
    WHERE id = NEW.conversation_id;
  ELSE
    UPDATE conversations
    SET last_message_at = NOW(),
        owner_unread_count = owner_unread_count + 1
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_profile_saved()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_owner_name TEXT;
  v_driver_user_id UUID;
BEGIN
  SELECT firstname || ' ' || lastname INTO v_owner_name
  FROM profiles WHERE id = NEW.owner_id;

  SELECT user_id INTO v_driver_user_id
  FROM driver_profiles WHERE id = NEW.driver_id;

  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_driver_user_id,
    'Profile Saved',
    v_owner_name || ' saved your profile',
    'engagement',
    jsonb_build_object('owner_id', NEW.owner_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_on_document_status_change()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_driver_user_id UUID;
  v_doc_type TEXT;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
    SELECT user_id INTO v_driver_user_id
    FROM driver_profiles WHERE id = NEW.driver_id;

    v_doc_type := REPLACE(INITCAP(REPLACE(NEW.document_type, '_', ' ')), ' ', ' ');

    IF NEW.verification_status = 'verified' THEN
      v_title := 'Document Verified';
      v_message := 'Your ' || v_doc_type || ' has been verified';
    ELSIF NEW.verification_status = 'rejected' THEN
      v_title := 'Document Rejected';
      v_message := 'Your ' || v_doc_type || ' was rejected. Please re-upload.';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO notifications (user_id, title, message, type, data)
    VALUES (
      v_driver_user_id,
      v_title,
      v_message,
      'verification',
      jsonb_build_object('document_id', NEW.id, 'status', NEW.verification_status)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 16. Ensure columns added by migrations exist
-- (safe to re-run with IF NOT EXISTS)
-- =============================================
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS is_available_now BOOLEAN DEFAULT false;
ALTER TABLE driver_profiles ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0;
