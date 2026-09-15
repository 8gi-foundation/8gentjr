'use client';

/**
 * useCoreSurface - the shared behaviour every Layout Primitive surface runs on.
 *
 * The Scene, Word Rail, Flow Board and Orbit Core surfaces differ ONLY in how
 * they arrange the vocabulary on screen. Their behaviour - speaking, appending
 * to the sentence strip, clearing, the optional analytic "magic" rewrite - is
 * identical to the Supercore grid and is centralised here so no surface can
 * drift from the shared pipeline.
 *
 * Contract:
 *   - Reads the shared sentence store via useSentence (same store the grid uses).
 *   - Speaks via the same ElevenLabs-with-browser-fallback path (or the parent's
 *     onSpeak override, exactly like the grid).
 *   - tapWord() routes through performCoreTap: speak -> add chip -> log. It
 *     never mutates vocabulary, personal words or phrase folders.
 */

import { useCallback, useState } from 'react';
import { useSentence } from '@/hooks/useSentence';
import { useApp } from '@/context/AppContext';
import { speak as elevenLabsSpeak } from '@/lib/tts';
import { logWord } from '@/lib/session-logger';
import { performCoreTap, type SupercoreWord } from '@/lib/core-vocab';
import type { SurfaceProps } from './index';

export function useCoreSurface({ onSpeak }: SurfaceProps) {
  const { words: sentence, addWord, removeWord, clear } = useSentence();
  const { settings } = useApp();
  const [engineFallback, setEngineFallback] = useState(false);
  const [isMagicLoading, setIsMagicLoading] = useState(false);

  const speakText = useCallback(
    async (text: string) => {
      if (onSpeak) {
        onSpeak(text);
        return;
      }
      const engine = await elevenLabsSpeak({
        text,
        voiceId: settings.selectedVoiceId ?? undefined,
        rate: settings.ttsRate,
      });
      setEngineFallback(engine === 'browser');
    },
    [onSpeak, settings.selectedVoiceId, settings.ttsRate],
  );

  const tapWord = useCallback(
    (word: SupercoreWord) => {
      performCoreTap(word, { speak: speakText, add: addWord, log: logWord });
    },
    [speakText, addWord],
  );

  /**
   * Speak an arbitrary text token and append it to the shared sentence strip.
   * Used by the Word Rail for typed text and free-text predictions. `log`
   * defaults to false so hand-typed strings never pollute the personal-vocab
   * analytics (core-word taps still log, exactly like the grid).
   */
  const tapText = useCallback(
    (text: string, opts?: { className?: string; imageUrl?: string; log?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      speakText(trimmed);
      addWord({ label: trimmed, className: opts?.className, imageUrl: opts?.imageUrl });
      if (opts?.log) logWord(trimmed);
    },
    [speakText, addWord],
  );

  const handleSpeakAll = useCallback(() => {
    if (sentence.length === 0) return;
    speakText(sentence.map((w) => w.label).join(' '));
  }, [sentence, speakText]);

  const handleClear = useCallback(() => {
    clear();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }, [clear]);

  // Analytic "magic" rewrite - same endpoint and fallback the grid uses.
  const handleMagic = useCallback(async () => {
    if (sentence.length < 2) return;
    setIsMagicLoading(true);
    try {
      const words = sentence.map((w) => w.label);
      const res = await fetch('/api/improve-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: words }),
      });
      if (res.ok) {
        const data = await res.json();
        speakText(data.improved || data.sentence || words.join(' '));
      } else {
        speakText(words.join(' '));
      }
    } catch {
      speakText(sentence.map((w) => w.label).join(' '));
    } finally {
      setIsMagicLoading(false);
    }
  }, [sentence, speakText]);

  return {
    settings,
    sentence,
    removeWord,
    engineFallback,
    isMagicLoading,
    speakText,
    tapWord,
    tapText,
    handleSpeakAll,
    handleClear,
    handleMagic,
  };
}
