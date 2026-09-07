'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import { useBeatClock } from '@/components/math/useBeatClock';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useHaptics } from '@/components/math/useHaptics';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import {
  SPLITS,
  beatPitch,
  countPhrase,
  judgeTap,
  nearestBeat,
  ringSeconds,
  segmentSeconds,
  splitWords,
  type Split,
} from '@/lib/rhythm';
import type { GuidedStep } from '@/lib/guided-learning';

/**
 * Lesson 5 - Beat.
 *
 * One ring is one whole. Split it in two and each part is a half; split it in
 * three and each part is a third. The child hears the parts as beats, sees
 * them as slices, and taps them out with a finger, which is the only one of
 * the three that proves the idea has landed.
 *
 * Fractions usually arrive as notation. Here they arrive as "thirds come round
 * sooner than halves", which is the same fact with nothing to decode.
 */

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';
const LESSON_ID = 'math-beat';

const STEPS: readonly GuidedStep[] = [
  {
    id: 'start',
    prompt: 'Press Start and watch the dot go round.',
    hint: 'It plays a note every time it reaches a line.',
    praise: 'Round it goes.',
  },
  {
    id: 'tap',
    prompt: 'Tap along with the beat. Three good taps.',
    hint: 'Use the big Tap button. Anywhere near the beat counts.',
    praise: 'You are on the beat.',
  },
  {
    id: 'three',
    prompt: 'Now split the ring into three.',
    hint: 'Three parts. One two three, one two three.',
    praise: 'Thirds come round sooner than halves.',
  },
  {
    id: 'slow',
    prompt: 'Make it go slowly.',
    hint: 'The Speed slider, down at the low end.',
    praise: 'Slow and easy.',
  },
  {
    id: 'accent',
    prompt: 'Split it into four, then tap only on the low note.',
    hint: 'The low note is the start of the ring. Twice is enough.',
    praise: 'You found the one.',
  },
];

interface TapMark {
  id: number;
  phase: number;
  verdict: 'on' | 'near' | 'off';
}

export default function BeatLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [split, setSplit] = useState<Split>(2);
  const [tempo, setTempo] = useState(0.45);
  const [running, setRunning] = useState(false);
  const [marks, setMarks] = useState<TapMark[]>([]);
  const [counts, setCounts] = useState({ good: 0, accent: 0 });
  const [everStarted, setEverStarted] = useState(false);
  const sound = useSonify(soundOn);
  const haptics = useHaptics(calm);
  const markId = useRef(0);

  const handleBeat = useCallback(
    (index: number) => {
      const accent = index === 0;
      sound.ping(beatPitch(index, split), accent ? 0.5 : 0.3);
      if (accent) haptics.tick();
    },
    [sound, haptics, split],
  );

  const clock = useBeatClock(running, tempo, split, handleBeat);

  const tap = () => {
    if (!running) {
      setRunning(true);
      setEverStarted(true);
      haptics.bump();
      return;
    }
    const phase = clock.currentPhase();
    const verdict = judgeTap(phase, split, calm);
    const beat = nearestBeat(phase, split);

    if (verdict === 'on' || verdict === 'near') {
      haptics.success();
      sound.ping(beatPitch(beat, split) * 2, verdict === 'on' ? 0.45 : 0.3);
      setCounts((c) => ({
        good: c.good + 1,
        accent: beat === 0 ? c.accent + 1 : c.accent,
      }));
    } else {
      // Answered, never scolded. A soft low tone so the tap is felt to land.
      haptics.tick();
      sound.ping(120, 0.18);
    }

    const id = markId.current++;
    setMarks((m) => [...m.slice(-11), { id, phase, verdict }]);
    setTimeout(() => setMarks((m) => m.filter((mark) => mark.id !== id)), 2200);
  };

  const state = useRef({ split, tempo, counts, everStarted });
  state.current = { split, tempo, counts, everStarted };

  const reached = useMemo(
    () => (stepId: string) => {
      const s = state.current;
      switch (stepId) {
        case 'start':
          return s.everStarted;
        case 'tap':
          return s.counts.good >= 3;
        case 'three':
          return s.split === 3;
        case 'slow':
          return s.tempo <= 0.25;
        case 'accent':
          return s.split === 4 && s.counts.accent >= 2;
        default:
          return false;
      }
    },
    [],
  );

  const changeSplit = (next: Split) => {
    haptics.bump();
    setSplit(next);
    setCounts({ good: 0, accent: 0 });
    // Play the new split as a run of notes, so it can be heard before it is
    // tapped: two notes for halves, three for thirds.
    Array.from({ length: next }).forEach((_, i) => {
      setTimeout(() => sound.ping(beatPitch(i, next), i === 0 ? 0.45 : 0.28), i * 170);
    });
  };

  const draw = (ctx: CanvasRenderingContext2D, _t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.36;
    const phase = running ? clock.phaseRef.current : 0;
    const current = Math.min(split - 1, Math.floor(phase * split));

    // Slices. The part that is sounding right now is filled, so the fraction
    // is visible as an amount rather than only as a line.
    for (let i = 0; i < split; i++) {
      const from = (i / split) * Math.PI * 2 - Math.PI / 2;
      const to = ((i + 1) / split) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, from, to);
      ctx.closePath();
      ctx.fillStyle = running && i === current ? `${PRIMARY}33` : '#FFFFFF08';
      ctx.fill();
    }

    // Spokes, with the top one heavier because it is the start of the whole.
    for (let i = 0; i < split; i++) {
      const angle = (i / split) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.strokeStyle = i === 0 ? `${PRIMARY}CC` : '#FFFFFF33';
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF33';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Taps, left on the rim where they landed.
    marks.forEach((mark) => {
      const angle = mark.phase * Math.PI * 2 - Math.PI / 2;
      const r = radius + 12;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, mark.verdict === 'off' ? 3 : 5, 0, Math.PI * 2);
      ctx.fillStyle = mark.verdict === 'off' ? '#FFFFFF44' : PRIMARY;
      ctx.fill();
    });

    // The playhead.
    if (running) {
      const angle = phase * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      ctx.save();
      ctx.shadowColor = PRIMARY;
      ctx.shadowBlur = calm ? 8 : 16;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const partSeconds = segmentSeconds(tempo, split);

  return (
    <LessonShell
      title="Beat"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div className="rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--brand-border)' }}>
        <SketchFrame
          draw={draw}
          motion={running ? (calm ? 'gentle' : 'on') : 'off'}
          // clock.beat is in here so that with reduced motion, where the draw
          // loop is off, the ring still repaints once per beat.
          deps={[split, running, marks, calm, clock.beat]}
          ariaLabel={`${splitWords(split)}, ${running ? 'playing' : 'stopped'}`}
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

      <button
        type="button"
        onClick={tap}
        className="w-full rounded-3xl font-semibold text-white active:scale-[0.99] transition-transform"
        style={{ backgroundColor: PRIMARY, padding: '28px 16px', fontSize: 22 }}
      >
        {running ? 'Tap' : 'Start'}
      </button>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm" style={{ color: 'var(--brand-text-soft)' }} aria-live="polite">
          {running ? `${counts.good} on the beat` : 'Stopped'}
        </span>
        <button
          type="button"
          onClick={() => {
            haptics.bump();
            setRunning((r) => !r);
            if (!running) setEverStarted(true);
          }}
          className="text-sm font-medium rounded-full px-4 py-2 border active:scale-95 transition-transform"
          style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text)' }}
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      <div
        className="rounded-3xl border bg-white px-5 py-4 flex flex-col gap-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <div>
          <div className="text-sm font-medium mb-2" style={{ color: 'var(--brand-text-soft)' }}>
            Parts of the ring
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SPLITS.map((option) => {
              const on = option === split;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeSplit(option)}
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
        <Knob
          label="Speed"
          value={tempo}
          min={0}
          max={1}
          step={0.05}
          format={() => `${ringSeconds(tempo).toFixed(1)}s a lap`}
          onChange={setTempo}
          calmMode={calm}
          accent={PRIMARY}
        />
      </div>

      <p className="text-center text-sm px-4" style={{ color: 'var(--brand-text-soft)' }}>
        {splitWords(split)}. {countPhrase(split)}. Each part lasts{' '}
        {partSeconds.toFixed(1)} seconds, and the parts always add back up to
        one whole ring.
      </p>
    </LessonShell>
  );
}
