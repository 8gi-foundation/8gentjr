"use client";

/**
 * Talk Page — main AAC communication hub for 8gent Jr.
 *
 * Primary view: SupercoreGrid — 50 core words, fixed Fitzgerald Key layout.
 * Secondary: Browse Topics (category grid → word grid).
 *
 * Issue #20: SupercoreGrid is the foundation of speech therapy motor planning.
 */

import { useState } from "react";
import { SupercoreGrid } from "@/components/SupercoreGrid";
import AACHome from "@/components/AACHome";

type ViewMode = "core" | "browse";

export default function TalkPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("core");

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-gray-800 shrink-0">
        <button
          onClick={() => setViewMode("core")}
          className={`flex items-center gap-1 text-white/70 hover:text-white transition-colors ${viewMode === "core" ? "invisible" : ""}`}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span className="text-base font-medium">Core</span>
        </button>

        <h1 className="text-white text-lg font-bold">
          {viewMode === "core" ? "Talk" : "Browse Topics"}
        </h1>

        <button
          onClick={() => setViewMode(viewMode === "core" ? "browse" : "core")}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition-colors"
        >
          {viewMode === "core" ? "Browse" : "Core"}
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "core" && <SupercoreGrid />}
        {viewMode === "browse" && <AACHome />}
      </div>
    </div>
  );
}
