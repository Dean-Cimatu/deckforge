import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

export const decksRouter: ExpressRouter = Router();
decksRouter.use(requireAuth);

// GET /api/decks/:id/due
decksRouter.get('/:id/due', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.id);

    const deck = await Deck.findOne({ _id: deckId, userId }).lean();
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    const now = new Date();
    const cards = await Card.find({ deckId, userId, nextReviewAt: { $lte: now } }).lean();

    res.json({ deckId: deckId.toString(), dueCount: cards.length, cards });
  } catch (err) {
    next(err);
  }
});
