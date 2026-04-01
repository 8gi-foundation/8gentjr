"use client";

/**
 * ReelsFeed — main content feed for SchoolTube.
 * Combines topic filters, daily activity banner, and a grid of reels.
 * Ported from NickOS.
 */

import { useState } from "react";
import { REELS_DATA } from "@/lib/reels-data";
import ReelCard from "./ReelCard";
import TopicFilter from "./TopicFilter";
import DailyActivityBanner from "./DailyActivityBanner";

export default function ReelsFeed() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [filterByGames, setFilterByGames] = useState<string[] | null>(null);

  const handleStartActivity = (gameTypes: string[]) => {
    if (gameTypes.length === 0) {
      setFilterByGames(null);
      setSelectedTopics([]);
    } else {
      setFilterByGames(gameTypes);
    }
  };

  const filteredReels = (() => {
    let reels = REELS_DATA;

    // Filter by daily activity game types if set
    if (filterByGames && filterByGames.length > 0) {
      reels = reels.filter(
        (reel) =>
          reel.type === "game" && filterByGames.includes(reel.gameType || "")
      );
    }

    // Then filter by topics
    if (selectedTopics.length > 0) {
      reels = reels.filter((reel) =>
        reel.topics.some((topic) => selectedTopics.includes(topic))
      );
    }

    return reels;
  })();

  return (
    <div className="h-full flex flex-col">
      <DailyActivityBanner onStartActivity={handleStartActivity} />

      <div className="px-4 mb-2">
        <TopicFilter
          selectedTopics={selectedTopics}
          onTopicsChange={setSelectedTopics}
        />
      </div>

      {/* Active filter indicator */}
      {filterByGames && (
        <div className="mx-4 mb-2 flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Showing today&apos;s activity games
          </span>
          <button
            onClick={() => setFilterByGames(null)}
            className="text-xs px-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Show all
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredReels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} />
          ))}
        </div>
        {filteredReels.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-5xl mb-2">{"\uD83D\uDD0D"}</div>
            <p className="font-semibold">No content for this filter</p>
            <p className="text-sm">Try a different topic!</p>
          </div>
        )}
      </div>
    </div>
  );
}
