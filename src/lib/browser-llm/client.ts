'use client';

/**
 * Main-thread facade for the on-device smart-suggestions layer.
 *
 * Hybrid design:
 *   - suggestNextWords / improveSentence → deterministic rules engine in
 *     src/lib/sentence-engine.ts. Instant, no model call, no download.
 *   - describeCard → SmolLM2-135M in a web worker. The only task where
 *     rules can't extract meaning from free-form speech.
 *
 * We kept the bar at 135M (~80 MB q4). Anything larger belongs in a native
 * wrapper with Apple Foundation Model / Gemini Nano — not in the browser.
 *
 * The worker is singleton and lazy — card-label extraction pays the load
 * cost the first time it's called, not on page load.
 */

import {
  improveSentence as rulesImproveSentence,
  suggestNextWord as rulesSuggestNextWord,
} from '@/lib/sentence-engine';
import { cardLabelPrompt, extractJson } from './prompts';

export type LoadProgress = {
  phase: 'download' | 'init' | 'ready';
  file?: string;
  loaded?: number;
  total?: number;
};

type ResolveFn = (text: string) => void;
type RejectFn = (err: Error) => void;

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
const pending = new Map<string, { resolve: ResolveFn; reject: RejectFn }>();
const progressListeners = new Set<(p: LoadProgress) => void>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL('../../workers/smollm.worker.ts', import.meta.url), {
    type: 'module',
  });
  worker.addEventListener('message', (event: MessageEvent) => {
    const msg = event.data;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'progress') {
      progressListeners.forEach((fn) => fn(msg));
    } else if (msg.type === 'ready') {
      progressListeners.forEach((fn) => fn({ phase: 'ready' }));
    } else if (msg.type === 'result') {
      const entry = pending.get(msg.id);
      if (entry) {
        pending.delete(msg.id);
        entry.resolve(msg.text);
      }
    } else if (msg.type === 'error') {
      if (msg.id) {
        const entry = pending.get(msg.id);
        if (entry) {
          pending.delete(msg.id);
          entry.reject(new Error(msg.message));
        }
      } else {
        pending.forEach((entry) => entry.reject(new Error(msg.message)));
        pending.clear();
      }
    }
  });
  return worker;
}

export function onLoadProgress(fn: (p: LoadProgress) => void): () => void {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

export function preloadModel(): Promise<void> {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    const w = getWorker();
    const off = onLoadProgress((p) => {
      if (p.phase === 'ready') {
        off();
        resolve();
      }
    });
    const errListener = (event: MessageEvent) => {
      if (event.data?.type === 'error' && !event.data.id) {
        w.removeEventListener('message', errListener);
        off();
        reject(new Error(event.data.message));
      }
    };
    w.addEventListener('message', errListener);
    w.postMessage({ type: 'load' });
  });
  return readyPromise;
}

let seq = 0;
function nextId(): string {
  seq += 1;
  return `g${seq}`;
}

async function generate(prompt: string, maxNewTokens: number, temperature: number): Promise<string> {
  const w = getWorker();
  const id = nextId();
  return new Promise<string>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'generate', id, prompt, maxNewTokens, temperature });
  });
}

export async function generateRaw(
  prompt: string,
  maxNewTokens = 96,
  temperature = 0.2
): Promise<string> {
  await preloadModel();
  return generate(prompt, maxNewTokens, temperature);
}

function tokenize(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ''))
    .filter(Boolean);
}

export function suggestNextWords(sentenceSoFar: string): string[] {
  return rulesSuggestNextWord(tokenize(sentenceSoFar)).slice(0, 3);
}

export function improveSentence(raw: string): string {
  return rulesImproveSentence(tokenize(raw));
}

export async function describeCard(
  speech: string
): Promise<{ label: string; category: string } | null> {
  const out = await generate(cardLabelPrompt(speech), 64, 0.1);
  const parsed = extractJson<{ label?: string; category?: string }>(out);
  if (!parsed?.label || !parsed?.category) return null;
  return { label: parsed.label, category: parsed.category };
}
