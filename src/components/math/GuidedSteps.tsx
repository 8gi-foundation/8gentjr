'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { speak } from '@/lib/tts';
import {
  clearProgress,
  isLessonComplete,
  loadProgress,
  markComplete,
  nextStepIndex,
  progressFraction,
  saveProgress,
  type GuidedStep,
} from '@/lib/guided-learning';
import { useHaptics } from './useHaptics';
import { getMathAudio, PENTATONIC_HZ } from '@/lib/math-audio';

/**
 * The guided rail that sits under a math sketch.
 *
 * It shows one thing to do at a time and completes it when the child actually
 * does it. The parent lesson owns the parameters and answers one question:
 * "is the goal of this step true right now?". Nothing here can change the
 * lesson state, so the controls are never taken away from the child.
 */

interface GuidedStepsProps {
  /** Stable id used for saved progress, e.g. "math-amplitude". */
  lessonId: string;
  steps: readonly GuidedStep[];
  /** Is this step's goal state true at this moment? */
  reached: (stepId: string) => boolean;
  calmMode: boolean;
  soundOn: boolean;
  accent?: string;
  /** Fired once per step, when it flips from not reached to reached. */
  onStepComplete?: (stepId: string) => void;
  onLessonComplete?: () => void;
}

/** How long the praise stays up before the next prompt slides in. */
const PRAISE_MS = 1400;
/** Silence on one step before the hint appears. */
const HINT_AFTER_MS = 14000;

export default function GuidedSteps({
  lessonId,
  steps,
  reached,
  calmMode,
  soundOn,
  accent = 'var(--brand-accent)',
  onStepComplete,
  onLessonComplete,
}: GuidedStepsProps) {
  const [completed, setCompleted] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [praise, setPraise] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const haptics = useHaptics(calmMode);
  const praiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCompleted(loadProgress(lessonId, steps));
    setHydrated(true);
  }, [lessonId, steps]);

  const index = nextStepIndex(steps, completed);
  const current = index < steps.length ? steps[index] : null;
  const finished = hydrated && isLessonComplete(steps, completed);
  const fraction = progressFraction(steps, completed);

  // Hint timer restarts whenever the child moves on to a new step.
  useEffect(() => {
    setShowHint(false);
    if (!current?.hint) return;
    hintTimer.current = setTimeout(() => setShowHint(true), HINT_AFTER_MS);
    return () => {
      if (hintTimer.current) clearTimeout(hintTimer.current);
    };
  }, [current?.id, current?.hint]);

  const complete = useCallback(
    (step: GuidedStep) => {
      setCompleted((prev) => {
        if (prev.includes(step.id)) return prev;
        const next = markComplete(prev, step.id);
        saveProgress(lessonId, next);
        return next;
      });
      haptics.success();
      if (soundOn) {
        // Rising two note chime. Same shape every time, so it is recognisable
        // without looking at the screen.
        const audio = getMathAudio();
        audio?.ping(PENTATONIC_HZ[4], { gain: 0.4, duration: 0.5 });
        setTimeout(() => audio?.ping(PENTATONIC_HZ[7], { gain: 0.35, duration: 0.8 }), 130);
      }
      setPraise(step.praise ?? 'You did it');
      onStepComplete?.(step.id);
      praiseTimer.current = setTimeout(() => setPraise(null), PRAISE_MS);
    },
    [haptics, lessonId, onStepComplete, soundOn],
  );

  // The watcher. Everything else in this component is presentation.
  const goalMet = current ? reached(current.id) : false;
  useEffect(() => {
    if (!hydrated || !current || !goalMet || praise) return;
    complete(current);
  }, [hydrated, current, goalMet, praise, complete]);

  const wasFinished = useRef(false);
  useEffect(() => {
    if (finished && !wasFinished.current) {
      wasFinished.current = true;
      onLessonComplete?.();
    }
    if (!finished) wasFinished.current = false;
  }, [finished, onLessonComplete]);

  useEffect(
    () => () => {
      if (praiseTimer.current) clearTimeout(praiseTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
    },
    [],
  );

  const skip = () => {
    if (!current) return;
    haptics.bump();
    setCompleted((prev) => {
      const next = markComplete(prev, current.id);
      saveProgress(lessonId, next);
      return next;
    });
  };

  const restart = () => {
    haptics.bump();
    clearProgress(lessonId);
    setCompleted([]);
    setPraise(null);
    wasFinished.current = false;
  };

  const sayPrompt = () => {
    if (!current) return;
    haptics.tick();
    void speak({ text: current.prompt, rate: 0.95 });
  };

  const dots = useMemo(
    () =>
      steps.map((s) => ({
        id: s.id,
        done: completed.includes(s.id),
        active: current?.id === s.id,
      })),
    [steps, completed, current?.id],
  );

  if (!hydrated) {
    // Server and first client paint agree on an empty rail, so saved progress
    // never causes a hydration mismatch.
    return <div className="min-h-[132px]" aria-hidden />;
  }

  return (
    <section
      className="rounded-3xl border bg-white px-5 py-4 shadow-sm min-h-[132px]"
      style={{ borderColor: 'var(--brand-border)' }}
      aria-label="Things to try"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5" aria-hidden>
          {dots.map((d) => (
            <span
              key={d.id}
              className="h-2 rounded-full transition-all duration-300 ease-out"
              style={{
                width: d.active ? 22 : 8,
                backgroundColor: d.done || d.active ? accent : 'var(--brand-border)',
                opacity: d.done && !d.active ? 0.55 : 1,
              }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color: 'var(--brand-text-soft)' }}>
          {Math.round(fraction * 100)}%
        </span>
      </div>

      <div aria-live="polite" className="min-h-[52px]">
        {praise ? (
          <p
            className="text-lg font-semibold animate-[fadeUp_320ms_ease-out]"
            style={{ color: accent }}
          >
            {praise}
          </p>
        ) : finished ? (
          <div className="animate-[fadeUp_320ms_ease-out]">
            <p className="text-lg font-semibold" style={{ color: 'var(--brand-text)' }}>
              All done. Keep playing.
            </p>
            <p className="text-sm" style={{ color: 'var(--brand-text-soft)' }}>
              Every knob still works. Nothing here can break.
            </p>
          </div>
        ) : current ? (
          <div className="animate-[fadeUp_320ms_ease-out]">
            <p className="text-lg font-semibold leading-snug" style={{ color: 'var(--brand-text)' }}>
              {current.prompt}
            </p>
            {showHint && current.hint && (
              <p className="text-sm mt-1" style={{ color: 'var(--brand-text-soft)' }}>
                {current.hint}
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 mt-3">
        {current && !praise && (
          <>
            <button
              type="button"
              onClick={sayPrompt}
              className="flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-2 border active:scale-95 transition-transform"
              style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text-soft)' }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Say it
            </button>
            <button
              type="button"
              onClick={skip}
              className="text-sm font-medium rounded-full px-3 py-2 active:scale-95 transition-transform"
              style={{ color: 'var(--brand-text-soft)' }}
            >
              Skip
            </button>
          </>
        )}
        {finished && (
          <button
            type="button"
            onClick={restart}
            className="text-sm font-medium rounded-full px-3 py-2 border active:scale-95 transition-transform"
            style={{ borderColor: 'var(--brand-border)', color: 'var(--brand-text-soft)' }}
          >
            Start over
          </button>
        )}
      </div>
    </section>
  );
}
