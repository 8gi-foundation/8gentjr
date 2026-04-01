"use client";

import { useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TapFeedbackOptions {
  /** Enable haptic vibration (default: true) */
  haptic?: boolean;
  /** Enable short click sound via Web Audio API (default: true) */
  audio?: boolean;
  /** Enable visual scale animation (default: true) */
  visual?: boolean;
  /** Vibration duration in ms (default: 10) */
  vibrateDuration?: number;
  /** Audio click frequency in Hz (default: 1800) */
  clickFrequency?: number;
  /** Audio click duration in ms (default: 6) */
  clickDuration?: number;
  /** Scale-down factor for visual feedback (default: 0.95) */
  scaleTo?: number;
  /** Total visual animation duration in ms (default: 100) */
  animationDuration?: number;
}

export interface TapFeedbackResult {
  /** Fire all enabled feedback channels. Optionally pass an element for visual feedback. */
  trigger: (element?: HTMLElement | null) => void;
  /** Bind to an element ref — provides onPointerDown with feedback baked in. */
  feedbackProps: (
    element?: HTMLElement | null,
  ) => { onPointerDown: () => void };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

function playClick(frequency: number, durationMs: number) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume if suspended (autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

  // Quick fade-out to avoid pop
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + durationMs / 1000,
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

function triggerHaptic(duration: number) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(duration);
  }
}

function triggerVisual(
  el: HTMLElement,
  scaleTo: number,
  durationMs: number,
) {
  const half = durationMs / 2;
  el.style.transition = `transform ${half}ms ease-in`;
  el.style.transform = `scale(${scaleTo})`;

  const restore = () => {
    el.style.transition = `transform ${half}ms ease-out`;
    el.style.transform = "scale(1)";
  };

  setTimeout(restore, half);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTapFeedback(
  options: TapFeedbackOptions = {},
): TapFeedbackResult {
  const {
    haptic = true,
    audio = true,
    visual = true,
    vibrateDuration = 10,
    clickFrequency = 1800,
    clickDuration = 6,
    scaleTo = 0.95,
    animationDuration = 100,
  } = options;

  // Stable ref so the trigger callback never changes identity
  const optsRef = useRef(options);
  optsRef.current = options;

  const trigger = useCallback(
    (element?: HTMLElement | null) => {
      if (haptic) triggerHaptic(vibrateDuration);
      if (audio) playClick(clickFrequency, clickDuration);
      if (visual && element) triggerVisual(element, scaleTo, animationDuration);
    },
    [haptic, audio, visual, vibrateDuration, clickFrequency, clickDuration, scaleTo, animationDuration],
  );

  const feedbackProps = useCallback(
    (element?: HTMLElement | null) => ({
      onPointerDown: () => trigger(element),
    }),
    [trigger],
  );

  return { trigger, feedbackProps };
}
