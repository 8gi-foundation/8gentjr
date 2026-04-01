"use client";

/**
 * Talk Page — main AAC communication hub for 8gent Jr.
 *
 * Three modes:
 * - "For You"  — contextual/frequent phrases
 * - "All"      — full vocabulary grid
 * - "Browse"   — browse by AAC category
 *
 * Includes safety phrases bar always visible at bottom.
 * Ported from NickOS talk interface, adapted to 8gent Jr architecture.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AACBoard from "@/components/AACBoard";
import AACHome from "@/components/AACHome";
import AACKeyboard from "@/components/AACKeyboard";
import AACEncouragement from "@/components/AACEncouragement";
import SentenceBuilder from "@/components/SentenceBuilder";

type ViewMode = "contextual" | "all" | "categories";

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
  const [viewMode, setViewMode] = useState<ViewMode>("contextual");
  const [spokenCount, setSpokenCount] = useState(0);

  const handleSpeakSafety = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
      setSpokenCount((c) => c + 1);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-500 via-teal-500 to-green-500 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
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
          <span className="text-lg font-medium">Back</span>
        </button>
        <h1 className="text-white text-xl font-bold">Talk</h1>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Encouragement */}
      <div className="px-4 py-1">
        <AACEncouragement wordCount={spokenCount} />
      </div>

      {/* View Mode Tabs */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
          <button
            onClick={() => setViewMode("contextual")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "contextual"
                ? "bg-white text-gray-900"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            For You
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "all"
                ? "bg-white text-gray-900"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setViewMode("categories")}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              viewMode === "categories"
                ? "bg-white text-gray-900"
                : "text-white/80 hover:bg-white/10"
            }`}
          >
            Browse
          </button>
        </div>
      </div>

      {/* AAC Keyboard input */}
      <div className="px-4 py-2">
        <AACKeyboard
          onWordSelect={(word) => {
            handleSpeakSafety(word);
          }}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 px-4 py-2 overflow-y-auto">
        {viewMode === "contextual" && (
          <div className="space-y-4">
            <SentenceBuilder />
          </div>
        )}

        {viewMode === "all" && (
          <div className="bg-white/10 rounded-2xl p-2">
            <AACBoard columns={4} showDensitySelector />
          </div>
        )}

        {viewMode === "categories" && <AACHome />}
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
