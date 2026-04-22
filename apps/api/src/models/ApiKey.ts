import mongoose, { type Document, type Types } from 'mongoose';

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  keyHash: string;
  prefix: string;
  lastUsedAt: Date | null;
  createdAt: Date;
}

const apiKeySchema = new mongoose.Schema<IApiKey>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    name: { type: String, required: true },
    keyHash: { type: String, required: true, unique: true },
    prefix: { type: String, required: true },
    lastUsedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

apiKeySchema.index({ userId: 1 });

export const ApiKey = mongoose.model<IApiKey>('ApiKey', apiKeySchema);
