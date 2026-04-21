import { anthropic, MODEL } from '../ai/client.js';
import type { IngestResult } from './text.js';

const EXTRACTION_PROMPT =
  'Extract all legible text and describe any diagrams from this image. Output plain text, no commentary.';

async function extractImageText(buffer: Buffer, mimeType: string): Promise<string> {
  const base64 = buffer.toString('base64');
  const mediaType = mimeType as 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      },
    ],
  });

  const block = msg.content[0];
  if (block?.type !== 'text') throw new Error('Unexpected response type from Claude vision');
  return block.text.trim();
}

export async function ingestImages(
  files: { buffer: Buffer; mimetype: string; originalname: string }[],
  title?: string
): Promise<IngestResult> {
  const extractions = await Promise.all(
    files.map((f) => extractImageText(f.buffer, f.mimetype))
  );

  const text = extractions
    .map((t, i) => `--- Slide ${i + 1} ---\n\n${t}`)
    .join('\n\n');

  const derivedTitle = title?.trim() || `${files.length} slide images`;

  return {
    title: derivedTitle,
    text,
    meta: { imageCount: files.length },
  };
}
