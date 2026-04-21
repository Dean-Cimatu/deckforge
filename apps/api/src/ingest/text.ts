export interface IngestResult {
  title: string;
  text: string;
  meta: Record<string, unknown>;
}

export function ingestText(input: { title?: string; text: string }): IngestResult {
  return {
    title: input.title?.trim() || 'Untitled text',
    text: input.text,
    meta: {},
  };
}
