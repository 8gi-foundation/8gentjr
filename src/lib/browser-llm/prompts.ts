/**
 * Task prompts for SmolLM2-135M. Only card-label extraction uses the model —
 * next-word and sentence improvement run on the deterministic rules engine.
 */

export function cardLabelPrompt(speech: string): string {
  return [
    `Extract one short label (1-3 words) for an AAC card from: "${speech}"`,
    'Label:',
  ].join('\n');
}
