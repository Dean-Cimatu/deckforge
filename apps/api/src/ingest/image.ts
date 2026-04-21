import { anthropic, MODEL } from '../ai/client.js';
import type { IngestResult } from './text.js';

const EXTRACTION_PROMPT =
  'Extract all legible text and describe any diagrams from this image. Output plain text, no commentary.';

export async function ingestImage(
  buffer: Buffer,
  mimeType: string,
  originalName: string,
  title?: string
): Promise<IngestResult> {
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

  const derivedTitle = title?.trim() || originalName.replace(/\.[^.]+$/, '') || 'Untitled image';
  return {
    title: derivedTitle,
    text: block.text.trim(),
    meta: {},
  };
}
