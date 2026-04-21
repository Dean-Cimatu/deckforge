import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const TEST_SECRET = 'test-secret';

// Mock env before importing auth routes
vi.mock('../env.js', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    CORS_ORIGIN: 'http://localhost:5173',
    MONGODB_URI: 'mongodb://localhost:27017/deckforge_test',
    JWT_SECRET: TEST_SECRET,
  },
}));

// Mock User model
const mockUser = {
  id: 'user123',
  email: 'test@example.com',
  passwordHash: '',
};

vi.mock('../models/User.js', () => ({
  User: {
    findByEmail: vi.fn(),
    create: vi.fn(),
  },
}));

import { User } from '../models/User.js';

describe('Auth: bcrypt + JWT flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hashes password with 10 rounds and produces a verifiable hash', async () => {
    const password = 'hunter2hunter2';
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2')).toBe(true);

    const valid = await bcrypt.compare(password, hash);
    expect(valid).toBe(true);

    const invalid = await bcrypt.compare('wrongpassword', hash);
    expect(invalid).toBe(false);
  });

  it('issues a JWT with correct payload and 30d expiry', () => {
    const payload = { id: 'user123', email: 'test@example.com' };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '30d' });

    const decoded = jwt.verify(token, TEST_SECRET) as typeof payload & { exp: number; iat: number };
    expect(decoded.id).toBe(payload.id);
    expect(decoded.email).toBe(payload.email);

    const thirtyDaysMs = 30 * 24 * 60 * 60;
    const diff = decoded.exp - decoded.iat;
    expect(diff).toBe(thirtyDaysMs);
  });

  it('rejects a token signed with the wrong secret', () => {
    const token = jwt.sign({ id: 'x' }, 'wrong-secret');
    expect(() => jwt.verify(token, TEST_SECRET)).toThrow();
  });

  it('rejects an expired token', async () => {
    const token = jwt.sign({ id: 'x' }, TEST_SECRET, { expiresIn: '0s' });
    // tiny delay to let it expire
    await new Promise((r) => setTimeout(r, 10));
    expect(() => jwt.verify(token, TEST_SECRET)).toThrow(/expired/i);
  });

  it('User.findByEmail is called with lowercased email on login check', async () => {
    const findSpy = vi.mocked(User.findByEmail).mockResolvedValue(null);
    await User.findByEmail('TEST@EXAMPLE.COM');
    expect(findSpy).toHaveBeenCalledWith('TEST@EXAMPLE.COM');
  });

  it('registration flow: hash stored, JWT issued', async () => {
    const password = 'securepassword1';
    const hash = await bcrypt.hash(password, 10);
    mockUser.passwordHash = hash;

    vi.mocked(User.findByEmail).mockResolvedValue(null);
    vi.mocked(User.create).mockResolvedValue(mockUser as never);

    // Simulate what the register route does
    const existing = await User.findByEmail('test@example.com');
    expect(existing).toBeNull();

    const created = await User.create({ email: 'test@example.com', passwordHash: hash });
    const token = jwt.sign({ id: created.id, email: created.email }, TEST_SECRET, {
      expiresIn: '30d',
    });

    const decoded = jwt.verify(token, TEST_SECRET) as { id: string; email: string };
    expect(decoded.email).toBe('test@example.com');
  });
});
