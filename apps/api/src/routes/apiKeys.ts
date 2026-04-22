import { Router, type Router as ExpressRouter } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth } from '../middleware/requireAuth.js';
import { ApiKey } from '../models/ApiKey.js';

export const apiKeysRouter: ExpressRouter = Router();
apiKeysRouter.use(requireAuth);

const CreateKeyInput = z.object({ name: z.string().min(1).max(64) });

// POST /api/keys
apiKeysRouter.post('/', async (req, res, next) => {
  try {
    const { name } = CreateKeyInput.parse(req.body);
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const raw = `df_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.slice(0, 10);

    await ApiKey.create({ userId, name, keyHash: hash, prefix });

    // Return the raw key only once
    res.status(201).json({ name, key: raw, prefix });
  } catch (err) {
    next(err);
  }
});

// GET /api/keys
apiKeysRouter.get('/', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const keys = await ApiKey.find({ userId }, { keyHash: 0 }).sort({ createdAt: -1 }).lean();
    res.json(keys.map((k) => ({
      id: k._id.toString(),
      name: k.name,
      prefix: k.prefix,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    })));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/keys/:id
apiKeysRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const keyId = new mongoose.Types.ObjectId(req.params.id);
    const deleted = await ApiKey.findOneAndDelete({ _id: keyId, userId });
    if (!deleted) { res.status(404).json({ error: 'Key not found' }); return; }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
