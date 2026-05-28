-- Migration: Add push_token column to profiles for Expo push notifications
-- Run this in your Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
