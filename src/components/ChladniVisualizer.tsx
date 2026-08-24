"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import NamingCard from "@/components/guided/NamingCard";
import ChladniPlate3D from "@/components/ChladniPlate3D";
import { useCalmMode } from "@/components/math/useCalmMode";
import { useGuidedDiscovery } from "@/hooks/useGuidedDiscovery";

/* ── Chladni modes — note colors map to visible light spectrum ── */

const MODES = [
  { n: 1, m: 2, note: "C",  freq: 130.81, label: "Cross",   color: "#FF3333" },
  { n: 2, m: 3, note: "D",  freq: 146.83, label: "Diamond", color: "#FF8C00" },
  { n: 3, m: 5, note: "E",  freq: 164.81, label: "Star",    color: "#FFD700" },
  { n: 1, m: 4, note: "F",  freq: 174.61, label: "Lines",   color: "#00CC66" },
  { n: 4, m: 5, note: "G",  freq: 196.0,  label: "Web",     color: "#00BFFF" },
  { n: 2, m: 5, note: "A",  freq: 220.0,  label: "Flower",  color: "#4169E1" },
  { n: 3, m: 4, note: "B",  freq: 246.94, label: "Grid",    color: "#8B5CF6" },
  { n: 5, m: 6, note: "C2", freq: 261.63, label: "Jewel",   color: "#E040FB" },
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

/* ── Sand physics ────────────────────────────────────────────────────
 * The plate shakes hardest where the standing wave is biggest, so grains get
 * thrown around there and come to rest along the still lines. That agitation
 * is the primary effect and it is what makes a Chladni figure appear.
 *
 * Why this was retuned. The previous tuning was NOT broken; it did converge.
 * It was simply slow to sharpen on the low modes. Measured over 3000 grains,
 * mean |z| (0 = sitting exactly on a still line, ~0.58 = evenly scattered):
 *
 *            C Cross (1,2)      E Star (3,5)
 *   scattered    0.587              0.564
 *   before   300 steps 0.051    300 steps 0.009
 *   after    300 steps 0.004    300 steps 0.004
 *
 * 300 steps is about five seconds. The naming line in this activity tells the
 * child the sand gathers where the plate stays still, and it appears four
 * seconds after they stop moving, so the figure has to be crisp by then for
 * that sentence to be true. That is the whole reason for the change.
 *
 * AGITATION - how far a grain is thrown at maximum amplitude, per frame.
 * MIN_STEP  - a little life so settled sand still shimmers.
 * FORCE     - gentle downhill slide on the wave's square, sharpens the lines.
 */
const AGITATION = 0.018;
const MIN_STEP = 0.0004;
const FORCE = 0.00012;
const DAMPING = 0.9;

/**
 * How much of AGITATION actually reaches the sand, and why there is a dial here
 * at all.
 *
 * The retune above raised the per-frame throw by about two orders of magnitude,
 * which is what makes the figure crisp inside the four seconds the naming line
 * depends on. Settled sand is unaffected, because the throw is scaled by |z|
 * and |z| is near zero on the still lines. What it did change is the look of a
 * DRAG: crossing into a new mode re-energises every grain, and a child sweeping
 * the slider therefore watched three thousand grains boil continuously.
 *
 * That is not a flash hazard, the dots are uncorrelated noise, but it is a
 * sensory load, and this was the one surface in the wave with no way to turn it
 * down: `prefers-reduced-motion` cannot reach a canvas loop, and CSS is the
 * only place it was honoured. So the loop reads it directly, and it reads the
 * global Calm Mode too, which is on by default.
 *
 * The scales are chosen to keep the settle honest rather than to be as small as
 * possible. Calm still sharpens a figure well within the four seconds; reduced
 * takes longer and stays legible the whole way, which is the right trade for a
 * child who has asked for less movement.
 */
const AGITATION_SCALE = {
  lively: 1,
  calm: 0.45,
  reduced: 0.22,
} as const;

/* ── Guided sliding (issue #225) ─────────────────────────────────────
 * The child drags one frequency, the tone glides with the drag, and the sand
 * re-forms into whichever mode is nearest. Pattern, sound and finger stay in
 * step, which is the whole point: do, then see and hear, then name.
 *
 * The tone is routed through the existing master gain, so the Vol slider at
 * zero silences it while the sand keeps working. The activity is complete with
 * no audio at all. */
const SLIDE_MIN_HZ = 110;
const SLIDE_MAX_HZ = 300;
/** Sand needs a still moment to settle onto the quiet lines before we name it. */
const SETTLE_MS = 4000;

/** Nearest Chladni mode to an arbitrary frequency, by absolute distance in Hz. */
function nearestModeIndex(freq: number): number {
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < MODES.length; i++) {
    const gap = Math.abs(MODES[i].freq - freq);
    if (gap < bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/* ── Tuner ───────────────────────────────────────────────────
 * Chromatic note names for the live pitch tuner readout. */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const IN_TUNE_CENTS = 8; // within this many cents counts as "on the note"

interface TunerReading {
  noteName: string;
  cents: number; // -50..+50, signed distance to the nearest note
  inTune: boolean;
}

/** Turn a detected frequency into a tuner reading: nearest note name and
 *  how many cents sharp (+) or flat (-) the player is. */
function freqToTuner(freq: number): TunerReading {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const nearest = Math.round(midi);
  const cents = (midi - nearest) * 100;
  const noteName = NOTE_NAMES[((nearest % 12) + 12) % 12];
  return { noteName, cents, inTune: Math.abs(cents) < IN_TUNE_CENTS };
}

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

/**
 * Throw every grain somewhere new. For a DISCRETE event only: tapping a note is
 * one deliberate act and watching a fresh figure assemble from nothing is the
 * best thing this activity does.
 */
function scatter(particles: Particle[]) {
  for (const p of particles) {
    p.x = Math.random();
    p.y = Math.random();
    p.vx = (Math.random() - 0.5) * 0.002;
    p.vy = (Math.random() - 0.5) * 0.002;
  }
}

/**
 * Loosen the sand without teleporting it.
 *
 * A continuous drag crosses many modes, and scattering at every crossing meant
 * the sand never stopped being thrown across the plate: three thousand grains
 * jumping to new random positions several times a second. That is the boil.
 *
 * Real sand does not teleport. It gets shaken loose and walks to the nearest
 * still line, which is the thing this activity is about. A kick to the velocity
 * is enough to free a grain from a line that is no longer a line, and the
 * pattern then migrates in front of the child rather than blinking. Calmer to
 * watch and closer to what a plate actually does.
 */
function loosen(particles: Particle[], strength: number) {
  for (const p of particles) {
    p.vx += (Math.random() - 0.5) * strength;
    p.vy += (Math.random() - 0.5) * strength;
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/* ── Live pitch detection (record button) ───────────────────
 * Autocorrelation pitch detector — detects the fundamental of a voice or
 * instrument from the mic, so a sung note or a guitar string shapes the
 * sand in real time (same idea as strumsurfer). Returns Hz, or -1 if the
 * input is too quiet / unpitched. */
function autoCorrelate(buf: Float32Array, sampleRate: number): number {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.01) return -1; // silence gate

  let r1 = 0, r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }

  const b = buf.slice(r1, r2);
  const n = b.length;
  const c = new Array(n).fill(0);
  for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) c[i] += b[j] * b[j + i];

  let d = 0;
  while (d < n - 1 && c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < n; i++) if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
  let T0 = maxpos;
  if (T0 <= 0) return -1;

  // Parabolic interpolation around the peak for sub-sample accuracy.
  const x1 = c[T0 - 1] ?? 0, x2 = c[T0], x3 = c[T0 + 1] ?? 0;
  const a = (x1 + x3 - 2 * x2) / 2;
  const bb = (x3 - x1) / 2;
  if (a) T0 = T0 - bb / (2 * a);
  return sampleRate / T0;
}

/** Map any frequency to one of the 8 Chladni note modes by pitch class,
 *  so notes in any octave (low guitar, high voice) still shape a pattern. */
const PITCH_CLASS_TO_MODE = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 6]; // C C# D D# E F F# G G# A A# B
function freqToModeIndex(freq: number): number {
  const midi = 69 + 12 * Math.log2(freq / 440);
  const pc = ((Math.round(midi) % 12) + 12) % 12;
  // High C-ish notes get the "C2 / Jewel" mode (index 7) for extra variety.
  if (pc === 0 && freq > 240) return 7;
  return PITCH_CLASS_TO_MODE[pc];
}

/* ── Component ──────────────────────────────────────────── */

export function ChladniVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef(makeParticles());
  const animId = useRef(0);

  /**
   * Calm Mode, read but not offered here.
   *
   * The setting is global and persists per device, and the Light Mixer already
   * ships the toggle, so honouring it costs nothing and adding a second control
   * to this already busy surface would cost real screen. It defaults to on,
   * which is the right default for the sand.
   */
  const [calm] = useCalmMode();

  /**
   * How hard the sand is thrown, resolved from Calm Mode and the operating
   * system's reduced-motion setting.
   *
   * A ref rather than state on purpose: the render loop reads it every frame,
   * and it must not restart the loop when it changes.
   */
  const agitationRef = useRef(AGITATION * AGITATION_SCALE.calm);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      const scale = mq.matches
        ? AGITATION_SCALE.reduced
        : calm
          ? AGITATION_SCALE.calm
          : AGITATION_SCALE.lively;
      agitationRef.current = AGITATION * scale;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [calm]);
  // Warm amber, not violet: hues 270-350 are banned by BRAND.md.
  const hueRef = useRef(28);
  const volRef = useRef(0.5);

  /* Audio refs */
  const audioCtx = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const oscNodes = useRef<OscillatorNode[]>([]);
  const noiseNodes = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);
  const noiseBuf = useRef<AudioBuffer | null>(null);
  const mode = useRef<{ n: number; m: number } | null>(null);

  /* Live-input (record) refs */
  const micStream = useRef<MediaStream | null>(null);
  const micAnalyser = useRef<AnalyserNode | null>(null);
  const micBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const micRAF = useRef(0);
  const lastDetectIdx = useRef<number | null>(null);
  const lastDetectAt = useRef(0);

  /* Tuner refs - targetCents is where the dot wants to be (from the last
   * detection); smoothCents is the eased value the dot is drawn at, so the
   * marker "dances" toward the note instead of snapping. */
  const targetCents = useRef(0);
  const smoothCents = useRef(0);
  const tunerInTune = useRef(false);
  const tunerDotRef = useRef<HTMLDivElement>(null);
  const lastAnnouncedNote = useRef<string | null>(null);

  /* UI state */
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeAmbient, setActiveAmbient] = useState<string | null>(null);
  const [hue, setHue] = useState(28);
  const [volume, setVolume] = useState(50);
  const [listening, setListening] = useState(false);
  const [liveNote, setLiveNote] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [tuner, setTuner] = useState<TunerReading | null>(null);

  /* Guided sliding state (issue #225) */
  const [slideHz, setSlideHz] = useState(164);
  /** Flat sand plate, or the same plate in relief the child can turn around. */
  const [view, setView] = useState<"sand" | "plate">("sand");
  const glideOsc = useRef<OscillatorNode | null>(null);
  const glideGain = useRef<GainNode | null>(null);
  const glideIdle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Range of mode complexity (n + m) the child has met, in either direction. */
  const lowComplexity = useRef(Infinity);
  const highComplexity = useRef(0);

  // Speech is additive: with Vol at zero the sentence is still shown, just not
  // spoken, so the activity stays whole for a child who cannot hear it.
  const guided = useGuidedDiscovery({
    activityId: "cymatics",
    speakEnabled: volume > 0,
  });

  useEffect(() => { hueRef.current = hue; }, [hue]);

  /* Screen-reader announcement, throttled to note-name changes only so the
   * live region is not spammed every frame. The dot position/colour update on
   * the ref outside React and are not announced. */
  const [tunerAnnounce, setTunerAnnounce] = useState("");
  useEffect(() => {
    if (!tuner) return;
    if (tuner.noteName !== lastAnnouncedNote.current) {
      lastAnnouncedNote.current = tuner.noteName;
      setTunerAnnounce(`Note ${tuner.noteName}`);
    }
  }, [tuner]);
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

  /* ── Guided sliding: one frequency the child drags ───── */

  /**
   * Record what the child just produced. Only real, on-screen effects are
   * recorded: a pattern appeared, a more complex pattern appeared, or the sand
   * was left alone long enough to settle onto the still lines.
   */
  const noteMode = useCallback(
    (idx: number) => {
      const m = MODES[idx];
      guided.record("pattern-formed");

      // "Higher sounds made more lines" is true once the child has seen two
      // patterns of different complexity, whichever order they met them in.
      // Requiring a strictly upward climb meant a child who started high and
      // slid down never earned it, even though they saw exactly the same
      // relationship. Track the range, not a peak.
      const complexity = m.n + m.m;
      lowComplexity.current = Math.min(lowComplexity.current, complexity);
      highComplexity.current = Math.max(highComplexity.current, complexity);
      if (highComplexity.current > lowComplexity.current) {
        guided.record("higher-more-lines");
      }

      // Sand settles onto the quiet lines only if the frequency is left alone.
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        guided.record("quiet-lines");
      }, SETTLE_MS);
    },
    // record is stable; depending on the whole hook result would rebuild this
    // callback (and selectMode with it) on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guided.record],
  );

  const stopGlide = useCallback(() => {
    const ctx = audioCtx.current;
    const g = glideGain.current;
    const o = glideOsc.current;
    if (!ctx || !g || !o) return;
    const now = ctx.currentTime;
    g.gain.cancelScheduledValues(now);
    g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    try { o.stop(now + 0.4); } catch { /* already stopped */ }
    glideOsc.current = null;
    glideGain.current = null;
  }, []);

  /**
   * Start (or keep) a single gliding tone and point it at `hz`. One oscillator
   * is reused for the whole drag so the pitch slides continuously instead of
   * retriggering, which is what makes the sound feel attached to the finger.
   */
  const glideTo = useCallback(
    (hz: number) => {
      const ctx = getAudio();
      const master = getMaster();
      const now = ctx.currentTime;

      if (!glideOsc.current) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(hz, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.1, now + 0.12);
        o.connect(g);
        g.connect(master);
        o.start(now);
        glideOsc.current = o;
        glideGain.current = g;
      } else {
        glideOsc.current.frequency.setTargetAtTime(hz, now, 0.03);
      }

      // Fade out shortly after the child stops moving, so a released slider
      // does not leave a tone humming under the room.
      if (glideIdle.current) clearTimeout(glideIdle.current);
      glideIdle.current = setTimeout(stopGlide, 900);
    },
    [getAudio, getMaster, stopGlide],
  );

  /** The slider itself: pattern, tone and sand all move together. */
  const handleSlide = useCallback(
    (hz: number) => {
      setSlideHz(hz);
      const idx = nearestModeIndex(hz);
      const m = MODES[idx];

      // Only when the pattern actually changes, and even then the sand is
      // loosened rather than scattered. A drag crosses several modes, and a
      // full scatter at each crossing is what made the plate boil.
      if (mode.current?.n !== m.n || mode.current?.m !== m.m) {
        mode.current = { n: m.n, m: m.m };
        loosen(particles.current, 0.004);
        setActiveIdx(idx);
        noteMode(idx);
      }

      stopTone(); // the tap-a-note tone must not fight the glide
      glideTo(hz);
    },
    [glideTo, noteMode, stopTone],
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
      setSlideHz(m.freq); // keep the drag slider in step with the tapped note
      playTone(m.freq);
      scatter(particles.current);
      noteMode(i);
      if (typeof navigator !== "undefined" && navigator.vibrate)
        navigator.vibrate(25);
    },
    [playTone, noteMode],
  );

  /* ── Live input: mic → pitch → pattern (record button) ── */

  const stopListening = useCallback(() => {
    cancelAnimationFrame(micRAF.current);
    micAnalyser.current?.disconnect();
    micAnalyser.current = null;
    micBuf.current = null;
    if (micStream.current) {
      micStream.current.getTracks().forEach((t) => t.stop());
      micStream.current = null;
    }
    lastDetectIdx.current = null;
    targetCents.current = 0;
    smoothCents.current = 0;
    tunerInTune.current = false;
    lastAnnouncedNote.current = null;
    setListening(false);
    setLiveNote(null);
    setTuner(null);
  }, []);

  const startListening = useCallback(async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      micStream.current = stream;
      const ctx = getAudio();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser); // analyser only — we never route the mic to output
      micAnalyser.current = analyser;
      micBuf.current = new Float32Array(analyser.fftSize);
      setListening(true);

      const loop = () => {
        const a = micAnalyser.current;
        const b = micBuf.current;
        if (!a || !b) return;
        const now = performance.now();
        // Throttle the O(n²) detector to ~12 Hz — plenty for note tracking,
        // cheap enough for low-end Android.
        if (now - lastDetectAt.current > 80) {
          lastDetectAt.current = now;
          a.getFloatTimeDomainData(b);
          const freq = autoCorrelate(b, ctx.sampleRate);
          if (freq > 0) {
            const idx = freqToModeIndex(freq);
            const m = MODES[idx];
            mode.current = { n: m.n, m: m.m };
            // Capped at 260 so the sweep stops short of the banned 270-350 band.
            setHue(Math.round((idx / (MODES.length - 1)) * 260));

            // Tuner: where should the marker aim, and is it on the note?
            const reading = freqToTuner(freq);
            targetCents.current = reading.cents;
            tunerInTune.current = reading.inTune;
            setTuner(reading);

            if (idx !== lastDetectIdx.current) {
              lastDetectIdx.current = idx;
              setActiveIdx(idx);
              setLiveNote(m.note);
              // Loosened, not scattered: a sung glide crosses notes as
              // continuously as a dragged slider does.
              loosen(particles.current, 0.004);
              // A pattern the child produced with their own voice counts too.
              noteMode(idx);
            }
          }
        }

        // Ease the tuner dot toward its target every frame so it dances
        // smoothly rather than jumping (lerp ~0.18 reads calm, not laggy).
        smoothCents.current += (targetCents.current - smoothCents.current) * 0.18;
        const dot = tunerDotRef.current;
        if (dot) {
          const c = Math.max(-50, Math.min(50, smoothCents.current));
          const offNess = Math.min(1, Math.abs(c) / 50); // 0 in tune, 1 far off
          // Greener as you close in: green hue at the centre, warm amber far off.
          const hueDeg = 140 - offNess * 95; // 140 (green) -> 45 (amber)
          const sat = 70 - offNess * 35; // desaturate a touch when far off
          dot.style.left = `${50 + (c / 50) * 45}%`;
          dot.style.backgroundColor = `hsl(${hueDeg} ${sat}% 50%)`;
          dot.style.boxShadow = tunerInTune.current
            ? "0 0 16px hsl(140 70% 50% / 0.85), 0 0 4px hsl(140 70% 60%)"
            : `0 0 6px hsl(${hueDeg} ${sat}% 50% / 0.4)`;
        }

        micRAF.current = requestAnimationFrame(loop);
      };
      micRAF.current = requestAnimationFrame(loop);
    } catch {
      setMicError("Microphone access is needed to shape sand with your voice.");
      setListening(false);
    }
  }, [getAudio, noteMode]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  /* ── Canvas animation loop ───────────────────────────── */

  // Keyed on `view`: switching to the relief view unmounts this canvas, and
  // switching back mounts a brand new element. Without the dependency the loop
  // would keep painting the old detached canvas and the flat view would come
  // back blank.
  useEffect(() => {
    if (view !== "sand") return;
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
          // chladni() spans -2..2; normalise to a 0..1 shake strength.
          const amp = Math.abs(z) * 0.5;

          // Agitation: grains are thrown about where the plate moves most,
          // and barely at all along the still lines, so they collect there.
          // Scaled by Calm Mode and reduced motion, read fresh every frame so
          // changing either setting takes effect without a reload.
          const step = MIN_STEP + amp * agitationRef.current;
          p.x += (Math.random() - 0.5) * step;
          p.y += (Math.random() - 0.5) * step;

          // A gentle slide downhill on z squared, which sharpens the lines.
          const [gx, gy] = chladniGrad(p.x, p.y, m.n, m.m);
          p.vx = (p.vx - z * gx * FORCE) * DAMPING;
          p.vy = (p.vy - z * gy * FORCE) * DAMPING;
        } else {
          // No note chosen yet: a barely-there drift, not a still image.
          p.vx = (p.vx + (Math.random() - 0.5) * 0.0002) * DAMPING;
          p.vy = (p.vy + (Math.random() - 0.5) * 0.0002) * DAMPING;
        }
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx) * 0.3; }
        if (p.x > 1) { p.x = 1; p.vx = -Math.abs(p.vx) * 0.3; }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy) * 0.3; }
        if (p.y > 1) { p.y = 1; p.vy = -Math.abs(p.vy) * 0.3; }
      }

      const ch = hueRef.current;
      // A touch of shimmer so the granules feel alive (very subtle, per-particle
      // phase so they twinkle independently rather than pulsing in unison).
      // Held still under reduced motion: this is decoration, and decoration is
      // the first thing to give up when a child has asked for less movement.
      const shimmerOn = agitationRef.current > AGITATION * AGITATION_SCALE.reduced;
      const tNow = shimmerOn ? performance.now() * 0.004 : 0;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const shimmer = shimmerOn ? 1 + 0.12 * Math.sin(tNow + i * 1.7) : 1;
        const alpha = Math.min(1, p.a * shimmer);
        ctx.fillStyle = `hsla(${ch}, 72%, 66%, ${alpha})`;
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
  }, [view]);

  /* ── Cleanup audio on unmount ────────────────────────── */

  useEffect(() => {
    return () => {
      stopTone();
      stopNoise();
      stopListening();
      stopGlide();
      if (glideIdle.current) clearTimeout(glideIdle.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (audioCtx.current && audioCtx.current.state !== "closed")
        audioCtx.current.close();
    };
  }, [stopTone, stopNoise, stopListening, stopGlide]);

  /* ── Render ──────────────────────────────────────────── */

  return (
    <div className="w-full px-3 md:px-6 lg:px-8">
      {/* Responsive layout: stacked on phone, side-by-side on tablet+ */}
      <div className="flex flex-col md:flex-row md:items-start md:gap-6 lg:gap-8 gap-3 max-w-5xl mx-auto">
        {/* Chladni plate canvas — grows on larger screens */}
        <div className="relative w-full md:flex-1 md:max-w-[560px] aspect-square max-h-[42vh] md:max-h-none rounded-2xl overflow-hidden shadow-xl shrink-0">
          {view === "plate" ? (
            <ChladniPlate3D
              n={activeIdx !== null ? MODES[activeIdx].n : 1}
              m={activeIdx !== null ? MODES[activeIdx].m : 2}
              hue={hue}
              calm={calm}
              className="w-full h-full block"
            />
          ) : (
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              style={{ touchAction: "none" }}
            />
          )}

          {/* Flat or relief. Both show the same plate, so this is a way to
              look, never a level to unlock. */}
          <button
            onClick={() => setView((v) => (v === "sand" ? "plate" : "sand"))}
            aria-pressed={view === "plate"}
            className="absolute top-2 right-2 px-3 rounded-full border-none font-bold text-xs cursor-pointer select-none"
            style={{
              minHeight: 44,
              backgroundColor: view === "plate" ? "#E8610A" : "rgba(255,255,255,0.14)",
              color: "#fff",
              backdropFilter: "blur(4px)",
            }}
          >
            {view === "plate" ? "Turn it" : "See it 3D"}
          </button>

          {view === "sand" && activeIdx === null && (
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

        {/* Controls panel — beside canvas on tablet+ */}
        <div className="flex flex-col gap-3 w-full md:flex-1 md:py-2">
          {/* Live input — sing or play an instrument to shape the sand */}
          <button
            onClick={toggleListening}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening to your voice or instrument" : "Use your voice or an instrument to shape the sand"}
            className={`flex items-center justify-center gap-2.5 w-full py-3 rounded-2xl border-2 font-bold cursor-pointer transition-all duration-150 select-none active:scale-[0.98] ${
              listening
                ? "bg-[#E23B2E] text-white border-[#E23B2E] shadow-[0_0_22px_rgba(226,59,46,0.5)]"
                : "bg-white text-[#E23B2E] border-[#E23B2E]/40 hover:border-[#E23B2E]"
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full ${listening ? "bg-white animate-pulse" : "bg-[#E23B2E]"}`}
              aria-hidden="true"
            />
            {listening
              ? liveNote
                ? `Listening — heard ${liveNote}`
                : "Listening… make a sound"
              : "Sing or play to shape the sand"}
          </button>
          {micError && (
            <p className="text-[12px] text-[#E23B2E] font-medium px-1 -mt-1">{micError}</p>
          )}

          {/* Live pitch tuner - helps the child land on the note. The marker
              dances toward centre and turns greener as they get in tune. */}
          {listening && (
            <div
              role="status"
              aria-live="polite"
              className="w-full rounded-2xl bg-[#1a1a2e] px-4 py-3 flex flex-col items-center gap-2.5 select-none"
            >
              {/* Detected note, big and friendly */}
              <div className="flex items-baseline gap-2 h-8">
                {tuner ? (
                  <span
                    className="text-3xl font-extrabold leading-none tabular-nums transition-colors duration-200"
                    style={{ color: tuner.inTune ? "hsl(140 70% 60%)" : "#f0e6d6" }}
                  >
                    {tuner.noteName}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-white/40">
                    make a sound
                  </span>
                )}
                {tuner?.inTune && (
                  <span
                    className="text-xl leading-none"
                    style={{ color: "hsl(140 70% 60%)" }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </div>

              {/* Flat / sharp hints + the dancing bar */}
              <div className="flex items-center gap-2 w-full">
                <span
                  className="text-[11px] font-bold text-white/35 shrink-0"
                  aria-hidden="true"
                >
                  ◀ flat
                </span>
                <div className="relative flex-1 h-3 rounded-full bg-white/10">
                  {/* centre target line */}
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-white/30"
                    aria-hidden="true"
                  />
                  {/* dancing marker - position + colour driven by the mic RAF */}
                  <div
                    ref={tunerDotRef}
                    aria-hidden="true"
                    className="absolute top-1/2 w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: "50%",
                      backgroundColor: "hsl(45 35% 50%)",
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-bold text-white/35 shrink-0"
                  aria-hidden="true"
                >
                  sharp ▶
                </span>
              </div>

              {/* Throttled live announcement - note-name changes only */}
              <span className="sr-only">{tunerAnnounce}</span>
            </div>
          )}

          {/* Drag one frequency: the sand and the tone follow the finger.
              This is the do half of do -> see -> name. */}
          <div className="flex items-center gap-2.5 w-full px-1">
            <span className="text-xs text-[#8a7e70] font-semibold shrink-0 w-10">
              Slide
            </span>
            <input
              type="range"
              min={SLIDE_MIN_HZ}
              max={SLIDE_MAX_HZ}
              step={1}
              value={slideHz}
              onChange={(e) => handleSlide(Number(e.target.value))}
              aria-label="Slide the sound from low to high and watch the sand change"
              className="flex-1 h-2.5 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background: `linear-gradient(to right, #E8610A ${
                  ((slideHz - SLIDE_MIN_HZ) / (SLIDE_MAX_HZ - SLIDE_MIN_HZ)) * 100
                }%, #f0e6d6 ${
                  ((slideHz - SLIDE_MIN_HZ) / (SLIDE_MAX_HZ - SLIDE_MIN_HZ)) * 100
                }%)`,
              }}
            />
            <span className="text-xs text-[#8a7e70] font-semibold shrink-0 w-12 text-right">
              {slideHz < 160 ? "low" : slideHz > 240 ? "high" : "middle"}
            </span>
          </div>

          {/* The name half. Shown always, spoken only when the volume allows. */}
          <NamingCard
            line={guided.line}
            onDismiss={guided.dismiss}
            accent="#E8610A"
            tone="dark"
          />

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

          {/* Note buttons — 8 notes, full octave C to C2 */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 w-full">
            {MODES.map((m, i) => {
              const active = activeIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => selectMode(i)}
                  className={`flex flex-col items-center py-2.5 md:py-3 rounded-xl border-2 font-bold cursor-pointer transition-all duration-100 select-none active:scale-[0.88] ${
                    active ? "scale-[1.04]" : ""
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
                    className={`py-2 md:py-2.5 rounded-xl border font-semibold text-xs cursor-pointer transition-all duration-100 select-none active:scale-[0.9] ${
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
      </div>
    </div>
  );
}
