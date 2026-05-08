'use client';

import { useRouter } from 'next/navigation';
import SketchFrame from '@/components/math/SketchFrame';
import { useCalmMode } from '@/components/math/useCalmMode';

const PRIMARY = '#E8610A';
const CANVAS_BG = '#1A1612';

interface Lesson {
  id: string;
  href: string | null;
  title: string;
  subtitle: string;
  preview: 'wave' | 'amplitude' | 'layered' | 'garden';
}

const LESSONS: Lesson[] = [
  {
    id: 'wave',
    href: '/math/wave',
    title: 'Wave',
    subtitle: 'Numbers can wiggle',
    preview: 'wave',
  },
  {
    id: 'amplitude',
    href: null,
    title: 'Tall and Small',
    subtitle: 'Two knobs, two effects',
    preview: 'amplitude',
  },
  {
    id: 'layered',
    href: null,
    title: 'Layers',
    subtitle: 'Adding waves makes new shapes',
    preview: 'layered',
  },
  {
    id: 'garden',
    href: null,
    title: 'Garden',
    subtitle: 'Tiny rules, big patterns',
    preview: 'garden',
  },
];

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

        <button
          onClick={() => setCalm(!calm)}
          aria-pressed={calm}
          className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
        >
          {calm ? 'Calm' : 'Lively'}
        </button>
      </header>

      <main className="flex-1 px-4 pt-5 pb-8 max-w-xl w-full mx-auto">
        <p
          className="text-center text-sm mb-5 animate-[fadeUp_500ms_ease-out]"
          style={{ color: 'var(--brand-text-soft)' }}
        >
          Watch what the numbers do.
        </p>

        <ul className="grid gap-4">
          {LESSONS.map((lesson, i) => {
            const locked = lesson.href === null;
            return (
              <li
                key={lesson.id}
                className="animate-[fadeUp_500ms_ease-out]"
                style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards' }}
              >
                <button
                  onClick={() => lesson.href && router.push(lesson.href)}
                  disabled={locked}
                  className={`w-full text-left rounded-3xl overflow-hidden border border-[color:var(--brand-border)] bg-white shadow-sm transition-transform duration-150 ease-out ${
                    locked ? 'opacity-60 cursor-default' : 'active:scale-[0.985]'
                  }`}
                >
                  <div className="aspect-[16/7] bg-[color:var(--brand-text)] relative">
                    <SketchFrame
                      draw={previewDraw(lesson.preview, calm)}
                      motion={locked ? 'off' : calm ? 'gentle' : 'on'}
                      ariaLabel={`${lesson.title} preview`}
                      className="w-full h-full block"
                    />
                    {locked && (
                      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-white/85 text-[color:var(--brand-text)]">
                        Soon
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
                    {!locked && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
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
