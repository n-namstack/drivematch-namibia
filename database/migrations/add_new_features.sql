-- Migration: Add new features
-- Run this in your Supabase SQL Editor

-- 1. Add is_available_now column to driver_profiles
ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS is_available_now BOOLEAN DEFAULT false;

-- 2. Update search_drivers function to include is_available_now filter
-- Available-now drivers sort first, then verified, then featured, then by rating
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

-- 3. Create notification triggers

-- Trigger: Notify driver when they get a new message
CREATE OR REPLACE FUNCTION notify_on_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation RECORD;
  v_sender_name TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get conversation details
  SELECT * INTO v_conversation FROM conversations WHERE id = NEW.conversation_id;

  -- Get sender name
  SELECT firstname || ' ' || lastname INTO v_sender_name
  FROM profiles WHERE id = NEW.sender_id;

  -- Determine recipient
  IF NEW.sender_id = v_conversation.owner_id THEN
    -- Sender is owner, notify driver
    SELECT user_id INTO v_recipient_id FROM driver_profiles WHERE id = v_conversation.driver_id;
  ELSE
    -- Sender is driver, notify owner
    v_recipient_id := v_conversation.owner_id;
  END IF;

  -- Create notification
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

DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_message();

-- Trigger: Notify driver when their profile is saved by an owner
CREATE OR REPLACE FUNCTION notify_on_profile_saved()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trigger_notify_profile_saved ON saved_drivers;
CREATE TRIGGER trigger_notify_profile_saved
AFTER INSERT ON saved_drivers
FOR EACH ROW
EXECUTE FUNCTION notify_on_profile_saved();

-- Trigger: Notify driver when document verification status changes
CREATE OR REPLACE FUNCTION notify_on_document_status_change()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trigger_notify_document_status ON driver_documents;
CREATE TRIGGER trigger_notify_document_status
AFTER UPDATE ON driver_documents
FOR EACH ROW
EXECUTE FUNCTION notify_on_document_status_change();
