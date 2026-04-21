import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env.js';

export const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export const MODEL = 'claude-haiku-4-5-20251001';
export const MAX_TOKENS = 2000;
export const TEXT_CHAR_LIMIT = 40_000;
export const TRUNCATION_PREFIX = '[truncated from larger document]\n\n';
