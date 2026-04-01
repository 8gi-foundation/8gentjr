"use client";

import { type MoodKey, getAllPlaylists } from "../lib/emotional-playlists";

interface MoodSelectorProps {
  onSelectMood: (mood: MoodKey) => void;
}

export default function MoodSelector({ onSelectMood }: MoodSelectorProps) {
  const playlists = getAllPlaylists();

  return (
    <div>
      <h1 className="text-center text-[28px] mt-4 mb-2">
        How are you feeling?
      </h1>
      <p className="text-center text-base text-gray-500 mb-5">
        Pick a mood for your music
      </p>
      <div className="grid grid-cols-2 gap-3 px-4 pb-6">
        {playlists.map(({ key, name, emoji, color }) => (
          <button
            key={key}
            onClick={() => onSelectMood(key)}
            className="min-h-[60px] border-none rounded-2xl cursor-pointer flex flex-col items-center justify-center p-4 gap-1 shadow-sm transition-transform duration-150 ease-out active:scale-95"
            style={{ background: color }}
            aria-label={`Select ${name} mood`}
          >
            <span className="text-4xl">{emoji}</span>
            <span className="text-base font-semibold text-[#1a1a2e]">{name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
