'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import Knob from '@/components/math/Knob';
import { useCalmMode } from '@/components/math/useCalmMode';

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';

/**
 * Lesson 1 — Wave.
 *
 * One sine curve, two knobs (wiggle count and speed). The point of this
 * lesson is "numbers can wiggle, and two knobs make two different things
 * change". No symbols, no equations on screen — the curve itself is the
 * teacher.
 */
export default function WaveLessonPage() {
  const router = useRouter();
  const [calm, setCalm] = useCalmMode();
  const [frequency, setFrequency] = useState(1.5);
  const [speed, setSpeed] = useState(calm ? 0.4 : 0.8);

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
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--brand-bg)' }}>
      <header
        className="flex items-center justify-between px-4 py-3 relative"
        style={{ backgroundColor: PRIMARY }}
      >
        <button
          onClick={() => router.push('/math')}
          className="flex items-center gap-0.5 text-white font-medium text-lg"
          aria-label="Back to math"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Math</span>
        </button>

        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          Wave
        </span>

        <button
          onClick={() => setCalm(!calm)}
          aria-pressed={calm}
          className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
        >
          {calm ? 'Calm' : 'Lively'}
        </button>
      </header>

      <main className="flex-1 px-4 pt-4 pb-8 flex flex-col gap-5 max-w-xl w-full mx-auto animate-[fadeUp_400ms_ease-out]">
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

        <div className="rounded-3xl bg-white/70 backdrop-blur-sm border border-[color:var(--brand-border)] p-5 flex flex-col gap-5 shadow-sm">
          <Knob
            label="Wiggles"
            value={frequency}
            min={0.5}
            max={4}
            step={0.1}
            format={(v) => `${v.toFixed(1)}×`}
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
      </main>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          main { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
