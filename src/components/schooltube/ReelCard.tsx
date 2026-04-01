"use client";

/**
 * ReelCard — gradient card for SchoolTube content (video or game).
 * Shows thumbnail, overlay gradient, play/game icon, and category badge.
 * Ported from NickOS, adapted to Tailwind without framer-motion/shadcn deps.
 */

import { useState } from "react";
import type { Reel } from "@/lib/reels-data";
import GamePlayer from "./GamePlayer";

/** Embedded video player overlay */
function VideoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  // Convert YouTube watch URLs to embed URLs
  const embedUrl = url
    .replace("youtube.com/watch?v=", "youtube.com/embed/")
    .replace("youtu.be/", "youtube.com/embed/");

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-12 h-12 rounded-full bg-white/20 text-white text-2xl flex items-center justify-center hover:bg-white/30 z-10"
        aria-label="Close video"
      >
        &#10005;
      </button>
      <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video player"
        />
      </div>
    </div>
  );
}

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

/** Gradient backgrounds per topic — matches NickOS vibrant card style */
const TOPIC_GRADIENTS: Record<string, string> = {
  numbers: "linear-gradient(135deg, #FF6B6B, #FFE66D)",
  letters: "linear-gradient(135deg, #4ECDC4, #556270)",
  colors: "linear-gradient(135deg, #F093FB, #F5576C)",
  shapes: "linear-gradient(135deg, #4FACFE, #00F2FE)",
  patterns: "linear-gradient(135deg, #43E97B, #38F9D7)",
  sensory: "linear-gradient(135deg, #FA709A, #FEE140)",
  speech: "linear-gradient(135deg, #A18CD1, #FBC2EB)",
  feelings: "linear-gradient(135deg, #FCCB90, #D57EEB)",
  animals: "linear-gradient(135deg, #84FAB0, #8FD3F4)",
  nature: "linear-gradient(135deg, #667EEA, #764BA2)",
  movement: "linear-gradient(135deg, #FF9A9E, #FECFEF)",
  music: "linear-gradient(135deg, #A1C4FD, #C2E9FB)",
  default: "linear-gradient(135deg, #E0C3FC, #8EC5FC)",
};

function getGradient(topics: string[]): string {
  for (const t of topics) {
    if (TOPIC_GRADIENTS[t]) return TOPIC_GRADIENTS[t];
  }
  return TOPIC_GRADIENTS.default;
}

export default function ReelCard({ reel }: { reel: Reel }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const category = reel.type === "game" ? getGameCategory(reel.topics) : null;
  const style = category
    ? CATEGORY_STYLES[category]
    : CATEGORY_STYLES.game;

  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const handleClick = () => {
    if (reel.type === "video" && reel.videoUrl) {
      setIsVideoOpen(true);
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
        <div
          className="aspect-[3/4] relative"
          style={{ background: getGradient(reel.topics) }}
        >

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

      {isVideoOpen && reel.type === "video" && reel.videoUrl && (
        <VideoPlayer
          url={reel.videoUrl}
          onClose={() => setIsVideoOpen(false)}
        />
      )}
    </>
  );
}
