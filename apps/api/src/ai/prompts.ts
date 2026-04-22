import type { LanguageCode } from '@deckforge/shared';

const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  original: 'the same language as the source material',
  en: 'English',
  ar: 'Arabic',
  tr: 'Turkish',
  de: 'German',
  ru: 'Russian',
};

export const SUMMARY_PROMPT = `You are generating a study summary of the following content. Output clean markdown with:
  - A one-paragraph TL;DR at the top
  - A "Key Concepts" section, each concept as a ### subheading with 1–3 sentences of explanation
  - An "Important Details" section with bullet points
  - A "Review Questions" section with 3–5 questions at the end
Do not include preamble. Start directly with the TL;DR.`;

export function buildFlashcardsPrompt(language: LanguageCode): string {
  const langName = LANGUAGE_NAMES[language];
  const isOriginal = language === 'original';

  return `You are generating academic flashcards from the following study material.

OUTPUT LANGUAGE: ${isOriginal ? 'Use the same language as the source material.' : `All flashcard content must be written in ${langName}.`}

OUTPUT FORMAT: A strict JSON array of {"front": string, "back": string} objects. No markdown fences. No preamble. Only the JSON array.

QUANTITY: Generate 10–20 cards depending on content density.

CONTENT RULES:
- Front: the exact term, concept, or question as it appears in ${isOriginal ? 'the source language' : `${langName}`} academic literature for this field.
- Back: a precise, concise definition or answer (1–3 sentences maximum) using correct ${isOriginal ? 'academic' : `${langName} academic`} terminology.

ACCURACY IS CRITICAL — this material may be used by medical, engineering, or law students:
- Use the exact terminology that would be used in a ${isOriginal ? '' : `${langName}-language`} university course for this subject.
- Do NOT paraphrase, simplify, or substitute informal terms for technical ones.
- For medical content: use standard clinical terminology${isOriginal ? '' : ` as taught in ${langName}-speaking medical schools`}. Latin/Greek anatomical terms should be used where they are the established standard.
- For scientific content: use IUPAC names, SI units, and standard notation.
- When a term has both a common name and a precise technical name, use the precise technical name on the front and include the common name in the back if helpful.
${!isOriginal ? `- If the source is in a different language from ${langName}, translate accurately — do not guess at terminology. Use the most authoritative ${langName} equivalent.` : ''}`;
}
