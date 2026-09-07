'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SketchFrame from '@/components/math/SketchFrame';
import { useCalmMode } from '@/components/math/useCalmMode';
import { useSoundPreference } from '@/components/math/useSonify';
import { countProgress, routeProgress, type LessonSummary } from '@/lib/guided-learning';

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';

interface Lesson {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: 'wave' | 'amplitude' | 'layered' | 'garden';
  /** Key the lesson saves its guided progress under. */
  lessonId: string;
  /** How many guided steps the lesson ships with. */
  stepCount: number;
}

const LESSONS: Lesson[] = [
  {
    id: 'wave',
    href: '/math/wave',
    title: 'Wave',
    subtitle: 'Numbers can wiggle, and wiggles have a pitch',
    preview: 'wave',
    lessonId: 'math-wave',
    stepCount: 5,
  },
  {
    id: 'amplitude',
    href: '/math/amplitude',
    title: 'Tall and Small',
    subtitle: 'Taller is louder, faster is higher',
    preview: 'amplitude',
    lessonId: 'math-amplitude',
    stepCount: 5,
  },
  {
    id: 'layered',
    href: '/math/layers',
    title: 'Layers',
    subtitle: 'Stack waves, hear an instrument appear',
    preview: 'layered',
    lessonId: 'math-layers',
    stepCount: 5,
  },
  {
    id: 'garden',
    href: '/math/garden',
    title: 'Garden',
    subtitle: 'Two small rules, one whole pattern',
    preview: 'garden',
    lessonId: 'math-garden',
    stepCount: 5,
  },
];

const SUMMARIES: LessonSummary[] = LESSONS.map((l) => ({
  id: l.lessonId,
  title: l.title,
  stepCount: l.stepCount,
}));

function previewDraw(kind: Lesson['preview'], calm: boolean) {
  return (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.shadowColor = PRIMARY;
    ctx.shadowBlur = calm ? 8 : 12;
    ctx.strokeStyle = PRIMARY;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();

    if (kind === 'wave') {
      const phase = t * 0.6;
      for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * w;
        const y = h / 2 + Math.sin((i / 80) * Math.PI * 2 + phase) * h * 0.22;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (kind === 'amplitude') {
      const breathe = 0.18 + Math.sin(t * 0.4) * 0.1;
      for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * w;
        const y = h / 2 + Math.sin((i / 80) * Math.PI * 2) * h * breathe;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (kind === 'layered') {
      for (let i = 0; i <= 80; i++) {
        const x = (i / 80) * w;
        const a = Math.sin((i / 80) * Math.PI * 2 + t * 0.4);
        const b = Math.sin((i / 80) * Math.PI * 4 + t * 0.5) * 0.5;
        const y = h / 2 + (a + b) * h * 0.18;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle = PRIMARY;
      const dotCount = calm ? 90 : 160;
      for (let i = 0; i < dotCount; i++) {
        const a = (i / dotCount) * Math.PI * 2 + t * 0.15;
        const r = (h * 0.34) * (0.6 + 0.4 * Math.sin(a * 5 + t * 0.3));
        const x = w / 2 + Math.cos(a) * r;
        const y = h / 2 + Math.sin(a) * r * 0.7;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.stroke();
    ctx.restore();
  };
}

export default function MathIndexPage() {
  const router = useRouter();
  const [calm, setCalm] = useCalmMode();
  const [soundOn, setSoundOn] = useSoundPreference();
  const [done, setDone] = useState<Record<string, number>>({});

  // Guided progress lives in localStorage, so it is read after mount to keep
  // the server and first client paint identical.
  useEffect(() => {
    const next: Record<string, number> = {};
    LESSONS.forEach((l) => {
      next[l.lessonId] = countProgress(l.lessonId);
    });
    setDone(next);
  }, []);

  const routeFraction = routeProgress(SUMMARIES, (id) => done[id] ?? 0);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--brand-bg)' }}>
      <header
        className="flex items-center justify-between px-4 py-3 relative"
        style={{ backgroundColor: PRIMARY }}
      >
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-0.5 text-white font-medium text-lg"
          aria-label="Back to home"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Home</span>
        </button>

        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          Math
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn(!soundOn)}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
            className="text-white p-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {soundOn ? (
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              ) : (
                <path d="M23 9l-6 6M17 9l6 6" />
              )}
            </svg>
          </button>
          <button
            onClick={() => setCalm(!calm)}
            aria-pressed={calm}
            className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
          >
            {calm ? 'Calm' : 'Lively'}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-5 pb-8 max-w-xl w-full mx-auto">
        <p
          className="text-center text-sm mb-3 animate-[fadeUp_500ms_ease-out]"
          style={{ color: 'var(--brand-text-soft)' }}
        >
          Watch what the numbers do. Hear them. Move them with your finger.
        </p>

        <div className="mb-5 animate-[fadeUp_500ms_ease-out]" aria-hidden>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--brand-border)' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{ width: `${Math.round(routeFraction * 100)}%`, backgroundColor: PRIMARY }}
            />
          </div>
        </div>

        <ul className="grid gap-4">
          {LESSONS.map((lesson, i) => {
            const completed = done[lesson.lessonId] ?? 0;
            const finished = completed >= lesson.stepCount;
            return (
              <li
                key={lesson.id}
                className="animate-[fadeUp_500ms_ease-out]"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
              >
                <button
                  onClick={() => router.push(lesson.href)}
                  className="w-full text-left rounded-3xl overflow-hidden border border-[color:var(--brand-border)] bg-white shadow-sm transition-transform duration-150 ease-out active:scale-[0.985]"
                >
                  <div className="aspect-[16/7] bg-[color:var(--brand-text)] relative">
                    <SketchFrame
                      draw={previewDraw(lesson.preview, calm)}
                      motion={calm ? 'gentle' : 'on'}
                      ariaLabel={`${lesson.title} preview`}
                      className="w-full h-full block"
                    />
                    {completed > 0 && (
                      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-white/85 text-[color:var(--brand-text)]">
                        {finished ? 'Done' : `${completed} of ${lesson.stepCount}`}
                      </span>
                    )}
                  </div>
                  <div className="px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-base" style={{ color: 'var(--brand-text)' }}>
                        {lesson.title}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--brand-text-soft)' }}>
                        {lesson.subtitle}
                      </div>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[fadeUp_500ms_ease-out\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
