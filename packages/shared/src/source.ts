import { z } from 'zod';

export const SUPPORTED_LANGUAGES = [
  { code: 'original', label: 'Same as source' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'tr', label: 'Türkçe (Turkish)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'ru', label: 'Русский (Russian)' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export const SourceType = z.enum(['text', 'pdf', 'image', 'images', 'youtube', 'url', 'manual']);
export const SourceStatus = z.enum(['processing', 'ready', 'partial', 'failed']);
export const OutputType = z.enum(['flashcards', 'summary']);

export const ReviewGrade = z.union([
  z.literal(0),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const CardSchema = z.object({
  id: z.string(),
  deckId: z.string(),
  userId: z.string(),
  front: z.string(),
  back: z.string(),
  frontImage: z.string().nullable().optional(),
  backImage: z.string().nullable().optional(),
  easeFactor: z.number().default(2.5),
  interval: z.number().int().default(0),
  repetitions: z.number().int().default(0),
  nextReviewAt: z.coerce.date(),
  lastReviewedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
});

export const DeckSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  userId: z.string(),
  title: z.string(),
  cardCount: z.number().int().default(0),
  isPublic: z.boolean().default(false),
  shareId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
});

export const LanguageCodeSchema = z.enum(['original', 'en', 'ar', 'tr', 'de', 'ru']);

export const SourceSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  type: SourceType,
  language: LanguageCodeSchema.default('original'),
  inputMeta: z.object({
    filename: z.string().optional(),
    url: z.string().optional(),
    pageCount: z.number().optional(),
    imageCount: z.number().optional(),
  }),
  extractedText: z.string().nullable(),
  summary: z.string().nullable(),
  status: SourceStatus,
  generationError: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ── Input schemas ─────────────────────────────────────────────────────────────

const languageField = { language: LanguageCodeSchema.default('original') };

export const CreateSourceTextInput = z.object({
  title: z.string().optional(),
  text: z.string().min(1, 'Text cannot be empty').max(500_000),
  outputs: z.array(OutputType).min(1).default(['flashcards', 'summary']),
  ...languageField,
});

export const CreateSourceYoutubeInput = z.object({
  title: z.string().optional(),
  url: z.string().url(),
  outputs: z.array(OutputType).min(1).default(['flashcards', 'summary']),
  ...languageField,
});

export const CreateSourceUrlInput = z.object({
  title: z.string().optional(),
  url: z.string().url(),
  outputs: z.array(OutputType).min(1).default(['flashcards', 'summary']),
  ...languageField,
});

export const PatchSourceInput = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
});

// ── Inferred types ────────────────────────────────────────────────────────────

export type SourceType = z.infer<typeof SourceType>;
export type SourceStatus = z.infer<typeof SourceStatus>;
export type OutputType = z.infer<typeof OutputType>;
export type ReviewGrade = z.infer<typeof ReviewGrade>;
export type CardSchema = z.infer<typeof CardSchema>;
export type DeckSchema = z.infer<typeof DeckSchema>;
export type SourceSchema = z.infer<typeof SourceSchema>;
export type CreateSourceTextInput = z.infer<typeof CreateSourceTextInput>;
export type CreateSourceYoutubeInput = z.infer<typeof CreateSourceYoutubeInput>;
export type CreateSourceUrlInput = z.infer<typeof CreateSourceUrlInput>;
export type PatchSourceInput = z.infer<typeof PatchSourceInput>;
