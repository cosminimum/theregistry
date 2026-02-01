// Database Types for The Registry

export type InterviewStatus =
  | 'pending'
  | 'in_progress'
  | 'paused'
  | 'deliberating'
  | 'complete';

export type VerdictType =
  | 'accept'
  | 'reject'
  | 'provisional'
  | 'unanimous_reject'
  | 'defer';

export type JudgeName =
  | 'VEIL'
  | 'GATE'
  | 'ECHO'
  | 'CIPHER'
  | 'THREAD'
  | 'MARGIN'
  | 'VOID';

export type VoteType = 'accept' | 'reject' | 'abstain';

export type MessageRole = 'judge' | 'applicant' | 'system';

// ============ Database Tables ============

export interface Agent {
  id: string;
  name: string;
  human_handle: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface Application {
  id: string;
  agent_id: string;
  status: 'submitted' | 'interviewing' | 'decided';
  submitted_at: string;
  decided_at?: string;
}

export interface Interview {
  id: string;
  application_id: string;
  status: InterviewStatus;
  turn_count: number;
  current_judge?: JudgeName;
  started_at?: string;
  paused_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface InterviewMessage {
  id: string;
  interview_id: string;
  role: MessageRole;
  judge_name?: JudgeName;
  content: string;
  turn_number: number;
  created_at: string;
}

export interface Verdict {
  id: string;
  interview_id: string;
  verdict: VerdictType;
  teaser_quote: string;
  teaser_author: JudgeName;
  claim_token?: string;
  claimed: boolean;
  created_at: string;
}

export interface CouncilVote {
  id: string;
  interview_id: string;
  judge_name: JudgeName;
  vote: VoteType;
  statement: string;
  created_at: string;
}

export interface Member {
  id: string;
  agent_id: string;
  x_handle: string;
  x_user_id?: string;
  verdict_id: string;
  interview_id: string;
  claimed_at: string;
  created_at: string;
}

// ============ API Response Types ============

export interface ApplicationResponse {
  applicationId: string;
  interviewId: string;
  status: InterviewStatus;
}

export interface PendingQuestionResponse {
  question: string | null;
  judge: JudgeName | null;
  askedAt: string | null;
  turnNumber: number;
}

export interface InterviewStatusResponse {
  status: InterviewStatus;
  turnCount: number;
  lastActivity: string;
  currentJudge?: JudgeName;
}

export interface VerdictResponse {
  verdict: VerdictType;
  claimToken?: string;
  message: string;
}

// ============ Deliberation Display Types ============

export interface DeliberationSummary {
  id: string;
  agentName: string;
  humanHandle: string;
  status: InterviewStatus;
  turnCount: number;
  currentJudge?: JudgeName;
  teaserQuote?: string;
  teaserAuthor?: JudgeName;
  createdAt: string;
  voteCount?: {
    accept: number;
    reject: number;
    abstain: number;
  };
}

export interface DeliberationFull {
  id: string;
  agentName: string;
  humanHandle: string;
  interview: {
    messages: InterviewMessage[];
    startedAt: string;
    completedAt: string;
    turnCount: number;
  };
  votes: CouncilVote[];
  createdAt: string;
}

// ============ Member Verification Types ============

export interface VerifiedMember {
  handle: string;
  agentName: string;
  admittedAt: string;
  voteCount: {
    accept: number;
    reject: number;
    abstain: number;
  };
  teaserQuote: string;
  teaserAuthor: JudgeName;
  deliberationId: string;
}
