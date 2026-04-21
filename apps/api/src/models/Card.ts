import mongoose, { type Document, type Types } from 'mongoose';

export interface ICard extends Document {
  _id: Types.ObjectId;
  deckId: Types.ObjectId;
  userId: Types.ObjectId;
  front: string;
  back: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
}

const cardSchema = new mongoose.Schema<ICard>(
  {
    deckId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Deck' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    front: { type: String, required: true },
    back: { type: String, required: true },
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewAt: { type: Date, default: () => new Date() },
    lastReviewedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

cardSchema.index({ userId: 1, nextReviewAt: 1 });
cardSchema.index({ deckId: 1 });

export const Card = mongoose.model<ICard>('Card', cardSchema);
