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
    <div className="flex flex-col items-center gap-6 p-6">
      <h2 className="m-0 text-[22px] text-gray-600">Breathing Sphere</h2>

      <div
        role="img"
        aria-label={running ? phase.label : "Breathing sphere paused"}
        className="w-[180px] h-[180px] rounded-full"
        style={{
          background: `radial-gradient(circle at 40% 40%, ${phase.color}, ${phase.color}88)`,
          transform: `scale(${scale})`,
          transition: `transform ${phase.duration}ms ease-in-out, background ${phase.duration}ms ease`,
          boxShadow: `0 0 40px ${phase.color}66`,
        }}
      />

      <p className="text-xl text-gray-500 min-h-[28px] m-0 font-medium">
        {running ? phase.label : "Tap to start"}
      </p>

      <button
        onClick={toggle}
        className={`px-8 py-2.5 rounded-[20px] border-none text-white text-base cursor-pointer ${
          running ? "bg-red-500" : "bg-green-500"
        }`}
      >
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}
