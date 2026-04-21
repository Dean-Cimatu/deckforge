import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock env before any imports that read it
vi.mock('../env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    CORS_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://localhost/test',
    JWT_SECRET: 'test-secret',
    ANTHROPIC_API_KEY: 'test-key',
  },
}));

// Mock youtube-transcript (imported transitively via routes/sources → ingest/youtube)
vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: { fetchTranscript: vi.fn() },
  YoutubeTranscriptDisabledError: class extends Error {},
  YoutubeTranscriptNotAvailableError: class extends Error {},
  YoutubeTranscriptNotAvailableLanguageError: class extends Error {},
}));

// Mock Anthropic client
vi.mock('../ai/client.js', () => ({
  anthropic: { messages: { create: vi.fn() } },
  MODEL: 'claude-haiku-4-5-20251001',
  MAX_TOKENS: 2000,
  TEXT_CHAR_LIMIT: 40_000,
  TRUNCATION_PREFIX: '[truncated from larger document]\n\n',
}));

import { anthropic } from '../ai/client.js';
import { sourcesRouter } from '../routes/sources.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

const mockCreate = anthropic.messages.create as ReturnType<typeof vi.fn>;

function textResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

let mongod: MongoMemoryServer;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/sources', sourcesRouter);
app.use(errorHandler);

const userId = new mongoose.Types.ObjectId();
const TEST_SECRET = 'test-secret';

function authCookie() {
  const token = jwt.sign({ id: userId.toString(), email: 'test@test.com' }, TEST_SECRET, {
    expiresIn: '1d',
  });
  return `df_session=${token}`;
}

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

describe('POST /api/sources/text', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/sources/text')
      .send({ text: 'hello' });
    expect(res.status).toBe(401);
  });

  it('creates source and fires generation async, returns 201', async () => {
    const cards = [{ front: 'Q', back: 'A' }];
    mockCreate
      .mockResolvedValueOnce(textResponse('## Summary'))
      .mockResolvedValueOnce(textResponse(JSON.stringify(cards)));

    const res = await request(app)
      .post('/api/sources/text')
      .set('Cookie', authCookie())
      .send({ text: 'Study notes about photosynthesis', outputs: ['summary', 'flashcards'] });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('processing');
    expect(typeof res.body.id).toBe('string');
  });

  it('eventually sets status=ready and populates cards + summary', async () => {
    const cards = [{ front: 'Q', back: 'A' }];
    mockCreate
      .mockResolvedValueOnce(textResponse('## Summary'))
      .mockResolvedValueOnce(textResponse(JSON.stringify(cards)));

    const createRes = await request(app)
      .post('/api/sources/text')
      .set('Cookie', authCookie())
      .send({ text: 'Study notes', outputs: ['summary', 'flashcards'] });

    const id = createRes.body.id as string;

    // Wait for async generation to complete
    await new Promise((r) => setTimeout(r, 100));

    const getRes = await request(app)
      .get(`/api/sources/${id}`)
      .set('Cookie', authCookie());

    expect(getRes.status).toBe(200);
    expect(getRes.body.source.status).toBe('ready');
    expect(getRes.body.source.summary).toBe('## Summary');
    expect(getRes.body.cards).toHaveLength(1);
    expect(getRes.body.deck).not.toBeNull();
  });

  it('returns 400 on missing text', async () => {
    const res = await request(app)
      .post('/api/sources/text')
      .set('Cookie', authCookie())
      .send({ outputs: ['flashcards'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });
});

describe('DELETE /api/sources/:id', () => {
  it('cascades to deck and cards', async () => {
    mockCreate
      .mockResolvedValueOnce(textResponse('Summary'))
      .mockResolvedValueOnce(textResponse(JSON.stringify([{ front: 'Q', back: 'A' }])));

    const createRes = await request(app)
      .post('/api/sources/text')
      .set('Cookie', authCookie())
      .send({ text: 'content', outputs: ['summary', 'flashcards'] });

    const id = createRes.body.id as string;
    await new Promise((r) => setTimeout(r, 100));

    const delRes = await request(app)
      .delete(`/api/sources/${id}`)
      .set('Cookie', authCookie());

    expect(delRes.status).toBe(204);
    expect(await Source.findById(id)).toBeNull();
    expect(await Deck.countDocuments({})).toBe(0);
    expect(await Card.countDocuments({})).toBe(0);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/sources/fake-id');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/sources', () => {
  it('returns only the authenticated users sources', async () => {
    mockCreate
      .mockResolvedValue(textResponse('ok'));

    await request(app)
      .post('/api/sources/text')
      .set('Cookie', authCookie())
      .send({ text: 'my content', outputs: ['summary'] });

    const res = await request(app)
      .get('/api/sources')
      .set('Cookie', authCookie());

    expect(res.status).toBe(200);
    expect(res.body.sources).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});
