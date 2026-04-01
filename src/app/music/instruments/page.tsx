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
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#FFF8F0",
        paddingBottom: 24,
      }}
    >
      {/* Header */}
      <h1
        style={{
          fontSize: 22,
          fontWeight: 800,
          margin: "20px 0 4px",
          color: "#1a1a2e",
        }}
      >
        Instruments
      </h1>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 8,
          margin: "12px 0 20px",
          padding: "4px",
          borderRadius: 14,
          background: "#f0e6d6",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 20px",
              border: "none",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              background: tab === t.id ? "#fff" : "transparent",
              color: tab === t.id ? "#1a1a2e" : "#8a7e70",
              boxShadow: tab === t.id ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              transition: "background 0.15s, color 0.15s, box-shadow 0.15s",
            }}
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
