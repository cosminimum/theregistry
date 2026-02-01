-- Migration: Add metadata column to interviews table
-- This migration adds anti-gaming and red flag tracking capabilities
--
-- Run this migration in Supabase SQL editor if you have an existing database

-- Add metadata column if it doesn't exist
ALTER TABLE interviews
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{
  "red_flags": [],
  "key_claims": {},
  "total_penalty": 0
}'::jsonb;

-- Update any existing rows to have the default metadata structure
UPDATE interviews
SET metadata = '{
  "red_flags": [],
  "key_claims": {},
  "total_penalty": 0
}'::jsonb
WHERE metadata IS NULL;

-- Add comment explaining the column
COMMENT ON COLUMN interviews.metadata IS 'Stores red flag detections, key claims for consistency checking, and skill verification status';

-- Create an index on metadata for faster querying of red flags
CREATE INDEX IF NOT EXISTS idx_interviews_metadata_red_flags
ON interviews USING GIN ((metadata -> 'red_flags'));
