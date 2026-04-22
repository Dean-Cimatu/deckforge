import mongoose, { type Document, type Types } from 'mongoose';

export interface IDeck extends Document {
  _id: Types.ObjectId;
  sourceId: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  cardCount: number;
  isPublic: boolean;
  shareId: string | null;
  collaborators: Types.ObjectId[];
  createdAt: Date;
}

const deckSchema = new mongoose.Schema<IDeck>(
  {
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, ref: 'Source' },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true },
    cardCount: { type: Number, default: 0, min: 0 },
    isPublic: { type: Boolean, default: false },
    shareId: { type: String, default: null, sparse: true },
    collaborators: { type: [mongoose.Schema.Types.ObjectId], default: [], ref: 'User' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

deckSchema.index({ userId: 1 });
deckSchema.index({ shareId: 1 }, { sparse: true });
deckSchema.index({ collaborators: 1 });

export const Deck = mongoose.model<IDeck>('Deck', deckSchema);
