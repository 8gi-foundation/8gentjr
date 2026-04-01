"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const COLORS = ["#FF6B6B", "#4ECDC4", "#FFE66D", "#95E1D3", "#DDA0DD", "#FFB347", "#87CEEB", "#FFB6C1"];
const TARGET = 20;

function randInt(a: number, b: number) { return a + Math.floor(Math.random() * (b - a + 1)); }

type Ball = { x: number; y: number; vy: number; color: string; size: number; id: number };

export default function BallRain() {
  const [started, setStarted] = useState(false);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const landedRef = useRef<{ x: number; y: number; color: string; size: number }[]>([]);
  const countRef = useRef(0);
  const idRef = useRef(0);
  const animRef = useRef<number>(0);
  const isRainingRef = useRef(false);

  const spawnBall = useCallback(() => {
    ballsRef.current.push({
      id: idRef.current++, x: randInt(5, 95) / 100, y: -0.05,
      vy: 0.008 + Math.random() * 0.005, color: COLORS[randInt(0, COLORS.length - 1)],
      size: randInt(10, 22),
    });
  }, []);

  useEffect(() => {
    if (!started || done) return;
    isRainingRef.current = true;
    const interval = setInterval(() => { if (isRainingRef.current) spawnBall(); }, 180);
    return () => { clearInterval(interval); isRainingRef.current = false; };
  }, [started, done, spawnBall]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const tick = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Landed balls
      for (const b of landedRef.current) {
        const grad = ctx.createRadialGradient(b.x * w - b.size * 0.2, b.y * h - b.size * 0.2, 1, b.x * w, b.y * h, b.size);
        grad.addColorStop(0, "rgba(255,255,255,0.5)"); grad.addColorStop(1, b.color);
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.size, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }

      // Falling balls
      const toRemove: number[] = [];
      for (const b of ballsRef.current) {
        b.y += b.vy;
        if (b.y > 0.88) {
          landedRef.current.push({ x: b.x, y: 0.85 + Math.random() * 0.08, color: b.color, size: b.size });
          if (landedRef.current.length > 60) landedRef.current.shift();
          countRef.current += 1;
          setCount(countRef.current);
          if (countRef.current >= TARGET) { setDone(true); isRainingRef.current = false; }
          toRemove.push(b.id);
          continue;
        }
        const grad = ctx.createRadialGradient(b.x * w - b.size * 0.2, b.y * h - b.size * 0.2, 1, b.x * w, b.y * h, b.size);
        grad.addColorStop(0, "rgba(255,255,255,0.6)"); grad.addColorStop(1, b.color);
        ctx.beginPath(); ctx.arc(b.x * w, b.y * h, b.size, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
      }
      ballsRef.current = ballsRef.current.filter((b) => !toRemove.includes(b.id));

      // Ground
      ctx.fillStyle = "#16A34A"; ctx.fillRect(0, h - 10, w, 10);

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [started]);

  const handleTap = () => {
    if (!started) { setStarted(true); return; }
    if (done) return;
    for (let i = 0; i < 4; i++) setTimeout(spawnBall, i * 40);
  };

  const progress = Math.min((count / TARGET) * 100, 100);

  if (done) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6" style={{ background: "linear-gradient(180deg, #7DD3FC, #38BDF8)" }}>
      <div className="text-8xl">&#x1F327;\uFE0F</div>
      <h2 className="text-3xl font-bold text-white">Ball Rain Complete!</h2>
      <p className="text-white/80">{count} balls collected!</p>
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl cursor-pointer select-none" onClick={handleTap}
      style={{ background: "linear-gradient(180deg, #7DD3FC, #38BDF8, #0EA5E9)" }}>
      <div className="absolute top-0 left-0 right-0 h-2 bg-white/30 z-20">
        <div className="h-full bg-white rounded-full" style={{ width: `${progress}%`, transition: "width 0.3s" }} />
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/90 rounded-full px-5 py-2 shadow-xl">
          <span className="text-2xl font-bold text-sky-600">{count}</span><span className="text-base text-sky-400">/{TARGET}</span>
        </div>
      </div>
      <canvas ref={canvasRef} width={400} height={600} className="absolute inset-0 w-full h-full" />
      {!started && (
        <div className="absolute inset-0 flex items-center justify-center bg-sky-500/40">
          <div className="bg-white/95 rounded-3xl p-8 shadow-2xl text-center mx-4">
            <div className="text-7xl mb-4">&#x1F327;\uFE0F</div>
            <p className="text-2xl font-bold text-sky-600 mb-2">Ball Rain!</p>
            <p className="text-sky-500 text-lg mb-4">Collect {TARGET} balls</p>
            <div className="bg-sky-500 text-white px-8 py-3 rounded-full text-lg font-bold shadow-lg">Tap to Start!</div>
          </div>
        </div>
      )}
      {started && !done && count === 0 && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 text-white/80 font-bold text-lg">Tap for more balls!</div>
      )}
    </div>
  );
}
