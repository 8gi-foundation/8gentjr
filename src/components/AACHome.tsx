"use client";

/**
 * AACHome — category browser for 8gent Jr.
 *
 * Uses AAC_CATEGORIES from vocabulary.ts — ARASAAC pictogram headers,
 * Fitzgerald Key color coding, TouchChat-quality layout.
 *
 * Issue #71: TouchChat-quality category grid with ARASAAC pictograms.
 */

import Link from "next/link";
import { AAC_CATEGORIES } from "@/lib/vocabulary";

export default function AACHome() {
  return (
    <div className="grid grid-cols-3 gap-3 p-4 md:grid-cols-4 overflow-y-auto">
      {AAC_CATEGORIES.map((cat) => (
        <Link
          key={cat.id}
          href={`/category/${cat.id}`}
          className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all active:scale-95 hover:shadow-md border-2"
          style={{
            borderColor: cat.color + "60",
            backgroundColor: cat.color + "18",
          }}
        >
          {/* ARASAAC pictogram */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cat.imageUrl}
            alt={cat.name}
            className="w-16 h-16 object-contain"
          />
          <span
            className="text-sm font-bold text-center leading-tight"
            style={{ color: cat.color }}
          >
            {cat.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
