/// <reference lib="webworker" />
/**
 * SmolLM2-135M browser-inference worker.
 *
 * Runs entirely on-device via @huggingface/transformers (WASM/WebGPU).
 * Model: HuggingFaceTB/SmolLM2-135M-Instruct (~80 MB q4).
 *
 * No data leaves the device. No network after model download.
 */

import {
  pipeline,
  env,
  type TextGenerationPipeline,
  type ProgressInfo,
} from '@huggingface/transformers';

// Prefer local cached weights; the browser's Cache API persists across sessions.
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.useBrowserCache = true;

const MODEL_ID = 'HuggingFaceTB/SmolLM2-135M-Instruct';

type InboundMessage =
  | { type: 'load' }
  | { type: 'generate'; id: string; prompt: string; maxNewTokens?: number; temperature?: number };

type OutboundMessage =
  | { type: 'progress'; phase: 'download' | 'init'; file?: string; loaded?: number; total?: number }
  | { type: 'ready' }
  | { type: 'result'; id: string; text: string; ms: number }
  | { type: 'error'; id?: string; message: string };

let generator: TextGenerationPipeline | null = null;
let loading: Promise<TextGenerationPipeline> | null = null;

function post(msg: OutboundMessage) {
  (self as unknown as Worker).postMessage(msg);
}

async function loadModel(): Promise<TextGenerationPipeline> {
  if (generator) return generator;
  if (loading) return loading;

  loading = (async () => {
    const pipe = (await pipeline('text-generation', MODEL_ID, {
      dtype: 'q4',
      progress_callback: (p: ProgressInfo) => {
        if (p.status === 'progress' && 'file' in p) {
          post({
            type: 'progress',
            phase: 'download',
            file: p.file,
            loaded: 'loaded' in p ? (p.loaded as number) : undefined,
            total: 'total' in p ? (p.total as number) : undefined,
          });
        } else if (p.status === 'ready') {
          post({ type: 'progress', phase: 'init' });
        }
      },
    })) as TextGenerationPipeline;
    generator = pipe;
    post({ type: 'ready' });
    return pipe;
  })();

  return loading;
}

async function generate(id: string, prompt: string, maxNewTokens = 128, temperature = 0.2) {
  const pipe = await loadModel();
  const t0 = performance.now();
  const messages = [{ role: 'user', content: prompt }];
  const out = await pipe(messages, {
    max_new_tokens: maxNewTokens,
    temperature,
    do_sample: temperature > 0,
    return_full_text: false,
  });

  let text = '';
  const first = Array.isArray(out) ? out[0] : out;
  if (first && typeof first === 'object' && 'generated_text' in first) {
    const gt = (first as { generated_text: unknown }).generated_text;
    if (typeof gt === 'string') {
      text = gt;
    } else if (Array.isArray(gt)) {
      const last = gt[gt.length - 1];
      if (last && typeof last === 'object' && 'content' in last) {
        text = String((last as { content: unknown }).content ?? '');
      }
    }
  }

  post({ type: 'result', id, text: text.trim(), ms: Math.round(performance.now() - t0) });
}

self.addEventListener('message', (event: MessageEvent<InboundMessage>) => {
  const msg = event.data;
  if (msg.type === 'load') {
    loadModel().catch((err: unknown) => {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
    });
    return;
  }
  if (msg.type === 'generate') {
    generate(msg.id, msg.prompt, msg.maxNewTokens, msg.temperature).catch((err: unknown) => {
      post({ type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) });
    });
  }
});

export {};
