import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock the AI client before importing generate
vi.mock('../ai/client.js', () => ({
  anthropic: { messages: { create: vi.fn() } },
  MODEL: 'claude-haiku-4-5-20251001',
  MAX_TOKENS: 2000,
  TEXT_CHAR_LIMIT: 40_000,
  TRUNCATION_PREFIX: '[truncated from larger document]\n\n',
}));

import { anthropic } from '../ai/client.js';
import { generateSummary, generateFlashcards, generateArtefacts } from '../ai/generate.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

const mockCreate = anthropic.messages.create as ReturnType<typeof vi.fn>;

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await Promise.all([
    Source.deleteMany({}),
    Deck.deleteMany({}),
    Card.deleteMany({}),
  ]);
});

const userId = new mongoose.Types.ObjectId();

async function makeSource(title = 'Test Source') {
  return Source.create({
    userId,
    title,
    type: 'text',
    inputMeta: {},
    status: 'processing',
    extractedText: null,
    summary: null,
    generationError: null,
  });
}

describe('generateSummary', () => {
  it('returns trimmed text from Claude', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('  A summary.  '));
    const result = await generateSummary('some content');
    expect(result).toBe('A summary.');
  });

  it('truncates input and prefixes when over 40 000 chars', async () => {
    mockCreate.mockResolvedValueOnce(textResponse('ok'));
    await generateSummary('x'.repeat(50_000));
    const call = mockCreate.mock.calls[0]!;
    const body = call[0] as { messages: { content: string }[] };
    const content = body.messages[0]!.content;
    expect(content.startsWith('[truncated')).toBe(true);
    expect(content.length).toBeLessThan(50_000);
  });

  it('throws on non-text response block', async () => {
    mockCreate.mockResolvedValueOnce({ content: [{ type: 'tool_use', id: 'x' }] });
    await expect(generateSummary('text')).rejects.toThrow('Unexpected response type');
  });
});

describe('generateFlashcards', () => {
  it('parses valid JSON on first attempt', async () => {
    const cards = [{ front: 'Q1', back: 'A1' }, { front: 'Q2', back: 'A2' }];
    mockCreate.mockResolvedValueOnce(textResponse(JSON.stringify(cards)));
    const result = await generateFlashcards('content');
    expect(result).toHaveLength(2);
    expect(result[0]!).toEqual({ front: 'Q1', back: 'A1' });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('retries once on malformed JSON and succeeds', async () => {
    const cards = [{ front: 'Q', back: 'A' }];
    mockCreate
      .mockResolvedValueOnce(textResponse('not valid json'))
      .mockResolvedValueOnce(textResponse(JSON.stringify(cards)));
    const result = await generateFlashcards('content');
    expect(result).toHaveLength(1);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    // Second call should include the corrective message
    const secondCall = mockCreate.mock.calls[1]!;
    const messages = (secondCall[0] as { messages: { content: string }[] }).messages;
    expect(messages.at(-1)!.content).toContain('Your previous response was invalid');
  });

  it('throws GenerationError when both attempts fail', async () => {
    mockCreate
      .mockResolvedValueOnce(textResponse('bad json'))
      .mockResolvedValueOnce(textResponse('still bad'));
    await expect(generateFlashcards('content')).rejects.toThrow('invalid JSON for flashcards after retry');
  });
});

describe('generateArtefacts', () => {
  it('writes summary and cards to Mongo, status=ready', async () => {
    const source = await makeSource();
    const cards = [{ front: 'Q', back: 'A' }];
    mockCreate
      .mockResolvedValueOnce(textResponse('## Summary'))
      .mockResolvedValueOnce(textResponse(JSON.stringify(cards)));

    await generateArtefacts(source._id, 'fixture text', ['summary', 'flashcards']);

    const updated = await Source.findById(source._id);
    expect(updated!.status).toBe('ready');
    expect(updated!.summary).toBe('## Summary');
    expect(updated!.generationError).toBeNull();

    const deck = await Deck.findOne({ sourceId: source._id });
    expect(deck).not.toBeNull();
    expect(deck!.cardCount).toBe(1);

    const cardDocs = await Card.find({ deckId: deck!._id });
    expect(cardDocs).toHaveLength(1);
    expect(cardDocs[0]!.front).toBe('Q');
  });

  it('sets status=partial and populates generationError when cards fail', async () => {
    const source = await makeSource();
    mockCreate
      .mockResolvedValueOnce(textResponse('## Summary'))
      .mockResolvedValueOnce(textResponse('bad'))
      .mockResolvedValueOnce(textResponse('still bad'));

    await generateArtefacts(source._id, 'fixture text', ['summary', 'flashcards']);

    const updated = await Source.findById(source._id);
    expect(updated!.status).toBe('partial');
    expect(updated!.summary).toBe('## Summary');
    expect(updated!.generationError).toBeTruthy();

    const deck = await Deck.findOne({ sourceId: source._id });
    expect(deck).toBeNull();
  });
});
