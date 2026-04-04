"use client";

/**
 * AACHome — TouchChat-quality category grid for 8gent Jr.
 *
 * Issue #71: Rich ARASAAC pictogram headers, Fitzgerald Key gradient cards,
 * section grouping, word counts, 60px+ touch targets, staggered entry animation.
 */

import Link from "next/link";
import { AAC_CATEGORIES } from "@/lib/vocabulary";

// Word counts per category (static — derived from phrase arrays in vocabulary.ts)
const WORD_COUNTS: Record<string, number> = {
  general: 16,
  feelings: 15,
  actions: 18,
  questions: 8,
  food: 20,
  drinks: 10,
  clothes: 14,
  body: 16,
  play: 12,
  colours: 12,
  numbers: 15,
  shapes: 8,
  people: 10,
  places: 12,
  school: 14,
  home: 14,
};

// Section groupings matching vocabulary.ts comment structure
const SECTIONS = [
  {
    label: "Core Communication",
    ids: ["general", "feelings", "actions", "questions"],
  },
  {
    label: "Daily Life",
    ids: ["food", "drinks", "clothes", "body"],
  },
  {
    label: "Fun & Learning",
    ids: ["play", "colours", "numbers", "shapes"],
  },
  {
    label: "People & Places",
    ids: ["people", "places", "school", "home"],
  },
];

export default function AACHome() {
  const catMap = Object.fromEntries(AAC_CATEGORIES.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-6 p-4 pb-8 overflow-y-auto">
      {SECTIONS.map((section) => (
        <div key={section.label}>
          {/* Section label */}
          <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3 px-1">
            {section.label}
          </p>

          {/* 2-col on mobile, 4-col on md+ */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {section.ids.map((id, i) => {
              const cat = catMap[id];
              if (!cat) return null;
              const count = WORD_COUNTS[id] ?? 0;

              return (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
                  className="group relative flex flex-col items-center justify-between rounded-2xl overflow-hidden
                             min-h-[120px] p-3 border transition-all duration-150
                             active:scale-95 active:brightness-90 hover:shadow-lg hover:shadow-black/20"
                  style={{
                    background: `linear-gradient(145deg, ${cat.color}28 0%, ${cat.color}14 100%)`,
                    borderColor: `${cat.color}50`,
                    animationDelay: `${i * 40}ms`,
                  }}
                >
                  {/* Subtle inner highlight */}
                  <div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at 30% 20%, ${cat.color}22 0%, transparent 65%)`,
                    }}
                  />

                  {/* Word count badge */}
                  {count > 0 && (
                    <span
                      className="absolute top-2 right-2 text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none"
                      style={{
                        backgroundColor: `${cat.color}30`,
                        color: cat.color,
                        border: `1px solid ${cat.color}40`,
                      }}
                    >
                      {count}
                    </span>
                  )}

                  {/* ARASAAC pictogram */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    width={96}
                    height={96}
                    className="w-24 h-24 object-contain drop-shadow-sm mt-1 group-hover:scale-105 transition-transform duration-150"
                  />

                  {/* Category name */}
                  <span
                    className="text-sm font-extrabold text-center leading-tight mt-2 z-10"
                    style={{ color: cat.color }}
                  >
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
