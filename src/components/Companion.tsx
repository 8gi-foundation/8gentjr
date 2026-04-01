"use client";

import { CSSProperties, useRef, useCallback, useEffect, useState } from "react";
import type { CompanionState, PointDirection } from "../hooks/useCompanion";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompanionProps {
  state: CompanionState;
  direction: PointDirection;
  colorHue: number;
  minimized: boolean;
  onTap: () => void;
  /** Called when the companion is tapped to toggle minimized */
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIZE = 64;
const MINI_SIZE = 24;
const DOCK_CLEARANCE = 84; // above the 72px dock + gap

// ---------------------------------------------------------------------------
// Keyframe CSS (injected once)
// ---------------------------------------------------------------------------

const KEYFRAMES = `
@keyframes companion-idle {
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(-6px) }
}
@keyframes companion-happy {
  0%, 100% { transform: translateY(0) scale(1) }
  25% { transform: translateY(-10px) scale(1.05) }
  75% { transform: translateY(-4px) scale(0.98) }
}
@keyframes companion-sleep {
  0%, 100% { transform: scale(1); opacity: 0.7 }
  50% { transform: scale(0.95); opacity: 0.5 }
}
@keyframes companion-celebrate {
  0% { transform: scale(1) rotate(0deg) }
  25% { transform: scale(1.15) rotate(8deg) }
  50% { transform: scale(1.2) rotate(-5deg) }
  75% { transform: scale(1.15) rotate(3deg) }
  100% { transform: scale(1) rotate(0deg) }
}
@keyframes companion-sparkle {
  0%, 100% { opacity: 0; transform: scale(0) }
  50% { opacity: 1; transform: scale(1) }
}
@keyframes companion-point-left {
  0%, 100% { transform: rotate(0deg) }
  50% { transform: rotate(-15deg) translateX(-4px) }
}
@keyframes companion-point-right {
  0%, 100% { transform: rotate(0deg) }
  50% { transform: rotate(15deg) translateX(4px) }
}
@keyframes companion-point-up {
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(-8px) }
}
@keyframes companion-point-down {
  0%, 100% { transform: translateY(0) }
  50% { transform: translateY(4px) }
}
@keyframes companion-eyes-blink {
  0%, 90%, 100% { transform: scaleY(1) }
  95% { transform: scaleY(0.1) }
}
`;

// ---------------------------------------------------------------------------
// Animation mapping
// ---------------------------------------------------------------------------

function getAnimation(
  state: CompanionState,
  direction: PointDirection,
): string {
  switch (state) {
    case "idle":
      return "companion-idle 2s ease-in-out infinite";
    case "active":
      return "companion-happy 0.8s ease-in-out infinite";
    case "sleeping":
      return "companion-sleep 3s ease-in-out infinite";
    case "celebrating":
      return "companion-celebrate 0.6s ease-in-out infinite";
    case "pointing": {
      const dir = direction ?? "right";
      return `companion-point-${dir} 1s ease-in-out infinite`;
    }
    default:
      return "none";
  }
}

// ---------------------------------------------------------------------------
// SVG Creature
// ---------------------------------------------------------------------------

function CreatureSVG({
  colorHue,
  state,
}: {
  colorHue: number;
  state: CompanionState;
}) {
  const bodyFill = `hsl(${colorHue}, 65%, 55%)`;
  const bodyLight = `hsl(${colorHue}, 65%, 72%)`;
  const eyeColor = state === "sleeping" ? bodyFill : "#fff";

  return (
    <svg
      viewBox="0 0 64 64"
      width={SIZE}
      height={SIZE}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {/* Body — rounded blob */}
      <ellipse cx="32" cy="36" rx="24" ry="22" fill={bodyFill} />
      {/* Belly highlight */}
      <ellipse cx="32" cy="40" rx="14" ry="12" fill={bodyLight} opacity="0.5" />
      {/* Left ear */}
      <ellipse cx="16" cy="16" rx="8" ry="10" fill={bodyFill} />
      <ellipse cx="16" cy="16" rx="5" ry="7" fill={bodyLight} opacity="0.4" />
      {/* Right ear */}
      <ellipse cx="48" cy="16" rx="8" ry="10" fill={bodyFill} />
      <ellipse cx="48" cy="16" rx="5" ry="7" fill={bodyLight} opacity="0.4" />

      {/* Eyes */}
      {state === "sleeping" ? (
        /* Sleeping — closed eyes (arcs) */
        <>
          <path
            d="M22 32 Q25 29 28 32"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M36 32 Q39 29 42 32"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </>
      ) : (
        /* Awake eyes with blink animation */
        <g style={{ animation: "companion-eyes-blink 4s ease infinite" }}>
          <circle cx="25" cy="32" r="4" fill={eyeColor} />
          <circle cx="39" cy="32" r="4" fill={eyeColor} />
          {/* Pupils */}
          <circle cx="26" cy="32" r="2" fill="#1a1a2e" />
          <circle cx="40" cy="32" r="2" fill="#1a1a2e" />
        </g>
      )}

      {/* Mouth — smile for active/celebrating, neutral otherwise */}
      {state === "celebrating" || state === "active" ? (
        <path
          d="M26 42 Q32 48 38 42"
          stroke="#fff"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      ) : state !== "sleeping" ? (
        <ellipse cx="32" cy="43" rx="3" ry="1.5" fill="#fff" opacity="0.6" />
      ) : null}

      {/* Sparkles during celebration */}
      {state === "celebrating" && (
        <>
          <circle
            cx="8"
            cy="20"
            r="2"
            fill="#FFD700"
            style={{ animation: "companion-sparkle 0.8s ease infinite" }}
          />
          <circle
            cx="56"
            cy="18"
            r="2.5"
            fill="#FFD700"
            style={{
              animation: "companion-sparkle 0.8s ease infinite 0.2s",
            }}
          />
          <circle
            cx="52"
            cy="50"
            r="1.5"
            fill="#FFD700"
            style={{
              animation: "companion-sparkle 0.8s ease infinite 0.4s",
            }}
          />
          <circle
            cx="12"
            cy="48"
            r="2"
            fill="#FFD700"
            style={{
              animation: "companion-sparkle 0.8s ease infinite 0.6s",
            }}
          />
        </>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Minimized "eyes peeking" view
// ---------------------------------------------------------------------------

function MiniEyes({ colorHue }: { colorHue: number }) {
  return (
    <svg
      viewBox="0 0 24 12"
      width={MINI_SIZE}
      height={MINI_SIZE / 2}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <rect
        rx="6"
        width="24"
        height="12"
        fill={`hsl(${colorHue}, 65%, 55%)`}
      />
      <circle cx="8" cy="6" r="2.5" fill="#fff" />
      <circle cx="16" cy="6" r="2.5" fill="#fff" />
      <circle cx="8.8" cy="6" r="1.2" fill="#1a1a2e" />
      <circle cx="16.8" cy="6" r="1.2" fill="#1a1a2e" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main Companion Component
// ---------------------------------------------------------------------------

export default function Companion({
  state,
  direction,
  colorHue,
  minimized,
  onTap,
  onToggle,
}: CompanionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Drag state ───────────────────────────────────────────────
  const [pos, setPos] = useState({ x: 16, y: DOCK_CLEARANCE });
  const dragState = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!containerRef.current) return;
      containerRef.current.setPointerCapture(e.pointerId);
      dragState.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        originX: pos.x,
        originY: pos.y,
        moved: false,
      };
    },
    [pos],
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const ds = dragState.current;
    if (!ds?.dragging) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      ds.moved = true;
    }
    // Invert Y because we use bottom/right positioning
    setPos({
      x: Math.max(0, ds.originX - dx),
      y: Math.max(DOCK_CLEARANCE, ds.originY + (ds.startY - e.clientY)),
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    const ds = dragState.current;
    if (!ds) return;
    if (!ds.moved) {
      // It was a tap, not a drag
      onToggle();
      onTap();
    }
    dragState.current = null;
  }, [onTap, onToggle]);

  // ── Sound on state change ────────────────────────────────────
  useEffect(() => {
    if (state === "celebrating" || state === "active") {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = state === "celebrating" ? 660 : 440;
        gain.gain.value = 0.04;
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } catch {
        /* audio not critical */
      }
    }
  }, [state]);

  // ── Render ───────────────────────────────────────────────────

  const containerStyle: CSSProperties = {
    position: "fixed",
    right: pos.x,
    bottom: pos.y,
    zIndex: 90,
    cursor: "pointer",
    touchAction: "none",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    animation: minimized ? "none" : getAnimation(state, direction),
    transition: "width 0.2s ease, height 0.2s ease",
  };

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div
        ref={containerRef}
        style={containerStyle}
        role="button"
        aria-label={minimized ? "Show companion" : "Companion"}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onToggle();
            onTap();
          }
        }}
      >
        {minimized ? (
          <MiniEyes colorHue={colorHue} />
        ) : (
          <CreatureSVG colorHue={colorHue} state={state} />
        )}
      </div>
    </>
  );
}
