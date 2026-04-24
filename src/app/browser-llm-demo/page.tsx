'use client';

import { useEffect, useState } from 'react';
import {
  describeCard,
  generateRaw,
  improveSentence,
  onLoadProgress,
  preloadModel,
  suggestNextWords,
  type LoadProgress,
} from '@/lib/browser-llm/client';
import { speak } from '@/lib/tts';

/**
 * Internal smoke test for the hybrid smart-suggestions stack.
 * Not linked from app nav. Visit /browser-llm-demo manually.
 *
 *   - next-word + improve-sentence run on the deterministic rules engine
 *     (instant, no model load, no download).
 *   - card-label extraction uses SmolLM2-135M (~80 MB q4, browser worker).
 */
export default function BrowserLlmDemo() {
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    const off = onLoadProgress((p) => {
      setProgress(p);
      if (p.phase === 'ready') setReady(true);
    });
    return () => {
      off();
    };
  }, []);

  const append = (line: string) => setLog((prev) => [...prev, line]);

  const runRules = () => {
    const t0 = performance.now();
    const words = suggestNextWords('I want to');
    append(`rules next-words (${Math.round(performance.now() - t0)}ms): ${JSON.stringify(words)}`);

    const t1 = performance.now();
    const improved = improveSentence('me go park');
    append(`rules improve (${Math.round(performance.now() - t1)}ms): ${improved}`);
  };

  const doLoad = async () => {
    append('→ preloadModel() (for card-label only)');
    try {
      await preloadModel();
      append('✓ 135M ready');
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runCard = async () => {
    setBusy(true);
    try {
      await preloadModel();
      const t0 = performance.now();
      const card = await describeCard('swimming at the pool with dad');
      append(`135M card (${Math.round(performance.now() - t0)}ms): ${JSON.stringify(card)}`);
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runFullFlow = async () => {
    setBusy(true);
    try {
      const speech = 'swimming at the pool with dad';
      append(`→ full flow: "${speech}"`);
      const t0 = performance.now();
      const card = await describeCard(speech);
      append(`label (${Math.round(performance.now() - t0)}ms): ${JSON.stringify(card)}`);
      if (card) {
        const t1 = performance.now();
        const engine = await speak({ text: card.label });
        append(`spoken via ${engine} (${Math.round(performance.now() - t1)}ms)`);
      }
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  const runRaw = async () => {
    setBusy(true);
    try {
      append('→ raw: card label');
      const out = await generateRaw(
        'Extract one short label (1-2 words) for an AAC card from: "swimming at the pool"\nLabel:',
        16,
        0.1
      );
      append(`raw: ${JSON.stringify(out)}`);
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto text-sm" style={{ fontFamily: 'ui-monospace, monospace' }}>
      <h1 className="text-xl font-bold mb-2">Smart Suggestions — hybrid stack</h1>
      <p className="mb-4 text-gray-600">
        Rules-based next-word + improve (instant). SmolLM2-135M (~80 MB) for card-label
        extraction only. First model load pulls weights; subsequent loads come from the cache.
      </p>

      <div className="space-y-2 mb-4">
        <div>135M status: {ready ? 'ready' : progress?.phase ?? 'idle'}</div>
        {progress?.phase === 'download' && progress.total && progress.loaded != null && (
          <div>
            download: {Math.round((progress.loaded / progress.total) * 100)}% — {progress.file ?? ''}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={runRules}
          disabled={busy}
          className="px-4 py-2 rounded bg-emerald-700 text-white disabled:opacity-50"
        >
          Run rules (no model)
        </button>
        <button
          onClick={doLoad}
          disabled={busy}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          Load 135M
        </button>
        <button
          onClick={runCard}
          disabled={busy}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        >
          Describe card (135M)
        </button>
        <button
          onClick={runRaw}
          disabled={busy}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
        >
          Raw model output
        </button>
        <button
          onClick={runFullFlow}
          disabled={busy}
          className="px-4 py-2 rounded bg-fuchsia-700 text-white disabled:opacity-50"
        >
          Full flow (describe + speak)
        </button>
      </div>

      <pre className="p-3 bg-gray-100 rounded whitespace-pre-wrap min-h-[200px]">
        {log.length === 0 ? '(no output yet)' : log.join('\n')}
      </pre>
    </main>
  );
}
