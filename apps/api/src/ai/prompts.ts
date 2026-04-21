export const SUMMARY_PROMPT = `You are generating a study summary of the following content. Output clean markdown with:
  - A one-paragraph TL;DR at the top
  - A "Key Concepts" section, each concept as a ### subheading with 1–3 sentences of explanation
  - An "Important Details" section with bullet points
  - A "Review Questions" section with 3–5 questions at the end
Do not include preamble. Start directly with the TL;DR.`;

export const FLASHCARDS_PROMPT = `You are generating flashcards from the following content. Output a strict JSON array of {"front":string,"back":string} objects. Front is a question or term. Back is a concise answer, 1–3 sentences maximum. Generate 10–20 cards depending on content density. Do not include preamble. Do not wrap in markdown fences. Output only the JSON array.`;
