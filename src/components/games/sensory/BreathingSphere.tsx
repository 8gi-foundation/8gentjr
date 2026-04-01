"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ── Breathing phases ────────────────────────────────────── */

type Phase = "inhale" | "hold" | "exhale" | "rest";

const PHASES: { name: Phase; duration: number; label: string; color: string }[] = [
  { name: "inhale", duration: 4000, label: "Breathe in...", color: "#81D4FA" },
  { name: "hold",   duration: 4000, label: "Hold...",       color: "#4FC3F7" },
  { name: "exhale", duration: 4000, label: "Breathe out...", color: "#B2DFDB" },
  { name: "rest",   duration: 2000, label: "Rest...",       color: "#C8E6C9" },
];

const SCALE: Record<Phase, number> = {
  inhale: 1,
  hold: 1,
  exhale: 0.5,
  rest: 0.5,
};

/* ── Calming tone ────────────────────────────────────────── */

function playTone(ctx: AudioContext, freq: number, dur: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.08, now + 0.3);
  gain.gain.linearRampToValueAtTime(0, now + dur / 1000);
  osc.start(now);
  osc.stop(now + dur / 1000);
}

/* ── Component ───────────────────────────────────────────── */

export default function BreathingSphere() {
  const [running, setRunning] = useState(false);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const phase = PHASES[phaseIdx];

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  useEffect(() => {
    if (!running) return;

    const tones: Record<Phase, number> = {
      inhale: 396,
      hold: 432,
      exhale: 528,
      rest: 0,
    };
    if (tones[phase.name]) playTone(getCtx(), tones[phase.name], phase.duration);

    const timer = setTimeout(() => {
      setPhaseIdx((prev) => (prev + 1) % PHASES.length);
    }, phase.duration);

    return () => clearTimeout(timer);
  }, [running, phaseIdx, phase, getCtx]);

  const toggle = useCallback(() => {
    if (!running) getCtx(); // init audio on user gesture
    setRunning((r) => !r);
    setPhaseIdx(0);
  }, [running, getCtx]);

  const scale = running ? SCALE[phase.name] : 0.5;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24, padding: 24 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#555" }}>Breathing Sphere</h2>

      <div
        role="img"
        aria-label={running ? phase.label : "Breathing sphere paused"}
        style={{
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, ${phase.color}, ${phase.color}88)`,
          transform: `scale(${scale})`,
          transition: `transform ${phase.duration}ms ease-in-out, background ${phase.duration}ms ease`,
          boxShadow: `0 0 40px ${phase.color}66`,
        }}
      />

      <p
        style={{
          fontSize: 20,
          color: "#666",
          minHeight: 28,
          margin: 0,
          fontWeight: 500,
        }}
      >
        {running ? phase.label : "Tap to start"}
      </p>

      <button
        onClick={toggle}
        style={{
          padding: "10px 32px",
          borderRadius: 20,
          border: "none",
          background: running ? "#EF5350" : "#66BB6A",
          color: "#fff",
          fontSize: 16,
          cursor: "pointer",
        }}
      >
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}
