/**
 * voice-play.ts - the six Voice Play exercises, as data and a pure reducer.
 *
 * Voice Play (issue #238) shows a mouth position, asks for one sustained sound,
 * and draws what the voice actually did. Six drills, one shape: do, see, name.
 *
 * WHY THE STATE MACHINE IS OUT HERE
 *
 * The science sandboxes learned this the hard way in wave 1: predicates that
 * live inside a canvas component are predicates no test can reach, and two of
 * them shipped wrong, one naming an effect on the opening frame before the
 * child had touched anything. This activity has the same failure available to
 * it and a worse consequence, because the thing it would name falsely is the
 * child's own voice.
 *
 * It also has one the sandboxes did not: the microphone. The rule that no
 * AudioContext and no getUserMedia happen before an explicit press is not a
 * preference, it is the reason a family can leave this on a tablet. A state
 * machine that starts in `idle` and can only leave it through a `press` event
 * is how that rule stops being a promise about the component.
 *
 * So: phases, thresholds, held-time accumulation and completion all live here,
 * with no React, no DOM and no Web Audio, and the suite drives real frame
 * sequences through them.
 *
 * WHAT IS DELIBERATELY NOT MEASURED
 *
 * "Low" in Long Low Note is not gated on an absolute frequency. Low is a
 * different number for an eight-year-old and for an adult man, and a fixed
 * threshold would simply tell most children they had failed at something they
 * had in fact done. What the exercise measures is what it can measure honestly:
 * how long the note lasted and how steady the breath behind it was.
 *
 * Issue: #238
 */

import type { AccountType } from '@/lib/account';
import { hueIsAllowed, safeHue } from '@/lib/pattern-garden';
import {
  detectOnsets,
  pitchStability,
  rangeOf,
  rms,
  stability,
  centsBetween,
  type Onset,
} from '@/lib/voice-analysis';

// ---------------------------------------------------------------------------
// The exercises
// ---------------------------------------------------------------------------

export const EXERCISE_IDS = [
  'open-and-hold',
  'silent-shapes',
  'long-low-note',
  'soft-start',
  'three-colours',
  'slide',
] as const;

export type ExerciseId = (typeof EXERCISE_IDS)[number];

/** Mouth illustrations this activity draws. Our own line art, never a photo. */
export type MouthShapeId =
  | 'two-fingers'
  | 'ah'
  | 'eh'
  | 'ee'
  | 'oh'
  | 'oo'
  | 'relaxed';

export interface ExerciseSpec {
  id: ExerciseId;
  /** Discovery id in the guided-naming registry. One card, after the effect. */
  discoveryId: string;
  /** Whether this exercise opens the microphone at all. */
  needsMic: boolean;
  /** A detected pitch is required for a frame to count as held. */
  requiresPitch: boolean;
  /** Seconds of qualifying activity the effect takes. */
  targetSeconds: number;
  /** RMS at or above this counts as phonation rather than as a room. */
  noiseFloor: number;
  /**
   * How many samples off the END of the analyser buffer the loudness reading
   * is taken from. 0 means the whole buffer.
   *
   * This exists because of a measurement that was wrong on the first evidence
   * run and looked entirely convincing while it was. An analyser buffer at
   * fftSize 2048 is about 43 ms of sound, and the RMS of that whole window
   * cannot rise faster than 43 ms no matter how violently the sound started.
   * So a 2 ms glottal slam and a 43 ms swell measured the same, and Soft Start
   * told a slammed onset it had been gentle.
   *
   * Soft Start therefore reads its loudness from a short tail of the buffer,
   * shorter than the fastest attack it needs to tell apart. Every other
   * exercise keeps the whole buffer, because a window of a few milliseconds is
   * less than one period of a low note and its RMS would jitter with phase,
   * which would in turn make a perfectly even breath measure uneven.
   */
  levelWindowSamples: number;
  /** The shape or shapes the illustration walks through. */
  shapes: readonly MouthShapeId[];
  /** Seconds per shape, for the exercise that cycles them. */
  shapeSeconds: number;
}

/**
 * Silent Shapes walks five vowel positions with no sound at all. Fifteen
 * seconds each is what the drill is, and there is a Finish control on screen
 * throughout, so the length is a suggestion the child can leave at any time.
 */
export const SILENT_SHAPE_SECONDS = 15;

const SILENT_SHAPES: readonly MouthShapeId[] = ['ah', 'eh', 'ee', 'oh', 'oo'];

export const EXERCISES: Record<ExerciseId, ExerciseSpec> = {
  'open-and-hold': {
    id: 'open-and-hold',
    discoveryId: 'steady',
    needsMic: true,
    requiresPitch: true,
    targetSeconds: 10,
    noiseFloor: 0.01,
    levelWindowSamples: 0,
    shapes: ['two-fingers'],
    shapeSeconds: 10,
  },
  'silent-shapes': {
    id: 'silent-shapes',
    discoveryId: 'shapes',
    // The one exercise that never opens the microphone. There is nothing to
    // listen to: the whole drill is the mouth moving in silence.
    needsMic: false,
    requiresPitch: false,
    targetSeconds: SILENT_SHAPE_SECONDS * SILENT_SHAPES.length,
    noiseFloor: 0,
    levelWindowSamples: 0,
    shapes: SILENT_SHAPES,
    shapeSeconds: SILENT_SHAPE_SECONDS,
  },
  'long-low-note': {
    id: 'long-low-note',
    discoveryId: 'long-and-low',
    needsMic: true,
    requiresPitch: true,
    targetSeconds: 12,
    noiseFloor: 0.008,
    levelWindowSamples: 0,
    shapes: ['oh'],
    shapeSeconds: 12,
  },
  'soft-start': {
    id: 'soft-start',
    discoveryId: 'soft-start',
    needsMic: true,
    // Onsets are found in the loudness envelope. A whispered "ah" has an onset
    // too, and it is still a soft start.
    requiresPitch: false,
    targetSeconds: 10,
    noiseFloor: 0.01,
    // About five milliseconds at 48 kHz: shorter than the gentlest onset this
    // exercise is meant to accept, so the two are actually distinguishable.
    levelWindowSamples: 256,
    shapes: ['ah'],
    shapeSeconds: 10,
  },
  'three-colours': {
    id: 'three-colours',
    discoveryId: 'new-colour',
    needsMic: true,
    requiresPitch: true,
    targetSeconds: 9,
    noiseFloor: 0.01,
    levelWindowSamples: 0,
    shapes: ['relaxed'],
    shapeSeconds: 9,
  },
  slide: {
    id: 'slide',
    discoveryId: 'slide',
    needsMic: true,
    requiresPitch: true,
    targetSeconds: 6,
    noiseFloor: 0.01,
    levelWindowSamples: 0,
    shapes: ['relaxed'],
    shapeSeconds: 6,
  },
};

// ---------------------------------------------------------------------------
// Loudness window
// ---------------------------------------------------------------------------

/**
 * The loudness this exercise is entitled to read off one analyser buffer.
 *
 * This is the whole of `levelWindowSamples`, and it lives out here rather than
 * inside the animation loop for one reason: while it lived in the loop, setting
 * `levelWindowSamples` to 0 changed nothing that any test could see, and the
 * measurement it exists to protect is the one that was already wrong once. The
 * reducer is handed an rms that has already been computed, so the reducer can
 * never check this; only a pure function taking the raw buffer can.
 *
 * A spec with no window reads the whole buffer. A spec with a window shorter
 * than the buffer reads the tail of it, because the tail is the only part of a
 * 43 ms window that can rise as fast as a glottal slam does.
 *
 * A window that is zero, negative, or at least as long as the buffer means the
 * whole buffer, so a short first buffer degrades to a wider window rather than
 * to an empty one.
 */
export function levelForSpec(
  buffer: Float32Array,
  spec: Pick<ExerciseSpec, 'levelWindowSamples'>,
): number {
  const window = spec.levelWindowSamples;
  if (window > 0 && window < buffer.length) {
    return rms(buffer.subarray(buffer.length - window));
  }
  return rms(buffer);
}

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

/** Held steady enough for the ring to have settled. */
export const STEADY_ENOUGH = 0.6;
/** Breath even enough to count as spending it slowly. */
export const EVEN_BREATH = 0.5;
/** Three gentle starts is the drill. */
export const SOFT_START_COUNT = 3;
/**
 * Loudness units per second. Above this a start is a slam rather than a start.
 * Calibrated against the synthetic onsets in the evidence run: a step from
 * silence to 0.12 inside a single animation frame measures about 7, and the
 * same rise spread over eight frames measures about 0.9.
 */
export const SOFT_SLOPE_MAX = 2.5;
/** Dark to bright has to be an actual journey, not a flicker. */
export const COLOUR_SPAN_HZ = 400;
/** A slide is worth naming once it has covered this much ground. */
export const SLIDE_SPAN_CENTS = 500;
/** And come back to within this of where it started. */
export const SLIDE_RETURN_CENTS = 220;

/**
 * How much wall time one frame may contribute.
 *
 * A backgrounded tab, a garbage collection or a slow first paint can leave a
 * gap of seconds between frames. Counting that gap as held time would hand a
 * child ten seconds of holding for a cough, so a frame is worth at most this.
 */
export const MAX_FRAME_MS = 100;

/** Recent history kept for the steadiness measures. About ten seconds. */
export const SAMPLE_CAP = 600;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type VoicePlayPhase = 'idle' | 'armed' | 'holding' | 'done';

export interface VoicePlayState {
  exercise: ExerciseId;
  phase: VoicePlayPhase;
  /** Milliseconds of qualifying activity so far. */
  heldMs: number;
  /** Wall clock of the last frame, or null before the first one. */
  lastFrameMs: number | null;
  /** True when the most recent frame counted as sound. */
  phonating: boolean;
  /** Recent pitch readings in Hz. -1 entries are gaps, not zeros. */
  pitchHz: number[];
  /** Recent loudness readings. */
  envelope: number[];
  /** Recent spectral centroid readings in Hz. */
  centroidHz: number[];
  /** Starts found in the envelope so far. */
  onsets: Onset[];
  /** First pitch of the exercise, the reference a slide is measured against. */
  startHz: number | null;
  /** Furthest the pitch has travelled from `startHz`, in cents. */
  maxCentsFromStart: number;
  /** True once the slide has covered its ground and is on the way back. */
  wentAway: boolean;
  /** True once the exercise's effect has actually happened. */
  completed: boolean;
  /** True once the effect has been handed to the naming pipeline. */
  named: boolean;
  /** The child, or their carer, declined the microphone. */
  micDenied: boolean;
}

export function initialState(exercise: ExerciseId): VoicePlayState {
  return {
    exercise,
    phase: 'idle',
    heldMs: 0,
    lastFrameMs: null,
    phonating: false,
    pitchHz: [],
    envelope: [],
    centroidHz: [],
    onsets: [],
    startHz: null,
    maxCentsFromStart: 0,
    wentAway: false,
    completed: false,
    named: false,
    micDenied: false,
  };
}

export type VoicePlayEvent =
  /** The child pressed Start. The ONLY door out of idle. */
  | { type: 'press' }
  /** The microphone is open and the analyser is running. */
  | { type: 'micReady' }
  /** Permission was declined, or no input device exists. */
  | { type: 'micDenied' }
  /**
   * One animation frame. `pitchHz` and `centroidHz` are present only on the
   * frames that ran the spectral pass, which is throttled: a frame carrying no
   * fresh reading must not push a stale one into the history, because repeating
   * the same number would make an unsteady voice measure steady.
   */
  | { type: 'frame'; nowMs: number; rms: number; pitchHz?: number; centroidHz?: number }
  /** The child pressed Finish. */
  | { type: 'finish' }
  /** The page was hidden. Everything stops and the microphone closes. */
  | { type: 'hide' };

export interface VoicePlayStep {
  state: VoicePlayState;
  /** Discovery ids to hand the naming pipeline now. Usually empty. */
  emit: string[];
}

function pushCapped(list: number[], value: number): number[] {
  const next = list.length >= SAMPLE_CAP ? list.slice(list.length - SAMPLE_CAP + 1) : list.slice();
  next.push(value);
  return next;
}

/**
 * Advance one exercise by one event.
 *
 * Pure: no clock, no randomness, no I/O. The `nowMs` on a frame is supplied by
 * the caller, which is what lets the suite replay a ten second hold in a loop.
 */
export function stepVoicePlay(state: VoicePlayState, event: VoicePlayEvent): VoicePlayStep {
  const spec = EXERCISES[state.exercise];
  const emit: string[] = [];

  switch (event.type) {
    case 'press': {
      // The gate. Nothing anywhere in this activity may open an audio device
      // without passing through here first.
      if (state.phase !== 'idle') return { state, emit };
      return {
        state: {
          ...initialState(state.exercise),
          // Without a microphone there is nothing to wait for, so the silent
          // exercise starts holding on the press itself.
          phase: spec.needsMic ? 'armed' : 'holding',
        },
        emit,
      };
    }

    case 'micReady': {
      if (state.phase !== 'armed') return { state, emit };
      return { state: { ...state, phase: 'holding' }, emit };
    }

    case 'micDenied': {
      // Back to idle, not to an error phase. Declining the microphone is a
      // legitimate answer, and the exercise must be offerable again later.
      return { state: { ...initialState(state.exercise), micDenied: true }, emit };
    }

    case 'frame': {
      if (state.phase !== 'holding') return { state, emit };

      const dt =
        state.lastFrameMs === null
          ? 0
          : Math.max(0, Math.min(MAX_FRAME_MS, event.nowMs - state.lastFrameMs));

      const hasPitch = typeof event.pitchHz === 'number' && event.pitchHz > 0;
      // A silent exercise counts wall time. A sounding one counts only the time
      // the child is actually sounding, which is the whole point of "held".
      const sounding = spec.needsMic
        ? event.rms >= spec.noiseFloor && (!spec.requiresPitch || hasPitch || lastPitchHeld(state))
        : true;

      let next: VoicePlayState = {
        ...state,
        lastFrameMs: event.nowMs,
        phonating: sounding,
        heldMs: sounding ? state.heldMs + dt : state.heldMs,
        envelope: spec.needsMic ? pushCapped(state.envelope, event.rms) : state.envelope,
      };

      if (typeof event.pitchHz === 'number') {
        next.pitchHz = pushCapped(state.pitchHz, event.pitchHz);
        if (event.pitchHz > 0) {
          if (next.startHz === null) {
            next.startHz = event.pitchHz;
          } else {
            const cents = Math.abs(centsBetween(event.pitchHz, next.startHz));
            next.maxCentsFromStart = Math.max(next.maxCentsFromStart, cents);
            // Only the outward half is recorded here. Whether the voice came
            // BACK is read by isComplete from the latest reading, so the whole
            // slide rule sits in one place instead of half here and half there.
            if (cents >= SLIDE_SPAN_CENTS) next.wentAway = true;
          }
        }
      }

      if (typeof event.centroidHz === 'number' && event.centroidHz > 0) {
        next.centroidHz = pushCapped(state.centroidHz, event.centroidHz);
      }

      // Onsets are re-derived from the envelope rather than accumulated, so the
      // rule that finds them is the one the test suite exercises directly.
      // The envelope is sampled once per animation frame, so one frame interval
      // is the right time base for the whole of it. dt is clamped above, and
      // falls back to a nominal frame before the first interval is known.
      if (spec.id === 'soft-start' && next.envelope.length > 1) {
        const dtSeconds = dt > 0 ? dt / 1000 : 1 / 60;
        next.onsets = detectOnsets(next.envelope, dtSeconds, { floor: spec.noiseFloor });
      }

      if (!next.completed && isComplete(next)) {
        next = { ...next, completed: true, phase: 'done', named: true };
        emit.push(spec.discoveryId);
      }

      return { state: next, emit };
    }

    case 'finish': {
      if (state.phase === 'idle') return { state, emit };
      return { state: { ...state, phase: 'done', phonating: false }, emit };
    }

    case 'hide': {
      // Everything the page was doing stops, and the next run has to press
      // again. Nothing is carried over except that the microphone was declined.
      return { state: { ...initialState(state.exercise), micDenied: state.micDenied }, emit };
    }
  }
}

/**
 * Whether the last frame with a real pitch is recent enough that a momentary
 * dropout should not break the hold.
 *
 * A pitch detector loses the note for a frame or two on a vowel transition or a
 * swallow. Ending the hold there would mean nobody ever finishes.
 */
function lastPitchHeld(state: VoicePlayState): boolean {
  const recent = state.pitchHz.slice(-4);
  return recent.some((hz) => hz > 0);
}

/** The evidence readout: every number the drawing is allowed to claim. */
export interface VoicePlayMeasurements {
  heldSeconds: number;
  progress: number;
  pitchHz: number;
  pitchSteadiness: number;
  level: number;
  breathEvenness: number;
  centroidHz: number;
  centroidSpanHz: number;
  onsetCount: number;
  meanOnsetSlope: number;
  slideCents: number;
  shapeIndex: number;
}

/** Everything the six drawings are entitled to say, derived in one place. */
export function measure(state: VoicePlayState): VoicePlayMeasurements {
  const spec = EXERCISES[state.exercise];
  const centroids = rangeOf(state.centroidHz);
  const lastPitch = lastPositive(state.pitchHz);
  const slopes = state.onsets.map((o) => o.slope);

  return {
    heldSeconds: state.heldMs / 1000,
    progress: Math.max(0, Math.min(1, state.heldMs / (spec.targetSeconds * 1000))),
    pitchHz: lastPitch,
    pitchSteadiness: pitchStability(state.pitchHz.slice(-120)),
    level: state.envelope.length ? state.envelope[state.envelope.length - 1] : 0,
    breathEvenness: stability(state.envelope),
    centroidHz: lastPositive(state.centroidHz),
    centroidSpanHz: centroids.span,
    onsetCount: state.onsets.length,
    meanOnsetSlope: slopes.length ? slopes.reduce((a, b) => a + b, 0) / slopes.length : 0,
    slideCents: state.maxCentsFromStart,
    shapeIndex: shapeIndexFor(state),
  };
}

function lastPositive(values: readonly number[]): number {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] > 0) return values[i];
  return -1;
}

/** Which mouth shape the cycling exercise is on right now. */
export function shapeIndexFor(state: VoicePlayState): number {
  const spec = EXERCISES[state.exercise];
  if (spec.shapes.length <= 1) return 0;
  const index = Math.floor(state.heldMs / (spec.shapeSeconds * 1000));
  return Math.max(0, Math.min(spec.shapes.length - 1, index));
}

/**
 * Has the child produced the thing this exercise is about?
 *
 * Each branch is a separate statement about a separate exercise, deliberately
 * not an `else if` chain over shared conditions: wave 1's unreachable-discovery
 * bug was exactly such a chain.
 */
function isComplete(state: VoicePlayState): boolean {
  const spec = EXERCISES[state.exercise];
  const m = measure(state);

  switch (spec.id) {
    case 'open-and-hold':
      // Held long enough AND actually steady. Ten seconds of a wandering siren
      // is not the effect this exercise names.
      return m.heldSeconds >= spec.targetSeconds && m.pitchSteadiness >= STEADY_ENOUGH;

    case 'silent-shapes':
      return m.heldSeconds >= spec.targetSeconds;

    case 'long-low-note':
      // Length and an even breath behind it. Pitch is shown, never gated: see
      // the note at the top of this file about what "low" means for a child.
      return m.heldSeconds >= spec.targetSeconds && m.breathEvenness >= EVEN_BREATH;

    case 'soft-start':
      // Three starts, and all of them gentle. A single soft one among slams is
      // not a soft start, it is an accident.
      return (
        state.onsets.length >= SOFT_START_COUNT &&
        state.onsets.every((o) => o.slope <= SOFT_SLOPE_MAX)
      );

    case 'three-colours':
      // One note, three colours: the pitch has to have STAYED while the timbre
      // travelled. Either half alone is a different exercise.
      return (
        m.heldSeconds >= spec.targetSeconds &&
        m.pitchSteadiness >= 0.55 &&
        m.centroidSpanHz >= COLOUR_SPAN_HZ
      );

    case 'slide': {
      if (m.heldSeconds < spec.targetSeconds) return false;
      if (!state.wentAway) return false;
      if (state.startHz === null) return false;
      const current = lastPositive(state.pitchHz);
      if (current <= 0) return false;
      // Went a long way and came back. The return is what makes it a slide
      // rather than a jump, and the child hears it as one gesture.
      return Math.abs(centsBetween(current, state.startHz)) <= SLIDE_RETURN_CENTS;
    }
  }
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

/** Below this the colour is at its darkest; above the ceiling, its brightest. */
export const COLOUR_MIN_CENTROID_HZ = 300;
export const COLOUR_MAX_CENTROID_HZ = 3000;

/**
 * Where the blob sits on the dark-to-bright walk: deep blue for a dark timbre,
 * warm amber for a bright one.
 *
 * Both ends are ratios handed to `safeHue`, which is the same fold Pattern
 * Garden and Fractal Grower use and which makes the banned 270-350 band
 * unreachable rather than merely avoided. It is imported rather than copied
 * precisely so there is one fence and not two that can drift apart.
 */
export const DARK_T = 0.78;
export const BRIGHT_T = 0.16;

export function hueForCentroid(centroidHz: number): number {
  if (!(centroidHz > 0)) return safeHue(DARK_T);
  const lo = Math.log2(COLOUR_MIN_CENTROID_HZ);
  const hi = Math.log2(COLOUR_MAX_CENTROID_HZ);
  const t = Math.max(0, Math.min(1, (Math.log2(centroidHz) - lo) / (hi - lo)));
  return safeHue(DARK_T + t * (BRIGHT_T - DARK_T));
}

export { hueIsAllowed };

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

export type CopyRegister = 'child' | 'adult';

/**
 * Which register to speak in.
 *
 * The app already knows: the DPIA age gate (issue #116) records an account type
 * and an isChild flag before anything else happens. This reads that and adds
 * nothing of its own.
 *
 * An account that has not been through the gate reads as a child. That is the
 * safe direction to be wrong in: the child register is plainer and shorter, and
 * an adult reading it loses nothing but a little nuance, whereas a child handed
 * the adult register gets sentences they cannot use.
 */
export function registerFor(settings: {
  accountType: AccountType | null;
  isChild: boolean;
}): CopyRegister {
  if (settings.isChild) return 'child';
  if (settings.accountType === 'child_under_13') return 'child';
  if (settings.accountType === 'self_13_plus') return 'adult';
  if (settings.accountType === 'carer_13_plus') return 'adult';
  return 'child';
}

export interface ExerciseCopy {
  /** Card and header title. */
  title: string;
  /** One line on the card, before anything opens. */
  blurb: string;
  /** What to do, shown beside the mouth illustration. */
  cue: string;
  /** What the illustration is showing. */
  mouthNote: string;
  /** What to watch while it runs. */
  watch: string;
}

/**
 * Two registers, one set of mechanics.
 *
 * The child register is concrete and warm and contains no questions, no quiz
 * and no praise: praise for a sound a child has not made yet is the fastest way
 * to make the screen stop meaning anything. The adult register says the same
 * thing with the vocabulary an adult already has.
 *
 * Every line here is checked by the suite against the same fence the naming
 * lines pass, plus house style: no em dashes, no exclamation marks, and no
 * questions in the child register.
 */
export const COPY: Record<ExerciseId, Record<CopyRegister, ExerciseCopy>> = {
  'open-and-hold': {
    child: {
      title: 'Open and Hold',
      blurb: 'Open your mouth and hold one sound.',
      cue: 'Make a soft uh sound. Keep it going.',
      mouthNote: 'Two fingers fit between your teeth. Tongue rests low.',
      watch: 'The ring gets calmer when your sound stays on one note.',
    },
    adult: {
      title: 'Open and Hold',
      blurb: 'A vertical jaw opening and one sustained vowel.',
      cue: 'Sustain a closed uh at a comfortable pitch.',
      mouthNote: 'About two fingers of vertical opening. Tongue tip behind the lower teeth.',
      watch: 'The ring steadies as pitch variance falls. The bar is loudness.',
    },
  },
  'silent-shapes': {
    child: {
      title: 'Silent Shapes',
      blurb: 'Make the shapes with no sound at all.',
      cue: 'Move your mouth into each shape. Stay quiet.',
      mouthNote: 'Five mouth shapes, one after another.',
      watch: 'The shape changes on its own. Follow it.',
    },
    adult: {
      title: 'Silent Shapes',
      blurb: 'The vowel positions, silently, fifteen seconds each.',
      cue: 'Hold each vowel shape with no phonation.',
      mouthNote: 'Five vowel positions in sequence.',
      watch: 'Timer and shape only. The microphone stays closed for this one.',
    },
  },
  'long-low-note': {
    child: {
      title: 'Long Low Note',
      blurb: 'Hold a low sound for a long time.',
      cue: 'Make a low sound. Use a little air, not a lot.',
      mouthNote: 'Lips round and soft. Jaw loose.',
      watch: 'The line stays level when your air stays even.',
    },
    adult: {
      title: 'Long Low Note',
      blurb: 'A low sustained note on less air.',
      cue: 'Sustain a low note. Spend as little air as you can.',
      mouthNote: 'Rounded lips, released jaw.',
      watch: 'Phonation time, and how even the loudness envelope stays.',
    },
  },
  'soft-start': {
    child: {
      title: 'Soft Start',
      blurb: 'Start each sound gently.',
      cue: 'Say ah, ah, ah. Start each one softly.',
      mouthNote: 'Mouth open and relaxed. No push from the throat.',
      watch: 'Gentle starts draw round bumps. Hard starts draw spikes.',
    },
    adult: {
      title: 'Soft Start',
      blurb: 'Repeated onsets without a glottal attack.',
      cue: 'Three ah sounds, each with a gentle onset.',
      mouthNote: 'Open and released. No pressed start.',
      watch: 'Each onset is drawn from its measured rise rate.',
    },
  },
  'three-colours': {
    child: {
      title: 'Same Note, Three Colours',
      blurb: 'Keep one note and change how it sounds.',
      cue: 'Hold one note. Make it dark, then bright.',
      mouthNote: 'Mouth relaxed. Change the space inside, not the note.',
      watch: 'The ring holds still. The colour follows your sound.',
    },
    adult: {
      title: 'Same Note, Three Colours',
      blurb: 'One pitch, three timbres.',
      cue: 'Hold one pitch and move the timbre from dark to bright.',
      mouthNote: 'Relaxed position. Change resonance, not frequency.',
      watch: 'The pitch ring stays locked while the colour tracks spectral centroid.',
    },
  },
  slide: {
    child: {
      title: 'Slide Up, Slide Down',
      blurb: 'Slide your voice up high and back down.',
      cue: 'Start low. Slide up. Slide back down.',
      mouthNote: 'Mouth open and easy the whole way.',
      watch: 'Your slide draws itself as a line.',
    },
    adult: {
      title: 'Slide Up, Slide Down',
      blurb: 'A glide up and back on one breath.',
      cue: 'Glide from low to high and back down again.',
      mouthNote: 'Open and unforced throughout.',
      watch: 'The pitch contour is drawn from the detected fundamental.',
    },
  },
};

/**
 * The lines that are not about any one exercise.
 *
 * These were hard-coded in the component until the gate on #241 pointed out
 * what that meant: the microphone sentence, the privacy note, the line a child
 * sees when permission is declined and the sentence said at the end of a drill
 * are all read by a child, and none of them were passing the fence that every
 * line in COPY above passes. A string a child reads belongs where the tests can
 * reach it, and there is no second rule for strings that happen to sit outside
 * a switch.
 *
 * The wording is unchanged from the component. Only its address moved.
 */
export interface ActivityCopy {
  /** Above the list of six, before anything is chosen. */
  intro: string;
  /** The one plain line shown before the permission sheet can appear. */
  micPrompt: string;
  /** Shown instead, on the one exercise that never opens the microphone. */
  noMicNote: string;
  /** Shown when the microphone was declined. Never a scold, never a retry. */
  micDenied: string;
  /** The standing note, on the list and on every exercise. */
  privacyNote: string;
  /** Said after a held exercise. `{seconds}` is the time held. */
  heldSummary: string;
  /** Said after Silent Shapes. `{seconds}` is the time worked through. */
  shapesSummary: string;
}

/**
 * Said the same way in both registers.
 *
 * What the microphone does, and what the app does not do with it, is one fact
 * with one plainest wording, and an adult reading the child's wording of it
 * loses nothing. Written once rather than twice on purpose: two copies of a
 * promise about a microphone are two copies that can drift apart, and the one
 * that drifts is the one nobody reads.
 */
const SHARED_ACTIVITY_COPY: Omit<ActivityCopy, 'intro'> = {
  micPrompt:
    'Start opens the microphone so the screen can follow your sound. Your device will ask first. Nothing is recorded and nothing is sent anywhere.',
  noMicNote: 'This one makes no sound, so the microphone stays closed.',
  micDenied:
    'The microphone stayed closed, so this exercise cannot draw your sound. Silent Shapes works without it.',
  privacyNote:
    'Your voice is listened to on this device only, while an exercise is running. Nothing is recorded, nothing is uploaded, and the camera is never used.',
  heldSummary: 'You held it for {seconds} seconds.',
  shapesSummary: 'You worked through the shapes for {seconds} seconds.',
};

export const ACTIVITY_COPY: Record<CopyRegister, ActivityCopy> = {
  child: {
    intro: 'Pick one. Make the shape, hold the sound, and watch what your voice does.',
    ...SHARED_ACTIVITY_COPY,
  },
  adult: {
    intro:
      'Pick a drill. Set the mouth position, sustain the sound, and read what the screen measured.',
    ...SHARED_ACTIVITY_COPY,
  },
};

/** The exercise list, in the order the page offers them. */
export function exercisesInOrder(): ExerciseSpec[] {
  return EXERCISE_IDS.map((id) => EXERCISES[id]);
}

/** Every discovery id this activity can emit. Held to guided-naming by a test. */
export const VOICE_PLAY_DISCOVERIES = EXERCISE_IDS.map((id) => EXERCISES[id].discoveryId);
