'use client';

import { useMemo, useRef, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import LessonShell from '@/components/math/LessonShell';
import GuidedSteps from '@/components/math/GuidedSteps';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useHaptics } from '@/components/math/useHaptics';
import { useSonify, useSoundPreference } from '@/components/math/useSonify';
import { harmonicGain } from '@/lib/math-audio';
import type { GuidedStep } from '@/lib/guided-learning';

/**
 * Lesson 3 - Layers.
 *
 * Three sine waves at 1x, 2x and 3x the base speed. Switch them on and the
 * curve stops looking like a wave and starts looking like a shape, and the
 * sound stops being a whistle and starts being an instrument. Same event, two
 * senses: adding waves adds detail.
 *
 * The lesson keeps the harmonics whole numbered on purpose. Whole number
 * layers stack into a stable repeating shape, which is exactly why they sound
 * like one note rather than three, and the Garden lesson picks that idea up.
 */

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';
const LESSON_ID = 'math-layers';
const BASE_HZ = 196; // G3. Low enough that three harmonics stay comfortable.

interface Layer {
  id: string;
  harmonic: number;
  label: string;
  caption: string;
}

const LAYERS: readonly Layer[] = [
  { id: 'l1', harmonic: 1, label: 'One', caption: 'The slow one' },
  { id: 'l2', harmonic: 2, label: 'Two', caption: 'Twice as fast' },
  { id: 'l3', harmonic: 3, label: 'Three', caption: 'Three times as fast' },
];

const STEPS: readonly GuidedStep[] = [
  {
    id: 'add-two',
    prompt: 'Switch on the second wave.',
    hint: 'Tap the card that says Two. Watch the curve grow bumps.',
    praise: 'Two waves, new shape.',
  },
  {
    id: 'add-three',
    prompt: 'Add the third one as well.',
    hint: 'Tap Three. Now all of them are stacked.',
    praise: 'Three layers.',
  },
  {
    id: 'listen',
    prompt: 'Tap Hear it and listen to the stack.',
    hint: 'The button under the cards plays every wave that is switched on.',
    praise: 'That is what layers sound like.',
  },
  {
    id: 'drop-base',
    prompt: 'Now switch the slow one off.',
    hint: 'Tap One. The bumps stay, the big swing goes.',
    praise: 'The shape changed again.',
  },
  {
    id: 'all-back',
    prompt: 'Put all three back on.',
    hint: 'Every card lit up.',
    praise: 'Full stack.',
  },
];

export default function LayersLessonPage() {
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [active, setActive] = useState<Record<string, boolean>>({ l1: true, l2: false, l3: false });
  const [blend, setBlend] = useState(0.7);
  const [heard, setHeard] = useState(false);
  const sound = useSonify(soundOn);
  const haptics = useHaptics(calm);

  const activeLayers = LAYERS.filter((l) => active[l.id]);

  const state = useRef({ active, heard });
  state.current = { active, heard };

  const reached = useMemo(
    () => (stepId: string) => {
      const a = state.current.active;
      switch (stepId) {
        case 'add-two':
          return a.l2 === true;
        case 'add-three':
          return a.l2 === true && a.l3 === true;
        case 'listen':
          return state.current.heard;
        case 'drop-base':
          return a.l1 === false && (a.l2 === true || a.l3 === true);
        case 'all-back':
          return a.l1 === true && a.l2 === true && a.l3 === true;
        default:
          return false;
      }
    },
    [],
  );

  /** Loudness of one layer inside the stack. Higher layers sit further back. */
  const layerGain = (harmonic: number) =>
    harmonic === 1 ? 1 : harmonicGain(harmonic) * blend;

  const toggle = (layer: Layer) => {
    haptics.bump();
    const turningOn = !active[layer.id];
    setActive((prev) => ({ ...prev, [layer.id]: turningOn }));
    // Play the layer on its own as it comes in, so it can be picked out of the
    // stack by ear before it disappears into the blend.
    if (turningOn) sound.ping(BASE_HZ * layer.harmonic, 0.4 * layerGain(layer.harmonic) + 0.12);
  };

  const hearStack = () => {
    haptics.tick();
    setHeard(true);
    const freqs = activeLayers.map((l) => BASE_HZ * l.harmonic);
    if (freqs.length > 0) sound.chord(freqs, 0.5);
  };

  const draw = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);

    const cy = h / 2;
    const unit = h * 0.16;
    const phase = calm ? t * 0.4 : t * 0.7;
    const steps = 300;

    ctx.fillStyle = '#FFFFFF14';
    ctx.fillRect(0, cy - 0.5, w, 1);

    // Each layer on its own, faint. This is the "where did that bump come
    // from" answer, available at a glance.
    ctx.lineWidth = 1.5;
    activeLayers.forEach((layer) => {
      ctx.strokeStyle = '#FFFFFF33';
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * w;
        const angle = (i / steps) * Math.PI * 2 * layer.harmonic + phase * layer.harmonic;
        const y = cy + Math.sin(angle) * unit * layerGain(layer.harmonic);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });

    // The sum, bold. The shape the child is actually making.
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = calm ? 12 : 20;
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * w;
      let sum = 0;
      activeLayers.forEach((layer) => {
        const angle = (i / steps) * Math.PI * 2 * layer.harmonic + phase * layer.harmonic;
        sum += Math.sin(angle) * layerGain(layer.harmonic);
      });
      const y = cy + sum * unit;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  const shapeWord =
    activeLayers.length === 0
      ? 'Nothing switched on'
      : activeLayers.length === 1
      ? 'One smooth wave'
      : activeLayers.length === 2
      ? 'Two waves, bumpy'
      : 'Three waves, a real shape';

  return (
    <LessonShell
      title="Layers"
      calmMode={calm}
      onCalmChange={setCalm}
      soundOn={soundOn}
      onSoundChange={setSoundOn}
    >
      <div className="rounded-3xl overflow-hidden border" style={{ borderColor: 'var(--brand-border)' }}>
        <SketchFrame
          draw={draw}
          motion={calm ? 'gentle' : 'on'}
          deps={[active, blend, calm]}
          ariaLabel={shapeWord}
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

      <div className="grid grid-cols-3 gap-3">
        {LAYERS.map((layer) => {
          const on = active[layer.id];
          return (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggle(layer)}
              aria-pressed={on}
              className="rounded-3xl border px-3 py-4 text-center active:scale-[0.97] transition-transform"
              style={{
                borderColor: on ? PRIMARY : 'var(--brand-border)',
                backgroundColor: on ? 'var(--brand-bg-accent)' : '#FFFFFF',
              }}
            >
              <svg viewBox="0 0 60 24" className="w-full h-6 mb-2" aria-hidden>
                <path
                  d={Array.from({ length: 31 }, (_, i) => {
                    const x = (i / 30) * 60;
                    const y = 12 - Math.sin((i / 30) * Math.PI * 2 * layer.harmonic) * 8;
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke={on ? PRIMARY : 'var(--brand-border)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <div className="font-semibold text-base" style={{ color: 'var(--brand-text)' }}>
                {layer.label}
              </div>
              <div className="text-[11px] leading-tight" style={{ color: 'var(--brand-text-soft)' }}>
                {layer.caption}
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={hearStack}
        disabled={!soundOn || activeLayers.length === 0}
        className="w-full rounded-3xl py-4 font-semibold text-white text-lg active:scale-[0.99] transition-transform"
        style={{
          backgroundColor: PRIMARY,
          opacity: soundOn && activeLayers.length > 0 ? 1 : 0.5,
        }}
      >
        {soundOn ? 'Hear it' : 'Sound is off'}
      </button>

      <div
        className="rounded-3xl border bg-white px-5 py-4"
        style={{ borderColor: 'var(--brand-border)' }}
      >
        <Knob
          label="How loud the extra layers are"
          value={blend}
          min={0}
          max={1}
          step={0.02}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setBlend}
          calmMode={calm}
          accent={PRIMARY}
        />
      </div>

      <p className="text-center text-sm px-4" style={{ color: 'var(--brand-text-soft)' }}>
        {shapeWord}. Added waves do not cancel the first one out, they decorate
        it.
      </p>
    </LessonShell>
  );
}
