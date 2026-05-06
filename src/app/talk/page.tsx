"use client";

/**
 * Talk Page — main AAC communication hub for 8gent Jr.
 *
 * Three views:
 *   core    — SupercoreGrid (50 fixed core words, Fitzgerald Key)
 *   browse  — AACHome (category grid -> word grid)
 *   scripts — QuickPhrases (saved scripts, 4 input methods)
 *
 * Pinned scripts strip: a horizontal sliding row above the content area,
 * always visible when the user has pinned any scripts to Home.
 */

import { useState, useEffect } from "react";
import { SupercoreGrid } from "@/components/SupercoreGrid";
import AACHome from "@/components/AACHome";
import { VoiceCardCreator } from "@/components/VoiceCardCreator";
import { QuickPhrases } from "@/components/QuickPhrases";
import { useSentence } from "@/hooks/useSentence";
import { usePinnedScripts, getPinnedScripts, type SavedScript } from "@/hooks/usePinnedScripts";
import { speak } from "@/lib/tts";

type ViewMode = "core" | "browse" | "scripts";

const TABS: { id: ViewMode; label: string; icon: string }[] = [
  { id: "core",    label: "Core",    icon: "⊞" },
  { id: "browse",  label: "Browse",  icon: "🗂" },
  { id: "scripts", label: "Scripts", icon: "💬" },
];

export default function TalkPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("core");
  const { words: sentence } = useSentence();
  const { pinnedIds, toggle: togglePin } = usePinnedScripts();
  const [pinnedScripts, setPinnedScripts] = useState<SavedScript[]>([]);

  const sentenceText = sentence.length > 0
    ? sentence.map(w => w.label).join(" ")
    : undefined;

  // Re-derive pinned scripts whenever pinnedIds changes
  useEffect(() => {
    setPinnedScripts(getPinnedScripts());
  }, [pinnedIds]);

  return (
    <div
      className="flex flex-col bg-gray-50 overflow-hidden"
      style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
    >

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

      {/* ── Pinned scripts strip ──────────────────────────── */}
      {pinnedScripts.length > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar shrink-0 bg-gray-700 border-b border-white/10"
          aria-label="Pinned scripts"
        >
          <span className="shrink-0 text-[10px] font-bold text-white/40 uppercase tracking-wider pr-1 select-none">
            Home
          </span>
          {pinnedScripts.map(script => (
            <div key={script.id} className="shrink-0 flex items-stretch bg-[#E8610A]/90 rounded-xl overflow-hidden max-w-[200px]">
              <button
                onClick={() => speak({ text: script.text })}
                className="px-3 py-2 text-white text-[13px] font-semibold truncate min-w-0 flex-1 active:opacity-70 transition-opacity text-left"
                aria-label={`Speak: ${script.text}`}
              >
                {script.text}
              </button>
              <button
                onClick={() => togglePin(script.id)}
                className="shrink-0 px-2.5 border-l border-white/20 text-white/60 hover:text-white text-[15px] font-bold active:opacity-70 transition-opacity"
                aria-label={`Remove from Home: ${script.text}`}
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0" role="tabpanel">
        {viewMode === "core"    && <SupercoreGrid />}
        {viewMode === "browse"  && <AACHome />}
        {viewMode === "scripts" && <QuickPhrases currentSentence={sentenceText} />}
      </div>

      {/* ── Parent voice card creator — floating mic ─────── */}
      <VoiceCardCreator />
    </div>
  );
}
