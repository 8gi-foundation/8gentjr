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
    <div className="flex flex-col items-center gap-3 p-4">
      <h2 className="m-0 text-[22px] text-gray-600">Rainbow Paint</h2>

      <canvas
        ref={canvasRef}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={onEnd}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        className="w-full max-w-[360px] h-[320px] rounded-2xl border-2 border-gray-300 touch-none cursor-crosshair"
      />

      {/* Color picker */}
      <div className="flex flex-wrap gap-1.5 justify-center max-w-[360px]">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            aria-label={`Color ${c}`}
            className="w-7 h-7 rounded-full cursor-pointer p-0"
            style={{
              background: c,
              border: color === c ? "3px solid #333" : "2px solid #ccc",
            }}
          />
        ))}
      </div>

      {/* Size picker */}
      <div className="flex gap-2 items-center">
        {SIZES.map((s) => (
          <button
            key={s}
            onClick={() => setSize(s)}
            aria-label={`Brush size ${s}`}
            className="w-8 h-8 rounded-full bg-white cursor-pointer flex items-center justify-center p-0"
            style={{ border: size === s ? "2px solid #333" : "2px solid #ccc" }}
          >
            <span
              className="block rounded-full"
              style={{
                width: s,
                height: s,
                background: color,
              }}
            />
          </button>
        ))}
      </div>

      <button
        onClick={clear}
        className="px-6 py-2 rounded-[20px] border-none bg-[#78909C] text-white text-sm cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
}
