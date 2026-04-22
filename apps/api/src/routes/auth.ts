import { Router, type Router as ExpressRouter } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RegisterInput, LoginInput } from '@deckforge/shared';
import { User } from '../models/User.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { env } from '../env.js';

export const authRouter: ExpressRouter = Router();

const COOKIE_NAME = 'df_session';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days ms

function setSessionCookie(res: import('express').Response, token: string) {
  const prod = env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: prod,
    sameSite: prod ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;

  const existing = await User.findByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'An account with that email already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email: email.toLowerCase().trim(), passwordHash });

  const uid = user._id.toString();
  const token = jwt.sign({ id: uid, email: user.email }, env.JWT_SECRET, { expiresIn: '30d' });
  setSessionCookie(res, token);

  res.status(201).json({ user: { id: uid, email: user.email } });
});

authRouter.post('/login', async (req, res) => {
  const parsed = LoginInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;

  const user = await User.findByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const uid = user._id.toString();
  const token = jwt.sign({ id: uid, email: user.email }, env.JWT_SECRET, { expiresIn: '30d' });
  setSessionCookie(res, token);

  res.json({ user: { id: uid, email: user.email } });
});

authRouter.post('/logout', (_req, res) => {
  const prod = env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, { path: '/', secure: prod, sameSite: prod ? 'none' : 'lax' });
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});
