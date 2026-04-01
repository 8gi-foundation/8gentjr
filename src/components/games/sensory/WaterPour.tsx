"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ── Types ──────────────────────────────────────────────── */

type Glass = {
  id: number;
  color: string;
  colorName: string;
  level: number; // 0-100
  targetLevel: number;
  done: boolean;
};

/* ── Constants ──────────────────────────────────────────── */

const GLASS_CONFIGS = [
  { color: "#FF6B9D", colorName: "Pink", target: 75 },
  { color: "#4ECDC4", colorName: "Teal", target: 55 },
  { color: "#FFD93D", colorName: "Yellow", target: 40 },
];

const LEVEL_THRESHOLD = 8;

/* ── Sound helpers (Web Audio) ──────────────────────────── */

function playDrip(ctx: AudioContext) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(800 + Math.random() * 300, now);
  osc.frequency.exponentialRampToValueAtTime(200, now + 0.12);
  gain.gain.setValueAtTime(0.2, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.start(now);
  osc.stop(now + 0.15);
}

function playSuccess(ctx: AudioContext) {
  const now = ctx.currentTime;
  [523, 659].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    gain.gain.setValueAtTime(0.25, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.3);
  });
}

function playCelebration(ctx: AudioContext) {
  [0, 120, 240, 360].forEach((delay, i) => {
    setTimeout(() => {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(400 + i * 100, now);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }, delay);
  });
}

/* ── Component ──────────────────────────────────────────── */

export default function WaterPour() {
  const [started, setStarted] = useState(false);
  const [glasses, setGlasses] = useState<Glass[]>(() =>
    GLASS_CONFIGS.map(({ color, colorName, target }, i) => ({
      id: i,
      color,
      colorName,
      level: 0,
      targetLevel: target,
      done: false,
    }))
  );
  const [isPouring, setIsPouring] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const pourIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const glassesRef = useRef(glasses);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    return ctxRef.current;
  }, []);

  useEffect(() => {
    glassesRef.current = glasses;
  }, [glasses]);

  useEffect(() => {
    return () => {
      if (pourIntervalRef.current) clearInterval(pourIntervalRef.current);
    };
  }, []);

  const stopPour = useCallback(() => {
    if (pourIntervalRef.current) {
      clearInterval(pourIntervalRef.current);
      pourIntervalRef.current = null;
    }
    setIsPouring(null);
  }, []);

  const startPour = useCallback(
    (glassId: number) => {
      if (!started || completed) return;
      if (isPouring === glassId) return;

      const glass = glassesRef.current.find((g) => g.id === glassId);
      if (!glass || glass.level >= 100) return;

      setIsPouring(glassId);

      pourIntervalRef.current = setInterval(() => {
        setGlasses((prev) => {
          const next = prev.map((g) => {
            if (g.id !== glassId || g.level >= 100) return g;
            const newLevel = Math.min(g.level + 1.5, 100);

            // Sound every 10 units
            const prevTen = Math.floor(g.level / 10);
            const nextTen = Math.floor(newLevel / 10);
            if (nextTen > prevTen) {
              playDrip(getCtx());
            }

            // Check if just hit target
            const isAtTarget = Math.abs(newLevel - g.targetLevel) <= LEVEL_THRESHOLD;
            const wasAtTarget = Math.abs(g.level - g.targetLevel) <= LEVEL_THRESHOLD;
            if (isAtTarget && !wasAtTarget) {
              playSuccess(getCtx());
            }

            return { ...g, level: newLevel };
          });

          // Check all done
          const allDone = next.every(
            (g) => Math.abs(g.level - g.targetLevel) <= LEVEL_THRESHOLD
          );
          if (allDone && !completed) {
            clearInterval(pourIntervalRef.current!);
            pourIntervalRef.current = null;
            setTimeout(() => {
              playCelebration(getCtx());
              setCompleted(true);
            }, 400);
          }

          return next;
        });
      }, 60);
    },
    [started, completed, isPouring, getCtx]
  );

  const doneCount = glasses.filter(
    (g) => Math.abs(g.level - g.targetLevel) <= LEVEL_THRESHOLD
  ).length;
  const progress = Math.min((doneCount / glasses.length) * 100, 100);

  /* ── Render ─────────────────────────────────────────────── */

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12, position: "relative", padding: "12px 8px" }}>
      {/* Progress bar */}
      <div style={{ height: 10, background: "#dbeafe", borderRadius: 999, overflow: "hidden", margin: "0 4px" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, #22d3ee, #3b82f6)",
            borderRadius: 999,
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Header */}
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: "#2563eb", margin: 0 }}>
          {doneCount}/{glasses.length} glasses filled!
        </p>
        <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0" }}>
          Hold a glass to pour
        </p>
      </div>

      {/* Glasses */}
      <div style={{
        flex: 1, display: "flex", alignItems: "flex-end",
        justifyContent: "center", gap: 16, paddingBottom: 16,
      }}>
        {glasses.map((glass) => {
          const atTarget = Math.abs(glass.level - glass.targetLevel) <= LEVEL_THRESHOLD;
          const pouring = isPouring === glass.id;

          return (
            <div key={glass.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              {/* Pour stream */}
              <div style={{
                width: 8, borderRadius: 999, backgroundColor: glass.color,
                opacity: pouring ? 0.75 : 0,
                height: pouring ? 44 : 0,
                transition: "all 0.15s ease",
              }} />

              <button
                onMouseDown={() => startPour(glass.id)}
                onMouseUp={stopPour}
                onMouseLeave={stopPour}
                onTouchStart={() => startPour(glass.id)}
                onTouchEnd={stopPour}
                onTouchCancel={stopPour}
                style={{
                  position: "relative", width: 80, height: 176,
                  cursor: "pointer", background: "none", border: "none",
                  padding: 0, touchAction: "none", userSelect: "none",
                }}
              >
                {/* Glass SVG */}
                <svg viewBox="0 0 80 170" style={{ width: "100%", height: "100%" }}>
                  {/* Glass body outline */}
                  <path
                    d="M 10 5 L 10 148 Q 10 162 26 162 L 54 162 Q 70 162 70 148 L 70 5"
                    fill="none"
                    stroke={atTarget ? glass.color : "#d1d5db"}
                    strokeWidth={atTarget ? 4 : 3}
                  />
                  {/* Target fill line */}
                  <line
                    x1="12" x2="68"
                    y1={162 - glass.targetLevel * 1.55}
                    y2={162 - glass.targetLevel * 1.55}
                    stroke={glass.color} strokeWidth="2.5"
                    strokeDasharray="6,4" opacity="0.75"
                  />
                  {/* Target arrow */}
                  <text
                    x="72"
                    y={162 - glass.targetLevel * 1.55 + 4}
                    fontSize="8" fill={glass.color} opacity="0.7"
                  >
                    &#9654;
                  </text>
                  {/* Glass shine */}
                  <path
                    d="M 18 15 L 18 145 Q 18 155 24 158"
                    fill="none" stroke="white" strokeWidth="3" opacity="0.45"
                  />
                </svg>

                {/* Water level */}
                <div style={{
                  position: "absolute",
                  left: "14%", right: "14%", bottom: "5%",
                  height: `${glass.level * 0.855}%`,
                  backgroundColor: glass.color,
                  opacity: 0.72,
                  borderRadius: "0 0 12px 12px",
                  overflow: "hidden",
                  transition: "height 0.06s linear",
                }}>
                  {/* Wave top */}
                  <div style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    height: 8, borderRadius: 999,
                    backgroundColor: "white", opacity: 0.6,
                  }} />
                </div>

                {/* At-target glow */}
                {atTarget && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 16,
                    pointerEvents: "none",
                    boxShadow: `0 0 20px ${glass.color}88`,
                    animation: "glowPulse 1s infinite",
                  }} />
                )}

                {/* Checkmark */}
                {atTarget && (
                  <div style={{
                    position: "absolute", top: 4, right: 4, fontSize: 20,
                    animation: "popIn 0.3s ease-out",
                  }}>
                    &#9989;
                  </div>
                )}
              </button>

              {/* Label */}
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: glass.color }}>
                  {Math.round(glass.level)}%
                </span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>/{glass.targetLevel}%</span>
              </div>

              {/* Color name */}
              <span style={{ fontSize: 12, fontWeight: 500, color: "#6b7280" }}>{glass.colorName}</span>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", margin: 0, paddingBottom: 4 }}>
        Hold each glass to pour &bull; Stop at the dashed line!
      </p>

      {/* Completed overlay */}
      {completed && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(219,234,254,0.92)", backdropFilter: "blur(4px)", borderRadius: 16, zIndex: 30,
        }}>
          <div style={{ background: "white", borderRadius: 24, padding: 32, textAlign: "center", margin: 16, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>&#128167;</div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: "0 0 8px" }}>Perfect Pour!</p>
            <p style={{ color: "#60a5fa", margin: "0 0 16px" }}>All glasses filled to the line!</p>
            <button
              onClick={() => {
                setGlasses(GLASS_CONFIGS.map(({ color, colorName, target }, i) => ({
                  id: i, color, colorName, level: 0, targetLevel: target, done: false,
                })));
                setCompleted(false);
                setIsPouring(null);
              }}
              style={{
                background: "linear-gradient(90deg, #22d3ee, #3b82f6)", color: "white",
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
            <div style={{ fontSize: 64, marginBottom: 16 }}>&#129371;</div>
            <p style={{ fontSize: 24, fontWeight: 700, color: "#2563eb", margin: "0 0 8px" }}>Water Pour!</p>
            <p style={{ color: "#60a5fa", margin: "0 0 4px" }}>Hold each glass to pour.</p>
            <p style={{ color: "#60a5fa", margin: "0 0 20px" }}>Fill to the dashed line!</p>
            <button
              onClick={() => setStarted(true)}
              style={{
                background: "linear-gradient(90deg, #22d3ee, #3b82f6)", color: "white",
                padding: "12px 32px", borderRadius: 999, fontSize: 18, fontWeight: 700,
                border: "none", cursor: "pointer", boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
              }}
            >
              Start Pouring!
            </button>
          </div>
        </div>
      )}

      {/* Keyframe animations */}
      <style>{`
        @keyframes glowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
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
