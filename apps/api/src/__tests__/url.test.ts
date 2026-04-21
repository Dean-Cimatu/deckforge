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
  YoutubeTranscript: { fetchTranscript: vi.fn() },
  YoutubeTranscriptDisabledError: class extends Error {},
  YoutubeTranscriptNotAvailableError: class extends Error {},
  YoutubeTranscriptNotAvailableLanguageError: class extends Error {},
}));

// Mock global fetch for URL ingest
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { sourcesRouter } from '../routes/sources.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

const FIXTURE_HTML = `<!DOCTYPE html>
<html><head><title>Understanding Machine Learning</title></head>
<body>
  <article>
    <h1>Understanding Machine Learning</h1>
    <p>Machine learning is a subset of artificial intelligence that enables systems to automatically learn from experience. It encompasses supervised learning, unsupervised learning, and reinforcement learning. Applications range from image recognition to natural language processing and recommendation systems. This field has grown rapidly due to advances in computational power and data availability.</p>
    <p>Supervised learning involves training on labeled datasets. Unsupervised learning discovers hidden patterns. Reinforcement learning trains agents through reward signals. Deep learning uses neural networks with many layers.</p>
  </article>
</body></html>`;

function makeReadableStream(content: string) {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  let offset = 0;
  return new ReadableStream({
    pull(controller) {
      if (offset >= bytes.length) { controller.close(); return; }
      const chunk = bytes.slice(offset, offset + 256);
      offset += 256;
      controller.enqueue(chunk);
    },
  });
}

let mongod: MongoMemoryServer;

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/sources', sourcesRouter);
app.use(errorHandler);

const userId = new mongoose.Types.ObjectId();

function authCookie() {
  const token = jwt.sign({ id: userId.toString(), email: 'test@test.com' }, 'test-secret', { expiresIn: '1d' });
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
  await Promise.all([Source.deleteMany({}), Deck.deleteMany({}), Card.deleteMany({})]);
});

describe('POST /api/sources/url', () => {
  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/sources/url').send({ url: 'https://example.com' });
    expect(res.status).toBe(401);
  });

  it('creates source from article content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html; charset=utf-8' },
      body: { getReader: () => {
        const stream = makeReadableStream(FIXTURE_HTML);
        return stream.getReader();
      }},
    });

    const { anthropic } = await import('../ai/client.js');
    const mockCreate = anthropic.messages.create as ReturnType<typeof vi.fn>;
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }] });

    const res = await request(app)
      .post('/api/sources/url')
      .set('Cookie', authCookie())
      .send({ url: 'https://example.com/article', outputs: ['summary'] });

    expect(res.status).toBe(201);
    const source = await Source.findById(res.body.id);
    expect(source?.type).toBe('url');
    expect(source?.title).toBeTruthy();
  });

  it('returns 422 for private IP (SSRF guard)', async () => {
    const res = await request(app)
      .post('/api/sources/url')
      .set('Cookie', authCookie())
      .send({ url: 'http://192.168.1.1/secret' });
    expect(res.status).toBe(422);
    expect(res.body.error).toContain('private network');
  });

  it('returns 422 for localhost', async () => {
    const res = await request(app)
      .post('/api/sources/url')
      .set('Cookie', authCookie())
      .send({ url: 'http://localhost:3000/admin' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when Readability cannot extract content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'text/html' },
      body: { getReader: () => makeReadableStream('<html><body><p>Short</p></body></html>').getReader() },
    });

    const res = await request(app)
      .post('/api/sources/url')
      .set('Cookie', authCookie())
      .send({ url: 'https://example.com/short' });

    expect(res.status).toBe(422);
    expect(res.body.error).toContain('readable content');
  });
});
