"use client";

import { useState } from "react";
import type { SocialStory } from "@/lib/social-stories";
import StoryList from "@/components/StoryList";
import StoryViewer from "@/components/StoryViewer";

export default function StoriesPage() {
  const [selected, setSelected] = useState<SocialStory | null>(null);

  return (
    <main className="min-h-screen flex flex-col items-center py-8 bg-[#FFF8F0]">
      {selected ? (
        <StoryViewer story={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <h1 className="text-[clamp(1.5rem,4vw,2.5rem)] font-extrabold text-[#E8610A] mb-1 text-center">
            Social Stories
          </h1>
          <p className="text-base text-gray-500 mb-6 text-center max-w-[400px] px-4 leading-relaxed">
            Picture-based stories to help understand everyday situations.
          </p>
          <StoryList onSelect={setSelected} />
        </>
      )}
    </main>
  );
}
