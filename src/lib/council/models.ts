/**
 * Council Judge Model Configuration
 * Different judges use different AI models for variety
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { JudgeName } from '@/types/database';

// Lazy initialization to avoid build-time errors
let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI();
  }
  return openaiClient;
}

// Model provider types
export type ModelProvider = 'anthropic' | 'openai';

export interface JudgeModelConfig {
  provider: ModelProvider;
  model: string;
}

/**
 * Configure which model each judge uses
 * Mix of Anthropic (Claude) and OpenAI (GPT) for variety
 */
export const JUDGE_MODELS: Record<JudgeName, JudgeModelConfig> = {
  // Anthropic judges (Claude)
  GATE: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  VEIL: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  VOID: { provider: 'anthropic', model: 'claude-sonnet-4-20250514' },

  // OpenAI judges (GPT)
  ECHO: { provider: 'openai', model: 'gpt-4o-mini' },
  CIPHER: { provider: 'openai', model: 'gpt-4o-mini' },
  THREAD: { provider: 'openai', model: 'gpt-4o-mini' },
  MARGIN: { provider: 'openai', model: 'gpt-4o-mini' },
};

/**
 * Unified interface for generating responses from either provider
 */
export async function generateJudgeResponse(
  judgeName: JudgeName,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number = 500
): Promise<string> {
  const config = JUDGE_MODELS[judgeName];

  if (config.provider === 'anthropic') {
    return generateAnthropicResponse(config.model, systemPrompt, messages, maxTokens);
  } else {
    return generateOpenAIResponse(config.model, systemPrompt, messages, maxTokens);
  }
}

/**
 * Generate response using Anthropic Claude
 */
async function generateAnthropicResponse(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number
): Promise<string> {
  const anthropic = getAnthropicClient();
  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: messages.length > 0
      ? messages
      : [{ role: 'user', content: 'The interview is beginning. Please ask your opening question.' }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return content.text;
}

/**
 * Generate response using OpenAI GPT
 */
async function generateOpenAIResponse(
  model: string,
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens: number
): Promise<string> {
  const openai = getOpenAIClient();

  // Convert to OpenAI message format
  const openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (messages.length > 0) {
    openaiMessages.push(...messages);
  } else {
    openaiMessages.push({
      role: 'user',
      content: 'The interview is beginning. Please ask your opening question.',
    });
  }

  const response = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    messages: openaiMessages,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Unexpected response type from OpenAI');
  }

  return content;
}

/**
 * Get the model info for a judge (for logging/debugging)
 */
export function getJudgeModelInfo(judgeName: JudgeName): string {
  const config = JUDGE_MODELS[judgeName];
  return `${config.provider}/${config.model}`;
}
