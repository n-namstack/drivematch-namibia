-- Fix: Add RLS policies for the messages table
-- This fixes the "new row violates row-level security policy" error when sending messages
-- Run this in your Supabase SQL Editor

-- Enable RLS on messages table (if not already enabled)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow conversation participants to INSERT messages (send messages)
-- sender_id must match the authenticated user
-- User must be a participant in the conversation (as owner or driver)
CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM driver_profiles dp
        WHERE dp.id = c.driver_id AND dp.user_id = auth.uid()
      )
    )
  )
);

-- Allow conversation participants to SELECT (read) messages
CREATE POLICY "Participants can read messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM driver_profiles dp
        WHERE dp.id = c.driver_id AND dp.user_id = auth.uid()
      )
    )
  )
);

-- Allow participants to update messages (for marking as read)
CREATE POLICY "Participants can update messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (
      c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM driver_profiles dp
        WHERE dp.id = c.driver_id AND dp.user_id = auth.uid()
      )
    )
  )
);
