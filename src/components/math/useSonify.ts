'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getMathAudio, type VoiceHandle } from '@/lib/math-audio';

const SOUND_KEY = '8gentjr-math-sound';

/**
 * Sound on/off for the math route, persisted per device.
 *
 * Default is on, because hearing the number change is half the lesson, but a
 * child in a noisy classroom or a sound-sensitive moment can switch it off and
 * the lesson still works: every parameter is on screen and under a finger too.
 */
export function useSoundPreference(): [boolean, (next: boolean) => void] {
  const [on, setOn] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(SOUND_KEY);
    } catch {
      return;
    }
    if (stored === 'off') setOn(false);
  }, []);

  const update = useCallback((next: boolean) => {
    setOn(next);
    try {
      window.localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* noop */
    }
    getMathAudio()?.setMuted(!next);
  }, []);

  useEffect(() => {
    getMathAudio()?.setMuted(!on);
  }, [on]);

  return [on, update];
}

export interface SonifyControls {
  /** Short struck note. Safe to call on every tap. */
  ping: (freq: number, gain?: number) => void;
  /** Several notes at once, for intervals and chords. */
  chord: (freqs: readonly number[], gain?: number) => void;
  /** Start (or reuse) the held voice and glide it to this pitch and loudness. */
  hold: (freq: number, gain: number) => void;
  /** Release the held voice. Called on pointer up and on unmount. */
  release: () => void;
}

/**
 * Sonification for one lesson.
 *
 * Owns a single held voice so a lesson can follow a knob continuously without
 * stacking oscillators, and tears it down on unmount so leaving a lesson mid
 * drag never leaves a tone ringing.
 */
export function useSonify(enabled: boolean, type: OscillatorType = 'sine'): SonifyControls {
  const voiceRef = useRef<VoiceHandle | null>(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const release = useCallback(() => {
    voiceRef.current?.stop();
    voiceRef.current = null;
  }, []);

  useEffect(() => {
    if (!enabled) release();
  }, [enabled, release]);

  useEffect(() => release, [release]);

  const ping = useCallback((freq: number, gain = 0.45) => {
    if (!enabledRef.current) return;
    getMathAudio()?.ping(freq, { gain });
  }, []);

  const chord = useCallback((freqs: readonly number[], gain = 0.45) => {
    if (!enabledRef.current) return;
    getMathAudio()?.chord(freqs, { gain });
  }, []);

  const hold = useCallback((freq: number, gain: number) => {
    if (!enabledRef.current) {
      voiceRef.current?.stop();
      voiceRef.current = null;
      return;
    }
    if (!voiceRef.current || voiceRef.current.stopped) {
      voiceRef.current = getMathAudio()?.voice(type) ?? null;
    }
    voiceRef.current?.set(freq, gain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Memoised so a lesson can list `sound` in an effect's dependencies without
  // the effect re-running on every render.
  return useMemo(() => ({ ping, chord, hold, release }), [ping, chord, hold, release]);
}
