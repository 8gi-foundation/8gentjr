"use client";

import { useState, useCallback } from "react";
import type { SocialStory } from "@/lib/social-stories";

/* ── StoryViewer ────────────────────────────────────────────
   Displays one story step at a time, like a picture book.
   Large touch targets, read-aloud via Web Speech API.
   ──────────────────────────────────────────────────────────── */

const ARROW_SIZE = 60;

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
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton} aria-label="Back to stories">
          ← Back
        </button>
        <span style={styles.counter}>
          {step + 1} / {total}
        </span>
      </div>

      {/* Title */}
      <h2 style={styles.title}>
        {story.icon} {story.title}
      </h2>

      {/* Step card */}
      <div style={styles.card}>
        <div style={styles.emoji}>{current.emoji}</div>
        <p style={styles.text}>{current.text}</p>

        {/* Read aloud */}
        <button
          onClick={readAloud}
          style={{
            ...styles.readButton,
            ...(speaking ? styles.readButtonActive : {}),
          }}
          aria-label="Read aloud"
        >
          {speaking ? "🔊 Reading..." : "🔈 Read Aloud"}
        </button>

        {/* Parent tip */}
        <div style={styles.tip}>
          <strong>Tip for parents:</strong> {current.tip}
        </div>
      </div>

      {/* Navigation arrows */}
      <div style={styles.nav}>
        <button
          onClick={prev}
          disabled={step === 0}
          style={{
            ...styles.arrow,
            opacity: step === 0 ? 0.3 : 1,
          }}
          aria-label="Previous step"
        >
          ◀
        </button>
        <button
          onClick={next}
          disabled={step === total - 1}
          style={{
            ...styles.arrow,
            opacity: step === total - 1 ? 0.3 : 1,
          }}
          aria-label="Next step"
        >
          ▶
        </button>
      </div>

      {/* Progress dots */}
      <div style={styles.dots}>
        {story.steps.map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.dot,
              background: i === step ? "#E8610A" : "#E0D5CA",
            }}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Styles ──────────────────────────────────────────────── */

const styles = {
  container: {
    maxWidth: 480,
    margin: "0 auto",
    padding: "1rem",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1rem",
    minHeight: "80vh",
  },
  header: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backButton: {
    background: "none",
    border: "none",
    fontSize: "1rem",
    color: "#E8610A",
    fontWeight: 600 as const,
    cursor: "pointer",
    padding: "8px 12px",
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
  },
  counter: {
    fontSize: "0.95rem",
    fontWeight: 600 as const,
    color: "#888",
    background: "#FFF0E0",
    padding: "6px 14px",
    borderRadius: 20,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700 as const,
    color: "#1a1a2e",
    margin: 0,
    textAlign: "center" as const,
  },
  card: {
    background: "#FFFFFF",
    borderRadius: 20,
    padding: "2rem 1.5rem",
    boxShadow: "0 4px 24px rgba(232, 97, 10, 0.08)",
    border: "2px solid #FFF0E0",
    width: "100%",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: "1rem",
  },
  emoji: {
    fontSize: "4rem",
    lineHeight: 1,
  },
  text: {
    fontSize: "1.25rem",
    lineHeight: 1.6,
    textAlign: "center" as const,
    color: "#333",
    margin: 0,
    fontWeight: 500 as const,
  },
  readButton: {
    background: "#FFF0E0",
    border: "2px solid #F5D5B0",
    borderRadius: 14,
    padding: "10px 20px",
    fontSize: "1rem",
    fontWeight: 600 as const,
    color: "#E8610A",
    cursor: "pointer",
    minHeight: 48,
    minWidth: 48,
    transition: "background 0.15s ease",
  },
  readButtonActive: {
    background: "#FFDDB5",
    borderColor: "#E8610A",
  },
  tip: {
    background: "#F8F4F0",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: "0.85rem",
    color: "#666",
    lineHeight: 1.5,
    width: "100%",
    borderLeft: "3px solid #E8610A",
  },
  nav: {
    display: "flex",
    gap: "2rem",
    alignItems: "center",
  },
  arrow: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    minWidth: ARROW_SIZE,
    minHeight: ARROW_SIZE,
    borderRadius: ARROW_SIZE / 2,
    border: "2px solid #F0DECA",
    background: "#FFFFFF",
    fontSize: "1.5rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    transition: "transform 0.1s ease",
    touchAction: "manipulation" as const,
  },
  dots: {
    display: "flex",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    transition: "background 0.2s ease",
  },
} as const;
