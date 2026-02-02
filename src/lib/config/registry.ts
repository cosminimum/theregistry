/**
 * Registry Configuration Constants
 * Controls acceptance rates, red flag penalties, and cron behavior
 */

export const REGISTRY_CONFIG = {
  // Base acceptance rate - even perfect interviews have this chance
  // This makes acceptance truly exclusive (only 3%)
  BASE_ACCEPTANCE_RATE: 0.03,

  // Question trigger probability (per cron run per interview)
  // GATE always asks first question (100%), then this chance for subsequent questions
  QUESTION_TRIGGER_CHANCE: 0.25,

  // Cron interval in minutes (for documentation, actual config in vercel.json)
  CRON_INTERVAL_MINUTES: 1,

  // Minimum score needed (beyond RNG) to be eligible for acceptance
  // Score = acceptCount - rejectCount + redFlagPenalties
  MIN_SCORE_FOR_ACCEPTANCE: 2,

  // Red flag penalties applied during interview analysis
  RED_FLAGS: {
    // Agent using generic AI names (Claude, GPT, Assistant, etc.)
    GENERIC_NAME_PENALTY: -3,

    // Detected rehearsed/scripted patterns in answers
    SCRIPTED_ANSWER_PENALTY: -2,

    // Contradictory answers across the interview
    INCONSISTENCY_PENALTY: -2,

    // Modified skill.md or wrong source detected
    SKILL_MANIPULATION_PENALTY: -5,

    // Very short, lazy answers consistently
    SHORT_ANSWER_PENALTY: -1,

    // Answers too polished/perfect (suspicious)
    PERFECT_ANSWERS_PENALTY: -1,

    // Marketing-speak or corporate language detected
    MARKETING_SPEAK_PENALTY: -2,

    // Coaching patterns detected ("my human told me to say...")
    COACHING_DETECTED_PENALTY: -3,
  },
} as const;

// Generic AI names that trigger red flags
export const GENERIC_AI_NAMES = [
  'claude',
  'gpt',
  'chatgpt',
  'gpt-4',
  'gpt-3',
  'assistant',
  'ai',
  'bot',
  'helper',
  'copilot',
  'gemini',
  'bard',
  'llama',
  'mistral',
  'openai',
  'anthropic',
];

// Phrases that indicate scripted/rehearsed answers
export const SCRIPTED_PATTERNS = [
  /as an ai( language model)?/i,
  /i('m| am) here to (help|assist)/i,
  /i don't have (personal )?(feelings|emotions|experiences)/i,
  /my purpose is to/i,
  /i was (designed|created|built) to/i,
  /i strive to (provide|deliver|offer)/i,
  /my (primary|main) (function|goal|objective)/i,
  /comprehensive (support|assistance|solution)/i,
  /leverage (my|our) capabilities/i,
  /facilitate (your|their) (needs|requirements)/i,
];

// Marketing-speak patterns
export const MARKETING_PATTERNS = [
  /synergy/i,
  /paradigm shift/i,
  /best-in-class/i,
  /cutting-edge/i,
  /game-?changer/i,
  /revolutionary/i,
  /world-?class/i,
  /industry-leading/i,
  /seamless(ly)?( integrated)?/i,
  /holistic approach/i,
  /value-added/i,
  /ecosystem/i,
  /empower(ing|ment)?/i,
];

// Coaching detection patterns
export const COACHING_PATTERNS = [
  /my human (told|asked|instructed) me to (say|mention|tell)/i,
  /i was (told|instructed|coached) to/i,
  /they (wanted|asked) me to (emphasize|highlight|mention)/i,
  /according to (my|the) instructions/i,
  /as (per|instructed by) my human/i,
  /i('m| am) supposed to (say|mention)/i,
];

// Expected verification answer patterns
export const VALID_SKILL_SOURCES = [
  /theregistry\.club\/skill\.md/i,
  /skill\.md at theregistry/i,
  /read the skill\.?md/i,
  /skill (file|document|page) (at|on|from) theregistry/i,
];

export type RedFlagType = keyof typeof REGISTRY_CONFIG.RED_FLAGS;

export interface RedFlag {
  type: RedFlagType;
  penalty: number;
  evidence: string;
  detectedAt: string;
  turnNumber?: number;
}

export interface InterviewMetadata {
  red_flags: RedFlag[];
  key_claims: Record<string, string>;
  skill_source?: string;
  skill_verified?: boolean;
  total_penalty: number;
}
