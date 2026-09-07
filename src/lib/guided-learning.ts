/**
 * 8gent Jr - guided learning through doing.
 *
 * A guided lesson is a short list of things to *do*, not a list of things to
 * read. A step is never marked complete by pressing "next": it completes when
 * the child actually reaches the state the step describes (the wave really is
 * tall, both rules really are the same number). The lesson watches the live
 * parameters and notices.
 *
 * Design rules that come out of that:
 *   - No wrong answers and no scoring. A step is either not yet reached or
 *     reached, and there is no penalty for wandering off task.
 *   - Free play never locks. Every control stays live at every step, so a
 *     child who ignores the prompt entirely is still using the lesson.
 *   - Progress persists per device, so a lesson resumes where it stopped.
 *   - Steps can be skipped. A prompt a child cannot do today is not a wall.
 *
 * This module is the pure part: step shape, ordering and persistence. The
 * React side lives in components/math/GuidedSteps.tsx.
 */

export interface GuidedStep {
  /** Stable id. Persisted, so do not renumber steps that already shipped. */
  id: string;
  /** What to do, in a child's words. One action, present tense. */
  prompt: string;
  /** Optional nudge, shown after a while on the same step. */
  hint?: string;
  /** Said back when the step completes. Keep it short and warm. */
  praise?: string;
}

const STORAGE_PREFIX = '8gentjr-guided-';

function storageKey(lessonId: string): string {
  return `${STORAGE_PREFIX}${lessonId}`;
}

/**
 * Completed step ids for a lesson, filtered to ids the lesson still has.
 * Filtering matters: a lesson that drops or renames a step should not leave a
 * child stuck on progress that no longer maps to anything.
 */
export function loadProgress(lessonId: string, steps: readonly GuidedStep[]): string[] {
  if (typeof window === 'undefined') return [];
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(storageKey(lessonId));
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const known = new Set(steps.map((s) => s.id));
    return parsed.filter((id): id is string => typeof id === 'string' && known.has(id));
  } catch {
    return [];
  }
}

/**
 * How many steps of a lesson are done, without needing the lesson's step list.
 * The index page uses this so it does not have to import every lesson.
 */
export function countProgress(lessonId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(lessonId)) || '[]');
    if (!Array.isArray(parsed)) return 0;
    return new Set(parsed.filter((id): id is string => typeof id === 'string')).size;
  } catch {
    return 0;
  }
}

export function saveProgress(lessonId: string, completed: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(lessonId), JSON.stringify([...new Set(completed)]));
  } catch {
    /* storage full or blocked, progress is a nicety not a requirement */
  }
}

export function clearProgress(lessonId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(storageKey(lessonId));
  } catch {
    /* noop */
  }
}

/**
 * Index of the first step not yet completed, or `steps.length` when the lesson
 * is finished. Steps are offered in order even when a later one happens to be
 * satisfied already, because the order is the teaching.
 */
export function nextStepIndex(
  steps: readonly GuidedStep[],
  completed: readonly string[],
): number {
  const done = new Set(completed);
  for (let i = 0; i < steps.length; i++) {
    if (!done.has(steps[i].id)) return i;
  }
  return steps.length;
}

/** Completion as a 0..1 fraction. Empty lessons count as finished. */
export function progressFraction(
  steps: readonly GuidedStep[],
  completed: readonly string[],
): number {
  if (steps.length === 0) return 1;
  const known = new Set(steps.map((s) => s.id));
  const counted = new Set([...completed].filter((id) => known.has(id)));
  return counted.size / steps.length;
}

export function isLessonComplete(
  steps: readonly GuidedStep[],
  completed: readonly string[],
): boolean {
  return nextStepIndex(steps, completed) >= steps.length;
}

/** Add an id once, preserving the order steps were actually reached in. */
export function markComplete(completed: readonly string[], id: string): string[] {
  return completed.includes(id) ? [...completed] : [...completed, id];
}

// ---------------------------------------------------------------------------
// Lesson index
// ---------------------------------------------------------------------------

export interface LessonSummary {
  id: string;
  title: string;
  /** How many guided steps the lesson ships with. */
  stepCount: number;
}

/**
 * Fraction of a whole route finished, used by the /math index to show a child
 * how much of the route they have worked through.
 */
export function routeProgress(
  lessons: readonly LessonSummary[],
  countCompleted: (lessonId: string) => number,
): number {
  const total = lessons.reduce((sum, l) => sum + l.stepCount, 0);
  if (total === 0) return 1;
  const done = lessons.reduce(
    (sum, l) => sum + Math.min(l.stepCount, Math.max(0, countCompleted(l.id))),
    0,
  );
  return done / total;
}
