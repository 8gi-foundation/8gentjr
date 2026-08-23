'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import TouchPad from '@/components/math/TouchPad';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import { gainForAmplitude, pitchForWiggles } from '@/lib/math-audio';
import type { GuidedStep } from '@/lib/guided-learning';

/**
 * Lesson 2 - Tall and Small.
 *
 * Two numbers, two senses. Height changes how loud the wave is, wiggles change
 * how high it sounds. Nothing on screen names them "amplitude" and "frequency"
 * because the child does not need the words to own the idea: they need to feel
 * one knob change loudness while the other changes pitch, and to notice that
 * the two are independent.
 *
 * The finger pad drives both at once, which is where the independence usually
 * lands: dragging straight up gets louder and stays on the same note.
 */

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';
const LESSON_ID = 'math-amplitude';

const MIN_WIGGLES = 0.5;
const MAX_WIGGLES = 6;

const STEPS: readonly GuidedStep[] = [
  {
    id: 'tall',
    prompt: 'Make the wave as tall as it goes.',
    hint: 'Drag the Height knob all the way to the right.',
    praise: 'Tall and loud.',
  },
  {
    id: 'flat',
    prompt: 'Now flatten it right down.',
    hint: 'Height all the way back to the left. Listen to it disappear.',
    praise: 'Flat is quiet.',
  },
  {
    id: 'many',
    prompt: 'Give it lots of wiggles.',
    hint: 'The second knob. More wiggles, higher sound.',
    praise: 'Lots of wiggles, high note.',
  },
  {
    id: 'finger',
    prompt: 'Put your finger on the pad and slide it up.',
    hint: 'Up is taller. Left and right changes the wiggles.',
    praise: 'Your finger is driving both numbers.',
  },
  {
    id: 'favourite',
    prompt: 'Find a wave that is tall and slow.',
    hint: 'Height high, wiggles low.',
    praise: 'Big slow wave.',
  },
];

function describe(amp: number, wiggles: number): string {
  const height = amp > 0.75 ? 'Tall' : amp > 0.35 ? 'Middle' : amp > 0.08 ? 'Small' : 'Flat';
  const speed = wiggles > 4 ? 'lots of wiggles' : wiggles > 2 ? 'some wiggles' : 'few wiggles';
  return `${height}, ${speed}`;
}

export default function AmplitudeLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [amp, setAmp] = useState(0.45);
  const [wiggles, setWiggles] = useState(1.5);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [padUsed, setPadUsed] = useState(false);
  const sound = useSonify(soundOn);

  const audible = playing || dragging;

  // The held tone follows the two numbers for as long as it is audible.
  useEffect(() => {
    if (!audible) {
      sound.release();
      return;
    }
    sound.hold(pitchForWiggles(wiggles), gainForAmplitude(amp));
  }, [audible, amp, wiggles, sound]);

  const reachedRef = useRef({ amp, wiggles, padUsed });
  reachedRef.current = { amp, wiggles, padUsed };

  const reached = useMemo(
    () => (stepId: string) => {
      const s = reachedRef.current;
      switch (stepId) {
        case 'tall':
          return s.amp >= 0.92;
        case 'flat':
          return s.amp <= 0.08;
        case 'many':
          return s.wiggles >= 4.5;
        case 'finger':
          return s.padUsed && s.amp >= 0.6;
        case 'favourite':
          return s.amp >= 0.6 && s.wiggles <= 1.5;
        default:
          return false;
      }
    },
    [],
  );

  const draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    const cy = h / 2;
    const maxAmp = h * 0.4;
    const height = amp * maxAmp;
    const phase = calm ? t * 0.5 : t * 0.9;

    // Rest line. Gives the height something to be measured against.
    ctx.fillStyle = '#FFFFFF18';
    ctx.fillRect(0, cy - 0.5, w, 1);

    // Height rails, so "tall" is visible as a distance, not just a shape.
    ctx.strokeStyle = `${PRIMARY}44`;
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, cy - height);
    ctx.lineTo(w, cy - height);
    ctx.moveTo(0, cy + height);
    ctx.lineTo(w, cy + height);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = (calm ? 10 : 18) * (0.4 + amp);
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const steps = 260;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      const angle = (i / steps) * wiggles * Math.PI * 2 + phase;
      const y = cy + Math.sin(angle) * height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();

    // A dot riding the curve. Somewhere to look when the shape is still.
    const rideAngle = phase;
    const rideX = w * 0.5;
    const rideY = cy + Math.sin(wiggles * Math.PI + rideAngle) * height;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(rideX, rideY, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <LessonShell
      title="Tall and Small"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div className="rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--brand-border)' }}>
        <SketchFrame
          draw={draw}
          motion={calm ? 'gentle' : 'on'}
          deps={[amp, wiggles, calm]}
          ariaLabel={`Wave, ${describe(amp, wiggles)}`}
          className="w-full aspect-[16/9] block"
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

      <TouchPad
        x={(wiggles - MIN_WIGGLES) / (MAX_WIGGLES - MIN_WIGGLES)}
        y={amp}
        onChange={(nx, ny) => {
          setPadUsed(true);
          setWiggles(MIN_WIGGLES + nx * (MAX_WIGGLES - MIN_WIGGLES));
          setAmp(ny);
        }}
        xLabel="Wiggles"
        yLabel="Height"
        describe={(nx, ny) => describe(ny, MIN_WIGGLES + nx * (MAX_WIGGLES - MIN_WIGGLES))}
        calmMode={calm}
        accent={PRIMARY}
        onGrab={() => setDragging(true)}
        onRelease={() => setDragging(false)}
      />

      <button
        type="button"
        onClick={() => setPlaying((p) => !p)}
        aria-pressed={playing}
        className="w-full rounded-3xl py-4 font-semibold text-white text-lg active:scale-[0.99] transition-transform"
        style={{ backgroundColor: PRIMARY, opacity: soundOn ? 1 : 0.5 }}
        disabled={!soundOn}
      >
        {soundOn ? (playing ? 'Stop the sound' : 'Hear the wave') : 'Sound is off'}
      </button>

      <div
        className="rounded-3xl border bg-white px-5 py-4 flex flex-col gap-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <Knob
          label="Height"
          value={amp}
          min={0}
          max={1}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setAmp}
          calmMode={calm}
          accent={PRIMARY}
        />
        <Knob
          label="Wiggles"
          value={wiggles}
          min={MIN_WIGGLES}
          max={MAX_WIGGLES}
          step={0.1}
          format={(v) => v.toFixed(1)}
          onChange={setWiggles}
          calmMode={calm}
          accent={PRIMARY}
        />
      </div>

      <p className="text-center text-sm px-4" style={{ color: 'var(--brand-text-soft)' }}>
        Height changes how loud it is. Wiggles change how high it sounds. They do
        not affect each other.
      </p>
    </LessonShell>
  );
}
