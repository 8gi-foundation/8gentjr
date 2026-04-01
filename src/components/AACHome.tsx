"use client";

/**
 * AACHome — category browser for the expanded AAC system.
 * Shows all AAC categories as tappable cards with ARASAAC pictograms.
 * Links to /category/[id] for detail views.
 */

import Link from "next/link";

export interface AACCategoryDef {
  id: string;
  name: string;
  emoji: string;
  color: string;
  count: number;
}

const AAC_CATEGORIES: AACCategoryDef[] = [
  { id: "wants", name: "Wants", emoji: "\uD83C\uDF1F", color: "#FFD700", count: 12 },
  { id: "feelings", name: "Feelings", emoji: "\uD83D\uDE0A", color: "#FF6B6B", count: 20 },
  { id: "actions", name: "Actions", emoji: "\uD83C\uDFC3", color: "#4CAF50", count: 25 },
  { id: "food", name: "Food", emoji: "\uD83C\uDF4E", color: "#FF9800", count: 30 },
  { id: "people", name: "People", emoji: "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67", color: "#FFD700", count: 15 },
  { id: "places", name: "Places", emoji: "\uD83C\uDFE0", color: "#8B6914", count: 12 },
  { id: "animals", name: "Animals", emoji: "\uD83D\uDC36", color: "#A67C52", count: 18 },
  { id: "body", name: "Body", emoji: "\uD83E\uDD35", color: "#E91E63", count: 14 },
  { id: "clothes", name: "Clothes", emoji: "\uD83D\uDC55", color: "#9C27B0", count: 10 },
  { id: "toys", name: "Toys", emoji: "\uD83E\uDDF8", color: "#E040FB", count: 16 },
  { id: "nature", name: "Nature", emoji: "\uD83C\uDF33", color: "#2ECC71", count: 12 },
  { id: "school", name: "School", emoji: "\uD83C\uDFEB", color: "#2196F3", count: 15 },
  { id: "time", name: "Time", emoji: "\u23F0", color: "#00BCD4", count: 8 },
  { id: "questions", name: "Questions", emoji: "\u2753", color: "#00BCD4", count: 10 },
  { id: "describing", name: "Describing", emoji: "\uD83D\uDD35", color: "#2196F3", count: 20 },
  { id: "social", name: "Social", emoji: "\uD83D\uDC4B", color: "#E8610A", count: 12 },
  { id: "safety", name: "Safety", emoji: "\uD83D\uDEA8", color: "#F44336", count: 6 },
  { id: "transport", name: "Transport", emoji: "\uD83D\uDE97", color: "#607D8B", count: 10 },
];

export { AAC_CATEGORIES };

export default function AACHome() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 md:grid-cols-4 lg:grid-cols-6">
      {AAC_CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.id}`}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 hover:shadow-md border-2"
          style={{
            borderColor: cat.color + "40",
            backgroundColor: cat.color + "12",
          }}
        >
          <span className="text-4xl">{cat.emoji}</span>
          <span
            className="text-sm font-bold text-center leading-tight"
            style={{ color: cat.color }}
          >
            {cat.name}
          </span>
          <span className="text-[10px] text-gray-400">
            {cat.count} words
          </span>
        </Link>
      ))}
    </div>
  );
}
