"use client";

/**
 * TopicFilter — horizontal scrollable filter chips for SchoolTube topics.
 * Ported from NickOS, adapted to Tailwind (no shadcn Button dependency).
 */

const TOPICS = [
  { id: "all", label: "All", emoji: "\u2728", color: "#FF6B6B" },
  { id: "numbers", label: "Numbers", emoji: "\uD83D\uDD22", color: "#FF6B6B" },
  { id: "letters", label: "ABC", emoji: "\uD83D\uDD24", color: "#4ECDC4" },
  { id: "colors", label: "Colors", emoji: "\uD83C\uDFA8", color: "#FFE66D" },
  { id: "shapes", label: "Shapes", emoji: "\u2B1B", color: "#95E1D3" },
  { id: "patterns", label: "Patterns", emoji: "\uD83D\uDD04", color: "#DDA0DD" },
  { id: "sensory", label: "Sensory", emoji: "\uD83C\uDF08", color: "#FF69B4" },
  { id: "speech", label: "Speech", emoji: "\uD83D\uDDE3\uFE0F", color: "#686DE0" },
  { id: "creative", label: "Creative", emoji: "\uD83C\uDFAD", color: "#E056FD" },
  { id: "music", label: "Music", emoji: "\uD83C\uDFB5", color: "#22A6B3" },
  { id: "movement", label: "Body", emoji: "\uD83D\uDD7A", color: "#2ECC71" },
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
    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
      {TOPICS.map((topic) => {
        const isSelected =
          topic.id === "all"
            ? selectedTopics.length === 0
            : selectedTopics.includes(topic.id);

        return (
          <button
            key={topic.id}
            onClick={() => toggleTopic(topic.id)}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm min-h-[44px] transition-all border-2 active:scale-95"
            style={{
              backgroundColor: isSelected ? topic.color : "transparent",
              borderColor: topic.color,
              color: isSelected ? "white" : topic.color,
            }}
          >
            <span className="text-lg">{topic.emoji}</span>
            {topic.label}
          </button>
        );
      })}
    </div>
  );
}
