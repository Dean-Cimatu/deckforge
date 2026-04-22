import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { ReviewGrade, applyReview } from '@deckforge/shared';
import { requireApiKey } from '../middleware/requireApiKey.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { Source } from '../models/Source.js';

export const v1Router: ExpressRouter = Router();
v1Router.use(requireApiKey);

// GET /api/v1/review/queue
v1Router.get('/review/queue', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const now = new Date();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = { userId, nextReviewAt: { $lte: now } };
    if (req.query.deckId) query.deckId = new mongoose.Types.ObjectId(req.query.deckId as string);
    const cards = await Card.find(query).sort({ nextReviewAt: 1 }).limit(50).lean();
    res.json({ cards, total: cards.length });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/cards/:id/review
v1Router.post('/cards/:id/review', async (req, res, next) => {
  try {
    const grade = ReviewGrade.parse(req.body.grade);
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const cardId = new mongoose.Types.ObjectId(req.params.id);

    const card = await Card.findOne({ _id: cardId, userId });
    if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

    const state = { interval: card.interval, easeFactor: card.easeFactor, repetitions: card.repetitions };
    const now = new Date();
    const { next, nextReviewAt } = applyReview(state, grade, now);

    await Card.findByIdAndUpdate(cardId, {
      $set: { interval: next.interval, easeFactor: next.easeFactor, repetitions: next.repetitions, nextReviewAt, lastReviewedAt: now },
    });

    res.json({ interval: next.interval, nextReviewAt });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/sources
v1Router.get('/sources', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const sources = await Source.find({ userId }, { extractedText: 0 }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ sources });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/decks
v1Router.get('/decks', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const decks = await Deck.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ decks });
  } catch (err) {
    next(err);
  }
});
