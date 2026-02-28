-- Migration: Document Verification Overhaul
-- Adds selfie-with-document verification, AI results storage, and expiry tracking
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. Add new columns to driver_documents
-- =============================================
ALTER TABLE driver_documents
  ADD COLUMN IF NOT EXISTS selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS selfie_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS document_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS ai_verification_result JSONB,
  ADD COLUMN IF NOT EXISTS ai_verified_at TIMESTAMPTZ;

-- =============================================
-- 2. Backfill document_storage_path from existing document_url
--    Pattern: https://xxx.supabase.co/storage/v1/object/public/driver_documents/{path}
-- =============================================
UPDATE driver_documents
SET document_storage_path = split_part(document_url, 'driver_documents/', 2)
WHERE document_storage_path IS NULL
  AND document_url IS NOT NULL
  AND document_url LIKE '%driver_documents/%';

-- =============================================
-- 3. Create document_expiry_alerts table
-- =============================================
CREATE TABLE IF NOT EXISTS document_expiry_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES driver_documents(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('30_day', '7_day', 'expired')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_alert_per_document UNIQUE (document_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_expiry_alerts_document
  ON document_expiry_alerts(document_id);

CREATE INDEX IF NOT EXISTS idx_expiry_alerts_driver
  ON document_expiry_alerts(driver_id);

-- =============================================
-- 4. RLS policies for document_expiry_alerts
-- =============================================
ALTER TABLE document_expiry_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view their own expiry alerts"
  ON document_expiry_alerts FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- =============================================
-- 5. Storage policy for selfie uploads
--    (driver_documents bucket already has write policy for user's own folder)
--    Selfies use the same bucket and path pattern: {userId}/selfie_{docId}_{timestamp}.jpeg
--    so existing policies cover them.
-- =============================================

-- =============================================
-- 6. Function to check and expire documents (called by cron)
-- =============================================
CREATE OR REPLACE FUNCTION check_and_expire_documents()
RETURNS JSONB
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER := 0;
  thirty_day_count INTEGER := 0;
  seven_day_count INTEGER := 0;
  doc RECORD;
BEGIN
  -- Mark expired documents
  FOR doc IN
    SELECT dd.id AS doc_id, dd.driver_id, dd.document_type, dd.expiry_date,
           dp.user_id
    FROM driver_documents dd
    JOIN driver_profiles dp ON dp.id = dd.driver_id
    WHERE dd.expiry_date < CURRENT_DATE
      AND dd.verification_status IN ('verified', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM document_expiry_alerts dea
        WHERE dea.document_id = dd.id AND dea.alert_type = 'expired'
      )
  LOOP
    -- Update document status to expired
    UPDATE driver_documents
    SET verification_status = 'expired'
    WHERE id = doc.doc_id;

    -- Reset driver verification if required doc expired
    IF doc.document_type IN ('drivers_license', 'id_document') THEN
      UPDATE driver_profiles
      SET verification_status = 'pending'
      WHERE id = doc.driver_id
        AND verification_status = 'verified';
    END IF;

    -- Create notification
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      doc.user_id,
      'document_expired',
      'Document Expired',
      'Your ' || replace(doc.document_type, '_', ' ') || ' has expired. Your verification status has been updated. Please upload a renewed document.'
    );

    -- Record alert
    INSERT INTO document_expiry_alerts (document_id, driver_id, alert_type)
    VALUES (doc.doc_id, doc.driver_id, 'expired')
    ON CONFLICT ON CONSTRAINT unique_alert_per_document DO NOTHING;

    expired_count := expired_count + 1;
  END LOOP;

  -- 7-day warnings
  FOR doc IN
    SELECT dd.id AS doc_id, dd.driver_id, dd.document_type, dd.expiry_date,
           dp.user_id
    FROM driver_documents dd
    JOIN driver_profiles dp ON dp.id = dd.driver_id
    WHERE dd.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      AND dd.verification_status IN ('verified', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM document_expiry_alerts dea
        WHERE dea.document_id = dd.id AND dea.alert_type = '7_day'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      doc.user_id,
      'document_expiry',
      'Document Expires in 7 Days',
      'Your ' || replace(doc.document_type, '_', ' ') || ' expires on ' || doc.expiry_date::TEXT || '. Upload a renewed document now to avoid interruption.'
    );

    INSERT INTO document_expiry_alerts (document_id, driver_id, alert_type)
    VALUES (doc.doc_id, doc.driver_id, '7_day')
    ON CONFLICT ON CONSTRAINT unique_alert_per_document DO NOTHING;

    seven_day_count := seven_day_count + 1;
  END LOOP;

  -- 30-day warnings
  FOR doc IN
    SELECT dd.id AS doc_id, dd.driver_id, dd.document_type, dd.expiry_date,
           dp.user_id
    FROM driver_documents dd
    JOIN driver_profiles dp ON dp.id = dd.driver_id
    WHERE dd.expiry_date BETWEEN CURRENT_DATE + INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days'
      AND dd.verification_status IN ('verified', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM document_expiry_alerts dea
        WHERE dea.document_id = dd.id AND dea.alert_type = '30_day'
      )
  LOOP
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (
      doc.user_id,
      'document_expiry',
      'Document Expiring Soon',
      'Your ' || replace(doc.document_type, '_', ' ') || ' expires on ' || doc.expiry_date::TEXT || '. Please renew it to maintain your verified status.'
    );

    INSERT INTO document_expiry_alerts (document_id, driver_id, alert_type)
    VALUES (doc.doc_id, doc.driver_id, '30_day')
    ON CONFLICT ON CONSTRAINT unique_alert_per_document DO NOTHING;

    thirty_day_count := thirty_day_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expired', expired_count,
    'seven_day_warnings', seven_day_count,
    'thirty_day_warnings', thirty_day_count
  );
END;
$$ LANGUAGE plpgsql;
