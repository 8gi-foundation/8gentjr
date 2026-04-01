"use client";

import { useState, useRef, useCallback } from "react";

/* ── Types ──────────────────────────────────────────────── */

type Ball = { id: number; color: string; bottleIndex: number };

type Bottle = {
  color: string;
  label: string;
  balls: Ball[];
  targetCount: number;
};

/* ── Constants ──────────────────────────────────────────── */

const BOTTLE_CONFIGS = [
  { color: "#FF6B6B", label: "Red" },
  { color: "#4ECDC4", label: "Blue" },
  { color: "#FFD93D", label: "Yellow" },
];

const TARGET = 7;

/* ── Sound helpers (Web Audio) ──────────────────────────── */

function playNote(ctx: AudioContext, freq: number) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.start(now);
  osc.stop(now + 0.3);
}

function playScaleNote(ctx: AudioContext, index: number) {
  const scale = [261, 293, 329, 349, 392, 440, 493, 523];
  playNote(ctx, scale[index % scale.length]);
}

function playWrong(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(200, now);
  osc.frequency.linearRampToValueAtTime(100, now + 0.2);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  osc.start(now);
  osc.stop(now + 0.25);
}

function playCelebration(ctx: AudioContext) {
  [0, 150, 300, 450].forEach((delay, i) => {
    setTimeout(() => playNote(ctx, 400 + i * 100), delay);
  });
}

/* ── Component ──────────────────────────────────────────── */

export default function BottleFill() {
  const [started, setStarted] = useState(false);
  const [bottles, setBottles] = useState<Bottle[]>(() =>
    BOTTLE_CONFIGS.map(({ color, label }) => ({
      color,
      label,
      balls: [],
      targetCount: TARGET,
    }))
  );
  const [selectedColor, setSelectedColor] = useState(BOTTLE_CONFIGS[0].color);
  const [wrongFlash, setWrongFlash] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const ballIdRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  const totalBalls = bottles.reduce((s, b) => s + b.balls.length, 0);
  const totalTarget = bottles.reduce((s, b) => s + b.targetCount, 0);
  const progress = Math.min((totalBalls / totalTarget) * 100, 100);

  const handleBottleTap = useCallback(
    (bottleIndex: number) => {
      if (!started || completed) return;
      const bottle = bottles[bottleIndex];
      if (bottle.balls.length >= bottle.targetCount) return;

      if (selectedColor !== bottle.color) {
        playWrong(getCtx());
        setWrongFlash(bottleIndex);
        setTimeout(() => setWrongFlash(null), 400);
        return;
      }

      const ballId = ballIdRef.current++;
      const newBall: Ball = { id: ballId, color: selectedColor, bottleIndex };

      setBottles((prev) => {
        const next = [...prev];
        next[bottleIndex] = {
          ...next[bottleIndex],
          balls: [...next[bottleIndex].balls, newBall],
        };

        playScaleNote(getCtx(), next[bottleIndex].balls.length);

        const allFilled = next.every((b) => b.balls.length >= b.targetCount);
        if (allFilled) {
          setTimeout(() => {
            playCelebration(getCtx());
            setCompleted(true);
          }, 300);
        }

        return next;
      });
    },
    [started, completed, bottles, selectedColor, getCtx]
  );

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, position: "relative", padding: "12px 8px" }}>
      {/* Progress bar */}
      <div style={{ height: 10, background: "#f3f4f6", borderRadius: 999, overflow: "hidden", margin: "0 4px" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #60a5fa, #a855f7)",
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Score */}
      <div style={{ textAlign: "center" }}>
        <span style={{
          background: "#eff6ff", borderRadius: 999, padding: "6px 16px",
          fontSize: 18, fontWeight: 700, color: "#2563eb", display: "inline-block",
        }}>
          {totalBalls}/{totalTarget} balls
        </span>
      </div>

      {/* Color selector */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
        {BOTTLE_CONFIGS.map(({ color, label }) => (
          <button
            key={color}
            onClick={() => { setSelectedColor(color); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: color,
              border: selectedColor === color ? "4px solid white" : "4px solid transparent",
              boxShadow: selectedColor === color
                ? `0 0 20px ${color}88, 0 4px 15px rgba(0,0,0,0.3)`
                : "0 4px 15px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              transform: selectedColor === color ? "scale(1.1)" : "scale(1)",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Hint */}
      <p style={{ textAlign: "center", fontSize: 14, color: "#9ca3af", margin: 0 }}>
        Select a color, then tap the matching bottle!
      </p>

      {/* Bottles area */}
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-end",
        justifyContent: "space-around", padding: "0 16px 24px",
      }}>
        {bottles.map((bottle, index) => (
          <button
            key={index}
            onClick={() => handleBottleTap(index)}
            style={{
              position: "relative", width: 96, height: 208,
              cursor: "pointer", background: "none", border: "none", padding: 0,
              animation: wrongFlash === index ? "shake 0.3s ease" : undefined,
            }}
          >
            {/* Bottle SVG */}
            <svg viewBox="0 0 80 200" style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}>
              {/* Neck */}
              <rect x="28" y="0" width="24" height="35" fill={bottle.color} opacity="0.25" rx="5" />
              {/* Cap */}
              <rect x="24" y="-5" width="32" height="12" fill={bottle.color} opacity="0.5" rx="6" />
              {/* Body */}
              <path
                d="M 14 45 Q 8 55 8 65 L 8 175 Q 8 192 24 192 L 56 192 Q 72 192 72 175 L 72 65 Q 72 55 66 45 L 52 35 L 28 35 Z"
                fill={bottle.color}
                opacity={wrongFlash === index ? 0.5 : 0.15}
                stroke={bottle.color}
                strokeWidth="3"
              />
              {/* Glass shine */}
              <path d="M 18 55 L 18 170 Q 18 180 24 185" fill="none" stroke="white" strokeWidth="3" opacity="0.5" />
              <path d="M 26 48 L 26 80" fill="none" stroke="white" strokeWidth="2" opacity="0.3" />
              {/* Target line */}
              <line
                x1="14" x2="66"
                y1={192 - (bottle.targetCount / TARGET) * 120}
                y2={192 - (bottle.targetCount / TARGET) * 120}
                stroke={bottle.color} strokeWidth="2" strokeDasharray="5,3" opacity="0.7"
              />
            </svg>

            {/* Balls in bottle */}
            <div style={{
              position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
              display: "flex", flexDirection: "column-reverse", alignItems: "center", gap: 2, zIndex: 10,
            }}>
              {bottle.balls.map((ball, bi) => (
                <div
                  key={ball.id}
                  style={{
                    width: 24, height: 24, borderRadius: "50%",
                    backgroundColor: ball.color,
                    marginLeft: bi % 2 === 0 ? -5 : 5,
                    boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.4)",
                    animation: "popIn 0.25s ease-out",
                  }}
                />
              ))}
            </div>

            {/* Fill count */}
            <div style={{
              position: "absolute", bottom: -28, left: "50%", transform: "translateX(-50%)",
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", color: bottle.color,
            }}>
              {bottle.balls.length}/{bottle.targetCount}
              {bottle.balls.length >= bottle.targetCount && " \u2705"}
            </div>
          </button>
        ))}
      </div>

      {/* Completed overlay */}
      {completed && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(219,234,254,0.92)", backdropFilter: "blur(4px)", borderRadius: 16, zIndex: 30,
        }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, textAlign: "center", margin: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>&#127881;</div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: "0 0 8px" }}>All Bottles Filled!</p>
            <p style={{ color: "#60a5fa", margin: "0 0 16px" }}>Great job matching colors!</p>
            <button
              onClick={() => {
                setBottles(BOTTLE_CONFIGS.map(({ color, label }) => ({ color, label, balls: [], targetCount: TARGET })));
                setCompleted(false);
                ballIdRef.current = 0;
              }}
              style={{
                background: "linear-gradient(90deg, #60a5fa, #a855f7)", color: "white",
                padding: "12px 32px", borderRadius: 999, fontSize: 18, fontWeight: 700,
                border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* Start overlay */}
      {!started && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(219,234,254,0.92)", backdropFilter: "blur(4px)", borderRadius: 16, zIndex: 30,
        }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, textAlign: "center", margin: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>&#127862;</div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: "0 0 8px" }}>Bottle Fill!</p>
            <p style={{ color: "#60a5fa", margin: "0 0 4px" }}>Pick a color.</p>
            <p style={{ color: "#60a5fa", margin: "0 0 20px" }}>Fill the matching bottle!</p>
            <button
              onClick={() => setStarted(true)}
              style={{
                background: "linear-gradient(90deg, #60a5fa, #a855f7)", color: "white",
                padding: "12px 32px", borderRadius: 999, fontSize: 18, fontWeight: 700,
                border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              Let&#39;s Fill!
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        @keyframes popIn {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
