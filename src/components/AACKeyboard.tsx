"use client";

/**
 * AACKeyboard — text input with word prediction for AAC sentence building.
 * Provides typed word input alongside the symbol grid for faster communication.
 */

import { useState, useCallback, useRef } from "react";
import { getAllWords, getWordColor } from "@/lib/sentence-engine";

interface AACKeyboardProps {
  onWordSelect: (word: string) => void;
}

export default function AACKeyboard({ onWordSelect }: AACKeyboardProps) {
  const [input, setInput] = useState("");
  const [predictions, setPredictions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const allWords = getAllWords();

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (value.length >= 1) {
        const matches = allWords
          .filter((w) => w.toLowerCase().startsWith(value.toLowerCase()))
          .slice(0, 8);
        setPredictions(matches);
      } else {
        setPredictions([]);
      }
    },
    [allWords]
  );

  const handleSelect = useCallback(
    (word: string) => {
      onWordSelect(word);
      setInput("");
      setPredictions([]);
      inputRef.current?.focus();
    },
    [onWordSelect]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed) {
      onWordSelect(trimmed);
      setInput("");
      setPredictions([]);
    }
  }, [input, onWordSelect]);

  return (
    <div className="space-y-2">
      {/* Prediction chips */}
      {predictions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {predictions.map((word) => (
            <button
              key={word}
              onClick={() => handleSelect(word)}
              className="shrink-0 px-3 py-2 rounded-xl font-semibold text-sm bg-white active:scale-95 transition-transform"
              style={{
                border: `2px solid ${getWordColor(word)}`,
                color: getWordColor(word),
              }}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Input field */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Type a word..."
          className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 bg-white text-gray-800 text-base font-medium focus:border-cyan-400 focus:outline-none transition-colors"
        />
        <button
          onClick={handleSubmit}
          disabled={!input.trim()}
          className="px-4 py-3 rounded-xl bg-cyan-500 text-white font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
        >
          Add
        </button>
      </div>
    </div>
  );
}
