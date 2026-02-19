-- Migration: Add is_available_now column to driver_profiles
-- Run this in your Supabase SQL Editor

ALTER TABLE driver_profiles
ADD COLUMN IF NOT EXISTS is_available_now BOOLEAN DEFAULT false;
