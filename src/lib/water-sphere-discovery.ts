/**
 * Water Sphere: when the naming line is earned, as a pure reducer.
 *
 * WHY THIS IS NOT INSIDE THE COMPONENT
 *
 * In wave 1 the decision of when a child had produced an effect lived inline in
 * each canvas component, and two of those decisions were wrong in ways no test
 * could see. A branch in the light mixer made one discovery unreachable, and
 * both scanning activities recorded an effect from their opening frame, so a
 * naming line was on screen before the child had touched anything. The wave-1
 * test suite stayed green through both, because it only ever checked that the
 * authored lines resolve. Predicate reachability was never covered, and the
 * repo has no DOM test harness to cover it with.
 *
 * So for this game the predicates are not in the component. They are here, as a
 * reducer over events, with no React and no DOM in sight, and the test suite
 * drives real event sequences through them. Three properties are now mechanical
 * rather than hoped for:
 *
 *   1. NOTHING NAMES BEFORE THE CHILD ACTS. The drop starts on a locked mode on
 *      purpose, because a still, beautiful, already-resonating drop is the
 *      right thing to open on. That makes the mount bug live and easy to
 *      reintroduce, and so it is worth a test: no run of `observe` events, at
 *      any frequency, emits anything until an `interact` event has arrived.
 *
 *   2. EVERY AUTHORED DISCOVERY IS REACHABLE. The suite finds a real sequence
 *      for each one. A discovery that no path can reach fails here.
 *
 *   3. NOTHING NAMES TWICE. Anti-engagement: one line per effect, ever.
 *
 * Issue: #225 (wave 3, Water Sphere)
 */

import { CHURN_THRESHOLD, readMode } from '@/lib/water-sphere';

/** Discovery ids this game can record. Must match the guided-naming registry. */
export const WATER_SPHERE_DISCOVERIES = [
  'mode-locked',
  'higher-more-petals',
  'poked-rings',
  'between-is-messy',
] as const;

export type WaterSphereDiscoveryId = (typeof WATER_SPHERE_DISCOVERIES)[number];

export type WaterSphereEvent =
  /** The child touched, dragged or keyed something. Any real input. */
  | { type: 'interact' }
  /**
   * The frequency has been held steady long enough to judge what the surface
   * settled into. Emitted by the component on a debounce, never every frame:
   * a child sweeping the slider passes through every mode in half a second and
   * should not collect four sentences for it.
   */
  | { type: 'observe'; hz: number }
  /** The child poked the drop and it rang. */
  | { type: 'poke' };

export interface WaterSphereDiscoveryState {
  /** True once the child has actually done something. Gates every emission. */
  interacted: boolean;
  /** Effects already named. Never emitted a second time. */
  named: ReadonlySet<WaterSphereDiscoveryId>;
  /** Lowest and highest mode degree the child has held steady. */
  lowestLockedL: number | null;
  highestLockedL: number | null;
  /** True once the child has sat in a properly churning stretch between modes. */
  sawChurn: boolean;
}

export function initialDiscoveryState(): WaterSphereDiscoveryState {
  return {
    interacted: false,
    named: new Set(),
    lowestLockedL: null,
    highestLockedL: null,
    sawChurn: false,
  };
}

/**
 * How far apart two locked modes must be before "higher made more petals" is
 * something the child has actually seen. Adjacent modes differ by one nodal
 * line, which is a real but subtle change; two apart is unmistakable on screen.
 */
export const PETAL_SPREAD = 2;

export interface DiscoveryStep {
  state: WaterSphereDiscoveryState;
  /** Ids to name now, in order. Empty on most steps, which is the normal case. */
  emit: WaterSphereDiscoveryId[];
}

/**
 * Advance the state by one event and say what, if anything, to name.
 *
 * Pure. Same state and event in, same result out, no clock and no randomness,
 * which is what makes the sequences in the test suite meaningful.
 */
export function stepDiscovery(
  state: WaterSphereDiscoveryState,
  event: WaterSphereEvent,
): DiscoveryStep {
  const emit: WaterSphereDiscoveryId[] = [];
  const named = new Set(state.named);
  let next: WaterSphereDiscoveryState = { ...state, named };

  const name = (id: WaterSphereDiscoveryId) => {
    if (named.has(id)) return;
    named.add(id);
    emit.push(id);
  };

  switch (event.type) {
    case 'interact':
      next = { ...next, interacted: true };
      break;

    case 'poke':
      // A poke IS the child acting, so it opens the gate and earns its line in
      // the same step. This is the one effect that needs no settling time:
      // they touched it, it rang, that is the whole thing.
      next = { ...next, interacted: true };
      name('poked-rings');
      break;

    case 'observe': {
      // The gate. Frames at mount, and frames while a carer is setting the
      // activity up, describe a drop nobody has touched. Nothing is named for
      // a shape the child did not put there.
      if (!next.interacted) break;

      const reading = readMode(event.hz);

      if (reading.locked) {
        const l = reading.mode.l;
        const lowest = next.lowestLockedL === null ? l : Math.min(next.lowestLockedL, l);
        const highest = next.highestLockedL === null ? l : Math.max(next.highestLockedL, l);
        next = { ...next, lowestLockedL: lowest, highestLockedL: highest };

        // Recorded independently of each other. Wave 1's bug was an `else if`
        // chain that made a later branch unreachable once an earlier one hit,
        // so these are deliberately three separate statements.
        name('mode-locked');

        if (highest - lowest >= PETAL_SPREAD) name('higher-more-petals');

        // Only after they have felt the contrast. Naming the churn before the
        // child has ever seen the water hold still describes a mess, not a
        // discovery. Order matters and it is this way round on purpose.
        if (next.sawChurn) name('between-is-messy');
      } else if (reading.lock <= CHURN_THRESHOLD) {
        // Sitting in a genuinely churning stretch, not merely near-miss. Nothing
        // is named for this on its own: it becomes a discovery once the child
        // finds a shape again and the difference lands.
        next = { ...next, sawChurn: true };
      }
      break;
    }
  }

  return { state: next, emit };
}
