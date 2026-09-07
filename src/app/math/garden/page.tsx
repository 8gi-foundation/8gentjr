'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useHaptics } from '@/components/math/useHaptics';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import { consonance, gcd, ratioFrequencies } from '@/lib/math-audio';
import type { GuidedStep } from '@/lib/guided-learning';

/**
 * Lesson 4 - Garden.
 *
 * Two whole numbers, one pattern. The rules say how fast the pen moves side to
 * side and how fast it moves up and down, and every pair grows a different
 * flower. Change one rule by one and the whole garden changes, which is the
 * lesson: tiny rules, big patterns.
 *
 * The same two numbers are also an interval, so the pattern can be heard. A
 * pair that shares a factor (2 and 4, 3 and 6) draws a simple closed loop and
 * sounds settled. A pair that shares nothing (5 and 7) draws a dense weave and
 * sounds busy. Sight and hearing agree, which is the point.
 *
 * "Draw it" is the third channel: the child traces the curve themselves with a
 * finger and a tone follows the pen up and down as it goes.
 */

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';
const LESSON_ID = 'math-garden';
const FAVOURITES_KEY = '8gentjr-math-garden-favourites';

const MIN_RULE = 1;
const MAX_RULE = 8;

const STEPS: readonly GuidedStep[] = [
  {
    id: 'match',
    prompt: 'Make both rules the same number.',
    hint: 'Use the plus and minus buttons until the two numbers match.',
    praise: 'Same rules make one clean loop.',
  },
  {
    id: 'three-two',
    prompt: 'Now make one rule 3 and the other rule 2.',
    hint: 'It does not matter which one is which.',
    praise: 'Three against two. A bow shape.',
  },
  {
    id: 'trace',
    prompt: 'Trace the whole pattern with Draw it.',
    hint: 'Drag the Draw it slider all the way across. The tone follows the pen.',
    praise: 'You drew the pattern yourself.',
  },
  {
    id: 'big',
    prompt: 'Try a rule bigger than five.',
    hint: 'Higher numbers weave more line into the same square.',
    praise: 'Busy pattern, busy sound.',
  },
  {
    id: 'keep',
    prompt: 'Find a pattern you like and keep it.',
    hint: 'The Keep this one button saves it to your garden.',
    praise: 'Saved to your garden.',
  },
];

interface Favourite {
  a: number;
  b: number;
}

function loadFavourites(): Favourite[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(FAVOURITES_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is Favourite =>
        typeof f === 'object' && f !== null && typeof (f as Favourite).a === 'number' && typeof (f as Favourite).b === 'number',
    );
  } catch {
    return [];
  }
}

function saveFavourites(list: readonly Favourite[]): void {
  try {
    window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(list.slice(-12)));
  } catch {
    /* noop */
  }
}

/** Curve point for parameter u in 0..1. Shared by the sketch and the tracer. */
function curvePoint(u: number, a: number, b: number, phase: number): { x: number; y: number } {
  const theta = u * Math.PI * 2;
  return {
    x: Math.sin(theta * a + phase),
    y: Math.sin(theta * b),
  };
}

function soundWord(value: number): string {
  return value >= 0.72 ? 'settled' : value >= 0.45 ? 'in between' : 'buzzy';
}

export default function GardenLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [ruleA, setRuleA] = useState(3);
  const [ruleB, setRuleB] = useState(2);
  const [trace, setTrace] = useState(1);
  const [traceMax, setTraceMax] = useState(0);
  const [favourites, setFavourites] = useState<Favourite[]>([]);
  const sound = useSonify(soundOn, 'triangle');
  const haptics = useHaptics(calm);

  useEffect(() => {
    setFavourites(loadFavourites());
  }, []);

  const settled = consonance(ruleA, ruleB);
  const shared = gcd(ruleA, ruleB);

  const state = useRef({ ruleA, ruleB, traceMax, favourites });
  state.current = { ruleA, ruleB, traceMax, favourites };

  const reached = useMemo(
    () => (stepId: string) => {
      const s = state.current;
      switch (stepId) {
        case 'match':
          return s.ruleA === s.ruleB;
        case 'three-two':
          return (s.ruleA === 3 && s.ruleB === 2) || (s.ruleA === 2 && s.ruleB === 3);
        case 'trace':
          return s.traceMax >= 0.98;
        case 'big':
          return s.ruleA > 5 || s.ruleB > 5;
        case 'keep':
          return s.favourites.length > 0;
        default:
          return false;
      }
    },
    [],
  );

  const setRule = (which: 'a' | 'b', next: number) => {
    const bounded = Math.max(MIN_RULE, Math.min(MAX_RULE, next));
    const a = which === 'a' ? bounded : ruleA;
    const b = which === 'b' ? bounded : ruleB;
    if (which === 'a') setRuleA(bounded);
    else setRuleB(bounded);
    haptics.bump();
    // Hear the new pair as an interval straight away.
    sound.chord(ratioFrequencies(a, b), 0.45);
  };

  // While tracing, a held tone rides the pen: up the screen is a higher note.
  const handleTrace = (next: number) => {
    setTrace(next);
    setTraceMax((m) => Math.max(m, next));
    if (next <= 0.001) {
      sound.release();
      return;
    }
    const point = curvePoint(next, ruleA, ruleB, 0);
    const freq = 180 * Math.pow(2, (point.y + 1) / 2);
    sound.hold(freq, 0.09);
  };

  useEffect(() => () => sound.release(), [sound]);

  const keepThisOne = () => {
    haptics.success();
    sound.chord(ratioFrequencies(ruleA, ruleB), 0.5);
    setFavourites((prev) => {
      const next = prev.some((f) => f.a === ruleA && f.b === ruleB)
        ? prev
        : [...prev, { a: ruleA, b: ruleB }];
      saveFavourites(next);
      return next;
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const phase = calm ? t * 0.12 : t * 0.3;
    const segments = calm ? 320 : 520;
    const upTo = Math.max(0.001, trace);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = calm ? 8 : 14;
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const drawn = Math.max(2, Math.round(segments * upTo));
    for (let i = 0; i <= drawn; i++) {
      const u = (i / segments);
      const p = curvePoint(u, ruleA, ruleB, phase);
      const x = cx + p.x * radius;
      const y = cy - p.y * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // The pen. Only shown mid trace, where it is the thing to watch.
    if (trace < 0.999) {
      const p = curvePoint(upTo, ruleA, ruleB, phase);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx + p.x * radius, cy - p.y * radius, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const Stepper = ({
    label,
    value,
    which,
  }: {
    label: string;
    value: number;
    which: 'a' | 'b';
  }) => (
    <div
      className="rounded-3xl border bg-white px-4 py-4 flex-1"
      style={{ borderColor: 'var(--brand-border)' }}
    >
      <div className="text-sm font-medium mb-2" style={{ color: 'var(--brand-text-soft)' }}>
        {label}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setRule(which, value - 1)}
          disabled={value <= MIN_RULE}
          aria-label={`${label} down`}
          className="h-12 w-12 rounded-full border text-2xl font-semibold active:scale-95 transition-transform disabled:opacity-40"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        >
          -
        </button>
        <div className="text-center">
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: PRIMARY }}
            aria-live="polite"
          >
            {value}
          </div>
          {/* The number as a countable row, for a child who reads dots */}
          {/* before digits. */}
          <div className="flex justify-center gap-1 mt-1" aria-hidden>
            {Array.from({ length: value }, (_, i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: PRIMARY }}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setRule(which, value + 1)}
          disabled={value >= MAX_RULE}
          aria-label={`${label} up`}
          className="h-12 w-12 rounded-full border text-2xl font-semibold active:scale-95 transition-transform disabled:opacity-40"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        >
          +
        </button>
      </div>
    </div>
  );

  return (
    <LessonShell
      title="Garden"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div className="rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--brand-border)' }}>
        <SketchFrame
          draw={draw}
          motion={calm ? 'gentle' : 'on'}
          deps={[ruleA, ruleB, trace, calm]}
          ariaLabel={`Pattern from rules ${ruleA} and ${ruleB}, sounds ${soundWord(settled)}`}
          className="w-full aspect-square block"
        />
      </div>

      <GuidedSteps
        lessonId={LESSON_ID}
        steps={STEPS}
        reached={reached}
        calmMode={calm}
        soundOn={soundOn}
        accent={PRIMARY}
      />

      <div className="flex gap-3">
        <Stepper label="Side to side" value={ruleA} which="a" />
        <Stepper label="Up and down" value={ruleB} which="b" />
      </div>

      <div
        className="rounded-3xl border bg-white px-5 py-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <Knob
          label="Draw it"
          value={trace}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={handleTrace}
          calmMode={calm}
          accent={PRIMARY}
        />
      </div>

      <button
        type="button"
        onClick={keepThisOne}
        className="w-full rounded-3xl py-4 font-semibold text-white text-lg active:scale-[0.99] transition-transform"
        style={{ backgroundColor: PRIMARY }}
      >
        Keep this one
      </button>

      {favourites.length > 0 && (
        <div
          className="rounded-3xl border bg-white px-5 py-4"
          style={{ borderColor: 'var(--brand-border)' }}
        >
          <div className="text-sm font-medium mb-3" style={{ color: 'var(--brand-text-soft)' }}>
            Your garden
          </div>
          <div className="flex flex-wrap gap-2">
            {favourites.map((f, i) => (
              <button
                key={`${f.a}-${f.b}-${i}`}
                type="button"
                onClick={() => {
                  setRuleA(f.a);
                  setRuleB(f.b);
                  haptics.tick();
                  sound.chord(ratioFrequencies(f.a, f.b), 0.4);
                }}
                aria-label={`Rules ${f.a} and ${f.b}`}
                className="rounded-2xl border px-3 py-2 text-sm font-semibold tabular-nums active:scale-95 transition-transform"
                style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
              >
                {f.a} and {f.b}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="text-center text-sm px-4" style={{ color: 'var(--brand-text-soft)' }}>
        {ruleA} and {ruleB} sounds {soundWord(settled)}.{' '}
        {shared > 1
          ? `Both numbers share ${shared}, so the line closes up quickly.`
          : 'These two share nothing, so the line takes a long way round.'}
      </p>
    </LessonShell>
  );
}
