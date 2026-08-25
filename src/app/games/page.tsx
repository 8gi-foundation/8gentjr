"use client";

/**
 * Games Page — SchoolTube layout with reels feed, topic filters,
 * and the vibrant cyan gradient background from NickOS.
 *
 * Updated from basic game grid to full SchoolTube UI.
 */

import ReelsFeed from "@/components/schooltube/ReelsFeed";

export default function GamesPage() {
  // Warm/teal page ramp: hues 270-350 are banned brand-wide (CLAUDE.md),
  // which the old `via-purple-400 to-pink-400` broke.
  return (
    <div className="min-h-dvh bg-gradient-to-b from-cyan-400 via-teal-400 to-amber-300">
      {/* Header */}
      <div className="px-4 md:px-6 pt-6 pb-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white text-center drop-shadow-md">
          Games
        </h1>
        <p className="text-center text-white/80 text-sm md:text-base mt-1">
          Learn through play!
        </p>
      </div>

      {/* Reels Feed */}
      <ReelsFeed />
    </div>
  );
}
