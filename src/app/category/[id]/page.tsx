"use client";

/**
 * Category Detail Page — shows all AAC phrases for a specific category.
 * Navigated to from the AACHome browse view.
 */

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { AAC_CATEGORIES } from "@/components/AACHome";
import {
  GENERAL_PHRASES,
  FEELINGS_PHRASES,
  ACTIONS_PHRASES,
} from "@/lib/vocabulary";

/** Map category IDs to phrase lists (extend as vocab grows) */
function getPhrasesForCategory(categoryId: string) {
  switch (categoryId) {
    case "feelings":
      return FEELINGS_PHRASES;
    case "actions":
      return ACTIONS_PHRASES;
    case "wants":
    case "food":
    case "people":
    case "social":
    default:
      return GENERAL_PHRASES;
  }
}

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const category = AAC_CATEGORIES.find((c) => c.id === categoryId);
  const phrases = useMemo(
    () => getPhrasesForCategory(categoryId),
    [categoryId]
  );

  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const handleTap = useCallback((text: string) => {
    setSelectedWords((prev) => [...prev, text]);

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const handleSpeak = useCallback(() => {
    if (selectedWords.length === 0) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(
        selectedWords.join(" ")
      );
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    }
  }, [selectedWords]);

  const handleClear = () => setSelectedWords([]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-5xl mb-4">{"\uD83D\uDD0D"}</p>
          <p className="text-lg font-semibold text-gray-600">
            Category not found
          </p>
          <button
            onClick={() => router.push("/talk")}
            className="mt-4 px-6 py-3 bg-cyan-500 text-white font-bold rounded-xl"
          >
            Back to Talk
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-500 to-teal-500 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button
          onClick={() => router.push("/talk")}
          className="flex items-center gap-1 text-white/80 hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-3xl">{category.emoji}</span>
        <h1 className="text-white text-xl font-bold">{category.name}</h1>
      </div>

      {/* Sentence strip */}
      <div className="mx-4 mb-3">
        <div className="flex items-center gap-2 min-h-[48px] px-3 py-2 bg-white/90 rounded-xl text-lg flex-wrap">
          {selectedWords.length === 0 ? (
            <span className="text-gray-400 italic text-base">
              Tap words to build a sentence...
            </span>
          ) : (
            selectedWords.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="inline-block px-2 py-1 rounded-lg font-semibold text-sm"
                style={{
                  backgroundColor: category.color + "22",
                  border: `2px solid ${category.color}`,
                  color: category.color,
                }}
              >
                {word}
              </span>
            ))
          )}
        </div>
        {selectedWords.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleClear}
              className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm"
            >
              Clear
            </button>
            <button
              onClick={handleSpeak}
              className="flex-[2] py-2 rounded-xl bg-green-500 text-white font-bold text-base"
            >
              Speak
            </button>
          </div>
        )}
      </div>

      {/* Phrase grid */}
      <div className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
          {phrases.map((phrase) => (
            <button
              key={phrase.id}
              onClick={() => handleTap(phrase.text)}
              className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-xl border-2 min-h-[100px] active:scale-95 transition-transform hover:shadow-md"
              style={{ borderColor: category.color + "40" }}
            >
              {phrase.imageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={phrase.imageUrl}
                  alt={phrase.text}
                  className="w-14 h-14 object-contain"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl"
                  style={{ backgroundColor: category.color + "15" }}
                >
                  {phrase.text.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-xs font-semibold text-gray-700 text-center leading-tight line-clamp-2">
                {phrase.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
