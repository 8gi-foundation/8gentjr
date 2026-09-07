/**
 * 8gent Jr - rhythm maths for the Beat lesson.
 *
 * One ring is one whole. Split it into 2 and each part is a half; split it
 * into 3 and each part is a third. A child does not need the word "fraction"
 * to feel that thirds are shorter than halves, because thirds arrive sooner.
 *
 * Everything here is time to position and position to time, plus the judgement
 * of whether a tap landed on a beat. It is pure, so the awkward parts (wrap
 * around at the top of the ring, taps that are early rather than late) can be
 * pinned down in tests instead of guessed at on a device.
 */

/** How many equal parts a ring can be split into. Kept small and singable. */
export const SPLITS = [2, 3, 4, 6] as const;
export type Split = (typeof SPLITS)[number];

/** Seconds per whole ring at a given tempo, where tempo is 0 (slow) to 1. */
export function ringSeconds(tempo: number): number {
  const t = Math.min(1, Math.max(0, Number.isNaN(tempo) ? 0 : tempo));
  // 4.5s at the slow end down to 1.5s at the quick end. Slower than an adult
  // would pick: a child tapping along needs room to arrive.
  return 4.5 - t * 3;
}

/** Position around the ring, 0 at the top, wrapping at 1. */
export function ringPhase(elapsedSeconds: number, tempo: number): number {
  const period = ringSeconds(tempo);
  const raw = (elapsedSeconds % period) / period;
  return raw < 0 ? raw + 1 : raw;
}

/** Which part of the ring the playhead is in, 0 to split - 1. */
export function segmentAt(phase: number, split: Split): number {
  const p = ((phase % 1) + 1) % 1;
  return Math.min(split - 1, Math.floor(p * split));
}

/** Seconds one part lasts. This is the fraction, felt as a duration. */
export function segmentSeconds(tempo: number, split: Split): number {
  return ringSeconds(tempo) / split;
}

/**
 * How far a tap was from the nearest beat, as a fraction of one part.
 * 0 is dead on, 0.5 is as far away as it is possible to be. Wrapping is
 * handled, so a tap just before the top of the ring counts as early for the
 * beat at the top rather than very late for the last beat.
 */
export function tapOffset(phase: number, split: Split): number {
  const p = ((phase % 1) + 1) % 1;
  const parts = p * split;
  const distance = Math.abs(parts - Math.round(parts));
  return distance;
}

/** Tolerance for "on the beat". Generous by design, and wider when slow. */
export function tapTolerance(calmMode: boolean): number {
  return calmMode ? 0.3 : 0.22;
}

export type TapVerdict = 'on' | 'near' | 'off';

/**
 * Judge a tap. There is no failure state: "off" simply means the tap was not
 * close enough to count towards a guided step, and it is still answered with
 * a sound so the child knows the app felt it.
 */
export function judgeTap(phase: number, split: Split, calmMode = false): TapVerdict {
  const offset = tapOffset(phase, split);
  const tolerance = tapTolerance(calmMode);
  if (offset <= tolerance * 0.55) return 'on';
  if (offset <= tolerance) return 'near';
  return 'off';
}

/** Which beat a tap belongs to, so tapping only the accented one can count. */
export function nearestBeat(phase: number, split: Split): number {
  const p = ((phase % 1) + 1) % 1;
  return Math.round(p * split) % split;
}

/** Plain words for a split. Shown and spoken instead of "1/3". */
export function splitWords(split: Split): string {
  switch (split) {
    case 2:
      return 'Two halves';
    case 3:
      return 'Three thirds';
    case 4:
      return 'Four quarters';
    case 6:
      return 'Six sixths';
  }
}

/** A count-in phrase for the split, the way an adult would say it out loud. */
export function countPhrase(split: Split): string {
  return Array.from({ length: split }, (_, i) => (i === 0 ? 'ONE' : String(i + 1))).join(' ');
}

/**
 * Pitch for one beat. The accented first beat sits lowest, so the ear hears
 * the ring start again rather than hearing a run of identical clicks.
 */
export function beatPitch(beat: number, split: Split, base = 330): number {
  if (beat === 0) return base * 0.5;
  const step = Math.min(beat, split - 1);
  return base * (1 + step * 0.18);
}
