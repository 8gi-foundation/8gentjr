"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ── Note definitions ────────────────────────────────────── */

const NOTES = [
  { freq: 261.63, note: "C",  color: "#FF1744" },
  { freq: 293.66, note: "D",  color: "#FF9100" },
  { freq: 329.63, note: "E",  color: "#FFC400" },
  { freq: 349.23, note: "F",  color: "#76FF03" },
  { freq: 392.0,  note: "G",  color: "#00E5FF" },
  { freq: 440.0,  note: "A",  color: "#2979FF" },
  { freq: 493.88, note: "B",  color: "#651FFF" },
  { freq: 523.25, note: "C",  color: "#FF4081" },
] as const;

/* ── Sound synthesis ─────────────────────────────────────── */

function playXylophoneNote(ctx: AudioContext, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.4, now);
  gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
  osc.start(now);
  osc.stop(now + 0.8);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(freq * 3, now);
  gain2.gain.setValueAtTime(0.08, now);
  gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
  osc2.start(now);
  osc2.stop(now + 0.3);
}

/* ── Component ───────────────────────────────────────────── */

export function XylophoneKeys() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastPlayedRef = useRef<number | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const playNote = useCallback(
    async (index: number) => {
      if (lastPlayedRef.current === index) return;
      lastPlayedRef.current = index;
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        playXylophoneNote(ctx, NOTES[index].freq);
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(15);
        }
        setActiveIndex(index);
        setTimeout(() => setActiveIndex((prev) => (prev === index ? null : prev)), 200);
      } catch (err) {
        console.error("[XylophoneKeys] playback error:", err);
      }
    },
    [getCtx],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const attr =
          el.getAttribute("data-note-index") ??
          (el.closest("[data-note-index]") as HTMLElement | null)?.getAttribute("data-note-index");
        if (attr != null) playNote(parseInt(attr, 10));
      }
    },
    [playNote],
  );

  const handleTouchEnd = useCallback(() => {
    lastPlayedRef.current = null;
  }, []);

  const maxH = 180;
  const minH = 100;

  return (
    <div
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="flex items-end justify-center gap-1.5 px-2 py-4 w-full max-w-[440px] mx-auto touch-none"
    >
      {NOTES.map((note, i) => {
        const active = activeIndex === i;
        const h = maxH - (i / (NOTES.length - 1)) * (maxH - minH);
        return (
          <button
            key={i}
            data-note-index={i}
            onPointerDown={(e) => {
              e.preventDefault();
              playNote(i);
            }}
            className="flex-1 min-w-[48px] border-none rounded-xl cursor-pointer flex flex-col items-center justify-end pb-2.5 font-bold text-sm text-white select-none transition-transform duration-75 ease-out"
            style={{
              height: h,
              backgroundColor: note.color,
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              WebkitTapHighlightColor: "transparent",
              transform: active ? "scaleY(0.93)" : "scaleY(1)",
              boxShadow: active
                ? `0 0 20px ${note.color}, 0 0 40px ${note.color}60`
                : `0 4px 12px ${note.color}30, inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.15)`,
            }}
          >
            {note.note}
          </button>
        );
      })}
    </div>
  );
}
