"use client";

import { useRef, useState, useCallback, useEffect } from "react";

/* ── Rainbow palette ─────────────────────────────────────── */

const COLORS = [
  "#FF1744", "#FF9100", "#FFEA00", "#76FF03",
  "#00E5FF", "#2979FF", "#D500F9", "#FF4081",
  "#795548", "#607D8B", "#FFFFFF", "#212121",
];

const SIZES = [4, 8, 14, 22];

/* ── Component ───────────────────────────────────────────── */

export default function RainbowPaint() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);

  /* ── Resize canvas on mount ── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#FAFAFA";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  const getPos = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
    },
    []
  );

  const draw = useCallback(
    (pos: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      const prev = lastPos.current ?? pos;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
      lastPos.current = pos;
    },
    [color, size]
  );

  const onStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      drawing.current = true;
      lastPos.current = getPos(e);
    },
    [getPos]
  );

  const onMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!drawing.current) return;
      e.preventDefault();
      draw(getPos(e));
    },
    [draw, getPos]
  );

  const onEnd = useCallback(() => {
    drawing.current = false;
    lastPos.current = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#FAFAFA";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: 16 }}>
      <h2 style={{ margin: 0, fontSize: 22, color: "#555" }}>Rainbow Paint</h2>

      <canvas
        ref={canvasRef}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        style={{
          width: "100%",
          maxWidth: 360,
          height: 320,
          borderRadius: 16,
          border: "2px solid #e0e0e0",
          touchAction: "none",
          cursor: "crosshair",
        }}
      />

      {/* Color picker */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", maxWidth: 360 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              border: color === c ? "3px solid #333" : "2px solid #ccc",
              background: c,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Size picker */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            aria-label={`Brush size ${s}`}
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: size === s ? "2px solid #333" : "2px solid #ccc",
              background: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            <span
              style={{
                width: s,
                height: s,
                borderRadius: "50%",
                background: color,
                display: "block",
              }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={clear}
        style={{
          padding: "8px 24px",
          borderRadius: 20,
          border: "none",
          background: "#78909C",
          color: "#fff",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        Clear
      </button>
    </div>
  );
}
