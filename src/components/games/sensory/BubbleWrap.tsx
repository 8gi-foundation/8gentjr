"use client";

import { useState, useCallback, useRef } from "react";

/* ── Bubble grid ─────────────────────────────────────────── */

const ROWS = 6;
const COLS = 5;
const TOTAL = ROWS * COLS;

function makeBubbles() {
  return Array.from({ length: TOTAL }, (_, i) => ({
    id: i,
    popped: false,
  }));
}

const PASTEL = [
  "#A8E6CF", "#DCEDC1", "#FFD3B6", "#FFAAA5",
  "#FF8B94", "#B5EAD7", "#C7CEEA", "#E2F0CB",
];

/* ── Pop sound via Web Audio ─────────────────────────────── */

function playPop(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600 + Math.random() * 400, now);
  osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
  gain.gain.setValueAtTime(0.3, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
  osc.start(now);
  osc.stop(now + 0.12);
}

/* ── Component ───────────────────────────────────────────── */

export default function BubbleWrap() {
  const [bubbles, setBubbles] = useState(makeBubbles);
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const pop = useCallback(
    (id: number) => {
      playPop(getCtx());
      setBubbles((prev) =>
        prev.map((b) => (b.id === id ? { ...b, popped: true } : b))
      );
    },
    [getCtx]
  );

  const reset = useCallback(() => setBubbles(makeBubbles()), []);

  const allPopped = bubbles.every((b) => b.popped);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="m-0 text-[22px] text-gray-600">Bubble Wrap</h2>
      <p className="m-0 text-sm text-gray-400">Tap to pop!</p>

      <div className="grid grid-cols-5 gap-2 max-w-[320px]">
        {bubbles.map((b) => (
          <button
            key={b.id}
            onClick={() => !b.popped && pop(b.id)}
            aria-label={b.popped ? "Popped bubble" : "Pop this bubble"}
            className="w-14 h-14 rounded-full border-none transition-all duration-150 ease-out"
            style={{
              cursor: b.popped ? "default" : "pointer",
              background: b.popped ? "#e0e0e0" : PASTEL[b.id % PASTEL.length],
              boxShadow: b.popped
                ? "inset 0 2px 6px rgba(0,0,0,0.15)"
                : "0 3px 8px rgba(0,0,0,0.12), inset 0 -2px 4px rgba(255,255,255,0.6)",
              transform: b.popped ? "scale(0.85)" : "scale(1)",
              opacity: b.popped ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {allPopped && (
        <button
          onClick={reset}
          className="mt-2 px-7 py-2.5 rounded-[20px] border-none bg-[#7C4DFF] text-white text-base cursor-pointer"
        >
          New Sheet
        </button>
      )}
    </div>
  );
}
