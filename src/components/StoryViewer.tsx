"use client";

import { useState, useCallback } from "react";
import type { SocialStory } from "@/lib/social-stories";

/* ── StoryViewer ────────────────────────────────────────────
   Displays one story step at a time, like a picture book.
   Large touch targets, read-aloud via Web Speech API.
   ──────────────────────────────────────────────────────────── */

export default function StoryViewer({
  story,
  onBack,
}: {
  story: SocialStory;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const total = story.steps.length;
  const current = story.steps[step];

  const prev = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);
  const next = useCallback(
    () => setStep((s) => Math.min(total - 1, s + 1)),
    [total],
  );

  const readAloud = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(current.text);
    utterance.rate = 0.8;
    utterance.pitch = 1.1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [current.text]);

  return (
    <div className="max-w-[480px] mx-auto p-4 flex flex-col items-center gap-4 min-h-[80vh]">
      {/* Header */}
      <div className="w-full flex justify-between items-center">
        <button
          onClick={onBack}
          className="bg-transparent border-none text-base text-[#E8610A] font-semibold cursor-pointer py-2 px-3 rounded-lg min-h-[44px] min-w-[44px]"
          aria-label="Back to stories"
        >
          &larr; Back
        </button>
        <span className="text-[0.95rem] font-semibold text-gray-400 bg-[#FFF0E0] py-1.5 px-3.5 rounded-full">
          {step + 1} / {total}
        </span>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-[#1a1a2e] m-0 text-center">
        {story.icon} {story.title}
      </h2>

      {/* Step card */}
      <div className="bg-white rounded-[20px] py-8 px-6 shadow-[0_4px_24px_rgba(232,97,10,0.08)] border-2 border-[#FFF0E0] w-full flex flex-col items-center gap-4">
        <div className="text-[4rem] leading-none">{current.emoji}</div>
        <p className="text-xl leading-relaxed text-center text-gray-700 m-0 font-medium">
          {current.text}
        </p>

        {/* Read aloud */}
        <button
          onClick={readAloud}
          className={`rounded-[14px] py-2.5 px-5 text-base font-semibold text-[#E8610A] cursor-pointer min-h-[48px] min-w-[48px] transition-colors ${
            speaking
              ? "bg-[#FFDDB5] border-2 border-[#E8610A]"
              : "bg-[#FFF0E0] border-2 border-[#F5D5B0]"
          }`}
          aria-label="Read aloud"
        >
          {speaking ? "Reading..." : "Read Aloud"}
        </button>

        {/* Parent tip */}
        <div className="bg-[#F8F4F0] rounded-xl py-3 px-4 text-sm text-gray-500 leading-relaxed w-full border-l-[3px] border-l-[#E8610A]">
          <strong>Tip for parents:</strong> {current.tip}
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="flex gap-8 items-center">
        <button
          onClick={prev}
          disabled={step === 0}
          className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full border-2 border-[#F0DECA] bg-white text-2xl cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-transform active:scale-95 disabled:opacity-30"
          style={{ touchAction: "manipulation" }}
          aria-label="Previous step"
        >
          &#9664;
        </button>
        <button
          onClick={next}
          disabled={step === total - 1}
          className="w-[60px] h-[60px] min-w-[60px] min-h-[60px] rounded-full border-2 border-[#F0DECA] bg-white text-2xl cursor-pointer flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-transform active:scale-95 disabled:opacity-30"
          style={{ touchAction: "manipulation" }}
          aria-label="Next step"
        >
          &#9654;
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {story.steps.map((_, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i === step ? "bg-[#E8610A]" : "bg-[#E0D5CA]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
