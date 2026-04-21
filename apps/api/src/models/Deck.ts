import mongoose, { type Document, type Types } from 'mongoose';

export interface IDeck extends Document {
  _id: Types.ObjectId;
  sourceId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  cardCount: number;
  createdAt: Date;
}

const deckSchema = new mongoose.Schema<IDeck>(
  {
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'Source' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true },
    cardCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

deckSchema.index({ userId: 1 });

export const Deck = mongoose.model<IDeck>('Deck', deckSchema);
