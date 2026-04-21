import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';
import {
  createSource,
  getSource,
  listSources,
  deleteSource,
} from '../services/sourceService.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([
    Source.deleteMany({}),
    Deck.deleteMany({}),
    Card.deleteMany({}),
  ]);
});

const uid = () => new mongoose.Types.ObjectId();

describe('createSource', () => {
  it('creates a source with processing status', async () => {
    const userId = uid();
    const source = await createSource(userId, {
      title: 'My Notes',
      type: 'text',
    });

    expect(source.status).toBe('processing');
    expect(source.title).toBe('My Notes');
    expect(source.type).toBe('text');
    expect(source.userId.toString()).toBe(userId.toString());
    expect(source.extractedText).toBeNull();
    expect(source.summary).toBeNull();
  });

  it('stores inputMeta when provided', async () => {
    const userId = uid();
    const source = await createSource(userId, {
      title: 'lecture.pdf',
      type: 'pdf',
      inputMeta: { filename: 'lecture.pdf', pageCount: 12 },
    });

    expect(source.inputMeta.filename).toBe('lecture.pdf');
    expect(source.inputMeta.pageCount).toBe(12);
  });
});

describe('getSource', () => {
  it('returns the source for the correct user', async () => {
    const userId = uid();
    const created = await createSource(userId, { title: 'Test', type: 'text' });
    const found = await getSource(created._id.toString(), userId);

    expect(found).not.toBeNull();
    expect(found!._id.toString()).toBe(created._id.toString());
  });

  it('returns null for a different user', async () => {
    const userId = uid();
    const created = await createSource(userId, { title: 'Test', type: 'text' });
    const found = await getSource(created._id.toString(), uid());

    expect(found).toBeNull();
  });
});

describe('listSources', () => {
  it('returns sources sorted newest first', async () => {
    const userId = uid();
    await createSource(userId, { title: 'First', type: 'text' });
    await new Promise((r) => setTimeout(r, 5));
    await createSource(userId, { title: 'Second', type: 'pdf' });

    const { sources, total } = await listSources(userId);
    expect(total).toBe(2);
    expect(sources[0]!.title).toBe('Second');
    expect(sources[1]!.title).toBe('First');
  });

  it('filters by type', async () => {
    const userId = uid();
    await createSource(userId, { title: 'A', type: 'text' });
    await createSource(userId, { title: 'B', type: 'pdf' });
    await createSource(userId, { title: 'C', type: 'text' });

    const { sources, total } = await listSources(userId, { type: 'text' });
    expect(total).toBe(2);
    expect(sources.every((s) => s.type === 'text')).toBe(true);
  });

  it('does not return other users sources', async () => {
    const userA = uid();
    const userB = uid();
    await createSource(userA, { title: 'Mine', type: 'text' });
    await createSource(userB, { title: 'Theirs', type: 'text' });

    const { sources } = await listSources(userA);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.title).toBe('Mine');
  });
});

describe('deleteSource', () => {
  it('deletes the source and returns true', async () => {
    const userId = uid();
    const source = await createSource(userId, { title: 'Del', type: 'text' });
    const result = await deleteSource(source._id.toString(), userId);

    expect(result).toBe(true);
    expect(await Source.findById(source._id)).toBeNull();
  });

  it('cascades to deck and cards', async () => {
    const userId = uid();
    const source = await createSource(userId, { title: 'Del', type: 'text' });

    const deck = await Deck.create({
      sourceId: source._id,
      userId,
      title: 'Deck',
      cardCount: 2,
    });

    await Card.create([
      { deckId: deck._id, userId, front: 'Q1', back: 'A1' },
      { deckId: deck._id, userId, front: 'Q2', back: 'A2' },
    ]);

    await deleteSource(source._id.toString(), userId);

    expect(await Deck.findById(deck._id)).toBeNull();
    expect(await Card.countDocuments({ deckId: deck._id })).toBe(0);
  });

  it('returns false for a different user', async () => {
    const userId = uid();
    const source = await createSource(userId, { title: 'Del', type: 'text' });
    const result = await deleteSource(source._id.toString(), uid());

    expect(result).toBe(false);
    expect(await Source.findById(source._id)).not.toBeNull();
  });
});
