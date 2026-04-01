"use client";

import { CSSProperties, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanionCelebrationProps {
  /** The milestone message to display (e.g. "You used 10 new words!") */
  message: string;
  /** Auto-dismiss duration in ms (default: 3000) */
  duration?: number;
  /** Called when the overlay dismisses */
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Keyframes
// ---------------------------------------------------------------------------

const CELEBRATION_KEYFRAMES = `
@keyframes celebration-fade-in {
  from { opacity: 0 }
  to   { opacity: 1 }
}
@keyframes celebration-fade-out {
  from { opacity: 1 }
  to   { opacity: 0 }
}
@keyframes celebration-pop {
  0%   { transform: scale(0.5); opacity: 0 }
  60%  { transform: scale(1.1) }
  100% { transform: scale(1); opacity: 1 }
}
@keyframes confetti-fall-1 {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1 }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0 }
}
@keyframes confetti-fall-2 {
  0%   { transform: translateY(-20px) rotate(0deg); opacity: 1 }
  100% { transform: translateY(100vh) rotate(-540deg); opacity: 0 }
}
@keyframes sparkle-pulse {
  0%, 100% { transform: scale(0); opacity: 0 }
  50%      { transform: scale(1); opacity: 1 }
}
`;

// ---------------------------------------------------------------------------
// Confetti pieces (pure CSS, no library)
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#FF6FB5",
  "#C490E4",
  "#45CFDD",
  "#FF9F43",
];

interface ConfettiPiece {
  id: number;
  color: string;
  left: string;
  delay: string;
  duration: string;
  size: number;
  animation: string;
}

function generateConfetti(count: number): ConfettiPiece[] {
  const pieces: ConfettiPiece[] = [];
  for (let i = 0; i < count; i++) {
    const anim = i % 2 === 0 ? "confetti-fall-1" : "confetti-fall-2";
    pieces.push({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: `${(i / count) * 100}%`,
      delay: `${(i * 0.08).toFixed(2)}s`,
      duration: `${1.5 + (i % 5) * 0.3}s`,
      size: 6 + (i % 4) * 2,
      animation: anim,
    });
  }
  return pieces;
}

const confettiPieces = generateConfetti(24);

// ---------------------------------------------------------------------------
// Sparkles
// ---------------------------------------------------------------------------

interface Sparkle {
  id: number;
  top: string;
  left: string;
  delay: string;
  size: number;
}

const sparkles: Sparkle[] = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  top: `${15 + (i * 37) % 70}%`,
  left: `${10 + (i * 43) % 80}%`,
  delay: `${(i * 0.15).toFixed(2)}s`,
  size: 12 + (i % 3) * 8,
}));

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const overlayStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 200,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
};

const messageBoxStyle: CSSProperties = {
  background: "rgba(255, 255, 255, 0.95)",
  borderRadius: 24,
  padding: "24px 36px",
  boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
  animation: "celebration-pop 0.4s ease-out",
  textAlign: "center",
  maxWidth: "80vw",
  pointerEvents: "auto",
};

const messageTextStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: "#1a1a2e",
  lineHeight: 1.3,
  margin: 0,
};

const starStyle: CSSProperties = {
  fontSize: 32,
  display: "block",
  marginBottom: 8,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CompanionCelebration({
  message,
  duration = 3000,
  onDismiss,
}: CompanionCelebrationProps) {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeStart = setTimeout(() => setFading(true), duration - 400);
    const dismiss = setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, duration);

    return () => {
      clearTimeout(fadeStart);
      clearTimeout(dismiss);
    };
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <>
      <style>{CELEBRATION_KEYFRAMES}</style>
      <div
        style={{
          ...overlayStyle,
          animation: fading
            ? "celebration-fade-out 0.4s ease forwards"
            : "celebration-fade-in 0.3s ease",
        }}
        role="alert"
        aria-live="assertive"
      >
        {/* Confetti layer */}
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            style={{
              position: "absolute",
              top: 0,
              left: p.left,
              width: p.size,
              height: p.size,
              borderRadius: p.id % 3 === 0 ? "50%" : 2,
              background: p.color,
              animation: `${p.animation} ${p.duration} ease-out ${p.delay} forwards`,
              pointerEvents: "none",
            }}
          />
        ))}

        {/* Sparkles */}
        {sparkles.map((s) => (
          <div
            key={s.id}
            style={{
              position: "absolute",
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              pointerEvents: "none",
              animation: `sparkle-pulse 0.6s ease infinite ${s.delay}`,
            }}
          >
            <svg viewBox="0 0 24 24" width={s.size} height={s.size}>
              <path
                d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z"
                fill="#FFD700"
              />
            </svg>
          </div>
        ))}

        {/* Message card */}
        <div style={messageBoxStyle}>
          <span style={starStyle} aria-hidden="true">
            *
          </span>
          <p style={messageTextStyle}>{message}</p>
        </div>
      </div>
    </>
  );
}
