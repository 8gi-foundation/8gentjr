"use client";

/**
 * TopicFilter - filter chips for SchoolTube topics.
 *
 * Wraps to as many rows as it needs below lg. It used to be one row with the
 * scrollbar hidden: 1274px of chips inside a 358px container and no scroll
 * cue, so 8 of the 11 topics were unreachable on a phone (#230 I2).
 *
 * Label colours come from `accentSurface`, not from eye: the old unselected
 * pills painted the pill's own pastel as its text and measured 1.19:1 on the
 * cyan page background (#230 I3).
 */

import { INK_DARK, accentSurface } from "@/lib/contrast";

const TOPICS = [
  { id: "all", label: "All", emoji: "✨", color: "#FF6B6B" },
  { id: "numbers", label: "Numbers", emoji: "🔢", color: "#FF6B6B" },
  { id: "letters", label: "ABC", emoji: "🔤", color: "#4ECDC4" },
  { id: "colors", label: "Colors", emoji: "🎨", color: "#FFE66D" },
  { id: "shapes", label: "Shapes", emoji: "⬛", color: "#95E1D3" },
  // #DDA0DD, #FF69B4 and #E056FD were in the banned 270-350 hue band.
  { id: "patterns", label: "Patterns", emoji: "🔄", color: "#FFB347" },
  { id: "sensory", label: "Sensory", emoji: "🌈", color: "#FF8C42" },
  { id: "speech", label: "Speech", emoji: "🗣️", color: "#686DE0" },
  { id: "creative", label: "Creative", emoji: "🎭", color: "#E8610A" },
  { id: "music", label: "Music", emoji: "🎵", color: "#22A6B3" },
  { id: "movement", label: "Body", emoji: "🕺", color: "#2ECC71" },
] as const;

interface TopicFilterProps {
  selectedTopics: string[];
  onTopicsChange: (topics: string[]) => void;
}

export default function TopicFilter({
  selectedTopics,
  onTopicsChange,
}: TopicFilterProps) {
  const toggleTopic = (topicId: string) => {
    if (topicId === "all") {
      onTopicsChange([]);
      return;
    }
    if (selectedTopics.includes(topicId)) {
      onTopicsChange(selectedTopics.filter((id) => id !== topicId));
    } else {
      onTopicsChange([...selectedTopics, topicId]);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-2 py-1 lg:flex-nowrap lg:overflow-x-auto"
      role="group"
      aria-label="Filter by topic"
    >
      {TOPICS.map((topic) => {
        const isSelected =
          topic.id === "all"
            ? selectedTopics.length === 0
            : selectedTopics.includes(topic.id);

        // Selected: the accent as fill, darkened only if no ink clears 4.5:1.
        // Unselected: white fill, dark ink, accent kept as the border alone.
        const surface = accentSurface(topic.color);

        return (
          <button
            key={topic.id}
            onClick={() => toggleTopic(topic.id)}
            aria-pressed={isSelected}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm min-h-[44px] transition-all border-2 active:scale-95"
            style={{
              backgroundColor: isSelected ? surface.background : "#FFFFFF",
              borderColor: isSelected ? surface.background : topic.color,
              color: isSelected ? surface.text : INK_DARK,
            }}
          >
            <span className="text-lg" aria-hidden="true">
              {topic.emoji}
            </span>
            {topic.label}
          </button>
        );
      })}
    </div>
  );
}
