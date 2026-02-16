-- DriveMatch - Trusted Driver Marketplace for Namibia
-- Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE (Base user information)
-- =============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  firstname TEXT NOT NULL,
  lastname TEXT NOT NULL,
  profile_image TEXT,
  role TEXT NOT NULL DEFAULT 'owner', -- 'driver', 'owner', 'admin'
  location TEXT, -- City/Town in Namibia
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- DRIVER PROFILES TABLE (Extended driver info)
-- =============================================
CREATE TABLE driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  years_of_experience INTEGER DEFAULT 0,
  availability TEXT NOT NULL DEFAULT 'full_time', -- 'full_time', 'part_time', 'weekends_only'
  vehicle_types TEXT[] DEFAULT '{}', -- Array: 'sedan', 'suv', 'truck', 'minibus', 'taxi'
  has_pdp BOOLEAN DEFAULT FALSE, -- Professional Driving Permit
  preferred_areas TEXT[], -- Areas in Namibia they prefer to work
  expected_salary_range JSONB, -- { min: 5000, max: 10000, currency: 'NAD' }
  languages TEXT[] DEFAULT ARRAY['English'], -- Languages spoken
  rating NUMERIC(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'submitted', 'verified', 'rejected'
  rejection_reason TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TRIGGER set_timestamp_driver_profiles
BEFORE UPDATE ON driver_profiles
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- DRIVER DOCUMENTS TABLE (Verification docs)
-- =============================================
CREATE TABLE driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'drivers_license', 'pdp', 'id_document', 'police_clearance', 'reference_letter'
  document_url TEXT NOT NULL,
  document_number TEXT,
  expiry_date DATE,
  verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'expired'
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_driver_documents
BEFORE UPDATE ON driver_documents
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- WORK HISTORY TABLE (Driver's past jobs)
-- =============================================
CREATE TABLE work_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  position TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  reference_name TEXT,
  reference_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_work_history
BEFORE UPDATE ON work_history
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- DRIVER REVIEWS TABLE
-- =============================================
CREATE TABLE driver_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  engagement_id UUID, -- Optional reference to a hiring engagement
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_engagement BOOLEAN DEFAULT FALSE, -- True if they actually hired through app
  response TEXT, -- Driver can respond to reviews
  response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(driver_id, reviewer_id) -- One review per owner-driver pair
);

CREATE TRIGGER set_timestamp_driver_reviews
BEFORE UPDATE ON driver_reviews
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Function to update driver rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE driver_profiles
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM driver_reviews
      WHERE driver_id = NEW.driver_id
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM driver_reviews
      WHERE driver_id = NEW.driver_id
    )
  WHERE id = NEW.driver_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON driver_reviews
FOR EACH ROW
EXECUTE PROCEDURE update_driver_rating();

-- =============================================
-- CONVERSATIONS TABLE (Chat threads)
-- =============================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_unread_count INTEGER DEFAULT 0,
  driver_unread_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, driver_id)
);

CREATE TRIGGER set_timestamp_conversations
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- MESSAGES TABLE (Individual messages)
-- =============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text', -- 'text', 'image', 'document', 'system'
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster message queries
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Function to update conversation on new message
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
DECLARE
  v_owner_id UUID;
  v_driver_user_id UUID;
BEGIN
  -- Get owner_id and driver's user_id from conversation
  SELECT c.owner_id, dp.user_id INTO v_owner_id, v_driver_user_id
  FROM conversations c
  JOIN driver_profiles dp ON dp.id = c.driver_id
  WHERE c.id = NEW.conversation_id;

  -- Update last_message_at and unread counts
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

CREATE TRIGGER update_conversation_trigger
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE PROCEDURE update_conversation_on_message();

-- =============================================
-- ENGAGEMENTS TABLE (Hiring records)
-- =============================================
CREATE TABLE engagements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'inquiry', -- 'inquiry', 'active', 'completed', 'cancelled'
  start_date DATE,
  end_date DATE,
  job_type TEXT, -- 'permanent', 'temporary', 'contract'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER set_timestamp_engagements
BEFORE UPDATE ON engagements
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- =============================================
-- SAVED DRIVERS TABLE (Favorites/Bookmarks)
-- =============================================
CREATE TABLE saved_drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(owner_id, driver_id)
);

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL, -- 'message', 'review', 'verification', 'engagement', 'system'
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- =============================================
-- ADMIN ACTIONS LOG TABLE
-- =============================================
CREATE TABLE admin_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action_type TEXT NOT NULL, -- 'verify_document', 'reject_document', 'suspend_user', 'feature_driver'
  target_type TEXT NOT NULL, -- 'driver', 'document', 'review', 'user'
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- DRIVER PROFILES POLICIES
CREATE POLICY "Anyone can view all driver profiles"
ON driver_profiles FOR SELECT
USING (true);

CREATE POLICY "Drivers can update own profile"
ON driver_profiles FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Drivers can insert own profile"
ON driver_profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view and update all driver profiles
CREATE POLICY "Admins can view all driver profiles"
ON driver_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update all driver profiles"
ON driver_profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- DRIVER DOCUMENTS POLICIES
CREATE POLICY "Drivers can view own documents"
ON driver_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can insert own documents"
ON driver_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all documents"
ON driver_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update documents"
ON driver_documents FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- WORK HISTORY POLICIES
CREATE POLICY "Anyone can view work history of verified drivers"
ON work_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND verification_status = 'verified'
  )
  OR
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can manage own work history"
ON work_history FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- DRIVER REVIEWS POLICIES
CREATE POLICY "Anyone can view reviews"
ON driver_reviews FOR SELECT
USING (true);

CREATE POLICY "Owners can create reviews"
ON driver_reviews FOR INSERT
WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Reviewers can update own reviews"
ON driver_reviews FOR UPDATE
USING (reviewer_id = auth.uid());

CREATE POLICY "Drivers can respond to their reviews"
ON driver_reviews FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- CONVERSATIONS POLICIES
CREATE POLICY "Participants can view their conversations"
ON conversations FOR SELECT
USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Owners can start conversations"
ON conversations FOR INSERT
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Participants can update conversations"
ON conversations FOR UPDATE
USING (
  owner_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM driver_profiles
    WHERE id = driver_id AND user_id = auth.uid()
  )
);

-- MESSAGES POLICIES
CREATE POLICY "Participants can view messages"
ON messages FOR SELECT
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

CREATE POLICY "Participants can send messages"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
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

-- SAVED DRIVERS POLICIES
CREATE POLICY "Owners can manage saved drivers"
ON saved_drivers FOR ALL
USING (owner_id = auth.uid());

-- NOTIFICATIONS POLICIES
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (user_id = auth.uid());

-- ADMIN ACTIONS POLICIES
CREATE POLICY "Admins can view all admin actions"
ON admin_actions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can insert admin actions"
ON admin_actions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================
-- STORAGE BUCKETS
-- =============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'Profile Photos', true),
  ('driver_documents', 'Driver Verification Documents', false),
  ('chat_attachments', 'Chat Attachments', false);

-- Storage policies for avatars (public read, authenticated write)
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for driver documents (private)
CREATE POLICY "Drivers can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'driver_documents'
  AND auth.role() = 'authenticated'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Drivers can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver_documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'driver_documents'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to create profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, firstname, lastname, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'owner'),
    COALESCE(NEW.raw_user_meta_data->>'firstname', ''),
    COALESCE(NEW.raw_user_meta_data->>'lastname', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  -- If user is a driver, create driver profile
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'owner') = 'driver' THEN
    INSERT INTO public.driver_profiles (user_id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_user();

-- Function to search drivers with filters
CREATE OR REPLACE FUNCTION search_drivers(
  p_location TEXT DEFAULT NULL,
  p_min_experience INTEGER DEFAULT NULL,
  p_availability TEXT DEFAULT NULL,
  p_vehicle_types TEXT[] DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_has_pdp BOOLEAN DEFAULT NULL,
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
  verification_status TEXT
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
    dp.verification_status
  FROM driver_profiles dp
  JOIN profiles p ON p.id = dp.user_id
  WHERE
    p.is_active = true
    AND (p_location IS NULL OR p.location ILIKE '%' || p_location || '%')
    AND (p_min_experience IS NULL OR dp.years_of_experience >= p_min_experience)
    AND (p_availability IS NULL OR dp.availability = p_availability)
    AND (p_vehicle_types IS NULL OR dp.vehicle_types && p_vehicle_types)
    AND (p_min_rating IS NULL OR dp.rating >= p_min_rating)
    AND (p_has_pdp IS NULL OR dp.has_pdp = p_has_pdp)
  ORDER BY dp.is_featured DESC, dp.rating DESC, dp.total_reviews DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Enable realtime for messages and conversations
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
