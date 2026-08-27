"use client";

/**
 * ReelCard — gradient card for SchoolTube content (video or game).
 * Gradient art on top with the play/game icon and category badge; the title
 * sits in a solid footer bar below the art, never underneath the artwork.
 * Ported from NickOS, adapted to Tailwind without framer-motion/shadcn deps.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Reel } from "@/lib/reels-data";
import { cardStyleForId } from "@/lib/card-gradients";
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

function getCardStyle(reel: Reel): { gradient: string; emoji: string } {
  return cardStyleForId(reel.id);
}

export default function ReelCard({ reel }: { reel: Reel }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isVideoOpen, setIsVideoOpen] = useState(false);

  const category = reel.type === "game" ? getGameCategory(reel.topics) : null;
  const style = category
    ? CATEGORY_STYLES[category]
    : CATEGORY_STYLES.game;

  const cardStyle = getCardStyle(reel);
  const isOpen = isPlaying || isVideoOpen;

  // Guards against popping the same history entry twice: the dialog's own
  // `close` event also fires while we are unwinding from a popstate.
  const closingRef = useRef(false);

  /**
   * Opening an overlay pushes a history entry, so system back and the iOS
   * edge-swipe mean "back to the games list" instead of exiting to /talk
   * (#230 C4). Closing pops that entry, keeping the stack clean.
   */
  useEffect(() => {
    if (!isOpen) return;

    closingRef.current = false;
    window.history.pushState({ reelOverlay: reel.id }, "");

    const onPopState = () => {
      closingRef.current = true;
      setIsPlaying(false);
      setIsVideoOpen(false);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isOpen, reel.id]);

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    window.history.back();
  }, []);

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
        className="relative overflow-hidden rounded-2xl shadow-lg bg-white cursor-pointer transition-all hover:ring-2 hover:ring-cyan-400 active:scale-[0.93] w-full text-left"
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

          {/* Play affordance - one opacity state. The old class list ended in a
              bare `opacity-100`, so the hover-only rules never applied and the
              circle sat permanently on top of the title (#230 I1). */}
          <div className="absolute inset-0 flex items-center justify-center">
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

        {/* Title footer - solid bar BELOW the art, so nothing is ever painted
            over the title. 16px in the dark ink token. */}
        <div className="bg-white px-3 py-2.5">
          <h3
            className="font-bold text-base leading-snug line-clamp-2"
            style={{ color: "#1A1612" }}
          >
            {reel.title}
          </h3>
          {reel.duration && (
            <span
              className="mt-1 inline-block rounded-full bg-[#F4EDE3] px-2 py-0.5 text-xs font-semibold"
              style={{ color: "#5C544A" }}
            >
              {reel.duration}
            </span>
          )}
        </div>
      </button>

      {isPlaying && reel.type === "game" && (
        <GamePlayer
          reel={reel}
          open={isPlaying}
          onOpenChange={(open) => {
            if (!open) requestClose();
          }}
        />
      )}

      {isVideoOpen && reel.type === "video" && reel.videoUrl && (
        <VideoPlayer url={reel.videoUrl} onClose={requestClose} />
      )}
    </>
  );
}
