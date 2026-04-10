"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ── Chladni modes — note colors map to visible light spectrum ── */

const MODES = [
  { n: 1, m: 2, note: "C", freq: 130.81, label: "Cross",   color: "#FF3333" },
  { n: 2, m: 3, note: "D", freq: 146.83, label: "Diamond", color: "#FF8C00" },
  { n: 3, m: 5, note: "E", freq: 164.81, label: "Star",    color: "#FFD700" },
  { n: 1, m: 4, note: "F", freq: 174.61, label: "Lines",   color: "#00CC66" },
  { n: 4, m: 5, note: "G", freq: 196.0,  label: "Web",     color: "#00BFFF" },
  { n: 2, m: 5, note: "A", freq: 220.0,  label: "Flower",  color: "#8B5CF6" },
] as const;

/* ── Ambient noise presets ──────────────────────────────────── */

const AMBIENT = [
  { id: "rain",  label: "Rain",  filterType: "highpass" as BiquadFilterType, freq: 3000, q: 1.0,  vol: 0.04 },
  { id: "river", label: "River", filterType: "bandpass" as BiquadFilterType, freq: 800,  q: 0.5,  vol: 0.04 },
  { id: "ocean", label: "Ocean", filterType: "lowpass"  as BiquadFilterType, freq: 400,  q: 0.7,  vol: 0.06 },
  { id: "pink",  label: "Pink",  filterType: "lowpass"  as BiquadFilterType, freq: 4000, q: 0.1,  vol: 0.03 },
  { id: "white", label: "White", filterType: "allpass"  as BiquadFilterType, freq: 1000, q: 0.1,  vol: 0.025 },
] as const;

const PARTICLE_COUNT = 3000;
const FORCE = 0.00002;
const DAMPING = 0.95;
const NOISE_PHYSICS = 0.00005;

/* ── Particle type ──────────────────────────────────────── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
}

/* ── Chladni equation for a vibrating square plate ─────── */

function chladni(x: number, y: number, n: number, m: number): number {
  return (
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
  );
}

function chladniGrad(
  x: number,
  y: number,
  n: number,
  m: number,
): [number, number] {
  const np = n * Math.PI;
  const mp = m * Math.PI;
  return [
    -np * Math.sin(np * x) * Math.cos(mp * y) +
      mp * Math.sin(mp * x) * Math.cos(np * y),
    -mp * Math.cos(np * x) * Math.sin(mp * y) +
      np * Math.cos(mp * x) * Math.sin(np * y),
  ];
}

/* ── Helpers ────────────────────────────────────────────── */

function makeParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    vx: 0,
    vy: 0,
    r: 0.6 + Math.random() * 1.0,
    a: 0.35 + Math.random() * 0.55,
  }));
}

function scatter(particles: Particle[]) {
  for (const p of particles) {
    p.x = Math.random();
    p.y = Math.random();
    p.vx = (Math.random() - 0.5) * 0.002;
    p.vy = (Math.random() - 0.5) * 0.002;
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ── Component ──────────────────────────────────────────── */

export function ChladniVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef(makeParticles());
  const animId = useRef(0);
  const hueRef = useRef(280);
  const volRef = useRef(0.5);

  /* Audio refs */
  const audioCtx = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const oscNodes = useRef<OscillatorNode[]>([]);
  const noiseNodes = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const noiseBuf = useRef<AudioBuffer | null>(null);
  const mode = useRef<{ n: number; m: number } | null>(null);

  /* UI state */
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeAmbient, setActiveAmbient] = useState<string | null>(null);
  const [hue, setHue] = useState(280);
  const [volume, setVolume] = useState(50);

  useEffect(() => { hueRef.current = hue; }, [hue]);
  useEffect(() => {
    const v = volume / 100;
    volRef.current = v;
    if (masterGain.current) masterGain.current.gain.value = v;
  }, [volume]);

  /* ── Audio setup ─────────────────────────────────────── */

  const getAudio = useCallback(() => {
    if (!audioCtx.current || audioCtx.current.state === "closed") {
      audioCtx.current = new AudioContext();
      masterGain.current = audioCtx.current.createGain();
      masterGain.current.gain.value = volRef.current;
      masterGain.current.connect(audioCtx.current.destination);
    }
    if (audioCtx.current.state === "suspended") audioCtx.current.resume();
    return audioCtx.current;
  }, []);

  const getMaster = useCallback(() => {
    getAudio();
    return masterGain.current!;
  }, [getAudio]);

  /* ── Tone controls ───────────────────────────────────── */

  const stopTone = useCallback(() => {
    const ctx = audioCtx.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const o of oscNodes.current) {
      try { o.stop(now + 1.2); } catch { /* already stopped */ }
    }
    oscNodes.current = [];
  }, []);

  const playTone = useCallback(
    (freq: number) => {
      stopTone();
      const ctx = getAudio();
      const master = getMaster();
      const now = ctx.currentTime;
      const nodes: OscillatorNode[] = [];

      const layer = (f: number, vol: number, attack: number, release: number) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, now);
        osc.connect(g);
        g.connect(master);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(vol, now + attack);
        g.gain.setTargetAtTime(vol, now + attack, 0.5);
        g.gain.setTargetAtTime(0.001, now + release, 0.9);
        osc.start(now);
        osc.stop(now + release + 3);
        nodes.push(osc);
      };

      layer(freq, 0.12, 2, 10);
      layer(freq / 2, 0.05, 2.5, 10);
      layer(freq * 1.5, 0.018, 3, 9);

      oscNodes.current = nodes;
    },
    [getAudio, getMaster, stopTone],
  );

  /* ── Ambient noise controls ──────────────────────────── */

  const stopNoise = useCallback(() => {
    if (noiseNodes.current) {
      const { source, gain } = noiseNodes.current;
      const ctx = audioCtx.current;
      if (ctx) {
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        try { source.stop(now + 0.6); } catch { /* noop */ }
      }
      noiseNodes.current = null;
    }
  }, []);

  const startNoise = useCallback(
    (preset: (typeof AMBIENT)[number]) => {
      stopNoise();
      const ctx = getAudio();
      const master = getMaster();

      if (!noiseBuf.current) noiseBuf.current = createNoiseBuffer(ctx);

      const source = ctx.createBufferSource();
      source.buffer = noiseBuf.current;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = preset.filterType;
      filter.frequency.value = preset.freq;
      filter.Q.value = preset.q;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(preset.vol, ctx.currentTime + 1);

      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();

      noiseNodes.current = { source, gain };
    },
    [getAudio, getMaster, stopNoise],
  );

  const toggleAmbient = useCallback(
    (id: string) => {
      if (activeAmbient === id) {
        stopNoise();
        setActiveAmbient(null);
      } else {
        const preset = AMBIENT.find((a) => a.id === id)!;
        startNoise(preset);
        setActiveAmbient(id);
      }
    },
    [activeAmbient, startNoise, stopNoise],
  );

  /* ── Mode selection ──────────────────────────────────── */

  const selectMode = useCallback(
    (i: number) => {
      const m = MODES[i];
      mode.current = { n: m.n, m: m.m };
      setActiveIdx(i);
      playTone(m.freq);
      scatter(particles.current);
      if (typeof navigator !== "undefined" && navigator.vibrate)
        navigator.vibrate(25);
    },
    [playTone],
  );

  /* ── Canvas animation loop ───────────────────────────── */

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = cvs.getBoundingClientRect();
      cvs.width = rect.width * dpr;
      cvs.height = rect.height * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const ctx = cvs.getContext("2d")!;

    const tick = () => {
      const w = cvs.width;
      const h = cvs.height;
      const sz = Math.min(w, h);
      const ox = (w - sz) / 2;
      const oy = (h - sz) / 2;
      const dpr = window.devicePixelRatio || 1;
      const pad = 8 * dpr;
      const inner = sz - pad * 2;

      ctx.fillStyle = "#080810";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = `hsla(${hueRef.current}, 30%, 35%, 0.2)`;
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(ox + pad, oy + pad, inner, inner);

      const pts = particles.current;
      const m = mode.current;

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (m) {
          const z = chladni(p.x, p.y, m.n, m.m);
          const [gx, gy] = chladniGrad(p.x, p.y, m.n, m.m);
          p.vx += -z * gx * FORCE;
          p.vy += -z * gy * FORCE;
        }
        p.vx += (Math.random() - 0.5) * NOISE_PHYSICS;
        p.vy += (Math.random() - 0.5) * NOISE_PHYSICS;
        p.vx *= DAMPING;
        p.vy *= DAMPING;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.3; }
        if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx) * 0.3; }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * 0.3; }
        if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy) * 0.3; }
      }

      const ch = hueRef.current;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        ctx.fillStyle = `hsla(${ch}, 72%, 66%, ${p.a})`;
        ctx.fillRect(
          ox + pad + p.x * inner - p.r * dpr * 0.5,
          oy + pad + p.y * inner - p.r * dpr * 0.5,
          p.r * dpr,
          p.r * dpr,
        );
      }

      animId.current = requestAnimationFrame(tick);
    };

    animId.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ── Cleanup audio on unmount ────────────────────────── */

  useEffect(() => {
    return () => {
      stopTone();
      stopNoise();
      if (audioCtx.current && audioCtx.current.state !== "closed")
        audioCtx.current.close();
    };
  }, [stopTone, stopNoise]);

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md px-3">
      {/* Chladni plate canvas */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-xl">
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          style={{ touchAction: "none" }}
        />
        {activeIdx === null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <span className="text-3xl opacity-40">✦</span>
            <p className="text-white/30 text-sm font-medium text-center px-8 leading-relaxed">
              Tap a note to see
              <br />
              sound become art
            </p>
          </div>
        )}
      </div>

      {/* Sliders row: Color + Volume */}
      <div className="flex flex-col gap-2 w-full">
        {/* Color slider */}
        <div className="flex items-center gap-2.5 w-full px-1">
          <span className="text-xs text-[#8a7e70] font-semibold shrink-0 w-10">
            Color
          </span>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="flex-1 h-2.5 rounded-full appearance-none cursor-pointer outline-none"
            style={{
              background:
                "linear-gradient(to right, hsl(0,80%,60%), hsl(60,80%,60%), hsl(120,80%,60%), hsl(180,80%,60%), hsl(240,80%,60%), hsl(300,80%,60%), hsl(360,80%,60%))",
            }}
          />
          <div
            className="w-5 h-5 rounded-full border-2 border-white/20 shadow-sm shrink-0"
            style={{ backgroundColor: `hsl(${hue}, 80%, 60%)` }}
          />
        </div>

        {/* Volume slider */}
        <div className="flex items-center gap-2.5 w-full px-1">
          <span className="text-xs text-[#8a7e70] font-semibold shrink-0 w-10">
            Vol
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 h-2.5 rounded-full appearance-none cursor-pointer outline-none"
            style={{
              background: `linear-gradient(to right, #1a1a2e ${volume}%, #f0e6d6 ${volume}%)`,
            }}
          />
          <span className="text-xs text-[#8a7e70] font-semibold shrink-0 w-7 text-right tabular-nums">
            {volume}%
          </span>
        </div>
      </div>

      {/* Note buttons — colored by frequency-to-light mapping */}
      <div className="grid grid-cols-6 gap-1.5 w-full">
        {MODES.map((m, i) => {
          const active = activeIdx === i;
          return (
            <button
              key={i}
              onClick={() => selectMode(i)}
              className={`flex flex-col items-center py-2.5 rounded-xl border-2 font-bold cursor-pointer transition-all duration-200 select-none active:scale-90 ${
                active ? "scale-[1.06]" : ""
              }`}
              style={{
                backgroundColor: active ? m.color : `${m.color}18`,
                borderColor: active ? m.color : `${m.color}40`,
                color: active ? "#fff" : m.color,
                boxShadow: active
                  ? `0 0 18px ${m.color}50`
                  : "none",
                textShadow: active ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
              }}
            >
              <span className="text-base leading-none">{m.note}</span>
              <span className="text-[9px] mt-0.5 opacity-70 leading-none">
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ambient noise tracks */}
      <div className="w-full">
        <p className="text-[10px] text-[#8a7e70] font-semibold uppercase tracking-wider mb-1.5 px-1">
          Ambient
        </p>
        <div className="grid grid-cols-5 gap-1.5 w-full">
          {AMBIENT.map((a) => {
            const active = activeAmbient === a.id;
            return (
              <button
                key={a.id}
                onClick={() => toggleAmbient(a.id)}
                className={`py-2 rounded-xl border font-semibold text-xs cursor-pointer transition-all duration-200 select-none active:scale-90 ${
                  active
                    ? "bg-[#1a1a2e] text-white border-[#1a1a2e] shadow-md"
                    : "bg-white/80 text-[#8a7e70] border-[#f0e6d6] hover:border-[#d0c6b6]"
                }`}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
