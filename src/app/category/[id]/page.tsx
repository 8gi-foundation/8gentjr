"use client";

/**
 * Category Detail Page — shows ARASAAC word grid for a specific category.
 *
 * Uses getPhrasesByCategory() from vocabulary.ts (correct per-category vocab).
 * TTS via speak() from tts.ts (ElevenLabs).
 *
 * Issue #71: Each category opens to a full word grid with pictograms.
 */

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useMemo } from "react";
import { AAC_CATEGORIES, getPhrasesByCategory } from "@/lib/vocabulary";
import { speak } from "@/lib/tts";

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = params.id as string;

  const category = AAC_CATEGORIES.find((c) => c.id === categoryId);
  const phrases = useMemo(() => getPhrasesByCategory(categoryId), [categoryId]);

  const [selectedWords, setSelectedWords] = useState<string[]>([]);

  const handleTap = useCallback((text: string) => {
    setSelectedWords((prev) => [...prev, text]);
    speak({ text });
  }, []);

  const handleSpeak = useCallback(() => {
    if (selectedWords.length === 0) return;
    speak({ text: selectedWords.join(" ") });
  }, [selectedWords]);

  const handleClear = () => setSelectedWords([]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600">Category not found</p>
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
    <div className="min-h-screen flex flex-col" style={{ background: `linear-gradient(135deg, ${category.color}22, ${category.color}08)` }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-4 pb-3 border-b-2"
        style={{ borderColor: category.color + "30", backgroundColor: category.color + "18" }}
      >
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 font-semibold"
          style={{ color: category.color }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Back</span>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={category.imageUrl} alt={category.name} className="w-10 h-10 object-contain" />
        <h1 className="text-xl font-bold" style={{ color: category.color }}>{category.name}</h1>
      </div>

      {/* Sentence strip */}
      <div className="mx-4 mt-3 mb-2">
        <div
          className="flex items-center gap-2 min-h-[48px] px-3 py-2 rounded-xl text-lg flex-wrap border-2 bg-white"
          style={{ borderColor: category.color + "40" }}
        >
          {selectedWords.length === 0 ? (
            <span className="text-gray-400 italic text-base">Tap words to build a sentence...</span>
          ) : (
            selectedWords.map((word, i) => (
              <span
                key={`${word}-${i}`}
                className="inline-block px-2.5 py-1 rounded-lg font-semibold text-sm"
                style={{ backgroundColor: category.color + "22", border: `2px solid ${category.color}`, color: category.color }}
              >
                {word}
              </span>
            ))
          )}
        </div>
        {selectedWords.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button onClick={handleClear} className="flex-1 py-2 rounded-xl bg-red-500 text-white font-semibold text-sm">
              Clear
            </button>
            <button onClick={handleSpeak} className="flex-[2] py-2 rounded-xl bg-green-500 text-white font-bold text-base">
              ▶ Speak
            </button>
          </div>
        )}
      </div>

      {/* Word grid */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        {phrases.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔧</p>
            <p className="font-semibold">Vocabulary coming soon</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
            {phrases.map((phrase) => (
              <button
                key={phrase.id}
                onClick={() => handleTap(phrase.text)}
                className="flex flex-col items-center justify-center gap-1.5 p-3 bg-white rounded-xl border-2 min-h-[100px] active:scale-95 transition-transform hover:shadow-md"
                style={{ borderColor: category.color + "50" }}
              >
                {phrase.imageUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={phrase.imageUrl} alt={phrase.text} className="w-14 h-14 object-contain" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-lg flex items-center justify-center text-2xl font-bold"
                    style={{ backgroundColor: category.color + "20", color: category.color }}
                  >
                    {phrase.text.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-semibold text-gray-700 text-center leading-tight line-clamp-2">
                  {phrase.text}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
