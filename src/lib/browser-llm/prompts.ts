/**
 * Task prompts for SmolLM2-135M. Only card-label extraction uses the model —
 * next-word and sentence improvement run on the deterministic rules engine.
 */

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
