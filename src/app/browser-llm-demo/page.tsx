'use client';

import { useEffect, useState } from 'react';
import {
  describeCard,
  improveSentence,
  onLoadProgress,
  preloadModel,
  suggestNextWords,
  type LoadProgress,
} from '@/lib/browser-llm/client';

/**
 * Internal smoke test for the SmolLM2-135M browser-inference spike.
 * Not linked from the app nav. Visit /browser-llm-demo manually.
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

  const doLoad = async () => {
    append('→ preloadModel()');
    try {
      await preloadModel();
      append('✓ ready');
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const runAll = async () => {
    setBusy(true);
    try {
      await preloadModel();
      const t0 = performance.now();
      const words = await suggestNextWords('I want to', 'feeling');
      append(`next-words (${Math.round(performance.now() - t0)}ms): ${JSON.stringify(words)}`);

      const t1 = performance.now();
      const improved = await improveSentence('me go park');
      append(`improve (${Math.round(performance.now() - t1)}ms): ${improved ?? '(null)'}`);

      const t2 = performance.now();
      const card = await describeCard('swimming at the pool with dad');
      append(`card (${Math.round(performance.now() - t2)}ms): ${JSON.stringify(card)}`);
    } catch (err) {
      append(`✗ ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto text-sm" style={{ fontFamily: 'ui-monospace, monospace' }}>
      <h1 className="text-xl font-bold mb-2">Browser LLM Spike — SmolLM2-135M</h1>
      <p className="mb-4 text-gray-600">
        Internal smoke test. First load downloads ~80 MB. Subsequent loads read from the browser cache.
      </p>

      <div className="space-y-2 mb-4">
        <div>status: {ready ? 'ready' : progress?.phase ?? 'idle'}</div>
        {progress?.phase === 'download' && progress.total && progress.loaded != null && (
          <div>
            download: {Math.round((progress.loaded / progress.total) * 100)}% — {progress.file ?? ''}
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={doLoad}
          disabled={busy}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          Load model
        </button>
        <button
          onClick={runAll}
          disabled={busy}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50"
        >
          Run all 3 tasks
        </button>
      </div>

      <pre className="p-3 bg-gray-100 rounded whitespace-pre-wrap min-h-[200px]">
        {log.length === 0 ? '(no output yet)' : log.join('\n')}
      </pre>
    </main>
  );
}
