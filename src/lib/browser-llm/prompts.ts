/**
 * Task prompts for SmolLM2-135M. Narrow, structured, JSON-constrained —
 * the model is tiny so we keep the cognitive load small.
 */

export function nextWordPrompt(sentenceSoFar: string, categoryHint?: string): string {
  return [
    'You help a child build a short sentence on an AAC board.',
    'Return ONLY a JSON array of 3 single-word suggestions. No prose.',
    `Sentence so far: "${sentenceSoFar}"`,
    categoryHint ? `Category hint: ${categoryHint}` : '',
    'Example: ["happy","tired","hungry"]',
  ]
    .filter(Boolean)
    .join('\n');
}

export function improveSentencePrompt(raw: string): string {
  return [
    'Rewrite this child\'s AAC sentence as clear, natural English.',
    'Keep meaning identical. Keep it under 12 words. No new ideas.',
    'Return ONLY a JSON object: {"improved":"..."}',
    `Input: "${raw}"`,
  ].join('\n');
}

export function cardLabelPrompt(speech: string): string {
  return [
    'A parent spoke a request for a new AAC symbol card.',
    'Extract a short label and category.',
    'Categories: pronoun|verb|noun|adjective|preposition|question|negation|social',
    'Return ONLY a JSON object: {"label":"...","category":"..."}',
    `Speech: "${speech}"`,
  ].join('\n');
}

export function extractJson<T>(text: string): T | null {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  const first = cleaned.indexOf('{');
  const firstArr = cleaned.indexOf('[');
  const start =
    first === -1 ? firstArr : firstArr === -1 ? first : Math.min(first, firstArr);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
