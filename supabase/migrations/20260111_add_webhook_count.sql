-- Run this in Supabase Dashboard > SQL Editor
-- Adds webhook_count column to appointments table

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS webhook_count INTEGER DEFAULT 0;
