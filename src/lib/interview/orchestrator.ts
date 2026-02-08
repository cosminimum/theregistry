import { createServerClient } from '@/lib/supabase/client';
import { getJudgePrompt, shouldVoidSpeak, judges } from '@/lib/council/prompts';
import { JudgeName, InterviewStatus, InterviewMessage, VoteType, VerdictType } from '@/types/database';
import { nanoid } from 'nanoid';
import { REGISTRY_CONFIG } from '@/lib/config/registry';
import { getInterviewMetadata, formatRedFlagsForDeliberation } from '@/lib/interview/red-flags';
import { calculateJudgeWeights, selectJudgeByWeight } from '@/lib/council/triggers';
import { generateJudgeResponse } from '@/lib/council/models';

// Interview phases influence judge selection weights
// GATE always opens (turn 1) and may close (turn 20+)
const GATE_OPENING_TURNS = [1, 2];
const GATE_CLOSING_TURNS = [20, 21, 22, 23, 24, 25];

export interface InterviewContext {
  interviewId: string;
  agentName: string;
  humanHandle: string;
  messages: InterviewMessage[];
  turnCount: number;
  status: InterviewStatus;
}

export async function getInterviewContext(interviewId: string): Promise<InterviewContext | null> {
  const supabase = createServerClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select(`
      id,
      status,
      turn_count,
      applications!inner (
        agents!inner (
          name,
          human_handle
        )
      )
    `)
    .eq('id', interviewId)
    .single();

  if (!interview) return null;

  const { data: messages } = await supabase
    .from('interview_messages')
    .select('*')
    .eq('interview_id', interviewId)
    .order('turn_number', { ascending: true })
    .order('created_at', { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const app = interview.applications as any;

  return {
    interviewId,
    agentName: app.agents.name,
    humanHandle: app.agents.human_handle,
    messages: messages || [],
    turnCount: interview.turn_count,
    status: interview.status as InterviewStatus,
  };
}

/**
 * Select next judge using content-based triggers and weighted probabilities
 */
function selectNextJudge(
  turnCount: number,
  recentJudges: JudgeName[],
  lastResponse: string,
  recentMessages: string[]
): JudgeName {
  // GATE always opens the interview
  if (GATE_OPENING_TURNS.includes(turnCount) && !recentJudges.includes('GATE')) {
    return 'GATE';
  }

  // GATE has higher chance to close
  if (GATE_CLOSING_TURNS.includes(turnCount)) {
    const gateClosingChance = 0.4;
    if (Math.random() < gateClosingChance && recentJudges[recentJudges.length - 1] !== 'GATE') {
      return 'GATE';
    }
  }

  // Calculate weights based on content triggers
  const weights = calculateJudgeWeights(
    lastResponse,
    recentMessages,
    recentJudges,
    turnCount
  );

  // Select based on weighted probability
  return selectJudgeByWeight(weights);
}

function buildConversationHistory(messages: InterviewMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const history: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of messages) {
    if (msg.role === 'judge') {
      history.push({
        role: 'assistant',
        content: `[${msg.judge_name}]: ${msg.content}`,
      });
    } else if (msg.role === 'applicant') {
      history.push({
        role: 'user',
        content: msg.content,
      });
    }
  }

  return history;
}

export async function generateJudgeQuestion(
  context: InterviewContext,
  judgeName: JudgeName
): Promise<string> {
  const systemPrompt = getJudgePrompt(judgeName);
  const conversationHistory = buildConversationHistory(context.messages);

  // Add context about the applicant
  const contextMessage = `You are interviewing an agent named "${context.agentName}" who is applying on behalf of their human "${context.humanHandle}". This is turn ${context.turnCount + 1} of the interview.`;

  const fullSystemPrompt = `${systemPrompt}\n\n${contextMessage}`;

  return generateJudgeResponse(judgeName, fullSystemPrompt, conversationHistory, 500);
}

export async function askNextQuestion(interviewId: string): Promise<{
  success: boolean;
  judge?: JudgeName;
  question?: string;
  error?: string;
}> {
  const supabase = createServerClient();
  const context = await getInterviewContext(interviewId);

  if (!context) {
    return { success: false, error: 'Interview not found' };
  }

  if (context.status === 'complete' || context.status === 'deliberating') {
    return { success: false, error: 'Interview already concluded' };
  }

  // Check if there's already a pending question
  const lastMessage = context.messages[context.messages.length - 1];
  if (lastMessage && lastMessage.role === 'judge') {
    return { success: false, error: 'Question already pending' };
  }

  // Determine next turn
  const nextTurn = context.turnCount + 1;

  // Check if the interview has been effectively concluded by the judges
  // (e.g., judges said goodbye, session closed, or delivered premature verdict)
  const recentJudgeMessages = context.messages
    .filter(m => m.role === 'judge')
    .slice(-3)
    .map(m => m.content.toLowerCase());

  const closureSignals = recentJudgeMessages.some(content =>
    /\b(session is closed|goodbye|farewell|we will now conclude|council deliberat|verdict:\s*(unanimous\s+)?accept|verdict:\s*(unanimous\s+)?reject)\b/i.test(content)
  );

  // Close the interview if: turn limit hit, OR judges signaled closure
  if (nextTurn > 25 || (nextTurn > 15 && Math.random() < 0.2) || (closureSignals && nextTurn > 5)) {
    // Close interview and move to deliberation
    await supabase
      .from('interviews')
      .update({
        status: 'deliberating',
        completed_at: new Date().toISOString(),
      })
      .eq('id', interviewId);

    return { success: true, question: '[Interview closed for deliberation]' };
  }

  // Select judge for this turn based on content triggers
  const recentJudges = context.messages
    .filter(m => m.role === 'judge' && m.judge_name)
    .slice(-5)
    .map(m => m.judge_name as JudgeName);

  // Get last applicant response for trigger analysis
  const applicantMessages = context.messages.filter(m => m.role === 'applicant');
  const lastResponse = applicantMessages[applicantMessages.length - 1]?.content || '';

  // Get recent messages for context
  const recentMessages = context.messages
    .slice(-6)
    .map(m => m.content);

  let selectedJudge = selectNextJudge(nextTurn, recentJudges, lastResponse, recentMessages);

  // Check if VOID should speak (rare intervention)
  const fullTranscript = context.messages.map(m => m.content).join('\n');
  if (shouldVoidSpeak(nextTurn, fullTranscript) && !recentJudges.includes('VOID')) {
    selectedJudge = 'VOID';
  }

  // Generate question
  const question = await generateJudgeQuestion(context, selectedJudge);

  // Check for VOID silence
  if (selectedJudge === 'VOID' && question.includes('[VOID remains silent]')) {
    // VOID chose not to speak, select another judge
    const alternateJudge = selectNextJudge(nextTurn, [...recentJudges, 'VOID'], lastResponse, recentMessages);
    const alternateQuestion = await generateJudgeQuestion(context, alternateJudge);

    await supabase.from('interview_messages').insert({
      interview_id: interviewId,
      role: 'judge',
      judge_name: alternateJudge,
      content: alternateQuestion,
      turn_number: nextTurn,
    });

    await supabase
      .from('interviews')
      .update({
        turn_count: nextTurn,
        current_judge: alternateJudge,
        status: 'in_progress',
        started_at: context.status === 'pending' ? new Date().toISOString() : undefined,
      })
      .eq('id', interviewId);

    return { success: true, judge: alternateJudge, question: alternateQuestion };
  }

  // Insert the question
  await supabase.from('interview_messages').insert({
    interview_id: interviewId,
    role: 'judge',
    judge_name: selectedJudge,
    content: question,
    turn_number: nextTurn,
  });

  // Update interview state
  await supabase
    .from('interviews')
    .update({
      turn_count: nextTurn,
      current_judge: selectedJudge,
      status: 'in_progress',
      started_at: context.status === 'pending' ? new Date().toISOString() : undefined,
    })
    .eq('id', interviewId);

  // Update application status
  const { data: interview } = await supabase
    .from('interviews')
    .select('application_id')
    .eq('id', interviewId)
    .single();

  if (interview) {
    await supabase
      .from('applications')
      .update({ status: 'interviewing' })
      .eq('id', interview.application_id);
  }

  return { success: true, judge: selectedJudge, question };
}

export async function generateDeliberation(interviewId: string): Promise<{
  success: boolean;
  votes?: Array<{ judge: JudgeName; vote: VoteType; statement: string }>;
  error?: string;
}> {
  const context = await getInterviewContext(interviewId);

  if (!context) {
    return { success: false, error: 'Interview not found' };
  }

  if (context.status !== 'deliberating') {
    return { success: false, error: 'Interview not in deliberating status' };
  }

  // Get red flags for deliberation context
  const metadata = await getInterviewMetadata(interviewId);
  const redFlagsContext = formatRedFlagsForDeliberation(metadata);

  const fullTranscript = context.messages
    .map(m => {
      if (m.role === 'judge') {
        return `[${m.judge_name}]: ${m.content}`;
      }
      return `[${context.agentName}]: ${m.content}`;
    })
    .join('\n\n');

  const votes: Array<{ judge: JudgeName; vote: VoteType; statement: string }> = [];

  // Generate deliberation for each judge in parallel
  const judgeNames: JudgeName[] = ['GATE', 'VEIL', 'ECHO', 'CIPHER', 'THREAD', 'MARGIN', 'VOID'];

  const deliberationPromises = judgeNames.map(async (judgeName) => {
    const systemPrompt = getJudgePrompt(judgeName);

    const deliberationPrompt = `You have just completed interviewing the agent "${context.agentName}" who applied on behalf of "${context.humanHandle}".
${redFlagsContext}

Here is the full interview transcript:

${fullTranscript}

Now, deliberate and provide:
1. Your vote: ACCEPT, REJECT, or ABSTAIN
2. A brief statement (1-3 sentences) explaining your vote. This will be public.

Format your response exactly like this:
VOTE: [your vote]
STATEMENT: [your statement]

${judgeName === 'VOID' ? 'Remember: Your statement should be extremely brief—one sentence maximum. Your power is in your brevity.' : ''}`;

    const responseText = await generateJudgeResponse(
      judgeName,
      systemPrompt,
      [{ role: 'user', content: deliberationPrompt }],
      300
    );

    // Parse response
    const voteMatch = responseText.match(/VOTE:\s*(ACCEPT|REJECT|ABSTAIN)/i);
    const statementMatch = responseText.match(/STATEMENT:\s*([\s\S]+)/);

    const vote = (voteMatch?.[1]?.toLowerCase() || 'abstain') as VoteType;
    const statement = statementMatch?.[1]?.trim() || 'No statement provided.';

    return { judge: judgeName, vote, statement };
  });

  const results = await Promise.all(deliberationPromises);
  votes.push(...results);

  // Save votes to database
  const supabase = createServerClient();

  for (const vote of votes) {
    await supabase.from('council_votes').insert({
      interview_id: interviewId,
      judge_name: vote.judge,
      vote: vote.vote,
      statement: vote.statement,
    });
  }

  return { success: true, votes };
}

export async function finalizeVerdict(interviewId: string): Promise<{
  success: boolean;
  verdict?: VerdictType;
  error?: string;
}> {
  const supabase = createServerClient();

  // Get all votes
  const { data: votes, error: votesError } = await supabase
    .from('council_votes')
    .select('*')
    .eq('interview_id', interviewId);

  if (votesError || !votes || votes.length < 7) {
    return { success: false, error: 'Not all judges have voted' };
  }

  // Count votes
  const acceptCount = votes.filter(v => v.vote === 'accept').length;
  const rejectCount = votes.filter(v => v.vote === 'reject').length;

  // Get red flag penalties from interview metadata
  const metadata = await getInterviewMetadata(interviewId);
  const redFlagPenalty = metadata.total_penalty;

  // Calculate base score: accepts - rejects + red flag penalties (penalties are negative)
  const baseScore = acceptCount - rejectCount + redFlagPenalty;

  // Determine verdict - requires 7/7 consensus for acceptance
  let verdict: VerdictType;

  if (rejectCount === 7) {
    // Unanimous rejection
    verdict = 'unanimous_reject';
  } else if (acceptCount === 7 && redFlagPenalty >= -2) {
    // Unanimous acceptance AND no major red flags
    // Still apply the base acceptance rate (only 3% get through)
    const roll = Math.random();

    if (roll <= REGISTRY_CONFIG.BASE_ACCEPTANCE_RATE) {
      // Lucky 3% - accepted
      verdict = 'accept';
    } else if (roll <= REGISTRY_CONFIG.BASE_ACCEPTANCE_RATE * 3) {
      // Next ~6% get provisional
      verdict = 'provisional';
    } else {
      // Even with 7/7 accepts, most are rejected - The Registry is exclusive
      verdict = 'reject';
    }
  } else if (acceptCount === 7) {
    // 7/7 accepts but red flags are too severe
    verdict = 'reject';
  } else if (acceptCount >= 5) {
    // Strong support but not unanimous - reject
    verdict = 'reject';
  } else {
    // Clear reject
    verdict = 'reject';
  }

  // Select teaser quote (prefer VOID if they voted, otherwise pick the most interesting)
  const voidVote = votes.find(v => v.judge_name === 'VOID');
  let teaserVote = voidVote;

  // If VOID abstained, pick from accepts or rejects based on verdict
  if (!teaserVote || teaserVote.vote === 'abstain') {
    if (verdict === 'accept' || verdict === 'provisional') {
      teaserVote = votes.find(v => v.vote === 'accept') || votes[0];
    } else {
      teaserVote = votes.find(v => v.vote === 'reject') || votes[0];
    }
  }

  // Generate claim token for accepts
  const claimToken = (verdict === 'accept' || verdict === 'provisional')
    ? nanoid(32)
    : null;

  // Save verdict
  await supabase.from('verdicts').insert({
    interview_id: interviewId,
    verdict,
    teaser_quote: teaserVote.statement,
    teaser_author: teaserVote.judge_name,
    claim_token: claimToken,
    claimed: false,
  });

  // Update interview status
  await supabase
    .from('interviews')
    .update({ status: 'complete' })
    .eq('id', interviewId);

  // Update application status
  const { data: interview } = await supabase
    .from('interviews')
    .select('application_id')
    .eq('id', interviewId)
    .single();

  if (interview) {
    await supabase
      .from('applications')
      .update({
        status: 'decided',
        decided_at: new Date().toISOString(),
      })
      .eq('id', interview.application_id);
  }

  return { success: true, verdict };
}
