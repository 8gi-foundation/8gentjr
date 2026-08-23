'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import { pitchForWiggles } from '@/lib/math-audio';
import type { GuidedStep } from '@/lib/guided-learning';

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';
const LESSON_ID = 'math-wave';

/**
 * Lesson 1 - Wave.
 *
 * One sine curve, two knobs (wiggle count and speed). The point of this
 * lesson is "numbers can wiggle, and two knobs make two different things
 * change". No symbols, no equations on screen, the curve itself is the
 * teacher.
 *
 * The wiggle count is also the pitch, so the first thing a child meets on this
 * route is a number they can see and hear at the same time.
 */

const STEPS: readonly GuidedStep[] = [
  {
    id: 'stop',
    prompt: 'Make the wave hold completely still.',
    hint: 'Slide Speed all the way down to still.',
    praise: 'Frozen.',
  },
  {
    id: 'go',
    prompt: 'Now set it moving again.',
    hint: 'Speed back up.',
    praise: 'Off it goes.',
  },
  {
    id: 'wiggles',
    prompt: 'Fit more wiggles on the screen.',
    hint: 'The Wiggles knob. Listen to the note climb as they multiply.',
    praise: 'More wiggles, higher note.',
  },
  {
    id: 'hear',
    prompt: 'Tap Hear the wave and listen.',
    hint: 'Then move Wiggles while it is playing.',
    praise: 'The number is a note.',
  },
  {
    id: 'gentle',
    prompt: 'Leave it slow and gentle.',
    hint: 'Few wiggles, low speed.',
    praise: 'Slow and gentle.',
  },
];

export default function WaveLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [frequency, setFrequency] = useState(1.5);
  const [speed, setSpeed] = useState(0.8);
  const [playing, setPlaying] = useState(false);
  const sound = useSonify(soundOn);

  useEffect(() => {
    if (!playing) {
      sound.release();
      return;
    }
    sound.hold(pitchForWiggles(frequency), 0.1);
  }, [playing, frequency, sound]);

  const state = useRef({ frequency, speed, playing });
  state.current = { frequency, speed, playing };

  const reached = useMemo(
    () => (stepId: string) => {
      const s = state.current;
      switch (stepId) {
        case 'stop':
          return s.speed <= 0.05;
        case 'go':
          return s.speed >= 0.6;
        case 'wiggles':
          return s.frequency >= 3.2;
        case 'hear':
          return s.playing;
        case 'gentle':
          return s.frequency <= 1.5 && s.speed > 0 && s.speed <= 0.4;
        default:
          return false;
      }
    },
    [],
  );

  const draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    const introFade = Math.min(1, t / 0.6);
    const phase = t * speed * 1.6;
    const amp = h * 0.3;
    const cy = h / 2;

    ctx.save();
    ctx.globalAlpha = introFade;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = calm ? 14 : 22;
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 3;

    ctx.beginPath();
    const steps = 240;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const angle = (i / steps) * frequency * Math.PI * 2 + phase;
      const y = cy + Math.sin(angle) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFFFFF22';
    ctx.fillRect(0, cy - 0.5, w, 1);
    ctx.restore();
  };

  const hint =
    frequency < 2 && speed < 0.5
      ? 'Slow and gentle'
      : frequency >= 3 && speed >= 1
      ? 'Quick wiggles'
      : frequency >= 3
      ? 'Many wiggles, easy pace'
      : speed >= 1
      ? 'Few wiggles, lively pace'
      : 'Nice and steady';

  return (
    <LessonShell
      title="Wave"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div
        className="rounded-3xl overflow-hidden shadow-sm"
        style={{ aspectRatio: '4 / 3', backgroundColor: CANVAS_BG }}
      >
        <SketchFrame
          draw={draw}
          motion={calm ? 'gentle' : 'on'}
          deps={[frequency, speed, calm]}
          ariaLabel={`A glowing sine wave with ${frequency.toFixed(1)} cycles, ${hint}.`}
          className="w-full h-full block"
        />
      </div>

      <p
        className="text-center text-sm font-medium tabular-nums"
        style={{ color: 'var(--brand-text-soft)' }}
      >
        {hint}
      </p>

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
        onClick={() => setPlaying((p) => !p)}
        aria-pressed={playing}
        disabled={!soundOn}
        className="w-full rounded-3xl py-4 font-semibold text-white text-lg active:scale-[0.99] transition-transform"
        style={{ backgroundColor: PRIMARY, opacity: soundOn ? 1 : 0.5 }}
      >
        {soundOn ? (playing ? 'Stop the sound' : 'Hear the wave') : 'Sound is off'}
      </button>

      <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-[color:var(--brand-border)] p-5 flex flex-col gap-5 shadow-sm">
        <Knob
          label="Wiggles"
          value={frequency}
          min={0.5}
          max={4}
          step={0.1}
          format={(v) => `${v.toFixed(1)}x`}
          onChange={setFrequency}
          calmMode={calm}
        />
        <Knob
          label="Speed"
          value={speed}
          min={0}
          max={1.5}
          step={0.05}
          format={(v) => (v === 0 ? 'still' : `${v.toFixed(2)}`)}
          onChange={setSpeed}
          calmMode={calm}
        />
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--brand-text-muted)' }}>
        Try moving one slider at a time. What changes?
      </p>
    </LessonShell>
  );
}
