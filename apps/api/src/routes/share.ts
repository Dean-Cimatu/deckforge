import { Router, type Router as ExpressRouter } from 'express';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';
import { Source } from '../models/Source.js';

export const shareRouter: ExpressRouter = Router();

function generateShareId(): string {
  return randomBytes(6).toString('base64url'); // 8 URL-safe chars
}

// POST /api/share/:deckId — enable sharing (auth required)
shareRouter.post('/:deckId', requireAuth, async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.deckId);

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    // Reuse existing shareId so the link stays stable
    const shareId = deck.shareId ?? generateShareId();
    await Deck.findByIdAndUpdate(deckId, { isPublic: true, shareId });

    res.json({ shareId, isPublic: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/share/:deckId — disable sharing (auth required)
shareRouter.delete('/:deckId', requireAuth, async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.deckId);

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    // Keep shareId so the same link can be re-enabled later
    await Deck.findByIdAndUpdate(deckId, { isPublic: false });

    res.json({ isPublic: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/share/:shareId — public, no auth
shareRouter.get('/:shareId', async (req, res, next) => {
  try {
    const deck = await Deck.findOne({ shareId: req.params.shareId, isPublic: true }).lean();
    if (!deck) { res.status(404).json({ error: 'Deck not found or no longer shared' }); return; }

    const cards = await Card.find({ deckId: deck._id }).lean();
    const source = await Source.findById(deck.sourceId).lean();

    res.json({
      deck: {
        id: deck._id.toString(),
        title: deck.title,
        cardCount: deck.cardCount,
        shareId: deck.shareId,
        isPublic: deck.isPublic,
        createdAt: deck.createdAt,
        language: source?.language ?? 'original',
      },
      cards: cards.map((c) => ({
        id: c._id.toString(),
        front: c.front,
        back: c.back,
        frontImage: c.frontImage ?? null,
        backImage: c.backImage ?? null,
      })),
    });
  } catch (err) {
    next(err);
  }
});
