"use client";

/**
 * Talk Page — main AAC communication hub for 8gent Jr.
 *
 * Three views:
 *   core    — SupercoreGrid (50 fixed core words, Fitzgerald Key)
 *   browse  — AACHome (category grid → word grid)
 *   phrases — QuickPhrases (saved sentences, 4 input methods)
 */

import { useState } from "react";
import { SupercoreGrid } from "@/components/SupercoreGrid";
import AACHome from "@/components/AACHome";
import { VoiceCardCreator } from "@/components/VoiceCardCreator";
import { QuickPhrases } from "@/components/QuickPhrases";
import { useSentence } from "@/hooks/useSentence";

type ViewMode = "core" | "browse" | "phrases";

const TABS: { id: ViewMode; label: string; icon: string }[] = [
  { id: "core",    label: "Core",    icon: "⊞" },
  { id: "browse",  label: "Browse",  icon: "🗂" },
  { id: "phrases", label: "Phrases", icon: "💬" },
];

export default function TalkPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("core");
  const { words: sentence } = useSentence();

  // Sentence text for QuickPhrases "save current sentence" prompt
  const sentenceText = sentence.length > 0
    ? sentence.map(w => w.label).join(" ")
    : undefined;

  return (
    <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Tab bar ──────────────────────────────────────── */}
      <div className="flex shrink-0 bg-gray-800" role="tablist" aria-label="Talk sections">
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={viewMode === tab.id}
            onClick={() => setViewMode(tab.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 min-h-[60px] border-b-[3px] transition-colors duration-100 ${
              viewMode === tab.id
                ? "text-white border-[#E8610A]"
                : "text-white/45 border-transparent"
            }`}
          >
            <span className="text-xl leading-none" aria-hidden="true">{tab.icon}</span>
            <span className="text-[11px] font-bold tracking-wide">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0" role="tabpanel">
        {viewMode === "core"    && <SupercoreGrid />}
        {viewMode === "browse"  && <AACHome />}
        {viewMode === "phrases" && <QuickPhrases currentSentence={sentenceText} />}
      </div>

      {/* ── Parent voice card creator — floating mic ─────── */}
      <VoiceCardCreator />
    </div>
  );
}
