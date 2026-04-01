"use client";

import type { SocialStory } from "@/lib/social-stories";
import { SOCIAL_STORIES } from "@/lib/social-stories";

/* ── StoryList ──────────────────────────────────────────────
   Grid of story cards — each shows emoji + title + step count.
   ──────────────────────────────────────────────────────────── */

export default function StoryList({
  onSelect,
}: {
  onSelect: (story: SocialStory) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-4 w-full max-w-[520px] px-4">
      {SOCIAL_STORIES.map((story) => (
        <button
          key={story.id}
          onClick={() => onSelect(story)}
          className="flex flex-col items-center gap-2 py-5 px-4 bg-white rounded-2xl border-2 border-[#FFF0E0] shadow-[0_2px_12px_rgba(232,97,10,0.06)] cursor-pointer transition-all duration-[120ms] min-h-[48px] select-none hover:scale-105 hover:shadow-md active:scale-95"
          style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
          aria-label={`Read story: ${story.title}`}
        >
          <span className="text-[2.5rem] leading-none">{story.icon}</span>
          <span className="text-base font-semibold text-[#1a1a2e] text-center">{story.title}</span>
          <span className="text-xs font-semibold text-[#E8610A] bg-[#FFF0E0] py-0.5 px-2.5 rounded-xl">
            {story.steps.length} steps
          </span>
        </button>
      ))}
    </div>
  );
}
