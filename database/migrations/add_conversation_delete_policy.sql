-- Allow participants to delete their conversations
-- Messages are automatically deleted via CASCADE foreign key constraint

CREATE POLICY "Participants can delete their conversations"
ON public.conversations FOR DELETE
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = conversations.driver_id AND user_id = auth.uid()
  )
);
