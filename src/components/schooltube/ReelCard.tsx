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

/** Per-card emoji + gradient — matches NickOS vibrant card style */
const CARD_THUMBNAILS: Record<number, { emoji: string; from: string; to: string }> = {
  // Videos
  1: { emoji: "\uD83D\uDD22", from: "#f97316", to: "#ec4899" },
  5: { emoji: "\uD83D\uDD22", from: "#ef4444", to: "#f59e0b" },
  2: { emoji: "\uD83D\uDD24", from: "#8b5cf6", to: "#3b82f6" },
  6: { emoji: "\uD83D\uDD24", from: "#6366f1", to: "#ec4899" },
  3: { emoji: "\uD83C\uDF08", from: "#ef4444", to: "#eab308" },
  7: { emoji: "\uD83C\uDF08", from: "#f97316", to: "#eab308" },
  4: { emoji: "\uD83D\uDD37", from: "#06b6d4", to: "#8b5cf6" },
  9: { emoji: "\uD83D\uDD37", from: "#3b82f6", to: "#8b5cf6" },
  // Academic games
  10: { emoji: "\uD83C\uDFAF", from: "#f97316", to: "#ef4444" },
  11: { emoji: "\uD83E\uDEE7", from: "#3b82f6", to: "#06b6d4" },
  12: { emoji: "\u270F\uFE0F", from: "#f59e0b", to: "#ef4444" },
  13: { emoji: "\uD83D\uDD22", from: "#22c55e", to: "#06b6d4" },
  20: { emoji: "\uD83D\uDD36", from: "#8b5cf6", to: "#ec4899" },
  21: { emoji: "\uD83C\uDFB4", from: "#6366f1", to: "#3b82f6" },
  22: { emoji: "\uD83D\uDCCF", from: "#f97316", to: "#eab308" },
  30: { emoji: "\uD83C\uDFA8", from: "#10b981", to: "#3b82f6" },
  31: { emoji: "\uD83C\uDFA8", from: "#ef4444", to: "#f59e0b" },
  40: { emoji: "\u270F\uFE0F", from: "#f59e0b", to: "#ef4444" },
  50: { emoji: "\uD83E\uDDE9", from: "#a855f7", to: "#ec4899" },
  // Sensory games
  100: { emoji: "\uD83C\uDF27\uFE0F", from: "#6366f1", to: "#ec4899" },
  101: { emoji: "\uD83C\uDF66", from: "#ec4899", to: "#f59e0b" },
  102: { emoji: "\uD83E\uDDF4", from: "#3b82f6", to: "#6366f1" },
  103: { emoji: "\uD83C\uDFD7\uFE0F", from: "#f97316", to: "#ef4444" },
  104: { emoji: "\uD83C\uDF86", from: "#eab308", to: "#ef4444" },
  105: { emoji: "\uD83C\uDFB5", from: "#8b5cf6", to: "#ec4899" },
  106: { emoji: "\uD83D\uDD8C\uFE0F", from: "#22c55e", to: "#06b6d4" },
  107: { emoji: "\uD83E\uDEE7", from: "#14b8a6", to: "#06b6d4" },
  108: { emoji: "\uD83D\uDCA7", from: "#3b82f6", to: "#22c55e" },
  109: { emoji: "\uD83C\uDF00", from: "#06b6d4", to: "#6366f1" },
  110: { emoji: "\uD83D\uDD2E", from: "#a855f7", to: "#3b82f6" },
  // Sensory 3D games
  120: { emoji: "\u2728", from: "#6366f1", to: "#a855f7" },
  121: { emoji: "\uD83E\uDEC1", from: "#0ea5e9", to: "#6366f1" },
  122: { emoji: "\uD83D\uDC8E", from: "#a855f7", to: "#ec4899" },
  123: { emoji: "\u2B50", from: "#1e1b4b", to: "#312e81" },
  124: { emoji: "\uD83D\uDCA5", from: "#ef4444", to: "#f97316" },
  125: { emoji: "\uD83C\uDFD7\uFE0F", from: "#6366f1", to: "#ec4899" },
  126: { emoji: "\uD83D\uDD2E", from: "#7c3aed", to: "#4f46e5" },
  127: { emoji: "\uD83C\uDFB2", from: "#f59e0b", to: "#ef4444" },
  128: { emoji: "\uD83C\uDFB5", from: "#0f172a", to: "#1e1b4b" },
  129: { emoji: "\uD83E\uDDF2", from: "#f59e0b", to: "#06b6d4" },
  // Speech games
  200: { emoji: "\uD83D\uDC3E", from: "#22c55e", to: "#10b981" },
  201: { emoji: "\uD83D\uDE0A", from: "#f59e0b", to: "#f97316" },
  202: { emoji: "\uD83D\uDDE3\uFE0F", from: "#3b82f6", to: "#8b5cf6" },
  203: { emoji: "\uD83E\uDD38", from: "#22c55e", to: "#f59e0b" },
  204: { emoji: "\uD83D\uDCDD", from: "#6366f1", to: "#ec4899" },
  205: { emoji: "\uD83C\uDFB6", from: "#f59e0b", to: "#ef4444" },
  206: { emoji: "\uD83C\uDF3F", from: "#22c55e", to: "#06b6d4" },
  207: { emoji: "\uD83E\uDD98", from: "#f97316", to: "#22c55e" },
};

const FALLBACK_GRADIENT = "linear-gradient(135deg, #E0C3FC, #8EC5FC)";

function getCardStyle(reel: Reel): { gradient: string; emoji: string } {
  const thumb = CARD_THUMBNAILS[reel.id];
  if (thumb) {
    return {
      gradient: `linear-gradient(135deg, ${thumb.from}, ${thumb.to})`,
      emoji: thumb.emoji,
    };
  }
  return { gradient: FALLBACK_GRADIENT, emoji: "\uD83C\uDFAE" };
}

export default function ReelCard({ reel }: { reel: Reel }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const category = reel.type === "game" ? getGameCategory(reel.topics) : null;
  const style = category
    ? CATEGORY_STYLES[category]
    : CATEGORY_STYLES.game;

  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const cardStyle = getCardStyle(reel);

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
        className="relative overflow-hidden rounded-2xl shadow-lg group cursor-pointer transition-all hover:ring-2 hover:ring-cyan-400 active:scale-[0.93] w-full text-left"
        style={{ transition: 'transform 0.1s ease, box-shadow 0.15s ease' }}
      >
        <div
          className="aspect-[4/3] relative"
          style={{ background: cardStyle.gradient }}
        >
          {/* Card emoji icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-90 drop-shadow-lg">{cardStyle.emoji}</span>
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Center play icon — visible on hover (desktop) always on touch */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:group-hover:opacity-100 opacity-100 transition-opacity duration-150">
            <div className="h-14 w-14 rounded-full bg-white/95 flex items-center justify-center shadow-xl">
              {reel.type === "video" ? (
                <svg
                  className="h-7 w-7 text-cyan-500 ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6 text-cyan-500"
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
