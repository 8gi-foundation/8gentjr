"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";

/* ── Grid config ── */
const GRID = 5;
const CW = 44; // half-width of isometric diamond
const CH = 22; // half-height of isometric diamond
const CD = 26; // depth per height level
const MAX_H = 4;

/* ── Palette: each color mapped to a musical tone ── */
const PALETTE = [
  { color: "#FF4444", freq: 261.63, label: "Do" },
  { color: "#FF8C00", freq: 293.66, label: "Re" },
  { color: "#FFCC00", freq: 329.63, label: "Mi" },
  { color: "#22BB66", freq: 392.0, label: "Sol" },
  { color: "#4488FF", freq: 440.0, label: "La" },
  { color: "#E8610A", freq: 523.25, label: "Do!" },
];

const UNPAINTED = { top: "#E8DDD0", left: "#B8B0A0", right: "#D0C8B8" };

/* ── Types ── */
type FaceKey = "top" | "left" | "right";
type CellFaces = Record<FaceKey, number | null>;

/* ── Color helpers ── */
function darken(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = 1 - pct;
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ── Audio ── */
let _ac: AudioContext | null = null;
function ac(): AudioContext {
  if (!_ac || _ac.state === "closed") _ac = new AudioContext();
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}

function playTone(freq: number, heightMod: number) {
  try {
    const c = ac();
    const now = c.currentTime;
    const hz = freq * (1 + heightMod * 0.06);

    // Fundamental - warm triangle wave
    const o1 = c.createOscillator();
    const g1 = c.createGain();
    o1.type = "triangle";
    o1.frequency.value = hz;
    g1.gain.setValueAtTime(0.12, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    o1.connect(g1).connect(c.destination);
    o1.start(now);
    o1.stop(now + 0.3);

    // Subtle octave overtone
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = "sine";
    o2.frequency.value = hz * 2;
    g2.gain.setValueAtTime(0.03, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    o2.connect(g2).connect(c.destination);
    o2.start(now);
    o2.stop(now + 0.2);

    if (navigator?.vibrate) navigator.vibrate(12);
  } catch {
    /* silent */
  }
}

function playChime() {
  try {
    const c = ac();
    const now = c.currentTime;
    [300, 400, 500, 600, 700].forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.06, now + i * 0.04);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.12);
      o.connect(g).connect(c.destination);
      o.start(now + i * 0.04);
      o.stop(now + i * 0.04 + 0.12);
    });
  } catch {
    /* silent */
  }
}

/* ── Terrain generation ── */
function generateHeights(): number[][] {
  const h: number[][] = Array.from({ length: GRID }, () =>
    Array(GRID).fill(0),
  );
  const peaks = 2 + Math.floor(Math.random() * 3);
  for (let p = 0; p < peaks; p++) {
    const pr = Math.random() * GRID;
    const pc = Math.random() * GRID;
    const ph = 2 + Math.random() * 2;
    const rad = 1.2 + Math.random() * 1.8;
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const d = Math.sqrt((r - pr) ** 2 + (c - pc) ** 2);
        h[r][c] += Math.max(0, ph * (1 - d / rad));
      }
    }
  }
  return h.map((row) => row.map((v) => Math.max(1, Math.min(MAX_H, Math.round(v)))));
}

function emptyFaces(): CellFaces[][] {
  return Array.from({ length: GRID }, () =>
    Array.from({ length: GRID }, () => ({ top: null, left: null, right: null })),
  );
}

/* ── Isometric geometry ── */
function isoBase(r: number, c: number) {
  return { x: (c - r) * CW, y: (c + r) * CH };
}

function facePts(sx: number, sy: number, h: number, face: FaceKey): string {
  const t = sy - h * CD;
  switch (face) {
    case "top":
      return `${sx},${t} ${sx + CW},${t + CH} ${sx},${t + 2 * CH} ${sx - CW},${t + CH}`;
    case "left":
      return `${sx - CW},${t + CH} ${sx},${t + 2 * CH} ${sx},${sy + 2 * CH} ${sx - CW},${sy + CH}`;
    case "right":
      return `${sx},${t + 2 * CH} ${sx + CW},${t + CH} ${sx + CW},${sy + CH} ${sx},${sy + 2 * CH}`;
  }
}

function faceColor(cell: CellFaces, face: FaceKey): string {
  const idx = cell[face];
  if (idx === null) return UNPAINTED[face];
  const base = PALETTE[idx].color;
  if (face === "left") return darken(base, 0.3);
  if (face === "right") return darken(base, 0.15);
  return base;
}

/* ── Render order: back-to-front for painter's algorithm ── */
const SORTED_CELLS: { r: number; c: number }[] = [];
for (let r = 0; r < GRID; r++)
  for (let c = 0; c < GRID; c++) SORTED_CELLS.push({ r, c });
SORTED_CELLS.sort((a, b) => a.r + a.c - (b.r + b.c) || a.r - b.r);

/* ── Component ── */
export default function IsometricExplorer() {
  const [heights, setHeights] = useState(generateHeights);
  const [faces, setFaces] = useState(emptyFaces);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeBand, setActiveBand] = useState<number | null>(null);
  const playingRef = useRef(false);
  const timers = useRef<number[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const paint = useCallback(
    (r: number, c: number, face: FaceKey) => {
      setFaces((prev) => {
        const next = prev.map((row) => row.map((cell) => ({ ...cell })));
        next[r][c][face] = selected;
        return next;
      });
      playTone(PALETTE[selected].freq, heights[r][c] / MAX_H);
    },
    [selected, heights],
  );

  const generate = useCallback(() => {
    setHeights(generateHeights());
    setFaces(emptyFaces());
    playChime();
  }, []);

  const clear = useCallback(() => setFaces(emptyFaces()), []);

  const sweep = useCallback(() => {
    if (playingRef.current) return;
    playingRef.current = true;
    setPlaying(true);
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const maxBand = (GRID - 1) * 2;
    let delay = 0;

    for (let band = 0; band <= maxBand; band++) {
      const b = band;
      timers.current.push(
        window.setTimeout(() => {
          setActiveBand(b);
          for (let r = 0; r < GRID; r++) {
            const c = b - r;
            if (c >= 0 && c < GRID) {
              const cell = faces[r][c];
              const h = heights[r][c];
              (["top", "left", "right"] as FaceKey[]).forEach((f) => {
                if (cell[f] !== null)
                  playTone(PALETTE[cell[f]!].freq, h / MAX_H);
              });
            }
          }
        }, delay),
      );
      delay += 180;
    }

    timers.current.push(
      window.setTimeout(() => {
        setActiveBand(null);
        setPlaying(false);
        playingRef.current = false;
      }, delay + 200),
    );
  }, [faces, heights]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100dvh - 72px)",
        background: "#FFF8F0",
        userSelect: "none",
        WebkitUserSelect: "none" as never,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderBottom: "1px solid #F0DECA",
        }}
      >
        <Link
          href="/science"
          style={{
            fontSize: 22,
            textDecoration: "none",
            color: "#1a1a2e",
            lineHeight: 1,
            padding: "4px 8px",
          }}
        >
          &#8592;
        </Link>
        <h1
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#1a1a2e",
            fontFamily: "var(--font-fraunces), serif",
          }}
        >
          Shape World
        </h1>
      </div>

      {/* SVG canvas area */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
          minHeight: 0,
        }}
      >
        <svg
          viewBox="-260 -120 520 380"
          style={{ width: "100%", maxHeight: "100%", touchAction: "none" }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Ground shadow */}
          <ellipse
            cx="0"
            cy="145"
            rx="200"
            ry="50"
            fill="rgba(232, 97, 10, 0.05)"
          />

          {/* Ground grid lines for spatial reference */}
          {Array.from({ length: GRID + 1 }, (_, i) => {
            const startL = isoBase(i, 0);
            const endL = isoBase(i, GRID);
            const startC = isoBase(0, i);
            const endC = isoBase(GRID, i);
            return (
              <g key={`grid-${i}`}>
                {i <= GRID - 1 && (
                  <>
                    <line
                      x1={startL.x}
                      y1={startL.y + 2 * CH}
                      x2={endL.x}
                      y2={endL.y + 2 * CH}
                      stroke="rgba(26,26,46,0.06)"
                      strokeWidth={0.5}
                    />
                    <line
                      x1={startC.x}
                      y1={startC.y + 2 * CH}
                      x2={endC.x}
                      y2={endC.y + 2 * CH}
                      stroke="rgba(26,26,46,0.06)"
                      strokeWidth={0.5}
                    />
                  </>
                )}
              </g>
            );
          })}

          {/* Isometric columns */}
          {SORTED_CELLS.map(({ r, c }) => {
            const { x: sx, y: sy } = isoBase(r, c);
            const h = heights[r][c];
            const lit = activeBand !== null && r + c === activeBand;
            const sw = lit ? 1.8 : 0.5;
            const sc = lit ? "#E8610A" : "rgba(26,26,46,0.2)";

            return (
              <g key={`${r}-${c}`}>
                {h > 0 && (
                  <>
                    <polygon
                      points={facePts(sx, sy, h, "left")}
                      fill={faceColor(faces[r][c], "left")}
                      stroke={sc}
                      strokeWidth={sw}
                      strokeLinejoin="round"
                      style={{ cursor: "pointer" }}
                      onClick={() => paint(r, c, "left")}
                    />
                    <polygon
                      points={facePts(sx, sy, h, "right")}
                      fill={faceColor(faces[r][c], "right")}
                      stroke={sc}
                      strokeWidth={sw}
                      strokeLinejoin="round"
                      style={{ cursor: "pointer" }}
                      onClick={() => paint(r, c, "right")}
                    />
                  </>
                )}
                <polygon
                  points={facePts(sx, sy, h, "top")}
                  fill={faceColor(faces[r][c], "top")}
                  stroke={sc}
                  strokeWidth={sw}
                  strokeLinejoin="round"
                  style={{ cursor: "pointer" }}
                  onClick={() => paint(r, c, "top")}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Controls */}
      <div
        style={{
          padding: "12px 16px 16px",
          borderTop: "1px solid #F0DECA",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Color palette */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {PALETTE.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setSelected(i);
                playTone(p.freq, 0.5);
              }}
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: p.color,
                border:
                  selected === i
                    ? "3px solid #1a1a2e"
                    : "3px solid transparent",
                boxShadow:
                  selected === i
                    ? "0 0 0 2px #FFF8F0, 0 0 0 5px rgba(26,26,46,0.25)"
                    : "none",
                cursor: "pointer",
                transform: selected === i ? "scale(1.12)" : "scale(1)",
                transition: "transform 0.15s, box-shadow 0.15s",
              }}
              aria-label={p.label}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          <button onClick={generate} style={btnBase}>
            New World
          </button>
          <button
            onClick={sweep}
            disabled={playing}
            style={{
              ...btnBase,
              background: "#E8610A",
              color: "white",
              border: "none",
              opacity: playing ? 0.5 : 1,
            }}
          >
            {playing ? "Playing..." : "Play Song"}
          </button>
          <button onClick={clear} style={btnBase}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  padding: "12px 18px",
  borderRadius: 12,
  border: "1px solid #F0DECA",
  background: "white",
  color: "#1a1a2e",
  fontSize: 15,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-inter), sans-serif",
};
