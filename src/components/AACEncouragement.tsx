"use client";

/**
 * AACEncouragement — celebrates communication milestones.
 * Shows encouraging messages and animations when the child reaches
 * word count milestones during AAC use.
 */

import { useEffect, useState } from "react";

const ENCOURAGEMENTS: Record<number, { message: string; emoji: string }> = {
  1: { message: "Great start!", emoji: "\u2B50" },
  3: { message: "You're doing amazing!", emoji: "\uD83C\uDF1F" },
  5: { message: "Wow, five words!", emoji: "\uD83C\uDF89" },
  7: { message: "Keep going!", emoji: "\uD83D\uDE80" },
  10: { message: "Super communicator!", emoji: "\uD83C\uDFC6" },
  15: { message: "Incredible sentence!", emoji: "\uD83E\uDD29" },
  20: { message: "Communication champion!", emoji: "\uD83E\uDD47" },
};

interface AACEncouragementProps {
  wordCount: number;
}

export default function AACEncouragement({
  wordCount,
}: AACEncouragementProps) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<{
    message: string;
    emoji: string;
  } | null>(null);

  useEffect(() => {
    const entry = ENCOURAGEMENTS[wordCount];
    if (entry) {
      setCurrent(entry);
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [wordCount]);

  if (!visible || !current) return null;

  return (
    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl border border-cyan-200 animate-[fadeIn_0.3s_ease-in]">
      <span className="text-2xl animate-bounce">{current.emoji}</span>
      <span className="text-base font-bold text-cyan-700">
        {current.message}
      </span>
    </div>
  );
}
