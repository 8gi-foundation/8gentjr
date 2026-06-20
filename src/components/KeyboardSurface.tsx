"use client";

/**
 * KeyboardSurface — the "Keyboard" Talk tab.
 *
 * Surfaces the (previously unwired) AACKeyboard for users who want to type /
 * spell words for core needs, alongside the symbol grid. Typed words feed the
 * SAME shared sentence store the Core grid uses, so spelling and tapping mix
 * in one sentence. Speaks each added word, and the whole sentence, in the
 * voice chosen in Settings.
 */

import { useCallback } from "react";
import AACKeyboard from "@/components/AACKeyboard";
import { useSentence } from "@/hooks/useSentence";
import { useApp } from "@/context/AppContext";
import { speak } from "@/lib/tts";

export function KeyboardSurface() {
  const { words, addWord, removeWord, clear } = useSentence();
  const { settings } = useApp();

  const say = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      speak({ text, voiceId: settings.selectedVoiceId ?? undefined, rate: settings.ttsRate }).catch(() => {});
    },
    [settings.selectedVoiceId, settings.ttsRate],
  );

  const handleWord = useCallback(
    (word: string) => {
      addWord({ label: word });
      say(word);
    },
    [addWord, say],
  );

  const sentenceText = words.map((w) => w.label).join(" ");

  return (
    <div className="flex flex-col h-full bg-[#F7F5F2]">
      {/* Sentence bar */}
      <div className="shrink-0 bg-gray-800 px-3 py-2 flex items-center gap-2">
        <button
          onClick={() => say(sentenceText)}
          disabled={words.length === 0}
          aria-label="Speak the sentence"
          className="shrink-0 w-12 h-12 rounded-full bg-[#E8610A] text-white flex items-center justify-center text-xl disabled:opacity-40 active:scale-90 transition-transform"
        >
          ▶
        </button>
        <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {words.length === 0 ? (
            <span className="text-white/40 text-sm">Type a word to start.</span>
          ) : (
            <div className="flex gap-1.5">
              {words.map((w, i) => (
                <button
                  key={i}
                  onClick={() => say(w.label)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-white/15 text-white text-sm font-semibold whitespace-nowrap active:scale-95 transition-transform"
                >
                  {w.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => words.length && removeWord(words.length - 1)}
          disabled={words.length === 0}
          aria-label="Delete last word"
          className="shrink-0 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center text-lg disabled:opacity-30 active:scale-90 transition-transform"
        >
          ⌫
        </button>
        <button
          onClick={clear}
          disabled={words.length === 0}
          aria-label="Clear the sentence"
          className="shrink-0 w-11 h-11 rounded-full bg-red-500/90 text-white flex items-center justify-center text-lg disabled:opacity-30 active:scale-90 transition-transform"
        >
          ✕
        </button>
      </div>

      {/* Keyboard */}
      <div className="flex-1 overflow-y-auto min-h-0 p-4 touch-pan-y">
        <AACKeyboard onWordSelect={handleWord} />
      </div>
    </div>
  );
}
