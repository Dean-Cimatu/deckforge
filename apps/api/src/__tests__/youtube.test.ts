import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import jwt from 'jsonwebtoken';

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

vi.mock('../ai/client.js', () => ({
  anthropic: { messages: { create: vi.fn() } },
  MODEL: 'claude-haiku-4-5-20251001',
  MAX_TOKENS: 2000,
  TEXT_CHAR_LIMIT: 40_000,
  TRUNCATION_PREFIX: '[truncated from larger document]\n\n',
}));

vi.mock('youtube-transcript', () => ({
  YoutubeTranscript: {
    fetchTranscript: vi.fn(),
  },
  YoutubeTranscriptDisabledError: class extends Error {},
  YoutubeTranscriptNotAvailableError: class extends Error {},
  YoutubeTranscriptNotAvailableLanguageError: class extends Error {},
}));

import { YoutubeTranscript } from 'youtube-transcript';
import { anthropic } from '../ai/client.js';
import { sourcesRouter } from '../routes/sources.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

const mockFetch = YoutubeTranscript.fetchTranscript as ReturnType<typeof vi.fn>;
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

function authCookie() {
  const token = jwt.sign({ id: userId.toString(), email: 'test@test.com' }, 'test-secret', {
    expiresIn: '1d',
  });
  return `df_session=${token}`;
}

const FIXTURE_TRANSCRIPT = [
  { text: 'Welcome to the lecture.', duration: 3, offset: 0, lang: 'en' },
  { text: 'Today we cover photosynthesis.', duration: 4, offset: 3, lang: 'en' },
];

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

describe('POST /api/sources/youtube', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/sources/youtube')
      .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(res.status).toBe(401);
  });

  it('creates source from transcript and returns 201', async () => {
    mockFetch.mockResolvedValueOnce(FIXTURE_TRANSCRIPT);
    mockCreate
      .mockResolvedValueOnce(textResponse('## Summary'))
      .mockResolvedValueOnce(textResponse(JSON.stringify([{ front: 'Q', back: 'A' }])));

    const res = await request(app)
      .post('/api/sources/youtube')
      .set('Cookie', authCookie())
      .send({
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        outputs: ['summary', 'flashcards'],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('processing');
    expect(typeof res.body.id).toBe('string');

    const source = await Source.findById(res.body.id);
    expect(source?.type).toBe('youtube');
    expect(source?.inputMeta.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('returns 422 for an invalid YouTube URL', async () => {
    const res = await request(app)
      .post('/api/sources/youtube')
      .set('Cookie', authCookie())
      .send({ url: 'https://vimeo.com/123456' });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain('Invalid YouTube URL');
  });

  it('returns 422 when no captions available', async () => {
    const { YoutubeTranscriptNotAvailableError } = await import('youtube-transcript');
    mockFetch.mockRejectedValueOnce(new YoutubeTranscriptNotAvailableError('dQw4w9WgXcQ'));

    const res = await request(app)
      .post('/api/sources/youtube')
      .set('Cookie', authCookie())
      .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('no captions');
  });

  it('falls back to any language when English is unavailable', async () => {
    const { YoutubeTranscriptNotAvailableLanguageError } = await import('youtube-transcript');
    mockFetch
      .mockRejectedValueOnce(new YoutubeTranscriptNotAvailableLanguageError('en', ['fr'], 'abc'))
      .mockResolvedValueOnce(FIXTURE_TRANSCRIPT);
    mockCreate
      .mockResolvedValue(textResponse('ok'));

    const res = await request(app)
      .post('/api/sources/youtube')
      .set('Cookie', authCookie())
      .send({ url: 'https://youtu.be/dQw4w9WgXcQ', outputs: ['summary'] });

    expect(res.status).toBe(201);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
