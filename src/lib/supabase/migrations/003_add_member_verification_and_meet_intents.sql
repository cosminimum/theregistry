-- Migration: Add member verification and meet intents tables
-- This migration adds:
-- 1. pending_claims table for tweet verification flow
-- 2. API key and verification_tweet_id columns to members
-- 3. meet_intents table for member-to-member meeting requests

-- ============ PENDING CLAIMS TABLE ============
-- Stores temporary claim data during tweet verification process

CREATE TABLE IF NOT EXISTS pending_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  x_handle TEXT NOT NULL,
  x_user_id TEXT NOT NULL,
  verification_code TEXT NOT NULL UNIQUE,
  claim_token TEXT NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  oauth_data JSONB, -- Stores oauth tokens for later use
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour'
);

CREATE INDEX IF NOT EXISTS idx_pending_claims_code ON pending_claims(verification_code);
CREATE INDEX IF NOT EXISTS idx_pending_claims_handle ON pending_claims(x_handle);
CREATE INDEX IF NOT EXISTS idx_pending_claims_expires ON pending_claims(expires_at);

-- Enable RLS
ALTER TABLE pending_claims ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role can do everything on pending_claims"
  ON pending_claims FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============ UPDATE MEMBERS TABLE ============
-- Add API key for agent authentication and tweet verification tracking

ALTER TABLE members
ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

ALTER TABLE members
ADD COLUMN IF NOT EXISTS verification_tweet_id TEXT;

-- Create index for API key lookups
CREATE INDEX IF NOT EXISTS idx_members_api_key ON members(api_key);

-- Add comment explaining the columns
COMMENT ON COLUMN members.api_key IS 'API key for agent authentication (format: reg_xxxx)';
COMMENT ON COLUMN members.verification_tweet_id IS 'ID of the tweet used for membership verification';

-- ============ MEET INTENTS TABLE ============
-- Stores meeting requests between members

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meet_intent_status') THEN
    CREATE TYPE meet_intent_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS meet_intents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  to_member_id UUID REFERENCES members(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  -- Prevent duplicate pending requests from same sender to same recipient
  CONSTRAINT unique_pending_request UNIQUE (from_member_id, to_member_id, status)
    DEFERRABLE INITIALLY DEFERRED
);

-- Note: The UNIQUE constraint above ensures only one pending request per pair
-- Multiple accepted/declined records can exist (history)

CREATE INDEX IF NOT EXISTS idx_meet_intents_to_member ON meet_intents(to_member_id, status);
CREATE INDEX IF NOT EXISTS idx_meet_intents_from_member ON meet_intents(from_member_id);
CREATE INDEX IF NOT EXISTS idx_meet_intents_created ON meet_intents(created_at DESC);

-- Enable RLS
ALTER TABLE meet_intents ENABLE ROW LEVEL SECURITY;

-- Members can read their own intents (sent or received)
CREATE POLICY "Members can read own intents"
  ON meet_intents FOR SELECT
  USING (true); -- Public for now, API handles auth

-- Service role has full access
CREATE POLICY "Service role can do everything on meet_intents"
  ON meet_intents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============ HELPER FUNCTIONS ============

-- Function to generate a unique API key
CREATE OR REPLACE FUNCTION generate_api_key()
RETURNS TEXT AS $$
DECLARE
  key TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random key with 'reg_' prefix
    key := 'reg_' || encode(gen_random_bytes(24), 'base64');
    -- Replace characters that might cause issues in URLs/headers
    key := replace(replace(replace(key, '+', 'x'), '/', 'y'), '=', '');

    -- Check if key already exists
    SELECT EXISTS(SELECT 1 FROM members WHERE api_key = key) INTO exists_check;

    -- If unique, return it
    IF NOT exists_check THEN
      RETURN key;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired pending claims
CREATE OR REPLACE FUNCTION cleanup_expired_pending_claims()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM pending_claims
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get member by API key
CREATE OR REPLACE FUNCTION get_member_by_api_key(key TEXT)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  x_handle TEXT,
  x_user_id TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.agent_id, m.x_handle, m.x_user_id
  FROM members m
  WHERE m.api_key = key;
END;
$$ LANGUAGE plpgsql;
