"use client";
import { useState, useEffect, useRef } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#DDA0DD", "#95E1D3", "#FFB347"];
const TARGET = 10;

type Ball3D = { x: number; y: number; vx: number; vy: number; r: number; color: string; id: number };

export default function BallRun3D() {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const ballsRef = useRef<Ball3D[]>([]);
  const countRef = useRef(0);
  const idRef = useRef(0);

  const spawnBall = () => {
    ballsRef.current.push({
      id: idRef.current++, x: 0.1 + Math.random() * 0.3, y: 0.05,
      vx: 0.003 + Math.random() * 0.002, vy: 0, r: 8 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  };

  useEffect(() => {
    if (!started || done) return;
    const interval = setInterval(() => { if (ballsRef.current.length < 5) spawnBall(); }, 1500);
    return () => clearInterval(interval);
  }, [started, done]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.fillStyle = "#e8f4fd"; ctx.fillRect(0, 0, w, h);
      // Ramps
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, h * 0.2); ctx.lineTo(w, h * 0.35); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w, h * 0.45); ctx.lineTo(0, h * 0.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, h * 0.7); ctx.lineTo(w, h * 0.85); ctx.stroke();
      // Tray
      ctx.fillStyle = "#64748b"; ctx.fillRect(w * 0.7, h * 0.88, w * 0.3, 6);

      const toRemove: number[] = [];
      for (const b of ballsRef.current) {
        b.vy += 0.0004; // gravity
        // Ramp collisions (simplified)
        const by = b.y * h;
        if (by > h * 0.18 && by < h * 0.36 && b.vy > 0) { b.vy = -b.vy * 0.3; b.vx = Math.abs(b.vx); }
        if (by > h * 0.44 && by < h * 0.61 && b.vy > 0) { b.vy = -b.vy * 0.3; b.vx = -Math.abs(b.vx); }
        if (by > h * 0.69 && by < h * 0.86 && b.vy > 0) { b.vy = -b.vy * 0.3; b.vx = Math.abs(b.vx); }
        b.x += b.vx; b.y += b.vy;
        if (b.x < 0) b.vx = Math.abs(b.vx); if (b.x > 1) b.vx = -Math.abs(b.vx);
        if (b.y > 0.9) { toRemove.push(b.id); countRef.current++; setCount(countRef.current); if (countRef.current >= TARGET) setDone(true); continue; }
        const grad = ctx.createRadialGradient(b.x * w - 2, b.y * h - 2, 1, b.x * w, b.y * h, b.r);
        grad.addColorStop(0, "rgba(255,255,255,0.6)"); grad.addColorStop(1, b.color);
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
      ballsRef.current = ballsRef.current.filter((b) => !toRemove.includes(b.id));
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl" style={{ background: "#e8f4fd" }}>
      {started && !done && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 rounded-full px-5 py-2 shadow font-bold text-gray-700">{count}/{TARGET} balls collected</div>}
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer bg-sky-50/90" onClick={() => { setStarted(true); spawnBall(); }}>
          <div className="text-center bg-white rounded-3xl p-8 shadow-2xl mx-4">
            <div className="text-7xl mb-4">&#x1F3B3;</div>
            <p className="text-2xl font-bold text-sky-600 mb-2">Ball Run</p>
            <p className="text-sky-400 mb-4">Watch balls bounce down the ramps!</p>
            <div className="text-sky-500 font-semibold text-lg">Tap to start</div>
          </div>
        </div>
      )}
      {done && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/80">
          <div className="text-center"><div className="text-9xl mb-6">&#x1F3B3;</div><h3 className="text-4xl font-bold text-sky-600">All Balls Collected!</h3></div>
        </div>
      )}
    </div>
  );
}
