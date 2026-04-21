import {
  YoutubeTranscript,
  YoutubeTranscriptDisabledError,
  YoutubeTranscriptNotAvailableError,
  YoutubeTranscriptNotAvailableLanguageError,
} from 'youtube-transcript';
import type { IngestResult } from './text.js';

export class IngestError extends Error {
  status = 422;
  constructor(message: string) {
    super(message);
    this.name = 'IngestError';
  }
}

const VIDEO_ID_RE = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;

function extractVideoId(url: string): string | null {
  const m = VIDEO_ID_RE.exec(url);
  return m?.[1] ?? null;
}

export async function ingestYoutube(input: { title?: string; url: string }): Promise<IngestResult> {
  const videoId = extractVideoId(input.url);
  if (!videoId) {
    throw new IngestError('Invalid YouTube URL. Use youtube.com/watch?v= or youtu.be/ format.');
  }

  let segments;
  try {
    // Try English first, then fall back to any language
    try {
      segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' });
    } catch (err) {
      if (err instanceof YoutubeTranscriptNotAvailableLanguageError) {
        segments = await YoutubeTranscript.fetchTranscript(videoId);
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (
      err instanceof YoutubeTranscriptDisabledError ||
      err instanceof YoutubeTranscriptNotAvailableError
    ) {
      throw new IngestError('This video has no captions. Try a different video.');
    }
    throw err;
  }

  if (!segments || segments.length === 0) {
    throw new IngestError('This video has no captions. Try a different video.');
  }

  const text = segments.map((s) => s.text).join(' ');
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0);
  const title = input.title?.trim() || `YouTube video ${videoId}`;

  return {
    title,
    text,
    meta: { videoId, duration: Math.round(totalDuration) },
  };
}
