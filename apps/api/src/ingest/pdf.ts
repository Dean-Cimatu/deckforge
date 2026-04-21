import { PDFParse } from 'pdf-parse';
import type { IngestResult } from './text.js';

export async function ingestPdf(
  buffer: Buffer,
  originalName: string,
  title?: string
): Promise<IngestResult> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const [textResult, infoResult] = await Promise.all([
    parser.getText(),
    parser.getInfo(),
  ]);

  const derivedTitle = title?.trim() || originalName.replace(/\.pdf$/i, '') || 'Untitled PDF';

  return {
    title: derivedTitle,
    text: textResult.text,
    meta: { pageCount: infoResult.total },
  };
}
