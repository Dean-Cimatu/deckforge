import mongoose, { type Document, type Types } from 'mongoose';
import type { SourceType, SourceStatus, LanguageCode } from '@deckforge/shared';

export interface ISource extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  type: SourceType;
  language: LanguageCode;
  inputMeta: {
    filename?: string;
    url?: string;
    pageCount?: number;
    imageCount?: number;
  };
  extractedText: string | null;
  summary: string | null;
  status: SourceStatus;
  generationError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const sourceSchema = new mongoose.Schema<ISource>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    title: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['text', 'pdf', 'image', 'images', 'youtube', 'url', 'manual'],
    },
    language: {
      type: String,
      required: true,
      enum: ['original', 'en', 'ar', 'tr', 'de', 'ru'],
      default: 'original',
    },
    inputMeta: {
      filename: String,
      url: String,
      pageCount: Number,
      imageCount: Number,
    },
    extractedText: { type: String, default: null },
    summary: { type: String, default: null },
    status: {
      type: String,
      required: true,
      enum: ['processing', 'ready', 'partial', 'failed'],
      default: 'processing',
    },
    generationError: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

sourceSchema.index({ userId: 1, createdAt: -1 });
sourceSchema.index({ userId: 1, type: 1 });

export const Source = mongoose.model<ISource>('Source', sourceSchema);
