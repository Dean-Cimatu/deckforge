import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Card } from '../models/Card.js';

export const reviewRouter: ExpressRouter = Router();
reviewRouter.use(requireAuth);

// GET /api/review/queue
reviewRouter.get('/queue', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const now = new Date();

    const query: mongoose.FilterQuery<typeof Card> = { userId, nextReviewAt: { $lte: now } };

    if (req.query.deckId) {
      query.deckId = new mongoose.Types.ObjectId(req.query.deckId as string);
    }

    const cards = await Card.find(query).sort({ nextReviewAt: 1 }).limit(50).lean();

    res.json({ cards, total: cards.length });
  } catch (err) {
    next(err);
  }
});
