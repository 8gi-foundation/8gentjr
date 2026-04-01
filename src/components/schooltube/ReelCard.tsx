"use client";

/**
 * ReelCard — gradient card for SchoolTube content (video or game).
 * Shows thumbnail, overlay gradient, play/game icon, and category badge.
 * Ported from NickOS, adapted to Tailwind without framer-motion/shadcn deps.
 */

import { useState } from "react";
import type { Reel } from "@/lib/reels-data";
import GamePlayer from "./GamePlayer";

function getGameCategory(
  topics: string[]
): "sensory" | "speech" | "game" {
  if (topics.includes("sensory")) return "sensory";
  if (topics.includes("speech")) return "speech";
  return "game";
}

const CATEGORY_STYLES = {
  sensory: { bg: "bg-yellow-300", text: "text-yellow-800", label: "SENSORY" },
  speech: { bg: "bg-teal-300", text: "text-teal-800", label: "SPEECH" },
  game: { bg: "bg-cyan-400", text: "text-white", label: "GAME" },
} as const;

export default function ReelCard({ reel }: { reel: Reel }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const category = reel.type === "game" ? getGameCategory(reel.topics) : null;
  const style = category
    ? CATEGORY_STYLES[category]
    : CATEGORY_STYLES.game;

  const handleClick = () => {
    if (reel.type === "video" && reel.videoUrl) {
      window.open(reel.videoUrl, "_blank", "noopener");
    } else {
      setIsPlaying(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="relative overflow-hidden rounded-2xl shadow-md group cursor-pointer transition-all hover:ring-2 hover:ring-cyan-400 active:scale-[0.97] w-full text-left"
      >
        <div className="aspect-[3/4] relative bg-gray-100">
          {/* Thumbnail */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={reel.thumbnail || "/placeholder.svg"}
            alt={reel.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Center play icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              {reel.type === "video" ? (
                <svg
                  className="h-7 w-7 text-cyan-500 ml-0.5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  className="h-7 w-7 text-cyan-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <rect x="2" y="6" width="20" height="12" rx="2" />
                  <path d="M12 12h.01M6 12h.01M18 12h.01" />
                </svg>
              )}
            </div>
          </div>

          {/* Title + duration */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">
              {reel.title}
            </h3>
            {reel.duration && (
              <span className="text-white/90 text-xs font-semibold mt-1 inline-block bg-black/30 px-2 py-0.5 rounded-full">
                {reel.duration}
              </span>
            )}
          </div>

          {/* Category badge */}
          {reel.type === "game" && (
            <div className="absolute top-2 right-2">
              <span
                className={`${style.bg} ${style.text} text-[10px] font-bold px-2 py-1 rounded-full shadow-md`}
              >
                {style.label}
              </span>
            </div>
          )}
        </div>
      </button>

      {isPlaying && reel.type === "game" && (
        <GamePlayer
          reel={reel}
          open={isPlaying}
          onOpenChange={setIsPlaying}
        />
      )}
    </>
  );
}
