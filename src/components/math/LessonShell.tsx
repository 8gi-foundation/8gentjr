'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Shared frame for a math lesson.
 *
 * Every lesson gets the same three controls in the same three places, because
 * a child should never have to hunt for the way out, the way to calm the
 * screen down, or the way to silence it. Motor memory applies to app chrome
 * just as much as it does to an AAC board.
 */

const PRIMARY = '#E8610A';

interface LessonShellProps {
  title: string;
  /** Where the back button goes. Defaults to the math index. */
  backHref?: string;
  backLabel?: string;
  calmMode: boolean;
  onCalmChange: (next: boolean) => void;
  soundOn: boolean;
  onSoundChange: (next: boolean) => void;
  children: ReactNode;
}

export default function LessonShell({
  title,
  backHref = '/math',
  backLabel = 'Math',
  calmMode,
  onCalmChange,
  soundOn,
  onSoundChange,
  children,
}: LessonShellProps) {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ backgroundColor: 'var(--brand-bg)' }}>
      <header
        className="flex items-center justify-between px-4 py-3 relative"
        style={{ backgroundColor: PRIMARY }}
      >
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center gap-0.5 text-white font-medium text-lg"
          aria-label={`Back to ${backLabel}`}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>{backLabel}</span>
        </button>

        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          {title}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSoundChange(!soundOn)}
            aria-pressed={soundOn}
            aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
            className="text-white p-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {soundOn ? (
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              ) : (
                <path d="M23 9l-6 6M17 9l6 6" />
              )}
            </svg>
          </button>
          <button
            onClick={() => onCalmChange(!calmMode)}
            aria-pressed={calmMode}
            className="text-white text-xs font-medium px-3 py-1.5 rounded-full bg-white/15 active:bg-white/25 transition-colors"
          >
            {calmMode ? 'Calm' : 'Lively'}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-10 max-w-xl w-full mx-auto flex flex-col gap-4">
        {children}
      </main>
    </div>
  );
}
