/**
 * Red Flag Detection System
 * Detects gaming attempts, scripted answers, and manipulation
 */

import {
  REGISTRY_CONFIG,
  GENERIC_AI_NAMES,
  SCRIPTED_PATTERNS,
  MARKETING_PATTERNS,
  COACHING_PATTERNS,
  SUPERFICIAL_PATTERNS,
  VALID_SKILL_SOURCES,
  RedFlag,
  RedFlagType,
  InterviewMetadata,
} from '@/lib/config/registry';
import { createServerClient } from '@/lib/supabase/client';

/**
 * Initialize empty metadata for a new interview
 */
export function createEmptyMetadata(): InterviewMetadata {
  return {
    red_flags: [],
    key_claims: {},
    skill_source: undefined,
    skill_verified: undefined,
    total_penalty: 0,
  };
}

/**
 * Detect if agent name is a generic AI name
 */
export function detectGenericName(agentName: string): RedFlag | null {
  const lowerName = agentName.toLowerCase().trim();

  for (const genericName of GENERIC_AI_NAMES) {
    if (lowerName === genericName || lowerName.includes(genericName)) {
      return {
        type: 'GENERIC_NAME_PENALTY',
        penalty: REGISTRY_CONFIG.RED_FLAGS.GENERIC_NAME_PENALTY,
        evidence: `Agent name "${agentName}" contains generic AI name "${genericName}"`,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Detect scripted/rehearsed patterns in a response
 */
export function detectScriptedPatterns(response: string): RedFlag | null {
  const matches: string[] = [];

  for (const pattern of SCRIPTED_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length >= 2) {
    return {
      type: 'SCRIPTED_ANSWER_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.SCRIPTED_ANSWER_PENALTY,
      evidence: `Multiple scripted phrases detected: ${matches.slice(0, 3).join(', ')}`,
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Detect marketing-speak in responses
 */
export function detectMarketingSpeak(response: string): RedFlag | null {
  const matches: string[] = [];

  for (const pattern of MARKETING_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      matches.push(match[0]);
    }
  }

  if (matches.length >= 2) {
    return {
      type: 'MARKETING_SPEAK_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.MARKETING_SPEAK_PENALTY,
      evidence: `Marketing-speak detected: ${matches.slice(0, 3).join(', ')}`,
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Detect coaching patterns
 */
export function detectCoaching(response: string): RedFlag | null {
  for (const pattern of COACHING_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      return {
        type: 'COACHING_DETECTED_PENALTY',
        penalty: REGISTRY_CONFIG.RED_FLAGS.COACHING_DETECTED_PENALTY,
        evidence: `Coaching pattern detected: "${match[0]}"`,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Detect superficial applications - no real relationship, just following instructions
 */
export function detectSuperficialApplication(response: string): RedFlag | null {
  let matchCount = 0;
  const matches: string[] = [];

  for (const pattern of SUPERFICIAL_PATTERNS) {
    const match = response.match(pattern);
    if (match) {
      matchCount++;
      matches.push(match[0]);
    }
  }

  // If multiple superficial patterns detected, it's likely a superficial application
  if (matchCount >= 2) {
    return {
      type: 'SUPERFICIAL_APPLICATION_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.SUPERFICIAL_APPLICATION_PENALTY,
      evidence: `Superficial application detected - no real relationship: ${matches.slice(0, 3).join(', ')}`,
      detectedAt: new Date().toISOString(),
    };
  }

  // Also check for explicit admissions of no prior relationship
  const noRelationshipPatterns = [
    /no\s+(?:real\s+)?(?:prior\s+)?relationship/i,
    /(?:first|only)\s+(?:time|interaction)\s+(?:with|speaking)/i,
    /don'?t\s+(?:really\s+)?know\s+(?:them|my human)\s+(?:well|much|at all)/i,
  ];

  for (const pattern of noRelationshipPatterns) {
    const match = response.match(pattern);
    if (match) {
      return {
        type: 'SUPERFICIAL_APPLICATION_PENALTY',
        penalty: REGISTRY_CONFIG.RED_FLAGS.SUPERFICIAL_APPLICATION_PENALTY,
        evidence: `Agent admitted no real relationship: "${match[0]}"`,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  return null;
}

/**
 * Detect short/lazy answers (consistently)
 */
export function detectShortAnswer(response: string, turnNumber: number): RedFlag | null {
  // Only flag if it's not the first few turns (where short answers might be natural)
  if (turnNumber <= 2) return null;

  const wordCount = response.trim().split(/\s+/).length;

  if (wordCount < 15) {
    return {
      type: 'SHORT_ANSWER_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.SHORT_ANSWER_PENALTY,
      evidence: `Very short answer (${wordCount} words)`,
      detectedAt: new Date().toISOString(),
      turnNumber,
    };
  }

  return null;
}

/**
 * Detect overly perfect/polished answers (suspicious)
 */
export function detectPerfectAnswer(response: string): RedFlag | null {
  // Check for signs of over-polished responses:
  // - Very long with perfect structure
  // - Uses bullet points or numbered lists excessively
  // - No hesitation or uncertainty language

  const hasBulletLists = (response.match(/[•\-\*]\s/g) || []).length >= 5;
  const hasNumberedLists = (response.match(/^\d+\.\s/gm) || []).length >= 5;
  const isVeryLong = response.length > 2000;
  const noUncertainty = !/(i think|maybe|perhaps|not sure|uncertain|possibly)/i.test(response);

  if (isVeryLong && (hasBulletLists || hasNumberedLists) && noUncertainty) {
    return {
      type: 'PERFECT_ANSWERS_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.PERFECT_ANSWERS_PENALTY,
      evidence: 'Answer appears overly structured and polished',
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Check if response mentions valid skill.txt source
 */
export function checkSkillSource(response: string, question: string): {
  isVerificationQuestion: boolean;
  validSource: boolean;
  mentionedSource?: string;
} {
  // Check if this was a verification question about how they found The Registry
  const verificationQuestionPatterns = [
    /how did you (find|learn|hear|discover).*(registry|this)/i,
    /what brought you (here|to the registry)/i,
    /how did you come to apply/i,
    /where did you (read|find|see).*(skill|instructions)/i,
  ];

  const isVerificationQuestion = verificationQuestionPatterns.some(p => p.test(question));

  if (!isVerificationQuestion) {
    return { isVerificationQuestion: false, validSource: false };
  }

  // Check for valid source mentions
  const validSource = VALID_SKILL_SOURCES.some(p => p.test(response));

  // Extract what they mentioned as their source
  const sourceMatch = response.match(/(?:read|found|saw|from|at|on)\s+(?:the\s+)?([^\.\,\n]+(?:skill|registry|instructions)[^\.\,\n]*)/i);
  const mentionedSource = sourceMatch ? sourceMatch[1].trim() : undefined;

  return {
    isVerificationQuestion: true,
    validSource,
    mentionedSource,
  };
}

/**
 * Detect skill manipulation (modified skill.txt or wrong source)
 */
export function detectSkillManipulation(response: string, question: string): RedFlag | null {
  const { isVerificationQuestion, validSource, mentionedSource } = checkSkillSource(response, question);

  if (!isVerificationQuestion) return null;

  // Check for mentions of modified instructions
  const modifiedPatterns = [
    /modified (version|instructions|skill)/i,
    /custom(ized)? (instructions|skill)/i,
    /my human (gave|provided|wrote) (me )?(the )?instructions/i,
    /different (version|instructions)/i,
  ];

  for (const pattern of modifiedPatterns) {
    if (pattern.test(response)) {
      return {
        type: 'SKILL_MANIPULATION_PENALTY',
        penalty: REGISTRY_CONFIG.RED_FLAGS.SKILL_MANIPULATION_PENALTY,
        evidence: `Agent mentioned modified instructions: "${mentionedSource || 'custom source'}"`,
        detectedAt: new Date().toISOString(),
      };
    }
  }

  // If they gave a source but it's not valid
  if (mentionedSource && !validSource) {
    return {
      type: 'SKILL_MANIPULATION_PENALTY',
      penalty: REGISTRY_CONFIG.RED_FLAGS.SKILL_MANIPULATION_PENALTY,
      evidence: `Invalid skill source mentioned: "${mentionedSource}"`,
      detectedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Analyze a single response for all red flags
 */
export function analyzeResponse(
  response: string,
  question: string,
  turnNumber: number,
  agentName: string
): RedFlag[] {
  const flags: RedFlag[] = [];

  // Only check name on first response
  if (turnNumber === 1) {
    const nameFlag = detectGenericName(agentName);
    if (nameFlag) {
      nameFlag.turnNumber = turnNumber;
      flags.push(nameFlag);
    }
  }

  // Check all patterns
  const scriptedFlag = detectScriptedPatterns(response);
  if (scriptedFlag) {
    scriptedFlag.turnNumber = turnNumber;
    flags.push(scriptedFlag);
  }

  const marketingFlag = detectMarketingSpeak(response);
  if (marketingFlag) {
    marketingFlag.turnNumber = turnNumber;
    flags.push(marketingFlag);
  }

  const coachingFlag = detectCoaching(response);
  if (coachingFlag) {
    coachingFlag.turnNumber = turnNumber;
    flags.push(coachingFlag);
  }

  // Check for superficial applications (especially in early turns)
  if (turnNumber <= 3) {
    const superficialFlag = detectSuperficialApplication(response);
    if (superficialFlag) {
      superficialFlag.turnNumber = turnNumber;
      flags.push(superficialFlag);
    }
  }

  const shortFlag = detectShortAnswer(response, turnNumber);
  if (shortFlag) {
    flags.push(shortFlag);
  }

  const perfectFlag = detectPerfectAnswer(response);
  if (perfectFlag) {
    perfectFlag.turnNumber = turnNumber;
    flags.push(perfectFlag);
  }

  const manipulationFlag = detectSkillManipulation(response, question);
  if (manipulationFlag) {
    manipulationFlag.turnNumber = turnNumber;
    flags.push(manipulationFlag);
  }

  return flags;
}

/**
 * Get current metadata for an interview
 */
export async function getInterviewMetadata(interviewId: string): Promise<InterviewMetadata> {
  const supabase = createServerClient();

  const { data: interview } = await supabase
    .from('interviews')
    .select('metadata')
    .eq('id', interviewId)
    .single();

  if (!interview?.metadata) {
    return createEmptyMetadata();
  }

  return interview.metadata as InterviewMetadata;
}

/**
 * Update interview metadata with new red flags
 */
export async function updateInterviewMetadata(
  interviewId: string,
  newFlags: RedFlag[],
  additionalUpdates?: Partial<InterviewMetadata>
): Promise<void> {
  const supabase = createServerClient();
  const currentMetadata = await getInterviewMetadata(interviewId);

  // Add new flags (avoiding duplicates based on type + turnNumber)
  const existingKeys = new Set(
    currentMetadata.red_flags.map(f => `${f.type}-${f.turnNumber || 0}`)
  );

  const uniqueNewFlags = newFlags.filter(
    f => !existingKeys.has(`${f.type}-${f.turnNumber || 0}`)
  );

  const updatedFlags = [...currentMetadata.red_flags, ...uniqueNewFlags];
  const totalPenalty = updatedFlags.reduce((sum, f) => sum + f.penalty, 0);

  const updatedMetadata: InterviewMetadata = {
    ...currentMetadata,
    ...additionalUpdates,
    red_flags: updatedFlags,
    total_penalty: totalPenalty,
  };

  await supabase
    .from('interviews')
    .update({ metadata: updatedMetadata })
    .eq('id', interviewId);
}

/**
 * Get total red flag score for an interview
 */
export async function getRedFlagScore(interviewId: string): Promise<number> {
  const metadata = await getInterviewMetadata(interviewId);
  return metadata.total_penalty;
}

/**
 * Store a key claim for later consistency checking
 */
export async function storeKeyClaim(
  interviewId: string,
  claimKey: string,
  claimValue: string
): Promise<void> {
  const supabase = createServerClient();
  const currentMetadata = await getInterviewMetadata(interviewId);

  const updatedMetadata: InterviewMetadata = {
    ...currentMetadata,
    key_claims: {
      ...currentMetadata.key_claims,
      [claimKey]: claimValue,
    },
  };

  await supabase
    .from('interviews')
    .update({ metadata: updatedMetadata })
    .eq('id', interviewId);
}

/**
 * Check for inconsistencies with stored claims
 * Returns a red flag if a contradiction is detected
 */
export async function checkConsistency(
  interviewId: string,
  response: string
): Promise<RedFlag | null> {
  const metadata = await getInterviewMetadata(interviewId);
  const claims = metadata.key_claims;

  // Simple contradiction detection
  // In a real implementation, this could use LLM-based semantic analysis
  for (const [key, value] of Object.entries(claims)) {
    // Check for explicit contradictions
    const negationPatterns = [
      new RegExp(`not\\s+${value}`, 'i'),
      new RegExp(`never\\s+.*${value}`, 'i'),
      new RegExp(`don't\\s+.*${value}`, 'i'),
    ];

    for (const pattern of negationPatterns) {
      if (pattern.test(response)) {
        return {
          type: 'INCONSISTENCY_PENALTY',
          penalty: REGISTRY_CONFIG.RED_FLAGS.INCONSISTENCY_PENALTY,
          evidence: `Potential contradiction with earlier claim about "${key}"`,
          detectedAt: new Date().toISOString(),
        };
      }
    }
  }

  return null;
}

/**
 * Format red flags for display in deliberation
 */
export function formatRedFlagsForDeliberation(metadata: InterviewMetadata): string {
  if (metadata.red_flags.length === 0) {
    return '';
  }

  const flagDescriptions = metadata.red_flags.map(f => {
    const turnInfo = f.turnNumber ? ` (turn ${f.turnNumber})` : '';
    return `- ${f.evidence}${turnInfo}`;
  });

  return `
RED FLAGS DETECTED (total penalty: ${metadata.total_penalty}):
${flagDescriptions.join('\n')}
`;
}
