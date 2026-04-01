"use client";

import { useState } from "react";
import type { SocialStory } from "@/lib/social-stories";
import StoryList from "@/components/StoryList";
import StoryViewer from "@/components/StoryViewer";

export default function StoriesPage() {
  const [selected, setSelected] = useState<SocialStory | null>(null);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "2rem 0",
        background: "#FFF8F0",
      }}
    >
      {selected ? (
        <StoryViewer story={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <h1
            style={{
              fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
              fontWeight: 800,
              color: "#E8610A",
              marginBottom: "0.25rem",
              textAlign: "center",
            }}
          >
            Social Stories
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "#666",
              marginBottom: "1.5rem",
              textAlign: "center",
              maxWidth: 400,
              padding: "0 1rem",
              lineHeight: 1.5,
            }}
          >
            Picture-based stories to help understand everyday situations.
          </p>
          <StoryList onSelect={setSelected} />
        </>
      )}
    </main>
  );
}
