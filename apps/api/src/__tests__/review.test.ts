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

import supertest from 'supertest';
import { reviewRouter } from '../routes/review.js';
import { cardsRouter } from '../routes/cards.js';
import { decksRouter } from '../routes/decks.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { Source } from '../models/Source.js';

let mongod: MongoMemoryServer;
const JWT_SECRET = 'test-secret';
const userId = new mongoose.Types.ObjectId();
const token = jwt.sign({ id: userId.toString(), email: 'test@test.com' }, JWT_SECRET);

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/review', reviewRouter);
  app.use('/api/cards', cardsRouter);
  app.use('/api/decks', decksRouter);
  app.use(errorHandler);
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

let deckId: mongoose.Types.ObjectId;
let sourceId: mongoose.Types.ObjectId;

beforeEach(async () => {
  await Card.deleteMany({});
  await Deck.deleteMany({});
  await Source.deleteMany({});

  sourceId = new mongoose.Types.ObjectId();
  const deck = await Deck.create({
    sourceId,
    userId,
    title: 'Test Deck',
    cardCount: 0,
  });
  deckId = deck._id as mongoose.Types.ObjectId;
});

describe('POST /api/cards/:id/review', () => {
  it('applies SM-2 and returns updated interval', async () => {
    const card = await Card.create({
      deckId,
      userId,
      front: 'Q',
      back: 'A',
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
    });

    const res = await supertest(makeApp())
      .post(`/api/cards/${card._id}/review`)
      .set('Cookie', `df_session=${token}`)
      .send({ grade: 4 });

    expect(res.status).toBe(200);
    expect(res.body.interval).toBeGreaterThanOrEqual(1);
    expect(res.body.nextReviewAt).toBeDefined();

    const updated = await Card.findById(card._id);
    expect(updated!.lastReviewedAt).not.toBeNull();
  });

  it('returns 404 for card belonging to another user', async () => {
    const otherId = new mongoose.Types.ObjectId();
    const card = await Card.create({
      deckId,
      userId: otherId,
      front: 'Q',
      back: 'A',
    });

    const res = await supertest(makeApp())
      .post(`/api/cards/${card._id}/review`)
      .set('Cookie', `df_session=${token}`)
      .send({ grade: 4 });

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid grade', async () => {
    const card = await Card.create({ deckId, userId, front: 'Q', back: 'A' });

    const res = await supertest(makeApp())
      .post(`/api/cards/${card._id}/review`)
      .set('Cookie', `df_session=${token}`)
      .send({ grade: 2 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/review/queue', () => {
  it('returns due cards sorted by nextReviewAt', async () => {
    const past = new Date(Date.now() - 1000);
    await Card.create([
      { deckId, userId, front: 'Q1', back: 'A1', nextReviewAt: past },
      { deckId, userId, front: 'Q2', back: 'A2', nextReviewAt: past },
    ]);
    // future card should not appear
    await Card.create({ deckId, userId, front: 'Q3', back: 'A3', nextReviewAt: new Date(Date.now() + 9999999) });

    const res = await supertest(makeApp())
      .get('/api/review/queue')
      .set('Cookie', `df_session=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it('filters by deckId query param', async () => {
    const otherDeck = await Deck.create({ sourceId: new mongoose.Types.ObjectId(), userId, title: 'Other', cardCount: 0 });
    const past = new Date(Date.now() - 1000);
    await Card.create({ deckId, userId, front: 'Q1', back: 'A1', nextReviewAt: past });
    await Card.create({ deckId: otherDeck._id, userId, front: 'Q2', back: 'A2', nextReviewAt: past });

    const res = await supertest(makeApp())
      .get(`/api/review/queue?deckId=${deckId}`)
      .set('Cookie', `df_session=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.cards).toHaveLength(1);
  });
});

describe('GET /api/decks/:id/due', () => {
  it('returns due count for a deck', async () => {
    const past = new Date(Date.now() - 1000);
    await Card.create([
      { deckId, userId, front: 'Q1', back: 'A1', nextReviewAt: past },
      { deckId, userId, front: 'Q2', back: 'A2', nextReviewAt: past },
    ]);

    const res = await supertest(makeApp())
      .get(`/api/decks/${deckId}/due`)
      .set('Cookie', `df_session=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.dueCount).toBe(2);
  });
});

describe('Card CRUD', () => {
  it('POST /api/cards creates a card and increments deckCount', async () => {
    const res = await supertest(makeApp())
      .post('/api/cards')
      .set('Cookie', `df_session=${token}`)
      .send({ deckId: deckId.toString(), front: 'New Q', back: 'New A' });

    expect(res.status).toBe(201);
    expect(res.body.front).toBe('New Q');

    const deck = await Deck.findById(deckId);
    expect(deck!.cardCount).toBe(1);
  });

  it('PATCH /api/cards/:id updates front/back', async () => {
    const card = await Card.create({ deckId, userId, front: 'Old', back: 'Old' });

    const res = await supertest(makeApp())
      .patch(`/api/cards/${card._id}`)
      .set('Cookie', `df_session=${token}`)
      .send({ front: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.front).toBe('New');
    expect(res.body.back).toBe('Old');
  });

  it('DELETE /api/cards/:id removes card and decrements cardCount', async () => {
    await Deck.findByIdAndUpdate(deckId, { cardCount: 1 });
    const card = await Card.create({ deckId, userId, front: 'Q', back: 'A' });

    const res = await supertest(makeApp())
      .delete(`/api/cards/${card._id}`)
      .set('Cookie', `df_session=${token}`);

    expect(res.status).toBe(204);
    const deck = await Deck.findById(deckId);
    expect(deck!.cardCount).toBe(0);
  });
});
