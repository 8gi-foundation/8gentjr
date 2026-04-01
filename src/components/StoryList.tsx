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
    <div style={styles.grid}>
      {SOCIAL_STORIES.map((story) => (
        <button
          key={story.id}
          onClick={() => onSelect(story)}
          style={styles.card}
          aria-label={`Read story: ${story.title}`}
        >
          <span style={styles.icon}>{story.icon}</span>
          <span style={styles.title}>{story.title}</span>
          <span style={styles.badge}>{story.steps.length} steps</span>
        </button>
      ))}
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "1rem",
    width: "100%",
    maxWidth: 520,
    padding: "0 1rem",
  },
  card: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "0.5rem",
    padding: "1.25rem 1rem",
    background: "#FFFFFF",
    borderRadius: 16,
    border: "2px solid #FFF0E0",
    boxShadow: "0 2px 12px rgba(232, 97, 10, 0.06)",
    cursor: "pointer",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    minHeight: 48,
    touchAction: "manipulation" as const,
    WebkitTapHighlightColor: "transparent",
  },
  icon: {
    fontSize: "2.5rem",
    lineHeight: 1,
  },
  title: {
    fontSize: "1rem",
    fontWeight: 600 as const,
    color: "#1a1a2e",
    textAlign: "center" as const,
  },
  badge: {
    fontSize: "0.75rem",
    fontWeight: 600 as const,
    color: "#E8610A",
    background: "#FFF0E0",
    padding: "3px 10px",
    borderRadius: 12,
  },
} as const;
