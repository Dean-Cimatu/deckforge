import { Router, type Router as ExpressRouter } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { CreateSourceTextInput, PatchSourceInput } from '@deckforge/shared';
import type { OutputType } from '@deckforge/shared';
import { requireAuth } from '../middleware/requireAuth.js';
import { generateRateLimit } from '../middleware/rateLimit.js';
import { ingestText } from '../ingest/text.js';
import { ingestPdf } from '../ingest/pdf.js';
import { ingestImage } from '../ingest/image.js';
import { ingestYoutube, IngestError } from '../ingest/youtube.js';
import { ingestUrl } from '../ingest/url.js';
import { ingestImages } from '../ingest/images.js';
import { Source } from '../models/Source.js';
import { Deck } from '../models/Deck.js';
import { Card } from '../models/Card.js';
import { generateArtefacts } from '../ai/generate.js';
import {
  createSource,
  getSource,
  listSources,
  deleteSource,
} from '../services/sourceService.js';

export const sourcesRouter: ExpressRouter = Router();

sourcesRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ── POST /api/sources/text ────────────────────────────────────────────────────

sourcesRouter.post('/text', generateRateLimit, async (req, res, next) => {
  try {
    const body = CreateSourceTextInput.parse(req.body);
    const { title, text } = ingestText({ ...(body.title !== undefined && { title: body.title }), text: body.text });
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const source = await createSource(userId, { title, type: 'text', inputMeta: {} });
    await Source.findByIdAndUpdate(source._id, { extractedText: text });

    generateArtefacts(source._id, text, body.outputs as OutputType[]).catch((err: unknown) => {
      console.error('generateArtefacts failed for source', source._id.toString(), err);
    });

    res.status(201).json({ id: source._id.toString(), status: source.status });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/sources/pdf ─────────────────────────────────────────────────────

sourcesRouter.post(
  '/pdf',
  generateRateLimit,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const title = (req.body as { title?: string }).title;
      const outputs: OutputType[] = parseOutputs(req.body);
      const { title: derivedTitle, text, meta } = await ingestPdf(
        req.file.buffer,
        req.file.originalname,
        title
      );
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const source = await createSource(userId, {
        title: derivedTitle,
        type: 'pdf',
        inputMeta: { filename: req.file.originalname, pageCount: meta.pageCount as number },
      });
      await Source.findByIdAndUpdate(source._id, { extractedText: text });

      generateArtefacts(source._id, text, outputs).catch((err: unknown) => {
        console.error('generateArtefacts failed for source', source._id.toString(), err);
      });

      res.status(201).json({ id: source._id.toString(), status: source.status });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/sources/image ───────────────────────────────────────────────────

sourcesRouter.post(
  '/image',
  generateRateLimit,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const title = (req.body as { title?: string }).title;
      const outputs: OutputType[] = parseOutputs(req.body);
      const { title: derivedTitle, text } = await ingestImage(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname,
        title
      );
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const source = await createSource(userId, {
        title: derivedTitle,
        type: 'image',
        inputMeta: { filename: req.file.originalname },
      });
      await Source.findByIdAndUpdate(source._id, { extractedText: text });

      generateArtefacts(source._id, text, outputs).catch((err: unknown) => {
        console.error('generateArtefacts failed for source', source._id.toString(), err);
      });

      res.status(201).json({ id: source._id.toString(), status: source.status });
    } catch (err) {
      next(err);
    }
  }
);

// ── POST /api/sources/youtube ─────────────────────────────────────────────────

sourcesRouter.post('/youtube', generateRateLimit, async (req, res, next) => {
  try {
    const body = req.body as { title?: string; url?: string; outputs?: unknown };
    if (!body.url || typeof body.url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    const outputs: OutputType[] = parseOutputs(body as Record<string, unknown>);
    const { title, text, meta } = await ingestYoutube({ ...(body.title !== undefined && { title: body.title }), url: body.url });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const source = await createSource(userId, {
      title,
      type: 'youtube',
      inputMeta: { url: body.url, ...(meta as object) },
    });
    await Source.findByIdAndUpdate(source._id, { extractedText: text });

    generateArtefacts(source._id, text, outputs).catch((err: unknown) => {
      console.error('generateArtefacts failed for source', source._id.toString(), err);
    });

    res.status(201).json({ id: source._id.toString(), status: source.status });
  } catch (err) {
    if (err instanceof IngestError) {
      res.status(422).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── POST /api/sources/url ─────────────────────────────────────────────────────

sourcesRouter.post('/url', generateRateLimit, async (req, res, next) => {
  try {
    const body = req.body as { title?: string; url?: string; outputs?: unknown };
    if (!body.url || typeof body.url !== 'string') {
      res.status(400).json({ error: 'url is required' });
      return;
    }
    const outputs: OutputType[] = parseOutputs(body as Record<string, unknown>);
    const { title, text, meta } = await ingestUrl({ ...(body.title !== undefined && { title: body.title }), url: body.url });
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const source = await createSource(userId, {
      title,
      type: 'url',
      inputMeta: { url: body.url, ...(meta as object) },
    });
    await Source.findByIdAndUpdate(source._id, { extractedText: text });

    generateArtefacts(source._id, text, outputs).catch((err: unknown) => {
      console.error('generateArtefacts failed for source', source._id.toString(), err);
    });

    res.status(201).json({ id: source._id.toString(), status: source.status });
  } catch (err) {
    if (err instanceof IngestError) {
      res.status(422).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// ── POST /api/sources/images ──────────────────────────────────────────────────

const imagesUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
});

sourcesRouter.post(
  '/images',
  generateRateLimit,
  imagesUpload.array('files', 10),
  async (req, res, next) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files uploaded' });
        return;
      }
      const title = (req.body as { title?: string }).title;
      const outputs: OutputType[] = parseOutputs(req.body);
      const { title: derivedTitle, text, meta } = await ingestImages(files, title);
      const userId = new mongoose.Types.ObjectId(req.user!.id);
      const source = await createSource(userId, {
        title: derivedTitle,
        type: 'images',
        inputMeta: { imageCount: meta.imageCount as number },
      });
      await Source.findByIdAndUpdate(source._id, { extractedText: text });

      generateArtefacts(source._id, text, outputs).catch((err: unknown) => {
        console.error('generateArtefacts failed for source', source._id.toString(), err);
      });

      res.status(201).json({ id: source._id.toString(), status: source.status });
    } catch (err) {
      next(err);
    }
  }
);

// ── GET /api/sources/:id ──────────────────────────────────────────────────────

sourcesRouter.get('/:id', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const source = await getSource(req.params.id!, userId);
    if (!source) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }

    const deck = await Deck.findOne({ sourceId: source._id });
    const cards = deck ? await Card.find({ deckId: deck._id }) : [];

    res.json({ source, deck: deck ?? null, cards });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/sources ──────────────────────────────────────────────────────────

sourcesRouter.get('/', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const query = req.query as { type?: string; page?: string };
    const { sources, total, page } = await listSources(userId, {
      ...(query.type !== undefined && { type: query.type as import('@deckforge/shared').SourceType }),
      ...(query.page !== undefined && { page: parseInt(query.page, 10) }),
    });
    res.json({ sources, total, page });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/sources/:id ───────────────────────────────────────────────────

sourcesRouter.delete('/:id', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const deleted = await deleteSource(req.params.id!, userId);
    if (!deleted) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/sources/:id ────────────────────────────────────────────────────

sourcesRouter.patch('/:id', async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const body = PatchSourceInput.parse(req.body);
    const source = await Source.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: body },
      { new: true }
    );
    if (!source) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }
    res.json({ source });
  } catch (err) {
    next(err);
  }
});

// ── helpers ───────────────────────────────────────────────────────────────────

function parseOutputs(body: Record<string, unknown>): OutputType[] {
  const raw = body.outputs;
  if (Array.isArray(raw)) return raw as OutputType[];
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) as OutputType[]; } catch { /* fall through */ }
  }
  return ['flashcards', 'summary'];
}
