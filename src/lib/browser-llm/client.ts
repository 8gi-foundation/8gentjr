'use client';

/**
 * Main-thread facade for the SmolLM2 web worker.
 *
 * Singleton — keeps the model warm for the lifetime of the tab so we don't
 * pay the re-init cost on each request. Safe to import from any client
 * component; the worker is lazy-created on first use.
 */

import {
  cardLabelPrompt,
  extractJson,
  improveSentencePrompt,
  nextWordPrompt,
} from './prompts';

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
        // Load error — reject everyone in flight
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

export async function suggestNextWords(
  sentenceSoFar: string,
  categoryHint?: string
): Promise<string[]> {
  const raw = await generate(nextWordPrompt(sentenceSoFar, categoryHint), 48, 0.3);
  const parsed = extractJson<unknown[]>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((w): w is string => typeof w === 'string').slice(0, 3);
}

export async function improveSentence(raw: string): Promise<string | null> {
  const out = await generate(improveSentencePrompt(raw), 64, 0.2);
  const parsed = extractJson<{ improved?: string }>(out);
  return parsed?.improved ?? null;
}

export async function describeCard(
  speech: string
): Promise<{ label: string; category: string } | null> {
  const out = await generate(cardLabelPrompt(speech), 64, 0.1);
  const parsed = extractJson<{ label?: string; category?: string }>(out);
  if (!parsed?.label || !parsed?.category) return null;
  return { label: parsed.label, category: parsed.category };
}
