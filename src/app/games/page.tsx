"use client";

/**
 * Games Page — SchoolTube layout with reels feed, topic filters,
 * and the vibrant cyan gradient background from NickOS.
 *
 * Updated from basic game grid to full SchoolTube UI.
 */

import ReelsFeed from "@/components/schooltube/ReelsFeed";

export default function GamesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-400 via-cyan-500 to-teal-600">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <h1 className="text-3xl font-extrabold text-white text-center drop-shadow-md">
          SchoolTube
        </h1>
        <p className="text-center text-white/80 text-sm mt-1">
          Learn through play!
        </p>
      </div>

      {/* Reels Feed */}
      <ReelsFeed />
    </div>
  );
}
