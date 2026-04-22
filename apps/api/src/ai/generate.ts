import { z } from 'zod';
import type { Types } from 'mongoose';
import type { OutputType } from '@deckforge/shared';
import { anthropic, MODEL, MAX_TOKENS, TEXT_CHAR_LIMIT, TRUNCATION_PREFIX } from './client.js';
import { SUMMARY_PROMPT, FLASHCARDS_PROMPT } from './prompts.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

const RawCardSchema = z.array(z.object({ front: z.string(), back: z.string() }));

function truncate(text: string): string {
  if (text.length <= TEXT_CHAR_LIMIT) return text;
  return TRUNCATION_PREFIX + text.slice(0, TEXT_CHAR_LIMIT);
}

export async function generateSummary(text: string): Promise<string> {
  const content = truncate(text);
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: SUMMARY_PROMPT,
    messages: [{ role: 'user', content }],
  });

  const block = msg.content[0];
  if (block?.type !== 'text') throw new GenerationError('Unexpected response type from Claude');
  return block.text.trim();
}

export async function generateFlashcards(text: string): Promise<z.infer<typeof RawCardSchema>> {
  const content = truncate(text);

  const makeRequest = (messages: { role: 'user' | 'assistant'; content: string }[]) =>
    anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: FLASHCARDS_PROMPT,
      messages,
    });

  const firstMsg = await makeRequest([{ role: 'user', content }]);
  const firstBlock = firstMsg.content[0];
  if (firstBlock?.type !== 'text') throw new GenerationError('Unexpected response type from Claude');

  const tryParse = (raw: string) => {
    try {
      let cleaned = raw.trim();
      const fenced = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
      if (fenced) cleaned = fenced[1]!.trim();
      // Also handle cases where there's text before/after the array
      const arrayMatch = cleaned.match(/(\[[\s\S]*\])/);
      if (arrayMatch && !cleaned.startsWith('[')) cleaned = arrayMatch[1]!;
      return RawCardSchema.parse(JSON.parse(cleaned));
    } catch {
      return null;
    }
  };

  const first = tryParse(firstBlock.text);
  if (first) return first;

  // Retry once with a corrective follow-up
  const retryMsg = await makeRequest([
    { role: 'user', content },
    { role: 'assistant', content: firstBlock.text },
    {
      role: 'user',
      content: 'Your previous response was invalid. Output strict JSON only.',
    },
  ]);

  const retryBlock = retryMsg.content[0];
  if (retryBlock?.type !== 'text') throw new GenerationError('Unexpected response type from Claude');

  const second = tryParse(retryBlock.text);
  if (!second) throw new GenerationError('Claude returned invalid JSON for flashcards after retry');

  return second;
}

export async function generateArtefacts(
  sourceId: Types.ObjectId,
  text: string,
  outputs: OutputType[]
): Promise<void> {
  const source = await Source.findById(sourceId);
  if (!source) throw new GenerationError(`Source ${sourceId.toString()} not found`);

  const wantSummary = outputs.includes('summary');
  const wantCards = outputs.includes('flashcards');

  const [summaryResult, cardsResult] = await Promise.allSettled([
    wantSummary ? generateSummary(text) : Promise.resolve(null),
    wantCards ? generateFlashcards(text) : Promise.resolve(null),
  ]);

  const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;
  const cards = cardsResult.status === 'fulfilled' ? cardsResult.value : null;

  const summaryError =
    summaryResult.status === 'rejected'
      ? String((summaryResult.reason as Error).message ?? summaryResult.reason)
      : null;
  const cardsError =
    cardsResult.status === 'rejected'
      ? String((cardsResult.reason as Error).message ?? cardsResult.reason)
      : null;

  const allSucceeded =
    (!wantSummary || summaryResult.status === 'fulfilled') &&
    (!wantCards || cardsResult.status === 'fulfilled');

  const errors = [summaryError, cardsError].filter(Boolean).join('; ');

  await Source.findByIdAndUpdate(sourceId, {
    $set: {
      summary,
      status: allSucceeded ? 'ready' : 'partial',
      generationError: errors || null,
    },
  });

  if (cards && cards.length > 0) {
    const deck = await Deck.create({
      sourceId,
      userId: source.userId,
      title: source.title,
      cardCount: cards.length,
    });

    await Card.insertMany(
      cards.map((c) => ({
        deckId: deck._id,
        userId: source.userId,
        front: c.front,
        back: c.back,
      }))
    );
  }
}
