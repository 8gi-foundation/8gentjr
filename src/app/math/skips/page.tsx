'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useHaptics } from '@/components/math/useHaptics';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import { pentatonicAt } from '@/lib/math-audio';
import {
  GRID_COLUMNS,
  GRID_MAX,
  SKIPS,
  bestStreak,
  judgeSkipTap,
  multiples,
  nextInPattern,
  patternFraction,
  shapeWords,
  type Skip,
} from '@/lib/skip-counting';
import type { GuidedStep } from '@/lib/guided-learning';

/**
 * Lesson 6 - Skips.
 *
 * Twenty four numbers, six to a row. Skip counting lights them up, and because
 * the grid is six wide the twos, threes and sixes stack into straight columns
 * while the fours and fives lean across it. A times table stops being a list
 * to recite and becomes a shape to recognise.
 *
 * Each step up the pattern plays the next note of a pentatonic scale, so the
 * table is also a tune. Nothing here is marked wrong: tapping a number outside
 * the pattern answers with a soft tone and takes nothing away, because poking
 * at the grid is how a child finds out where the pattern is not.
 */

const PRIMARY = '#E8610A';
const LESSON_ID = 'math-skips';

const STEPS: readonly GuidedStep[] = [
  {
    id: 'show',
    prompt: 'Press Show me and watch the twos light up.',
    hint: 'Listen. Each one is a step higher than the last.',
    praise: 'That is counting in twos.',
  },
  {
    id: 'your-turn',
    prompt: 'Your turn. Tap the next number in the pattern, three times.',
    hint: 'After 2 comes 4, then 6. Tapping anywhere else is fine, it just is not the next one.',
    praise: 'You are counting in twos yourself.',
  },
  {
    id: 'threes',
    prompt: 'Change the skip to 3 and press Show me.',
    hint: 'Watch where the lights land this time.',
    praise: 'Threes make wider columns.',
  },
  {
    id: 'leaning',
    prompt: 'Find a skip that leans across instead of standing up straight.',
    hint: 'Try 4 or 5. Six squares in a row is the reason they lean.',
    praise: 'That one walks sideways down the grid.',
  },
  {
    id: 'streak',
    prompt: 'Get five in a row on your own.',
    hint: 'Any skip size. Start from the first one and keep going.',
    praise: 'Five in a row.',
  },
];

export default function SkipsLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [skip, setSkip] = useState<Skip>(2);
  const [found, setFound] = useState<number[]>([]);
  const [demo, setDemo] = useState<number[]>([]);
  const [demoing, setDemoing] = useState(false);
  const [nudge, setNudge] = useState<number | null>(null);
  const [shownSkips, setShownSkips] = useState<number[]>([]);
  const sound = useSonify(soundOn);
  const haptics = useHaptics(calm);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const target = multiples(skip);
  const streak = bestStreak(found, skip);
  const fraction = patternFraction(found, skip);
  const nextUp = nextInPattern(found, skip);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** Note for a number, so the pattern climbs a scale as it goes. */
  const noteFor = (value: number) => pentatonicAt((value / GRID_MAX) * 0.9);

  const showMe = () => {
    clearTimers();
    haptics.bump();
    setDemo([]);
    setDemoing(true);
    setShownSkips((s) => (s.includes(skip) ? s : [...s, skip]));
    const gap = calm ? 620 : 420;
    target.forEach((value, i) => {
      timers.current.push(
        setTimeout(() => {
          setDemo((d) => [...d, value]);
          sound.ping(noteFor(value), 0.4);
          haptics.tick();
          if (i === target.length - 1) {
            timers.current.push(setTimeout(() => setDemoing(false), gap));
          }
        }, i * gap),
      );
    });
  };

  const tapNumber = (value: number) => {
    if (demoing) return;
    const verdict = judgeSkipTap(value, found, skip);
    if (verdict === 'next') {
      haptics.success();
      sound.ping(noteFor(value), 0.45);
      setFound((f) => [...f, value]);
      setNudge(null);
      return;
    }
    if (verdict === 'already') {
      haptics.tick();
      sound.ping(noteFor(value), 0.2);
      return;
    }
    // Off the pattern. A soft tone, nothing lost, and the square flashes once
    // so the tap is visibly received.
    haptics.tick();
    sound.ping(150, 0.2);
    setNudge(value);
    timers.current.push(setTimeout(() => setNudge((n) => (n === value ? null : n)), 500));
  };

  const changeSkip = (next: Skip) => {
    clearTimers();
    haptics.bump();
    setSkip(next);
    setFound([]);
    setDemo([]);
    setDemoing(false);
  };

  const state = useRef({ skip, found, shownSkips, streak });
  state.current = { skip, found, shownSkips, streak };

  const reached = useMemo(
    () => (stepId: string) => {
      const s = state.current;
      switch (stepId) {
        case 'show':
          return s.shownSkips.includes(2);
        case 'your-turn':
          return s.found.length >= 3;
        case 'threes':
          return s.skip === 3 && s.shownSkips.includes(3);
        case 'leaning':
          return s.skip === 4 || s.skip === 5;
        case 'streak':
          return s.streak >= 5;
        default:
          return false;
      }
    },
    [],
  );

  const numbers = Array.from({ length: GRID_MAX }, (_, i) => i + 1);

  return (
    <LessonShell
      title="Skips"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div
        className="rounded-3xl border bg-white p-3"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
        >
          {numbers.map((value) => {
            const isFound = found.includes(value);
            const isDemo = demo.includes(value);
            const isNext = value === nextUp && !demoing;
            const lit = isFound || isDemo;
            const nudged = nudge === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => tapNumber(value)}
                aria-label={`${value}${lit ? ', in the pattern' : ''}`}
                aria-pressed={lit}
                className="aspect-square rounded-2xl border font-bold tabular-nums active:scale-95 transition-all duration-150"
                style={{
                  borderColor: lit ? PRIMARY : nudged ? 'var(--brand-text-soft)' : 'var(--brand-border)',
                  backgroundColor: lit ? PRIMARY : nudged ? 'var(--brand-bg-warm)' : '#FFFFFF',
                  color: lit ? '#FFFFFF' : 'var(--brand-text)',
                  fontSize: 17,
                  boxShadow: isNext && !lit ? `0 0 0 3px ${PRIMARY}33` : undefined,
                }}
              >
                {value}
              </button>
            );
          })}
        </div>
      </div>

      <GuidedSteps
        lessonId={LESSON_ID}
        steps={STEPS}
        reached={reached}
        calmMode={calm}
        soundOn={soundOn}
        accent={PRIMARY}
      />

      <div
        className="rounded-3xl border bg-white px-5 py-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <div className="text-sm font-medium mb-2" style={{ color: 'var(--brand-text-soft)' }}>
          Count in
        </div>
        <div className="grid grid-cols-5 gap-2">
          {SKIPS.map((option) => {
            const on = option === skip;
            return (
              <button
                key={option}
                type="button"
                onClick={() => changeSkip(option)}
                aria-pressed={on}
                className="rounded-2xl border py-3 font-bold text-xl active:scale-95 transition-transform"
                style={{
                  borderColor: on ? PRIMARY : 'var(--brand-border)',
                  backgroundColor: on ? 'var(--brand-bg-accent)' : '#FFFFFF',
                  color: on ? PRIMARY : 'var(--brand-text)',
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={showMe}
          disabled={demoing}
          className="flex-1 rounded-3xl py-4 font-semibold text-white text-lg active:scale-[0.99] transition-transform"
          style={{ backgroundColor: PRIMARY, opacity: demoing ? 0.6 : 1 }}
        >
          {demoing ? 'Watch' : 'Show me'}
        </button>
        <button
          type="button"
          onClick={() => {
            clearTimers();
            haptics.bump();
            setFound([]);
            setDemo([]);
            setDemoing(false);
          }}
          className="rounded-3xl px-5 py-4 font-semibold border active:scale-[0.98] transition-transform"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        >
          Clear
        </button>
      </div>

      <div
        className="rounded-3xl border bg-white px-5 py-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-sm font-medium" style={{ color: 'var(--brand-text-soft)' }}>
            Found on your own
          </span>
          <span className="text-sm font-semibold tabular-nums" style={{ color: PRIMARY }} aria-live="polite">
            {found.length} of {target.length}
            {streak >= 2 ? `, ${streak} in a row` : ''}
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--brand-border)' }}>
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ width: `${Math.round(fraction * 100)}%`, backgroundColor: PRIMARY }}
          />
        </div>
      </div>

      <p className="text-center text-sm px-4" style={{ color: 'var(--brand-text-soft)' }}>
        Counting in {skip}s: {shapeWords(skip).toLowerCase()}. Six squares to a
        row, so {GRID_COLUMNS % skip === 0 ? 'this pattern lands in the same columns every time' : 'this pattern never lands in the same place twice'}.
      </p>
    </LessonShell>
  );
}
