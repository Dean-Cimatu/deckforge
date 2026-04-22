import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey.js';

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['authorization'];
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'API key required' });
    return;
  }
  const raw = header.slice(7);
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const apiKey = await ApiKey.findOne({ keyHash: hash });
  if (!apiKey) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Update lastUsedAt without blocking the request
  ApiKey.findByIdAndUpdate(apiKey._id, { lastUsedAt: new Date() }).catch(() => undefined);

  req.user = { id: apiKey.userId.toString(), email: '' };
  next();
}
