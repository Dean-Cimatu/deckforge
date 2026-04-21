import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { IngestError } from './youtube.js';
import type { IngestResult } from './text.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT_MS = 10_000;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

// Private IP ranges for SSRF guard
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
];

function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;
  return PRIVATE_RANGES.some((re) => re.test(hostname));
}

export async function ingestUrl(input: { title?: string; url: string }): Promise<IngestResult> {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new IngestError('Invalid URL.');
  }

  if (isPrivateHostname(parsed.hostname)) {
    throw new IngestError('That URL points to a private network address and cannot be fetched.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(input.url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new IngestError(`Could not fetch URL: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new IngestError('URL does not appear to be an HTML page.');
    }

    // Read up to MAX_BYTES
    const reader = res.body?.getReader();
    if (!reader) throw new IngestError('Could not read response body.');

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }

    html = new TextDecoder().decode(
      chunks.reduce((acc, c) => {
        const merged = new Uint8Array(acc.length + c.length);
        merged.set(acc); merged.set(c, acc.length);
        return merged;
      }, new Uint8Array(0))
    );
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof IngestError) throw err;
    const msg = (err as Error).message ?? '';
    if (msg.includes('aborted') || msg.includes('timeout')) {
      throw new IngestError('Request timed out fetching that URL.');
    }
    throw new IngestError('Failed to fetch URL. The site may be blocking automated requests.');
  }

  const dom = new JSDOM(html, { url: input.url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || (article.textContent?.trim().length ?? 0) < 200) {
    throw new IngestError(
      'Could not extract readable content. Try pasting the text directly.'
    );
  }

  return {
    title: article.title || input.title?.trim() || parsed.hostname,
    text: article.textContent ?? '',
    meta: {
      url: input.url,
      ...(article.byline ? { byline: article.byline } : {}),
      ...(article.siteName ? { siteName: article.siteName } : {}),
    },
  };
}
