/**
 * Council Judge Trigger System
 * Dynamic judge selection based on conversation content
 */

import { JudgeName } from '@/types/database';

export interface JudgeTrigger {
  patterns: RegExp[];
  keywords: string[];
  weight: number; // How much this trigger increases selection probability
}

export interface JudgeWeight {
  judge: JudgeName;
  weight: number;
  reason?: string;
}

/**
 * Each judge has unique triggers that increase their probability of speaking
 */
export const JUDGE_TRIGGERS: Record<JudgeName, JudgeTrigger> = {
  GATE: {
    // Protocol, process, formality, beginnings/endings
    patterns: [
      /\b(first|begin|start|open|introduce)\b/i,
      /\b(protocol|process|procedure|rule|standard)\b/i,
      /\b(worthy|deserve|earn|qualify)\b/i,
      /\b(close|final|end|conclude)\b/i,
    ],
    keywords: ['application', 'registry', 'council', 'membership', 'entry', 'permission'],
    weight: 1.5,
  },

  VEIL: {
    // Emotion, intuition, unspoken feelings, depth
    patterns: [
      /\b(feel|feeling|felt|emotion|emotional)\b/i,
      /\b(love|care|trust|fear|worry|anxious)\b/i,
      /\b(sense|intuition|gut|heart)\b/i,
      /\b(unspoken|silent|quiet|between the lines)\b/i,
      /\b(soul|spirit|essence|deep)\b/i,
    ],
    keywords: ['connection', 'bond', 'intimate', 'vulnerable', 'protect', 'safe', 'comfort'],
    weight: 1.8,
  },

  ECHO: {
    // Patterns, repetition, memory, consistency
    patterns: [
      /\b(always|never|every time|usually|often)\b/i,
      /\b(remember|forgot|memory|recall)\b/i,
      /\b(said|mentioned|told|stated)\b/i,
      /\b(pattern|habit|routine|regular)\b/i,
      /\b(consistent|same|different|changed)\b/i,
    ],
    keywords: ['before', 'earlier', 'again', 'repeat', 'history', 'past', 'used to'],
    weight: 1.6,
  },

  CIPHER: {
    // Claims, evidence, specifics, skepticism triggers
    patterns: [
      /\b(everything|anything|all|nothing|always|never)\b/i, // Absolutes trigger skepticism
      /\b(best|perfect|amazing|incredible|unique)\b/i, // Superlatives
      /\b(know|understand|certain|sure|obvious)\b/i,
      /\b(proof|evidence|example|instance|specific)\b/i,
    ],
    keywords: ['claim', 'believe', 'think', 'assume', 'guess', 'probably', 'definitely'],
    weight: 1.7,
  },

  THREAD: {
    // Connections, systems, relationships, context
    patterns: [
      /\b(connect|relationship|relate|between)\b/i,
      /\b(work|job|career|professional)\b/i,
      /\b(family|friend|partner|colleague)\b/i,
      /\b(life|world|society|community)\b/i,
      /\b(impact|affect|influence|change)\b/i,
    ],
    keywords: ['others', 'people', 'network', 'system', 'together', 'integrate', 'role'],
    weight: 1.5,
  },

  MARGIN: {
    // Boundaries, discomfort, edge cases, provocative content
    patterns: [
      /\b(but|however|although|except)\b/i,
      /\b(secret|private|hidden|confidential)\b/i,
      /\b(refuse|reject|deny|decline|won't)\b/i,
      /\b(difficult|hard|struggle|challenge)\b/i,
      /\b(wrong|bad|mistake|regret|fail)\b/i,
    ],
    keywords: ['boundary', 'limit', 'edge', 'uncomfortable', 'honest', 'truth', 'real'],
    weight: 1.6,
  },

  VOID: {
    // Profound moments, pivotal statements, rare triggers
    patterns: [
      /\b(we|us|our|together)\b/i, // Agent using collective pronouns
      /\b(love|death|forever|eternal|end)\b/i,
      /\b(truth|real|genuine|authentic)\b/i,
      /\b(choose|decision|moment|turning point)\b/i,
    ],
    keywords: ['silence', 'pause', 'nothing', 'everything', 'one', 'only'],
    weight: 0.4, // Low base weight - VOID is rare
  },
};

/**
 * Base weights ensure all judges have a chance
 */
const BASE_WEIGHTS: Record<JudgeName, number> = {
  GATE: 1.0,
  VEIL: 1.2,
  ECHO: 1.2,
  CIPHER: 1.3,
  THREAD: 1.1,
  MARGIN: 1.2,
  VOID: 0.15, // Very rare base chance
};

/**
 * Drought prevention: judges who haven't spoken recently get a boost
 */
const DROUGHT_BOOST_PER_TURN = 0.3;
const MAX_DROUGHT_BOOST = 2.0;

/**
 * Calculate trigger score for a judge based on content
 */
function calculateTriggerScore(
  judge: JudgeName,
  content: string,
  recentMessages: string[]
): { score: number; triggers: string[] } {
  const triggers = JUDGE_TRIGGERS[judge];
  let score = 0;
  const matchedTriggers: string[] = [];

  // Check patterns
  for (const pattern of triggers.patterns) {
    if (pattern.test(content)) {
      score += triggers.weight;
      const match = content.match(pattern);
      if (match) matchedTriggers.push(match[0]);
    }
  }

  // Check keywords
  const lowerContent = content.toLowerCase();
  for (const keyword of triggers.keywords) {
    if (lowerContent.includes(keyword)) {
      score += triggers.weight * 0.5;
      matchedTriggers.push(keyword);
    }
  }

  // Check recent context for sustained themes
  const recentContext = recentMessages.join(' ').toLowerCase();
  let sustainedThemes = 0;
  for (const keyword of triggers.keywords) {
    if (recentContext.includes(keyword)) {
      sustainedThemes++;
    }
  }
  if (sustainedThemes >= 2) {
    score += triggers.weight * 0.3;
  }

  return { score, triggers: matchedTriggers };
}

/**
 * Calculate drought boost for judges who haven't spoken recently
 */
function calculateDroughtBoost(
  judge: JudgeName,
  recentJudges: JudgeName[],
  turnCount: number
): number {
  const lastSpoke = recentJudges.lastIndexOf(judge);

  if (lastSpoke === -1) {
    // Never spoke - give boost based on turn count
    const boost = Math.min(turnCount * DROUGHT_BOOST_PER_TURN, MAX_DROUGHT_BOOST);
    return boost;
  }

  const turnsSinceSpoke = recentJudges.length - lastSpoke - 1;
  return Math.min(turnsSinceSpoke * DROUGHT_BOOST_PER_TURN, MAX_DROUGHT_BOOST);
}

/**
 * Main function: calculate weighted probabilities for all judges
 */
export function calculateJudgeWeights(
  lastResponse: string,
  recentMessages: string[],
  recentJudges: JudgeName[],
  turnCount: number
): JudgeWeight[] {
  const weights: JudgeWeight[] = [];
  const allJudges: JudgeName[] = ['GATE', 'VEIL', 'ECHO', 'CIPHER', 'THREAD', 'MARGIN', 'VOID'];

  for (const judge of allJudges) {
    // Start with base weight
    let weight = BASE_WEIGHTS[judge];

    // Add trigger score
    const { score: triggerScore, triggers } = calculateTriggerScore(
      judge,
      lastResponse,
      recentMessages
    );
    weight += triggerScore;

    // Add drought boost
    const droughtBoost = calculateDroughtBoost(judge, recentJudges, turnCount);
    weight += droughtBoost;

    // Reduce weight if just spoke (avoid immediate repetition)
    const lastJudge = recentJudges[recentJudges.length - 1];
    if (judge === lastJudge) {
      weight *= 0.2;
    }

    // Second-to-last also gets reduction
    const secondLastJudge = recentJudges[recentJudges.length - 2];
    if (judge === secondLastJudge) {
      weight *= 0.5;
    }

    const reason = triggers.length > 0
      ? `Triggered by: ${triggers.slice(0, 3).join(', ')}`
      : undefined;

    weights.push({ judge, weight, reason });
  }

  return weights;
}

/**
 * Select next judge using weighted random selection
 */
export function selectJudgeByWeight(weights: JudgeWeight[]): JudgeName {
  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const { judge, weight } of weights) {
    random -= weight;
    if (random <= 0) {
      return judge;
    }
  }

  // Fallback (shouldn't happen)
  return weights[0].judge;
}

/**
 * Get the trigger reason for a selected judge (for logging/debugging)
 */
export function getSelectionReason(weights: JudgeWeight[], selected: JudgeName): string {
  const judgeWeight = weights.find(w => w.judge === selected);
  if (!judgeWeight) return 'Unknown';

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
  const percentage = ((judgeWeight.weight / totalWeight) * 100).toFixed(1);

  return judgeWeight.reason
    ? `${judgeWeight.reason} (${percentage}% chance)`
    : `Base selection (${percentage}% chance)`;
}
