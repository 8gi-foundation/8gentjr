"use client";

import { useRef, useState, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Constants — WCAG 2.5.8 touch target minimum 44px, preferred 48px
// ---------------------------------------------------------------------------

/** Minimum interactive element size (WCAG 2.5.5 / 2.5.8 compliance) */
const TOUCH_TARGET_PX = 48;
/** Minimum gap between interactive elements */
const TOUCH_GAP_PX = 8;

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

      // Fill with white background
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

      // Draw a dot for single taps
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          background: "#ffffff",
          borderRadius: 12,
          overflow: "hidden",
          border: "2px solid #e0e0e0",
          touchAction: "none",
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            cursor: "crosshair",
          }}
        />
      </div>

      {/* Toolbar — all buttons meet 48px minimum touch target */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: TOUCH_GAP_PX,
          padding: "12px 0 0",
        }}
      >
        {/* Color picker row */}
        <div
          role="radiogroup"
          aria-label="Brush color"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: TOUCH_GAP_PX,
            justifyContent: "center",
          }}
        >
          {COLORS.map((c) => {
            const isSelected = color === c.hex;
            return (
              <button
                key={c.id}
                role="radio"
                aria-checked={isSelected}
                aria-label={c.label}
                onClick={() => setColor(c.hex)}
                style={{
                  /* WCAG touch target: 48px minimum */
                  width: TOUCH_TARGET_PX,
                  height: TOUCH_TARGET_PX,
                  minWidth: TOUCH_TARGET_PX,
                  minHeight: TOUCH_TARGET_PX,
                  borderRadius: "50%",
                  border: isSelected
                    ? "3px solid #E8610A"
                    : c.id === "white"
                      ? "2px solid #ccc"
                      : "2px solid transparent",
                  background: c.hex,
                  cursor: "pointer",
                  boxShadow: isSelected
                    ? "0 0 0 3px rgba(232, 97, 10, 0.3)"
                    : "0 1px 3px rgba(0,0,0,0.12)",
                  transition: "box-shadow 0.15s, border-color 0.15s, transform 0.1s",
                  transform: isSelected ? "scale(1.1)" : "scale(1)",
                  padding: 0,
                  flexShrink: 0,
                }}
              />
            );
          })}
        </div>

        {/* Brush size row + clear button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: TOUCH_GAP_PX,
            flexWrap: "wrap",
          }}
        >
          <div
            role="radiogroup"
            aria-label="Brush size"
            style={{
              display: "flex",
              gap: TOUCH_GAP_PX,
              alignItems: "center",
            }}
          >
            {BRUSH_SIZES.map((s) => {
              const isSelected = brushSize.id === s.id;
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={s.label}
                  onClick={() => setBrushSize(s)}
                  style={{
                    /* WCAG touch target: 48px minimum */
                    width: TOUCH_TARGET_PX,
                    height: TOUCH_TARGET_PX,
                    minWidth: TOUCH_TARGET_PX,
                    minHeight: TOUCH_TARGET_PX,
                    borderRadius: 12,
                    border: isSelected
                      ? "3px solid #E8610A"
                      : "2px solid #ddd",
                    background: isSelected ? "#fff5ee" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.15s, background 0.15s",
                    padding: 0,
                    flexShrink: 0,
                  }}
                >
                  {/* Visual indicator: circle sized proportionally */}
                  <span
                    style={{
                      display: "block",
                      width: Math.max(6, s.radius * 2),
                      height: Math.max(6, s.radius * 2),
                      maxWidth: 32,
                      maxHeight: 32,
                      borderRadius: "50%",
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
            style={{
              /* WCAG touch target: 48px minimum */
              height: TOUCH_TARGET_PX,
              minHeight: TOUCH_TARGET_PX,
              minWidth: TOUCH_TARGET_PX,
              padding: "0 20px",
              borderRadius: 12,
              border: "2px solid #e63946",
              background: "#fff",
              color: "#e63946",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              flexShrink: 0,
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
