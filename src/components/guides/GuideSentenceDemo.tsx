'use client';

/**
 * GuideSentenceDemo - guide-mode wrapper around SharedSentenceBar.
 *
 * Maintains its own local sentence state so taps in /guides/talk don't
 * pollute the production sentence-store. Real ▶ Speak / 🪞 Mirror /
 * ✨ Magic / Blend buttons are wired to /api/tts via the same speak()
 * helper used in production.
 */

import { useCallback, useEffect, useState } from 'react';
import { SharedSentenceBar, type SentenceChip } from '@/components/SharedSentenceBar';
import { speak, preloadAudio } from '@/lib/tts';

export interface GuideSentenceDemoProps {
  /** Initial chips for the bar; user can clear and rebuild. */
  initialChips?: SentenceChip[];
  /** Show the Mirror button instead of Magic (NLA stages 1-2). */
  withMirror?: boolean;
  /** Show the Magic (✨) button (NLA stage 3+). */
  withMagic?: boolean;
  /** Show the Blend button (NLA stage 2 with 2+ gestalt chips). */
  withBlend?: boolean;
  /** Optional caption shown below the bar. */
  caption?: string;
}

export function GuideSentenceDemo({
  initialChips = [],
  withMirror = false,
  withMagic = false,
  withBlend = false,
  caption,
}: GuideSentenceDemoProps) {
  const [chips, setChips] = useState<SentenceChip[]>(initialChips);

  // Preload the demo phrase on mount so the first tap is instant.
  useEffect(() => {
    if (initialChips.length > 0) {
      const text = initialChips.map((c) => c.label).join(' ');
      preloadAudio([text]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakSentence = useCallback(() => {
    if (chips.length === 0) return;
    const text = chips.map((c) => c.label).join(' ');
    void speak({ text });
  }, [chips]);

  const clearSentence = useCallback(() => setChips([]), []);

  const removeWord = useCallback(
    (index: number) => setChips((prev) => prev.filter((_, i) => i !== index)),
    []
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 shadow-sm">
      <SharedSentenceBar
        words={chips}
        onSpeak={speakSentence}
        onClear={clearSentence}
        onRemoveWord={removeWord}
        onMirror={withMirror ? speakSentence : undefined}
        onMagic={withMagic ? speakSentence : undefined}
        onBlend={withBlend ? speakSentence : undefined}
        placeholder="Tap a word card below to add it here..."
      />
      {caption && (
        <p className="mt-3 px-2 text-sm text-gray-600 leading-snug">
          {caption}
        </p>
      )}
    </div>
  );
}

export default GuideSentenceDemo;
