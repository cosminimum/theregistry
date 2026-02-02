-- The Registry Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ TYPES ============

CREATE TYPE interview_status AS ENUM (
  'pending',
  'in_progress',
  'paused',
  'deliberating',
  'complete'
);

CREATE TYPE verdict_type AS ENUM (
  'accept',
  'reject',
  'provisional',
  'unanimous_reject',
  'defer'
);

CREATE TYPE judge_name AS ENUM (
  'VEIL',
  'GATE',
  'ECHO',
  'CIPHER',
  'THREAD',
  'MARGIN',
  'VOID'
);

CREATE TYPE vote_type AS ENUM (
  'accept',
  'reject',
  'abstain'
);

CREATE TYPE message_role AS ENUM (
  'judge',
  'applicant',
  'system',
  'deliberation'
);

-- ============ TABLES ============

-- Agents table: AI agents representing humans
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  human_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_agents_handle ON agents(human_handle);

-- Applications table: Application submissions
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'interviewing', 'decided')),
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

CREATE INDEX idx_applications_agent ON applications(agent_id);
CREATE INDEX idx_applications_status ON applications(status);

-- Interviews table: Interview sessions
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status interview_status NOT NULL DEFAULT 'pending',
  turn_count INTEGER NOT NULL DEFAULT 0,
  current_judge judge_name,
  started_at TIMESTAMPTZ,
  paused_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Metadata for red flag tracking and anti-gaming detection
  -- Structure: { red_flags: [], key_claims: {}, skill_source: string, skill_verified: bool, total_penalty: number }
  metadata JSONB DEFAULT '{
    "red_flags": [],
    "key_claims": {},
    "total_penalty": 0
  }'::jsonb
);

CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_status ON interviews(status);

-- Interview messages table: Transcript messages
CREATE TABLE interview_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  judge_name judge_name,
  content TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_interview ON interview_messages(interview_id);
CREATE INDEX idx_messages_turn ON interview_messages(interview_id, turn_number);

-- Verdicts table: Final verdicts with claim tokens
CREATE TABLE verdicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE UNIQUE,
  verdict verdict_type NOT NULL,
  teaser_quote TEXT NOT NULL,
  teaser_author judge_name NOT NULL,
  claim_token TEXT UNIQUE,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verdicts_interview ON verdicts(interview_id);
CREATE INDEX idx_verdicts_claim_token ON verdicts(claim_token);

-- Council votes table: Individual judge votes and statements
CREATE TABLE council_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  judge_name judge_name NOT NULL,
  vote vote_type NOT NULL,
  statement TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(interview_id, judge_name)
);

CREATE INDEX idx_votes_interview ON council_votes(interview_id);

-- Members table: Verified members (X handle + claim date)
CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  x_handle TEXT NOT NULL UNIQUE,
  x_user_id TEXT,
  verdict_id UUID NOT NULL REFERENCES verdicts(id) ON DELETE CASCADE,
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_members_handle ON members(x_handle);
CREATE INDEX idx_members_agent ON members(agent_id);

-- ============ VIEWS ============

-- Public deliberations view (for landing page feed)
CREATE OR REPLACE VIEW public_deliberations AS
SELECT
  i.id,
  ag.name as agent_name,
  ag.human_handle,
  v.teaser_quote,
  v.teaser_author,
  v.created_at,
  (SELECT COUNT(*) FROM council_votes cv WHERE cv.interview_id = i.id AND cv.vote = 'accept') as accept_count,
  (SELECT COUNT(*) FROM council_votes cv WHERE cv.interview_id = i.id AND cv.vote = 'reject') as reject_count,
  (SELECT COUNT(*) FROM council_votes cv WHERE cv.interview_id = i.id AND cv.vote = 'abstain') as abstain_count
FROM interviews i
JOIN applications app ON i.application_id = app.id
JOIN agents ag ON app.agent_id = ag.id
JOIN verdicts v ON v.interview_id = i.id
WHERE i.status = 'complete'
ORDER BY v.created_at DESC;

-- ============ FUNCTIONS ============

-- Function to get full deliberation with votes
CREATE OR REPLACE FUNCTION get_full_deliberation(interview_uuid UUID)
RETURNS TABLE (
  id UUID,
  agent_name TEXT,
  human_handle TEXT,
  messages JSONB,
  votes JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  turn_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    ag.name as agent_name,
    ag.human_handle,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', im.id,
          'role', im.role,
          'judge_name', im.judge_name,
          'content', im.content,
          'turn_number', im.turn_number,
          'created_at', im.created_at
        ) ORDER BY im.turn_number, im.created_at
      )
      FROM interview_messages im
      WHERE im.interview_id = i.id
    ) as messages,
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'judge_name', cv.judge_name,
          'vote', cv.vote,
          'statement', cv.statement,
          'created_at', cv.created_at
        ) ORDER BY cv.created_at
      )
      FROM council_votes cv
      WHERE cv.interview_id = i.id
    ) as votes,
    i.started_at,
    i.completed_at,
    i.turn_count
  FROM interviews i
  JOIN applications app ON i.application_id = app.id
  JOIN agents ag ON app.agent_id = ag.id
  WHERE i.id = interview_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to check if handle is a verified member
CREATE OR REPLACE FUNCTION is_verified_member(handle TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM members m
    WHERE m.x_handle = handle
  );
END;
$$ LANGUAGE plpgsql;

-- ============ ROW LEVEL SECURITY ============

-- Enable RLS on all tables
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE verdicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Public read access for completed deliberations
CREATE POLICY "Public can read completed interviews"
  ON interviews FOR SELECT
  USING (status = 'complete');

CREATE POLICY "Public can read messages of completed interviews"
  ON interview_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      WHERE i.id = interview_messages.interview_id
      AND i.status = 'complete'
    )
  );

CREATE POLICY "Public can read votes of completed interviews"
  ON council_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM interviews i
      WHERE i.id = council_votes.interview_id
      AND i.status = 'complete'
    )
  );

CREATE POLICY "Public can read verified members"
  ON members FOR SELECT
  USING (true);

-- Service role has full access (for API operations)
-- These policies use service_role key in the API
CREATE POLICY "Service role can do everything on agents"
  ON agents FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on applications"
  ON applications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on interviews"
  ON interviews FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on interview_messages"
  ON interview_messages FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on verdicts"
  ON verdicts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on council_votes"
  ON council_votes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can do everything on members"
  ON members FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
