"use client";

/**
 * Talk Page — main AAC communication hub for 8gent Jr.
 *
 * Structure:
 * - Default: Core AAC board (high-frequency words)
 * - Reachable: Sentence Builder, Browse by Category
 *
 * Safety phrases bar always visible at bottom.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AACBoard from "@/components/AACBoard";
import AACHome from "@/components/AACHome";
import AACEncouragement from "@/components/AACEncouragement";
import SentenceBuilder from "@/components/SentenceBuilder";
import { speak } from "@/lib/tts";

type ViewMode = "core" | "sentences" | "browse";

// Safety phrases — always accessible
const SAFETY_PHRASES = [
  { id: "help", text: "Help me", color: "#F44336" },
  { id: "stop", text: "Stop", color: "#F44336" },
  { id: "hurt", text: "I'm hurt", color: "#FF5722" },
  { id: "bathroom", text: "Bathroom", color: "#FF9800" },
  { id: "water", text: "Water", color: "#2196F3" },
  { id: "scared", text: "I'm scared", color: "#9C27B0" },
];

export default function TalkPage() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>("core");
  const [spokenCount, setSpokenCount] = useState(0);

  const handleSpeakSafety = useCallback((text: string) => {
    speak({ text });
    setSpokenCount((c) => c + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-500 via-teal-500 to-green-500 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {viewMode === "core" ? (
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-lg font-medium">Back</span>
          </button>
        ) : (
          <button
            onClick={() => setViewMode("core")}
            className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-lg font-medium">Back</span>
          </button>
        )}
        <h1 className="text-white text-xl font-bold">
          {viewMode === "core" ? "Talk" : viewMode === "sentences" ? "Sentence Builder" : "Browse Topics"}
        </h1>
        <div className="w-16" />
      </div>

      {/* Encouragement — only on core view */}
      {viewMode === "core" && (
        <div className="px-4 py-1">
          <AACEncouragement wordCount={spokenCount} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">

        {/* CORE VIEW — main AAC board + nav shortcuts */}
        {viewMode === "core" && (
          <div className="flex flex-col gap-3 px-4 py-2">
            {/* Navigation shortcuts */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setViewMode("sentences")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl px-4 py-3 text-white font-semibold transition-colors active:scale-95"
              >
                <span className="text-2xl">✏️</span>
                <span>Build a sentence</span>
              </button>
              <button
                onClick={() => setViewMode("browse")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-2xl px-4 py-3 text-white font-semibold transition-colors active:scale-95"
              >
                <span className="text-2xl">📚</span>
                <span>Browse topics</span>
              </button>
            </div>

            {/* Core AAC board */}
            <div className="bg-white/10 rounded-2xl p-2">
              <AACBoard columns={4} showDensitySelector />
            </div>
          </div>
        )}

        {/* SENTENCE BUILDER VIEW */}
        {viewMode === "sentences" && (
          <div className="px-4 py-2">
            <SentenceBuilder />
          </div>
        )}

        {/* BROWSE VIEW */}
        {viewMode === "browse" && <AACHome />}
      </div>

      {/* Safety phrases bar — always visible */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 px-3 py-2 safe-area-inset-bottom">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {SAFETY_PHRASES.map((phrase) => (
            <button
              key={phrase.id}
              onClick={() => handleSpeakSafety(phrase.text)}
              className="shrink-0 px-4 py-2.5 rounded-full font-bold text-sm text-white active:scale-95 transition-transform shadow-sm"
              style={{ backgroundColor: phrase.color }}
            >
              {phrase.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
