-- Migration: Add 'deliberation' to message_role enum
-- This allows internal deliberation messages that are not shown to applicants

-- Add the new enum value
ALTER TYPE message_role ADD VALUE IF NOT EXISTS 'deliberation';
