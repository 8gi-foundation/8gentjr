/**
 * 8gent Jr - skip counting for the Skips lesson.
 *
 * Twenty four numbers laid out six to a row. Skip by 2 and the lit squares
 * make solid columns; skip by 3 and they make wider columns; skip by 4 or 5
 * and they lean into a diagonal that walks across the grid. The times tables
 * stop being a list to recite and become a shape to look at, and because each
 * step plays the next note up they are also a tune to hum.
 *
 * Six columns is the whole trick: it is the smallest width where 2, 3 and 6
 * line up and 4 and 5 do not.
 */

export const GRID_COLUMNS = 6;
export const GRID_ROWS = 4;
export const GRID_MAX = GRID_COLUMNS * GRID_ROWS; // 24

/** Skip sizes offered. Small enough to stay countable on one grid. */
export const SKIPS = [2, 3, 4, 5, 6] as const;
export type Skip = (typeof SKIPS)[number];

/** Every multiple of `skip` up to and including the grid maximum. */
export function multiples(skip: number, max = GRID_MAX): number[] {
  const step = Math.max(1, Math.round(skip));
  const out: number[] = [];
  for (let n = step; n <= max; n += step) out.push(n);
  return out;
}

export function isMultiple(value: number, skip: number): boolean {
  const step = Math.max(1, Math.round(skip));
  return Number.isInteger(value) && value > 0 && value % step === 0;
}

/**
 * The next number in the pattern after what the child has already found.
 * Returns null once the pattern runs off the end of the grid, which is the
 * lesson's natural stopping point rather than an error.
 */
export function nextInPattern(found: readonly number[], skip: number, max = GRID_MAX): number | null {
  const step = Math.max(1, Math.round(skip));
  const highest = found.length === 0 ? 0 : Math.max(...found);
  const next = Math.floor(highest / step) * step + step;
  return next <= max ? next : null;
}

export type TapResult = 'next' | 'already' | 'not-in-pattern';

/**
 * Judge a tap on the grid. Only "next" advances the pattern. Nothing here is
 * scored as wrong: a number that is not in the pattern is answered with a soft
 * tone and nothing is taken away, because a child exploring the grid is doing
 * exactly what the lesson wants.
 */
export function judgeSkipTap(value: number, found: readonly number[], skip: number, max = GRID_MAX): TapResult {
  if (found.includes(value)) return 'already';
  return value === nextInPattern(found, skip, max) ? 'next' : 'not-in-pattern';
}

/** Zero based row and column of a number on the grid. */
export function gridPosition(value: number, columns = GRID_COLUMNS): { row: number; column: number } {
  const index = Math.max(1, Math.round(value)) - 1;
  return { row: Math.floor(index / columns), column: index % columns };
}

export type PatternShape = 'columns' | 'diagonal';

/**
 * What the lit squares look like on the grid. Multiples of a skip that divides
 * the row width land in the same columns on every row; anything else drifts
 * sideways as it goes down.
 */
export function patternShape(skip: number, columns = GRID_COLUMNS): PatternShape {
  const step = Math.max(1, Math.round(skip));
  return columns % step === 0 ? 'columns' : 'diagonal';
}

/** Plain words for the shape, shown under the grid. */
export function shapeWords(skip: number, columns = GRID_COLUMNS): string {
  return patternShape(skip, columns) === 'columns'
    ? 'Straight up and down'
    : 'Leaning across';
}

/**
 * How far through the pattern the child is, 0 to 1. Used for the progress
 * ring around the Show me button.
 */
export function patternFraction(found: readonly number[], skip: number, max = GRID_MAX): number {
  const total = multiples(skip, max).length;
  if (total === 0) return 1;
  const counted = new Set(found.filter((n) => isMultiple(n, skip) && n <= max));
  return Math.min(1, counted.size / total);
}

/**
 * Longest run of pattern numbers found in order without a break. Guided steps
 * ask for a run rather than a total, because a run is the thing that shows the
 * child has the pattern rather than the grid.
 */
export function bestStreak(found: readonly number[], skip: number): number {
  const step = Math.max(1, Math.round(skip));
  const inPattern = found.filter((n) => isMultiple(n, step));
  let best = 0;
  let run = 0;
  let expected: number | null = null;
  for (const n of inPattern) {
    if (expected === null || n === expected) {
      run += 1;
    } else {
      run = 1;
    }
    expected = n + step;
    if (run > best) best = run;
  }
  return best;
}
