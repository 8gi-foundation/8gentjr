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
    <div className="px-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 py-4">
        <button
          onClick={onBack}
          className="bg-transparent border-2 border-gray-300 rounded-xl px-3.5 py-2 text-base cursor-pointer text-[#1a1a2e] font-semibold"
          aria-label="Back to mood selector"
        >
          &larr; Back
        </button>
        <div className="flex-1 text-center">
          <span className="text-[32px]">{playlist.emoji}</span>
          <h2 className="mt-1 mb-0 text-[22px]">{playlist.name}</h2>
          <p className="m-0 text-sm text-gray-500">{playlist.description}</p>
        </div>
        <div className="w-[70px]" />
      </div>

      {/* Track list */}
      <div className="flex flex-col gap-2">
        {playlist.tracks.map((track, i) => {
          const isPlaying = playingIndex === i;
          return (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[14px] px-4 py-3 transition-all duration-150 ease-out"
              style={{
                background: isPlaying ? playlist.color + "33" : "#fff",
                border: `2px solid ${isPlaying ? playlist.color : "#e0e0e0"}`,
              }}
            >
              <button
                onClick={() => togglePlay(i)}
                className="w-11 h-11 min-w-[44px] rounded-full border-none cursor-pointer flex items-center justify-center text-lg shadow-sm"
                style={{ background: playlist.color }}
                aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              >
                {isPlaying ? "\u23F8\uFE0F" : "\u25B6\uFE0F"}
              </button>

              <div className="flex-1 min-w-0">
                <div className="text-[15px] font-semibold text-[#1a1a2e] whitespace-nowrap overflow-hidden text-ellipsis">
                  {track.title}
                </div>
                <div className="text-[13px] text-gray-400 mt-0.5">{track.artist}</div>
              </div>

              <span className="text-[13px] text-gray-400 tabular-nums">
                {track.duration}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        Audio playback coming in a future update
      </p>
    </div>
  );
}
