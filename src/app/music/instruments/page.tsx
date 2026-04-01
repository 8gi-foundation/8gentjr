"use client";

import { useState } from "react";
import { DrumPads } from "@/components/DrumPads";
import { XylophoneKeys } from "@/components/XylophoneKeys";

/* ── Tab options ──────────────────────────────────────────── */

const TABS = [
  { id: "drums",      label: "Drums",      icon: "🥁" },
  { id: "xylophone",  label: "Xylophone",  icon: "🎵" },
] as const;

type TabId = (typeof TABS)[number]["id"];

/* ── Page ─────────────────────────────────────────────────── */

export default function InstrumentsPage() {
  const [tab, setTab] = useState<TabId>("drums");

  return (
    <div className="min-h-dvh flex flex-col items-center bg-[#FFF8F0] pb-6">
      {/* Header */}
      <h1 className="text-[22px] font-extrabold mt-5 mb-1 text-[#1a1a2e]">
        Instruments
      </h1>

      {/* Tab bar */}
      <div className="flex gap-2 my-3 mb-5 p-1 rounded-[14px] bg-[#f0e6d6]">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 border-none rounded-[10px] font-bold text-[15px] cursor-pointer transition-all duration-150 ${
              tab === t.id
                ? "bg-white text-[#1a1a2e] shadow-md"
                : "bg-transparent text-[#8a7e70]"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Instrument */}
      {tab === "drums" ? <DrumPads /> : <XylophoneKeys />}
    </div>
  );
}
