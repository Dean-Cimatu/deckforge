import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';
import { Source } from '../models/Source.js';
import { User } from '../models/User.js';

export const decksRouter: ExpressRouter = Router();
decksRouter.use(requireAuth);

// GET /api/decks/shared-with-me
decksRouter.get('/shared-with-me', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const decks = await Deck.find({ collaborators: userId }).lean();
    const sourceIds = decks.map((d) => d.sourceId);
    const sources = await Source.find({ _id: { $in: sourceIds } }).lean();
    const sourceMap = new Map(sources.map((s) => [s._id.toString(), s]));

    const results = decks.map((deck) => {
      const src = sourceMap.get(deck.sourceId.toString()) ?? null;
      return {
        deck: { ...deck, id: deck._id.toString() },
        source: src ? { ...src, id: src._id.toString() } : null,
      };
    });

    res.json({ decks: results });
  } catch (err) {
    next(err);
  }
});

// GET /api/decks/:id/cards
decksRouter.get('/:id/cards', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.id);

    const deck = await Deck.findOne({
      _id: deckId,
      $or: [{ userId }, { collaborators: userId }],
    }).lean();
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    const cards = await Card.find({ deckId }).lean();
    res.json({ deck, cards });
  } catch (err) {
    next(err);
  }
});

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

// GET /api/decks/:id/collaborators
decksRouter.get('/:id/collaborators', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.id);

    const deck = await Deck.findOne({ _id: deckId, userId }).lean();
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    const collaborators = await User.find(
      { _id: { $in: deck.collaborators } },
      { email: 1 }
    ).lean();

    res.json({ collaborators: collaborators.map((u) => ({ id: u._id.toString(), email: u.email })) });
  } catch (err) {
    next(err);
  }
});

// POST /api/decks/:id/collaborators  body: { email }
decksRouter.post('/:id/collaborators', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.id);

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    const email = (req.body as { email?: string }).email?.trim().toLowerCase();
    if (!email) { res.status(400).json({ error: 'email is required' }); return; }

    const targetUser = await User.findByEmail(email);
    if (!targetUser) { res.status(404).json({ error: 'No account found with that email' }); return; }

    if (targetUser._id.equals(userId)) {
      res.status(400).json({ error: 'You cannot add yourself as a collaborator' });
      return;
    }

    const already = deck.collaborators.some((c) => c.equals(targetUser._id));
    if (already) { res.status(409).json({ error: 'Already a collaborator' }); return; }

    await Deck.findByIdAndUpdate(deckId, { $push: { collaborators: targetUser._id } });

    res.status(201).json({ id: targetUser._id.toString(), email: targetUser.email });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/decks/:id/collaborators/:collaboratorId
decksRouter.delete('/:id/collaborators/:collaboratorId', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(req.params.id);
    const collaboratorId = new mongoose.Types.ObjectId(req.params.collaboratorId);

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    await Deck.findByIdAndUpdate(deckId, { $pull: { collaborators: collaboratorId } });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
