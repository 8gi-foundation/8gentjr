/**
 * 8gent Jr - sonification engine for the /math lessons.
 *
 * The point of the math route is that a child can *hear* what the numbers do,
 * not only see it. Every lesson maps its parameters onto sound:
 *
 *   amplitude -> loudness      (a taller wave is a louder wave)
 *   frequency -> pitch         (more wiggles is a higher note)
 *   layers    -> harmonics     (adding waves adds overtones, like a chord)
 *   whole ratios -> consonance (3:2 sounds settled, 7:5 sounds restless)
 *
 * Two shapes of sound:
 *   ping()  - a short struck bell, for taps and step completions
 *   voice() - a held tone whose pitch and loudness glide as knobs move
 *
 * Everything is generated with the Web Audio API. Nothing is fetched, nothing
 * is uploaded, nothing leaves the device.
 *
 * The pure helpers at the top carry the teaching logic and are unit tested;
 * the engine below is a thin Web Audio wrapper around them.
 */

// ---------------------------------------------------------------------------
// Pure helpers (tested in math-audio.test.ts)
// ---------------------------------------------------------------------------

/** C major pentatonic across two octaves. No semitone clashes, so any */
/** combination a child lands on still sounds kind. */
export const PENTATONIC_HZ = [
  261.63, // C4
  293.66, // D4
  329.63, // E4
  392.0, // G4
  440.0, // A4
  523.25, // C5
  587.33, // D5
  659.25, // E5
  783.99, // G5
  880.0, // A5
] as const;

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Map any 0..1 position onto a pentatonic note. Out of range values clamp. */
export function pentatonicAt(position: number): number {
  const t = clamp(position, 0, 1);
  const index = Math.round(t * (PENTATONIC_HZ.length - 1));
  return PENTATONIC_HZ[index];
}

/**
 * Pitch for a wave lesson. `wiggles` is the number of humps on screen, so the
 * mapping is literal: the child sees more humps and hears a higher note.
 * Continuous rather than snapped, because the knob is continuous.
 */
export function pitchForWiggles(wiggles: number, base = 220): number {
  const w = clamp(wiggles, 0.25, 8);
  return base * w;
}

/**
 * Loudness for a wave lesson. Amplitude 0 is silence, amplitude 1 is the
 * loudest the app will ever go, and that ceiling is deliberately low: this is
 * an app for sound-sensitive children and it is often used without headphones.
 */
export function gainForAmplitude(amplitude: number, ceiling = 0.16): number {
  const a = clamp(amplitude, 0, 1);
  // Perceptual curve. Linear gain feels like nothing happens until the top.
  return ceiling * a * a;
}

/** Greatest common divisor, used to reduce a rule pair to its simplest form. */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y > 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x;
}

/**
 * How settled a two number ratio sounds, 0 (restless) to 1 (settled).
 *
 * Simple ratios (1:1, 2:1, 3:2) share overtones and sound resolved. Ratios
 * built from big numbers (7:5, 9:8) beat against each other. This is the one
 * place in the app where a child can hear a number property directly, so the
 * Garden lesson uses it to label patterns "settled" or "buzzy".
 */
export function consonance(a: number, b: number): number {
  const x = Math.abs(Math.round(a));
  const y = Math.abs(Math.round(b));
  if (x === 0 || y === 0) return 0;
  const divisor = gcd(x, y);
  const simplicity = (x + y) / divisor;
  // 1:1 -> 2, 3:2 -> 5, 7:5 -> 12. Map that span onto 1..0.
  return clamp(1 - (simplicity - 2) / 14, 0, 1);
}

/** Frequency pair for a rule pair, so a:b is heard as an interval. */
export function ratioFrequencies(a: number, b: number, base = 220): [number, number] {
  const x = clamp(Math.round(a), 1, 12);
  const y = clamp(Math.round(b), 1, 12);
  return [base * x * 0.5, base * y * 0.5];
}

/** Relative loudness of harmonic `n` in a stacked wave. Higher is quieter. */
export function harmonicGain(n: number): number {
  const h = clamp(Math.round(n), 1, 16);
  return 1 / h;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface PingOptions {
  /** Seconds the note rings for. Default 0.7. */
  duration?: number;
  /** Peak gain 0..1 before the master ceiling. Default 0.5. */
  gain?: number;
  /** Add a bell-like third harmonic. Default true. */
  bell?: boolean;
}

export interface VoiceHandle {
  /** Glide to a new pitch and loudness. Called on every knob frame. */
  set(freq: number, gain: number, glideSeconds?: number): void;
  /** Fade out and release the oscillator. Safe to call twice. */
  stop(fadeSeconds?: number): void;
  readonly stopped: boolean;
}

/** Hard ceiling on everything this engine can output. */
const MASTER_CEILING = 0.5;

class MathAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private voices = new Set<VoiceHandle>();

  /** Lazily build the context. Must be called from a user gesture on iOS. */
  private ensure(): { ctx: AudioContext; master: GainNode } | null {
    if (typeof window === 'undefined') return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new Ctor();
      } catch {
        this.ctx = null;
        return null;
      }
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_CEILING;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (!this.master) return null;
    return { ctx: this.ctx, master: this.master };
  }

  setMuted(next: boolean): void {
    this.muted = next;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(next ? 0 : MASTER_CEILING, now, 0.05);
    }
    if (next) this.stopAll();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** A short struck note. Used for taps, step completions and previews. */
  ping(freq: number, options: PingOptions = {}): void {
    if (this.muted) return;
    const audio = this.ensure();
    if (!audio) return;
    const { ctx, master } = audio;
    const { duration = 0.7, gain = 0.5, bell = true } = options;
    const now = ctx.currentTime;
    const safeFreq = clamp(freq, 40, 4000);

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(safeFreq, now);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(clamp(gain, 0.001, 1), now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + duration + 0.05);

    if (!bell) return;
    const shimmer = ctx.createOscillator();
    const shimmerEnv = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(clamp(safeFreq * 3, 40, 12000), now);
    shimmerEnv.gain.setValueAtTime(0.0001, now);
    shimmerEnv.gain.exponentialRampToValueAtTime(clamp(gain * 0.18, 0.001, 1), now + 0.01);
    shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.45);
    shimmer.connect(shimmerEnv);
    shimmerEnv.connect(master);
    shimmer.start(now);
    shimmer.stop(now + duration);
  }

  /** Play several notes at once, so a chord is heard as one sound. */
  chord(freqs: readonly number[], options: PingOptions = {}): void {
    const gain = (options.gain ?? 0.5) / Math.max(1, freqs.length);
    freqs.forEach((f, i) => this.ping(f, { ...options, gain, bell: i === 0 }));
  }

  /**
   * A held tone. The lesson keeps one voice alive while the child moves a knob
   * and calls set() on every change, so the sound follows the finger.
   */
  voice(type: OscillatorType = 'sine'): VoiceHandle | null {
    const audio = this.ensure();
    if (!audio) return null;
    const { ctx, master } = audio;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(220, now);
    env.gain.setValueAtTime(0.0001, now);
    osc.connect(env);
    env.connect(master);
    osc.start(now);

    const handle: VoiceHandle = {
      stopped: false,
      set: (freq, gain, glideSeconds = 0.06) => {
        if (handle.stopped) return;
        const t = ctx.currentTime;
        osc.frequency.setTargetAtTime(clamp(freq, 40, 4000), t, glideSeconds);
        env.gain.setTargetAtTime(clamp(gain, 0, 1), t, glideSeconds);
      },
      stop: (fadeSeconds = 0.12) => {
        if (handle.stopped) return;
        (handle as { stopped: boolean }).stopped = true;
        const t = ctx.currentTime;
        env.gain.setTargetAtTime(0.0001, t, fadeSeconds / 3);
        try {
          osc.stop(t + fadeSeconds + 0.1);
        } catch {
          /* already stopped */
        }
        this.voices.delete(handle);
      },
    };

    this.voices.add(handle);
    return handle;
  }

  stopAll(): void {
    this.voices.forEach((v) => v.stop());
    this.voices.clear();
  }
}

let engine: MathAudio | null = null;

/** Shared engine. One AudioContext for the whole math route. */
export function getMathAudio(): MathAudio | null {
  if (typeof window === 'undefined') return null;
  if (!engine) engine = new MathAudio();
  return engine;
}

export type { MathAudio };
