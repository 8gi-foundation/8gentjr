"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Constants — WCAG 2.5.8 touch target minimum 44px, preferred 48px
// ---------------------------------------------------------------------------

/** Minimum interactive element size (WCAG 2.5.5 / 2.5.8 compliance) */
const TOUCH_TARGET_PX = 48;

const COLORS = [
  { id: "black", hex: "#1a1a2e", label: "Black" },
  { id: "red", hex: "#e63946", label: "Red" },
  { id: "orange", hex: "#E8610A", label: "Orange" },
  { id: "yellow", hex: "#f4a261", label: "Yellow" },
  { id: "green", hex: "#2a9d8f", label: "Green" },
  { id: "blue", hex: "#457b9d", label: "Blue" },
  { id: "purple", hex: "#7b2cbf", label: "Purple" },
  { id: "pink", hex: "#e56b9f", label: "Pink" },
  { id: "white", hex: "#ffffff", label: "White (eraser)" },
] as const;

const BRUSH_SIZES = [
  { id: "small", radius: 3, label: "Small brush" },
  { id: "medium", radius: 8, label: "Medium brush" },
  { id: "large", radius: 16, label: "Large brush" },
  { id: "xlarge", radius: 28, label: "Extra large brush" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DrawCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState<string>(COLORS[0].hex);
  const [brushSize, setBrushSize] = useState<{ id: string; radius: number; label: string }>(BRUSH_SIZES[1]);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getPos = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },
    [],
  );

  const draw = useCallback(
    (from: { x: number; y: number }, to: { x: number; y: number }) => {
      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize.radius * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    },
    [color, brushSize],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = getPos(e);
      lastPos.current = pos;

      const ctx = canvasRef.current?.getContext("2d");
      if (ctx) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, brushSize.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [getPos, color, brushSize],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !lastPos.current) return;
      const pos = getPos(e);
      draw(lastPos.current, pos);
      lastPos.current = pos;
    },
    [isDrawing, getPos, draw],
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Canvas area */}
      <div className="flex-1 relative bg-white rounded-xl overflow-hidden border-2 border-gray-300 touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="block w-full h-full cursor-crosshair"
        />
      </div>

      {/* Toolbar — all buttons meet 48px minimum touch target */}
      <div className="flex flex-col gap-2 pt-3">
        {/* Color picker row */}
        <div role="radiogroup" aria-label="Brush color" className="flex flex-wrap gap-2 justify-center">
          {COLORS.map((c) => {
            const isSelected = color === c.hex;
            return (
              <button
                key={c.id}
                role="radio"
                aria-checked={isSelected}
                aria-label={c.label}
                onClick={() => setColor(c.hex)}
                className="shrink-0 p-0 rounded-full cursor-pointer transition-all"
                style={{
                  width: TOUCH_TARGET_PX,
                  height: TOUCH_TARGET_PX,
                  minWidth: TOUCH_TARGET_PX,
                  minHeight: TOUCH_TARGET_PX,
                  border: isSelected
                    ? "3px solid #E8610A"
                    : c.id === "white"
                      ? "2px solid #ccc"
                      : "2px solid transparent",
                  background: c.hex,
                  boxShadow: isSelected
                    ? "0 0 0 3px rgba(232, 97, 10, 0.3)"
                    : "0 1px 3px rgba(0,0,0,0.12)",
                  transform: isSelected ? "scale(1.1)" : "scale(1)",
                }}
              />
            );
          })}
        </div>

        {/* Brush size row + clear button */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div role="radiogroup" aria-label="Brush size" className="flex gap-2 items-center">
            {BRUSH_SIZES.map((s) => {
              const isSelected = brushSize.id === s.id;
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={s.label}
                  onClick={() => setBrushSize(s)}
                  className={`shrink-0 p-0 rounded-xl flex items-center justify-center cursor-pointer transition-all ${
                    isSelected ? "border-[3px] border-[#E8610A] bg-[#fff5ee]" : "border-2 border-gray-300 bg-white"
                  }`}
                  style={{
                    width: TOUCH_TARGET_PX,
                    height: TOUCH_TARGET_PX,
                    minWidth: TOUCH_TARGET_PX,
                    minHeight: TOUCH_TARGET_PX,
                  }}
                >
                  <span
                    className="block rounded-full"
                    style={{
                      width: Math.max(6, s.radius * 2),
                      height: Math.max(6, s.radius * 2),
                      maxWidth: 32,
                      maxHeight: 32,
                      background: color,
                    }}
                  />
                </button>
              );
            })}
          </div>

          {/* Clear / trash button */}
          <button
            aria-label="Clear canvas"
            onClick={handleClear}
            className="shrink-0 h-12 min-h-[48px] min-w-[48px] px-5 rounded-xl border-2 border-red-500 bg-white text-red-500 font-bold text-[0.95rem] cursor-pointer transition-colors hover:bg-red-50"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
