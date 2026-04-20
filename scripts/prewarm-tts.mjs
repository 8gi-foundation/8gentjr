#!/usr/bin/env node
/**
 * Prewarm Vercel CDN for the 50 supercore AAC words.
 *
 * The /api/tts route returns ElevenLabs audio with
 * `Cache-Control: public, max-age=31536000, immutable`, so every unique
 * (text, voice) becomes a permanent edge-cached object on Vercel's CDN
 * after its first fetch. This script just triggers that first fetch for
 * every word we already know children will tap — so no child anywhere
 * ever pays the ~1s cold ElevenLabs latency.
 *
 * Usage:
 *   PREWARM_URL=https://8gentjr.com node scripts/prewarm-tts.mjs
 *   PREWARM_URL=https://<preview>.vercel.app node scripts/prewarm-tts.mjs
 *
 * Defaults to https://8gentjr.com. Exits non-zero if >10% of fetches fail.
 */

const TARGET = process.env.PREWARM_URL || 'https://8gentjr.com';
const CONCURRENCY = 5;

// Kept in sync with SUPERCORE_50 in src/components/SupercoreGrid.tsx.
// Order is the same permanent order children see on the grid.
const WORDS = [
  'I', 'you', 'want', 'need', 'like', "don't", 'help', 'more', 'stop', 'go',
  'come', 'look', 'eat', 'drink', 'play', 'yes', 'no', 'please', 'thank you', 'sorry',
  'happy', 'sad', 'angry', 'tired', 'hot', 'cold', 'big', 'small', 'up', 'down',
  'in', 'out', 'on', 'off', 'open', 'close', 'give', 'take', 'put', 'make',
  'do', 'have', 'is', 'it', 'that', 'this', 'what', 'where', 'who', 'why',
  // Static intro phrases (non-personalised greetings from the intro row)
  'Nice to meet you!', 'Hello!',
];

async function prewarmOne(text) {
  const url = `${TARGET}/api/tts?text=${encodeURIComponent(text)}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: 'GET' });
    const ms = Date.now() - t0;
    const cache = res.headers.get('x-vercel-cache') || res.headers.get('cf-cache-status') || '?';
    const len = res.headers.get('content-length') || '?';
    return {
      text, ok: res.ok, status: res.status, ms, cache, bytes: len,
    };
  } catch (err) {
    return { text, ok: false, status: 0, ms: Date.now() - t0, error: err.message };
  }
}

async function runPool(items, worker, limit) {
  const results = [];
  const queue = items.slice();
  const workers = Array.from({ length: limit }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) return;
      results.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return results;
}

(async () => {
  console.log(`prewarm-tts → ${TARGET} (${WORDS.length} words, concurrency=${CONCURRENCY})\n`);
  const results = await runPool(WORDS, prewarmOne, CONCURRENCY);

  // Preserve original order in output
  const byText = new Map(results.map((r) => [r.text, r]));
  const ordered = WORDS.map((w) => byText.get(w));

  let ok = 0;
  let fail = 0;
  for (const r of ordered) {
    const mark = r.ok ? 'OK ' : 'ERR';
    const line = `${mark}  ${String(r.status).padStart(3)}  ${String(r.ms).padStart(4)}ms  cache=${r.cache || '-'}  bytes=${r.bytes || '-'}  ${JSON.stringify(r.text)}`;
    console.log(line);
    if (r.ok) ok++; else fail++;
  }

  const total = ordered.length;
  const failPct = (fail / total) * 100;
  console.log(`\n${ok}/${total} ok  (${failPct.toFixed(1)}% failed)`);

  if (failPct > 10) {
    console.error('prewarm-tts: failure rate >10%, exiting non-zero');
    process.exit(1);
  }
})();
