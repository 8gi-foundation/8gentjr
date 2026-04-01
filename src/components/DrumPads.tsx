"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ── Pad definitions ─────────────────────────────────────── */

const PADS = [
  { id: 0, label: "Kick",   color: "#FF1744" },
  { id: 1, label: "Snare",  color: "#FF9100" },
  { id: 2, label: "Hi-Hat", color: "#FFC400" },
  { id: 3, label: "Tom 1",  color: "#76FF03" },
  { id: 4, label: "Tom 2",  color: "#00E5FF" },
  { id: 5, label: "Crash",  color: "#2979FF" },
  { id: 6, label: "Clap",   color: "#D500F9" },
  { id: 7, label: "Rim",    color: "#FF4081" },
] as const;

type PadId = (typeof PADS)[number]["id"];

/* ── Sound synthesis ─────────────────────────────────────── */

function playDrumSound(ctx: AudioContext, padId: PadId) {
  const now = ctx.currentTime;

  switch (padId) {
    case 0: { // Kick
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
      gain.gain.setValueAtTime(0.8, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case 1: { // Snare
      const bufSize = ctx.sampleRate * 0.15;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.2));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = 1000;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(0.6, now);
      nGain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      noise.connect(filt);
      filt.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      // Tonal body
      const osc = ctx.createOscillator();
      const oGain = ctx.createGain();
      osc.connect(oGain);
      oGain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
      oGain.gain.setValueAtTime(0.5, now);
      oGain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }
    case 2: { // Hi-Hat
      const bufSize = ctx.sampleRate * 0.05;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = 6000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      noise.connect(filt);
      filt.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      break;
    }
    case 3: { // Tom 1
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
      break;
    }
    case 4: { // Tom 2
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.2);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case 5: { // Crash
      const bufSize = ctx.sampleRate * 0.6;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.35));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "highpass";
      filt.frequency.value = 3000;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      noise.connect(filt);
      filt.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      break;
    }
    case 6: { // Clap
      for (let burst = 0; burst < 3; burst++) {
        const offset = burst * 0.015;
        const bufSize = ctx.sampleRate * 0.04;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filt = ctx.createBiquadFilter();
        filt.type = "bandpass";
        filt.frequency.value = 2000;
        filt.Q.value = 2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.08);
        noise.connect(filt);
        filt.connect(gain);
        gain.connect(ctx.destination);
        noise.start(now + offset);
      }
      break;
    }
    case 7: { // Rim
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;
    }
  }
}

/* ── Component ───────────────────────────────────────────── */

export function DrumPads() {
  const [activePads, setActivePads] = useState<Set<PadId>>(new Set());
  const audioCtxRef = useRef<AudioContext | null>(null);

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

  const hitPad = useCallback(
    async (pad: (typeof PADS)[number]) => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") await ctx.resume();
        playDrumSound(ctx, pad.id);

        // Haptic feedback
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(30);
        }

        // Visual flash
        setActivePads((prev) => new Set(prev).add(pad.id));
        setTimeout(() => {
          setActivePads((prev) => {
            const next = new Set(prev);
            next.delete(pad.id);
            return next;
          });
        }, 150);
      } catch (err) {
        console.error("[DrumPads] playback error:", err);
      }
    },
    [getCtx],
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 10,
        padding: 10,
        width: "100%",
        maxWidth: 400,
        margin: "0 auto",
        touchAction: "none",
      }}
    >
      {PADS.map((pad) => {
        const active = activePads.has(pad.id);
        return (
          <button
            key={pad.id}
            data-pad-id={pad.id}
            onPointerDown={(e) => {
              e.preventDefault();
              hitPad(pad);
            }}
            style={{
              minWidth: 60,
              minHeight: 60,
              aspectRatio: "1",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              color: "#fff",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              backgroundColor: pad.color,
              transform: active ? "scale(0.9)" : "scale(1)",
              boxShadow: active
                ? `0 0 20px ${pad.color}, 0 0 40px ${pad.color}80, inset 0 0 20px rgba(255,255,255,0.3)`
                : `0 4px 12px ${pad.color}40, inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.15)`,
              transition: "transform 0.08s ease, box-shadow 0.08s ease",
            }}
          >
            {pad.label}
          </button>
        );
      })}
    </div>
  );
}
