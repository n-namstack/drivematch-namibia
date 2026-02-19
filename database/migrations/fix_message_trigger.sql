-- Migration: Fix all triggers that insert notifications
-- The notification triggers need SECURITY DEFINER because they insert
-- notifications for OTHER users (recipients), and there's no INSERT policy
-- on the notifications table.
-- Run this in your Supabase SQL Editor

-- 1. Fix: Message notification trigger
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

-- 2. Fix: Conversation update trigger
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

-- 3. Fix: Profile saved notification trigger
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

-- 4. Fix: Document status notification trigger
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
