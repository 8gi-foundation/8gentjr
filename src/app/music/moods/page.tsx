"use client";

import { useState } from "react";
import type { MoodKey } from "../../../lib/emotional-playlists";
import MoodSelector from "../../../components/MoodSelector";
import PlaylistView from "../../../components/PlaylistView";

export default function MoodsPage() {
  const [selectedMood, setSelectedMood] = useState<MoodKey | null>(null);

  if (selectedMood) {
    return <PlaylistView mood={selectedMood} onBack={() => setSelectedMood(null)} />;
  }

  return <MoodSelector onSelectMood={setSelectedMood} />;
}
