import type { Types } from 'mongoose';
import type { SourceType, LanguageCode } from '@deckforge/shared';
import { Source, type ISource } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';

const PAGE_SIZE = 20;

export async function createSource(
  userId: Types.ObjectId,
  data: {
    title: string;
    type: SourceType;
    language?: LanguageCode;
    inputMeta?: ISource['inputMeta'];
  }
): Promise<ISource> {
  return Source.create({
    userId,
    title: data.title,
    type: data.type,
    language: data.language ?? 'original',
    inputMeta: data.inputMeta ?? {},
    status: 'processing',
  });
}

export async function getSource(
  sourceId: string,
  userId: Types.ObjectId
): Promise<ISource | null> {
  return Source.findOne({ _id: sourceId, userId });
}

export async function listSources(
  userId: Types.ObjectId,
  opts: { type?: SourceType; page?: number; q?: string; limit?: number } = {}
): Promise<{ sources: ISource[]; total: number; page: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = opts.limit ?? PAGE_SIZE;
  const filter: Record<string, unknown> = { userId };
  if (opts.type) filter.type = opts.type;
  if (opts.q) filter.title = { $regex: opts.q, $options: 'i' };

  const [sources, total] = await Promise.all([
    Source.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Source.countDocuments(filter),
  ]);

  return { sources, total, page };
}

export async function deleteSource(
  sourceId: string,
  userId: Types.ObjectId
): Promise<boolean> {
  const source = await Source.findOneAndDelete({ _id: sourceId, userId });
  if (!source) return false;

  const deck = await Deck.findOneAndDelete({ sourceId: source._id });
  if (deck) {
    await Card.deleteMany({ deckId: deck._id });
  }

  return true;
}
