"use client";

import { type MoodKey, getAllPlaylists } from "../lib/emotional-playlists";

interface MoodSelectorProps {
  onSelectMood: (mood: MoodKey) => void;
}

export default function MoodSelector({ onSelectMood }: MoodSelectorProps) {
  const playlists = getAllPlaylists();

  return (
    <div>
      <h1 style={{ textAlign: "center", fontSize: 28, margin: "16px 0 8px" }}>
        How are you feeling?
      </h1>
      <p style={{ textAlign: "center", fontSize: 16, color: "#666", margin: "0 0 20px" }}>
        Pick a mood for your music
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 16px 24px",
        }}
      >
        {playlists.map(({ key, name, emoji, color }) => (
          <button
            key={key}
            onClick={() => onSelectMood(key)}
            style={{
              minHeight: 60,
              background: color,
              border: "none",
              borderRadius: 16,
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
              gap: 4,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              transition: "transform 0.15s ease",
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            }}
            aria-label={`Select ${name} mood`}
          >
            <span style={{ fontSize: 36 }}>{emoji}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
