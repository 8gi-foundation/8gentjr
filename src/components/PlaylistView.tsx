"use client";

import { useState } from "react";
import { type MoodKey, getPlaylist } from "../lib/emotional-playlists";

interface PlaylistViewProps {
  mood: MoodKey;
  onBack: () => void;
}

export default function PlaylistView({ mood, onBack }: PlaylistViewProps) {
  const playlist = getPlaylist(mood);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);

  function togglePlay(index: number) {
    setPlayingIndex(playingIndex === index ? null : index);
  }

  return (
    <div style={{ padding: "0 16px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <button
          onClick={onBack}
          style={{
            background: "none",
            border: "2px solid #ccc",
            borderRadius: 12,
            padding: "8px 14px",
            fontSize: 16,
            cursor: "pointer",
            color: "#1a1a2e",
            fontWeight: 600,
          }}
          aria-label="Back to mood selector"
        >
          &larr; Back
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <span style={{ fontSize: 32 }}>{playlist.emoji}</span>
          <h2 style={{ margin: "4px 0 0", fontSize: 22 }}>{playlist.name}</h2>
          <p style={{ margin: 0, fontSize: 14, color: "#666" }}>{playlist.description}</p>
        </div>
        {/* Spacer to center the title */}
        <div style={{ width: 70 }} />
      </div>

      {/* Track list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {playlist.tracks.map((track, i) => {
          const isPlaying = playingIndex === i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: isPlaying ? playlist.color + "33" : "#fff",
                border: `2px solid ${isPlaying ? playlist.color : "#e0e0e0"}`,
                borderRadius: 14,
                padding: "12px 16px",
                transition: "all 0.15s ease",
              }}
            >
              {/* Play/Pause button */}
              <button
                onClick={() => togglePlay(i)}
                style={{
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  borderRadius: "50%",
                  border: "none",
                  background: playlist.color,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                }}
                aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {isPlaying ? "\u23F8\uFE0F" : "\u25B6\uFE0F"}
              </button>

              {/* Track info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1a1a2e",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {track.title}
                </div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{track.artist}</div>
              </div>

              {/* Duration */}
              <span style={{ fontSize: 13, color: "#999", fontVariantNumeric: "tabular-nums" }}>
                {track.duration}
              </span>
            </div>
          );
        })}
      </div>

      {/* Placeholder note */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 16 }}>
        Audio playback coming in a future update
      </p>
    </div>
  );
}
