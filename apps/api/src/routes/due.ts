import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { Source } from '../models/Source.js';

export const dueRouter: ExpressRouter = Router();

dueRouter.use(requireAuth);

dueRouter.get('/', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const now = new Date();

    const dueCards = await Card.find({ userId, nextReviewAt: { $lte: now } }).lean();

    // Group by deckId
    const byDeckMap = new Map<string, number>();
    for (const card of dueCards) {
      const key = card.deckId.toString();
      byDeckMap.set(key, (byDeckMap.get(key) ?? 0) + 1);
    }

    const deckIds = [...byDeckMap.keys()].map((id) => new mongoose.Types.ObjectId(id));
    const decks = await Deck.find({ _id: { $in: deckIds } }).lean();
    const sourceIds = decks.map((d) => d.sourceId);
    const sources = await Source.find({ _id: { $in: sourceIds } }, { _id: 1, title: 1 }).lean();
    const sourceMap = new Map(sources.map((s) => [s._id.toString(), s.title]));

    const byDeck = decks.map((d) => ({
      deckId: d._id.toString(),
      sourceId: d.sourceId.toString(),
      title: sourceMap.get(d.sourceId.toString()) ?? d.title,
      dueCount: byDeckMap.get(d._id.toString()) ?? 0,
    }));

    res.json({ totalDue: dueCards.length, byDeck });
  } catch (err) {
    next(err);
  }
});
