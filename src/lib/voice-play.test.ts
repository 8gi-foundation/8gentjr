// @ts-nocheck - bun:test types not wired to main tsconfig; run with `bun test`
/**
 * Tests for the Voice Play exercise machine (issue #238).
 *
 * Three properties are made mechanical here rather than promised in a comment:
 *
 *   1. NOTHING LEAVES IDLE WITHOUT A PRESS. Every event except `press` is a
 *      no-op on a fresh state. This is the microphone gate, stated once, in the
 *      one place that cannot be bypassed by a component refactor.
 *
 *   2. HELD TIME IS SOUND, NOT WALL CLOCK. Frames below the noise floor add
 *      nothing, a stalled tab adds at most one frame, and a child who stops
 *      halfway keeps what they held rather than being reset or credited.
 *
 *   3. EVERY EXERCISE IS COMPLETABLE, AND ONLY BY DOING IT. Each one has a
 *      sequence that names it and a near-miss sequence that does not.
 */
import { describe, expect, test } from 'bun:test';
import {
  BRIGHT_T,
  COLOUR_SPAN_HZ,
  COPY,
  DARK_T,
  EXERCISES,
  EXERCISE_IDS,
  MAX_FRAME_MS,
  SAMPLE_CAP,
  SILENT_SHAPE_SECONDS,
  SLIDE_RETURN_CENTS,
  SLIDE_SPAN_CENTS,
  SOFT_SLOPE_MAX,
  SOFT_START_COUNT,
  VOICE_PLAY_DISCOVERIES,
  exercisesInOrder,
  hueForCentroid,
  hueIsAllowed,
  initialState,
  measure,
  registerFor,
  shapeIndexFor,
  stepVoicePlay,
  type ExerciseId,
  type VoicePlayEvent,
  type VoicePlayState,
} from './voice-play';
import { BANNED_TERMS, getDiscoveries, getNamingLine } from './guided-naming';

const FRAME_MS = 1000 / 60;

/** Run a list of events through the machine, collecting everything it emitted. */
function run(
  state: VoicePlayState,
  events: VoicePlayEvent[],
): { state: VoicePlayState; emitted: string[] } {
  let s = state;
  const emitted: string[] = [];
  for (const e of events) {
    const step = stepVoicePlay(s, e);
    s = step.state;
    emitted.push(...step.emit);
  }
  return { state: s, emitted };
}

/** A started exercise with its microphone open. */
function started(id: ExerciseId): VoicePlayState {
  return run(initialState(id), [{ type: 'press' }, { type: 'micReady' }]).state;
}

/** `count` frames of steady sound, starting at `fromMs`. */
function holdFrames(
  count: number,
  opts: { fromMs?: number; rms?: number; hz?: number; centroidHz?: number } = {},
): VoicePlayEvent[] {
  const { fromMs = 0, rms = 0.08, hz = 220, centroidHz } = opts;
  const out: VoicePlayEvent[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      type: 'frame',
      nowMs: fromMs + i * FRAME_MS,
      rms,
      // The spectral pass is throttled to roughly 20 Hz, exactly as the
      // component throttles it, so the history it builds is the real one.
      ...(i % 3 === 0 ? { pitchHz: hz } : {}),
      ...(i % 3 === 0 && centroidHz !== undefined ? { centroidHz } : {}),
    });
  }
  return out;
}

const framesFor = (seconds: number) => Math.ceil((seconds * 1000) / FRAME_MS) + 4;

// ---------------------------------------------------------------------------

describe('the mount gate', () => {
  test('a fresh state is idle for every exercise', () => {
    for (const id of EXERCISE_IDS) {
      expect(initialState(id).phase).toBe('idle');
    }
  });

  test('nothing but a press moves it out of idle', () => {
    for (const id of EXERCISE_IDS) {
      const fresh = initialState(id);
      const events: VoicePlayEvent[] = [
        { type: 'micReady' },
        { type: 'frame', nowMs: 0, rms: 0.4, pitchHz: 220, centroidHz: 900 },
        { type: 'frame', nowMs: 1000, rms: 0.4, pitchHz: 220, centroidHz: 900 },
        { type: 'finish' },
        { type: 'hide' },
      ];
      for (const e of events) {
        const step = stepVoicePlay(fresh, e);
        expect(step.state.phase, `${id} left idle on ${e.type}`).toBe('idle');
        expect(step.emit.length, `${id} named something on ${e.type}`).toBe(0);
      }
    }
  });

  test('a press on a microphone exercise waits, armed, for the microphone', () => {
    const s = stepVoicePlay(initialState('open-and-hold'), { type: 'press' }).state;
    expect(s.phase).toBe('armed');
    // Frames arriving before micReady must not accumulate anything.
    const after = run(s, holdFrames(60)).state;
    expect(after.heldMs).toBe(0);
    expect(after.phase).toBe('armed');
  });

  test('the silent exercise never waits for a microphone, because it opens none', () => {
    expect(EXERCISES['silent-shapes'].needsMic).toBe(false);
    const s = stepVoicePlay(initialState('silent-shapes'), { type: 'press' }).state;
    expect(s.phase).toBe('holding');
  });

  test('exactly one exercise opens the microphone-free path', () => {
    const silent = EXERCISE_IDS.filter((id) => !EXERCISES[id].needsMic);
    expect(silent).toEqual(['silent-shapes']);
  });

  test('a declined microphone returns to idle and is remembered', () => {
    const s = run(initialState('open-and-hold'), [{ type: 'press' }, { type: 'micDenied' }]).state;
    expect(s.phase).toBe('idle');
    expect(s.micDenied).toBe(true);
  });

  test('hiding the page resets everything back to idle mid-hold', () => {
    const held = run(started('open-and-hold'), holdFrames(120)).state;
    expect(held.heldMs).toBeGreaterThan(1500);
    const hidden = stepVoicePlay(held, { type: 'hide' }).state;
    expect(hidden.phase).toBe('idle');
    expect(hidden.heldMs).toBe(0);
    expect(hidden.pitchHz.length).toBe(0);
  });

  test('a second press cannot restart an exercise that is already running', () => {
    const held = run(started('open-and-hold'), holdFrames(60)).state;
    const again = stepVoicePlay(held, { type: 'press' }).state;
    expect(again.heldMs).toBe(held.heldMs);
  });
});

describe('held time', () => {
  test('accumulates only while the sound is above the noise floor', () => {
    const floor = EXERCISES['open-and-hold'].noiseFloor;
    const quiet = run(
      started('open-and-hold'),
      holdFrames(120, { rms: floor / 2 }),
    ).state;
    expect(quiet.heldMs).toBe(0);

    const loud = run(started('open-and-hold'), holdFrames(120, { rms: floor * 8 })).state;
    expect(loud.heldMs / 1000).toBeCloseTo(120 * (FRAME_MS / 1000), 1);
  });

  test('silence in the middle pauses the meter without losing what was held', () => {
    let s = started('open-and-hold');
    s = run(s, holdFrames(60)).state;
    const afterSound = s.heldMs;
    s = run(s, holdFrames(60, { fromMs: 60 * FRAME_MS, rms: 0.0001, hz: -1 })).state;
    expect(s.heldMs).toBe(afterSound);
    expect(s.phonating).toBe(false);
  });

  test('a stalled tab contributes at most one clamped frame', () => {
    let s = started('open-and-hold');
    s = stepVoicePlay(s, { type: 'frame', nowMs: 0, rms: 0.08, pitchHz: 220 }).state;
    s = stepVoicePlay(s, { type: 'frame', nowMs: 30000, rms: 0.08, pitchHz: 220 }).state;
    expect(s.heldMs).toBeLessThanOrEqual(MAX_FRAME_MS);
  });

  test('a one frame pitch dropout does not break a hold', () => {
    let s = started('open-and-hold');
    s = run(s, holdFrames(30)).state;
    const before = s.heldMs;
    s = stepVoicePlay(s, {
      type: 'frame',
      nowMs: 30 * FRAME_MS,
      rms: 0.08,
      pitchHz: -1,
    }).state;
    expect(s.heldMs).toBeGreaterThan(before);
  });

  test('history is capped, so a long hold cannot grow without bound', () => {
    const s = run(started('open-and-hold'), holdFrames(SAMPLE_CAP * 2 + 100)).state;
    expect(s.envelope.length).toBeLessThanOrEqual(SAMPLE_CAP);
    expect(s.pitchHz.length).toBeLessThanOrEqual(SAMPLE_CAP);
  });

  test('a frame with no fresh pitch does not push a stale reading into history', () => {
    // Repeating the last value would make an unsteady voice measure steady,
    // which is the exact lie the ring must not tell.
    const s = run(started('open-and-hold'), holdFrames(30)).state;
    expect(s.pitchHz.length).toBe(10);
  });
});

describe('1. Open and Hold', () => {
  test('ten steady seconds names Steady, once', () => {
    const { state, emitted } = run(started('open-and-hold'), [
      ...holdFrames(framesFor(10.5), { hz: 220 }),
    ]);
    expect(emitted).toEqual(['steady']);
    expect(state.phase).toBe('done');
    expect(measure(state).pitchSteadiness).toBeGreaterThan(0.9);
  });

  test('ten seconds of a wandering siren does not name Steady', () => {
    let s = started('open-and-hold');
    const events: VoicePlayEvent[] = [];
    for (let i = 0; i < framesFor(12); i++) {
      events.push({
        type: 'frame',
        nowMs: i * FRAME_MS,
        rms: 0.08,
        // Swinging a fifth up and down: plainly held, plainly not steady.
        ...(i % 3 === 0 ? { pitchHz: i % 30 < 15 ? 220 : 330 } : {}),
      });
    }
    const { state, emitted } = run(s, events);
    expect(emitted).toEqual([]);
    expect(state.phase).toBe('holding');
    expect(measure(state).pitchSteadiness).toBeLessThan(0.6);
  });

  test('nine steady seconds is not yet ten', () => {
    const { emitted } = run(started('open-and-hold'), holdFrames(framesFor(9) - 8));
    expect(emitted).toEqual([]);
  });

  test('the card never comes twice, even if frames keep arriving', () => {
    const { emitted } = run(started('open-and-hold'), holdFrames(framesFor(25)));
    expect(emitted).toEqual(['steady']);
  });
});

describe('2. Silent Shapes', () => {
  test('walks the five shapes in order and names Shapes at the end', () => {
    const spec = EXERCISES['silent-shapes'];
    let s = stepVoicePlay(initialState('silent-shapes'), { type: 'press' }).state;

    const seen: number[] = [];
    const emitted: string[] = [];
    const total = framesFor(spec.targetSeconds + 1);
    for (let i = 0; i < total; i++) {
      const step = stepVoicePlay(s, { type: 'frame', nowMs: i * FRAME_MS, rms: 0 });
      s = step.state;
      emitted.push(...step.emit);
      seen.push(shapeIndexFor(s));
    }

    expect(emitted).toEqual(['shapes']);
    expect(new Set(seen).size).toBe(spec.shapes.length);
    // Monotonic: the sequence walks forward and never jumps back.
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
  });

  test('silence counts, because there is nothing to listen to', () => {
    let s = stepVoicePlay(initialState('silent-shapes'), { type: 'press' }).state;
    s = run(s, holdFrames(60, { rms: 0 })).state;
    expect(s.heldMs).toBeGreaterThan(900);
  });

  test('each shape gets its own stretch of the timer', () => {
    const spec = EXERCISES['silent-shapes'];
    expect(spec.shapeSeconds).toBe(SILENT_SHAPE_SECONDS);
    expect(spec.targetSeconds).toBe(SILENT_SHAPE_SECONDS * spec.shapes.length);
  });
});

describe('3. Long Low Note', () => {
  test('twelve seconds on an even breath names Long and low', () => {
    const { emitted } = run(started('long-low-note'), holdFrames(framesFor(12.5), { hz: 110 }));
    expect(emitted).toEqual(['long-and-low']);
  });

  test('a note that gasps and surges is long but not even, and is not named', () => {
    let s = started('long-low-note');
    const events: VoicePlayEvent[] = [];
    for (let i = 0; i < framesFor(15); i++) {
      events.push({
        type: 'frame',
        nowMs: i * FRAME_MS,
        // Alternating between just-audible and shouting: the breath is not
        // being spent evenly, which is the thing this exercise is about.
        rms: i % 20 < 10 ? 0.012 : 0.4,
        ...(i % 3 === 0 ? { pitchHz: 110 } : {}),
      });
    }
    const { state, emitted } = run(s, events);
    expect(emitted).toEqual([]);
    expect(measure(state).breathEvenness).toBeLessThan(0.5);
  });

  test('pitch is measured and shown, but is deliberately not a gate', () => {
    // A child holding 300 Hz has done this exercise. An adult holding 90 Hz has
    // done the same exercise. Neither is told they failed.
    for (const hz of [90, 300]) {
      const { emitted } = run(started('long-low-note'), holdFrames(framesFor(12.5), { hz }));
      expect(emitted, `${hz} Hz was gated out`).toEqual(['long-and-low']);
    }
  });
});

describe('4. Soft Start', () => {
  /** Three bursts whose rise takes `riseFrames` frames each. */
  function bursts(riseFrames: number): VoicePlayEvent[] {
    const events: VoicePlayEvent[] = [];
    let frame = 0;
    const push = (rms: number) => {
      events.push({ type: 'frame', nowMs: frame * FRAME_MS, rms });
      frame++;
    };
    push(0);
    push(0);
    for (let b = 0; b < 3; b++) {
      for (let i = 1; i <= riseFrames; i++) push((0.12 * i) / riseFrames);
      for (let i = 0; i < 12; i++) push(0.12);
      for (let i = 0; i < 12; i++) push(0);
    }
    return events;
  }

  test('three gentle starts name Soft start', () => {
    const { state, emitted } = run(started('soft-start'), bursts(10));
    expect(state.onsets.length).toBe(SOFT_START_COUNT);
    expect(measure(state).meanOnsetSlope).toBeLessThan(SOFT_SLOPE_MAX);
    expect(emitted).toEqual(['soft-start']);
  });

  test('three slammed starts do not', () => {
    const { state, emitted } = run(started('soft-start'), bursts(1));
    expect(state.onsets.length).toBe(SOFT_START_COUNT);
    expect(measure(state).meanOnsetSlope).toBeGreaterThan(SOFT_SLOPE_MAX);
    expect(emitted).toEqual([]);
  });

  test('two gentle starts are not three', () => {
    const events = bursts(10);
    // Cut the last burst off before its rise.
    const { emitted } = run(started('soft-start'), events.slice(0, 60));
    expect(emitted).toEqual([]);
  });

  test('one slam among gentle starts spoils it, which is the point', () => {
    const events: VoicePlayEvent[] = [];
    let frame = 0;
    const push = (rms: number) => {
      events.push({ type: 'frame', nowMs: frame * FRAME_MS, rms });
      frame++;
    };
    push(0);
    push(0);
    for (let b = 0; b < 3; b++) {
      const rise = b === 1 ? 1 : 10;
      for (let i = 1; i <= rise; i++) push((0.12 * i) / rise);
      for (let i = 0; i < 12; i++) push(0.12);
      for (let i = 0; i < 12; i++) push(0);
    }
    const { state, emitted } = run(started('soft-start'), events);
    expect(state.onsets.length).toBe(3);
    expect(emitted).toEqual([]);
  });
});

describe('5. Same Note, Three Colours', () => {
  /** One held pitch while the centroid walks from dark to bright. */
  function walkColour(spanHz: number, hzSeries?: (i: number) => number): VoicePlayEvent[] {
    const events: VoicePlayEvent[] = [];
    const total = framesFor(10);
    for (let i = 0; i < total; i++) {
      events.push({
        type: 'frame',
        nowMs: i * FRAME_MS,
        rms: 0.08,
        ...(i % 3 === 0
          ? {
              pitchHz: hzSeries ? hzSeries(i) : 220,
              centroidHz: 500 + (spanHz * i) / total,
            }
          : {}),
      });
    }
    return events;
  }

  test('one held note whose colour travels names Same note, new colour', () => {
    const { state, emitted } = run(started('three-colours'), walkColour(COLOUR_SPAN_HZ * 2));
    expect(emitted).toEqual(['new-colour']);
    expect(measure(state).centroidSpanHz).toBeGreaterThan(COLOUR_SPAN_HZ);
  });

  test('a held note whose colour never moves is not it', () => {
    const { emitted } = run(started('three-colours'), walkColour(20));
    expect(emitted).toEqual([]);
  });

  test('a colour walk that drags the pitch with it is not it either', () => {
    // Sliding up while brightening is the mistake the exercise exists to show.
    const { emitted } = run(
      started('three-colours'),
      walkColour(COLOUR_SPAN_HZ * 2, (i) => 220 * Math.pow(2, i / 900)),
    );
    expect(emitted).toEqual([]);
  });
});

describe('6. Slide Up, Slide Down', () => {
  /** Up by `cents` and back to the start, over the exercise duration. */
  function glide(cents: number, returnToStart: boolean): VoicePlayEvent[] {
    const events: VoicePlayEvent[] = [];
    const total = framesFor(8);
    for (let i = 0; i < total; i++) {
      const t = i / (total - 1);
      const shape = returnToStart ? Math.sin(Math.PI * t) : t;
      events.push({
        type: 'frame',
        nowMs: i * FRAME_MS,
        rms: 0.08,
        ...(i % 3 === 0 ? { pitchHz: 150 * Math.pow(2, (cents * shape) / 1200) } : {}),
      });
    }
    return events;
  }

  test('up a long way and back names Slide', () => {
    const { state, emitted } = run(started('slide'), glide(SLIDE_SPAN_CENTS + 300, true));
    expect(emitted).toEqual(['slide']);
    expect(measure(state).slideCents).toBeGreaterThan(SLIDE_SPAN_CENTS);
  });

  test('a small wobble is not a slide', () => {
    const { emitted } = run(started('slide'), glide(200, true));
    expect(emitted).toEqual([]);
  });

  test('going up and staying up is not a slide, because it never came back', () => {
    const { state, emitted } = run(started('slide'), glide(SLIDE_SPAN_CENTS + 300, false));
    expect(state.wentAway).toBe(true);
    expect(emitted).toEqual([]);
  });

  test('the return tolerance is a real tolerance, not an exact match', () => {
    expect(SLIDE_RETURN_CENTS).toBeGreaterThan(100);
    expect(SLIDE_RETURN_CENTS).toBeLessThan(SLIDE_SPAN_CENTS);
  });
});

describe('colour fence', () => {
  test('no centroid anywhere produces a banned hue', () => {
    for (let hz = 0; hz <= 12000; hz += 1) {
      expect(hueIsAllowed(hueForCentroid(hz)), `${hz} Hz produced ${hueForCentroid(hz)}`).toBe(true);
    }
  });

  test('nonsense input still produces an allowed hue rather than NaN', () => {
    for (const hz of [-1, 0, Number.NaN, Number.POSITIVE_INFINITY]) {
      const h = hueForCentroid(hz);
      expect(Number.isFinite(h)).toBe(true);
      expect(hueIsAllowed(h)).toBe(true);
    }
  });

  test('brighter sound really is a different colour, not a shade of the same one', () => {
    const dark = hueForCentroid(400);
    const bright = hueForCentroid(2800);
    expect(Math.abs(dark - bright)).toBeGreaterThan(60);
  });

  test('the walk is continuous, so the colour never snaps mid-note', () => {
    let prev = hueForCentroid(200);
    for (let hz = 201; hz <= 6000; hz++) {
      const h = hueForCentroid(hz);
      expect(Math.abs(h - prev)).toBeLessThan(1);
      prev = h;
    }
  });

  test('the ends of the walk are the ends we chose', () => {
    expect(DARK_T).toBeGreaterThan(BRIGHT_T);
  });
});

describe('copy registers', () => {
  test('the age gate picks the register, and an ungated account reads as a child', () => {
    expect(registerFor({ accountType: null, isChild: false })).toBe('child');
    expect(registerFor({ accountType: 'child_under_13', isChild: true })).toBe('child');
    expect(registerFor({ accountType: 'self_13_plus', isChild: false })).toBe('adult');
    expect(registerFor({ accountType: 'carer_13_plus', isChild: false })).toBe('adult');
  });

  test('isChild wins over the account type, whatever the account type says', () => {
    expect(registerFor({ accountType: 'self_13_plus', isChild: true })).toBe('child');
  });

  test('every exercise has both registers filled in', () => {
    for (const id of EXERCISE_IDS) {
      for (const register of ['child', 'adult'] as const) {
        const copy = COPY[id][register];
        for (const [field, value] of Object.entries(copy)) {
          expect(value.trim().length, `${id}/${register}/${field} is empty`).toBeGreaterThan(0);
        }
      }
    }
  });

  test('no copy line contains a banned term', () => {
    for (const id of EXERCISE_IDS) {
      for (const register of ['child', 'adult'] as const) {
        for (const [field, value] of Object.entries(COPY[id][register])) {
          for (const term of BANNED_TERMS) {
            const pattern = new RegExp(
              `\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
              'i',
            );
            expect(pattern.test(value), `${id}/${register}/${field}: "${value}"`).toBe(false);
          }
        }
      }
    }
  });

  test('no em dashes anywhere in the copy', () => {
    for (const id of EXERCISE_IDS) {
      for (const register of ['child', 'adult'] as const) {
        for (const value of Object.values(COPY[id][register])) {
          expect(value).not.toContain('—');
        }
      }
    }
  });

  test('the child register asks no questions and shouts nothing', () => {
    for (const id of EXERCISE_IDS) {
      for (const value of Object.values(COPY[id].child)) {
        expect(value, `${id}: "${value}"`).not.toContain('?');
        expect(value, `${id}: "${value}"`).not.toContain('!');
      }
    }
  });

  test('no register praises a sound that has not happened yet', () => {
    const praise = /\b(amazing|brilliant|perfect|great job|well done|awesome|fantastic)\b/i;
    for (const id of EXERCISE_IDS) {
      for (const register of ['child', 'adult'] as const) {
        for (const value of Object.values(COPY[id][register])) {
          expect(praise.test(value), `${id}/${register}: "${value}"`).toBe(false);
        }
      }
    }
  });
});

describe('registration in the naming pipeline', () => {
  test('every exercise discovery id resolves to a real naming line', () => {
    for (const id of EXERCISE_IDS) {
      const discoveryId = EXERCISES[id].discoveryId;
      for (const stage of [1, 2, 3, 4, 5, 6]) {
        const line = getNamingLine('voice-play', discoveryId, stage);
        expect(line, `${discoveryId} has no line at stage ${stage}`).toBeTruthy();
      }
    }
  });

  test('the registry has no lines for effects this activity cannot produce', () => {
    const authored = getDiscoveries('voice-play').map((d) => d.id).sort();
    expect(authored).toEqual([...VOICE_PLAY_DISCOVERIES].sort());
  });

  test('no two exercises share a discovery id', () => {
    expect(new Set(VOICE_PLAY_DISCOVERIES).size).toBe(EXERCISE_IDS.length);
  });

  test('the page offers all six, in the authored order', () => {
    expect(exercisesInOrder().map((e) => e.id)).toEqual([...EXERCISE_IDS]);
    expect(EXERCISE_IDS.length).toBe(6);
  });
});
