import { Router, type Router as ExpressRouter } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ReviewGrade, applyReview } from '@deckforge/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { Card } from '../models/Card.js';
import { Deck } from '../models/Deck.js';

export const cardsRouter: ExpressRouter = Router();
cardsRouter.use(requireAuth);

const MAX_IMAGE_BYTES = 400 * 1024; // 400 KB

function validateImage(val: string | undefined): string | undefined {
  if (!val) return undefined;
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  if (val.startsWith('data:image/')) {
    const bytes = Buffer.byteLength(val, 'utf8');
    if (bytes > MAX_IMAGE_BYTES) throw new Error(`Image too large (max 400 KB)`);
    return val;
  }
  throw new Error('Invalid image value');
}

const CreateCardInput = z.object({
  deckId: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  frontImage: z.string().optional(),
  backImage: z.string().optional(),
});

const PatchCardInput = z.object({
  front: z.string().min(1).optional(),
  back: z.string().min(1).optional(),
  frontImage: z.string().nullable().optional(),
  backImage: z.string().nullable().optional(),
});

// POST /api/cards
cardsRouter.post('/', async (req, res, next) => {
  try {
    const body = CreateCardInput.parse(req.body);
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deckId = new mongoose.Types.ObjectId(body.deckId);

    const deck = await Deck.findOne({ _id: deckId, userId });
    if (!deck) { res.status(404).json({ error: 'Deck not found' }); return; }

    const card = await Card.create({
      deckId,
      userId,
      front: body.front,
      back: body.back,
      frontImage: validateImage(body.frontImage) ?? null,
      backImage: validateImage(body.backImage) ?? null,
    } as Parameters<typeof Card.create>[0]);
    await Deck.findByIdAndUpdate(deckId, { $inc: { cardCount: 1 } });

    res.status(201).json(card);
  } catch (err) {
    next(err);
  }
});

// POST /api/cards/:id/review
cardsRouter.post('/:id/review', async (req, res, next) => {
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
      $set: {
        interval: next.interval,
        easeFactor: next.easeFactor,
        repetitions: next.repetitions,
        nextReviewAt,
        lastReviewedAt: now,
      },
    });

    res.json({ interval: next.interval, nextReviewAt });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/cards/:id
cardsRouter.patch('/:id', async (req, res, next) => {
  try {
    const body = PatchCardInput.parse(req.body);
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const cardId = new mongoose.Types.ObjectId(req.params.id);

    const updates: Record<string, unknown> = {};
    if (body.front !== undefined) updates.front = body.front;
    if (body.back !== undefined) updates.back = body.back;
    if (body.frontImage !== undefined) updates.frontImage = body.frontImage === null ? null : validateImage(body.frontImage);
    if (body.backImage !== undefined) updates.backImage = body.backImage === null ? null : validateImage(body.backImage);

    const card = await Card.findOneAndUpdate(
      { _id: cardId, userId },
      { $set: updates },
      { returnDocument: 'after' },
    );
    if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

    res.json(card);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/cards/:id
cardsRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const cardId = new mongoose.Types.ObjectId(req.params.id);

    const card = await Card.findOneAndDelete({ _id: cardId, userId });
    if (!card) { res.status(404).json({ error: 'Card not found' }); return; }

    await Deck.findByIdAndUpdate(card.deckId, { $inc: { cardCount: -1 } });

    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
